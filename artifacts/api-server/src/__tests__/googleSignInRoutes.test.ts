/**
 * googleSignInRoutes.test.ts
 *
 * HTTP-level tests for the four Google Sign-In routes:
 *   GET  /api/auth/google/login      — starts OAuth redirect
 *   GET  /api/auth/google/callback   — handles Google's response
 *   GET  /api/auth/google/me         — returns session user
 *   POST /api/auth/google/sign-out   — destroys session
 *
 * The library layer (getGroupsForUser, isOrgEmail, deriveGroupTier) is already
 * covered in googleAuth.test.ts. These tests focus on route behaviour: correct
 * redirects, error codes, session reads, and the success path.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import * as googleGroupsCache from '../lib/googleGroupsCache.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal 3-part JWT whose payload can be decoded by decodeIdToken(). */
function makeIdToken(payload: Record<string, unknown>): string {
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body    = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

/** Build a successful fetch mock that returns a valid-looking token exchange response. */
function mockTokenExchange(idTokenPayload: Record<string, unknown>) {
  const id_token = makeIdToken(idTokenPayload);
  return vi.fn().mockResolvedValue({
    ok:   true,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({ id_token }),
  });
}

// ── Test env setup ────────────────────────────────────────────────────────────

vi.mock('../lib/googleGroupsCache.js', async (importOriginal) => {
  const original = await importOriginal<typeof googleGroupsCache>();
  return { ...original, getGroupsForUser: vi.fn() };
});

const mockGetGroups = vi.mocked(googleGroupsCache.getGroupsForUser);

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  // Restore env before each test so individual tests can override cleanly
  process.env['GOOGLE_CLIENT_ID']     = 'test-client-id';
  process.env['GOOGLE_CLIENT_SECRET'] = 'test-client-secret';
  delete process.env['TRAIL_OS_SUPERADMIN_EMAILS'];
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.restoreAllMocks();
});

// ── GET /api/auth/google/login ────────────────────────────────────────────────

describe('GET /api/auth/google/login', () => {
  it('redirects to Google accounts when GOOGLE_CLIENT_ID is configured', async () => {
    const res = await request(app).get('/api/auth/google/login');
    expect(res.status).toBe(302);
    expect(res.headers['location']).toMatch(/^https:\/\/accounts\.google\.com/);
  });

  it('includes the org hd hint in the redirect URL', async () => {
    const res = await request(app).get('/api/auth/google/login');
    const location = new URL(res.headers['location'] as string);
    expect(location.searchParams.get('hd')).toBe('transitiontrails.org');
  });

  it('requests only openid, email, and profile scopes', async () => {
    const res = await request(app).get('/api/auth/google/login');
    const location = new URL(res.headers['location'] as string);
    const scope = location.searchParams.get('scope') ?? '';
    expect(scope).toContain('openid');
    expect(scope).toContain('email');
    expect(scope).toContain('profile');
  });

  it('returns 500 when GOOGLE_CLIENT_ID is not set', async () => {
    delete process.env['GOOGLE_CLIENT_ID'];
    const res = await request(app).get('/api/auth/google/login');
    expect(res.status).toBe(500);
  });
});

// ── GET /api/auth/google/callback ─────────────────────────────────────────────

