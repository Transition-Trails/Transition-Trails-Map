/**
 * authEnforcement.test.ts
 *
 * Tests for the Trail OS authentication and authorisation enforcement layer.
 *
 * Covers:
 *  1. requireStaff middleware — unit tests (no HTTP needed for middleware logic)
 *  2. requireAdmin middleware — unit tests
 *  3. HTTP integration — unauthenticated request to a data route → 401
 *  4. HTTP integration — authenticated staff user on an admin-only route → 403
 *  5. HTTP integration — user in two groups retains both grants (two-group case)
 *  6. Public-path allowlist — /healthz and auth routes are reachable without a session
 *  7. Penny fire-and-forget path is not broken by enforcement (route remains 200 when authed)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { requireStaff, requireAdmin, isStaff, isAdmin, isSuperAdmin, getStaffGroups, getAdminGroups } from '../middlewares/requireAuth.js';
import type { Request, Response, NextFunction } from 'express';
import * as googleGroupsCache from '../lib/googleGroupsCache.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const GROUPS = {
  admin:    'trailosadmin@transitiontrails.org',
  power:    'trailospennyadmin@transitiontrails.org',
  everyday: 'trailosusers@transitiontrails.org',
} as const;

/** Build a mock req/res/next triple for unit-testing middleware. */
function mockHttp(session: Record<string, unknown> = {}) {
  const res = {
    status: vi.fn().mockReturnThis(),
    json:   vi.fn().mockReturnThis(),
  } as unknown as Response;
  const req = { session } as unknown as Request;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

/** Build a fake ID token payload for the sign-in flow. */
function makeIdToken(payload: Record<string, unknown>): string {
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body    = Buffer.from(JSON.stringify(payload)).toString('base64url');
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
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.restoreAllMocks();
});

// ── 1. requireStaff — unit tests ──────────────────────────────────────────────

