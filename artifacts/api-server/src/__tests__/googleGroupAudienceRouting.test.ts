/**
 * googleGroupAudienceRouting.test.ts
 *
 * Verifies that the three live Homebase Google Group email addresses route
 * each user type to the correct homebase audience, and that the status and
 * /me endpoints reflect that routing correctly.
 *
 * Live group addresses under test:
 *   GOOGLE_GROUP_COACHES    = coaches@transitiontrails.org
 *   GOOGLE_GROUP_VOLUNTEERS = volunteer@transitiontrails.org
 *   GOOGLE_GROUP_LEARNERS   = learners@transitiontrails.org
 *
 * Coverage:
 *  deriveAudience (unit)
 *   1. coaches@transitiontrails.org → 'coach'
 *   2. volunteer@transitiontrails.org → 'volunteer'
 *   3. learners@transitiontrails.org → 'learner'
 *   4. Priority: coach wins when user is in both coach and volunteer groups
 *   5. Priority: volunteer wins over learner
 *   6. null when user is in none of the three configured groups
 *   7. Case-insensitive match (upper-cased group email still resolves)
 *
 *  GET /api/auth/homebase/status (integration — reads from session)
 *   8.  coaches group in session → audience:'coach' returned
 *   9.  volunteer group in session → audience:'volunteer' returned
 *  10.  learners group in session → audience:'learner' returned
 *  11.  staff group only → audience:null (staff users have no homebase audience)
 *
 *  Full callback → /auth/homebase/status flow
 *  12. Sign in as coach-group member → status returns audience:'coach'
 *  13. Sign in as volunteer-group member → status returns audience:'volunteer'
 *  14. Sign in as learner-group member → status returns audience:'learner'
 *
 *  GET /api/auth/google/me — refresh path (groups re-fetched when session expires)
 *  15. Stale session with coach group → /me re-derives audience:'coach'
 *  16. Stale session with volunteer group → /me re-derives audience:'volunteer'
 *  17. Stale session with learner group → /me re-derives audience:'learner'
 *  18. Stale session where user is removed from all groups → session destroyed,
 *      authenticated:false with reason:'no_groups'
 *
 *  Staff-priority rule
 *  19. User in both a staff group AND a homebase group → audience:null (staff wins)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Real group addresses (matching the live ENV var values) ───────────────────

const COACHES_GROUP    = 'coaches@transitiontrails.org';
const VOLUNTEERS_GROUP = 'volunteer@transitiontrails.org';
const LEARNERS_GROUP   = 'learners@transitiontrails.org';

// ── Session shim ──────────────────────────────────────────────────────────────

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {};
  return { mockSession };
});

vi.mock('express-session', () => ({
  default: () => (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req['session'] = new Proxy(mockSession, {
      get(target, prop) {
        if (prop === 'save')    return (cb?: () => void) => cb?.();
        if (prop === 'destroy') return (cb?: () => void) => {
            // Mirror real session.destroy: wipe all session data so the next
            // request sees an empty session (unauthenticated).
            for (const k of Object.keys(mockSession)) delete mockSession[k];
            cb?.();
          };
        return target[prop as string];
      },
      set(target, prop, value) { target[prop as string] = value; return true; },
    });
    next();
  },
}));

vi.mock('connect-pg-simple', () => ({
  default: () => class FakePgStore {
    get(_sid: string, cb: (err: null, s: null) => void) { cb(null, null); }
    set(_sid: string, _s: unknown, cb: () => void) { cb(); }
    destroy(_sid: string, cb: () => void) { cb(); }
  },
}));

// ── DB mock (homebase/volunteer routes read from DB) ──────────────────────────

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })) })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({
      orderBy: vi.fn().mockResolvedValue([]),
      limit:   vi.fn().mockResolvedValue([]),
    })) })) })),
  },
}));

vi.mock('@workspace/db/schema', () => ({
  timeLogsTable: {
    id: 'id', userEmail: 'user_email', audience: 'audience',
    activityLabel: 'activity_label', hours: 'hours', loggedAt: 'logged_at',
  },
  volunteerProfilesTable: {
    userEmail: 'user_email', monthlyCommitmentHours: 'monthly_commitment_hours',
    caseLimit: 'case_limit', specialty: 'specialty',
    coordinatorSlackId: 'coordinator_slack_id', coordinatorName: 'coordinator_name',
    volunteerSlackChannel: 'volunteer_slack_channel', updatedAt: 'updated_at',
  },
  coachProfilesTable: {
    userEmail: 'user_email', coachLevel: 'coach_level', updatedAt: 'updated_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(f => ({ __desc: f })),
  eq:   vi.fn().mockReturnValue({ __eq: true }),
  gte:  vi.fn().mockReturnValue({ __gte: true }),
  and:  vi.fn().mockReturnValue({ __and: true }),
}));

// ── Groups cache mock (used by /me refresh path) ──────────────────────────────

import * as googleGroupsCache from '../lib/googleGroupsCache.js';

vi.mock('../lib/googleGroupsCache.js', async (importOriginal) => {
  const original = await importOriginal<typeof googleGroupsCache>();
  return { ...original, getGroupsForUser: vi.fn() };
});

const mockGetGroups = vi.mocked(googleGroupsCache.getGroupsForUser);

import { db } from '@workspace/db';

import app from '../app.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clearSession() {
  for (const k of Object.keys(mockSession)) delete mockSession[k];
}

/** Build a minimal 3-part JWT that decodeIdToken() can parse. */
function makeIdToken(payload: Record<string, unknown>): string {
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body    = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

/** Stub global.fetch to return a successful token-exchange response. */
function stubTokenExchange(idTokenPayload: Record<string, unknown>) {
  const id_token = makeIdToken(idTokenPayload);
  global.fetch = vi.fn().mockResolvedValue({
    ok:   true,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({ id_token }),
  });
}

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  clearSession();
  vi.clearAllMocks();
  process.env['GOOGLE_CLIENT_ID']        = 'test-client-id';
  process.env['GOOGLE_CLIENT_SECRET']    = 'test-client-secret';
  process.env['GOOGLE_GROUP_COACHES']    = COACHES_GROUP;
  process.env['GOOGLE_GROUP_VOLUNTEERS'] = VOLUNTEERS_GROUP;
  process.env['GOOGLE_GROUP_LEARNERS']   = LEARNERS_GROUP;
  delete process.env['TRAIL_OS_SUPERADMIN_EMAILS'];
});

