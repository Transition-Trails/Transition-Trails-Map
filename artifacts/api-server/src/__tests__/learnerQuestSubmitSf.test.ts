/**
 * learnerQuestSubmitSf.test.ts
 *
 * Covers the Salesforce field-mapping corrections in POST /api/learner/quest/submit:
 *
 *  1. Without activityId — SF submission write is skipped entirely (no Assignment__c problem)
 *  2. With activityId + SF available — correct fields sent (Submission_Text__c, Assignment__c, no Learner__c)
 *  3. With activityId + SF unavailable — 502 returned, not { success: true }
 *  4. With activityId + SF HTTP error — 502 returned
 *  5. Gamification failure does NOT block a successful submission
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Session shim ───────────────────────────────────────────────────────────────

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {
    learnerAuthenticated: true,
    learnerContactId:     'TEST_CONTACT_003',
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

vi.mock('session-file-store', () => ({
  default: () => class FakeFileStore {
    get(_sid: string, cb: (err: null, session: null) => void) { cb(null, null); }
    set(_sid: string, _session: unknown, cb: () => void) { cb(); }
    destroy(_sid: string, cb: () => void) { cb(); }
  },
}));

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:          (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:          (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:               () => true,
  isAdmin:               () => true,
  isSuperAdmin:          () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

import app from '../app.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSfCreateOk(id = 'a001xxx'): Response {
  const body = { id, success: true, errors: [] };
  return {
    ok: true, status: 201, statusText: 'Created',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json:        async () => body,
    text:        async () => JSON.stringify(body),
    redirected:  false, type: 'basic' as Response['type'], url: '',
    clone:       () => makeSfCreateOk(id),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:        async () => new Blob(),
    formData:    async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

function makeSfQueryEmpty(): Response {
  const body = { totalSize: 0, done: true, records: [] };
  return {
    ok: true, status: 200, statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json:        async () => body,
    text:        async () => JSON.stringify(body),
    redirected:  false, type: 'basic' as Response['type'], url: '',
    clone:       () => makeSfQueryEmpty(),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:        async () => new Blob(),
    formData:    async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

function makeSfErrorResponse(status: number): Response {
  const body = [{ errorCode: 'FIELD_INTEGRITY_EXCEPTION', message: 'Required field missing' }];
  return {
    ok: false, status, statusText: 'Error',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json:        async () => body,
    text:        async () => JSON.stringify(body),
    redirected:  false, type: 'basic' as Response['type'], url: '',
    clone:       () => makeSfErrorResponse(status),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:        async () => new Blob(),
    formData:    async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

function makeGeminiOk(text: string): Response {
  const body = { candidates: [{ content: { parts: [{ text }] } }] };
  return {
    ok: true, status: 200, statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json:        async () => body,
    text:        async () => JSON.stringify(body),
    redirected:  false, type: 'basic' as Response['type'], url: '',
    clone:       () => makeGeminiOk(text),
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
  mockSession['learnerContactId']     = 'TEST_CONTACT_003';
  mockSession['learnerTrail']         = 'Salesforce Admin';
  process.env = { ...ORIG_ENV };
  delete process.env['SALESFORCE_INSTANCE_URL'];
  delete process.env['SF_SERVICE_TOKEN'];
  process.env['GEMINI_API_KEY'] = 'test-gemini-key';
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const BASE_BODY = {
  questTitle:      'Set Up a Custom Object',
  questDescription: 'Create a custom object with three fields.',
  pointValue:       25,
  learnerResponse:  'I created the object and added the required fields.',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('POST /api/learner/quest/submit — no activityId (AI-generated quest)', () => {
  test('returns 200 without calling SF create for the submission', async () => {
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) return Promise.resolve(makeGeminiOk('Good work!'));
      // SF should not be called for the submission
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchSpy);

    // No activityId — SF submission write must be skipped entirely
    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send(BASE_BODY);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const sfCalls = (fetchSpy.mock.calls as [string][]).filter(
      ([url]) => url.includes('salesforce') || url.includes('sobjects/Penny_Quest_Submission')
    );
    expect(sfCalls).toHaveLength(0);
  });
});

describe('POST /api/learner/quest/submit — activityId provided', () => {
  test('returns 200 and sends correct SF fields when SF write succeeds', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) return Promise.resolve(makeGeminiOk('Great job!'));
      if (url.includes('Penny_Quest_Submission__c'))         return Promise.resolve(makeSfCreateOk());
      if (url.includes('Penny_Gamification__c') && url.includes('query')) return Promise.resolve(makeSfQueryEmpty());
      if (url.includes('Penny_Gamification__c'))             return Promise.resolve(makeSfCreateOk('gamif001'));
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchSpy);

    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send({ ...BASE_BODY, activityId: 'ACT_001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pointsEarned).toBe(25);
  });

  test('sends Assignment__c and Submission_Text__c — not Learner__c — to Salesforce', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) return Promise.resolve(makeGeminiOk('Nice!'));
      if (url.includes('Penny_Quest_Submission__c'))         return Promise.resolve(makeSfCreateOk());
      if (url.includes('query'))                             return Promise.resolve(makeSfQueryEmpty());
      return Promise.resolve(makeSfCreateOk('gamif002'));
    });
    vi.stubGlobal('fetch', fetchSpy);

    await request(app)
      .post('/api/learner/quest/submit')
      .send({ ...BASE_BODY, activityId: 'ACT_002' });

    // Find the Penny_Quest_Submission__c POST call
    const submissionCall = (fetchSpy.mock.calls as [string, RequestInit][]).find(
      ([url]) => url.includes('Penny_Quest_Submission__c')
    );
    expect(submissionCall).toBeDefined();

    const body = JSON.parse(submissionCall![1].body as string) as Record<string, unknown>;
    // Correct field: Assignment__c (lookup to Course_Module_Activity__c)
    expect(body['Assignment__c']).toBe('ACT_002');
    // Learner response is persisted, not discarded
    expect(body['Submission_Text__c']).toBe(BASE_BODY.learnerResponse);
    // The wrong field must NOT be present
    expect(body['Learner__c']).toBeUndefined();
  });

  test('returns 502 (not success) when SF submission write fails', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) return Promise.resolve(makeGeminiOk('Nice!'));
      if (url.includes('Penny_Quest_Submission__c'))         return Promise.resolve(makeSfErrorResponse(400));
      return Promise.resolve(makeSfQueryEmpty());
    }));

    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send({ ...BASE_BODY, activityId: 'ACT_003' });

    expect(res.status).toBe(502);
    expect(res.body.success).toBeUndefined();
    expect(res.body.error).toMatch(/Salesforce/i);
  });

  test('returns 502 when SF is not configured and activityId is provided', async () => {
    // No SALESFORCE_INSTANCE_URL — sfCreate throws before fetch is called
    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send({ ...BASE_BODY, activityId: 'ACT_004' });

    expect(res.status).toBe(502);
    expect(res.body.success).toBeUndefined();
  });
});

describe('POST /api/learner/quest/submit — gamification failure does not block submission', () => {
  test('returns 200 when gamification write fails but submission (no activityId) succeeds', async () => {
    // No SF configured → gamification will throw → caught silently
    // No activityId → submission write skipped
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) return Promise.resolve(makeGeminiOk('Well done!'));
      throw new Error('SF should not be called without credentials');
    });
    vi.stubGlobal('fetch', fetchSpy);

    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send(BASE_BODY);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
