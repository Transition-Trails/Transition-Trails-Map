import { describe, test, expect, beforeEach, beforeAll, vi } from 'vitest';

// Stub native fetch so cache-miss paths don't make real HTTP calls to Salesforce.
// Every SF REST response is an empty SOQL result.  This runs regardless of which
// other test files are in the suite and doesn't rely on module-mock hoisting.
vi.stubGlobal(
  'fetch',
  vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ totalSize: 0, done: true, records: [] }),
    text: async () => '',
    headers: new Headers(),
    redirected: false,
    type: 'basic' as const,
    url: '',
    clone: () => ({ ok: true } as unknown as Response),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    body: null,
    bodyUsed: false,
  }) as unknown as Response),
);

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import session from 'express-session';
import request from 'supertest';
import { flushSfCacheForUser, opsCache } from '../routes/salesforce.js';
import salesforceRouter from '../routes/salesforce.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function seedEntry(key: string, data: unknown = {}): void {
  opsCache.set(key, { data, ts: Date.now() });
}

// ── Minimal test app with injectable session.sfUserId ─────────────────────────
//
// Using the real app (app.ts) would require SESSION_SECRET, Clerk middleware,
// and a FileStore — all unnecessary for cache isolation testing.  Instead we
// mount only the SF router on a lightweight express app that:
//   1. Writes fake sfAccessToken + sfInstanceUrl into every session so
//      getEffectiveSfToken() returns non-null credentials (no mock needed).
//   2. Reads x-sf-user-id from the request header and writes it into the
//      session's sfUserId field, exactly mirroring what the OAuth callback does
//      in production, so the route's cache-key derivation
//      (`req.session.sfUserId ?? "system"`) is exercised end-to-end.

let testApp: Express;

beforeAll(() => {
  testApp = express();
  testApp.use(
    session({
      secret: 'test-isolation-secret',
      resave: false,
      saveUninitialized: true,
    }),
  );
  // Inject fake SF credentials + optional user ID for every request
  testApp.use((req: Request, _res: Response, next: NextFunction) => {
    req.session.sfAccessToken = 'fake-access-token';
    req.session.sfInstanceUrl = 'https://test.salesforce.com';
    const uid = req.headers['x-sf-user-id'];
    if (typeof uid === 'string' && uid.length > 0) {
      req.session.sfUserId = uid;
    }
    next();
  });
  testApp.use('/', salesforceRouter);
});

// ── flushSfCacheForUser — direct unit tests ────────────────────────────────────

describe('flushSfCacheForUser', () => {
  beforeEach(() => opsCache.clear());

  test('removes system: entries when a user ID is provided', () => {
    seedEntry('system:ops-summary');
    seedEntry('system:ops-cases');
    seedEntry('user-a:ops-summary');

    flushSfCacheForUser('user-a');

    expect(opsCache.has('system:ops-summary')).toBe(false);
    expect(opsCache.has('system:ops-cases')).toBe(false);
  });

  test("removes the authenticating user's own entries", () => {
    seedEntry('user-a:ops-summary');
    seedEntry('user-a:ops-cases');
    seedEntry('user-a:org-url');

    flushSfCacheForUser('user-a');

    expect(opsCache.has('user-a:ops-summary')).toBe(false);
    expect(opsCache.has('user-a:ops-cases')).toBe(false);
    expect(opsCache.has('user-a:org-url')).toBe(false);
  });

  test('does NOT remove entries belonging to a different user', () => {
    seedEntry('user-b:ops-summary', { programs: { total: 99 } });
    seedEntry('user-b:ops-cases');

    flushSfCacheForUser('user-a'); // user-a logs in — must not touch user-b's data

    expect(opsCache.has('user-b:ops-summary')).toBe(true);
    expect(opsCache.has('user-b:ops-cases')).toBe(true);
  });

  test('without a userId only removes system: entries, leaving all user entries intact', () => {
    seedEntry('system:ops-summary');
    seedEntry('user-a:ops-summary');
    seedEntry('user-b:ops-summary');

    flushSfCacheForUser(); // no sfUserId

    expect(opsCache.has('system:ops-summary')).toBe(false);
    expect(opsCache.has('user-a:ops-summary')).toBe(true);
    expect(opsCache.has('user-b:ops-summary')).toBe(true);
  });

  test('is a no-op when the cache is already empty', () => {
    expect(() => flushSfCacheForUser('user-a')).not.toThrow();
    expect(opsCache.size).toBe(0);
  });

  test('does not remove an entry whose key merely contains the user ID as a substring', () => {
    // "user-abc" must NOT be flushed when flushing "user-a"
    seedEntry('user-abc:ops-summary');

    flushSfCacheForUser('user-a');

    expect(opsCache.has('user-abc:ops-summary')).toBe(true);
  });
});

