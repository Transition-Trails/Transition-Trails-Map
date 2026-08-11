/**
 * Tests for POST /api/sf/tasks and PATCH /api/sf/tasks/:id/complete.
 *
 * POST coverage:
 *   V1. Missing subject → 400 before createRecord is reached
 *   V2. Empty / whitespace-only subject → 400 before createRecord is reached
 *   V3. Invalid priority value is normalised to "Normal"; 201 is returned
 *   V4. Valid priority values ("High", "Normal", "Low") are passed through
 *   D1. Invalid dueDate format → 400 before createRecord is reached
 *   D2. Valid YYYY-MM-DD dueDate passes through to createRecord
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
  mockSfUserId,
  lastQuerySoql,
} = vi.hoisted(() => ({
  /** When non-null, createRecord returns this result. */
  mockCreateRecordResult: { value: { id: 'fake-task-id-001', success: true } as { id: string; success: boolean } },
  /** When non-null, createRecord throws this error instead. */
  mockCreateRecordError: { value: null as Error | null },
  /** When non-null, updateRecord throws this error instead. */
  mockUpdateRecordError: { value: null as Error | null },
  /** Captures the data argument passed to createRecord for inspection. */
  lastCreateRecordData: { value: null as Record<string, unknown> | null },
  /**
   * Controls the SF user ID visible to the GET /sf/tasks route.
   * null  → getSalesforceClient throws → 401 (simulates absent/unauthenticated session)
   * string → injected into req.session.sfUserId so the route can scope its SOQL query
   */
  mockSfUserId: { value: '005SF000001TestABC' as string | null },
  /** Captures the SOQL string passed to client.query() for GET /sf/tasks assertions. */
  lastQuerySoql: { value: null as string | null },
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
  getSalesforceClient: (req: unknown) => {
    // Simulate an absent or unauthenticated Salesforce session.
    if (!mockSfUserId.value) {
      throw new Error('Not authenticated with Salesforce. Visit /api/auth/salesforce/login to connect.');
    }
    // Inject sfUserId into the request session so the route's guard and SOQL
    // builder see the same value that would be present in a real session.
    const r = req as { session?: Record<string, unknown> };
    if (r.session) r.session['sfUserId'] = mockSfUserId.value;
    return {
      query: async <T>(soql: string) => {
        lastQuerySoql.value = soql;
        // The PATCH /:id/complete route runs an ownership check:
        //   SELECT Id FROM Task WHERE Id = '<taskId>' AND OwnerId = '<userId>' ...
        // The mock returns empty records by default, which causes the route to
        // return 404 ("task not found / not yours"). For the I2 (success) and
        // I3 (SF error) tests we need the ownership check to pass so execution
        // reaches updateRecord. Detect this pattern and return a matching record.
        const ownershipMatch = /FROM Task WHERE Id = '([^']+)'/.exec(soql);
        if (ownershipMatch) {
          return { totalSize: 1, done: true, records: [{ Id: ownershipMatch[1] }] as unknown as T[] };
        }
        return { totalSize: 0, done: true, records: [] as T[] };
      },
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
    };
  },
}));

