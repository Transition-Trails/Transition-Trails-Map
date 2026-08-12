/**
 * learnerQuestSubmit.test.ts
 *
 * Covers the critical fallback paths for POST /api/learner/quest/submit:
 *
 *  1. GEMINI_API_KEY absent   → 200 with hard-coded default feedback (not a 500)
 *  2. Gemini returns non-OK   → 200 with hard-coded default feedback (not a 500)
 *
 * The Salesforce helpers (sfCreate / sfQuery / sfPatch) all short-circuit to
 * their safe return values (null / [] / false) when SALESFORCE_INSTANCE_URL is
 * absent, so the tests only need to mock fetch for the Gemini cases.
 *
 * Mocking strategy mirrors learnerDailyQuest.test.ts:
 *  - express-session is replaced with an in-memory shim
 *  - session-file-store is stubbed to prevent FileStore constructor throws
 *  - requireAuth middleware is bypassed (learner auth injected via session shim)
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Session shim ───────────────────────────────────────────────────────────────

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {
    learnerAuthenticated: true,
    learnerContactId:     'TEST_CONTACT_002',
    learnerTrail:         'Salesforce Admin',
  };
  return { mockSession };
});

vi.mock('express-session', () => {
  return {
    default: () => (req: Record<string, unknown>, _res: unknown, next: () => void) => {
      req['session'] = new Proxy(mockSession, {
        set(target, prop, value) {
          target[prop as string] = value;
          return true;
        },
        get(target, prop) {
          if (prop === 'save')    return (cb?: () => void) => cb?.();
          if (prop === 'destroy') return (cb?: () => void) => cb?.();
          return target[prop as string];
        },
      });
      next();
    },
  };
});

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
  requireSuperAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireHomebaseAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:               () => true,
  isAdmin:               () => true,
  isSuperAdmin:          () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
  effectiveIdentityMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ── App import (after all mocks) ───────────────────────────────────────────────
import app from '../app.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

const DEFAULT_FEEDBACK = "Great work completing today's quest! Keep building those Salesforce skills.";

const VALID_BODY = {
  questTitle:       'Set Up a Custom Object',
  questDescription: 'Create a Salesforce custom object with three fields.',
  pointValue:       25,
  learnerResponse:  'I created the object and added Name, Status, and Owner fields.',
};

function makeGeminiOkFeedback(text: string): Response {
  const body = {
    candidates: [{ content: { parts: [{ text }] } }],
  };
  return {
    ok: true, status: 200, statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
    redirected: false, type: 'basic' as Response['type'], url: '',
    clone: () => makeGeminiOkFeedback(text),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

function makeGeminiErrorResponse(status: number): Response {
  return {
    ok: false, status, statusText: 'Error',
    headers: new Headers(),
    json: async () => ({ error: { message: 'upstream error' } }),
    text: async () => 'upstream error',
    redirected: false, type: 'basic' as Response['type'], url: '',
    clone: () => makeGeminiErrorResponse(status),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

// ── Setup / teardown ───────────────────────────────────────────────────────────

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  for (const key of Object.keys(mockSession)) delete mockSession[key];
  mockSession['learnerAuthenticated'] = true;
  mockSession['learnerContactId']     = 'TEST_CONTACT_002';
  mockSession['learnerTrail']         = 'Salesforce Admin';

  process.env = { ...ORIG_ENV };
  // Remove SF config so SF helpers short-circuit without calling fetch
  delete process.env['SALESFORCE_INSTANCE_URL'];
  delete process.env['SF_SERVICE_TOKEN'];
  process.env['GEMINI_API_KEY'] = 'test-gemini-key';
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('POST /api/learner/quest/submit — GEMINI_API_KEY absent', () => {
  test('returns 200 with default feedback when GEMINI_API_KEY is not set', async () => {
    delete process.env['GEMINI_API_KEY'];

    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send(VALID_BODY);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.feedback).toBe(DEFAULT_FEEDBACK);
    expect(res.body.pointsEarned).toBe(VALID_BODY.pointValue);
  });

  test('does not call Gemini when GEMINI_API_KEY is absent', async () => {
    delete process.env['GEMINI_API_KEY'];

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ records: [] }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);

    await request(app)
      .post('/api/learner/quest/submit')
      .send(VALID_BODY);

    const geminiCalls = (fetchSpy.mock.calls as [string][]).filter(([url]) =>
      url.includes('generativelanguage.googleapis.com')
    );
    expect(geminiCalls).toHaveLength(0);
  });
});

describe('POST /api/learner/quest/submit — Gemini returns a non-OK response', () => {
  test('returns 200 with default feedback when Gemini responds with 503', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve(makeGeminiErrorResponse(503));
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ records: [] }) } as unknown as Response);
    }));

    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send(VALID_BODY);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.feedback).toBe(DEFAULT_FEEDBACK);
  });

  test('returns 200 with default feedback when Gemini responds with 429 (rate-limited)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve(makeGeminiErrorResponse(429));
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ records: [] }) } as unknown as Response);
    }));

    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send(VALID_BODY);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.feedback).toBe(DEFAULT_FEEDBACK);
  });

  test('returns 200 with default feedback when fetch rejects with a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.reject(new Error('ECONNREFUSED'));
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ records: [] }) } as unknown as Response);
    }));

    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send(VALID_BODY);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.feedback).toBe(DEFAULT_FEEDBACK);
  });
});

describe('POST /api/learner/quest/submit — validation', () => {
  test('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send({ questTitle: 'Missing pointValue and learnerResponse' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when pointValue is not a number', async () => {
    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send({ ...VALID_BODY, pointValue: 'not-a-number' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/learner/quest/submit — Gemini success path', () => {
  test('returns 200 with Gemini-generated feedback when Gemini succeeds', async () => {
    const GEMINI_FEEDBACK = 'Excellent work! You created the custom object with all required fields. Keep pushing forward!';

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve(makeGeminiOkFeedback(GEMINI_FEEDBACK));
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ records: [] }) } as unknown as Response);
    }));

    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send(VALID_BODY);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.feedback).toBe(GEMINI_FEEDBACK);
    expect(res.body.pointsEarned).toBe(VALID_BODY.pointValue);
  });
});

describe('POST /api/learner/quest/submit — activityId wires Assignment__c in Salesforce', () => {
  const ACTIVITY_ID = 'a0B000000TestActivity001';
  const BODY_WITH_ACTIVITY = { ...VALID_BODY, activityId: ACTIVITY_ID };

  function makeSfCreateResponse(id: string): Response {
    const body = { id, success: true, errors: [] };
    return {
      ok: true, status: 201, statusText: 'Created',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => body,
      text: async () => JSON.stringify(body),
      redirected: false, type: 'basic' as Response['type'], url: '',
      clone: () => makeSfCreateResponse(id),
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
      body: null, bodyUsed: false,
    } as Response;
  }

  function makeSfEmptyQueryResponse(): Response {
    const body = { totalSize: 0, done: true, records: [] };
    return {
      ok: true, status: 200, statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => body,
      text: async () => JSON.stringify(body),
      redirected: false, type: 'basic' as Response['type'], url: '',
      clone: () => makeSfEmptyQueryResponse(),
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
      body: null, bodyUsed: false,
    } as Response;
  }

  test('calls SF create with Assignment__c when activityId is provided', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN'] = 'test-sf-token';

    const sfCreateRequests: { url: string; body: unknown }[] = [];

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if ((url as string).includes('generativelanguage.googleapis.com')) {
        return makeGeminiOkFeedback('Good job!');
      }
      if ((url as string).includes('/sobjects/Penny_Quest_Submission__c') && init?.method === 'POST') {
        sfCreateRequests.push({ url, body: JSON.parse(init.body as string) });
        return makeSfCreateResponse('a0C000000TestSubmission');
      }
      // Gamification queries and creates
      return makeSfEmptyQueryResponse();
    }));

    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send(BODY_WITH_ACTIVITY);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(sfCreateRequests).toHaveLength(1);
    const sfBody = sfCreateRequests[0]!.body as Record<string, unknown>;
    expect(sfBody['Assignment__c']).toBe(ACTIVITY_ID);
    expect(sfBody['Submission_Text__c']).toBe(VALID_BODY.learnerResponse);
    expect(sfBody['Name']).toBe(VALID_BODY.questTitle);
  });

  test('omits SF create when activityId is not provided (AI-generated quest)', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN'] = 'test-sf-token';

    const sfCreateRequests: string[] = [];

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if ((url as string).includes('generativelanguage.googleapis.com')) {
        return makeGeminiOkFeedback('Good job!');
      }
      if ((url as string).includes('/sobjects/Penny_Quest_Submission__c') && init?.method === 'POST') {
        sfCreateRequests.push(url as string);
        return makeSfCreateResponse('a0C000000TestSubmission');
      }
      return makeSfEmptyQueryResponse();
    }));

    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send(VALID_BODY); // no activityId

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(sfCreateRequests).toHaveLength(0);
  });

  test('returns 502 when activityId is provided but SF create fails', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN'] = 'test-sf-token';

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if ((url as string).includes('/sobjects/Penny_Quest_Submission__c') && init?.method === 'POST') {
        return {
          ok: false, status: 400, statusText: 'Bad Request',
          headers: new Headers(),
          json: async () => ([{ message: 'Required fields missing', errorCode: 'REQUIRED_FIELD_MISSING' }]),
          text: async () => 'Required fields missing',
          redirected: false, type: 'basic' as Response['type'], url: '',
          clone: function() { return this; },
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
          body: null, bodyUsed: false,
        } as Response;
      }
      if ((url as string).includes('generativelanguage.googleapis.com')) {
        return makeGeminiOkFeedback('Good job!');
      }
      return makeSfEmptyQueryResponse();
    }));

    const res = await request(app)
      .post('/api/learner/quest/submit')
      .send(BODY_WITH_ACTIVITY);

    expect(res.status).toBe(502);
    expect(res.body.error).toBeDefined();
  });
});
