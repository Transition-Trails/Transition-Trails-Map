/**
 * userPrefs.test.ts
 *
 * Confirms the GET / PATCH /api/user/prefs flow that backs the "What's New"
 * dot in the sidebar.
 *
 * Scenarios
 * ─────────
 * P1. GET returns empty prefs when nothing has been stored yet.
 * P2. PATCH with { prefs: { lastSeenVersion: "1.5" } } is accepted (200) and
 *     the response reflects the stored value.
 * P3. Subsequent GET returns the patched value — simulating a page reload.
 * P4. PATCH persists across multiple requests within the same session (cookie
 *     jar roam).
 * P5. PATCH with a missing `prefs` key returns 400.
 * P6. PATCH with a non-primitive value returns 400.
 * P7. PATCH merges rather than replaces — a second patch preserves earlier keys.
 * P8. Unauthenticated PATCH returns 401 (the prefs route sits behind auth).
 * P9. Unauthenticated GET returns 401.
 *
 * DB isolation
 * ────────────
 * Each call to `authenticatedAgent()` uses a unique email address (via a
 * monotonically incrementing counter).  This ensures no durable DB state leaks
 * between tests — each test starts with a fresh user row.
 *
 * Migration dependency
 * ────────────────────
 * These tests require the `user_preferences` table created by migration
 * 0011_create_user_preferences.sql.  All 4 PATCH scenarios (P2–P4, P7) were
 * confirmed passing against the live dev DB after that migration was applied.
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import * as googleGroupsCache from '../lib/googleGroupsCache.js';
import { db } from '@workspace/db';
import { userPreferencesTable } from '@workspace/db/schema';
import { like } from 'drizzle-orm';

// ── Auth helpers ──────────────────────────────────────────────────────────────

const GROUPS = {
  everyday: 'trailosusers@transitiontrails.org',
} as const;

function makeIdToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

vi.mock('../lib/googleGroupsCache.js', async (importOriginal) => {
  const original = await importOriginal<typeof googleGroupsCache>();
  return { ...original, getGroupsForUser: vi.fn() };
});

const mockGetGroups = vi.mocked(googleGroupsCache.getGroupsForUser);

// Monotonically incrementing counter — gives each `authenticatedAgent()` call
// a unique email so DB rows never bleed between tests.
let agentCounter = 0;

/** Returns a supertest agent that is already signed in as an everyday-tier user. */
async function authenticatedAgent() {
  const email = `prefs-user-${agentCounter++}@transitiontrails.org`;

  global.fetch = vi.fn().mockResolvedValue({
    ok:   true,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({
      id_token: makeIdToken({
        sub:            `uid-prefs-test-${agentCounter}`,
        email,
        name:           'Prefs User',
        hd:             'transitiontrails.org',
        email_verified: true,
      }),
    }),
  });

  mockGetGroups.mockResolvedValue({ groups: [GROUPS.everyday], isReliable: true });

  const agent = request.agent(app);
  const loginRes = await agent.get('/api/auth/google/login');
  const state = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
  await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);
  return agent;
}

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env['GOOGLE_CLIENT_ID']     = 'test-client-id';
  process.env['GOOGLE_CLIENT_SECRET'] = 'test-client-secret';
  delete process.env['TRAIL_OS_SUPERADMIN_EMAILS'];
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.restoreAllMocks();
});

