/**
 * sfCaseValidationErrors.test.ts
 *
 * Confirms that FIELD_CUSTOM_VALIDATION_EXCEPTION errors from Salesforce are
 * surfaced to the caller as a clean, human-readable message rather than a raw
 * API error dump.  Covers both the status PATCH and the follow-up date PATCH.
 *
 * Test matrix:
 *
 *  PATCH /sf/cases/:id/status
 *   S1. SF validation rule fires → 422 with the org-admin message text
 *   S2. Multiple validation rules fire → 422 with messages joined by a space
 *   S3. Non-validation SF error (e.g. INVALID_ID) → 500 with raw message unchanged
 *   S4. Successful update → 200 { success: true, status }
 *
 *  PATCH /sf/cases/:id (follow-up date)
 *   D1. SF validation rule fires → 422 with the org-admin message text
 *   D2. Validation message that contains "FollowUpDate" → 422, NOT fieldUnsupported
 *   D3. "No such column" SF error → 200 { success:false, fieldUnsupported:true }
 *   D4. Successful date update → 200 { success: true, FollowUpDate }
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Auth bypass ────────────────────────────────────────────────────────────────

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:                (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:                (_req: unknown, _res: unknown, next: () => void) => next(),
  requireSuperAdmin:           (_req: unknown, _res: unknown, next: () => void) => next(),
  requireHomebaseAuth:         (_req: unknown, _res: unknown, next: () => void) => next(),
  effectiveIdentityMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:        () => true,
  isAdmin:        () => true,
  isSuperAdmin:   () => false,
  getStaffGroups: () => [],
  getAdminGroups: () => [],
  getTeamGroup:   () => null,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

// ── SF client mock — updateRecord behaviour controlled per test ────────────────

/**
 * Construct the exact error string that the SF connector library throws on a
 * 400 response.  The JSON error array is appended after the URL — matching the
 * real format seen in production (confirmed from the screenshot in #628).
 */
function sfError(caseId: string, errors: Array<{ message: string; errorCode: string }>): Error {
  return new Error(
    `Salesforce API error 400 PATCH /services/data/v62.0/sobjects/Case/${caseId} ${JSON.stringify(errors)}`,
  );
}

const SINGLE_VALIDATION_ERROR = (caseId: string) =>
  sfError(caseId, [
    { message: 'Must have estimated and logged time for this contract case.', errorCode: 'FIELD_CUSTOM_VALIDATION_EXCEPTION' },
  ]);

const MULTI_VALIDATION_ERROR = (caseId: string) =>
  sfError(caseId, [
    { message: 'Rule one fired.',  errorCode: 'FIELD_CUSTOM_VALIDATION_EXCEPTION' },
    { message: 'Rule two fired.',  errorCode: 'FIELD_CUSTOM_VALIDATION_EXCEPTION' },
  ]);

const FOLLOWUPDATE_VALIDATION_ERROR = (caseId: string) =>
  sfError(caseId, [
    { message: 'FollowUpDate must not be in the past for active cases.', errorCode: 'FIELD_CUSTOM_VALIDATION_EXCEPTION' },
  ]);

const NO_SUCH_COLUMN_ERROR = (_caseId: string) =>
  new Error('No such column \'FollowUpDate\' on entity \'Case\'.');

const GENERIC_SF_ERROR = (_caseId: string) =>
  new Error('INVALID_ID: Record ID: id value of incorrect type: bad');

type UpdateMode =
  | 'success'
  | 'single-validation'
  | 'multi-validation'
  | 'followupdate-validation'
  | 'no-such-column'
  | 'generic-error';

const { updateMode } = vi.hoisted(() => ({
  updateMode: { value: 'success' as UpdateMode },
}));

vi.mock('../lib/getSalesforceClient.js', () => ({
  getSalesforceClient: (_req: unknown) => ({
    // ownership check always returns one row
    query: async <T>(_soql: string) => ({
      totalSize: 1,
      done:      true,
      records:   [{ Id: VALID_CASE_ID }] as unknown as T[],
    }),
    updateRecord: async (_obj: string, id: string, _data: unknown) => {
      switch (updateMode.value) {
        case 'single-validation':        throw SINGLE_VALIDATION_ERROR(id);
        case 'multi-validation':         throw MULTI_VALIDATION_ERROR(id);
        case 'followupdate-validation':  throw FOLLOWUPDATE_VALIDATION_ERROR(id);
        case 'no-such-column':           throw NO_SUCH_COLUMN_ERROR(id);
        case 'generic-error':            throw GENERIC_SF_ERROR(id);
        default:                         return undefined; // success
      }
    },
    createRecord: async () => ({ id: 'new-id', success: true }),
    deleteRecord: async () => undefined,
  }),
}));

