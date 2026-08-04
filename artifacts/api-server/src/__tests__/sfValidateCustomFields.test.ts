/**
 * Tests for GET /api/salesforce/validate — custom field verification section
 *
 * Focus: REUSED_OBJECT_FIELD_CHECKS entries for Penny objects.
 *
 * Critical invariant: a successful describe response that omits a required field
 * must surface as status:"warning" in the custom-fields check AND list the field
 * in requiredFieldsMissing.  A describe error (rate-limit, network) must NOT
 * produce requiredFieldsMissing entries — only a real successful omission is
 * conclusive evidence of absence.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Auth bypass ────────────────────────────────────────────────────────────────

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:          (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:          (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:               () => true,
  isAdmin:               () => true,
  isSuperAdmin:          () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

// ── Per-object describe overrides ──────────────────────────────────────────────
//
// describeOverrides keys are Salesforce object API names.
//   • value is string[] → return that exact set of custom field names
//   • value is null     → return 404 (object absent)
//   • key absent        → return a default success with an empty custom fields array
//
// Reset in beforeEach so tests are isolated.

const { describeOverrides } = vi.hoisted(() => ({
  describeOverrides: new Map<string, string[] | null>(),
}));

// Helper to build a minimal full Response-like object
function makeResponse(
  ok: boolean,
  status: number,
  body: unknown,
): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : String(status),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as Response['type'],
    url: '',
    json:        async () => body,
    text:        async () => JSON.stringify(body),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:        async () => new Blob(),
    formData:    async () => new FormData(),
    body:        null,
    bodyUsed:    false,
    clone: () => makeResponse(ok, status, body),
  } as Response;
}

// ── Mock salesforceOAuth so the validate endpoint always gets a proxyFetch ────

vi.mock('../lib/salesforceOAuth.js', () => ({
  getEffectiveSfFetch: (_req: unknown) => {
    return async function mockProxyFetch(url: string): Promise<Response> {

      // ── describe probes ───────────────────────────────────────────────────
      const describeMatch = url.match(/\/sobjects\/([^/]+)\/describe/);
      if (describeMatch) {
        const objectName = decodeURIComponent(describeMatch[1]!);

        if (describeOverrides.has(objectName)) {
          const override = describeOverrides.get(objectName)!;
          if (override === null) {
            // Simulate object absent (404)
            return makeResponse(false, 404, {});
          }
          // Return only the supplied custom fields
          return makeResponse(true, 200, {
            name:   objectName,
            fields: override.map(f => ({ name: f, custom: true })),
          });
        }

        // Default: object exists, no custom fields
        return makeResponse(true, 200, { name: objectName, fields: [] });
      }

      // ── SOQL queries — return empty result set ────────────────────────────
      if (url.includes('/query')) {
        return makeResponse(true, 200, { totalSize: 0, done: true, records: [] });
      }

      // ── Identity / limits fallback ────────────────────────────────────────
      if (url.includes('/chatter/users/me')) {
        return makeResponse(true, 200, {
          username:    'test@example.com',
          displayName: 'Test User',
          email:       'test@example.com',
          id:          '005000000000001',
        });
      }

      // ── Anything else ─────────────────────────────────────────────────────
      return makeResponse(true, 200, {});
    };
  },
}));

import app from '../app.js';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FieldCheckResult {
  id:                    string;
  object:                string;
  label:                 string;
  ourFields:             string[];
  requiredFieldsFound:   string[];
  requiredFieldsMissing: string[];
  describeError:         string | null;
  describeUndetermined:  boolean;
}

interface ValidateBody {
  checks: Array<{ id: string; status: string; detail: string; meta?: Record<string, unknown> }>;
  customFieldChecks: FieldCheckResult[];
}

// ── Test setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  describeOverrides.clear();
});

// ── Helpers ────────────────────────────────────────────────────────────────────

async function runValidate(): Promise<ValidateBody> {
  const res = await request(app).get('/api/salesforce/validate');
  expect(res.status).toBe(200);
  return res.body as ValidateBody;
}

function getCustomFieldsCheck(body: ValidateBody) {
  return body.checks.find(c => c.id === 'custom-fields');
}

function getFieldCheck(body: ValidateBody, id: string): FieldCheckResult | undefined {
  return body.customFieldChecks.find(r => r.id === id);
}

// ── Tests: Penny_Interaction_Log__c (write-critical object) ───────────────────

describe('GET /api/salesforce/validate — Penny_Interaction_Log__c field checks', () => {

  test('custom-fields check is "pass" when all required fields are present', async () => {
    // Provide the full required set for Penny_Interaction_Log__c
    describeOverrides.set('Penny_Interaction_Log__c', [
      'Learner__c', 'User_Message__c', 'Penny_Response__c', 'Prompt_Mode__c', 'Source__c',
    ]);

    const body = await runValidate();
    const cfCheck = getCustomFieldsCheck(body);
    expect(cfCheck).toBeDefined();

    const logCheck = getFieldCheck(body, 'penny-interaction-log-fields');
    expect(logCheck).toBeDefined();
    expect(logCheck!.requiredFieldsMissing).toHaveLength(0);
    expect(logCheck!.describeError).toBeNull();
  });

  test('custom-fields check is "warning" when Learner__c is absent from the describe', async () => {
    // Return all required fields EXCEPT the write-critical Learner__c
    describeOverrides.set('Penny_Interaction_Log__c', [
      'User_Message__c', 'Penny_Response__c', 'Prompt_Mode__c', 'Source__c',
    ]);

    const body  = await runValidate();
    const cfCheck = getCustomFieldsCheck(body);
    expect(cfCheck).toBeDefined();
    expect(cfCheck!.status).toBe('warning');

    const logCheck = getFieldCheck(body, 'penny-interaction-log-fields');
    expect(logCheck).toBeDefined();
    expect(logCheck!.requiredFieldsMissing).toContain('Learner__c');
    expect(logCheck!.requiredFieldsMissing).toHaveLength(1);
    expect(logCheck!.requiredFieldsFound).toContain('User_Message__c');
    expect(logCheck!.describeError).toBeNull();
    expect(logCheck!.describeUndetermined).toBe(false);
  });

  test('requiredFieldsMissing lists all absent required fields when multiple are missing', async () => {
    // Simulate a describe that returns none of the required fields
    describeOverrides.set('Penny_Interaction_Log__c', []);

    const body     = await runValidate();
    const logCheck = getFieldCheck(body, 'penny-interaction-log-fields');
    expect(logCheck).toBeDefined();

    const expectedMissing = [
      'Learner__c', 'User_Message__c', 'Penny_Response__c', 'Prompt_Mode__c', 'Source__c',
    ];
    for (const field of expectedMissing) {
      expect(logCheck!.requiredFieldsMissing).toContain(field);
    }
    expect(logCheck!.requiredFieldsMissing).toHaveLength(expectedMissing.length);
  });

  test('requiredFieldsMissing is empty (not populated) when describe returns an error', async () => {
    // 404 means the object is absent; the field-check code must not infer that
    // individual fields are missing — it must leave requiredFieldsMissing empty
    // because the describe did not succeed.
    describeOverrides.set('Penny_Interaction_Log__c', null);

    const body     = await runValidate();
    const logCheck = getFieldCheck(body, 'penny-interaction-log-fields');
    expect(logCheck).toBeDefined();
    // The describe errored — we cannot conclude individual fields are missing
    expect(logCheck!.requiredFieldsMissing).toHaveLength(0);
    expect(logCheck!.describeError).not.toBeNull();
  });

  test('detail string mentions the missing field count when a field is absent', async () => {
    describeOverrides.set('Penny_Interaction_Log__c', [
      'User_Message__c', 'Penny_Response__c', 'Prompt_Mode__c', 'Source__c',
    ]);

    const body    = await runValidate();
    const cfCheck = getCustomFieldsCheck(body);
    expect(cfCheck).toBeDefined();
    expect(cfCheck!.detail).toMatch(/required missing/i);
  });
});

// ── Tests: Penny_Badge__c (lookup-field Penny object) ─────────────────────────

describe('GET /api/salesforce/validate — Penny_Badge__c field checks', () => {

  test('custom-fields check is "pass" when all required Badge fields are present', async () => {
    describeOverrides.set('Penny_Badge__c', ['Learner__c', 'Awarded_By__c']);

    const body       = await runValidate();
    const badgeCheck = getFieldCheck(body, 'penny-badge-fields');
    expect(badgeCheck).toBeDefined();
    expect(badgeCheck!.requiredFieldsMissing).toHaveLength(0);
    expect(badgeCheck!.describeError).toBeNull();
  });

  test('custom-fields check is "warning" when Learner__c is absent from Penny_Badge__c', async () => {
    // Return Awarded_By__c but not Learner__c
    describeOverrides.set('Penny_Badge__c', ['Awarded_By__c']);

    const body    = await runValidate();
    const cfCheck = getCustomFieldsCheck(body);
    expect(cfCheck).toBeDefined();
    expect(cfCheck!.status).toBe('warning');

    const badgeCheck = getFieldCheck(body, 'penny-badge-fields');
    expect(badgeCheck).toBeDefined();
    expect(badgeCheck!.requiredFieldsMissing).toContain('Learner__c');
    expect(badgeCheck!.requiredFieldsMissing).toHaveLength(1);
    expect(badgeCheck!.requiredFieldsFound).toContain('Awarded_By__c');
    expect(badgeCheck!.describeError).toBeNull();
    expect(badgeCheck!.describeUndetermined).toBe(false);
  });

  test('both Penny_Interaction_Log__c and Penny_Badge__c missing fields surface together', async () => {
    // Simulate two objects simultaneously having missing required fields
    describeOverrides.set('Penny_Interaction_Log__c', [
      'User_Message__c', 'Penny_Response__c', 'Prompt_Mode__c', 'Source__c',
      // Learner__c intentionally absent
    ]);
    describeOverrides.set('Penny_Badge__c', [
      'Awarded_By__c',
      // Learner__c intentionally absent
    ]);

    const body = await runValidate();

    const logCheck   = getFieldCheck(body, 'penny-interaction-log-fields');
    const badgeCheck = getFieldCheck(body, 'penny-badge-fields');

    expect(logCheck!.requiredFieldsMissing).toContain('Learner__c');
    expect(badgeCheck!.requiredFieldsMissing).toContain('Learner__c');

    // The aggregate check must be warning because BOTH have issues
    const cfCheck = getCustomFieldsCheck(body);
    expect(cfCheck!.status).toBe('warning');
  });
});

// ── Tests: other Penny objects in REUSED_OBJECT_FIELD_CHECKS ─────────────────

describe('GET /api/salesforce/validate — all Penny field-check entries present', () => {

  test('customFieldChecks includes entries for all Penny custom objects', async () => {
    const body = await runValidate();
    const ids  = body.customFieldChecks.map(r => r.id);

    expect(ids).toContain('penny-interaction-log-fields');
    expect(ids).toContain('penny-trail-config-fields');
    expect(ids).toContain('penny-quest-submission-fields');
    expect(ids).toContain('penny-career-review-fields');
    expect(ids).toContain('penny-weekly-report-fields');
    expect(ids).toContain('penny-badge-fields');
    expect(ids).toContain('penny-gamification-fields');
    expect(ids).toContain('penny-classroom-nudge-fields');
  });

  test('no Penny field-check entry has requiredFieldsMissing when all fields are present', async () => {
    // Supply the full required field list for every Penny object
    const pennyFieldSets: [string, string[]][] = [
      ['Penny_Trail_Config__c',      ['Trail_ID__c', 'Penny_Role__c', 'Tone__c', 'Focal_Points__c', 'Special_Instructions__c', 'Is_Active__c']],
      ['Penny_Interaction_Log__c',   ['Learner__c', 'User_Message__c', 'Penny_Response__c', 'Prompt_Mode__c', 'Source__c']],
      ['Penny_Quest_Submission__c',  ['Learner__c', 'Submission_Text__c', 'Submitted_At__c']],
      ['Penny_Career_Review__c',     ['Learner__c', 'Area_Scores__c', 'Feedback_JSON__c', 'Readiness_Label__c', 'Review_Mode__c', 'Reviewed_At__c', 'Target_Role__c']],
      ['Penny_Weekly_Report__c',     ['Generated_At__c', 'Top_Themes__c', 'Support_Flags__c', 'Suggested_Actions__c', 'Trail_Breakdown__c', 'Week_Start__c', 'Week_End__c']],
      ['Penny_Badge__c',             ['Learner__c', 'Awarded_By__c']],
      ['Penny_Gamification__c',      ['Learner__c', 'Points__c', 'Sprint_Points__c', 'Sprint_Number__c', 'Reason__c', 'Note__c', 'Awarded_By__c']],
      // Verified against live org (Task #143): Nudge_Type__c/Message__c/Status__c absent
      ['Penny_Classroom_Nudge__c',   ['Course_Work_ID__c', 'Learner__c', 'Nudge_Date__c', 'Sent_At__c']],
    ];
    for (const [obj, fields] of pennyFieldSets) {
      describeOverrides.set(obj, fields);
    }

    const body = await runValidate();

    const pennyCheckIds = [
      'penny-trail-config-fields',
      'penny-interaction-log-fields',
      'penny-quest-submission-fields',
      'penny-career-review-fields',
      'penny-weekly-report-fields',
      'penny-badge-fields',
      'penny-gamification-fields',
      'penny-classroom-nudge-fields',
    ];

    for (const id of pennyCheckIds) {
      const chk = getFieldCheck(body, id);
      expect(chk, `Expected entry for ${id}`).toBeDefined();
      expect(chk!.requiredFieldsMissing, `${id} should have no missing fields`).toHaveLength(0);
      expect(chk!.describeError, `${id} should have no describe error`).toBeNull();
    }
  });
});
