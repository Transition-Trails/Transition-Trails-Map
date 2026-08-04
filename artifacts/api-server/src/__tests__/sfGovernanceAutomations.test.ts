/**
 * Tests for the TT Automation governance route and service function.
 *
 * Coverage:
 *   A. Unit tests for getAutomations() in salesforceService.ts
 *      A1. fieldsReady=false  → throws TtAutomationFieldsNotProvisionedError (no SOQL issued)
 *      A2. fieldsReady=true   → issues the expected filtered SOQL (Is_Active__c = true)
 *
 *   B. Route-level integration tests for GET /api/salesforce/governance/automations
 *      B1. describe returns all 4 required fields → 200 with filtered records
 *      B2. describe missing one of the 4 fields   → 503 with phase2Deferred:true
 *      B3. describe returns 429                   → 503 with phase2Deferred:true
 *      B4. describe returns a non-429 error        → 503 with phase2Deferred:true
 *
 * Pattern mirrors sfValidateCustomFields.test.ts — a shared describeOverrides map
 * controls mock behaviour per test; reset in beforeEach.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Auth bypass ────────────────────────────────────────────────────────────────

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:          (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:          (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:               () => true,
  isAdmin:               () => true,
  isSuperAdmin:          () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

// ── Per-object describe overrides ──────────────────────────────────────────────
//
// Keys are Salesforce object API names.
//   • string[]                           → return that set of custom field names (success)
//   • null                               → return 404 (object absent / generic describe error)
//   • { rateLimited: true, retryAfter? } → return 429 (exhausts retry budget)
//   • key absent                         → return default success with empty custom fields

type DescribeOverride = string[] | null | { rateLimited: true; retryAfter?: number };

const { describeOverrides, mockQueryRecords } = vi.hoisted(() => ({
  describeOverrides: new Map<string, DescribeOverride>(),
  /** Records returned by any SOQL query against TT_Automation__c. */
  mockQueryRecords: { value: [] as Record<string, unknown>[] },
}));

// Helper to build a minimal Response-like object (matches sfValidateCustomFields pattern)
function makeResponse(
  ok: boolean,
  status: number,
  body: unknown,
  headers: Headers = new Headers(),
): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : String(status),
    headers,
    redirected: false,
    type: 'basic' as Response['type'],
    url: '',
    json:        async () => body,
    text:        async () => JSON.stringify(body),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:        async () => new Blob(),
    formData:    async () => new FormData(),
    body:        null,
    bodyUsed:    false,
    clone: () => makeResponse(ok, status, body, headers),
  } as Response;
}

// ── Mock salesforceOAuth ───────────────────────────────────────────────────────
//
// Controls both describe probes (used by getCustomFields) and SOQL queries
// (used by the client returned from getSalesforceClient / ConnectorSalesforceClient).

vi.mock('../lib/salesforceOAuth.js', () => ({
  getEffectiveSfFetch: (_req: unknown) => {
    return async function mockProxyFetch(url: string): Promise<Response> {
      // ── describe probes ───────────────────────────────────────────────────
      const describeMatch = url.match(/\/sobjects\/([^/]+)\/describe/);
      if (describeMatch) {
        const objectName = decodeURIComponent(describeMatch[1]!);

        if (describeOverrides.has(objectName)) {
          const override = describeOverrides.get(objectName)!;

          if (override === null) {
            return makeResponse(false, 404, {});
          }

          if (!Array.isArray(override) && override.rateLimited) {
            const retryAfter = override.retryAfter ?? 0;
            const h = new Headers({ 'Retry-After': String(retryAfter) });
            return makeResponse(false, 429, 'Rate limit exceeded', h);
          }

          return makeResponse(true, 200, {
            name:   objectName,
            fields: override.map(f => ({ name: f, custom: true })),
          });
        }

        // Default: object exists, no custom fields
        return makeResponse(true, 200, { name: objectName, fields: [] });
      }

      // ── SOQL queries ──────────────────────────────────────────────────────
      if (url.includes('/query')) {
        const records = mockQueryRecords.value;
        return makeResponse(true, 200, {
          totalSize: records.length,
          done:      true,
          records,
        });
      }

      // ── Identity / limits fallback ────────────────────────────────────────
      if (url.includes('/chatter/users/me')) {
        return makeResponse(true, 200, {
          username:    'test@example.com',
          displayName: 'Test User',
          email:       'test@example.com',
          id:          '005000000000001',
        });
      }

      return makeResponse(true, 200, {});
    };
  },
}));

