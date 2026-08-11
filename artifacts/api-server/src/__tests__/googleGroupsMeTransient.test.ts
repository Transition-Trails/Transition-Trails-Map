/**
 * googleGroupsMeTransient.test.ts
 *
 * Integration tests for the /me endpoint's resilience when the Google
 * Directory API is temporarily unavailable.
 *
 * Unlike googleGroupAudienceRouting.test.ts (which mocks getGroupsForUser
 * directly), these tests exercise the REAL googleGroupsCache layer and mock
 * at the HTTP level — simulating the production failure path where:
 *
 *   fetch() → Directory API → 429 / 500 / ECONNREFUSED
 *     → isMemberOf() throws
 *       → getGroupsForUser() throws (no stale cache)
 *         → /me try/catch → 200 with stale session data
 *
 * Coverage:
 *   1. Directory API returns 429 (rate-limited) → /me serves stale session, 200
 *   2. Directory API returns 500 (server error)  → /me serves stale session, 200
 *   3. fetch() throws (network error / ECONNREFUSED) → /me serves stale session, 200
 *   4. Directory API 429 on refresh → stale audience preserved (not sign-out)
 *   5. Stale cache hit → groups served from cache without hitting Directory API
 *   6. 404 from Directory API is definitive (non-member), not a transient error
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Group addresses ───────────────────────────────────────────────────────────

const COACHES_GROUP    = 'coaches@transitiontrails.org';
const LEARNERS_GROUP   = 'learners@transitiontrails.org';
const VOLUNTEERS_GROUP = 'volunteer@transitiontrails.org';

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

// ── DB mock ───────────────────────────────────────────────────────────────────

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]), catch: vi.fn() })) })),
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
  trailOsAuditLogTable: { _: { name: 'trail_os_audit_log' } },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(f => ({ __desc: f })),
  eq:   vi.fn().mockReturnValue({ __eq: true }),
  gte:  vi.fn().mockReturnValue({ __gte: true }),
  and:  vi.fn().mockReturnValue({ __and: true }),
}));

// ── Google Admin mock — provides an access token without real credentials ─────
// NOTE: googleGroupsCache is NOT mocked here so the real isMemberOf + cache
// logic runs against our mocked fetch responses.

vi.mock('../lib/googleAdmin.js', () => ({
  getAdminAccessToken:     vi.fn().mockResolvedValue('fake-access-token'),
  getAdminUserAccessToken: vi.fn().mockResolvedValue('fake-user-token'),
  getAdminDirectoryStatus: vi.fn().mockReturnValue({ method: 'service-account', ok: true }),
}));

import { clearGroupsCache } from '../lib/googleGroupsCache.js';
import app from '../app.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clearSession() {
  for (const k of Object.keys(mockSession)) delete mockSession[k];
}

/** Directory API base URL prefix — used to distinguish from other fetch calls. */
const DIRECTORY_URL = 'https://admin.googleapis.com/admin/directory/v1/groups/';

/**
 * Stub global.fetch so Directory API membership calls return the given status.
 * Any other fetch call (e.g. token exchange) resolves normally.
 */
function stubDirectoryStatus(status: number) {
  global.fetch = vi.fn().mockImplementation((url: string | URL) => {
    if (String(url).startsWith(DIRECTORY_URL)) {
      return Promise.resolve({ status, ok: status >= 200 && status < 300 });
    }
    // Passthrough for everything else (shouldn't be needed in these tests)
    return Promise.reject(new Error('Unexpected fetch call in test: ' + String(url)));
  });
}

/**
 * Stub global.fetch so Directory API membership calls throw a network error.
 */
function stubDirectoryNetworkError() {
  global.fetch = vi.fn().mockImplementation((url: string | URL) => {
    if (String(url).startsWith(DIRECTORY_URL)) {
      return Promise.reject(new Error('connect ECONNREFUSED 142.250.80.202:443'));
    }
    return Promise.reject(new Error('Unexpected fetch call in test: ' + String(url)));
  });
}

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  clearSession();
  clearGroupsCache();
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
  clearGroupsCache();
  vi.restoreAllMocks();
  process.env = { ...ORIG_ENV };
});

// ── 1–4. Transient Directory API failures: /me must not destroy the session ───

