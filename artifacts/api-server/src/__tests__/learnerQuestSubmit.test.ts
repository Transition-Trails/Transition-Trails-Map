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

vi.mock('session-file-store', () => {
  return {
    default: () => class FakeFileStore {
      get(_sid: string, cb: (err: null, session: null) => void) { cb(null, null); }
      set(_sid: string, _session: unknown, cb: () => void) { cb(); }
      destroy(_sid: string, cb: () => void) { cb(); }
    },
  };
});

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:          (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:          (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:               () => true,
  isAdmin:               () => true,
  isSuperAdmin:          () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
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