// ── Mock getSalesforceClient + ConnectorSalesforceClient ───────────────────────
//
// The route tries getSalesforceClient first, falls back to ConnectorSalesforceClient.
// Both return the same mock client whose query() delegates to mockQueryRecords.

vi.mock('../lib/getSalesforceClient.js', () => ({
  getSalesforceClient: (_req: unknown) => ({
    query: async <T>(_soql: string) => ({
      totalSize: mockQueryRecords.value.length,
      done:      true,
      records:   mockQueryRecords.value as T[],
    }),
    createRecord: async () => ({ id: 'mock-id' }),
    updateRecord: async () => undefined,
  }),
}));

vi.mock('../lib/connectorSalesforceClient.js', () => ({
  ConnectorSalesforceClient: class {
    async query<T>(_soql: string) {
      return {
        totalSize: mockQueryRecords.value.length,
        done:      true,
        records:   mockQueryRecords.value as T[],
      };
    }
    async createRecord() { return { id: 'mock-id' }; }
    async updateRecord() { return undefined; }
  },
}));

import app from '../app.js';

// ── Unit-test imports (must come after mocks) ──────────────────────────────────
import {
  getAutomations,
  TtAutomationFieldsNotProvisionedError,
} from '../lib/salesforceService.js';
import type { ISalesforceClient } from '../lib/salesforceClient.js';

// ── Test setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  describeOverrides.clear();
  mockQueryRecords.value = [];
});

// ── A. Unit tests: getAutomations() ───────────────────────────────────────────