vi.mock('../lib/connectorSalesforceClient.js', () => ({
  ConnectorSalesforceClient: class {
    async query<T>(soql: string) {
      // Mirror the ownership-check fix applied to getSalesforceClient above.
      const ownershipMatch = /FROM Task WHERE Id = '([^']+)'/.exec(soql);
      if (ownershipMatch) {
        return { totalSize: 1, done: true, records: [{ Id: ownershipMatch[1] }] as unknown as T[] };
      }
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
  mockSfUserId.value           = '005SF000001TestABC';
  lastQuerySoql.value          = null;
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

// ── D1 / D2. POST route: dueDate format validation ────────────────────────────

describe('POST /api/sf/tasks — dueDate format validation', () => {

  // ── D1: invalid dueDate formats → 400 ────────────────────────────────────

  test('D1: returns 400 when dueDate is a natural-language string', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called for invalid dueDate');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task', dueDate: 'tomorrow' });

    expect(res.status).toBe(400);
  });

  test('D1: returns 400 when dueDate uses slashes (YYYY/MM/DD)', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called for slash-delimited dueDate');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task', dueDate: '2026/08/11' });

    expect(res.status).toBe(400);
  });

  test('D1: returns 400 when dueDate is MM-DD-YYYY', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called for MM-DD-YYYY dueDate');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task', dueDate: '08-11-2026' });

    expect(res.status).toBe(400);
  });

  test('D1: 400 body mentions "dueDate" when format is invalid', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task', dueDate: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.toLowerCase()).toContain('duedate');
  });

  test('D1: createRecord is not reached when dueDate is invalid', async () => {
    mockCreateRecordError.value = new Error('SENTINEL: createRecord must not be called for invalid dueDate');

    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task', dueDate: 'tomorrow' });

    expect(res.status).toBe(400);
    expect(res.body.error).not.toContain('SENTINEL');
  });

  // ── D2: valid YYYY-MM-DD passes through ───────────────────────────────────

  test('D2: valid YYYY-MM-DD dueDate returns 201', async () => {
    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task', dueDate: '2026-08-11' });

    expect(res.status).toBe(201);
  });

  test('D2: valid dueDate is passed to createRecord as ActivityDate', async () => {
    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task', dueDate: '2026-08-11' });

    expect(res.status).toBe(201);
    expect(lastCreateRecordData.value?.['ActivityDate']).toBe('2026-08-11');
  });

  test('D2: absent dueDate is accepted (no ActivityDate set)', async () => {
    const res = await request(app)
      .post('/api/sf/tasks')
      .send({ subject: 'Test Task' });

    expect(res.status).toBe(201);
    expect(lastCreateRecordData.value?.['ActivityDate']).toBeUndefined();
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

// ── G. GET /sf/tasks: sfUserId guard ──────────────────────────────────────────
//
// When sfUserId is absent from the session the route must refuse immediately.
// The mock simulates this by throwing from getSalesforceClient (the same path
// that fires in production when SF credentials are missing).

describe('GET /api/sf/tasks — sfUserId guard', () => {

  test('G1: returns 401 when sfUserId is absent from session', async () => {
    mockSfUserId.value = null;

    const res = await request(app).get('/api/sf/tasks');

    expect(res.status).toBe(401);
  });

  test('G1: 401 body contains an error field', async () => {
    mockSfUserId.value = null;

    const res = await request(app).get('/api/sf/tasks');

    expect(res.status).toBe(401);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  test('G1: query() is never called when sfUserId is absent', async () => {
    mockSfUserId.value = null;

    await request(app).get('/api/sf/tasks');

    // lastQuerySoql remains null — client.query() was never reached
    expect(lastQuerySoql.value).toBeNull();
  });

  test('G1: successful request includes the sfUserId in the OwnerId filter', async () => {
    // sfUserId is '005SF000001TestABC' (set in beforeEach)
    const res = await request(app).get('/api/sf/tasks');

    expect(res.status).toBe(200);
    expect(lastQuerySoql.value).toContain("OwnerId = '005SF000001TestABC'");
  });
});

// ── S. GET /sf/tasks: status filter SOQL WHERE clause ─────────────────────────

describe('GET /api/sf/tasks — status filter', () => {

  test('S1: ?status=completed produces Status = "Completed" clause', async () => {
    const res = await request(app).get('/api/sf/tasks?status=completed');

    expect(res.status).toBe(200);
    expect(lastQuerySoql.value).toContain("Status = 'Completed'");
  });

  test('S1: ?status=completed does not include the active-status set', async () => {
    await request(app).get('/api/sf/tasks?status=completed');

    expect(lastQuerySoql.value).not.toContain('Not Started');
  });

  test('S2: ?status=all produces Status != null clause', async () => {
    const res = await request(app).get('/api/sf/tasks?status=all');

    expect(res.status).toBe(200);
    expect(lastQuerySoql.value).toContain('Status != null');
  });

  test('S3: default (no status param) produces active-status IN clause', async () => {
    const res = await request(app).get('/api/sf/tasks');

    expect(res.status).toBe(200);
    expect(lastQuerySoql.value).toContain("Status IN ('Not Started', 'In Progress', 'Deferred')");
  });

  test('S3: unknown status value falls through to the active-status default', async () => {
    const res = await request(app).get('/api/sf/tasks?status=unknown_value');

    expect(res.status).toBe(200);
    expect(lastQuerySoql.value).toContain("Status IN ('Not Started', 'In Progress', 'Deferred')");
  });
});

// ── D. GET /sf/tasks: date filter SOQL injection ──────────────────────────────

describe('GET /api/sf/tasks — date filter', () => {

  test('D1: ?date=today injects an ActivityDate filter', async () => {
    const res = await request(app).get('/api/sf/tasks?date=today');

    expect(res.status).toBe(200);
    expect(lastQuerySoql.value).toContain('ActivityDate =');
  });

  test('D1: the injected ActivityDate value is today in YYYY-MM-DD format', async () => {
    const todayIso = new Date().toISOString().slice(0, 10); // e.g. "2026-08-11"

    await request(app).get('/api/sf/tasks?date=today');

    expect(lastQuerySoql.value).toContain(`ActivityDate = ${todayIso}`);
  });

  test('D1: without ?date=today the SOQL contains no ActivityDate WHERE filter', async () => {
    await request(app).get('/api/sf/tasks');

    // ActivityDate appears in the SELECT list; we check only the filter form.
    expect(lastQuerySoql.value).not.toContain('ActivityDate =');
  });

  test('D1: ?date=today can be combined with ?status=completed', async () => {
    const todayIso = new Date().toISOString().slice(0, 10);

    const res = await request(app).get('/api/sf/tasks?status=completed&date=today');

    expect(res.status).toBe(200);
    expect(lastQuerySoql.value).toContain("Status = 'Completed'");
    expect(lastQuerySoql.value).toContain(`ActivityDate = ${todayIso}`);
  });
});
