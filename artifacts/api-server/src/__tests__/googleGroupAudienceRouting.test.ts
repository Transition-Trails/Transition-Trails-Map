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
        if (prop === 'destroy') return (cb?: () => void) => cb?.();
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

describe('GET /api/auth/homebase/status with live group sessions', () => {
  it('8. returns audience:"coach" when session contains coaches group audience', async () => {
    Object.assign(mockSession, {
      googleEmail:    'user@transitiontrails.org',
      googleGroups:   [COACHES_GROUP],
      googleAudience: 'coach',
    });
    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(true);
    expect(res.body.audience).toBe('coach');
  });

  it('9. returns audience:"volunteer" when session contains volunteer group audience', async () => {
    Object.assign(mockSession, {
      googleEmail:    'user@transitiontrails.org',
      googleGroups:   [VOLUNTEERS_GROUP],
      googleAudience: 'volunteer',
    });
    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.audience).toBe('volunteer');
  });

  it('10. returns audience:"learner" when session contains learners group audience', async () => {
    Object.assign(mockSession, {
      googleEmail:    'user@transitiontrails.org',
      googleGroups:   [LEARNERS_GROUP],
      googleAudience: 'learner',
    });
    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.audience).toBe('learner');
  });

  it('11. returns audience:null for a staff-only session (no homebase audience)', async () => {
    Object.assign(mockSession, {
      googleEmail:  'staff@transitiontrails.org',
      googleGroups: ['trailosadmin@transitiontrails.org'],
      // googleAudience intentionally absent — staff users have no homebase audience
    });
    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.audience).toBeNull();
  });
});

// ── 12–14. Full callback → /auth/homebase/status flow ────────────────────────

describe('Full sign-in → /auth/homebase/status with live group addresses', () => {
  it('12. coach-group member gets audience:"coach" after full sign-in', async () => {
    stubTokenExchange({
      sub: 'uid-coach-1', email: 'coach@transitiontrails.org',
      name: 'A Coach', hd: 'transitiontrails.org', email_verified: true,
    });
    mockGetGroups.mockResolvedValue([COACHES_GROUP]);

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
    mockGetGroups.mockResolvedValue([VOLUNTEERS_GROUP]);

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
    mockGetGroups.mockResolvedValue([LEARNERS_GROUP]);

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
    mockGetGroups.mockResolvedValue([COACHES_GROUP]);

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
    mockGetGroups.mockResolvedValue([VOLUNTEERS_GROUP]);

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
    mockGetGroups.mockResolvedValue([LEARNERS_GROUP]);

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
    mockGetGroups.mockResolvedValue([]);

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
    mockGetGroups.mockResolvedValue([
      'trailosadmin@transitiontrails.org',
      COACHES_GROUP,
    ]);

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
    mockGetGroups.mockResolvedValue([TEAM_GROUP]);

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
    mockGetGroups.mockResolvedValue([TEAM_GROUP]);

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
    mockGetGroups.mockResolvedValue([TEAM_GROUP]);

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