describe('getAutomations() — unit tests', () => {

  /**
   * Minimal ISalesforceClient stub.
   * Records the SOQL string that was passed to query() so assertions can inspect it.
   */
  function makeClient(records: Record<string, unknown>[] = []): ISalesforceClient & { lastSoql: string | null } {
    return {
      lastSoql: null as string | null,
      async query<T>(soql: string) {
        (this as { lastSoql: string | null }).lastSoql = soql;
        return {
          totalSize: records.length,
          done:      true,
          records:   records as T[],
        };
      },
      async createRecord() { return { id: 'mock-id' }; },
      async updateRecord() { return undefined; },
    };
  }

  test('A1: fieldsReady=false throws TtAutomationFieldsNotProvisionedError without issuing SOQL', async () => {
    const client = makeClient();

    await expect(getAutomations(client, false)).rejects.toBeInstanceOf(
      TtAutomationFieldsNotProvisionedError,
    );

    // The query method must never have been called
    expect(client.lastSoql).toBeNull();
  });

  test('A1: error message names the four missing fields', async () => {
    const client = makeClient();

    const err = await getAutomations(client, false).catch(e => e);
    expect(err).toBeInstanceOf(TtAutomationFieldsNotProvisionedError);
    expect(err.message).toMatch(/Is_Active__c/);
    expect(err.message).toMatch(/Automation_Type__c/);
    expect(err.message).toMatch(/Description__c/);
    expect(err.message).toMatch(/Status__c/);
  });

  test('A2: fieldsReady=true issues SOQL filtered by Is_Active__c = true', async () => {
    const client = makeClient();

    await getAutomations(client, true);

    expect(client.lastSoql).not.toBeNull();
    expect(client.lastSoql).toMatch(/Is_Active__c\s*=\s*true/i);
    expect(client.lastSoql).toMatch(/FROM\s+TT_Automation__c/i);
  });

  test('A2: fieldsReady=true selects the four required filter fields', async () => {
    const client = makeClient();

    await getAutomations(client, true);

    expect(client.lastSoql).toMatch(/Is_Active__c/);
    expect(client.lastSoql).toMatch(/Automation_Type__c/);
    expect(client.lastSoql).toMatch(/Description__c/);
    expect(client.lastSoql).toMatch(/Status__c/);
  });

  test('A2: fieldsReady=true maps returned records to AutomationRecord shape', async () => {
    const rawRecords = [
      {
        Id:                 'a00001',
        Name:               'Onboarding Bot',
        Is_Active__c:       true,
        Automation_Type__c: 'flow',
        Description__c:     'Handles onboarding',
        Status__c:          'Active',
        CreatedDate:        '2026-01-01T00:00:00.000Z',
      },
      {
        Id:                 'a00002',
        Name:               'Nudge Bot',
        Is_Active__c:       true,
        Automation_Type__c: 'apex',
        Description__c:     null,
        Status__c:          'Draft',
        CreatedDate:        '2026-02-01T00:00:00.000Z',
      },
    ];

    const client = makeClient(rawRecords as Record<string, unknown>[]);
    const result = await getAutomations(client, true);

    expect(result).toHaveLength(2);

    expect(result[0]).toMatchObject({
      id:             'a00001',
      name:           'Onboarding Bot',
      isActive:       true,
      automationType: 'flow',
      description:    'Handles onboarding',
      status:         'Active',
      createdDate:    '2026-01-01T00:00:00.000Z',
    });

    expect(result[1]).toMatchObject({
      id:          'a00002',
      description: null,
    });
  });

  test('A2: limit is clamped to 1–200', async () => {
    const client = makeClient();

    await getAutomations(client, true, 0);
    expect(client.lastSoql).toMatch(/LIMIT 1/);

    await getAutomations(client, true, 999);
    expect(client.lastSoql).toMatch(/LIMIT 200/);

    await getAutomations(client, true, 42);
    expect(client.lastSoql).toMatch(/LIMIT 42/);
  });

  test('A2: empty result set is returned without error', async () => {
    const client = makeClient([]);
    const result = await getAutomations(client, true);
    expect(result).toHaveLength(0);
  });
});

// ── B. Route integration tests: GET /api/salesforce/governance/automations ────

