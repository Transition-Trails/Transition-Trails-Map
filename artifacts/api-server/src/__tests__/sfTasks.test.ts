/**
 * Tests for POST /api/sf/tasks and PATCH /api/sf/tasks/:id/complete.
 *
 * POST coverage:
 *   V1. Missing subject → 400 before createRecord is reached
 *   V2. Empty / whitespace-only subject → 400 before createRecord is reached
 *   V3. Invalid priority value is normalised to "Normal"; 201 is returned
 *   V4. Valid priority values ("High", "Normal", "Low") are passed through
 *   P1. SF error on createRecord → 500 with error field surfaced to client
 *   P2. 500 body does not expose stack traces or raw SF XML/SOAP markup
 *
 * PATCH /:id/complete coverage:
 *   I1. Invalid Task ID format → 400 before updateRecord is reached
 *   I2. Valid 15-char and 18-char IDs pass format validation → updateRecord called
 *   I3. SF error on updateRecord → 500 with error field surfaced to client
 *
 * Pattern mirrors sfGovernanceBuildItems.test.ts — shared mockCreateRecordError
 * and mockUpdateRecordError control throw behaviour; both reset in beforeEach.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Auth bypass ────────────────────────────────────────────────────────────────

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:                (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:                (_req: unknown, _res: unknown, next: () => void) => next(),
  requireSuperAdmin:           (_req: unknown, _res: unknown, next: () => void) => next(),
  requireHomebaseAuth:         (_req: unknown, _res: unknown, next: () => void) => next(),
  effectiveIdentityMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:                     () => true,
  isAdmin:                     () => true,
  isSuperAdmin:                () => false,
  getStaffGroups:              () => [],
  getAdminGroups:              () => [],
  getTeamGroup:                () => null,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

// ── Shared mock state ──────────────────────────────────────────────────────────

const {
  mockCreateRecordResult,
  mockCreateRecordError,
  mockUpdateRecordError,
  lastCreateRecordData,
} = vi.hoisted(() => ({
  /** When non-null, createRecord returns this result. */
  mockCreateRecordResult: { value: { id: 'fake-task-id-001', success: true } as { id: string; success: boolean } },
  /** When non-null, createRecord throws this error instead. */
  mockCreateRecordError: { value: null as Error | null },
  /** When non-null, updateRecord throws this error instead. */
  mockUpdateRecordError: { value: null as Error | null },
  /** Captures the data argument passed to createRecord for inspection. */
  lastCreateRecordData: { value: null as Record<string, unknown> | null },
}));

// ── Mock salesforceOAuth (not exercised by this suite) ─────────────────────────

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

// ── Mock getSalesforceClient ───────────────────────────────────────────────────

vi.mock('../lib/getSalesforceClient.js', () => ({
  getSalesforceClient: (_req: unknown) => ({
    query: async <T>(_soql: string) => ({
      totalSize: 0,
      done: true,
      records: [] as T[],
    }),
    createRecord: async (_object: string, data: Record<string, unknown>) => {
      lastCreateRecordData.value = data;
      if (mockCreateRecordError.value) throw mockCreateRecordError.value;
      return mockCreateRecordResult.value;
    },
    updateRecord: async (_object: string, _id: string, _data: Record<string, unknown>) => {
      if (mockUpdateRecordError.value) throw mockUpdateRecordError.value;
      return undefined;
    },
    deleteRecord: async () => undefined,
  }),
}));

vi.mock('../lib/connectorSalesforceClient.js', () => ({
  ConnectorSalesforceClient: class {
    async query<T>(_soql: string) {
      return { totalSize: 0, done: true, records: [] as T[] };
    }
    async createRecord(_object: string, data: Record<string, unknown>) {
      lastCreateRecordData.value = data;
      if (mockCreateRecordError.value) throw mockCreateRecordError.value;
      return mockCreateRecordResult.value;
    }
    async updateRecord(_object: string, _id: string, _data: Record<string, unknown>) {
      if (mockUpdateRecordError.value) throw mockUpdateRecordError.value;
      return undefined;
    }
    async deleteRecord() { return undefined; }
  },
}));

import app from '../app.js';

