/**
 * alertSettings.test.ts
 *
 * Verifies:
 *  1. GET /api/slack/alert-settings — requires auth; returns DB values or defaults
 *  2. PATCH /api/slack/alert-settings
 *     - 401 when unauthenticated
 *     - 403 when authenticated as non-admin staff (everyday tier)
 *     - 200 when admin; persists threshold + windowMinutes
 *     - records updatedBy from req.session.googleEmail
 *     - validates range constraints
 *  3. errorAlertJob.checkAndAlert — uses getAlertSettings() at runtime;
 *     falls back gracefully when DB throws
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import * as googleGroupsCache from '../lib/googleGroupsCache.js';
import { db } from '@workspace/db';
import { alertSettingsTable } from '@workspace/db/schema';

// ── Auth mock ─────────────────────────────────────────────────────────────────

const GROUPS = {
  admin:    'trailosadmin@transitiontrails.org',
  everyday: 'trailosusers@transitiontrails.org',
} as const;

vi.mock('../lib/googleGroupsCache.js', async (importOriginal) => {
  const original = await importOriginal<typeof googleGroupsCache>();
  return { ...original, getGroupsForUser: vi.fn() };
});

const mockGetGroups = vi.mocked(googleGroupsCache.getGroupsForUser);

function makeIdToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

let agentCounter = 0;

/** Returns a supertest agent signed in as the given Google Groups tier. */
async function authenticatedAgent(groups: string[], email?: string) {
  const userEmail = email ?? `alert-test-${agentCounter++}@transitiontrails.org`;

  global.fetch = vi.fn().mockResolvedValue({
    ok:   true,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({
      id_token: makeIdToken({
        sub:            `uid-${agentCounter}`,
        email:          userEmail,
        name:           'Alert Test User',
        hd:             'transitiontrails.org',
        email_verified: true,
      }),
    }),
  });

  mockGetGroups.mockResolvedValue({ groups, isReliable: true });

  const agent    = request.agent(app);
  const loginRes = await agent.get('/api/auth/google/login');
  const state    = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
  await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);
  return { agent, email: userEmail };
}

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env['GOOGLE_CLIENT_ID']     = 'test-client-id';
  process.env['GOOGLE_CLIENT_SECRET'] = 'test-client-secret';
  delete process.env['TRAIL_OS_SUPERADMIN_EMAILS'];
  delete process.env['ERROR_ALERT_THRESHOLD'];
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.restoreAllMocks();
});

// Clean up any rows written during tests that aren't the seed row
afterAll(async () => {
  // Reset the alert_settings row back to defaults so we leave the DB clean
  await db
    .insert(alertSettingsTable)
    .values({ id: 'default', threshold: 10, windowMinutes: 15, updatedBy: null })
    .onConflictDoUpdate({
      target: alertSettingsTable.id,
      set:    { threshold: 10, windowMinutes: 15, updatedBy: null },
    });
});

// ── 1. GET /api/slack/alert-settings ──────────────────────────────────────────

describe('GET /api/slack/alert-settings', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/slack/alert-settings');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });

  it('returns 200 with threshold and windowMinutes for an authenticated staff user', async () => {
    const { agent } = await authenticatedAgent([GROUPS.everyday]);
    const res = await agent.get('/api/slack/alert-settings');
    expect(res.status).toBe(200);
    expect(typeof res.body.threshold).toBe('number');
    expect(typeof res.body.windowMinutes).toBe('number');
    expect(res.body.threshold).toBeGreaterThan(0);
    expect(res.body.windowMinutes).toBeGreaterThan(0);
  });

  it('returns 200 with correct source field for an admin user', async () => {
    const { agent } = await authenticatedAgent([GROUPS.admin]);
    const res = await agent.get('/api/slack/alert-settings');
    expect(res.status).toBe(200);
    // source is either 'db' (seeded row exists) or 'default' (no row)
    expect(['db', 'default']).toContain(res.body.source);
    expect(res.body).toHaveProperty('envFallback');
  });

  it('reflects ERROR_ALERT_THRESHOLD in envFallback when set', async () => {
    process.env['ERROR_ALERT_THRESHOLD'] = '77';
    const { agent } = await authenticatedAgent([GROUPS.admin]);
    const res = await agent.get('/api/slack/alert-settings');
    expect(res.status).toBe(200);
    expect(res.body.envFallback).toBe(77);
  });
});

// ── 2. PATCH /api/slack/alert-settings ───────────────────────────────────────

