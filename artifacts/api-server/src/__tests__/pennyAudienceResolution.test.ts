/**
 * pennyAudienceResolution.test.ts
 *
 * Covers the audience identity layer in POST /api/penny/ask:
 *
 *  1. Session with learnerAuthenticated:true → 'learner' identity
 *     — system prompt contains the coaching posture, NOT the internal ops identity
 *  2. Session with sfEmail (staff Google SSO) → 'internal' identity
 *     — system prompt contains the ops/Trail OS framing
 *  3. Request body carrying contactId cannot upgrade its own audience
 *     — a non-learner session that sends contactId still gets 'internal' identity
 *  4. Unresolvable session (no learnerAuthenticated, no sfEmail, no sfUserId)
 *     → most-restricted 'learner' identity
 *  5. Learner identity instructs coaching behaviour
 *     — system prompt explicitly mentions asking a question rather than
 *       handing over the answer
 *  6. Internal identity does NOT carry the coaching posture clause
 *
 * All cases verify the system prompt content rather than the Gemini response
 * text — Gemini is mocked so the test is deterministic and fast.
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
import { layer1Identity } from '../lib/pennyPromptAssembler.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Make a minimal valid Gemini success response.
 * Returns the captured system prompt as the reply text so tests can inspect it.
 */
function captureSystemPrompt(): { fetchSpy: ReturnType<typeof vi.fn>; getPrompt: () => string } {
  let capturedPrompt = '';

  const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.includes('generativelanguage.googleapis.com')) {
      // Extract the system prompt from the request body
      try {
        const body = JSON.parse(init?.body as string ?? '{}') as {
          system_instruction?: { parts?: Array<{ text?: string }> };
        };
        capturedPrompt = body.system_instruction?.parts?.[0]?.text ?? '';
      } catch { /* ignore parse failures */ }

      const replyText = `[CAPTURED PROMPT: ${capturedPrompt.slice(0, 80)}]`;
      const response = {
        ok: true, status: 200, statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          candidates: [{ content: { parts: [{ text: replyText }] } }],
        }),
        text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: replyText }] } }] }),
        redirected: false, type: 'basic' as Response['type'], url: '',
        clone:       () => response,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob:        async () => new Blob(),
        formData:    async () => new FormData(),
        body: null, bodyUsed: false,
      };
      return response;
    }
    // SF calls — return minimal valid responses
    const emptyQuery = { totalSize: 0, done: true, records: [] };
    const response = {
      ok: true, status: 200, statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => emptyQuery,
      text: async () => JSON.stringify(emptyQuery),
      redirected: false, type: 'basic' as Response['type'], url: '',
      clone:       () => response,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob:        async () => new Blob(),
      formData:    async () => new FormData(),
      body: null, bodyUsed: false,
    };
    return response;
  });

  return { fetchSpy, getPrompt: () => capturedPrompt };
}

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  for (const k of Object.keys(mockSession)) delete mockSession[k];
  process.env = { ...ORIG_ENV };
  process.env['GEMINI_API_KEY'] = 'test-gemini-key';
  // Remove SF env so we don't make real SF calls
  delete process.env['SALESFORCE_INSTANCE_URL'];
  delete process.env['SF_SERVICE_TOKEN'];
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Shared request helper ──────────────────────────────────────────────────────

