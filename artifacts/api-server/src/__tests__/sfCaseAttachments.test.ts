/**
 * sfCaseAttachments.test.ts
 *
 * Tests for POST /api/sf/cases/:caseId/attachments — the server-side leg of
 * the screenshot-to-Salesforce attachment chain.
 *
 * The endpoint accepts a JSON array of base64-encoded files, creates one
 * ContentVersion record per file via the Salesforce proxyFetch, and returns
 * an aggregate { uploaded, failed, results } response.
 *
 * Test matrix:
 *
 *  Input validation
 *   V1. Invalid caseId (non-alphanumeric / wrong length) → 400
 *   V2. Missing files array → 400
 *   V3. Empty files array → 400
 *   V4. Files array length > 10 → 400
 *
 *  Auth
 *   A1. No SF session (getEffectiveSfFetch returns null) → 401
 *
 *  Happy path
 *   H1. Single PNG file → ContentVersion created → uploaded:1, failed:0
 *   H2. Multiple files → each creates its own ContentVersion → correct counts
 *
 *  Partial failure
 *   P1. SF returns non-200 for one file → that file is failed, others succeed
 *   P2. SF throws for one file → caught; rest continue; failed count incremented
 *   P3. File missing base64 → counted as failed without making an SF call
 *
 *  Response shape
 *   S1. Every result entry has { name, success } — error is present only on failure
 *   S2. Successful upload result has no error field
 *   S3. Failed upload result has a non-empty error string
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Auth bypass ────────────────────────────────────────────────────────────────

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:                (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:                (_req: unknown, _res: unknown, next: () => void) => next(),
  requireSuperAdmin:           (_req: unknown, _res: unknown, next: () => void) => next(),
  requireHomebaseAuth:         (_req: unknown, _res: unknown, next: () => void) => next(),
  effectiveIdentityMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:       () => true,
  isAdmin:       () => true,
  isSuperAdmin:  () => false,
  getStaffGroups: () => [],
  getAdminGroups: () => [],
  getTeamGroup:   () => null,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

// ── Proxy-fetch mock — behaviour controlled per test ──────────────────────────
//
// Three modes:
//   'ok'       — every ContentVersion POST returns 201 { id, success:true }
//   'fail'     — every ContentVersion POST returns 400 with an error body
//   'throw'    — every ContentVersion POST throws a network-level error
//   'null'     — getEffectiveSfFetch returns null (no SF session)

const { proxyMode } = vi.hoisted(() => ({
  proxyMode: { value: 'ok' as 'ok' | 'fail' | 'throw' | 'null' },
}));

vi.mock('../lib/salesforceOAuth.js', () => ({
  getEffectiveSfFetch: (_req: unknown) => {
    if (proxyMode.value === 'null') return null;

    return async function mockProxyFetch(
      url: string,
      init?: RequestInit,
    ): Promise<Response> {
      // userinfo call used by getOrgBaseUrl helper — always succeeds
      if (url.includes('/oauth2/userinfo')) {
        return {
          ok: true, status: 200,
          json: async () => ({ urls: { sobjects: 'https://org.salesforce.com/services/data/v58.0/sobjects' } }),
          text: async () => '{}',
          headers: new Headers(),
        } as Response;
      }

      // ContentVersion POST
      if (url.includes('/ContentVersion')) {
        if (proxyMode.value === 'throw') {
          throw new Error('ECONNRESET: network error');
        }
        if (proxyMode.value === 'fail') {
          return {
            ok: false, status: 413,
            json: async () => ([{ errorCode: 'REQUEST_LIMIT_EXCEEDED', message: 'File too large' }]),
            text: async () => '[{"errorCode":"REQUEST_LIMIT_EXCEEDED","message":"File too large"}]',
            headers: new Headers(),
          } as Response;
        }
        // 'ok'
        return {
          ok: true, status: 201,
          json: async () => ({ id: 'cv-001', success: true }),
          text: async () => '{"id":"cv-001","success":true}',
          headers: new Headers(),
        } as Response;
      }

      // Unknown URL — default OK
      return {
        ok: true, status: 200,
        json: async () => ({}),
        text: async () => '{}',
        headers: new Headers(),
      } as Response;
    };
  },
}));

// ── getSalesforceClient mock ───────────────────────────────────────────────────
// Used by GET /sf/cases/statuses (and others) — must return a working client
// so statuses tests can exercise the CaseStatus query path.
//
// Two modes (controlled by sfClientMode):
//   'connected'    — returns a mock client with query() support
//   'disconnected' — throws (simulates no SF session)

const { sfClientMode, mockCaseStatusRows } = vi.hoisted(() => ({
  sfClientMode: { value: 'connected' as 'connected' | 'disconnected' },
  mockCaseStatusRows: {
    value: [
      { MasterLabel: 'New',      IsClosed: false },
      { MasterLabel: 'Working',  IsClosed: false },
      { MasterLabel: 'Resolved', IsClosed: true  },
      { MasterLabel: 'Closed',   IsClosed: true  },
    ] as { MasterLabel: string; IsClosed: boolean }[],
  },
}));

vi.mock('../lib/getSalesforceClient.js', () => ({
  getSalesforceClient: (_req: unknown) => {
    if (sfClientMode.value === 'disconnected') {
      throw new Error('Not authenticated with Salesforce.');
    }
    return {
      query: async <T>(_soql: string) => ({
        totalSize: mockCaseStatusRows.value.length,
        done:      true,
        records:   mockCaseStatusRows.value as unknown as T[],
      }),
      createRecord: async (_obj: string, _data: unknown) => ({ id: 'new-id', success: true }),
      updateRecord: async () => undefined,
      deleteRecord: async () => undefined,
    };
  },
}));

// ── DB mock (not used by this route but loaded by the app module) ──────────────

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    insert:  vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) })) })),
    update:  vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })) })) })),
    select:  vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([]) })) })) })),
  },
  submittedCasesTable: {},
}));

vi.mock('drizzle-orm', () => ({
  eq:      vi.fn().mockReturnValue({ __eq: true }),
  desc:    vi.fn(f => ({ __desc: f })),
  and:     vi.fn().mockReturnValue({ __and: true }),
  inArray: vi.fn().mockReturnValue({ __inArray: true }),
}));

// ── Session shim ──────────────────────────────────────────────────────────────

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

import app from '../app.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** A valid 18-character Salesforce Case ID */
const VALID_CASE_ID = '5001a00000XyzAbcDE';