afterEach(() => {
  clearSession();
  vi.restoreAllMocks();
  process.env = { ...ORIG_ENV };
});

// ── 1–7. deriveAudience unit tests with live group addresses ──────────────────

describe('deriveAudience with live group email addresses', () => {
  let deriveAudience: (groups: string[], email: string) => 'learner' | 'coach' | 'volunteer' | 'team' | null;

  beforeEach(async () => {
    ({ deriveAudience } = await import('../routes/googleSignIn.js'));
  });

  it('1. coaches@transitiontrails.org maps to audience:"coach"', () => {
    expect(deriveAudience([COACHES_GROUP], 'user@transitiontrails.org')).toBe('coach');
  });

  it('2. volunteer@transitiontrails.org maps to audience:"volunteer"', () => {
    expect(deriveAudience([VOLUNTEERS_GROUP], 'user@transitiontrails.org')).toBe('volunteer');
  });

  it('3. learners@transitiontrails.org maps to audience:"learner"', () => {
    expect(deriveAudience([LEARNERS_GROUP], 'user@transitiontrails.org')).toBe('learner');
  });

  it('4. coach wins when user is in both coach and volunteer live groups', () => {
    expect(
      deriveAudience([COACHES_GROUP, VOLUNTEERS_GROUP], 'user@transitiontrails.org'),
    ).toBe('coach');
  });

  it('5. volunteer wins over learner when user is in both live groups', () => {
    expect(
      deriveAudience([VOLUNTEERS_GROUP, LEARNERS_GROUP], 'user@transitiontrails.org'),
    ).toBe('volunteer');
  });

  it('6. returns null when user is in none of the three live groups', () => {
    expect(
      deriveAudience(['other@transitiontrails.org'], 'user@transitiontrails.org'),
    ).toBeNull();
  });

  it('7. match is case-insensitive — COACHES@TRANSITIONTRAILS.ORG still resolves', () => {
    expect(
      deriveAudience([COACHES_GROUP.toUpperCase()], 'user@transitiontrails.org'),
    ).toBe('coach');
  });
});

// ── 8–11. GET /api/auth/homebase/status (reads googleAudience from session) ───
//
// Tests 26–30 (below) cover the stale-session refresh path added to homebase/status.

