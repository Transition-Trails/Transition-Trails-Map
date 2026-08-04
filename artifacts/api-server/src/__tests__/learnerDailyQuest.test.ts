/**
 * learnerDailyQuest.test.ts
 *
 * Covers the three critical paths for GET /api/learner/daily-quest:
 *
 *  1. GEMINI_API_KEY absent        → 503 with a descriptive error (not a crash,
 *                                     and NOT a reference to ANTHROPIC_API_KEY)
 *  2. Gemini returns a non-OK HTTP  → 502, not an unhandled crash
 *  3. Session cache hit             → 200 with cached:true, Gemini is never called
 *
 * All three rely on the same mocking strategy:
 *  - express-session is replaced with a shim that injects a mutable in-memory
 *    session object, so we never need a real file store or a cookie round-trip
 *  - session-file-store is stubbed to keep app.ts from throwing at startup
 *  - global fetch is mocked via vi.stubGlobal / vi.unstubAllGlobals
 *  - the staff requireAuth middleware is bypassed (learner auth is handled
 *    separately via req.session.learnerAuthenticated injected by the shim)
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Session shim ───────────────────────────────────────────────────────────────
//
// The mutable object below is shared across all tests.  Each beforeEach resets
// it so tests are isolated.  The express-session mock reads from it and writes
// back to it, which is enough to exercise the session-cache short-circuit path.

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {
    learnerAuthenticated: true,
    learnerContactId:     'TEST_CONTACT_001',
    learnerTrail:         'Salesforce Admin',
  };
  return { mockSession };
});

// Replace express-session with a lightweight shim that injects mockSession
// as req.session.  We also need to expose a save() method because some paths
// call req.session.save() (express-session always provides one).
vi.mock('express-session', () => {
  return {
    default: () => (req: Record<string, unknown>, _res: unknown, next: () => void) => {
      // Give req.session a proxy so that assignments flow back to mockSession
      req['session'] = new Proxy(mockSession, {
        set(target, prop, value) {
          target[prop as string] = value;
          return true;
        },
        get(target, prop) {
          if (prop === 'save') return (cb?: () => void) => cb?.();
          if (prop === 'destroy') return (cb?: () => void) => cb?.();
          return target[prop as string];
        },
      });
      next();
    },
  };
});

// stub session-file-store — app.ts calls sessionFileStore(session) at module
// load time; without this the FileStore constructor throws in the test env
vi.mock('session-file-store', () => {
  return {
    default: () => class FakeFileStore {
      get(_sid: string, cb: (err: null, session: null) => void) { cb(null, null); }
      set(_sid: string, _session: unknown, cb: () => void) { cb(); }
      destroy(_sid: string, cb: () => void) { cb(); }
    },
  };
});

// Bypass the staff/admin requireAuth middleware entirely
vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:  (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:  (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:        () => true,
  isAdmin:        () => true,
  isSuperAdmin:   () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

// ── App import (after all mocks) ───────────────────────────────────────────────
import app from '../app.js';

// ── Gemini response factory ────────────────────────────────────────────────────

const VALID_QUEST = {
  title:              'Create a Custom Report',
  description:        'Build a report tracking open cases by priority.',
  difficulty:         'Beginner' as const,
  pointValue:         10,
  category:           'Reporting',
  acceptanceCriteria: 'Report shows case counts grouped by Priority field.',
};

function makeGeminiOkResponse(quest: typeof VALID_QUEST): Response {
  const body = {
    candidates: [{
      content: {
        parts: [{ text: JSON.stringify(quest) }],
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
    clone:      () => makeGeminiOkResponse(quest),
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

// Empty SF query response (sfQuery uses fetch too)
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
  // Reset session so each test starts fresh
  for (const key of Object.keys(mockSession)) {
    delete mockSession[key];
  }
  mockSession['learnerAuthenticated'] = true;
  mockSession['learnerContactId']     = 'TEST_CONTACT_001';
  mockSession['learnerTrail']         = 'Salesforce Admin';

  // Restore env to original before each test
  process.env = { ...ORIG_ENV };
  process.env['GEMINI_API_KEY'] = 'test-gemini-key';
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GET /api/learner/daily-quest — GEMINI_API_KEY absent', () => {
  test('returns 503 when GEMINI_API_KEY is not set', async () => {
    delete process.env['GEMINI_API_KEY'];

    const res = await request(app).get('/api/learner/daily-quest');

    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
    // Must reference GEMINI_API_KEY — not ANTHROPIC_API_KEY (which was the old provider)
    expect(res.body.error as string).toMatch(/GEMINI_API_KEY/);
    expect(res.body.error as string).not.toMatch(/ANTHROPIC/i);
  });

  test('503 response does not expose a stack trace or internal paths', async () => {
    delete process.env['GEMINI_API_KEY'];

    const res = await request(app).get('/api/learner/daily-quest');

    expect(res.status).toBe(503);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/at\s+\w+\s+\(/);   // no stack frames
    expect(raw).not.toMatch(/node_modules/);
  });
});

describe('GET /api/learner/daily-quest — Gemini returns a non-OK response', () => {
  test('returns 502 (not a crash) when Gemini responds with 503', async () => {
    // SF query fetch → empty; Gemini fetch → error
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('generativelanguage.googleapis.com')) {
        return Promise.resolve(makeGeminiErrorResponse(503));
      }
      return Promise.resolve(makeSfEmptyResponse());
    }));

    const res = await request(app).get('/api/learner/daily-quest');

    expect(res.status).toBe(502);
    expect(res.body.error).toBeDefined();
  });

  test('returns 502 (not a crash) when Gemini responds with 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('generativelanguage.googleapis.com')) {
        return Promise.resolve(makeGeminiErrorResponse(429));
      }
      return Promise.resolve(makeSfEmptyResponse());
    }));

    const res = await request(app).get('/api/learner/daily-quest');

    expect(res.status).toBe(502);
  });

  test('returns 502 (not a crash) when fetch rejects with a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('generativelanguage.googleapis.com')) {
        return Promise.reject(new Error('ECONNREFUSED'));
      }
      return Promise.resolve(makeSfEmptyResponse());
    }));

    const res = await request(app).get('/api/learner/daily-quest');

    expect(res.status).toBe(502);
  });
});

describe('GET /api/learner/daily-quest — session cache short-circuits Gemini', () => {
  test('returns cached:true without calling Gemini when cache is warm for today', async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Pre-populate the session cache
    mockSession['dailyQuestDate'] = today;
    mockSession['dailyQuest']     = VALID_QUEST;

    const fetchSpy = vi.fn().mockResolvedValue(makeSfEmptyResponse());
    vi.stubGlobal('fetch', fetchSpy);

    const res = await request(app).get('/api/learner/daily-quest');

    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
    expect(res.body.title).toBe(VALID_QUEST.title);

    // Gemini must NOT have been called
    const geminiCalls = (fetchSpy.mock.calls as [string][]).filter(([url]) =>
      url.includes('generativelanguage.googleapis.com')
    );
    expect(geminiCalls).toHaveLength(0);
  });

  test('calls Gemini and caches result when no cache exists for today', async () => {
    // Ensure no stale cache
    delete mockSession['dailyQuestDate'];
    delete mockSession['dailyQuest'];

    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('generativelanguage.googleapis.com')) {
        return Promise.resolve(makeGeminiOkResponse(VALID_QUEST));
      }
      return Promise.resolve(makeSfEmptyResponse());
    });
    vi.stubGlobal('fetch', fetchSpy);

    const res = await request(app).get('/api/learner/daily-quest');

    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(false);
    expect(res.body.title).toBe(VALID_QUEST.title);

    const geminiCalls = (fetchSpy.mock.calls as [string][]).filter(([url]) =>
      url.includes('generativelanguage.googleapis.com')
    );
    expect(geminiCalls.length).toBeGreaterThan(0);
  });

  test('calls Gemini again when cached date is yesterday (stale cache)', async () => {
    // Set cache date to yesterday
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    mockSession['dailyQuestDate'] = yesterday;
    mockSession['dailyQuest']     = VALID_QUEST;

    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('generativelanguage.googleapis.com')) {
        return Promise.resolve(makeGeminiOkResponse(VALID_QUEST));
      }
      return Promise.resolve(makeSfEmptyResponse());
    });
    vi.stubGlobal('fetch', fetchSpy);

    const res = await request(app).get('/api/learner/daily-quest');

    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(false);

    const geminiCalls = (fetchSpy.mock.calls as [string][]).filter(([url]) =>
      url.includes('generativelanguage.googleapis.com')
    );
    expect(geminiCalls.length).toBeGreaterThan(0);
  });
});