/** Minimal valid base64 for a tiny PNG (1×1 pixel). */
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const PNG_FILE = { name: 'screenshot-2026-08-12T10-30-00.png', base64: TINY_PNG_B64, mimeType: 'image/png' };

function clearSession() {
  for (const k of Object.keys(mockSession)) delete mockSession[k];
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  clearSession();
  proxyMode.value    = 'ok';
  sfClientMode.value = 'connected';
  // Simulate a logged-in staff user with an active SF session
  Object.assign(mockSession, {
    googleEmail:    'staff@transitiontrails.org',
    googleAudience: 'staff',
    sfUserId:       '005SF000001StaffXXX',
  });
});

afterEach(() => {
  clearSession();
  proxyMode.value    = 'ok';
  sfClientMode.value = 'connected';
  vi.clearAllMocks();
});

// ── V1. Invalid caseId ────────────────────────────────────────────────────────

describe('POST /api/sf/cases/:caseId/attachments — input validation', () => {
  test('V1a: caseId shorter than 15 chars → 400', async () => {
    const res = await request(app)
      .post('/api/sf/cases/short/attachments')
      .send({ files: [PNG_FILE] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid caseid/i);
  });

  test('V1b: caseId with special characters → 400', async () => {
    const res = await request(app)
      .post('/api/sf/cases/500-INVALID-ID!/attachments')
      .send({ files: [PNG_FILE] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid caseid/i);
  });

  test('V1c: caseId longer than 18 chars → 400', async () => {
    const res = await request(app)
      .post('/api/sf/cases/5001a00000XyzAbcDEFGH/attachments')
      .send({ files: [PNG_FILE] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid caseid/i);
  });

  // V2 / V3 — missing or empty files
  test('V2: no files field in body → 400', async () => {
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/files array/i);
  });

  test('V3: empty files array → 400', async () => {
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/files array/i);
  });

  // V4 — too many files
  test('V4: more than 10 files → 400', async () => {
    const files = Array.from({ length: 11 }, (_, i) => ({
      name: `file-${i}.png`, base64: TINY_PNG_B64, mimeType: 'image/png',
    }));
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/maximum 10/i);
  });
});

// ── A1. No SF session ─────────────────────────────────────────────────────────

describe('POST /api/sf/cases/:caseId/attachments — auth', () => {
  test('A1: no Salesforce session → 401', async () => {
    proxyMode.value = 'null';
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [PNG_FILE] });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/not connected to salesforce/i);
  });
});

// ── H1. Single file — happy path ──────────────────────────────────────────────

