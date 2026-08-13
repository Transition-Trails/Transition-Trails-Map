/**
 * slackValidateAccess.test.ts
 *
 * Confirms that the Slack validation endpoints are accessible to all
 * authenticated staff users, not just admins, and that unauthenticated
 * callers are correctly rejected.
 *
 * Covered:
 *  1. GET /api/slack/validate — unauthenticated caller receives 401
 *  2. GET /api/slack/validate — everyday-tier staff user receives 200
 *  3. POST /api/slack/validate/test-message — unauthenticated caller receives 401
 *  4. POST /api/slack/validate/test-message — everyday-tier staff user receives 400
 *     (no_token or no_channel, not 401/403)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import * as googleGroupsCache from '../lib/googleGroupsCache.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const GROUPS = {
  admin:    'trailosadmin@transitiontrails.org',
  power:    'trailospennyadmin@transitiontrails.org',
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

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env['GOOGLE_CLIENT_ID']     = 'test-client-id';
  process.env['GOOGLE_CLIENT_SECRET'] = 'test-client-secret';
  delete process.env['TRAIL_OS_SUPERADMIN_EMAILS'];
  // Ensure no real Slack token is present so the endpoint skips live API calls
  // and returns immediately with the env-check results (status 200).
  delete process.env['SLACK_BOT_TOKEN'];
  delete process.env['SLACK_BOT_USER_OAUTH_TOKEN'];
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.restoreAllMocks();
});

// ── Helper: sign in as a given set of groups ──────────────────────────────────

async function signInWithGroups(groups: string[]) {
  global.fetch = vi.fn().mockResolvedValue({
    ok:   true,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({
      id_token: makeIdToken({
        sub:            'uid-staff',
        email:          'staff@transitiontrails.org',
        name:           'Staff User',
        hd:             'transitiontrails.org',
        email_verified: true,
      }),
    }),
  });
  mockGetGroups.mockResolvedValue({ groups, isReliable: true });

  const agent = request.agent(app);
  const loginRes = await agent.get('/api/auth/google/login');
  const state = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
  await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);
  return agent;
}

// ── 1. Unauthenticated caller receives 401 ────────────────────────────────────

describe('GET /api/slack/validate — unauthenticated', () => {
  it('returns 401 with error=not_authenticated when there is no session', async () => {
    const res = await request(app).get('/api/slack/validate');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });
});

// ── 2. Everyday-tier staff user receives 200 ──────────────────────────────────

describe('GET /api/slack/validate — authenticated staff (non-admin)', () => {
  it('returns 200 for an everyday-tier staff user', async () => {
    const agent = await signInWithGroups([GROUPS.everyday]);
    const res   = await agent.get('/api/slack/validate');
    expect(res.status).toBe(200);
    // The response shape always includes a checks array (env-level checks run
    // even without a bot token; live API checks are skipped gracefully).
    expect(res.body).toHaveProperty('checks');
    expect(Array.isArray(res.body.checks)).toBe(true);
  });

  it('returns 200 for a power-tier staff user (non-admin)', async () => {
    const agent = await signInWithGroups([GROUPS.power]);
    const res   = await agent.get('/api/slack/validate');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('checks');
  });
});

// ── 3. POST /slack/validate/test-message — unauthenticated receives 401 ────────

describe('POST /api/slack/validate/test-message — unauthenticated', () => {
  it('returns 401 with error=not_authenticated when there is no session', async () => {
    const res = await request(app)
      .post('/api/slack/validate/test-message')
      .send({ target: 'penny' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });
});

// ── 4. POST /slack/validate/test-message — everyday staff receives 400 ─────────
//
// With no bot token in env (cleared in beforeEach), the handler returns 400
// { ok: false, error: "no_token" } before any Slack API call is attempted.
// This confirms the endpoint is accessible to non-admin staff (not 401/403).

describe('POST /api/slack/validate/test-message — authenticated staff (non-admin)', () => {
  it('returns 400 (no_token) — not 401/403 — for an everyday-tier staff user', async () => {
    const agent = await signInWithGroups([GROUPS.everyday]);
    const res   = await agent
      .post('/api/slack/validate/test-message')
      .send({ target: 'penny' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    // Must be a domain error (no_token or no_channel), never an auth rejection.
    expect(['no_token', 'no_channel']).toContain(res.body.error);
  });

  it('returns 400 (no_token) — not 401/403 — for a power-tier staff user (non-admin)', async () => {
    const agent = await signInWithGroups([GROUPS.power]);
    const res   = await agent
      .post('/api/slack/validate/test-message')
      .send({ target: 'penny' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(['no_token', 'no_channel']).toContain(res.body.error);
  });
});