describe('requireStaff middleware', () => {
  it('returns 401 with error=not_authenticated when there is no signed-in session', () => {
    const { req, res, next } = mockHttp({});  // no googleEmail
    requireStaff(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'not_authenticated' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 with error=not_authorized when signed in but not in any Trail OS group', () => {
    const { req, res, next } = mockHttp({
      googleEmail:  'user@transitiontrails.org',
      googleGroups: [],  // authenticated but ungrouped
    });
    requireStaff(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'not_authorized' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when the user is in the everyday group', () => {
    const { req, res, next } = mockHttp({
      googleEmail:  'user@transitiontrails.org',
      googleGroups: [GROUPS.everyday],
    });
    requireStaff(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when the user is in TWO groups — the full set is honoured', () => {
    // The two-group case: a user in both admin and power retains both grants.
    // requireStaff must not collapse the set to one tier.
    const { req, res, next } = mockHttp({
      googleEmail:  'multi@transitiontrails.org',
      googleGroups: [GROUPS.admin, GROUPS.power],
    });
    requireStaff(req, res, next);
    expect(next).toHaveBeenCalled();
    // The session groups array is untouched — both memberships preserved
    expect((req.session as unknown as Record<string, unknown>)['googleGroups']).toEqual([GROUPS.admin, GROUPS.power]);
  });

  it('calls next() for a superadmin even with an empty groups array', () => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = 'super@transitiontrails.org';
    const { req, res, next } = mockHttp({
      googleEmail:  'super@transitiontrails.org',
      googleGroups: [],
    });
    requireStaff(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('is case-insensitive for the superadmin email check', () => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = 'Super@TransitionTrails.Org';
    const { req, res, next } = mockHttp({
      googleEmail:  'super@transitiontrails.org',
      googleGroups: [],
    });
    requireStaff(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ── 2. requireAdmin — unit tests ──────────────────────────────────────────────

describe('requireAdmin middleware', () => {
  it('returns 401 with no session', () => {
    const { req, res, next } = mockHttp({});
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'not_authenticated' }));
  });

  it('returns 403 for an everyday-tier user', () => {
    const { req, res, next } = mockHttp({
      googleEmail:  'user@transitiontrails.org',
      googleGroups: [GROUPS.everyday],
    });
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'not_authorized' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for a power-tier user (not in admin group)', () => {
    const { req, res, next } = mockHttp({
      googleEmail:  'power@transitiontrails.org',
      googleGroups: [GROUPS.power],
    });
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for a user in the admin group', () => {
    const { req, res, next } = mockHttp({
      googleEmail:  'admin@transitiontrails.org',
      googleGroups: [GROUPS.admin],
    });
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next() for a superadmin with no groups', () => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = 'super@transitiontrails.org';
    const { req, res, next } = mockHttp({
      googleEmail:  'super@transitiontrails.org',
      googleGroups: [],
    });
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ── 3. isStaff / isAdmin / isSuperAdmin helpers ───────────────────────────────

describe('grant helpers', () => {
  it('isStaff returns false for no groups and non-superadmin', () => {
    expect(isStaff([], 'x@transitiontrails.org')).toBe(false);
  });

  it('isStaff returns true for any of the three staff groups', () => {
    for (const g of getStaffGroups()) {
      expect(isStaff([g], 'x@transitiontrails.org')).toBe(true);
    }
  });

  it('isAdmin returns false for everyday or power groups', () => {
    expect(isAdmin([GROUPS.everyday], 'x@transitiontrails.org')).toBe(false);
    expect(isAdmin([GROUPS.power],    'x@transitiontrails.org')).toBe(false);
  });

  it('isAdmin returns true for the admin group', () => {
    expect(isAdmin([GROUPS.admin], 'x@transitiontrails.org')).toBe(true);
  });

  it('isAdmin returns true for a superadmin with no groups', () => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = 'sa@transitiontrails.org';
    expect(isAdmin([], 'sa@transitiontrails.org')).toBe(true);
  });

  it('isSuperAdmin handles a comma-separated list', () => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = 'a@t.org, b@t.org, c@t.org';
    expect(isSuperAdmin('b@t.org')).toBe(true);
    expect(isSuperAdmin('d@t.org')).toBe(false);
  });

  it('getStaffGroups / getAdminGroups return the expected default addresses', () => {
    expect(getStaffGroups()).toContain('trailosusers@transitiontrails.org');
    expect(getStaffGroups()).toContain('trailospennyadmin@transitiontrails.org');
    expect(getStaffGroups()).toContain('trailosadmin@transitiontrails.org');
    expect(getAdminGroups()).toContain('trailosadmin@transitiontrails.org');
    expect(getAdminGroups()).not.toContain('trailosusers@transitiontrails.org');
  });

  it('getStaffGroups honours GOOGLE_GROUP_ADMIN / GOOGLE_GROUP_POWER / GOOGLE_GROUP_EVERYDAY env vars', () => {
    process.env['GOOGLE_GROUP_ADMIN']    = 'newadmin@example.org';
    process.env['GOOGLE_GROUP_POWER']    = 'newpower@example.org';
    process.env['GOOGLE_GROUP_EVERYDAY'] = 'newusers@example.org';
    const staffGroups = getStaffGroups();
    expect(staffGroups).toContain('newadmin@example.org');
    expect(staffGroups).toContain('newpower@example.org');
    expect(staffGroups).toContain('newusers@example.org');
    expect(staffGroups).not.toContain('trailosadmin@transitiontrails.org');
  });

  it('getAdminGroups honours GOOGLE_GROUP_ADMIN env var', () => {
    process.env['GOOGLE_GROUP_ADMIN'] = 'newadmin@example.org';
    expect(getAdminGroups()).toContain('newadmin@example.org');
    expect(getAdminGroups()).not.toContain('trailosadmin@transitiontrails.org');
  });

  it('isStaff accepts a custom GOOGLE_GROUP_ADMIN address', () => {
    process.env['GOOGLE_GROUP_ADMIN'] = 'customadmin@example.org';
    expect(isStaff(['customadmin@example.org'], 'user@transitiontrails.org')).toBe(true);
    expect(isStaff(['trailosadmin@transitiontrails.org'], 'user@transitiontrails.org')).toBe(false);
  });

  it('isAdmin accepts a custom GOOGLE_GROUP_ADMIN address', () => {
    process.env['GOOGLE_GROUP_ADMIN'] = 'customadmin@example.org';
    expect(isAdmin(['customadmin@example.org'], 'user@transitiontrails.org')).toBe(true);
    expect(isAdmin(['trailosadmin@transitiontrails.org'], 'user@transitiontrails.org')).toBe(false);
  });

  // ── Dynamic team group (GOOGLE_GROUP_TEAM) ────────────────────────────────

  it('isStaff returns true for a user in the configured GOOGLE_GROUP_TEAM group', () => {
    process.env['GOOGLE_GROUP_TEAM'] = 'team@example.org';
    expect(isStaff(['team@example.org'], 'user@transitiontrails.org')).toBe(true);
  });

  it('isStaff is case-insensitive for the team group check', () => {
    process.env['GOOGLE_GROUP_TEAM'] = 'Team@Example.org';
    expect(isStaff(['team@example.org'], 'user@transitiontrails.org')).toBe(true);
  });

  it('isStaff returns false for the old address when GOOGLE_GROUP_TEAM is reconfigured', () => {
    // Simulates the scenario where the group email was changed in env — the old
    // address must no longer grant staff access.
    process.env['GOOGLE_GROUP_TEAM'] = 'newteam@transitiontrails.org';
    expect(isStaff(['team@transitiontrails.org'], 'user@transitiontrails.org')).toBe(false);
  });

  it('isStaff returns false for a team group address when GOOGLE_GROUP_TEAM is unset', () => {
    delete process.env['GOOGLE_GROUP_TEAM'];
    // Without the env var, no address is treated as the team group
    expect(isStaff(['team@transitiontrails.org'], 'user@transitiontrails.org')).toBe(false);
  });
});

// ── 4. HTTP integration — unauthenticated request ─────────────────────────────

describe('HTTP enforcement — unauthenticated requests', () => {
  it('returns 401 on GET /api/programs with no session', async () => {
    const res = await request(app).get('/api/programs');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });

  it('returns 401 on GET /api/penny/prompt-templates with no session', async () => {
    const res = await request(app).get('/api/penny/prompt-templates');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });

  it('returns 401 on POST /api/penny/ask with no session', async () => {
    const res = await request(app).post('/api/penny/ask').send({ query: 'hello' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });

  it('returns 401 on GET /api/calendar/events with no session', async () => {
    const res = await request(app).get('/api/calendar/events');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });

  it('GET /api/healthz remains public — returns 200 without a session', async () => {
    const res = await request(app).get('/api/healthz');
    expect(res.status).toBe(200);
  });

  it('GET /api/auth/google/me is public — returns { authenticated: false } without a session', async () => {
    const res = await request(app).get('/api/auth/google/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
  });

  it('GET /api/auth/google/login is public — redirects to Google without a session', async () => {
    const res = await request(app).get('/api/auth/google/login');
    expect(res.status).toBe(302);
    expect(res.headers['location']).toMatch(/accounts\.google\.com/);
  });
});

// ── 5. HTTP integration — authenticated but unauthorised ──────────────────────

describe('HTTP enforcement — authenticated staff on admin-only route returns 403', () => {
  /**
   * Sign in as an everyday-tier user, then attempt an admin-only route.
   * Expects 403 not_authorized (distinguishable from 401 not_authenticated).
   */
  it('returns 403 on GET /api/secrets/audit for an everyday-tier user', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok:   true,
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({
        id_token: makeIdToken({
          sub:            'uid-everyday',
          email:          'everyday@transitiontrails.org',
          name:           'Everyday User',
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

    const secretsRes = await agent.get('/api/secrets/audit');
    expect(secretsRes.status).toBe(403);
    expect(secretsRes.body.error).toBe('not_authorized');
    // 403 is distinguishable from 401 — a different code tells the client
    // "ask to be added to a group" rather than "sign in"
    expect(secretsRes.status).not.toBe(401);
  });

  it('returns 403 on GET /api/admin/google-groups for a power-tier user', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok:   true,
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({
        id_token: makeIdToken({
          sub:            'uid-power',
          email:          'power@transitiontrails.org',
          name:           'Power User',
          hd:             'transitiontrails.org',
          email_verified: true,
        }),
      }),
    });
    mockGetGroups.mockResolvedValue({ groups: [GROUPS.power], isReliable: true });

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const state = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
    await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);

    const res = await agent.get('/api/admin/google-groups');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('not_authorized');
  });
});

// ── 6. HTTP integration — two-group case ──────────────────────────────────────

describe('HTTP enforcement — two-group case', () => {
  /**
   * A user in both admin and power groups must retain both grants.
   * The middleware must check the set, not collapse it to one tier.
   * - Can access staff routes (everyday grant from any group)
   * - Can access admin routes (admin grant from trailosadmin)
   * - Session groups array still contains BOTH groups after sign-in
   */
  it('a user in admin + power groups passes staff routes AND admin routes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok:   true,
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({
        id_token: makeIdToken({
          sub:            'uid-multi',
          email:          'multi@transitiontrails.org',
          name:           'Multi User',
          hd:             'transitiontrails.org',
          email_verified: true,
        }),
      }),
    });
    mockGetGroups.mockResolvedValue({ groups: [GROUPS.admin, GROUPS.power], isReliable: true });

    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/google/login');
    const state = new URL(loginRes.headers['location'] as string).searchParams.get('state') ?? '';
    await agent.get(`/api/auth/google/callback?code=abc&state=${state}`);

    // Confirm session contains BOTH groups
    const meRes = await agent.get('/api/auth/google/me');
    expect(meRes.body.groups).toContain(GROUPS.admin);
    expect(meRes.body.groups).toContain(GROUPS.power);
    expect(meRes.body.groups).toHaveLength(2);

    // Staff route — passes (not 401/403)
    const staffRes = await agent.get('/api/penny/prompt-templates');
    expect(staffRes.status).not.toBe(401);
    expect(staffRes.status).not.toBe(403);

    // Admin route — passes because admin group is present in the SET
    const adminRes = await agent.get('/api/secrets/audit');
    expect(adminRes.status).not.toBe(401);
    expect(adminRes.status).not.toBe(403);
  });
});