describe('GET /api/auth/homebase/status with live group sessions', () => {
  it('8. returns audience:"coach" when session contains coaches group audience (TTL fresh — cached path)', async () => {
    Object.assign(mockSession, {
      googleEmail:        'user@transitiontrails.org',
      googleGroups:       [COACHES_GROUP],
      googleAudience:     'coach',
      googleGroupsExpiry: Date.now() + 60_000, // TTL valid — no re-fetch
    });
    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(true);
    expect(res.body.audience).toBe('coach');
    expect(mockGetGroups).not.toHaveBeenCalled();
  });

  it('9. returns audience:"volunteer" when session contains volunteer group audience (TTL fresh — cached path)', async () => {
    Object.assign(mockSession, {
      googleEmail:        'user@transitiontrails.org',
      googleGroups:       [VOLUNTEERS_GROUP],
      googleAudience:     'volunteer',
      googleGroupsExpiry: Date.now() + 60_000,
    });
    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.audience).toBe('volunteer');
    expect(mockGetGroups).not.toHaveBeenCalled();
  });

  it('10. returns audience:"learner" when session contains learners group audience (TTL fresh — cached path)', async () => {
    Object.assign(mockSession, {
      googleEmail:        'user@transitiontrails.org',
      googleGroups:       [LEARNERS_GROUP],
      googleAudience:     'learner',
      googleGroupsExpiry: Date.now() + 60_000,
    });
    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.audience).toBe('learner');
    expect(mockGetGroups).not.toHaveBeenCalled();
  });

  it('11. returns audience:null for a staff-only session (no homebase audience, TTL fresh — cached path)', async () => {
    Object.assign(mockSession, {
      googleEmail:        'staff@transitiontrails.org',
      googleGroups:       ['trailosadmin@transitiontrails.org'],
      googleGroupsExpiry: Date.now() + 60_000,
      // googleAudience intentionally absent — staff users have no homebase audience
    });
    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.audience).toBeNull();
    expect(mockGetGroups).not.toHaveBeenCalled();
  });
});

// ── 12–14. Full callback → /auth/homebase/status flow ────────────────────────

describe('Full sign-in → /auth/homebase/status with live group addresses', () => {
  it('12. coach-group member gets audience:"coach" after full sign-in', async () => {
    stubTokenExchange({
      sub: 'uid-coach-1', email: 'coach@transitiontrails.org',
      name: 'A Coach', hd: 'transitiontrails.org', email_verified: true,
    });
    mockGetGroups.mockResolvedValue({ groups: [COACHES_GROUP], isReliable: true });

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const state = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
    const callbackRes = await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);
    expect(callbackRes.headers['location']).toBe('/');

    const statusRes = await agent.get('/api/auth/homebase/status');
    expect(statusRes.body.isSignedIn).toBe(true);
    expect(statusRes.body.audience).toBe('coach');
  });

  it('13. volunteer-group member gets audience:"volunteer" after full sign-in', async () => {
    stubTokenExchange({
      sub: 'uid-vol-1', email: 'vol@transitiontrails.org',
      name: 'A Volunteer', hd: 'transitiontrails.org', email_verified: true,
    });
    mockGetGroups.mockResolvedValue({ groups: [VOLUNTEERS_GROUP], isReliable: true });

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const state = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
    await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);

    const statusRes = await agent.get('/api/auth/homebase/status');
    expect(statusRes.body.audience).toBe('volunteer');
  });

  it('14. learner-group member gets audience:"learner" after full sign-in', async () => {
    stubTokenExchange({
      sub: 'uid-lrn-1', email: 'learner@transitiontrails.org',
      name: 'A Learner', hd: 'transitiontrails.org', email_verified: true,
    });
    mockGetGroups.mockResolvedValue({ groups: [LEARNERS_GROUP], isReliable: true });

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const state = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
    await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);

    const statusRes = await agent.get('/api/auth/homebase/status');
    expect(statusRes.body.audience).toBe('learner');
  });
});

// ── 15–18. GET /api/auth/google/me — group refresh path ──────────────────────
//
// The /me endpoint re-fetches groups when googleGroupsExpiry <= now.
// We simulate a stale session by setting expiry to 0.

describe('GET /api/auth/google/me — group refresh with live group addresses', () => {
  it('15. stale coach session → groups refreshed → audience:"coach" in response', async () => {
    Object.assign(mockSession, {
      googleEmail:        'coach@transitiontrails.org',
      googleName:         'A Coach',
      googleSub:          'uid-c',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: 0, // force refresh
      googleTier:         'everyday',
      googleAudience:     'coach',
    });
    mockGetGroups.mockResolvedValue({ groups: [COACHES_GROUP], isReliable: true });

    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.audience).toBe('coach');
    expect(mockGetGroups).toHaveBeenCalledWith('coach@transitiontrails.org');
  });

  it('16. stale volunteer session → groups refreshed → audience:"volunteer" in response', async () => {
    Object.assign(mockSession, {
      googleEmail:        'vol@transitiontrails.org',
      googleName:         'A Volunteer',
      googleSub:          'uid-v',
      googleGroups:       [VOLUNTEERS_GROUP],
      googleGroupsExpiry: 0,
      googleAudience:     'volunteer',
    });
    mockGetGroups.mockResolvedValue({ groups: [VOLUNTEERS_GROUP], isReliable: true });

    const res = await request(app).get('/api/auth/google/me');
    expect(res.body.authenticated).toBe(true);
    expect(res.body.audience).toBe('volunteer');
  });

  it('17. stale learner session → groups refreshed → audience:"learner" in response', async () => {
    Object.assign(mockSession, {
      googleEmail:        'learner@transitiontrails.org',
      googleName:         'A Learner',
      googleSub:          'uid-l',
      googleGroups:       [LEARNERS_GROUP],
      googleGroupsExpiry: 0,
      googleAudience:     'learner',
    });
    mockGetGroups.mockResolvedValue({ groups: [LEARNERS_GROUP], isReliable: true });

    const res = await request(app).get('/api/auth/google/me');
    expect(res.body.authenticated).toBe(true);
    expect(res.body.audience).toBe('learner');
  });

  it('18. user removed from all groups on refresh → session destroyed, authenticated:false', async () => {
    Object.assign(mockSession, {
      googleEmail:        'ex@transitiontrails.org',
      googleName:         'Ex User',
      googleSub:          'uid-ex',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: 0, // force refresh
      googleAudience:     'coach',
    });
    // Groups re-fetch returns empty — user has been removed
    mockGetGroups.mockResolvedValue({ groups: [], isReliable: true });

    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
    expect(res.body.reason).toBe('no_groups');
  });
});

