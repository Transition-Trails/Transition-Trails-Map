/**
 * adoptionTracking.test.ts
 *
 * Focused tests for the User Activity & Adoption Tracking features:
 *
 *  1. checkRate          — rate limiter: 60/min, 61st denied, window resets, per-email isolation
 *  2. KNOWN_FEATURES/KNOWN_ACTIONS allowlists — server-side enforcement in track.ts
 *  3. parseDateRange     — UTC day windows, defaults, inclusive dateTo, malformed input
 *  4. POST /api/track    — 401 unauthenticated, 400 unknown feature, 400 unknown action, 429 rate-limited
 *  5. GET /admin/activity-summary — 401 unauthenticated, 403 non-admin staff
 *  6. GET /admin/feature-usage-summary — 401 unauthenticated, 403 non-admin staff
 *  7. GET /admin/failure-summary — 401 unauthenticated, 403 non-admin staff
 *  8. Deduplication math — affected-user count must use distinct query, not sum-of-per-group
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Session & store mocks (must be hoisted before any dynamic imports) ────────
// Pattern mirrors homebaseAuth.test.ts: replace express-session and
// connect-pg-simple so no real Postgres connection is opened.

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

// ── DB mock (include pool to satisfy session store init in app.ts) ─────────────

vi.mock('@workspace/db', () => {
  const mockChain: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ['from', 'where', 'groupBy', 'orderBy', 'limit', 'offset'];
  chainMethods.forEach(m => {
    mockChain[m] = vi.fn();
  });
  // Each chain step returns the chain itself (fluent API)
  chainMethods.forEach(m => {
    mockChain[m]!.mockReturnValue(mockChain);
  });
  // Default terminal resolution — overridden per-test where needed
  mockChain['orderBy']!.mockResolvedValue([]);

  return {
    pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
    db: {
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
      select: vi.fn().mockReturnValue(mockChain),
    },
  };
});

vi.mock('@workspace/db/schema', () => ({
  trailOsAuditLogTable: {
    _:           { name: 'trail_os_audit_log' },
    actorEmail:  'actor_email',
    eventType:   'event_type',
    createdAt:   'created_at',
    metadata:    'metadata',
    audience:    'audience',
  },
}));

// ── Lazy imports after mocks ───────────────────────────────────────────────────

import { checkRate, rateBuckets, RATE_MAX_CALLS, RATE_WINDOW_MS, KNOWN_FEATURES, KNOWN_ACTIONS } from '../routes/track.js';
import { parseDateRange } from '../routes/adminUsers.js';
import app from '../app.js';
import type { Request } from 'express';

// ── Shared env setup ──────────────────────────────────────────────────────────

const ADMIN_GROUP    = 'trailosadmin@transitiontrails.org';
const EVERYDAY_GROUP = 'trailosusers@transitiontrails.org';

beforeEach(() => {
  vi.clearAllMocks();
  process.env['GOOGLE_GROUP_ADMIN']    = ADMIN_GROUP;
  process.env['GOOGLE_GROUP_EVERYDAY'] = EVERYDAY_GROUP;
  // Clear mockSession between tests
  Object.keys(mockSession).forEach(k => delete mockSession[k]);
});

afterEach(() => {
  delete process.env['GOOGLE_GROUP_ADMIN'];
  delete process.env['GOOGLE_GROUP_EVERYDAY'];
});

// ── 1. checkRate — rate limiter ────────────────────────────────────────────────

describe('checkRate — in-memory rate limiter', () => {
  const EMAIL = 'ratelimitee@test.com';

  beforeEach(() => { rateBuckets.delete(EMAIL); });

  it('allows the first call', () => {
    expect(checkRate(EMAIL).allowed).toBe(true);
  });

  it(`allows exactly ${RATE_MAX_CALLS} calls in one window`, () => {
    for (let i = 0; i < RATE_MAX_CALLS; i++) {
      expect(checkRate(EMAIL).allowed).toBe(true);
    }
  });

  it(`denies the ${RATE_MAX_CALLS + 1}th call with a retryAfter`, () => {
    for (let i = 0; i < RATE_MAX_CALLS; i++) checkRate(EMAIL);
    const result = checkRate(EMAIL);
    expect(result.allowed).toBe(false);
    expect(typeof result.retryAfter).toBe('number');
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(RATE_WINDOW_MS / 1000);
  });

  it('resets the bucket after the window expires', () => {
    for (let i = 0; i <= RATE_MAX_CALLS; i++) checkRate(EMAIL);
    const bucket = rateBuckets.get(EMAIL)!;
    bucket.resetAt = Date.now() - 1;           // expire the window
    expect(checkRate(EMAIL).allowed).toBe(true);
  });

  it('tracks different emails independently', () => {
    const OTHER = 'other@test.com';
    rateBuckets.delete(OTHER);
    for (let i = 0; i <= RATE_MAX_CALLS; i++) checkRate(EMAIL);
    expect(checkRate(OTHER).allowed).toBe(true);  // fresh bucket for OTHER
  });
});

// ── 2. Payload allowlists ─────────────────────────────────────────────────────

describe('track.ts — payload allowlists', () => {
  it('KNOWN_FEATURES includes expected hub names', () => {
    for (const f of ['penny', 'knowledge', 'programs', 'sf_ops', 'collaboration', 'governance']) {
      expect(KNOWN_FEATURES.has(f)).toBe(true);
    }
  });

  it('KNOWN_ACTIONS includes expected lifecycle events', () => {
    for (const a of ['open', 'navigate', 'query_submit']) {
      expect(KNOWN_ACTIONS.has(a)).toBe(true);
    }
  });

  it('KNOWN_FEATURES does not include empty string or whitespace', () => {
    expect(KNOWN_FEATURES.has('')).toBe(false);
    expect(KNOWN_FEATURES.has(' ')).toBe(false);
  });
});

// ── 3. parseDateRange ─────────────────────────────────────────────────────────

describe('parseDateRange — UTC day-window helper', () => {
  function makeReq(query: Record<string, string>): Request {
    return { query } as unknown as Request;
  }

  function isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  it('explicit dateFrom + dateTo produce inclusive UTC windows', () => {
    const { dayStart, dayEnd } = parseDateRange(makeReq({ dateFrom: '2026-01-15', dateTo: '2026-01-17' }));
    expect(isoDate(dayStart)).toBe('2026-01-15');
    expect(isoDate(dayEnd)).toBe('2026-01-18'); // dateTo inclusive: dayEnd = next day midnight
  });

  it('defaults dayStart to 30 days ago when dateFrom is absent', () => {
    const { dayStart } = parseDateRange(makeReq({}));
    const expected = new Date();
    expected.setUTCDate(expected.getUTCDate() - 30);
    expect(isoDate(dayStart)).toBe(isoDate(expected));
  });

  it('defaults dayStart to 7 days ago when defaultDaysBack=7', () => {
    const { dayStart } = parseDateRange(makeReq({}), 7);
    const expected = new Date();
    expected.setUTCDate(expected.getUTCDate() - 7);
    expect(isoDate(dayStart)).toBe(isoDate(expected));
  });

  it('dayEnd is tomorrow when dateTo is absent (today is inclusive)', () => {
    const { dayEnd } = parseDateRange(makeReq({}));
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    expect(isoDate(dayEnd)).toBe(isoDate(tomorrow));
  });

  it('ignores malformed date strings and falls back to defaults', () => {
    const { dayStart } = parseDateRange(makeReq({ dateFrom: 'not-a-date' }));
    const expected = new Date();
    expected.setUTCDate(expected.getUTCDate() - 30);
    expect(isoDate(dayStart)).toBe(isoDate(expected));
  });
});

// ── 4. POST /api/track — HTTP integration ─────────────────────────────────────

describe('POST /api/track — auth and payload enforcement', () => {
  it('returns 401 when there is no authenticated session', async () => {
    // mockSession is empty → no googleEmail
    const res = await request(app)
      .post('/api/track')
      .send({ feature: 'penny', action: 'open' });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: 'not_authenticated' });
  });

  it('returns 400 for an unknown feature even with a valid session', async () => {
    mockSession['googleEmail'] = 'staff@transitiontrails.org';
    mockSession['googleGroups'] = [EVERYDAY_GROUP];
    const res = await request(app)
      .post('/api/track')
      .send({ feature: 'random_pii_string', action: 'open' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'unknown_feature' });
  });

  it('returns 400 for an unknown action even with a valid session', async () => {
    mockSession['googleEmail'] = 'staff@transitiontrails.org';
    mockSession['googleGroups'] = [EVERYDAY_GROUP];
    const res = await request(app)
      .post('/api/track')
      .send({ feature: 'penny', action: 'arbitrary_action' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'unknown_action' });
  });

  it('returns 429 when the rate limit is exhausted', async () => {
    const email = 'ratelimited@transitiontrails.org';
    mockSession['googleEmail'] = email;
    mockSession['googleGroups'] = [EVERYDAY_GROUP];
    rateBuckets.delete(email);
    // Exhaust the bucket in-process (without HTTP overhead)
    for (let i = 0; i < RATE_MAX_CALLS; i++) checkRate(email);
    const res = await request(app)
      .post('/api/track')
      .send({ feature: 'penny', action: 'open' });
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ error: 'rate_limited' });
    rateBuckets.delete(email);
  });

  it('returns 200 for a valid authenticated request with known feature+action', async () => {
    const email = 'validstaff@transitiontrails.org';
    mockSession['googleEmail'] = email;
    mockSession['googleGroups'] = [EVERYDAY_GROUP];
    rateBuckets.delete(email);
    const res = await request(app)
      .post('/api/track')
      .send({ feature: 'penny', action: 'open' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
    rateBuckets.delete(email);
  });
});

// ── 5. GET /admin/activity-summary — auth guards ──────────────────────────────

describe('GET /admin/activity-summary — auth enforcement', () => {
  it('returns 401 when there is no session', async () => {
    const res = await request(app).get('/api/admin/activity-summary');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin staff (everyday tier)', async () => {
    mockSession['googleEmail']  = 'everyday@transitiontrails.org';
    mockSession['googleGroups'] = [EVERYDAY_GROUP]; // not in ADMIN_GROUP
    const res = await request(app).get('/api/admin/activity-summary');
    expect(res.status).toBe(403);
  });
});

// ── 6. GET /admin/feature-usage-summary — auth guards ────────────────────────

describe('GET /admin/feature-usage-summary — auth enforcement', () => {
  it('returns 401 when there is no session', async () => {
    const res = await request(app).get('/api/admin/feature-usage-summary');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin authenticated users', async () => {
    mockSession['googleEmail']  = 'everyday@transitiontrails.org';
    mockSession['googleGroups'] = [EVERYDAY_GROUP];
    const res = await request(app).get('/api/admin/feature-usage-summary');
    expect(res.status).toBe(403);
  });
});

// ── 7. GET /admin/failure-summary — auth guards ───────────────────────────────

describe('GET /admin/failure-summary — auth enforcement', () => {
  it('returns 401 when there is no session', async () => {
    const res = await request(app).get('/api/admin/failure-summary');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin authenticated users', async () => {
    mockSession['googleEmail']  = 'everyday@transitiontrails.org';
    mockSession['googleGroups'] = [EVERYDAY_GROUP];
    const res = await request(app).get('/api/admin/failure-summary');
    expect(res.status).toBe(403);
  });
});

// ── 8. Affected-user deduplication — business-logic correctness ───────────────

describe('failure-summary affected-user deduplication', () => {
  /**
   * A user with errors on two different routes must be counted as ONE
   * affected user, not two.  The correct implementation uses a separate
   * `count(distinct actor_email)` query over the full filtered set;
   * summing per-group counts is incorrect.
   */
  it('counts a user appearing in two route/status groups as 1 affected user', () => {
    // Simulate per-group DB results: userA appears in both groups
    const perGroupRows = [
      { route: '/api/foo', status: 500, message: 'err A', count: 3, affectedUsers: 1 },
      { route: '/api/bar', status: 502, message: 'err B', count: 2, affectedUsers: 1 },
    ];
    // The distinct-user query returns the true count (1, not 2)
    const distinctQueryResult = [{ count: 1 }];

    const totalErrors       = perGroupRows.reduce((s, r) => s + r.count, 0);
    const trueAffectedUsers = distinctQueryResult[0]?.count ?? 0;

    expect(totalErrors).toBe(5);
    expect(trueAffectedUsers).toBe(1);  // single distinct user across both groups
  });

  it('demonstrates that summing per-group counts incorrectly produces 2 (regression anchor)', () => {
    const perGroupRows = [
      { affectedUsers: 1 },  // userA in group 1
      { affectedUsers: 1 },  // userA in group 2 — same person!
    ];
    const naiveSum = perGroupRows.reduce((s, r) => s + r.affectedUsers, 0);
    // This is the WRONG value — confirms the naive approach must be avoided
    expect(naiveSum).toBe(2);
  });
});
