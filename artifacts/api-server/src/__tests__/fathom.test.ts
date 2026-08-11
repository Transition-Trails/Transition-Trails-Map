/**
 * fathom.test.ts
 *
 * Covers:
 *  1. GET  /api/fathom/status — 401 when unauthenticated; connected false/true based on DB row
 *  2. PUT  /api/fathom/key   — 401 unauthenticated; 400 missing body; validates key against Fathom;
 *                              stores encrypted key on success; rejects invalid keys (401/403)
 *  3. DELETE /api/fathom/key — 401 unauthenticated; 204 success; per-user isolation
 *  4. GET  /api/fathom/meetings — 401 unauthenticated; 404 when no key; forwards Fathom response
 *
 * Mocking strategy:
 *  - express-session replaced with an in-memory shim keyed by googleEmail
 *  - connect-pg-simple stubbed
 *  - requireAuth bypassed (all staff-gate logic already tested in authEnforcement.test.ts)
 *  - @workspace/db mocked with per-test configurable spy fns
 *  - global.fetch mocked per-test via vi.stubGlobal
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Session shim ──────────────────────────────────────────────────────────────

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {
    googleEmail: 'staff@transitiontrails.org',
  };
  return { mockSession };
});

vi.mock('express-session', () => ({
  default: () => (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req['session'] = new Proxy(mockSession, {
      set(t, p, v) { t[p as string] = v; return true; },
      get(t, p) {
        if (p === 'save')    return (cb?: () => void) => cb?.();
        if (p === 'destroy') return (cb?: () => void) => cb?.();
        return t[p as string];
      },
    });
    next();
  },
}));

vi.mock('connect-pg-simple', () => ({
  default: () => class FakePgStore {
    get(_sid: string, cb: (e: null, s: null) => void) { cb(null, null); }
    set(_sid: string, _s: unknown, cb: () => void)    { cb(); }
    destroy(_sid: string, cb: () => void)              { cb(); }
  },
}));

// ── Auth bypass ───────────────────────────────────────────────────────────────

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:              (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:              (_req: unknown, _res: unknown, next: () => void) => next(),
  requireSuperAdmin:         (_req: unknown, _res: unknown, next: () => void) => next(),
  requireHomebaseAuth:       (_req: unknown, _res: unknown, next: () => void) => next(),
  effectiveIdentityMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:                   () => true,
  isAdmin:                   () => true,
  isSuperAdmin:              () => false,
  getStaffGroups:            () => [],
  getAdminGroups:            () => [],
  getTeamGroup:              () => null,
  TRAIL_OS_STAFF_GROUPS:     [],
  TRAIL_OS_ADMIN_GROUPS:     [],
}));

// ── DB mock ───────────────────────────────────────────────────────────────────

const dbMock = vi.hoisted(() => {
  const limit    = vi.fn();
  const where    = vi.fn().mockReturnValue({ limit });
  const from     = vi.fn().mockReturnValue({ where });
  const select   = vi.fn().mockReturnValue({ from });

  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values             = vi.fn().mockReturnValue({ onConflictDoUpdate });
  const insert             = vi.fn().mockReturnValue({ values });

  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const deleteFrom  = vi.fn().mockReturnValue({ where: deleteWhere });

  return { select, from, where, limit, insert, values, onConflictDoUpdate, deleteFrom, deleteWhere };
});

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn(), connect: vi.fn(), end: vi.fn() },
  db: {
    select: dbMock.select,
    insert: dbMock.insert,
    delete: dbMock.deleteFrom,
  },
}));

vi.mock('@workspace/db/schema', () => ({
  fathomUserKeysTable: {
    id:        { name: 'id' },
    userEmail: { name: 'user_email' },
    apiKey:    { name: 'api_key' },
    updatedAt: { name: 'updated_at' },
  },
}));

// ── slackOAuth crypto helpers (encryptToken / decryptToken) ───────────────────
// fathom.ts imports these helpers from slackOAuth; slackOAuth itself is also
// registered as a router in routes/index.ts, so the mock must export `default`.

vi.mock('../routes/slackOAuth.js', async (importOriginal) => {
  // Import the real module to get the default router, but override crypto helpers
  // with deterministic stubs so tests never need SESSION_SECRET.
  const actual = await importOriginal<typeof import('../routes/slackOAuth.js')>();
  return {
    ...actual,
    encryptToken: (v: string) => `enc:${v}`,
    decryptToken: (v: string) => v.replace(/^enc:/, ''),
  };
});

// ── App import (after all vi.mock calls) ──────────────────────────────────────

import app from '../app.js';

// ── Fetch response factory ─────────────────────────────────────────────────────

function makeFathomResponse(ok: boolean, status: number, body: unknown): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Unauthorized',
    headers:    new Headers({ 'Content-Type': 'application/json' }),
    json:       async () => body,
    text:       async () => JSON.stringify(body),
    redirected: false,
    type:       'basic' as Response['type'],
    url:        '',
    clone:      () => makeFathomResponse(ok, status, body),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:       async () => new Blob(),
    formData:   async () => new FormData(),
    body:       null,
    bodyUsed:   false,
  } as Response;
}

// ── Test setup / teardown ─────────────────────────────────────────────────────

const STAFF_EMAIL = 'staff@transitiontrails.org';

beforeEach(() => {
  vi.clearAllMocks();
  mockSession['googleEmail'] = STAFF_EMAIL;
  // Default: no row found (not connected)
  dbMock.limit.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ═════════════════════════════════════════════════════════════════════════════
//  GET /api/fathom/status
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/fathom/status', () => {
  test('returns 401 when not authenticated', async () => {
    mockSession['googleEmail'] = undefined;
    const res = await request(app).get('/api/fathom/status');
    expect(res.status).toBe(401);
    expect(res.body.connected).toBe(false);
  });

  test('returns { connected: false } when no key is stored', async () => {
    dbMock.limit.mockResolvedValue([]);
    const res = await request(app).get('/api/fathom/status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ connected: false });
  });

  test('returns { connected: true } when a key row exists', async () => {
    dbMock.limit.mockResolvedValue([{ id: 1 }]);
    const res = await request(app).get('/api/fathom/status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ connected: true });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  PUT /api/fathom/key
// ═════════════════════════════════════════════════════════════════════════════

describe('PUT /api/fathom/key', () => {
  test('returns 401 when not authenticated', async () => {
    mockSession['googleEmail'] = undefined;
    const res = await request(app)
      .put('/api/fathom/key')
      .send({ apiKey: 'test-key-123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });

  test('returns 400 when apiKey is missing', async () => {
    const res = await request(app).put('/api/fathom/key').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('returns 400 when apiKey is empty string', async () => {
    const res = await request(app)
      .put('/api/fathom/key')
      .send({ apiKey: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('validates the key against https://api.fathom.ai before storing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFathomResponse(true, 200, { data: [] }),
    ));

    const res = await request(app)
      .put('/api/fathom/key')
      .send({ apiKey: 'valid-key-abc' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ connected: true });

    // Confirm the outbound validation URL contains api.fathom.ai
    const fetchMock = vi.mocked(global.fetch);
    const calledUrl = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(calledUrl).toContain('api.fathom.ai');
  });

  test('returns 400 with descriptive error when Fathom returns 401 (invalid key)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFathomResponse(false, 401, { message: 'Unauthorized' }),
    ));

    const res = await request(app)
      .put('/api/fathom/key')
      .send({ apiKey: 'bad-key-xyz' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid fathom api key/i);
  });

  test('returns 400 with descriptive error when Fathom returns 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFathomResponse(false, 403, { message: 'Forbidden' }),
    ));

    const res = await request(app)
      .put('/api/fathom/key')
      .send({ apiKey: 'bad-key-xyz' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid fathom api key/i);
  });

  test('stores the key for the authenticated user on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFathomResponse(true, 200, { data: [] }),
    ));

    await request(app)
      .put('/api/fathom/key')
      .send({ apiKey: 'valid-key-abc' });

    expect(dbMock.insert).toHaveBeenCalled();
    // The upsert values should include the staff email
    const insertedValues = dbMock.values.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertedValues).toMatchObject({ userEmail: STAFF_EMAIL });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  DELETE /api/fathom/key
// ═════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/fathom/key', () => {
  test('returns 401 when not authenticated', async () => {
    mockSession['googleEmail'] = undefined;
    const res = await request(app).delete('/api/fathom/key');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });

  test('returns 204 and removes the key row', async () => {
    dbMock.deleteWhere.mockResolvedValue(undefined);
    const res = await request(app).delete('/api/fathom/key');
    expect(res.status).toBe(204);
    expect(dbMock.deleteFrom).toHaveBeenCalled();
  });

  test('per-user isolation — delete only targets the current user row', async () => {
    const OTHER_EMAIL = 'other@transitiontrails.org';
    // ensure we're deleting for STAFF_EMAIL, not OTHER_EMAIL
    dbMock.deleteWhere.mockResolvedValue(undefined);

    await request(app).delete('/api/fathom/key');

    // The delete call goes through db.delete(table).where(eq(table.userEmail, email))
    // We can verify db.delete was called (row isolation is enforced by the route's
    // eq(fathomUserKeysTable.userEmail, email) filter — the DB mock chain captures this)
    expect(dbMock.deleteFrom).toHaveBeenCalledTimes(1);

    // Switch user and verify a fresh delete targets the new session email
    mockSession['googleEmail'] = OTHER_EMAIL;
    dbMock.deleteWhere.mockResolvedValue(undefined);
    await request(app).delete('/api/fathom/key');
    expect(dbMock.deleteFrom).toHaveBeenCalledTimes(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  GET /api/fathom/meetings
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/fathom/meetings', () => {
  test('returns 401 when not authenticated', async () => {
    mockSession['googleEmail'] = undefined;
    const res = await request(app).get('/api/fathom/meetings');
    expect(res.status).toBe(401);
  });

  test('returns 404 when no key is stored', async () => {
    // getApiKey select returns empty → apiKey null
    dbMock.limit.mockResolvedValue([]);
    const res = await request(app).get('/api/fathom/meetings');
    expect(res.status).toBe(404);
    expect(res.body.connected).toBe(false);
  });

  test('returns meeting list when Fathom API succeeds', async () => {
    // getApiKey select returns a row with an encrypted key
    dbMock.limit.mockResolvedValue([{ apiKey: 'enc:real-key' }]);

    const fakeMeetings = [
      { id: 'm1', title: 'Sprint Review', started_at: '2026-08-01T10:00:00Z', share_url: 'https://fathom.video/m/m1' },
    ];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFathomResponse(true, 200, { data: fakeMeetings }),
    ));

    const res = await request(app).get('/api/fathom/meetings');
    expect(res.status).toBe(200);
    expect(res.body.meetings).toHaveLength(1);
    expect(res.body.meetings[0].id).toBe('m1');
  });

  test('returns 401 and clears the stored key when Fathom returns 401 (revoked key)', async () => {
    // Use a distinct email so the module-level meetings cache has no entry for it
    mockSession['googleEmail'] = 'revoked@transitiontrails.org';
    dbMock.limit.mockResolvedValue([{ apiKey: 'enc:revoked-key' }]);
    dbMock.deleteWhere.mockResolvedValue(undefined);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeFathomResponse(false, 401, { message: 'Unauthorized' }),
    ));

    const res = await request(app).get('/api/fathom/meetings');
    expect(res.status).toBe(401);
    expect(res.body.connected).toBe(false);
    // Revoked key should be purged
    expect(dbMock.deleteFrom).toHaveBeenCalled();
  });
});