// ── Cross-user cache isolation — direct unit tests ────────────────────────────

describe('cross-user cache isolation', () => {
  beforeEach(() => opsCache.clear());

  test("two users' cached data is stored under independent namespaced keys", () => {
    const userAData = { programs: { total: 10, active: 5, planning: 5 } };
    const userBData = { programs: { total: 99, active: 80, planning: 19 } };

    seedEntry('user-a:ops-summary', userAData);
    seedEntry('user-b:ops-summary', userBData);

    expect(opsCache.get('user-a:ops-summary')?.data).toEqual(userAData);
    expect(opsCache.get('user-b:ops-summary')?.data).toEqual(userBData);

    const userAPrograms = (opsCache.get('user-a:ops-summary')?.data as typeof userAData).programs;
    const userBPrograms = (opsCache.get('user-b:ops-summary')?.data as typeof userBData).programs;
    expect(userAPrograms.total).not.toBe(userBPrograms.total);
  });

  test("flushing user A does not expose user B's stale data to user A", () => {
    const userAData = { programs: { total: 10 } };
    const userBData = { programs: { total: 99 } };

    seedEntry('user-a:ops-summary', userAData);
    seedEntry('user-b:ops-summary', userBData);

    flushSfCacheForUser('user-a');

    expect(opsCache.has('user-a:ops-summary')).toBe(false);
    expect(opsCache.get('user-b:ops-summary')?.data).toEqual(userBData);
  });

  test('pre-login system entries are cleared when any user logs in', () => {
    seedEntry('system:ops-summary', { programs: { total: 42 } });
    seedEntry('system:ops-cases', { cases: [] });
    seedEntry('system:org-url', { orgBaseUrl: 'https://org.example.com' });

    flushSfCacheForUser('user-b'); // new user logs in

    expect(opsCache.has('system:ops-summary')).toBe(false);
    expect(opsCache.has('system:ops-cases')).toBe(false);
    expect(opsCache.has('system:org-url')).toBe(false);
  });

  test("login flush removes both the new user's stale entries AND all system entries", () => {
    seedEntry('system:ops-summary');
    seedEntry('user-a:ops-summary', { programs: { total: 5 } });
    seedEntry('user-b:ops-summary', { programs: { total: 99 } });

    flushSfCacheForUser('user-a'); // user-a re-authenticates

    expect(opsCache.has('user-a:ops-summary')).toBe(false);
    expect(opsCache.has('system:ops-summary')).toBe(false);
    expect(opsCache.has('user-b:ops-summary')).toBe(true);
    expect(
      (opsCache.get('user-b:ops-summary')?.data as { programs: { total: number } }).programs.total,
    ).toBe(99);
  });

  test('multiple concurrent users maintain fully independent cache namespaces', () => {
    const users = ['user-x', 'user-y', 'user-z'];
    const endpoints = ['ops-summary', 'ops-cases', 'org-url', 'programs-list'];

    for (const userId of users) {
      for (const endpoint of endpoints) {
        seedEntry(`${userId}:${endpoint}`, { owner: userId });
      }
    }

    expect(opsCache.size).toBe(users.length * endpoints.length);

    flushSfCacheForUser('user-y');

    for (const endpoint of endpoints) {
      expect(opsCache.has(`user-y:${endpoint}`)).toBe(false);
    }

    for (const userId of ['user-x', 'user-z']) {
      for (const endpoint of endpoints) {
        expect(opsCache.has(`${userId}:${endpoint}`)).toBe(true);
        expect(
          (opsCache.get(`${userId}:${endpoint}`)?.data as { owner: string }).owner,
        ).toBe(userId);
      }
    }
  });
});

// ── HTTP-level integration: route cache-key derivation ────────────────────────
//
// These tests exercise the actual express route handlers to confirm that the
// key construction (`req.session.sfUserId ?? "system"`) works end-to-end.
// A regression where a handler drops the sfUserId prefix or falls back to a
// hard-coded namespace would not be caught by the unit tests above.

