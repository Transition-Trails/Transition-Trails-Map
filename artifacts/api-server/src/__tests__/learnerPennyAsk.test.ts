/**
 * learnerPennyAsk.test.ts
 *
 * Covers the three critical failure paths for POST /api/learner/penny/ask:
 *
 *  1. GEMINI_API_KEY absent          → 503 (not a crash)
 *  2. Gemini returns a non-OK HTTP   → 502 (not a crash)
 *  3. query field missing or empty   → 400 with descriptive error
 *
 * Mocking strategy mirrors learnerDailyQuest.test.ts:
 *  - express-session replaced with an in-memory shim
 *  - session-file-store stubbed to prevent FileStore constructor from throwing
 *  - global fetch mocked via vi.stubGlobal / vi.unstubAllGlobals
 *  - staff requireAuth middleware bypassed; learner auth injected via shim
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Session shim ───────────────────────────────────────────────────────────────

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {
    learnerAuthenticated: true,
    learnerContactId:     'TEST_CONTACT_001',
    learnerTrail:         'Salesforce Admin',
    learnerName:          'Test Learner',
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
  requireStaff:  (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:  (_req: unknown, _res: unknown, next: () => void) => next(),
  requireHomebaseAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:        () => true,
  isAdmin:        () => true,
  isSuperAdmin:   () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

// ── App import (after all mocks) ───────────────────────────────────────────────
import app from '../app.js';

// ── Response factories ─────────────────────────────────────────────────────────

function makeGeminiOkResponse(replyText: string): Response {
  const body = {
    candidates: [{
      content: {
        parts: [{ text: replyText }],
      },
    }],
  };
  return {
    ok:         true,
    status:     200,
    statusText: 'OK',
    headers:    new Headers({ 'Content-Type': 'application/json' }),
    json:       async () => body,
    text:       async () => JSON.stringify(body),
    redirected: false,
    type:       'basic' as Response['type'],
    url:        '',
    clone:      () => makeGeminiOkResponse(replyText),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:       async () => new Blob(),
    formData:   async () => new FormData(),
    body:       null,
    bodyUsed:   false,
  } as Response;
}

function makeGeminiErrorResponse(status: number): Response {
  return {
    ok:         false,
    status,
    statusText: 'Service Unavailable',
    headers:    new Headers(),
    json:       async () => ({ error: { message: 'upstream error' } }),
    text:       async () => 'upstream error',
    redirected: false,
    type:       'basic' as Response['type'],
    url:        '',
    clone:      () => makeGeminiErrorResponse(status),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:       async () => new Blob(),
    formData:   async () => new FormData(),
    body:       null,
    bodyUsed:   false,
  } as Response;
}

function makeSfEmptyResponse(): Response {
  return {
    ok:         true,
    status:     200,
    statusText: 'OK',
    headers:    new Headers({ 'Content-Type': 'application/json' }),
    json:       async () => ({ totalSize: 0, done: true, records: [] }),
    text:       async () => '{"totalSize":0,"done":true,"records":[]}',
    redirected: false,
    type:       'basic' as Response['type'],
    url:        '',
    clone:      () => makeSfEmptyResponse(),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:       async () => new Blob(),
    formData:   async () => new FormData(),
    body:       null,
    bodyUsed:   false,
  } as Response;
}

// ── Setup / teardown ───────────────────────────────────────────────────────────

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  for (const key of Object.keys(mockSession)) {
    delete mockSession[key];
  }
  mockSession['learnerAuthenticated'] = true;
  mockSession['learnerContactId']     = 'TEST_CONTACT_001';
  mockSession['learnerTrail']         = 'Salesforce Admin';
  mockSession['learnerName']          = 'Test Learner';

  process.env = { ...ORIG_ENV };
  process.env['GEMINI_API_KEY'] = 'test-gemini-key';
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('POST /api/learner/penny/ask — GEMINI_API_KEY absent', () => {
  test('returns 503 when GEMINI_API_KEY is not set', async () => {
    delete process.env['GEMINI_API_KEY'];

    const res = await request(app)
      .post('/api/learner/penny/ask')
      .send({ query: 'What is Salesforce?' });

    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
  });

  test('503 response does not expose a stack trace or internal paths', async () => {
    delete process.env['GEMINI_API_KEY'];

    const res = await request(app)
      .post('/api/learner/penny/ask')
      .send({ query: 'What is Salesforce?' });

    expect(res.status).toBe(503);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/at\s+\w+\s+\(/);  // no stack frames
    expect(raw).not.toMatch(/node_modules/);
  });
});

describe('POST /api/learner/penny/ask — Gemini returns a non-OK response', () => {
  test('returns 502 (not a crash) when Gemini responds with 503', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve(makeGeminiErrorResponse(503));
      }
      return Promise.resolve(makeSfEmptyResponse());
    }));

    const res = await request(app)
      .post('/api/learner/penny/ask')
      .send({ query: 'What is Salesforce?' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBeDefined();
  });

  test('returns 502 (not a crash) when Gemini responds with 429 (rate limited)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve(makeGeminiErrorResponse(429));
      }
      return Promise.resolve(makeSfEmptyResponse());
    }));

    const res = await request(app)
      .post('/api/learner/penny/ask')
      .send({ query: 'Help me study for my exam.' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBeDefined();
  });

  test('returns 502 (not a crash) when fetch rejects with a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.reject(new Error('ECONNREFUSED'));
      }
      return Promise.resolve(makeSfEmptyResponse());
    }));

    const res = await request(app)
      .post('/api/learner/penny/ask')
      .send({ query: 'Tell me about CRM.' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBeDefined();
  });

  test('returns 502 when Gemini returns an empty candidates array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve({
          ok:     true,
          status: 200,
          json:   async () => ({ candidates: [] }),
        } as Response);
      }
      return Promise.resolve(makeSfEmptyResponse());
    }));

    const res = await request(app)
      .post('/api/learner/penny/ask')
      .send({ query: 'Tell me about CRM.' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBeDefined();
  });
});

describe('POST /api/learner/penny/ask — query validation', () => {
  test('returns 400 when query field is missing', async () => {
    const res = await request(app)
      .post('/api/learner/penny/ask')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when query is an empty string', async () => {
    const res = await request(app)
      .post('/api/learner/penny/ask')
      .send({ query: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when query is whitespace only', async () => {
    const res = await request(app)
      .post('/api/learner/penny/ask')
      .send({ query: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when query is not a string (number)', async () => {
    const res = await request(app)
      .post('/api/learner/penny/ask')
      .send({ query: 42 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('POST /api/learner/penny/ask — happy path', () => {
  test('returns 200 with reply text on a valid request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve(makeGeminiOkResponse('Great question! Salesforce is a CRM platform.'));
      }
      return Promise.resolve(makeSfEmptyResponse());
    }));

    const res = await request(app)
      .post('/api/learner/penny/ask')
      .send({ query: 'What is Salesforce?' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('Great question! Salesforce is a CRM platform.');
    expect(typeof res.body.durationMs).toBe('number');
  });

  test('filters out malformed history items and still succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve(makeGeminiOkResponse('Here is some context.'));
      }
      return Promise.resolve(makeSfEmptyResponse());
    }));

    const history = [
      { role: 'user',  text: 'Hello' },          // valid
      { role: 'model', text: 'Hi there!' },       // valid
      { role: 'admin', text: 'Injected' },        // invalid role — should be stripped
      null,                                        // invalid — should be stripped
      { role: 'user' },                            // missing text — should be stripped
    ];

    const res = await request(app)
      .post('/api/learner/penny/ask')
      .send({ query: 'Tell me more.', history });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeDefined();
  });
});