// ── Real team group address ───────────────────────────────────────────────────

const TEAM_GROUP = 'team@transitiontrails.org';

// ── 19. Staff-priority rule ───────────────────────────────────────────────────

describe('Staff-priority rule — staff group wins over homebase group', () => {
  it('19. user in both trailosadmin and coaches groups gets audience:null (staff wins)', async () => {
    stubTokenExchange({
      sub: 'uid-sa-1', email: 'admin@transitiontrails.org',
      name: 'Staff Admin', hd: 'transitiontrails.org', email_verified: true,
    });
    // Simulate a user who belongs to both staff and homebase groups
    mockGetGroups.mockResolvedValue({ groups: ['trailosadmin@transitiontrails.org', COACHES_GROUP], isReliable: true });

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const state = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
    await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);

    // Staff takes priority — audience must be null even though coaches group is present
    const statusRes = await agent.get('/api/auth/homebase/status');
    expect(statusRes.body.isSignedIn).toBe(true);
    expect(statusRes.body.audience).toBeNull();

    // /me should also report null audience
    const meRes = await agent.get('/api/auth/google/me');
    expect(meRes.body.authenticated).toBe(true);
    expect(meRes.body.audience).toBeNull();
  });
});

// ── 20–23. Superadmin who is also in team@ group — Team Homebase access ───────
//
// A superadmin has audience:null (isKnownStaff short-circuits deriveAudience),
// but the `groups` array is always stored in the session and returned by /me.
// The frontend /homebase route guard and the "Back to Homebase" card both check
//   user?.audience === 'team' || user?.groups?.includes('team@transitiontrails.org')
// so the session must preserve the team group membership even for superadmins.