describe('POST /api/sf/cases/:caseId/attachments — happy path', () => {
  test('H1: single PNG file → ContentVersion created → uploaded:1 failed:0', async () => {
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [PNG_FILE] });

    expect(res.status).toBe(200);
    expect(res.body.uploaded).toBe(1);
    expect(res.body.failed).toBe(0);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(1);
  });

  test('H1: result entry for a successful upload has success:true', async () => {
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [PNG_FILE] });

    const [entry] = res.body.results as { name: string; success: boolean; error?: string }[];
    expect(entry.name).toBe(PNG_FILE.name);
    expect(entry.success).toBe(true);
  });

  test('H2: three files → all succeed → uploaded:3 failed:0', async () => {
    const files = [
      { name: 'screenshot-1.png', base64: TINY_PNG_B64, mimeType: 'image/png' },
      { name: 'screenshot-2.png', base64: TINY_PNG_B64, mimeType: 'image/png' },
      { name: 'screenshot-3.png', base64: TINY_PNG_B64, mimeType: 'image/png' },
    ];
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files });

    expect(res.status).toBe(200);
    expect(res.body.uploaded).toBe(3);
    expect(res.body.failed).toBe(0);
    expect(res.body.results).toHaveLength(3);
  });

  test('H2: result names match the submitted file names', async () => {
    const files = [
      { name: 'alpha.png', base64: TINY_PNG_B64, mimeType: 'image/png' },
      { name: 'beta.png',  base64: TINY_PNG_B64, mimeType: 'image/png' },
    ];
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files });

    const names = (res.body.results as { name: string }[]).map(r => r.name);
    expect(names).toContain('alpha.png');
    expect(names).toContain('beta.png');
  });

  // Edge: 15-char and 18-char IDs are both valid Salesforce ID lengths
  test('H1: exactly 15-char alphanumeric caseId is accepted', async () => {
    const res = await request(app)
      .post('/api/sf/cases/5001a00000XyzAB/attachments')  // 15 chars
      .send({ files: [PNG_FILE] });
    expect(res.status).toBe(200);
  });

  test('H1: exactly 18-char alphanumeric caseId is accepted', async () => {
    const res = await request(app)
      .post('/api/sf/cases/5001a00000XyzAbcDE/attachments')  // 18 chars
      .send({ files: [PNG_FILE] });
    expect(res.status).toBe(200);
  });
});

// ── P1. Partial failure — SF returns non-200 ─────────────────────────────────

describe('POST /api/sf/cases/:caseId/attachments — partial failure', () => {
  test('P1: SF returns 413 for every file → uploaded:0, failed equals file count', async () => {
    proxyMode.value = 'fail';
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [PNG_FILE] });

    expect(res.status).toBe(200);            // route always returns 200 with per-file results
    expect(res.body.uploaded).toBe(0);
    expect(res.body.failed).toBe(1);
  });

  test('P1: failed result entry has success:false and a non-empty error string', async () => {
    proxyMode.value = 'fail';
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [PNG_FILE] });

    const [entry] = res.body.results as { name: string; success: boolean; error?: string }[];
    expect(entry.success).toBe(false);
    expect(typeof entry.error).toBe('string');
    expect(entry.error!.length).toBeGreaterThan(0);
  });

  test('P2: network throw → caught per-file → uploaded:0, failed:1', async () => {
    proxyMode.value = 'throw';
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [PNG_FILE] });

    expect(res.status).toBe(200);
    expect(res.body.uploaded).toBe(0);
    expect(res.body.failed).toBe(1);
  });

  test('P2: error message from thrown exception is surfaced in result entry', async () => {
    proxyMode.value = 'throw';
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [PNG_FILE] });

    const [entry] = res.body.results as { name: string; success: boolean; error?: string }[];
    expect(entry.success).toBe(false);
    expect(entry.error).toMatch(/econnreset|network error/i);
  });

  test('P3: file entry with missing base64 → counted as failed, no SF call attempted', async () => {
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [{ name: 'bad.png', base64: '', mimeType: 'image/png' }] });

    expect(res.status).toBe(200);
    expect(res.body.uploaded).toBe(0);
    expect(res.body.failed).toBe(1);
  });

  test('P3: file entry with null name → result name falls back to "(unnamed)"', async () => {
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [{ name: null, base64: TINY_PNG_B64, mimeType: 'image/png' }] });

    expect(res.status).toBe(200);
    expect(res.body.failed).toBe(1);
    const [entry] = res.body.results as { name: string }[];
    expect(entry.name).toBe('(unnamed)');
  });
});

// ── S1–S3. Response shape invariants ─────────────────────────────────────────