describe('GET /api/salesforce/governance/automations — route integration tests', () => {

  const ALL_FOUR_FIELDS = [
    'Is_Active__c',
    'Automation_Type__c',
    'Description__c',
    'Status__c',
  ];

  // ── B1: All 4 fields present → 200 ──────────────────────────────────────────

  test('B1: returns 200 when all four required fields are present in the describe', async () => {
    describeOverrides.set('TT_Automation__c', ALL_FOUR_FIELDS);

    const res = await request(app).get('/api/salesforce/governance/automations');
    expect(res.status).toBe(200);
  });

  test('B1: response body contains automations array and total count', async () => {
    describeOverrides.set('TT_Automation__c', ALL_FOUR_FIELDS);
    mockQueryRecords.value = [
      {
        Id:                 'a00001',
        Name:               'Onboarding Bot',
        Is_Active__c:       true,
        Automation_Type__c: 'flow',
        Description__c:     'Handles onboarding',
        Status__c:          'Active',
        CreatedDate:        '2026-01-01T00:00:00.000Z',
      },
    ];

    const res = await request(app).get('/api/salesforce/governance/automations');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.automations)).toBe(true);
    expect(res.body.total).toBe(1);
    expect(res.body.automations[0]).toMatchObject({
      id:   'a00001',
      name: 'Onboarding Bot',
    });
  });

  test('B1: returns empty automations array when query returns no records', async () => {
    describeOverrides.set('TT_Automation__c', ALL_FOUR_FIELDS);
    mockQueryRecords.value = [];

    const res = await request(app).get('/api/salesforce/governance/automations');
    expect(res.status).toBe(200);
    expect(res.body.automations).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  // ── B2: One field missing → 503 phase2Deferred ──────────────────────────────

  test('B2: returns 503 with phase2Deferred:true when one field is missing', async () => {
    // All four fields except Status__c
    describeOverrides.set('TT_Automation__c', [
      'Is_Active__c',
      'Automation_Type__c',
      'Description__c',
      // Status__c intentionally absent
    ]);

    const res = await request(app).get('/api/salesforce/governance/automations');
    expect(res.status).toBe(503);
    expect(res.body.phase2Deferred).toBe(true);
  });

  test('B2: 503 body names the specific missing field', async () => {
    describeOverrides.set('TT_Automation__c', [
      'Is_Active__c',
      'Automation_Type__c',
      'Description__c',
      // Status__c absent
    ]);

    const res = await request(app).get('/api/salesforce/governance/automations');
    expect(res.status).toBe(503);
    // missingFields array lists only the absent field
    expect(Array.isArray(res.body.missingFields)).toBe(true);
    expect(res.body.missingFields).toContain('Status__c');
    expect(res.body.missingFields).toHaveLength(1);
  });

  test('B2: returns 503 when ALL four fields are absent (org not yet provisioned)', async () => {
    describeOverrides.set('TT_Automation__c', []);

    const res = await request(app).get('/api/salesforce/governance/automations');
    expect(res.status).toBe(503);
    expect(res.body.phase2Deferred).toBe(true);
    expect(res.body.missingFields).toHaveLength(4);
  });

  test('B2: each specific required field, when missing alone, causes 503', async () => {
    for (const missingField of ALL_FOUR_FIELDS) {
      describeOverrides.set(
        'TT_Automation__c',
        ALL_FOUR_FIELDS.filter(f => f !== missingField),
      );

      const res = await request(app).get('/api/salesforce/governance/automations');
      expect(res.status).toBe(503);
      expect(res.body.phase2Deferred).toBe(true);
      expect(res.body.missingFields).toContain(missingField);
    }
  });

  // ── B3: Rate-limited describe → 503 phase2Deferred ──────────────────────────

  test('B3: returns 503 with phase2Deferred:true when describe is rate-limited', async () => {
    // retryAfter:0 so sfGetWithRetry's test-mode sleep(0 ms) returns immediately
    describeOverrides.set('TT_Automation__c', { rateLimited: true, retryAfter: 0 });

    const res = await request(app).get('/api/salesforce/governance/automations');
    expect(res.status).toBe(503);
    expect(res.body.phase2Deferred).toBe(true);
  });

  test('B3: rate-limited 503 error message mentions "rate-limited" or retry', async () => {
    describeOverrides.set('TT_Automation__c', { rateLimited: true, retryAfter: 0 });

    const res = await request(app).get('/api/salesforce/governance/automations');
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/rate.?limit/i);
  });

  // ── B4: Describe returns non-429 error → 503 phase2Deferred ─────────────────

  test('B4: returns 503 with phase2Deferred:true when describe returns 404 (object absent)', async () => {
    describeOverrides.set('TT_Automation__c', null);

    const res = await request(app).get('/api/salesforce/governance/automations');
    expect(res.status).toBe(503);
    expect(res.body.phase2Deferred).toBe(true);
  });

  // ── Guard: no SOQL issued when fields absent ─────────────────────────────────

  test('no records are returned in any error body — query is never executed when fields absent', async () => {
    // Missing one field — the route must refuse to query
    describeOverrides.set('TT_Automation__c', [
      'Is_Active__c', 'Automation_Type__c', 'Description__c',
    ]);
    // Populate mock records to confirm they are NOT returned
    mockQueryRecords.value = [
      {
        Id: 'a99999', Name: 'Should not appear',
        Is_Active__c: true, Automation_Type__c: 'flow',
        Description__c: null, Status__c: 'Active',
        CreatedDate: '2026-01-01T00:00:00.000Z',
      },
    ];

    const res = await request(app).get('/api/salesforce/governance/automations');
    expect(res.status).toBe(503);
    // automations key must not be present in the 503 body
    expect(res.body.automations).toBeUndefined();
  });
});