describe('Superadmin in team@ group — /homebase access without signing out', () => {
  const SUPERADMIN_EMAIL = 'super@transitiontrails.org';

  beforeEach(() => {
    process.env['GOOGLE_GROUP_TEAM']            = TEAM_GROUP;
    process.env['TRAIL_OS_SUPERADMIN_EMAILS']   = SUPERADMIN_EMAIL;
  });

  it('20. deriveAudience returns "team" for a team@ group member', async () => {
    const { deriveAudience } = await import('../routes/googleSignIn.js');
    expect(deriveAudience([TEAM_GROUP], 'user@transitiontrails.org')).toBe('team');
  });

  it('21. full sign-in: superadmin in team group → /me returns audience:null and groups includes team@', async () => {
    stubTokenExchange({
      sub: 'uid-super-team', email: SUPERADMIN_EMAIL,
      name: 'Super Admin', hd: 'transitiontrails.org', email_verified: true,
    });
    // Superadmin is also a member of the team group
    mockGetGroups.mockResolvedValue({ groups: [TEAM_GROUP], isReliable: true });

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const state = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
    const callbackRes = await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);
    // Staff users are redirected to / (not /homebase) — superadmin must navigate there manually
    expect(callbackRes.headers['location']).toBe('/');

    const meRes = await agent.get('/api/auth/google/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.authenticated).toBe(true);
    // Staff priority wins — audience must be null
    expect(meRes.body.audience).toBeNull();
    // But the group membership is preserved so the frontend can detect team membership
    expect(meRes.body.groups).toContain(TEAM_GROUP);
  });

  it('22. full sign-in: superadmin in team group → /homebase status session has no homebase audience', async () => {
    stubTokenExchange({
      sub: 'uid-super-team-2', email: SUPERADMIN_EMAIL,
      name: 'Super Admin', hd: 'transitiontrails.org', email_verified: true,
    });
    mockGetGroups.mockResolvedValue({ groups: [TEAM_GROUP], isReliable: true });

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const state = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
    await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);

    // homebase/status reflects audience:null (staff wins), confirming the user
    // must rely on groups[] to access /homebase, not the audience field
    const statusRes = await agent.get('/api/auth/homebase/status');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.isSignedIn).toBe(true);
    expect(statusRes.body.audience).toBeNull();
  });

  // ── 24–25. Sign-out path for a superadmin who visited /homebase ──────────────
  //
  // A superadmin with audience:null + team group membership can sign out from
  // TeamHomebase via POST /auth/google/sign-out.  After that:
  //   24. The sign-out call must succeed (200, ok:true).
  //       A subsequent /auth/homebase/status must return isSignedIn:false so the
  //       frontend knows the session is gone and shows the sign-in page — not a
  //       staff-only shell that would strand the user.
  //   25. A cold unauthenticated GET /auth/homebase/status (no session at all)
  //       must return 200 isSignedIn:false, never 500 or a blank response.

  it('24. superadmin with team group signs out → sign-out returns ok:true, status returns isSignedIn:false', async () => {
    // Establish a signed-in superadmin session (audience:null, team group present)
    stubTokenExchange({
      sub: 'uid-super-signout', email: SUPERADMIN_EMAIL,
      name: 'Super Admin', hd: 'transitiontrails.org', email_verified: true,
    });
    mockGetGroups.mockResolvedValue({ groups: [TEAM_GROUP], isReliable: true });

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const state = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
    await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);

    // Confirm they are signed in as staff (audience:null) with team group
    const meBefore = await agent.get('/api/auth/google/me');
    expect(meBefore.body.authenticated).toBe(true);
    expect(meBefore.body.audience).toBeNull();
    expect(meBefore.body.groups).toContain(TEAM_GROUP);

    // Sign out
    const signOutRes = await agent.post('/api/auth/google/sign-out');
    expect(signOutRes.status).toBe(200);
    expect(signOutRes.body.ok).toBe(true);

    // Homebase status must reflect the cleared session — isSignedIn:false
    const statusAfter = await agent.get('/api/auth/homebase/status');
    expect(statusAfter.status).toBe(200);
    expect(statusAfter.body.isSignedIn).toBe(false);
  });

  it('25. unauthenticated GET /auth/homebase/status (no session) returns 200 isSignedIn:false', async () => {
    // No session established — cold request
    clearSession();
    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(false);
    expect(res.body.audience).toBeNull();
  });

  it('23. stale superadmin+team session → groups refreshed → /me still returns audience:null with team@ in groups', async () => {
    // Pre-populate a stale session for the superadmin who is in the team group
    Object.assign(mockSession, {
      googleEmail:        SUPERADMIN_EMAIL,
      googleName:         'Super Admin',
      googleSub:          'uid-super-stale',
      googleGroups:       [TEAM_GROUP],
      googleGroupsExpiry: 0, // force a refresh
      googleTier:         'superadmin',
      // audience is absent (staff user — stored as undefined)
    });
    // Groups re-fetch still returns the team group
    mockGetGroups.mockResolvedValue({ groups: [TEAM_GROUP], isReliable: true });

    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    // Audience remains null after refresh — superadmin identity is preserved
    expect(res.body.audience).toBeNull();
    // groups[] still carries team@ so the frontend /homebase guard and
    // "Back to Homebase" card (isTeam check) both evaluate to true
    expect(res.body.groups).toContain(TEAM_GROUP);
    expect(mockGetGroups).toHaveBeenCalledWith(SUPERADMIN_EMAIL);
  });
});

// ── 26a. Slow (never-resolving) getGroupsForUser → timely 200 with stale data ─
//
// A very slow Groups API response is as dangerous as a hard failure: it can hold
// the /me endpoint open indefinitely, blocking the frontend from rendering.
// withGroupsTimeout() races the real call against a configurable deadline so that
// a hung lookup gets the same stale-session fallback as an outright rejection.

describe('GET /api/auth/google/me — slow Groups API (timeout protection)', () => {
  it('26a. never-resolving getGroupsForUser → 200 with stale session data within timeout', async () => {
    // Use a short timeout so the test finishes quickly without actually waiting 3 s
    process.env['GROUPS_REFRESH_TIMEOUT_MS'] = '100';

    Object.assign(mockSession, {
      googleEmail:        'coach@transitiontrails.org',
      googleName:         'A Coach',
      googleSub:          'uid-c-slow',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: 0, // force a refresh attempt
      googleTier:         'everyday',
      googleAudience:     'coach',
    });

    // Simulate a Groups API call that never resolves (hung connection)
    mockGetGroups.mockImplementation(() => new Promise(() => { /* never settles */ }));

    const start = Date.now();
    const res = await request(app).get('/api/auth/google/me');
    const elapsed = Date.now() - start;

    // Must return a 200 with stale data — not hang or 500
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.audience).toBe('coach');
    expect(res.body.email).toBe('coach@transitiontrails.org');

    // Must settle within a reasonable margin of the configured 100 ms timeout
    expect(elapsed).toBeLessThan(1000);
  }, 5000 /* generous jest/vitest timeout — actual wall time should be ~100 ms */);
});

