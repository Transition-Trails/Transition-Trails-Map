/**
 * staffPennyAsk.test.ts
 *
 * Covers the Claude provider path in POST /api/penny/ask for internal/staff sessions.
 *
 *  1. ANTHROPIC_API_KEY absent          → 503 (not a crash)
 *  2. Claude returns non-2xx            → 503 (no Gemini fallback)
 *  3. Claude request times out          → 503 (no Gemini fallback)
 *  4. Gemini is never called for staff  → confirmed via fetch spy
 *  5. Claude success                    → 200 with reply + correct model label
 *
 * Critically, GEMINI_API_KEY is NOT set in beforeEach — if any test passes
 * only because it fell back to Gemini, it will fail here, making the
 * "no silent Gemini fallback" requirement mechanically enforced.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Session shim ───────────────────────────────────────────────────────────────

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {};
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
  requireStaff:               (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:               (_req: unknown, _res: unknown, next: () => void) => next(),
  requireSuperAdmin:          (_req: unknown, _res: unknown, next: () => void) => next(),
  requireHomebaseAuth:        (_req: unknown, _res: unknown, next: () => void) => next(),
  effectiveIdentityMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:                    () => true,
  isAdmin:                    () => true,
  isSuperAdmin:               () => false,
  getStaffGroups:             () => [],
  getAdminGroups:             () => [],
  getTeamGroup:               () => null,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

import app from '../app.js';

// ── Response factories ─────────────────────────────────────────────────────────

function makeClaudeOkResponse(replyText: string): Response {
  const body = { content: [{ type: 'text', text: replyText }] };
  return {
    ok: true, status: 200, statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
    redirected: false, type: 'basic' as Response['type'], url: '',
    clone: () => makeClaudeOkResponse(replyText),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

function makeClaudeErrorResponse(status: number): Response {
  return {
    ok: false, status, statusText: 'Error',
    headers: new Headers(),
    json: async () => ({ error: { type: 'api_error', message: 'upstream error' } }),
    text: async () => 'upstream error',
    redirected: false, type: 'basic' as Response['type'], url: '',
    clone: () => makeClaudeErrorResponse(status),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

function makeEmptySfResponse(): Response {
  const body = { totalSize: 0, done: true, records: [] };
  return {
    ok: true, status: 200, statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
    redirected: false, type: 'basic' as Response['type'], url: '',
    clone: () => makeEmptySfResponse(),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

// ── Setup / teardown ───────────────────────────────────────────────────────────

const ORIG_ENV = { ...process.env };

// Each test gets a unique synthetic timestamp that is >60s ahead of the
// previous one. This ensures the in-process rate limiter (10 req / 60s per IP)
// sees a fresh bucket for every test — without this the 14-test suite would
// hit the limit around test #11 and return 429s.
let testTimeMs = Date.now();

beforeEach(() => {
  testTimeMs += 120_000; // advance 2 minutes per test — well past the 60s rate window
  vi.spyOn(Date, 'now').mockReturnValue(testTimeMs);

  for (const k of Object.keys(mockSession)) delete mockSession[k];
  // Staff session via Google SSO
  mockSession['sfEmail']  = 'staff@transitiontrails.org';
  mockSession['sfUserId'] = 'SF_STAFF_001';

  process.env = { ...ORIG_ENV };
  process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  // GEMINI_API_KEY is deliberately absent — staff requests must reach Claude
  // without it. Any test that passes only because of a Gemini fallback will
  // fail here, mechanically enforcing the "no silent fallback" requirement.
  delete process.env['GEMINI_API_KEY'];
  delete process.env['SALESFORCE_INSTANCE_URL'];
  delete process.env['SF_SERVICE_TOKEN'];
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Shared request helper ──────────────────────────────────────────────────────

function ask(overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/penny/ask')
    .send({ query: 'What programs are active right now?', ...overrides });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('POST /api/penny/ask — staff: ANTHROPIC_API_KEY absent', () => {
  test('returns 503 when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env['ANTHROPIC_API_KEY'];

    const res = await ask();

    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
    expect(typeof res.body.error).toBe('string');
  });

  test('503 error message is user-legible and does not expose internals', async () => {
    delete process.env['ANTHROPIC_API_KEY'];

    const res = await ask();

    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/at\s+\w+\s+\(/);   // no stack frames
    expect(raw).not.toMatch(/node_modules/);
    expect(raw).not.toMatch(/sk-ant-/);          // no key leak
    // message should be actionable for an end user
    expect(res.body.error).toMatch(/not available|not configured/i);
  });
});

describe('POST /api/penny/ask — staff: Claude returns non-2xx', () => {
  test('returns 503 when Claude responds with HTTP 503', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('anthropic.com')) return makeClaudeErrorResponse(503);
      return makeEmptySfResponse();
    }));

    const res = await ask();

    expect(res.status).toBe(503);
    expect(res.body.retryable).toBe(true);
  });

  test('returns 503 when Claude responds with HTTP 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('anthropic.com')) return makeClaudeErrorResponse(429);
      return makeEmptySfResponse();
    }));

    const res = await ask();

    expect(res.status).toBe(503);
  });

  test('returns 503 when Claude responds with HTTP 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('anthropic.com')) return makeClaudeErrorResponse(500);
      return makeEmptySfResponse();
    }));

    const res = await ask();

    expect(res.status).toBe(503);
  });

  test('Gemini is never called when Claude fails for a staff request', async () => {
    const spy = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('anthropic.com')) return makeClaudeErrorResponse(503);
      return makeEmptySfResponse();
    });
    vi.stubGlobal('fetch', spy);

    await ask();

    const geminiCalls = (spy.mock.calls as Array<[string, ...unknown[]]>)
      .filter(([url]) => String(url).includes('generativelanguage.googleapis.com'));
    expect(geminiCalls).toHaveLength(0);
  });
});

describe('POST /api/penny/ask — staff: Claude request times out', () => {
  test('returns 503 on AbortSignal TimeoutError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('anthropic.com')) {
        const err = new Error('The operation was aborted due to timeout');
        err.name = 'TimeoutError';
        throw err;
      }
      return makeEmptySfResponse();
    }));

    const res = await ask();

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/timeout|too long/i);
    expect(res.body.retryable).toBe(true);
  });

  test('Gemini is never called when Claude times out for a staff request', async () => {
    const spy = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('anthropic.com')) {
        const err = new Error('The operation was aborted due to timeout');
        err.name = 'TimeoutError';
        throw err;
      }
      return makeEmptySfResponse();
    });
    vi.stubGlobal('fetch', spy);

    await ask();

    const geminiCalls = (spy.mock.calls as Array<[string, ...unknown[]]>)
      .filter(([url]) => String(url).includes('generativelanguage.googleapis.com'));
    expect(geminiCalls).toHaveLength(0);
  });

  test('returns 503 on generic network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('anthropic.com')) throw new Error('ECONNREFUSED');
      return makeEmptySfResponse();
    }));

    const res = await ask();

    expect(res.status).toBe(503);
    expect(res.body.retryable).toBe(true);
  });
});

describe('POST /api/penny/ask — staff: Claude success', () => {
  test('returns 200 with reply text from Claude', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('anthropic.com')) return makeClaudeOkResponse('Three programs are active: Alpha, Beta, Gamma.');
      return makeEmptySfResponse();
    }));

    const res = await ask();

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('Three programs are active: Alpha, Beta, Gamma.');
  });

  test('response model field identifies Claude (not Gemini)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('anthropic.com')) return makeClaudeOkResponse('All good.');
      return makeEmptySfResponse();
    }));

    const res = await ask();

    expect(res.status).toBe(200);
    expect(res.body.model).toMatch(/claude/i);
    expect(res.body.model).not.toMatch(/gemini/i);
  });

  test('contextMeta.audience is "internal" for staff session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('anthropic.com')) return makeClaudeOkResponse('Here you go.');
      return makeEmptySfResponse();
    }));

    const res = await ask();

    expect(res.status).toBe(200);
    expect(res.body.contextMeta.audience).toBe('internal');
  });

  test('response does not leak ANTHROPIC_API_KEY or internal paths', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('anthropic.com')) return makeClaudeOkResponse('All clear.');
      return makeEmptySfResponse();
    }));

    const res = await ask();

    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('sk-ant-');
    expect(raw).not.toMatch(/node_modules/);
  });

  test('Gemini is never called on a successful staff request', async () => {
    const spy = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('anthropic.com')) return makeClaudeOkResponse('Done.');
      return makeEmptySfResponse();
    });
    vi.stubGlobal('fetch', spy);

    const res = await ask();
    expect(res.status).toBe(200);

    const geminiCalls = (spy.mock.calls as Array<[string, ...unknown[]]>)
      .filter(([url]) => String(url).includes('generativelanguage.googleapis.com'));
    expect(geminiCalls).toHaveLength(0);
  });
});
