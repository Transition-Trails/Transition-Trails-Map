/**
 * buyer.test.ts
 *
 * Route-level tests for the Buyer Kit Page API endpoints.
 *
 * GET  /api/buyer/page/:token  — public; validate token, return kit data
 * POST /api/buyer/asset/:assetId/link — staff-only; generate magic link
 *
 * @workspace/db is partially mocked: `pool` comes from the real module
 * (needed by app.ts's session store) while `db` and the schema table are
 * replaced with Vitest stubs so no live database is needed.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Partial mock of @workspace/db ──────────────────────────────────────────────
//
// `pool` must be the real export so PgStore in app.ts can use it.
// `db` is replaced with a stub whose select/insert chains we control per-test.

const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock('@workspace/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workspace/db')>();

  const stubDb = new Proxy({} as Record<string, unknown>, {
    get(_t, prop: string) {
      if (prop === 'select') return mockSelect;
      if (prop === 'insert') return mockInsert;
      return undefined;
    },
  });

  return {
    ...actual,     // keeps `pool`, schema table exports, etc.
    db: stubDb,
  };
});

// Import app AFTER the mock is registered so it picks up the stub.
const { default: app } = await import('../app.js');

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Return zero rows — token not in DB. */
function mockTokenNotFound() {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  });
}

/** Return a single token row with optional overrides. */
function mockValidToken(overrides: Partial<{
  id:        string;
  assetId:   string;
  expiresAt: Date | null;
  revokedAt: Date | null;
}> = {}) {
  const row = {
    id:        overrides.id        ?? 'validtoken12345678',
    assetId:   overrides.assetId   ?? 'sf-asset-001',
    createdAt: new Date('2025-01-01'),
    createdBy: 'staff@example.com',
    expiresAt: 'expiresAt' in overrides ? overrides.expiresAt : null,
    revokedAt: 'revokedAt' in overrides ? overrides.revokedAt : null,
  };
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([row]),
      }),
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET /api/buyer/page/:token ─────────────────────────────────────────────────

describe('GET /api/buyer/page/:token', () => {
  test('200 with kit data for a valid active token', async () => {
    mockValidToken();
    const res = await request(app).get('/api/buyer/page/validtoken12345678');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toMatchObject({
      assetId:      'sf-asset-001',
      seriesLabel:  expect.any(String),
      kitTitle:     expect.any(String),
      editionName:  expect.any(String),
      contentTypes: expect.any(Array),
    });
  });

  test('404 for an unknown token (not in DB)', async () => {
    mockTokenNotFound();
    const res = await request(app).get('/api/buyer/page/unknowntoken1234');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('token_not_found');
  });

  test('404 (not 400) for a malformed short token', async () => {
    // No DB call expected — short tokens are rejected before the lookup.
    const res = await request(app).get('/api/buyer/page/short');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('token_not_found');
  });

  test('404 for an expired token', async () => {
    mockValidToken({ expiresAt: new Date('2020-01-01') }); // past date
    const res = await request(app).get('/api/buyer/page/expiredtoken1234xx');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('token_not_found');
  });

  test('404 for a revoked token', async () => {
    mockValidToken({ revokedAt: new Date('2025-06-01') });
    const res = await request(app).get('/api/buyer/page/revokedtoken1234xx');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('token_not_found');
  });

  test('200 for a token with a future expiresAt (still valid)', async () => {
    const future = new Date(Date.now() + 1_000 * 60 * 60 * 24 * 365);
    mockValidToken({ expiresAt: future });
    const res = await request(app).get('/api/buyer/page/futuretoken1234xxx');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ── POST /api/buyer/asset/:assetId/link ───────────────────────────────────────

describe('POST /api/buyer/asset/:assetId/link', () => {
  test('401 without authentication (staff-only endpoint)', async () => {
    const res = await request(app).post('/api/buyer/asset/sf-asset-001/link');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });
});