// ── proxyFetch stub (not used by these routes, but app.ts loads it) ────────────

vi.mock('../lib/salesforceOAuth.js', () => ({
  getEffectiveSfFetch: () => async () =>
    ({ ok: true, status: 200, json: async () => ({}), text: async () => '{}', headers: new Headers() }) as Response,
}));

// ── DB mock ───────────────────────────────────────────────────────────────────

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })) })) })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([]) })) })) })),
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

const VALID_CASE_ID = '5001a00000XyzAbcDE';

function clearSession() {
  for (const k of Object.keys(mockSession)) delete mockSession[k];
}

const STAFF_SESSION = {
  googleEmail:    'staff@transitiontrails.org',
  googleAudience: 'staff' as const,
  googleGroups:   [] as string[],
  sfUserId:       '005SF000001StaffXXX',
};

beforeEach(() => {
  clearSession();
  updateMode.value = 'success';
  Object.assign(mockSession, STAFF_SESSION);
});

// ── PATCH /sf/cases/:id/status ────────────────────────────────────────────────

describe('PATCH /sf/cases/:id/status — SF validation errors', () => {
  it('S1: single validation rule → 422 with the org-admin message text', async () => {
    updateMode.value = 'single-validation';
    const res = await request(app)
      .patch(`/api/sf/cases/${VALID_CASE_ID}/status`)
      .send({ status: 'Working' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Must have estimated and logged time for this contract case.');
  });

  it('S2: multiple validation rules → 422 with messages joined by a space', async () => {
    updateMode.value = 'multi-validation';
    const res = await request(app)
      .patch(`/api/sf/cases/${VALID_CASE_ID}/status`)
      .send({ status: 'Working' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Rule one fired. Rule two fired.');
  });

  it('S3: non-validation SF error → 500 with raw message unchanged', async () => {
    updateMode.value = 'generic-error';
    const res = await request(app)
      .patch(`/api/sf/cases/${VALID_CASE_ID}/status`)
      .send({ status: 'Working' });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('INVALID_ID');
  });

  it('S4: successful update → 200 with success and status fields', async () => {
    updateMode.value = 'success';
    const res = await request(app)
      .patch(`/api/sf/cases/${VALID_CASE_ID}/status`)
      .send({ status: 'Working' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, status: 'Working' });
  });
});

// ── PATCH /sf/cases/:id (date) ────────────────────────────────────────────────

describe('PATCH /sf/cases/:id — follow-up date SF validation errors', () => {
  it('D1: validation rule fires → 422 with the org-admin message text', async () => {
    updateMode.value = 'single-validation';
    const res = await request(app)
      .patch(`/api/sf/cases/${VALID_CASE_ID}`)
      .send({ followUpDate: '2026-09-01' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Must have estimated and logged time for this contract case.');
  });

  it('D2: validation message containing "FollowUpDate" → 422, not fieldUnsupported', async () => {
    updateMode.value = 'followupdate-validation';
    const res = await request(app)
      .patch(`/api/sf/cases/${VALID_CASE_ID}`)
      .send({ followUpDate: '2026-08-01' });

    // Must NOT return 200 { fieldUnsupported: true } — the word "FollowUpDate"
    // in the validation message should not trigger the missing-field fallback.
    expect(res.status).toBe(422);
    expect(res.body.error).toContain('FollowUpDate must not be in the past');
    expect(res.body.fieldUnsupported).toBeUndefined();
  });

  it('D3: "No such column" error → 200 { success:false, fieldUnsupported:true }', async () => {
    updateMode.value = 'no-such-column';
    const res = await request(app)
      .patch(`/api/sf/cases/${VALID_CASE_ID}`)
      .send({ followUpDate: '2026-09-01' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: false, fieldUnsupported: true });
  });

  it('D4: successful date update → 200 with success and FollowUpDate', async () => {
    updateMode.value = 'success';
    const res = await request(app)
      .patch(`/api/sf/cases/${VALID_CASE_ID}`)
      .send({ followUpDate: '2026-09-15' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, FollowUpDate: '2026-09-15' });
  });
});