describe('GET /api/auth/google/callback', () => {
  it('redirects with sign_in_error=missing_params when code is absent', async () => {
    const res = await request(app).get('/api/auth/google/callback?state=whatever');
    expect(res.status).toBe(302);
    expect(res.headers['location']).toContain('sign_in_error=missing_params');
  });

  it('redirects with sign_in_error=missing_params when state is absent', async () => {
    const res = await request(app).get('/api/auth/google/callback?code=abc');
    expect(res.status).toBe(302);
    expect(res.headers['location']).toContain('sign_in_error=missing_params');
  });

  it('redirects with sign_in_error=google_error when Google returns an error param', async () => {
    const res = await request(app)
      .get('/api/auth/google/callback?error=access_denied&state=x');
    expect(res.status).toBe(302);
    expect(res.headers['location']).toContain('sign_in_error=google_error');
  });

  it('redirects with sign_in_error=state_mismatch when state does not match session', async () => {
    // Use an agent to carry the session cookie from login → callback
    const agent = request.agent(app);
    await agent.get('/api/auth/google/login'); // sets googleOAuthState in session

    const res = await agent.get('/api/auth/google/callback?code=abc&state=WRONG_STATE');
    expect(res.status).toBe(302);
    expect(res.headers['location']).toContain('sign_in_error=state_mismatch');
  });

  it('redirects with sign_in_error=not_configured when client secret is missing', async () => {
    delete process.env['GOOGLE_CLIENT_SECRET'];

    // Establish a session state to pass the CSRF check
    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const loginUrl = new URL(loginRes.headers['location'] as string);
    const state = loginUrl.searchParams.get('state') ?? '';

    const res = await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);
    expect(res.status).toBe(302);
    expect(res.headers['location']).toContain('sign_in_error=not_configured');
  });

  it('redirects with sign_in_error=token_exchange when Google token endpoint fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok:   false,
      status: 400,
      text: () => Promise.resolve('bad_request'),
    });

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const loginUrl = new URL(loginRes.headers['location'] as string);
    const state = loginUrl.searchParams.get('state') ?? '';

    const res = await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);
    expect(res.status).toBe(302);
    expect(res.headers['location']).toContain('sign_in_error=token_exchange');
  });

  it('redirects with sign_in_error=wrong_domain for a non-org account', async () => {
    global.fetch = mockTokenExchange({
      sub:            'uid-123',
      email:          'personal@gmail.com',
      name:           'Person',
      hd:             'gmail.com',        // wrong domain
      email_verified: true,
    });

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const loginUrl = new URL(loginRes.headers['location'] as string);
    const state = loginUrl.searchParams.get('state') ?? '';

    const res = await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);
    expect(res.status).toBe(302);
    expect(res.headers['location']).toContain('sign_in_error=wrong_domain');
    expect(res.headers['location']).toContain(encodeURIComponent('personal@gmail.com'));
  });

  it('redirects with sign_in_error=no_groups when user passes domain check but is in no groups', async () => {
    global.fetch = mockTokenExchange({
      sub:            'uid-456',
      email:          'staff@transitiontrails.org',
      name:           'Staff',
      hd:             'transitiontrails.org',
      email_verified: true,
    });
    mockGetGroups.mockResolvedValue([]); // no groups

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const loginUrl = new URL(loginRes.headers['location'] as string);
    const state = loginUrl.searchParams.get('state') ?? '';

    const res = await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);
    expect(res.status).toBe(302);
    expect(res.headers['location']).toContain('sign_in_error=no_groups');
    expect(res.headers['location']).toContain(encodeURIComponent('staff@transitiontrails.org'));
  });

  it('redirects to / and establishes a session on the full success path', async () => {
    global.fetch = mockTokenExchange({
      sub:            'uid-789',
      email:          'admin@transitiontrails.org',
      name:           'Admin User',
      hd:             'transitiontrails.org',
      email_verified: true,
    });
    mockGetGroups.mockResolvedValue(['trailosadmin@transitiontrails.org']);

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const loginUrl = new URL(loginRes.headers['location'] as string);
    const state = loginUrl.searchParams.get('state') ?? '';

    const callbackRes = await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers['location']).toBe('/');
    expect(callbackRes.headers['location']).not.toContain('sign_in_error');

    // Session should now be populated — /me returns the user
    const meRes = await agent.get('/api/auth/google/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.authenticated).toBe(true);
    expect(meRes.body.email).toBe('admin@transitiontrails.org');
    expect(meRes.body.tier).toBe('admin');
    expect(meRes.body.groups).toContain('trailosadmin@transitiontrails.org');
  });
});

// ── GET /api/auth/google/me ───────────────────────────────────────────────────

describe('GET /api/auth/google/me', () => {
  it('returns authenticated: false with no session', async () => {
    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
  });

  it('returns the full user object after a successful sign-in', async () => {
    // Sign in first using the agent, then check /me
    global.fetch = mockTokenExchange({
      sub:            'uid-me-1',
      email:          'power@transitiontrails.org',
      name:           'Power User',
      hd:             'transitiontrails.org',
      email_verified: true,
    });
    mockGetGroups.mockResolvedValue(['trailospennyadmin@transitiontrails.org']);

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const state = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
    await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);

    const res = await agent.get('/api/auth/google/me');
    expect(res.body.authenticated).toBe(true);
    expect(res.body.email).toBe('power@transitiontrails.org');
    expect(res.body.name).toBe('Power User');
    expect(res.body.tier).toBe('power');
  });
});

// ── POST /api/auth/google/sign-out ────────────────────────────────────────────

describe('POST /api/auth/google/sign-out', () => {
  it('returns { ok: true }', async () => {
    const res = await request(app).post('/api/auth/google/sign-out');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('clears the session so /me returns unauthenticated afterward', async () => {
    // Sign in, then sign out, then check /me
    global.fetch = mockTokenExchange({
      sub:            'uid-so-1',
      email:          'user@transitiontrails.org',
      name:           'A User',
      hd:             'transitiontrails.org',
      email_verified: true,
    });
    mockGetGroups.mockResolvedValue(['trailosusers@transitiontrails.org']);

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const state = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
    await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);

    // Confirm signed in
    const meBeforeRes = await agent.get('/api/auth/google/me');
    expect(meBeforeRes.body.authenticated).toBe(true);

    // Sign out
    await agent.post('/api/auth/google/sign-out');

    // Confirm signed out
    const meAfterRes = await agent.get('/api/auth/google/me');
    expect(meAfterRes.body.authenticated).toBe(false);
  });
});
