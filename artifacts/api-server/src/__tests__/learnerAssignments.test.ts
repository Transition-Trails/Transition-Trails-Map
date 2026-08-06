/**
 * learnerAssignments.test.ts
 *
 * Covers GET /api/learner/assignments after the schema fix that replaced the
 * incorrect Course_Module_Activity__c query with Course_Activity_Completion__c.
 *
 * Key behaviours:
 *  1. When SF is available and returns records, returns 200 with assignments + hasDueDate: false
 *  2. When SF is unavailable (no token), returns 503 with error + empty assignments
 *  3. When SF returns an HTTP error, returns 503 (not 200 with empty array)
 *  4. hasDueDate is always false — the live schema carries no due-date field
 *  5. The SOQL targets Course_Activity_Completion__c WHERE Contact__c (not Learner__c)
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Session shim ───────────────────────────────────────────────────────────────

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {
    learnerAuthenticated: true,
    learnerContactId:     'TEST_CONTACT_001',
    learnerTrail:         'Salesforce Admin',
  };
  return { mockSession };
});

vi.mock('express-session', () => ({
  default: () => (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req['session'] = new Proxy(mockSession, {
      get(target, prop) {
        if (prop === 'save')    return (cb?: () => void) => cb?.();
        if (prop === 'destroy') return (cb?: () => void) => cb?.();
        return target[prop as string];
      },
      set(target, prop, value) { target[prop as string] = value; return true; },
    });
    next();
  },
}));

vi.mock('connect-pg-simple', () => ({
  default: () => class FakePgStore {
    get(_sid: string, cb: (err: null, s: null) => void) { cb(null, null); }
    set(_sid: string, _s: unknown, cb: () => void) { cb(); }
    destroy(_sid: string, cb: () => void) { cb(); }
  },
}));

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:          (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:          (_req: unknown, _res: unknown, next: () => void) => next(),
  requireHomebaseAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:               () => true,
  isAdmin:               () => true,
  isSuperAdmin:          () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

import app from '../app.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSfQueryResponse(records: unknown[]): Response {
  const body = { totalSize: records.length, done: true, records };
  return {
    ok: true, status: 200, statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json:        async () => body,
    text:        async () => JSON.stringify(body),
    redirected:  false,
    type:        'basic' as Response['type'],
    url:         '',
    clone:       () => makeSfQueryResponse(records),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:        async () => new Blob(),
    formData:    async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

function makeSfErrorResponse(status: number): Response {
  const body = [{ errorCode: 'INVALID_FIELD', message: 'No such field' }];
  return {
    ok: false, status, statusText: 'Error',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json:        async () => body,
    text:        async () => JSON.stringify(body),
    redirected:  false,
    type:        'basic' as Response['type'],
    url:         '',
    clone:       () => makeSfErrorResponse(status),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:        async () => new Blob(),
    formData:    async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

// ── Setup / teardown ───────────────────────────────────────────────────────────

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  for (const k of Object.keys(mockSession)) delete mockSession[k];
  mockSession['learnerAuthenticated'] = true;
  mockSession['learnerContactId']     = 'TEST_CONTACT_001';
  mockSession['learnerTrail']         = 'Salesforce Admin';
  process.env = { ...ORIG_ENV };
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GET /api/learner/assignments — SF available', () => {
  test('returns 200 with activity completion records and hasDueDate: false', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    const fakeRecords = [
      {
        Id:                  'a001',
        Name:                'Completion 1',
        Status__c:           'Submitted',
        Submitted_At__c:     '2026-08-01T10:00:00Z',
        Graded_At__c:        null,
        Score__c:            85,
        Points_Earned__c:    25,
        'Activity__r.Name':  'Build a Custom Object',
        'Course_Module__r.Name': 'Module 3',
      },
    ];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSfQueryResponse(fakeRecords)));

    const res = await request(app).get('/api/learner/assignments');

    expect(res.status).toBe(200);
    expect(res.body.hasDueDate).toBe(false);
    expect(Array.isArray(res.body.assignments)).toBe(true);
    expect(res.body.assignments).toHaveLength(1);
    expect(res.body.assignments[0].Status__c).toBe('Submitted');
  });

  test('queries Course_Activity_Completion__c filtered by Contact__c', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    const fetchSpy = vi.fn().mockResolvedValue(makeSfQueryResponse([]));
    vi.stubGlobal('fetch', fetchSpy);

    await request(app).get('/api/learner/assignments');

    const [url] = fetchSpy.mock.calls[0] as [string];
    const decoded = decodeURIComponent(url);
    expect(decoded).toMatch(/Course_Activity_Completion__c/);
    expect(decoded).toMatch(/Contact__c = 'TEST_CONTACT_001'/);
    // Must NOT query the old wrong object/field
    expect(decoded).not.toMatch(/Course_Module_Activity__c/);
    expect(decoded).not.toMatch(/Learner__c/);
    expect(decoded).not.toMatch(/Due_Date__c/);
  });

  test('returns empty assignments array when SF returns no records', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSfQueryResponse([])));

    const res = await request(app).get('/api/learner/assignments');

    expect(res.status).toBe(200);
    expect(res.body.assignments).toEqual([]);
    expect(res.body.hasDueDate).toBe(false);
    expect(res.body.error).toBeUndefined();
  });
});

describe('GET /api/learner/assignments — SF unavailable', () => {
  test('returns 503 with error field when SF is not configured', async () => {
    delete process.env['SALESFORCE_INSTANCE_URL'];
    delete process.env['SF_SERVICE_TOKEN'];

    const res = await request(app).get('/api/learner/assignments');

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('assignments_unavailable');
    expect(res.body.assignments).toEqual([]);
  });

  test('returns 503 when SF returns an HTTP error', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSfErrorResponse(400)));

    const res = await request(app).get('/api/learner/assignments');

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('assignments_unavailable');
    expect(res.body.assignments).toEqual([]);
  });

  test('503 response is distinguishable from a 200 empty result', async () => {
    delete process.env['SALESFORCE_INSTANCE_URL'];

    const unavailable = await request(app).get('/api/learner/assignments');
    expect(unavailable.status).toBe(503);
    expect(unavailable.body.error).toBeDefined();

    // Now with SF configured and returning empty — should be 200, no error
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSfQueryResponse([])));

    const empty = await request(app).get('/api/learner/assignments');
    expect(empty.status).toBe(200);
    expect(empty.body.error).toBeUndefined();
    expect(empty.body.assignments).toEqual([]);
  });
});