describe('HTTP route-level cache key derivation', () => {
  beforeEach(() => opsCache.clear());

  test('two users with different sfUserId values receive data from their own cache namespaces', async () => {
    // Pre-seed distinct data for each user namespace
    const userAPayload = {
      programs: { total: 11, active: 8, planning: 3 },
      engagements: { total: 20, active: 15 },
      serviceDeliveries: { last30Days: 5 },
      cases: { open: 2, highPriority: 1 },
      contacts: { total: 50 },
      lastUpdated: new Date().toISOString(),
      fromCache: false,
      cacheAge: 0,
    };
    const userBPayload = {
      programs: { total: 77, active: 60, planning: 17 },
      engagements: { total: 100, active: 90 },
      serviceDeliveries: { last30Days: 30 },
      cases: { open: 5, highPriority: 4 },
      contacts: { total: 200 },
      lastUpdated: new Date().toISOString(),
      fromCache: false,
      cacheAge: 0,
    };

    opsCache.set('user-a:ops-summary', { data: userAPayload, ts: Date.now() });
    opsCache.set('user-b:ops-summary', { data: userBPayload, ts: Date.now() });

    const resA = await request(testApp)
      .get('/salesforce/operations/summary')
      .set('x-sf-user-id', 'user-a');

    const resB = await request(testApp)
      .get('/salesforce/operations/summary')
      .set('x-sf-user-id', 'user-b');

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    // Each user gets only their own data
    expect(resA.body.programs.total).toBe(11);
    expect(resB.body.programs.total).toBe(77);

    // Neither user got the other's data
    expect(resA.body.programs.total).not.toBe(resB.body.programs.total);
    expect(resA.body.contacts.total).not.toBe(resB.body.contacts.total);

    // Both responses came from the pre-seeded cache
    expect(resA.body.fromCache).toBe(true);
    expect(resB.body.fromCache).toBe(true);
  });

  test('a request without sfUserId falls back to the system namespace and does not bleed into a user namespace', async () => {
    const systemPayload = {
      programs: { total: 5, active: 3, planning: 2 },
      engagements: { total: 8, active: 6 },
      serviceDeliveries: { last30Days: 1 },
      cases: { open: 0, highPriority: 0 },
      contacts: { total: 10 },
      lastUpdated: new Date().toISOString(),
      fromCache: false,
      cacheAge: 0,
    };
    const userCPayload = {
      programs: { total: 999, active: 900, planning: 99 },
      engagements: { total: 500, active: 450 },
      serviceDeliveries: { last30Days: 100 },
      cases: { open: 10, highPriority: 8 },
      contacts: { total: 1000 },
      lastUpdated: new Date().toISOString(),
      fromCache: false,
      cacheAge: 0,
    };

    opsCache.set('system:ops-summary', { data: systemPayload, ts: Date.now() });
    opsCache.set('user-c:ops-summary', { data: userCPayload, ts: Date.now() });

    // No x-sf-user-id header → system namespace
    const resSystem = await request(testApp).get('/salesforce/operations/summary');

    // x-sf-user-id: user-c → user-c namespace
    const resUserC = await request(testApp)
      .get('/salesforce/operations/summary')
      .set('x-sf-user-id', 'user-c');

    expect(resSystem.status).toBe(200);
    expect(resUserC.status).toBe(200);

    // Each response matches only its own namespace
    expect(resSystem.body.programs.total).toBe(5);
    expect(resUserC.body.programs.total).toBe(999);

    // The namespaces are isolated from each other
    expect(resSystem.body.programs.total).not.toBe(resUserC.body.programs.total);
  });

  test('after flushSfCacheForUser clears a user namespace, that user gets a fresh (non-cached) response', async () => {
    // Seed stale data for user-d
    const stalePayload = {
      programs: { total: 1, active: 1, planning: 0 },
      engagements: { total: 1, active: 1 },
      serviceDeliveries: { last30Days: 0 },
      cases: { open: 0, highPriority: 0 },
      contacts: { total: 1 },
      lastUpdated: new Date(Date.now() - 10_000).toISOString(),
      fromCache: false,
      cacheAge: 0,
    };
    opsCache.set('user-d:ops-summary', { data: stalePayload, ts: Date.now() });

    // First request — served from pre-seeded cache
    const resBefore = await request(testApp)
      .get('/salesforce/operations/summary')
      .set('x-sf-user-id', 'user-d');
    expect(resBefore.status).toBe(200);
    expect(resBefore.body.fromCache).toBe(true);
    expect(resBefore.body.programs.total).toBe(1);

    // Simulate user-d re-authenticating: the OAuth callback calls flushSfCacheForUser
    flushSfCacheForUser('user-d');
    expect(opsCache.has('user-d:ops-summary')).toBe(false);

    // Second request — cache miss; route fetches from SF (stubbed fetch returns zeros)
    const resAfter = await request(testApp)
      .get('/salesforce/operations/summary')
      .set('x-sf-user-id', 'user-d');
    expect(resAfter.status).toBe(200);
    expect(resAfter.body.fromCache).toBe(false); // freshly fetched, not from cache
  });
});