// ── 26–28. GET /api/auth/google/me — Groups API unavailable during refresh ────
//
// When getGroupsForUser returns { isReliable: false } (no admin token, network
// error, quota exceeded), /me must NOT sign the user out or return a 500.
// The stale session data is still valid proof of authentication; the endpoint
// serves it and leaves the TTL expired so the next request retries.

describe('GET /api/auth/google/me — transient Google Groups API failure', () => {
  it('26. network error during refresh → 200 with stale coach audience (no 500)', async () => {
    Object.assign(mockSession, {
      googleEmail:        'coach@transitiontrails.org',
      googleName:         'A Coach',
      googleSub:          'uid-c-err',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: 0, // force a refresh attempt
      googleTier:         'everyday',
      googleAudience:     'coach',
    });
    // Simulate a transient network failure — isReliable:false, not a throw
    mockGetGroups.mockResolvedValue({ groups: [], isReliable: false });

    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    // Stale audience is served — user is not locked out
    expect(res.body.audience).toBe('coach');
    expect(res.body.email).toBe('coach@transitiontrails.org');
    // Re-fetch was attempted
    expect(mockGetGroups).toHaveBeenCalledWith('coach@transitiontrails.org');
  });

  it('27. quota-exceeded error during refresh → 200 with stale learner audience (no 500)', async () => {
    Object.assign(mockSession, {
      googleEmail:        'learner@transitiontrails.org',
      googleName:         'A Learner',
      googleSub:          'uid-l-err',
      googleGroups:       [LEARNERS_GROUP],
      googleGroupsExpiry: 0,
      googleTier:         'everyday',
      googleAudience:     'learner',
    });
    mockGetGroups.mockResolvedValue({ groups: [], isReliable: false });

    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.audience).toBe('learner');
  });

  it('28. API unavailable during refresh → response is never a 500', async () => {
    Object.assign(mockSession, {
      googleEmail:        'vol@transitiontrails.org',
      googleName:         'A Volunteer',
      googleSub:          'uid-v-err',
      googleGroups:       [VOLUNTEERS_GROUP],
      googleGroupsExpiry: 0,
      googleTier:         'everyday',
      googleAudience:     'volunteer',
    });
    mockGetGroups.mockResolvedValue({ groups: [], isReliable: false });

    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).not.toBe(500);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.audience).toBe('volunteer');
  });
});

// ── 29–33. GET /api/auth/homebase/status — stale-session refresh path ─────────
//
// homebase/status re-fetches groups when googleGroupsExpiry <= now, exactly
// as /me does.  A group change (e.g. a user removed from the coaches group)
// therefore takes effect at the next homebase/status poll, without requiring
// a sign-out or a separate /me call.

describe('GET /api/auth/homebase/status — stale session refresh', () => {
  it('29. stale coach session → groups refreshed → audience:"coach" still returned when group is unchanged', async () => {
    Object.assign(mockSession, {
      googleEmail:        'coach@transitiontrails.org',
      googleName:         'A Coach',
      googleSub:          'uid-c-stale',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: 0, // force refresh
      googleAudience:     'coach',
    });
    mockGetGroups.mockResolvedValue({ groups: [COACHES_GROUP], isReliable: true });

    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(true);
    expect(res.body.audience).toBe('coach');
    expect(mockGetGroups).toHaveBeenCalledWith('coach@transitiontrails.org');
  });

  it('30. stale session where user was moved from coaches to learners group → audience:"learner"', async () => {
    Object.assign(mockSession, {
      googleEmail:        'moved@transitiontrails.org',
      googleName:         'Moved User',
      googleSub:          'uid-moved',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: 0, // force refresh
      googleAudience:     'coach', // stale — user has since moved to learners
    });
    // Groups re-fetch reflects the change
    mockGetGroups.mockResolvedValue({ groups: [LEARNERS_GROUP], isReliable: true });

    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(true);
    // Stale 'coach' audience must NOT be returned — fresh derivation gives 'learner'
    expect(res.body.audience).toBe('learner');
    expect(mockGetGroups).toHaveBeenCalledWith('moved@transitiontrails.org');
  });

  it('31. stale session where user has been removed from all homebase groups → session destroyed, isSignedIn:false', async () => {
    Object.assign(mockSession, {
      googleEmail:        'removed@transitiontrails.org',
      googleName:         'Removed User',
      googleSub:          'uid-removed',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: 0, // force refresh
      googleAudience:     'coach',
    });
    // Groups re-fetch returns empty with isReliable:true — confirmed removal
    mockGetGroups.mockResolvedValue({ groups: [], isReliable: true });

    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(false);
    expect(res.body.reason).toBe('no_groups');
  });

  it('32. stale session with still-fresh TTL → groups are NOT re-fetched (cache is served)', async () => {
    Object.assign(mockSession, {
      googleEmail:        'cached@transitiontrails.org',
      googleName:         'Cached User',
      googleSub:          'uid-cached',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: Date.now() + 60_000, // TTL still valid
      googleAudience:     'coach',
    });

    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(true);
    expect(res.body.audience).toBe('coach');
    // No re-fetch — cache is still valid
    expect(mockGetGroups).not.toHaveBeenCalled();
  });

  it('33. stale session where Groups API is unavailable (no token / network down) → stale audience served, user NOT signed out', async () => {
    // This test exercises the production outage path: a server restart empties
    // the in-memory groups cache, then the admin token is missing (or the
    // Directory API is unreachable).  getGroupsForUser returns
    // { groups: [], isReliable: false } — an empty groups list that does NOT
    // mean the user has been removed.  homebase/status must preserve the session.
    Object.assign(mockSession, {
      googleEmail:        'apierr@transitiontrails.org',
      googleName:         'API Error User',
      googleSub:          'uid-apierr',
      googleGroups:       [VOLUNTEERS_GROUP],
      googleGroupsExpiry: 0, // force refresh
      googleAudience:     'volunteer',
    });
    // Simulate no-token / API-down: reliable=false, groups=[] (no stale cache)
    mockGetGroups.mockResolvedValue({ groups: [], isReliable: false });

    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    // User must NOT be signed out — isReliable:false means "couldn't check",
    // not "confirmed non-member".  Stale session audience is served as fallback.
    expect(res.body.isSignedIn).toBe(true);
    expect(res.body.audience).toBe('volunteer');
  });
});
// ── 24–25. Hard-refresh / cold-start: /homebase route guard after session expiry ──
//
// When a user hard-refreshes the browser (or starts a cold session), the frontend
// re-fetches /me before rendering. The /homebase route guard in App.tsx checks:
//   user?.audience === 'team'
//   || (!!user?.teamGroup && !!user?.groups?.includes(user.teamGroup))
//
// These tests confirm that /me returns the correct shape on a session-expiry
// refresh so the guard evaluates correctly without requiring a new sign-in.