describe('POST /api/sf/cases/:caseId/attachments — response shape', () => {
  test('S1: every result entry has at least { name, success }', async () => {
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [PNG_FILE] });

    for (const entry of res.body.results as Record<string, unknown>[]) {
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('success');
    }
  });

  test('S2: successful result entry does not carry an error field', async () => {
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [PNG_FILE] });

    const [entry] = res.body.results as { success: boolean; error?: string }[];
    expect(entry.success).toBe(true);
    expect(entry.error).toBeUndefined();
  });

  test('S3: failed result entry carries a non-empty error string', async () => {
    proxyMode.value = 'fail';
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [PNG_FILE] });

    const [entry] = res.body.results as { success: boolean; error?: string }[];
    expect(entry.success).toBe(false);
    expect(typeof entry.error).toBe('string');
    expect(entry.error!.trim()).not.toBe('');
  });

  test('S1: top-level response always has uploaded, failed, and results', async () => {
    const res = await request(app)
      .post(`/api/sf/cases/${VALID_CASE_ID}/attachments`)
      .send({ files: [PNG_FILE] });

    expect(res.body).toHaveProperty('uploaded');
    expect(res.body).toHaveProperty('failed');
    expect(res.body).toHaveProperty('results');
    expect(typeof res.body.uploaded).toBe('number');
    expect(typeof res.body.failed).toBe('number');
    expect(Array.isArray(res.body.results)).toBe(true);
  });
});

// ── GET /sf/cases/statuses — closure-state regression ────────────────────────
//
// The endpoint must source IsClosed from the CaseStatus sobject (SOQL), NOT
// from Case describe picklistValues. The describe response does NOT include a
// `closed` property, so relying on it always returns false for custom terminal
// statuses (e.g. "Resolved") — a user-facing regression where resolved cases
// stay visible in the open-case list until a page reload.
//
// Test matrix:
//  T1. No SF session → 401
//  T2. Standard closed status ("Closed") → closed:true in response
//  T3. Custom closed status ("Resolved") → closed:true (not false)
//  T4. Open statuses ("New", "Working") → closed:false
//  T5. Response has a "statuses" array

describe('GET /api/sf/cases/statuses — IsClosed sourced from CaseStatus sobject', () => {
  beforeEach(() => {
    // Default mock rows include both standard and custom closed statuses
    mockCaseStatusRows.value = [
      { MasterLabel: 'New',      IsClosed: false },
      { MasterLabel: 'Working',  IsClosed: false },
      { MasterLabel: 'Escalated',IsClosed: false },
      { MasterLabel: 'Resolved', IsClosed: true  }, // custom terminal status
      { MasterLabel: 'Closed',   IsClosed: true  }, // standard terminal status
    ];
  });

  test('T1: no SF session → 401', async () => {
    sfClientMode.value = 'disconnected';
    const res = await request(app).get('/api/sf/cases/statuses');
    expect(res.status).toBe(401);
  });

  test('T2: standard "Closed" status → closed:true', async () => {
    const res = await request(app).get('/api/sf/cases/statuses');
    expect(res.status).toBe(200);
    const statuses = res.body.statuses as { value: string; closed: boolean }[];
    const closed = statuses.find(s => s.value === 'Closed');
    expect(closed).toBeDefined();
    expect(closed!.closed).toBe(true);
  });

  test('T3: custom closed status "Resolved" → closed:true (regression guard)', async () => {
    // KEY: if the endpoint used describe picklistValues instead of CaseStatus SOQL,
    // Resolved would have closed:false (property absent → default false) and cases
    // moved to Resolved would stay visible in the open list — a false-open regression.
    const res = await request(app).get('/api/sf/cases/statuses');
    expect(res.status).toBe(200);
    const statuses = res.body.statuses as { value: string; closed: boolean }[];
    const resolved = statuses.find(s => s.value === 'Resolved');
    expect(resolved).toBeDefined();
    expect(resolved!.closed).toBe(true);
  });

  test('T4: open statuses have closed:false', async () => {
    const res = await request(app).get('/api/sf/cases/statuses');
    expect(res.status).toBe(200);
    const statuses = res.body.statuses as { value: string; closed: boolean }[];
    for (const s of statuses.filter(x => ['New', 'Working', 'Escalated'].includes(x.value))) {
      expect(s.closed).toBe(false);
    }
  });

  test('T5: response shape has a "statuses" array', async () => {
    const res = await request(app).get('/api/sf/cases/statuses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.statuses)).toBe(true);
    expect(res.body.statuses.length).toBeGreaterThan(0);
    for (const s of res.body.statuses as { value: string; closed: boolean }[]) {
      expect(typeof s.value).toBe('string');
      expect(typeof s.closed).toBe('boolean');
    }
  });
});