// ── Test setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockCreateRecordResult.value = { id: 'fake-task-id-001', success: true };
  mockCreateRecordError.value  = null;
  mockUpdateRecordError.value  = null;
  lastCreateRecordData.value   = null;
});

// ── V. POST route: subject validation ─────────────────────────────────────────

describe('POST /api/sf/tasks — subject validation', () => {

  // ── V1: missing subject → 400 ─────────────────────────────────────────────

  test('V1: returns 400 when subject is absent', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when subject is missing');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ description: 'some description' });

    expect(res.status).toBe(400);
  });

  test('V1: 400 body mentions "subject" when subject is absent', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when subject is missing');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({});

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.toLowerCase()).toContain('subject');
  });

  test('V1: createRecord is not reached when subject is absent', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called when subject is missing');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({});

    // If createRecord were reached, the sentinel throw → 500; we must get 400
    expect(res.status).toBe(400);
    expect(res.body.error).not.toContain('SENTINEL');
  });

  // ── V2: empty / whitespace-only subject → 400 ─────────────────────────────

  test('V2: returns 400 when subject is an empty string', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called for empty subject');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: '' });

    expect(res.status).toBe(400);
  });

  test('V2: returns 400 when subject is a whitespace-only string', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called for whitespace subject');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: '   ' });

    expect(res.status).toBe(400);
  });

  test('V2: createRecord is not reached when subject is whitespace-only', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called for whitespace subject');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).not.toContain('SENTINEL');
  });
});

// ── V3 / V4. POST route: priority normalisation ────────────────────────────────

describe('POST /api/sf/tasks — priority normalisation', () => {

  test('V3: invalid priority is normalised to "Normal"', async () => {
    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Fix the thing', priority: 'Urgent' });

    expect(res.status).toBe(201);
    expect(lastCreateRecordData.value?.['Priority']).toBe('Normal');
  });

  test('V3: absent priority defaults to "Normal"', async () => {
    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Fix the thing' });

    expect(res.status).toBe(201);
    expect(lastCreateRecordData.value?.['Priority']).toBe('Normal');
  });

  test('V4: "High" priority is passed through unchanged', async () => {
    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Urgent fix', priority: 'High' });

    expect(res.status).toBe(201);
    expect(lastCreateRecordData.value?.['Priority']).toBe('High');
  });

  test('V4: "Low" priority is passed through unchanged', async () => {
    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Low priority thing', priority: 'Low' });

    expect(res.status).toBe(201);
    expect(lastCreateRecordData.value?.['Priority']).toBe('Low');
  });

  test('V4: "Normal" priority is passed through unchanged', async () => {
    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Normal priority thing', priority: 'Normal' });

    expect(res.status).toBe(201);
    expect(lastCreateRecordData.value?.['Priority']).toBe('Normal');
  });
});

// ── P. POST route: createRecord failure handling ───────────────────────────────

