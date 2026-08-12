/**
 * Tests for GET and POST /api/salesforce/governance/build-items.
 *
 * GET coverage (C1–C4, Guard):
 *   C1. Valid request, but client.query() throws a realistic SF error
 *       → route returns 500 with a generic message (not the raw SF error)
 *   C2. 500 body contains a non-empty error string
 *   C3. 500 body does not contain a stack trace or file paths
 *   C4. 500 body does not contain raw Salesforce XML or SOAP markup
 *
 * POST coverage (P1–P2):
 *   P1. Valid body, but client.createRecord() throws → route returns 500
 *       with a generic message (not the raw SF error)
 *   P2. 500 body does not contain a stack trace, file paths, or raw SF
 *       XML/SOAP markup
 *
 * V3 tests confirm the typeof guard fires for non-string name values:
 *   V3a. name is a number (42) → 400 with error mentioning "name"; createRecord not reached
 *   V3b. name is an array ([]) → 400 with error mentioning "name"; createRecord not reached
 *
 * Pattern mirrors sfGovernanceNudges.test.ts — shared mockQueryError and
 * mockCreateRecordError control throw behaviour; both reset in beforeEach.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Auth bypass ────────────────────────────────────────────────────────────────

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:          (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:          (_req: unknown, _res: unknown, next: () => void) => next(),
  requireSuperAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireHomebaseAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:               () => true,
  isAdmin:               () => true,
  isSuperAdmin:          () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
  effectiveIdentityMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ── Shared mock state ──────────────────────────────────────────────────────────

const { mockQueryRecords, mockQueryError, mockCreateRecordError } = vi.hoisted(() => ({
  /** Records returned by any SOQL query (happy-path). */
  mockQueryRecords: { value: [] as Record<string, unknown>[] },
  /**
   * When non-null, client.query() throws this error instead of returning records.
   * Reset to null in beforeEach.
   */
  mockQueryError: { value: null as Error | null },
  /**
   * When non-null, client.createRecord() throws this error instead of returning
   * a success result.  Reset to null in beforeEach.
   */
  mockCreateRecordError: { value: null as Error | null },
}));

// ── Mock salesforceOAuth (describe probes — not exercised by this suite) ───────

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
    query: async <T>(_soql: string) => {
      if (mockQueryError.value) throw mockQueryError.value;
      return {
        totalSize: mockQueryRecords.value.length,
        done:      true,
        records:   mockQueryRecords.value as T[],
      };
    },
    createRecord: async () => {
      if (mockCreateRecordError.value) throw mockCreateRecordError.value;
      return { id: 'mock-id' };
    },
    updateRecord: async () => undefined,
    deleteRecord: async () => undefined,
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
    async createRecord() {
      if (mockCreateRecordError.value) throw mockCreateRecordError.value;
      return { id: 'mock-id' };
    }
    async updateRecord() { return undefined; }
    async deleteRecord() { return undefined; }
  },
}));

import app from '../app.js';

// ── Test setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQueryRecords.value = [];
  mockQueryError.value = null;
  mockCreateRecordError.value = null;
});

// ── C. Route tests: query failure handling ─────────────────────────────────────

describe('GET /api/salesforce/governance/build-items — query failure handling', () => {

  // ── C1: Query throws → 500 ──────────────────────────────────────────────────

  test('C1: returns 500 when client.query() throws INVALID_SESSION_ID', async () => {
    mockQueryError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app).get('/api/salesforce/governance/build-items');

    expect(res.status).toBe(500);
  });

  test('C1: returns 500 when client.query() throws QUERY_TIMEOUT', async () => {
    mockQueryError.value = new Error('QUERY_TIMEOUT: CpuTime limit exceeded');

    const res = await request(app).get('/api/salesforce/governance/build-items');

    expect(res.status).toBe(500);
  });

  // ── C2: 500 body contains a non-empty error string ───────────────────────────

  test('C2: 500 body contains a non-empty error field', async () => {
    mockQueryError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app).get('/api/salesforce/governance/build-items');

    expect(res.status).toBe(500);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  // ── C3: 500 body must not expose stack trace or file paths ───────────────────

  test('C3: 500 body does not contain a stack trace', async () => {
    mockQueryError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app).get('/api/salesforce/governance/build-items');

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

    const res = await request(app).get('/api/salesforce/governance/build-items');

    expect(res.status).toBe(500);

    const body = JSON.stringify(res.body);
    // Must not echo raw XML tags back to the caller
    expect(body).not.toMatch(/<soapenv:/);
    expect(body).not.toMatch(/<faultcode>/);
    expect(body).not.toMatch(/<\?xml/);
  });

  // ── Guard: items array must not appear in error responses ────────────────────

  test('Guard: items array is not present in the 500 error body', async () => {
    mockQueryError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app).get('/api/salesforce/governance/build-items');

    expect(res.status).toBe(500);
    expect(res.body.items).toBeUndefined();
  });
});

