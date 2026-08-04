/**
 * Tests for GET /api/salesforce/governance/classroom-nudges/:contactId
 *
 * Coverage:
 *   C1. Valid contactId, client.query() throws a realistic SF error
 *       → route returns 500 with a generic message (not the raw SF error)
 *   C2. 500 body does not contain a stack trace
 *   C3. 500 body does not contain raw Salesforce XML or SOAP markup
 *   C4. 500 body contains a non-empty error string (caller gets something useful)
 *
 * Pattern mirrors sfGovernanceAutomations.test.ts — a shared mockQueryError
 * controls whether client.query() throws; reset in beforeEach.
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

// ── Shared mock state ──────────────────────────────────────────────────────────

const { mockQueryRecords, mockQueryError } = vi.hoisted(() => ({
  /** Records returned by any SOQL query (happy-path). */
  mockQueryRecords: { value: [] as Record<string, unknown>[] },
  /**
   * When non-null, client.query() throws this error instead of returning records.
   * Reset to null in beforeEach.
   */
  mockQueryError: { value: null as Error | null },
}));

// ── Mock salesforceOAuth (describe probes — not exercised by this suite) ───────

vi.mock('../lib/salesforceOAuth.js', () => ({
  getEffectiveSfFetch: (_req: unknown) =>
    async function mockProxyFetch(url: string): Promise<Response> {
      if (url.includes('/query')) {
        if (mockQueryError.value) throw mockQueryError.value;
        const records = mockQueryRecords.value;
        return {
          ok: true, status: 200,
          json: async () => ({ totalSize: records.length, done: true, records }),
          text: async () => JSON.stringify({ totalSize: records.length, done: true, records }),
        } as Response;
      }
      return {
        ok: true, status: 200,
        json: async () => ({}),
        text: async () => '{}',
      } as Response;
    },
}));

// ── Mock getSalesforceClient + ConnectorSalesforceClient ───────────────────────

vi.mock('../lib/getSalesforceClient.js', () => ({
  getSalesforceClient: (_req: unknown) => ({
    query: async <T>(_soql: string) => {
      if (mockQueryError.value) throw mockQueryError.value;
      return {
        totalSize: mockQueryRecords.value.length,
        done:      true,
        records:   mockQueryRecords.value as T[],
      };
    },
    createRecord: async () => ({ id: 'mock-id' }),
    updateRecord: async () => undefined,
  }),
}));

vi.mock('../lib/connectorSalesforceClient.js', () => ({
  ConnectorSalesforceClient: class {
    async query<T>(_soql: string) {
      if (mockQueryError.value) throw mockQueryError.value;
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

// ── Test setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQueryRecords.value = [];
  mockQueryError.value = null;
});

// ── A valid Salesforce Contact ID used in all tests ────────────────────────────
const VALID_CONTACT_ID = '003000000000001AAA'; // 18-char alphanumeric SF ID

// ── C. Route tests: query failure handling ─────────────────────────────────────

describe('GET /api/salesforce/governance/classroom-nudges/:contactId — query failure handling', () => {

  // ── C1: Query throws → 500 with generic message ─────────────────────────────

  test('C1: returns 500 when client.query() throws INVALID_SESSION_ID', async () => {
    mockQueryError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .get(`/api/salesforce/governance/classroom-nudges/${VALID_CONTACT_ID}`);

    expect(res.status).toBe(500);
  });

  test('C1: returns 500 when client.query() throws QUERY_TIMEOUT', async () => {
    mockQueryError.value = new Error('QUERY_TIMEOUT: CpuTime limit exceeded');

    const res = await request(app)
      .get(`/api/salesforce/governance/classroom-nudges/${VALID_CONTACT_ID}`);

    expect(res.status).toBe(500);
  });

  // ── C2: 500 body contains a non-empty error string ───────────────────────────

  test('C2: 500 body contains a non-empty error field', async () => {
    mockQueryError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .get(`/api/salesforce/governance/classroom-nudges/${VALID_CONTACT_ID}`);

    expect(res.status).toBe(500);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  // ── C3: 500 body must not expose stack trace ─────────────────────────────────

  test('C3: 500 body does not contain a stack trace', async () => {
    mockQueryError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .get(`/api/salesforce/governance/classroom-nudges/${VALID_CONTACT_ID}`);

    expect(res.status).toBe(500);

    const body = JSON.stringify(res.body);
    // Stack traces contain "at " followed by a function name or file path
    expect(body).not.toMatch(/\bat\s+\w/);
    // No TypeScript or compiled-JS file paths
    expect(body).not.toMatch(/\.ts:\d+/);
    expect(body).not.toMatch(/\.js:\d+/);
  });

  // ── C4: 500 body must not expose raw Salesforce XML or SOAP markup ───────────

  test('C4: 500 body does not contain raw Salesforce XML or SOAP markup', async () => {
    // Simulate a network-level SOAP fault (common when the SF session expires
    // and the API returns a raw SOAP envelope instead of JSON)
    mockQueryError.value = new Error(
      '<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope>' +
      '<soapenv:Body><soapenv:Fault><faultcode>sf:INVALID_SESSION_ID</faultcode>' +
      '<faultstring>Invalid Session ID found in SessionHeader</faultstring>' +
      '</soapenv:Fault></soapenv:Body></soapenv:Envelope>'
    );

    const res = await request(app)
      .get(`/api/salesforce/governance/classroom-nudges/${VALID_CONTACT_ID}`);

    expect(res.status).toBe(500);

    const body = JSON.stringify(res.body);
    // Must not echo raw XML tags back to the caller
    expect(body).not.toMatch(/<soapenv:/);
    expect(body).not.toMatch(/<faultcode>/);
    expect(body).not.toMatch(/<\?xml/);
  });

  // ── Guard: nudges array must not appear in error responses ───────────────────

  test('nudges key is absent from the 500 error body', async () => {
    mockQueryError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .get(`/api/salesforce/governance/classroom-nudges/${VALID_CONTACT_ID}`);

    expect(res.status).toBe(500);
    expect(res.body.nudges).toBeUndefined();
  });

  // ── Happy path: sanity check that the route works when query succeeds ─────────

  test('returns 200 with nudges array when query succeeds', async () => {
    mockQueryRecords.value = [
      {
        Id:              'a00001',
        Learner__c:      VALID_CONTACT_ID,
        Course_Work_ID__c: 'cw-001',
        Nudge_Date__c:   '2026-08-01',
        Sent_At__c:      '2026-08-01T10:00:00.000Z',
        CreatedDate:     '2026-08-01T10:00:00.000Z',
      },
    ];

    const res = await request(app)
      .get(`/api/salesforce/governance/classroom-nudges/${VALID_CONTACT_ID}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.nudges)).toBe(true);
    expect(res.body.total).toBe(1);
  });

  // ── Validation: invalid contactId is rejected before the query is attempted ───

  test('returns 400 for an invalid contactId without reaching the query', async () => {
    // Even if the query would throw, validation fires first
    mockQueryError.value = new Error('INVALID_SESSION_ID: should not be reached');

    const res = await request(app)
      .get('/api/salesforce/governance/classroom-nudges/not-a-valid-id');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid Salesforce Contact ID/i);
  });
});