describe('Hard-refresh / cold-start — /homebase route guard after session expiry', () => {
  const TEAM_MEMBER_EMAIL = 'member@transitiontrails.org';

  beforeEach(() => {
    process.env['GOOGLE_GROUP_TEAM'] = TEAM_GROUP;
  });

  it('24. regular team-member with stale session → groups refreshed → /me returns audience:"team" enabling /homebase access', async () => {
    // Simulate a stale (expired) session for a non-superadmin team-group member.
    // This mirrors a hard-refresh: the session cookie exists but the groups
    // TTL has lapsed, so /me must re-fetch and re-derive the audience.
    Object.assign(mockSession, {
      googleEmail:        TEAM_MEMBER_EMAIL,
      googleName:         'Team Member',
      googleSub:          'uid-team-stale',
      googleGroups:       [TEAM_GROUP],
      googleGroupsExpiry: 0, // force refresh
      googleTier:         'everyday',
      googleAudience:     'team',
    });
    // Groups re-fetch confirms the user is still in the team group
    mockGetGroups.mockResolvedValue({ groups: [TEAM_GROUP], isReliable: true });

    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);

    // audience:'team' satisfies the first branch of the /homebase route guard
    expect(res.body.audience).toBe('team');

    // groups[] and teamGroup are both returned so the second branch
    // (groups.includes(teamGroup)) also passes for superadmins
    expect(res.body.groups).toContain(TEAM_GROUP);
    expect(res.body.teamGroup).toBe(TEAM_GROUP);

    // Confirms the re-fetch actually happened (not served from stale session)
    expect(mockGetGroups).toHaveBeenCalledWith(TEAM_MEMBER_EMAIL);
  });

  it('25. superadmin WITHOUT team group + stale session → /me refresh → audience:null, groups excludes team@ (frontend redirects to /)', async () => {
    const NON_TEAM_SUPERADMIN = 'notteam@transitiontrails.org';
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = NON_TEAM_SUPERADMIN;

    // Stale session for a superadmin who is NOT in the team group
    Object.assign(mockSession, {
      googleEmail:        NON_TEAM_SUPERADMIN,
      googleName:         'Non-Team Admin',
      googleSub:          'uid-nteam-super',
      googleGroups:       ['trailosadmin@transitiontrails.org'],
      googleGroupsExpiry: 0, // force refresh
      googleTier:         'superadmin',
      // audience intentionally absent — staff user
    });
    // Groups re-fetch confirms no team group membership
    mockGetGroups.mockResolvedValue({ groups: ['trailosadmin@transitiontrails.org'], isReliable: true });

    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);

    // audience:null — staff priority wins; no homebase audience
    expect(res.body.audience).toBeNull();

    // groups[] does NOT include the team group → both branches of the
    // /homebase guard evaluate to false → frontend Redirect to="/" fires
    expect(res.body.groups).not.toContain(TEAM_GROUP);

    // teamGroup is still returned (non-null) so the guard can check it,
    // but the groups array doesn't contain it — the redirect is unambiguous
    expect(res.body.teamGroup).toBe(TEAM_GROUP);

    expect(mockGetGroups).toHaveBeenCalledWith(NON_TEAM_SUPERADMIN);
  });
});