// ── V. POST route: input validation (name guard) ──────────────────────────────

describe('POST /api/salesforce/governance/build-items — input validation', () => {

  // ── V1: missing name field → 400 ─────────────────────────────────────────────

  test('V1: returns 400 when name field is absent', async () => {
    // Sentinel: if createRecord is ever called this test must fail
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when name is missing');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ automationId: 'some-id' }); // no name field

    expect(res.status).toBe(400);
  });

  test('V1: 400 body mentions "name" when name field is absent', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when name is missing');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({});

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.toLowerCase()).toContain('name');
  });

  // ── V2: empty string name → 400 ──────────────────────────────────────────────

  test('V2: returns 400 when name is an empty string', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when name is empty string');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: '' });

    expect(res.status).toBe(400);
  });

  test('V2: 400 body mentions "name" when name is an empty string', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when name is empty string');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.toLowerCase()).toContain('name');
  });

  test('V2: returns 400 when name is a whitespace-only string', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when name is whitespace');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: '   ' });

    expect(res.status).toBe(400);
  });

  // ── Guard: createRecord must not be reached for invalid requests ──────────────

  test('Guard: createRecord sentinel error is not returned when name is absent', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when name is missing');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({});

    // If createRecord were reached, the route would throw → 500; we must get 400
    expect(res.status).toBe(400);
    expect(res.body.error).not.toContain('SENTINEL');
  });

  test('Guard: createRecord sentinel error is not returned when name is empty string', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when name is empty string');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).not.toContain('SENTINEL');
  });

  // ── V3: non-string name types → 400 ──────────────────────────────────────────

  test('V3a: returns 400 when name is a number', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when name is a number');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: 42 });

    expect(res.status).toBe(400);
  });

  test('V3a: 400 body mentions "name" when name is a number', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when name is a number');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: 42 });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.toLowerCase()).toContain('name');
  });

  test('V3a: createRecord sentinel is not returned when name is a number', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when name is a number');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: 42 });

    // If createRecord were reached, the sentinel throw → 500; we must get 400
    expect(res.status).toBe(400);
    expect(res.body.error).not.toContain('SENTINEL');
  });

  test('V3b: returns 400 when name is an array', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when name is an array');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: [] });

    expect(res.status).toBe(400);
  });

  test('V3b: 400 body mentions "name" when name is an array', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when name is an array');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: [] });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.toLowerCase()).toContain('name');
  });

  test('V3b: createRecord sentinel is not returned when name is an array', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when name is an array');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: [] });

    // If createRecord were reached, the sentinel throw → 500; we must get 400
    expect(res.status).toBe(400);
    expect(res.body.error).not.toContain('SENTINEL');
  });
});

// ── P. POST route: createRecord failure handling ───────────────────────────────

describe('POST /api/salesforce/governance/build-items — createRecord failure handling', () => {

  // ── P1: createRecord throws → 500 with generic message ───────────────────────

  test('P1: returns 500 when client.createRecord() throws INVALID_SESSION_ID', async () => {
    mockCreateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: 'Test Build Item' });

    expect(res.status).toBe(500);
  });

  test('P1: returns 500 when client.createRecord() throws INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY', async () => {
    mockCreateRecordError.value = new Error(
      'INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY: insufficient access rights on cross-reference id'
    );

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: 'Build Item With Bad Ref', automationId: 'bad-id' });

    expect(res.status).toBe(500);
  });

  test('P1: 500 body contains a non-empty error field', async () => {
    mockCreateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: 'Test Build Item' });

    expect(res.status).toBe(500);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  // ── P2: 500 body must not expose stack traces or raw SF XML/SOAP ─────────────

  test('P2: 500 body does not contain a stack trace', async () => {
    mockCreateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .post('/api/salesforce/governance/build-items')
      .send({ name: 'Test Build Item' });

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
      .post('/api/salesforce/governance/build-items')
      .send({ name: 'Test Build Item' });

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
      .post('/api/salesforce/governance/build-items')
      .send({ name: 'Test Build Item' });

    expect(res.status).toBe(500);
    expect(res.body.id).toBeUndefined();
  });
});