// Clean up all test-generated DB rows after the full suite to keep the dev
// database tidy.  Rows are matched by the test email prefix.
afterAll(async () => {
  try {
    await db
      .delete(userPreferencesTable)
      .where(like(userPreferencesTable.userEmail, 'prefs-user-%@transitiontrails.org'));
  } catch {
    // Non-fatal — test DB may already be clean or unavailable.
  }
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe('GET /api/user/prefs', () => {
  // P1
  it('P1: returns empty prefs object when nothing has been stored yet', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.get('/api/user/prefs');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('prefs');
    expect(typeof res.body.prefs).toBe('object');
    // lastSeenVersion must not be present for a brand-new user
    expect(res.body.prefs).not.toHaveProperty('lastSeenVersion');
  });

  // P9
  it('P9: returns 401 for an unauthenticated request', async () => {
    const res = await request(app).get('/api/user/prefs');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });
});

describe('PATCH /api/user/prefs', () => {
  // P2
  it('P2: accepts { prefs: { lastSeenVersion: "1.5" } } and echoes the stored value', async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .patch('/api/user/prefs')
      .set('Content-Type', 'application/json')
      .send({ prefs: { lastSeenVersion: '1.5' } });

    expect(res.status).toBe(200);
    expect(res.body.prefs.lastSeenVersion).toBe('1.5');
  });

  // P3 — the key reload scenario: GET after PATCH must return the stored value
  it('P3: subsequent GET returns lastSeenVersion after it has been PATCHed (simulates page reload)', async () => {
    const agent = await authenticatedAgent();

    // PATCH — same call the sidebar makes when the user clicks "What\'s New"
    const patchRes = await agent
      .patch('/api/user/prefs')
      .set('Content-Type', 'application/json')
      .send({ prefs: { lastSeenVersion: '1.5' } });
    expect(patchRes.status).toBe(200);

    // GET on the same session — simulates a fresh page load in the same browser
    const getRes = await agent.get('/api/user/prefs');
    expect(getRes.status).toBe(200);
    expect(getRes.body.prefs.lastSeenVersion).toBe('1.5');
  });

  // P4 — dot stays cleared across multiple subsequent requests
  it('P4: lastSeenVersion is durable within the session across multiple GET calls', async () => {
    const agent = await authenticatedAgent();

    await agent
      .patch('/api/user/prefs')
      .set('Content-Type', 'application/json')
      .send({ prefs: { lastSeenVersion: '1.5' } });

    // Two more GETs — dot must remain cleared on every reload
    const r1 = await agent.get('/api/user/prefs');
    const r2 = await agent.get('/api/user/prefs');
    expect(r1.body.prefs.lastSeenVersion).toBe('1.5');
    expect(r2.body.prefs.lastSeenVersion).toBe('1.5');
  });

  // P5
  it('P5: returns 400 when the request body contains no `prefs` key', async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .patch('/api/user/prefs')
      .set('Content-Type', 'application/json')
      .send({ lastSeenVersion: '1.5' }); // missing the `prefs` wrapper

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // P6
  it('P6: returns 400 when a pref value is a non-primitive (object)', async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .patch('/api/user/prefs')
      .set('Content-Type', 'application/json')
      .send({ prefs: { lastSeenVersion: { nested: true } } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lastSeenVersion/);
  });

  // P7 — PATCH merges: unrelated prefs survive a second PATCH
  it('P7: a second PATCH merges into existing prefs without clobbering earlier keys', async () => {
    const agent = await authenticatedAgent();

    // First PATCH — stores lastSeenVersion
    await agent
      .patch('/api/user/prefs')
      .set('Content-Type', 'application/json')
      .send({ prefs: { lastSeenVersion: '1.5' } });

    // Second PATCH — stores a different pref
    await agent
      .patch('/api/user/prefs')
      .set('Content-Type', 'application/json')
      .send({ prefs: { sidebarCompact: true } });

    // GET should return both
    const getRes = await agent.get('/api/user/prefs');
    expect(getRes.body.prefs.lastSeenVersion).toBe('1.5');
    expect(getRes.body.prefs.sidebarCompact).toBe(true);
  });

  // P8
  it('P8: returns 401 for an unauthenticated PATCH', async () => {
    const res = await request(app)
      .patch('/api/user/prefs')
      .set('Content-Type', 'application/json')
      .send({ prefs: { lastSeenVersion: '1.5' } });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });
});

// ── Graceful-degradation scenario ─────────────────────────────────────────────
//
// If the PATCH never reaches the server (e.g. network offline), the DB must
// NOT contain lastSeenVersion.  A subsequent GET then returns no pref, which
// means the front-end hook correctly re-shows the dot on the next page load.
//
describe('Graceful degradation — failed PATCH means dot re-appears on reload', () => {
  it('GET returns no lastSeenVersion when no PATCH was ever sent (dot re-appears on reload)', async () => {
    const agent = await authenticatedAgent();

    // Simulate: PATCH never fired (offline, JS error, etc.)
    // — we simply skip calling PATCH.

    const getRes = await agent.get('/api/user/prefs');
    expect(getRes.status).toBe(200);
    // No stored value → hook will compute hasUnseenRelease=true → dot visible
    expect(getRes.body.prefs.lastSeenVersion).toBeUndefined();
  });
});