describe('POST /api/sf/tasks — createRecord failure handling', () => {

  // ── P1: createRecord throws → 500 with error forwarded ────────────────────

  test('P1: returns 500 when createRecord throws INVALID_SESSION_ID', async () => {
    mockCreateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task' });

    expect(res.status).toBe(500);
  });

  test('P1: returns 500 when createRecord throws a validation error', async () => {
    mockCreateRecordError.value = new Error(
      'FIELD_CUSTOM_VALIDATION_EXCEPTION: Subject cannot be blank'
    );

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task' });

    expect(res.status).toBe(500);
  });

  test('P1: 500 body contains a non-empty error field', async () => {
    mockCreateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task' });

    expect(res.status).toBe(500);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  test('P1: 500 body contains the SF error message', async () => {
    mockCreateRecordError.value = new Error('REQUIRED_FIELD_MISSING: Required fields are missing');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task' });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('REQUIRED_FIELD_MISSING');
  });

  // ── P2: 500 body must not expose stack traces or raw SF XML/SOAP ──────────

  test('P2: 500 body does not contain a stack trace', async () => {
    mockCreateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task' });

    expect(res.status).toBe(500);

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/\bat\s+\w/);
    expect(body).not.toMatch(/\.ts:\d+/);
    expect(body).not.toMatch(/\.js:\d+/);
  });

  test('P2: SF error message is surfaced to the caller verbatim', async () => {
    // This route intentionally forwards the SF error message to the client
    // so the caller can display or log the rejection reason.
    mockCreateRecordError.value = new Error(
      'FIELD_CUSTOM_VALIDATION_EXCEPTION: You may not set Subject on a closed Task'
    );

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task' });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('FIELD_CUSTOM_VALIDATION_EXCEPTION');
  });

  // ── Guard: success fields must not appear in error responses ──────────────

  test('Guard: id field is not present in the 500 error body', async () => {
    mockCreateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task' });

    expect(res.status).toBe(500);
    expect(res.body.id).toBeUndefined();
  });
});

// ── I. PATCH /:id/complete: ID format validation ───────────────────────────────

describe('PATCH /api/sf/tasks/:id/complete — ID format validation', () => {

  // ── I1: invalid ID format → 400 before updateRecord is reached ────────────

  test('I1: returns 400 for an obviously invalid ID (empty-like slug)', async () => {
    mockUpdateRecordError.value = new Error('SENTINEL: updateRecord must not be called for invalid ID');

    const res = await request(app)
      .patch('/api/sf/tasks/not-a-real-id!/complete')
      .send();

    expect(res.status).toBe(400);
  });

  test('I1: returns 400 for a too-short ID (fewer than 15 chars)', async () => {
    mockUpdateRecordError.value = new Error('SENTINEL: updateRecord must not be called for short ID');

    const res = await request(app)
      .patch('/api/sf/tasks/00T123456/complete')
      .send();

    expect(res.status).toBe(400);
  });

  test('I1: returns 400 for a too-long ID (more than 18 chars)', async () => {
    mockUpdateRecordError.value = new Error('SENTINEL: updateRecord must not be called for long ID');

    const res = await request(app)
      .patch('/api/sf/tasks/00T1234567890123456789/complete')
      .send();

    expect(res.status).toBe(400);
  });

  test('I1: returns 400 for an ID containing non-alphanumeric characters', async () => {
    mockUpdateRecordError.value = new Error('SENTINEL: updateRecord must not be called for non-alnum ID');

    const res = await request(app)
      .patch('/api/sf/tasks/00T12345678901X-Y/complete')
      .send();

    expect(res.status).toBe(400);
  });

  test('I1: 400 body does not contain sentinel text (updateRecord was not called)', async () => {
    mockUpdateRecordError.value = new Error('SENTINEL: updateRecord must not be called for invalid ID');

    const res = await request(app)
      .patch('/api/sf/tasks/bad-id/complete')
      .send();

    expect(res.status).toBe(400);
    expect(res.body.error).not.toContain('SENTINEL');
  });

  // ── I2: valid 15-char and 18-char IDs pass format check ───────────────────

  test('I2: valid 15-char ID passes format validation and returns 200', async () => {
    const res = await request(app)
      .patch('/api/sf/tasks/00T123456789012/complete')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('I2: valid 18-char ID passes format validation and returns 200', async () => {
    const res = await request(app)
      .patch('/api/sf/tasks/00T123456789012ABC/complete')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── I3: SF error on updateRecord → 500 ────────────────────────────────────

  test('I3: returns 500 when updateRecord throws INVALID_SESSION_ID', async () => {
    mockUpdateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .patch('/api/sf/tasks/00T123456789012ABC/complete')
      .send();

    expect(res.status).toBe(500);
  });

  test('I3: 500 body contains a non-empty error field', async () => {
    mockUpdateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .patch('/api/sf/tasks/00T123456789012ABC/complete')
      .send();

    expect(res.status).toBe(500);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  test('I3: 500 body does not contain a stack trace', async () => {
    mockUpdateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .patch('/api/sf/tasks/00T123456789012ABC/complete')
      .send();

    expect(res.status).toBe(500);

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/\bat\s+\w/);
    expect(body).not.toMatch(/\.ts:\d+/);
    expect(body).not.toMatch(/\.js:\d+/);
  });

  test('I3: success field is not present in the 500 error body', async () => {
    mockUpdateRecordError.value = new Error('INVALID_SESSION_ID: Session expired or invalid');

    const res = await request(app)
      .patch('/api/sf/tasks/00T123456789012ABC/complete')
      .send();

    expect(res.status).toBe(500);
    expect(res.body.success).toBeUndefined();
  });
});