// ── 34–37. GET /api/auth/homebase/status — coachLevel refresh on group TTL expiry ─
//
// When the group cache expires (TTL), homebase/status re-derives the audience.
// If the new audience is 'coach', it also re-fetches coachLevel from the DB so
// a profile change (e.g. a promotion from 'associate' to 'advanced') is
// reflected without requiring a sign-out.
//
// 34. Stale coach session → group refresh → DB has an updated coachLevel →
//     session.coachLevel and response.coachLevel both reflect the new value
// 35. Stale coach session → group refresh → DB has no coach_profiles row →
//     coachLevel is set to null (not the old stale value)
// 36. Stale learner session → group refresh → coachLevel DB query is NOT
//     executed (only coaches trigger the DB look-up)
// 37. Stale coach session → group refresh → DB query throws → status still
//     returns 200 with the cached coachLevel (degraded gracefully, no 500)

describe('GET /api/auth/homebase/status — coachLevel refresh on group TTL expiry', () => {
  it('34. stale coach session → group refresh → DB returns updated coachLevel → response reflects new value', async () => {
    Object.assign(mockSession, {
      googleEmail:        'coach@transitiontrails.org',
      googleName:         'Kim Coach',
      googleSub:          'uid-coach-cl',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: 0,          // expired — trigger refresh
      googleAudience:     'coach',
      coachLevel:         'associate', // stale value in session
    });
    mockGetGroups.mockResolvedValue({ groups: [COACHES_GROUP], isReliable: true });

    // DB returns the updated coach level ('advanced')
    vi.mocked(db).select.mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ userEmail: 'coach@transitiontrails.org', coachLevel: 'advanced', updatedAt: new Date() }]),
        }),
      }),
    }) as unknown as ReturnType<typeof db.select>);

    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(true);
    expect(res.body.audience).toBe('coach');
    // The promoted coachLevel must be returned — not the stale 'associate'
    expect(res.body.coachLevel).toBe('advanced');
    expect(mockGetGroups).toHaveBeenCalledWith('coach@transitiontrails.org');
  });

  it('35. stale coach session → group refresh → no DB profile row → coachLevel is null', async () => {
    Object.assign(mockSession, {
      googleEmail:        'newcoach@transitiontrails.org',
      googleName:         'New Coach',
      googleSub:          'uid-new-coach',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: 0,
      googleAudience:     'coach',
      coachLevel:         'associate', // stale
    });
    mockGetGroups.mockResolvedValue({ groups: [COACHES_GROUP], isReliable: true });

    // DB has no record for this coach
    vi.mocked(db).select.mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }) as unknown as ReturnType<typeof db.select>);

    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(true);
    expect(res.body.audience).toBe('coach');
    // No DB row → coachLevel must be null (not the stale 'associate')
    expect(res.body.coachLevel).toBeNull();
  });

  it('36. stale learner session → group refresh → coachLevel DB query is NOT executed', async () => {
    Object.assign(mockSession, {
      googleEmail:        'learner@transitiontrails.org',
      googleName:         'A Learner',
      googleSub:          'uid-lrn-cl',
      googleGroups:       [LEARNERS_GROUP],
      googleGroupsExpiry: 0,
      googleAudience:     'learner',
    });
    mockGetGroups.mockResolvedValue({ groups: [LEARNERS_GROUP], isReliable: true });

    const selectSpy = vi.mocked(db).select;

    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(true);
    expect(res.body.audience).toBe('learner');
    // coachLevel DB query must NOT run for non-coach audiences
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it('37. stale coach session → DB throws during coachLevel re-fetch → status still returns 200 (degraded gracefully)', async () => {
    Object.assign(mockSession, {
      googleEmail:        'coach@transitiontrails.org',
      googleName:         'Kim Coach',
      googleSub:          'uid-coach-dberr',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: 0,
      googleAudience:     'coach',
      coachLevel:         'associate', // cached value in session
    });
    mockGetGroups.mockResolvedValue({ groups: [COACHES_GROUP], isReliable: true });

    // DB query throws (e.g. transient connection error)
    vi.mocked(db).select.mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.reject(new Error('DB connection lost')),
        }),
      }),
    }) as unknown as ReturnType<typeof db.select>);

    const res = await request(app).get('/api/auth/homebase/status');
    // Must NOT return 500 — DB errors during the coach-level re-fetch are
    // non-fatal; the response must always be a 200 with the cached value.
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(true);
    expect(res.body.audience).toBe('coach');
    // Cached coachLevel is served because the DB query failed
    expect(res.body.coachLevel).toBe('associate');
  });
});