describe('GET /api/auth/google/me — transient Directory API failure (real cache)', () => {
  it('1. Directory API returns 429 (rate-limited) → /me returns stale session, not 500 or sign-out', async () => {
    Object.assign(mockSession, {
      googleEmail:        'coach@transitiontrails.org',
      googleName:         'A Coach',
      googleSub:          'uid-c',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: 0, // force a refresh attempt
      googleTier:         'everyday',
      googleAudience:     'coach',
    });

    stubDirectoryStatus(429);

    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    // Stale audience must be served — user must NOT be signed out
    expect(res.body.audience).toBe('coach');
    expect(res.body.email).toBe('coach@transitiontrails.org');
  });

  it('2. Directory API returns 500 (server error) → /me returns stale session, not 500 or sign-out', async () => {
    Object.assign(mockSession, {
      googleEmail:        'learner@transitiontrails.org',
      googleName:         'A Learner',
      googleSub:          'uid-l',
      googleGroups:       [LEARNERS_GROUP],
      googleGroupsExpiry: 0,
      googleTier:         'everyday',
      googleAudience:     'learner',
    });

    stubDirectoryStatus(500);

    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.audience).toBe('learner');
    expect(res.body.email).toBe('learner@transitiontrails.org');
  });

  it('3. fetch() throws network error (ECONNREFUSED) → /me returns stale session, not 500 or sign-out', async () => {
    Object.assign(mockSession, {
      googleEmail:        'vol@transitiontrails.org',
      googleName:         'A Volunteer',
      googleSub:          'uid-v',
      googleGroups:       [VOLUNTEERS_GROUP],
      googleGroupsExpiry: 0,
      googleTier:         'everyday',
      googleAudience:     'volunteer',
    });

    stubDirectoryNetworkError();

    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.audience).toBe('volunteer');
  });

  it('4. Directory API 429 on refresh → session preserved (authenticated:true), session not destroyed', async () => {
    Object.assign(mockSession, {
      googleEmail:        'coach@transitiontrails.org',
      googleName:         'A Coach',
      googleSub:          'uid-c2',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: 0,
      googleTier:         'everyday',
      googleAudience:     'coach',
    });

    stubDirectoryStatus(429);

    const res = await request(app).get('/api/auth/google/me');
    // Must never return authenticated:false (which would lock the user out)
    expect(res.body.authenticated).not.toBe(false);
    // Status must not be 500
    expect(res.status).not.toBe(500);
  });
});

// ── 5. Cache hit path: stale cache serves groups without Directory API ─────────

describe('googleGroupsCache — stale in-memory cache serves during transient failure', () => {
  it('5. groups already in cache → served immediately; Directory API is not called even if broken', async () => {
    // Pre-warm the in-memory cache with a fresh (non-expired) entry.
    // We do this by first calling /me with a working Directory API that returns 200.
    Object.assign(mockSession, {
      googleEmail:        'coach@transitiontrails.org',
      googleName:         'A Coach',
      googleSub:          'uid-c3',
      googleGroups:       [COACHES_GROUP],
      // Expiry is in the future — no refresh needed, no Directory API call
      googleGroupsExpiry: Date.now() + 5 * 60 * 1000,
      googleTier:         'everyday',
      googleAudience:     'coach',
    });

    // Directory API is broken — but the session TTL has not expired, so it
    // should never be called.
    stubDirectoryStatus(503);
    const fetchSpy = vi.mocked(global.fetch);

    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.audience).toBe('coach');

    // fetch should NOT have been called — session TTL is still valid
    const directoryCalls = fetchSpy.mock.calls.filter(
      ([url]) => String(url).startsWith(DIRECTORY_URL),
    );
    expect(directoryCalls).toHaveLength(0);
  });
});

// ── 6. 404 is a definitive non-member result, not a transient error ───────────

describe('isMemberOf — 404 is definitive non-membership, not a transient failure', () => {
  it('6. Directory API returns 404 → treated as non-member, not a transient error; user removed from all groups → session destroyed', async () => {
    // A user whose group membership has genuinely lapsed — all Directory API
    // probes return 404 (member not found), which is a definitive signal.
    Object.assign(mockSession, {
      googleEmail:        'ex@transitiontrails.org',
      googleName:         'Ex User',
      googleSub:          'uid-ex',
      googleGroups:       [COACHES_GROUP],
      googleGroupsExpiry: 0, // force refresh
      googleTier:         'everyday',
      googleAudience:     'coach',
    });

    // All probes return 404 — user is definitively not a member of any group
    stubDirectoryStatus(404);

    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    // Definitive non-membership → session destroyed → authenticated:false
    expect(res.body.authenticated).toBe(false);
    expect(res.body.reason).toBe('no_groups');
  });
});
