/**
 * Tests for POST /api/salesforce/governance/classroom-nudges.
 *
 * P1. Valid body, but client.createRecord() throws → route returns 500 with a
 *     generic message (not the raw SF error)
 * P2. 500 body does not contain a stack trace, file paths, or raw SF XML/SOAP
 *     markup
 *
 * Pattern mirrors sfGovernanceBuildItems.test.ts — shared mockCreateRecordError
 * controls throw behaviour and resets in beforeEach.
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

const { mockCreateRecordError } = vi.hoisted(() => ({
  /**
   * When non-null, client.createRecord() throws this error instead of
   * returning a success result.  Reset to null in beforeEach.
   */
  mockCreateRecordError: { value: null as Error | null },
}));

// ── Mock salesforceOAuth (probes — not exercised by this suite) ────────────────

vi.mock('../lib/salesforceOAuth.js', () => ({
  getEffectiveSfFetch: (_req: unknown) =>
    async function mockProxyFetch(_url: string): Promise<Response> {
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
    query: async <T>(_soql: string) => ({
      totalSize: 0,
      done:      true,
      records:   [] as T[],
    }),
    createRecord: async () => {
      if (mockCreateRecordError.value) throw mockCreateRecordError.value;
      return { id: 'mock-nudge-id' };
    },
    updateRecord: async () => undefined,
  }),
}));

vi.mock('../lib/connectorSalesforceClient.js', () => ({
  ConnectorSalesforceClient: class {
    async query<T>(_soql: string) {
      return { totalSize: 0, done: true, records: [] as T[] };
    }
    async createRecord() {
      if (mockCreateRecordError.value) throw mockCreateRecordError.value;
      return { id: 'mock-nudge-id' };
    }
    async updateRecord() { return undefined; }
  },
}));

import app from '../app.js';

// ── Minimal valid body ─────────────────────────────────────────────────────────

/** A body that passes all validation in the route handler. */
const VALID_BODY = {
  contactId:    '003000000000001AAA', // 18-char alphanumeric SF ID
  courseWorkId: 'cw-unit-001',
  nudgeDate:    '2026-08-04',
  sentAt:       '2026-08-04T10:00:00Z',
};

// ── Test setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockCreateRecordError.value = null;
});

// ── P. POST route: createRecord failure handling ───────────────────────────────

describe('POST /api/salesforce/governance/classroom-nudges — createRecord failure handling', () => {

  // ── P1: createRecord throws → 500 with generic message ───────────────────────

  test('P1: returns 500 when client.createRecord() throws INVALID_SESSION_ID', async () => {
    mockCreateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .post('/api/salesforce/governance/classroom-nudges')
      .send(VALID_BODY);

    expect(res.status).toBe(500);
  });

  test('P1: returns 500 when client.createRecord() throws INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY', async () => {
    mockCreateRecordError.value = new Error(
      'INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY: insufficient access rights on cross-reference id'
    );

    const res = await request(app)
      .post('/api/salesforce/governance/classroom-nudges')
      .send(VALID_BODY);

    expect(res.status).toBe(500);
  });

  test('P1: 500 body contains a non-empty error field', async () => {
    mockCreateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .post('/api/salesforce/governance/classroom-nudges')
      .send(VALID_BODY);

    expect(res.status).toBe(500);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  // ── P2: 500 body must not expose stack traces or raw SF XML/SOAP ─────────────

  test('P2: 500 body does not contain a stack trace', async () => {
    mockCreateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .post('/api/salesforce/governance/classroom-nudges')
      .send(VALID_BODY);

    expect(res.status).toBe(500);

    const body = JSON.stringify(res.body);
    // Stack traces contain "at " followed by a function name or file path
    expect(body).not.toMatch(/\bat\s+\w/);
    // No TypeScript or compiled-JS file paths
    expect(body).not.toMatch(/\.ts:\d+/);
    expect(body).not.toMatch(/\.js:\d+/);
  });

  test('P2: 500 body does not contain raw Salesforce XML or SOAP markup', async () => {
    // Simulate a network-level SOAP fault returned instead of JSON
    mockCreateRecordError.value = new Error(
      '<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope>' +
      '<soapenv:Body><soapenv:Fault><faultcode>sf:INVALID_SESSION_ID</faultcode>' +
      '<faultstring>Invalid Session ID found in SessionHeader</faultstring>' +
      '</soapenv:Fault></soapenv:Body></soapenv:Envelope>'
    );

    const res = await request(app)
      .post('/api/salesforce/governance/classroom-nudges')
      .send(VALID_BODY);

    expect(res.status).toBe(500);

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/<soapenv:/);
    expect(body).not.toMatch(/<faultcode>/);
    expect(body).not.toMatch(/<\?xml/);
  });

  // ── Guard: success id must not appear in error responses ─────────────────────

  test('Guard: id field is not present in the 500 error body', async () => {
    mockCreateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .post('/api/salesforce/governance/classroom-nudges')
      .send(VALID_BODY);

    expect(res.status).toBe(500);
    expect(res.body.id).toBeUndefined();
  });
});