function ask(extra?: Record<string, unknown>) {
  return request(app)
    .post('/api/penny/ask')
    .send({ query: 'How do I build a custom object relationship?', ...extra });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

// ── contextMeta.audience helpers ──────────────────────────────────────────────
//
// The route exposes contextMeta.audience in its response.  That is the most
// reliable signal to test — it shows exactly what the route computed from the
// session, without any fragile system-prompt string matching.
//
// System-prompt content tests (does the learner identity contain the coaching
// clause? does it contain admin route paths?) are covered by the assembler
// unit tests in pennyPromptAssembler.test.ts.

function makeGeminiOk(reply = 'ok'): Response {
  const body = { candidates: [{ content: { parts: [{ text: reply }] } }] };
  return {
    ok: true, status: 200, statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json:        async () => body,
    text:        async () => JSON.stringify(body),
    redirected:  false, type: 'basic' as Response['type'], url: '',
    clone:       () => makeGeminiOk(reply),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:        async () => new Blob(),
    formData:    async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

function makeEmptySfResponse(): Response {
  const body = { totalSize: 0, done: true, records: [] };
  return {
    ok: true, status: 200, statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json:        async () => body,
    text:        async () => JSON.stringify(body),
    redirected:  false, type: 'basic' as Response['type'], url: '',
    clone:       () => makeEmptySfResponse(),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:        async () => new Blob(),
    formData:    async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

function stubFetch() {
  const spy = vi.fn().mockImplementation(async (url: string) => {
    if (url.includes('generativelanguage.googleapis.com')) return makeGeminiOk();
    return makeEmptySfResponse();
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

describe('Audience resolution — session-only (verified via contextMeta.audience)', () => {
  test('learnerAuthenticated:true session → audience: "learner" in contextMeta', async () => {
    mockSession['learnerAuthenticated'] = true;
    mockSession['learnerContactId']     = 'TEST_CONTACT_L01';
    stubFetch();

    const res = await ask();

    expect(res.status).toBe(200);
    expect(res.body.contextMeta.audience).toBe('learner');
  });

  test('sfEmail session (Google SSO staff) → audience: "internal" in contextMeta', async () => {
    mockSession['sfEmail']  = 'admin@transitiontrails.org';
    mockSession['sfUserId'] = 'SF_USER_001';
    stubFetch();

    const res = await ask();

    expect(res.status).toBe(200);
    expect(res.body.contextMeta.audience).toBe('internal');
  });

  test('contactId in request body does NOT change audience for a staff session', async () => {
    // Staff session — body sends contactId; audience must still be 'internal'
    mockSession['sfEmail']  = 'admin@transitiontrails.org';
    mockSession['sfUserId'] = 'SF_USER_001';
    stubFetch();

    const res = await ask({ contactId: 'LEARNER_CONTACT_999' });

    expect(res.status).toBe(200);
    expect(res.body.contextMeta.audience).toBe('internal');
  });

  test('contactId in request body with learner session → audience stays "learner" (session wins)', async () => {
    mockSession['learnerAuthenticated'] = true;
    mockSession['learnerContactId']     = 'TEST_CONTACT_L02';
    stubFetch();

    const res = await ask({ contactId: 'DIFFERENT_CONTACT_001' });

    expect(res.status).toBe(200);
    expect(res.body.contextMeta.audience).toBe('learner');
  });

  test('unresolvable session → audience: "learner" (most-restricted fallback)', async () => {
    // Empty session — no learnerAuthenticated, no sfEmail, no sfUserId
    stubFetch();

    const res = await ask();

    expect(res.status).toBe(200);
    expect(res.body.contextMeta.audience).toBe('learner');
  });
});

describe('Audience resolution — body parameters cannot elevate audience', () => {
  test('role: "superadmin" in body with empty session → audience still "learner"', async () => {
    // Empty session + attempted role escalation in body
    stubFetch();

    const res = await ask({ role: 'superadmin' });

    expect(res.status).toBe(200);
    expect(res.body.contextMeta.audience).toBe('learner');
  });

  test('staff session with role: "everyday" in body → audience "internal"', async () => {
    mockSession['sfEmail']  = 'staff@transitiontrails.org';
    mockSession['sfUserId'] = 'SF_USER_002';
    stubFetch();

    const res = await ask({ role: 'everyday' });

    expect(res.status).toBe(200);
    expect(res.body.contextMeta.audience).toBe('internal');
  });
});

describe('Learner identity — coaching behaviour (verified via assembler unit tests + response success)', () => {
  // Detailed identity content is tested exhaustively in pennyPromptAssembler.test.ts.
  // Here we verify that the audience signal flows through correctly and the route succeeds.

  test('learner session → succeeds and reports learner audience', async () => {
    mockSession['learnerAuthenticated'] = true;
    stubFetch();

    const res = await ask({ query: 'What is a lookup relationship in Salesforce?' });

    expect(res.status).toBe(200);
    expect(res.body.contextMeta.audience).toBe('learner');
    expect(res.body.reply).toBeTruthy();
  });

  test('internal session → succeeds and reports internal audience', async () => {
    mockSession['sfEmail']  = 'admin@transitiontrails.org';
    mockSession['sfUserId'] = 'SF_USER_003';
    stubFetch();

    const res = await ask({ query: 'How do I fix this Salesforce flow?' });

    expect(res.status).toBe(200);
    expect(res.body.contextMeta.audience).toBe('internal');
    expect(res.body.reply).toBeTruthy();
  });

  test('learner identity in assembler contains the coaching posture clause', () => {
    const learnerIdentity = layer1Identity('learner');
    expect(learnerIdentity).toMatch(/coaching companion/i);
    expect(learnerIdentity).toMatch(/ask.*targeted question|ask one.*question/i);
    expect(learnerIdentity).toMatch(/uncomfortable|stuck/i);
    expect(learnerIdentity).toMatch(/give the answer directly/i);
    expect(learnerIdentity).not.toMatch(/Chief of Staff/i);
    expect(learnerIdentity).not.toMatch(/\/admin\/integrations/);
  });

  test('internal identity in assembler contains ops routes and not the coaching clause', () => {
    const internalIdentity = layer1Identity('internal');
    expect(internalIdentity).toMatch(/Chief of Staff/i);
    expect(internalIdentity).toMatch(/\/admin\/integrations/);
    expect(internalIdentity).not.toMatch(/coaching companion/i);
  });
});
