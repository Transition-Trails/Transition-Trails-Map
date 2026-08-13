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

// ── 5. Target → channel ID routing ───────────────────────────────────────────
//
// Confirms that each target value resolves to the correct env var and sends
// that channel ID to chat.postMessage. Uses a real bot token so the no_token
// guard does not fire, then mocks fetch to capture the payload.

describe('POST /api/slack/validate/test-message — channel routing by target', () => {
  const BOT_TOKEN        = 'xoxb-test-token';
  const PENNY_CHANNEL_ID = 'C111PENNY';
  const ADMIN_CHANNEL_ID = 'C222ADMIN';
  const DEFAULT_CHANNEL_ID = 'C333DEFAULT';

  /** Returns the channel value that was sent to chat.postMessage, or null. */
  function capturedChannel(fetchMock: ReturnType<typeof vi.fn>): string | null {
    for (const [, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      const url = fetchMock.mock.calls.find(
        ([u]: [string]) => u === 'https://slack.com/api/chat.postMessage'
      )?.[0];
      if (!url) continue;
      const body = JSON.parse(init?.body as string ?? '{}') as { channel?: string };
      return body.channel ?? null;
    }
    return null;
  }

  beforeEach(() => {
    process.env['SLACK_BOT_TOKEN']        = BOT_TOKEN;
    process.env['SLACK_PENNY_CHANNEL_ID'] = PENNY_CHANNEL_ID;
    process.env['SLACK_ADMIN_CHANNEL_ID'] = ADMIN_CHANNEL_ID;
    process.env['SLACK_CHANNEL_ID']       = DEFAULT_CHANNEL_ID;
  });

  it("routes target='penny' to SLACK_PENNY_CHANNEL_ID", async () => {
    // Sign in first so the Google auth fetch mock is no longer in play.
    const agent = await signInWithGroups([GROUPS.everyday]);

    // Now replace global.fetch with the Slack mock for the actual API call.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, ts: '111.222', channel: PENNY_CHANNEL_ID }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await agent
      .post('/api/slack/validate/test-message')
      .send({ target: 'penny' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const postCall = fetchMock.mock.calls.find(
      ([u]: [string]) => u === 'https://slack.com/api/chat.postMessage'
    );
    expect(postCall).toBeDefined();
    const sentChannel = (JSON.parse((postCall as [string, RequestInit])[1].body as string) as { channel: string }).channel;
    expect(sentChannel).toBe(PENNY_CHANNEL_ID);
  });

  it("routes target='admin' to SLACK_ADMIN_CHANNEL_ID", async () => {
    const agent = await signInWithGroups([GROUPS.everyday]);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, ts: '111.333', channel: ADMIN_CHANNEL_ID }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await agent
      .post('/api/slack/validate/test-message')
      .send({ target: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const postCall = fetchMock.mock.calls.find(
      ([u]: [string]) => u === 'https://slack.com/api/chat.postMessage'
    );
    expect(postCall).toBeDefined();
    const sentChannel = (JSON.parse((postCall as [string, RequestInit])[1].body as string) as { channel: string }).channel;
    expect(sentChannel).toBe(ADMIN_CHANNEL_ID);
  });

  it("routes target='default' to SLACK_CHANNEL_ID", async () => {
    const agent = await signInWithGroups([GROUPS.everyday]);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, ts: '111.444', channel: DEFAULT_CHANNEL_ID }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await agent
      .post('/api/slack/validate/test-message')
      .send({ target: 'default' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const postCall = fetchMock.mock.calls.find(
      ([u]: [string]) => u === 'https://slack.com/api/chat.postMessage'
    );
    expect(postCall).toBeDefined();
    const sentChannel = (JSON.parse((postCall as [string, RequestInit])[1].body as string) as { channel: string }).channel;
    expect(sentChannel).toBe(DEFAULT_CHANNEL_ID);
  });
});
