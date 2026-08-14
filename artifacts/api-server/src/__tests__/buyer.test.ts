/**
 * buyer.test.ts
 *
 * Route-level tests for the Buyer Kit Page API endpoints.
 *
 * GET  /api/buyer/page/:token  — public; validate token, return kit data from SF
 * POST /api/buyer/asset/:assetId/link — staff-only; generate magic link
 *
 * @workspace/db is partially mocked: `pool` comes from the real module
 * (needed by app.ts's session store) while `db` and the schema table are
 * replaced with Vitest stubs so no live database is needed.
 *
 * ConnectorSalesforceClient is fully mocked — all SF interaction is controlled
 * via the `mockSfQuery` helper.
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

// ── Mock ConnectorSalesforceClient ─────────────────────────────────────────────
//
// The buyer route uses ConnectorSalesforceClient to fetch Asset records.
// We replace it with a stub whose `query` method is controlled per-test.

const mockSfQueryFn = vi.fn();

vi.mock('../lib/connectorSalesforceClient.js', () => ({
  ConnectorSalesforceClient: class {
    query(soql: string) {
      return mockSfQueryFn(soql);
    }
  },
}));

// Import app AFTER the mocks are registered so they are picked up.
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

/**
 * Make the SF connector return a minimal Asset record for the given assetId.
 * Only the standard fields that mapAssetToKitPageData() reads are required.
 */
function mockSfAsset(assetId: string, overrides: Record<string, unknown> = {}) {
  const record = {
    Id:           assetId,
    Name:         'Test Trail Kit',
    PurchaseDate: '2025-02-14',
    Status:       'Installed',
    Description:  null,
    Product2:     { Name: 'Transition Trails Series', Family: 'Trail Kits' },
    ...overrides,
  };
  mockSfQueryFn.mockResolvedValue({ records: [record], totalSize: 1, done: true });
}

/** Make the SF connector return no records — asset not found. */
function mockSfAssetNotFound() {
  mockSfQueryFn.mockResolvedValue({ records: [], totalSize: 0, done: true });
}

/** Make the SF connector throw — simulates network / rate-limit / auth failure. */
function mockSfError(message = 'SALESFORCE_DOWN') {
  mockSfQueryFn.mockRejectedValue(new Error(message));
}

/**
 * Make the first SF query throw INVALID_FIELD (custom fields absent),
 * then return a valid record on the second call (standard-fields fallback).
 */
function mockSfCustomFieldsFallback(assetId: string) {
  const record = {
    Id:           assetId,
    Name:         'Fallback Kit',
    PurchaseDate: '2025-01-01',
    Status:       null,
    Description:  null,
    Product2:     null,
  };
  mockSfQueryFn
    .mockRejectedValueOnce(new Error('Salesforce API error 400 GET /services/data/v62.0/query: [{"errorCode":"INVALID_FIELD"}]'))
    .mockResolvedValueOnce({ records: [record], totalSize: 1, done: true });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET /api/buyer/page/:token ─────────────────────────────────────────────────

describe('GET /api/buyer/page/:token', () => {
  test('200 with kit data for a valid active token', async () => {
    mockValidToken();
    mockSfAsset('sf-asset-001');

    const res = await request(app).get('/api/buyer/page/validtoken12345678');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toMatchObject({
      assetId:      'sf-asset-001',
      seriesLabel:  expect.any(String),
      kitTitle:     'Test Trail Kit',
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
    mockSfAsset('sf-asset-001');

    const res = await request(app).get('/api/buyer/page/futuretoken1234xxx');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('404 when the SF Asset record does not exist', async () => {
    mockValidToken();
    mockSfAssetNotFound();

    const res = await request(app).get('/api/buyer/page/validtoken12345678');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('asset_not_found');
  });

  test('503 when Salesforce is unavailable', async () => {
    mockValidToken();
    mockSfError('Service Unavailable');

    const res = await request(app).get('/api/buyer/page/validtoken12345678');
    expect(res.status).toBe(503);
    expect(res.body.error).toBe('sf_unavailable');
  });

  test('falls back to standard fields when custom fields are missing from the SF org', async () => {
    mockValidToken({ assetId: 'sf-asset-fb' });
    mockSfCustomFieldsFallback('sf-asset-fb');

    const res = await request(app).get('/api/buyer/page/validtoken12345678');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.assetId).toBe('sf-asset-fb');
    expect(res.body.data.kitTitle).toBe('Fallback Kit');
  });

  test('kit data includes SF-sourced fields', async () => {
    mockValidToken({ assetId: 'sf-asset-rich' });
    mockSfAsset('sf-asset-rich', {
      Name:              'Leadership Kit',
      PurchaseDate:      '2025-03-01',
      Kit_Edition__c:    'Spring 2025 Edition',
      Series_Label__c:   'Trails Premium Series',
      Content_Types__c:  '["Workbook","Facilitator Guide"]',
      Audience_Type__c:  'nonprofit',
      License_Terms__c:  '["Single org use","Unlimited print copies"]',
      Change_Log_JSON__c: JSON.stringify([
        { date: '2025-04-01', reason: 'Updated cover', description: 'Cover redesign.' },
      ]),
    });

    const res = await request(app).get('/api/buyer/page/validtoken12345678');
    expect(res.status).toBe(200);
    const data = res.body.data as {
      kitTitle: string;
      purchaseDate: string;
      editionName: string;
      seriesLabel: string;
      contentTypes: string[];
      audienceType: string;
      licenseTerms: string[];
      changeLog: unknown[];
    };
    expect(data.kitTitle).toBe('Leadership Kit');
    expect(data.purchaseDate).toBe('2025-03-01');
    expect(data.editionName).toBe('Spring 2025 Edition');
    expect(data.seriesLabel).toBe('Trails Premium Series');
    expect(data.contentTypes).toEqual(['Workbook', 'Facilitator Guide']);
    expect(data.audienceType).toBe('nonprofit');
    expect(data.licenseTerms).toEqual(['Single org use', 'Unlimited print copies']);
    expect(data.changeLog).toHaveLength(1);
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