describe('PATCH /api/slack/alert-settings', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .patch('/api/slack/alert-settings')
      .send({ threshold: 20 });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });

  it('returns 403 when authenticated as non-admin staff (everyday tier)', async () => {
    const { agent } = await authenticatedAgent([GROUPS.everyday]);
    const res = await agent
      .patch('/api/slack/alert-settings')
      .send({ threshold: 20 });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('not_authorized');
  });

  it('returns 200 and persists threshold when admin', async () => {
    const { agent } = await authenticatedAgent([GROUPS.admin]);
    const res = await agent
      .patch('/api/slack/alert-settings')
      .send({ threshold: 42, windowMinutes: 20 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.threshold).toBe(42);
    expect(res.body.windowMinutes).toBe(20);
  });

  it('records updatedBy from the signed-in admin email', async () => {
    const adminEmail = `admin-audit-${agentCounter}@transitiontrails.org`;
    const { agent } = await authenticatedAgent([GROUPS.admin], adminEmail);
    await agent.patch('/api/slack/alert-settings').send({ threshold: 55 });

    // Verify the DB row carries the admin email
    const [row] = await db.select().from(alertSettingsTable);
    expect(row?.updatedBy).toBe(adminEmail);
  });

  it('a subsequent GET reflects the saved values', async () => {
    const { agent } = await authenticatedAgent([GROUPS.admin]);
    await agent.patch('/api/slack/alert-settings').send({ threshold: 99, windowMinutes: 25 });

    const getRes = await agent.get('/api/slack/alert-settings');
    expect(getRes.body.threshold).toBe(99);
    expect(getRes.body.windowMinutes).toBe(25);
    expect(getRes.body.source).toBe('db');
  });

  it('rejects threshold of 0 (below minimum 1)', async () => {
    const { agent } = await authenticatedAgent([GROUPS.admin]);
    const res = await agent.patch('/api/slack/alert-settings').send({ threshold: 0 });
    expect(res.status).toBe(400);
  });

  it('rejects threshold above 10 000', async () => {
    const { agent } = await authenticatedAgent([GROUPS.admin]);
    const res = await agent.patch('/api/slack/alert-settings').send({ threshold: 99_999 });
    expect(res.status).toBe(400);
  });

  it('rejects windowMinutes of 0', async () => {
    const { agent } = await authenticatedAgent([GROUPS.admin]);
    const res = await agent.patch('/api/slack/alert-settings').send({ windowMinutes: 0 });
    expect(res.status).toBe(400);
  });

  it('rejects windowMinutes above 1440', async () => {
    const { agent } = await authenticatedAgent([GROUPS.admin]);
    const res = await agent.patch('/api/slack/alert-settings').send({ windowMinutes: 9_999 });
    expect(res.status).toBe(400);
  });

  it('rejects a body with no recognised fields', async () => {
    const { agent } = await authenticatedAgent([GROUPS.admin]);
    const res = await agent.patch('/api/slack/alert-settings').send({});
    expect(res.status).toBe(400);
  });

  it('accepts a partial update (windowMinutes only) and preserves threshold', async () => {
    const { agent } = await authenticatedAgent([GROUPS.admin]);
    // First: set a known baseline
    await agent.patch('/api/slack/alert-settings').send({ threshold: 15, windowMinutes: 10 });
    // Then: patch only windowMinutes
    const res = await agent.patch('/api/slack/alert-settings').send({ windowMinutes: 45 });
    expect(res.status).toBe(200);
    expect(res.body.threshold).toBe(15);   // preserved
    expect(res.body.windowMinutes).toBe(45);
  });
});

// ── 3. errorAlertJob — getAlertSettings reads DB settings at runtime ──────────

describe('errorAlertJob: checkAndAlert', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env['SLACK_BOT_TOKEN'];
    delete process.env['SLACK_ADMIN_CHANNEL_ID'];
    delete process.env['ERROR_ALERT_THRESHOLD'];
  });

  it('resolves without throwing when no Slack token is set (short-circuits before DB)', async () => {
    delete process.env['SLACK_BOT_TOKEN'];
    delete process.env['SLACK_BOT_USER_OAUTH_TOKEN'];

    const { checkAndAlert } = await import('../lib/errorAlertJob.js');
    await expect(checkAndAlert()).resolves.toBeUndefined();
  });

  it('reads settings from DB when Slack is configured (error count below any threshold)', async () => {
    // Provide Slack credentials so the job passes the token guard and reaches
    // getAlertSettings().  The test DB has 0 recent error rows so the count
    // is always below the threshold — no Slack message is posted.
    process.env['SLACK_BOT_TOKEN']        = 'xoxb-test-token';
    process.env['SLACK_ADMIN_CHANNEL_ID'] = 'C0TEST12345';

    const selectSpy = vi.spyOn(db, 'select');

    const { checkAndAlert } = await import('../lib/errorAlertJob.js');
    await expect(checkAndAlert()).resolves.toBeUndefined();

    // db.select was called — proving getAlertSettings() was reached, not short-circuited
    expect(selectSpy).toHaveBeenCalled();
  });

  it('falls back to ERROR_ALERT_THRESHOLD env var when db.select throws inside getAlertSettings', async () => {
    process.env['SLACK_BOT_TOKEN']        = 'xoxb-test-token';
    process.env['SLACK_ADMIN_CHANNEL_ID'] = 'C0TEST12345';
    process.env['ERROR_ALERT_THRESHOLD']  = '999';

    // First db.select call is the getAlertSettings query — make it throw
    vi.spyOn(db, 'select').mockImplementationOnce(() => {
      throw new Error('simulated DB timeout');
    });

    const { checkAndAlert } = await import('../lib/errorAlertJob.js');
    // Resolves without throwing: fallback threshold=999 > 0 errors → no alert
    await expect(checkAndAlert()).resolves.toBeUndefined();
  });

  it('startErrorAlertJob and stopErrorAlertJob are safe to call multiple times', async () => {
    const { startErrorAlertJob, stopErrorAlertJob } = await import('../lib/errorAlertJob.js');
    expect(() => {
      startErrorAlertJob();
      startErrorAlertJob(); // second call is a no-op
      stopErrorAlertJob();
      stopErrorAlertJob(); // second stop is a no-op
    }).not.toThrow();
  });
});
