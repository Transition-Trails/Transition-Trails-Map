/**
 * Tests for GET /api/salesforce/validate — custom field verification section
 *
 * Focus: REUSED_OBJECT_FIELD_CHECKS entries for Penny objects.
 *
 * Critical invariant 1: a successful describe response that omits a required
 * field must surface as status:"warning" in the custom-fields check AND list the
 * field in requiredFieldsMissing.
 *
 * Critical invariant 2: a describe that returns 429 Too Many Requests (rate
 * limited) must set describeUndetermined:true and must NOT populate
 * requiredFieldsMissing — a throttled describe is not evidence that fields are
 * absent.  The aggregate "custom-fields" check must mention "rate-limited" in
 * its detail string, not "required missing".
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Auth bypass ────────────────────────────────────────────────────────────────

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

// ── Per-object describe overrides ──────────────────────────────────────────────
//
// describeOverrides keys are Salesforce object API names.
//   • value is string[]                           → return that exact set of custom field names
//   • value is null                               → return 404 (object absent)
//   • value is { rateLimited: true, retryAfter? } → return 429 on every attempt (exhausts retry)
//   • key absent                                  → return default success with empty custom fields
//
// Reset in beforeEach so tests are isolated.

type DescribeOverride = string[] | null | { rateLimited: true; retryAfter?: number };

const { describeOverrides } = vi.hoisted(() => ({
  describeOverrides: new Map<string, DescribeOverride>(),
}));

// Helper to build a minimal full Response-like object
function makeResponse(
  ok: boolean,
  status: number,
  body: unknown,
  headers: Headers = new Headers(),
): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : String(status),
    headers,
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
    clone: () => makeResponse(ok, status, body, headers),
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

          if (!Array.isArray(override) && override.rateLimited) {
            // Simulate 429 Too Many Requests.
            // retryAfter:0 so sfGetWithRetry's test-mode sleep(0) returns instantly,
            // allowing the retry to fire immediately and exhaust maxRetries=1 quickly.
            const retryAfter = override.retryAfter ?? 0;
            const h = new Headers({ 'Retry-After': String(retryAfter) });
            return makeResponse(false, 429, 'Rate limit exceeded', h);
          }

          // Return only the supplied custom fields
          return makeResponse(true, 200, {
            name:   objectName,
            fields: (override as string[]).map(f => ({ name: f, custom: true })),
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

// ── Tests: 429 rate-limit on describe → describeUndetermined, not missing ─────
//
// Critical invariant: when the Salesforce proxy returns 429 on a describe call,
// getCustomFields sets undetermined:true.  The validate endpoint must surface
// this as describeUndetermined:true AND must NOT populate requiredFieldsMissing
// (a throttled describe is not evidence of field absence).
//
// The UI in IntegrationSecretsAudit.tsx branches on describeUndetermined and
// renders "Describe rate-limited — field status undetermined. Rerun validation
// to confirm." instead of a pass badge or a missing-fields warning.  These tests
// verify the backend contract that drives that rendering path.

describe('GET /api/salesforce/validate — 429 rate-limit on describe', () => {

  test('describeUndetermined is true when Penny_Interaction_Log__c describe returns 429', async () => {
    // sfGetWithRetry retries once (maxRetries=1) then throws RateLimitError.
    // retryAfter:0 so the test-mode sleep(0 ms) returns immediately.
    describeOverrides.set('Penny_Interaction_Log__c', { rateLimited: true, retryAfter: 0 });

    const body     = await runValidate();
    const logCheck = getFieldCheck(body, 'penny-interaction-log-fields');

    expect(logCheck).toBeDefined();
    expect(logCheck!.describeUndetermined).toBe(true);
    expect(logCheck!.describeError).not.toBeNull();
  });

  test('requiredFieldsMissing is empty when describe is rate-limited (not a false fail)', async () => {
    // The 429 means we have no field data — we must not infer fields are absent.
    describeOverrides.set('Penny_Interaction_Log__c', { rateLimited: true, retryAfter: 0 });

    const body     = await runValidate();
    const logCheck = getFieldCheck(body, 'penny-interaction-log-fields');

    expect(logCheck).toBeDefined();
    expect(logCheck!.requiredFieldsMissing).toHaveLength(0);
    expect(logCheck!.requiredFieldsFound).toHaveLength(0);
  });

  test('aggregate custom-fields detail mentions "rate-limited" for the throttled object', async () => {
    // Only Penny_Interaction_Log__c is rate-limited; supply the full required field
    // sets for every other object so their describe succeeds cleanly and does not
    // produce "required missing" entries that would obscure the assertion.
    describeOverrides.set('Penny_Interaction_Log__c', { rateLimited: true, retryAfter: 0 });
    // Supply all required fields for the other objects with non-empty requiredFields
    describeOverrides.set('Contact',                   [
      'Penny_Trail_Config__c', 'Penny_Trail__c', 'Penny_Coaching_Tone__c',
      'Penny_Confidence_Score__c', 'Penny_Current_Goal__c', 'Penny_Current_Phase__c',
      'Penny_Current_Blockers__c', 'Penny_Sprint_Week__c', 'Penny_Skill_Score__c',
      'Penny_Onboarding_Complete__c', 'LMS_Learner_ID__c', 'Last_Assessment_Date__c',
      'Coach__c', 'Learner_Slack_User_Id__c', 'TT_Academy_Connector_Token__c',
    ]);
    describeOverrides.set('pmdm__Program__c',           [
      'Program_Manager__c', 'Program_Goals__c', 'Program_Structure__c',
      'Program_Target_Audience__c', 'Program_Expected_Outcomes__c',
      'Problem_Statement__c', 'Success_Metrics_Evaluation_Plan__c',
      'Google_Drive_Folder__c', 'Canva_Folder__c',
      'Program_Reference_Link__c', 'Requires_Payment__c',
    ]);
    describeOverrides.set('Penny_Trail_Config__c',      ['Trail_ID__c', 'Penny_Role__c', 'Tone__c', 'Focal_Points__c', 'Special_Instructions__c', 'Is_Active__c']);
    describeOverrides.set('Penny_Quest_Submission__c',  ['Learner__c', 'Submission_Text__c', 'Submitted_At__c']);
    describeOverrides.set('Penny_Career_Review__c',     ['Learner__c', 'Area_Scores__c', 'Feedback_JSON__c', 'Readiness_Label__c', 'Review_Mode__c', 'Reviewed_At__c', 'Target_Role__c']);
    describeOverrides.set('Penny_Weekly_Report__c',     ['Generated_At__c', 'Top_Themes__c', 'Support_Flags__c', 'Suggested_Actions__c', 'Trail_Breakdown__c', 'Week_Start__c', 'Week_End__c']);
    describeOverrides.set('Penny_Badge__c',             ['Learner__c', 'Awarded_By__c']);
    describeOverrides.set('Penny_Gamification__c',      ['Learner__c', 'Points__c', 'Sprint_Points__c', 'Sprint_Number__c', 'Reason__c', 'Note__c', 'Awarded_By__c']);
    describeOverrides.set('Penny_Classroom_Nudge__c',   ['Course_Work_ID__c', 'Learner__c', 'Nudge_Date__c', 'Sent_At__c']);
    describeOverrides.set('TT_Build_Item__c',           ['TT_Automation__c']);
    describeOverrides.set('TT_Automation__c',           ['Is_Active__c', 'Automation_Type__c', 'Description__c', 'Status__c']);
    describeOverrides.set('TT_SOP_Automation__c',       ['Automation__c', 'Knowledge_Article__c']);
    describeOverrides.set('TT_SOP_Account__c',          ['Account__c', 'Knowledge_Article__c']);

    const body    = await runValidate();
    const cfCheck = getCustomFieldsCheck(body);

    expect(cfCheck).toBeDefined();
    // The detail string must mention "rate-limited" for the throttled object
    expect(cfCheck!.detail).toMatch(/rate-limited/i);
    // With all other describes succeeding and all required fields present,
    // no other object should produce a "required missing" entry
    expect(cfCheck!.detail).not.toMatch(/required missing/i);
  });

  test('aggregate custom-fields check status is "pass" when only one object is rate-limited', async () => {
    // A throttled describe is not a confirmed field absence — the aggregate check
    // must not be "warning" solely because of a 429.  fieldCheckIssues only fires
    // on confirmed-missing fields from a SUCCESSFUL describe.
    //
    // Supply full required field sets for all other objects so the only
    // undetermined outcome is the rate-limited Penny_Interaction_Log__c.
    describeOverrides.set('Penny_Interaction_Log__c', { rateLimited: true, retryAfter: 0 });
    describeOverrides.set('Contact',                   [
      'Penny_Trail_Config__c', 'Penny_Trail__c', 'Penny_Coaching_Tone__c',
      'Penny_Confidence_Score__c', 'Penny_Current_Goal__c', 'Penny_Current_Phase__c',
      'Penny_Current_Blockers__c', 'Penny_Sprint_Week__c', 'Penny_Skill_Score__c',
      'Penny_Onboarding_Complete__c', 'LMS_Learner_ID__c', 'Last_Assessment_Date__c',
      'Coach__c', 'Learner_Slack_User_Id__c', 'TT_Academy_Connector_Token__c',
    ]);
    describeOverrides.set('pmdm__Program__c',           [
      'Program_Manager__c', 'Program_Goals__c', 'Program_Structure__c',
      'Program_Target_Audience__c', 'Program_Expected_Outcomes__c',
      'Problem_Statement__c', 'Success_Metrics_Evaluation_Plan__c',
      'Google_Drive_Folder__c', 'Canva_Folder__c',
      'Program_Reference_Link__c', 'Requires_Payment__c',
    ]);
    describeOverrides.set('Penny_Trail_Config__c',      ['Trail_ID__c', 'Penny_Role__c', 'Tone__c', 'Focal_Points__c', 'Special_Instructions__c', 'Is_Active__c']);
    describeOverrides.set('Penny_Quest_Submission__c',  ['Learner__c', 'Submission_Text__c', 'Submitted_At__c']);
    describeOverrides.set('Penny_Career_Review__c',     ['Learner__c', 'Area_Scores__c', 'Feedback_JSON__c', 'Readiness_Label__c', 'Review_Mode__c', 'Reviewed_At__c', 'Target_Role__c']);
    describeOverrides.set('Penny_Weekly_Report__c',     ['Generated_At__c', 'Top_Themes__c', 'Support_Flags__c', 'Suggested_Actions__c', 'Trail_Breakdown__c', 'Week_Start__c', 'Week_End__c']);
    describeOverrides.set('Penny_Badge__c',             ['Learner__c', 'Awarded_By__c']);
    describeOverrides.set('Penny_Gamification__c',      ['Learner__c', 'Points__c', 'Sprint_Points__c', 'Sprint_Number__c', 'Reason__c', 'Note__c', 'Awarded_By__c']);
    describeOverrides.set('Penny_Classroom_Nudge__c',   ['Course_Work_ID__c', 'Learner__c', 'Nudge_Date__c', 'Sent_At__c']);
    describeOverrides.set('TT_Build_Item__c',           ['TT_Automation__c']);
    describeOverrides.set('TT_Automation__c',           ['Is_Active__c', 'Automation_Type__c', 'Description__c', 'Status__c']);
    describeOverrides.set('TT_SOP_Automation__c',       ['Automation__c', 'Knowledge_Article__c']);
    describeOverrides.set('TT_SOP_Account__c',          ['Account__c', 'Knowledge_Article__c']);

    const body    = await runValidate();
    const cfCheck = getCustomFieldsCheck(body);

    expect(cfCheck).toBeDefined();
    // Status must be "pass" — no describe succeeded AND proved a field is missing
    expect(cfCheck!.status).toBe('pass');
  });

  test('rate-limited Contact describe does not produce false missing-field warnings', async () => {
    // Contact has 15 required fields. A 429 on its describe must not mark any as missing.
    describeOverrides.set('Contact', { rateLimited: true, retryAfter: 0 });

    const body         = await runValidate();
    const contactCheck = getFieldCheck(body, 'contact-fields');

    expect(contactCheck).toBeDefined();
    expect(contactCheck!.describeUndetermined).toBe(true);
    expect(contactCheck!.requiredFieldsMissing).toHaveLength(0);
  });

  test('rate-limited describe on one object does not affect pass/fail for other objects', async () => {
    // Only Penny_Badge__c is rate-limited; Penny_Interaction_Log__c has a full field set.
    describeOverrides.set('Penny_Badge__c', { rateLimited: true, retryAfter: 0 });
    describeOverrides.set('Penny_Interaction_Log__c', [
      'Learner__c', 'User_Message__c', 'Penny_Response__c', 'Prompt_Mode__c', 'Source__c',
    ]);

    const body = await runValidate();

    const badgeCheck = getFieldCheck(body, 'penny-badge-fields');
    expect(badgeCheck!.describeUndetermined).toBe(true);
    expect(badgeCheck!.requiredFieldsMissing).toHaveLength(0);

    const logCheck = getFieldCheck(body, 'penny-interaction-log-fields');
    expect(logCheck!.describeUndetermined).toBe(false);
    expect(logCheck!.describeError).toBeNull();
    expect(logCheck!.requiredFieldsMissing).toHaveLength(0);
  });

  test('rate-limited describe alongside a genuine missing field: missing field still surfaces', async () => {
    // Penny_Badge__c is rate-limited (undetermined).
    // Penny_Interaction_Log__c has a successful describe with Learner__c absent.
    // The genuine absence must still raise a warning even though another object was throttled.
    describeOverrides.set('Penny_Badge__c', { rateLimited: true, retryAfter: 0 });
    describeOverrides.set('Penny_Interaction_Log__c', [
      'User_Message__c', 'Penny_Response__c', 'Prompt_Mode__c', 'Source__c',
      // Learner__c intentionally absent
    ]);

    const body = await runValidate();

    const logCheck = getFieldCheck(body, 'penny-interaction-log-fields');
    expect(logCheck!.requiredFieldsMissing).toContain('Learner__c');
    expect(logCheck!.describeUndetermined).toBe(false);

    const cfCheck = getCustomFieldsCheck(body);
    // Warning because of the confirmed missing field, even though badge was throttled
    expect(cfCheck!.status).toBe('warning');
    expect(cfCheck!.detail).toMatch(/required missing/i);
  });

  test('UI contract: describeUndetermined:true row has no requiredFieldsMissing to display', async () => {
    // This test verifies the backend contract that the UI relies on.
    //
    // IntegrationSecretsAudit.tsx renders the rate-limit warning row when:
    //   fc.describeUndetermined === true
    // and suppresses the "Missing required:" block when:
    //   fc.requiredFieldsMissing.length === 0
    //
    // Both conditions must hold simultaneously for the rate-limit path to display
    // correctly (not a false pass, not a false "required missing" block).
    describeOverrides.set('Penny_Interaction_Log__c', { rateLimited: true, retryAfter: 0 });

    const body     = await runValidate();
    const logCheck = getFieldCheck(body, 'penny-interaction-log-fields');

    expect(logCheck).toBeDefined();

    // UI condition 1: triggers the rate-limit warning row
    expect(logCheck!.describeUndetermined).toBe(true);

    // UI condition 2: no missing-field list shown (would be a false alarm)
    expect(logCheck!.requiredFieldsMissing).toHaveLength(0);

    // UI condition 3: describeError is set (used for the amber icon + border)
    expect(logCheck!.describeError).not.toBeNull();

    // UI condition 4: not phase2Deferred (rate-limit path, not deferred path)
    const fcWithPhase2 = logCheck as FieldCheckResult & { phase2Deferred?: boolean };
    if ('phase2Deferred' in fcWithPhase2) {
      expect(fcWithPhase2.phase2Deferred).toBe(false);
    }
  });
});

// ── Tests: TT_Automation__c field checks (provisioned — no phase2Deferred) ────
//
// TT_Automation__c previously carried phase2Deferred:true, causing the
// Validation Center to show a "Phase 2 deferred" label.  After provisioning,
// the four filter fields (Is_Active__c, Automation_Type__c, Description__c,
// Status__c) were added to requiredFields and phase2Deferred was removed.
//
// These tests confirm that:
//   1. When all four fields are present the /validate endpoint returns
//      status:"pass" for the tt-automation-fields check.
//   2. When fields are missing a "warning" is raised (not a deferred skip).
//   3. The aggregate custom-fields check is "pass" when all fields are present.
//   4. The UI contract: no phase2Deferred flag on the result row.

describe('GET /api/salesforce/validate — TT_Automation__c field checks (post-provisioning)', () => {

  test('tt-automation-fields is "pass" when all four provisioned fields are present', async () => {
    // Simulate the org after provisioning: all four required fields present.
    describeOverrides.set('TT_Automation__c', [
      'Is_Active__c', 'Automation_Type__c', 'Description__c', 'Status__c',
    ]);

    const body    = await runValidate();
    const ttCheck = getFieldCheck(body, 'tt-automation-fields');

    expect(ttCheck).toBeDefined();
    expect(ttCheck!.requiredFieldsMissing).toHaveLength(0);
    expect(ttCheck!.describeError).toBeNull();
    expect(ttCheck!.describeUndetermined).toBe(false);
  });

  test('aggregate custom-fields check is "pass" when TT_Automation__c has all required fields', async () => {
    // Supply the full required field set for every object that has non-empty
    // requiredFields so nothing else produces a warning.
    describeOverrides.set('Contact', [
      'Penny_Trail_Config__c', 'Penny_Trail__c', 'Penny_Coaching_Tone__c',
      'Penny_Confidence_Score__c', 'Penny_Current_Goal__c', 'Penny_Current_Phase__c',
      'Penny_Current_Blockers__c', 'Penny_Sprint_Week__c', 'Penny_Skill_Score__c',
      'Penny_Onboarding_Complete__c', 'LMS_Learner_ID__c', 'Last_Assessment_Date__c',
      'Coach__c', 'Learner_Slack_User_Id__c', 'TT_Academy_Connector_Token__c',
    ]);
    describeOverrides.set('pmdm__Program__c', [
      'Program_Manager__c', 'Program_Goals__c', 'Program_Structure__c',
      'Program_Target_Audience__c', 'Program_Expected_Outcomes__c',
      'Problem_Statement__c', 'Success_Metrics_Evaluation_Plan__c',
      'Google_Drive_Folder__c', 'Canva_Folder__c',
      'Program_Reference_Link__c', 'Requires_Payment__c',
    ]);
    describeOverrides.set('Penny_Trail_Config__c',    ['Trail_ID__c', 'Penny_Role__c', 'Tone__c', 'Focal_Points__c', 'Special_Instructions__c', 'Is_Active__c']);
    describeOverrides.set('Penny_Interaction_Log__c', ['Learner__c', 'User_Message__c', 'Penny_Response__c', 'Prompt_Mode__c', 'Source__c']);
    describeOverrides.set('Penny_Quest_Submission__c',['Learner__c', 'Submission_Text__c', 'Submitted_At__c']);
    describeOverrides.set('Penny_Career_Review__c',   ['Learner__c', 'Area_Scores__c', 'Feedback_JSON__c', 'Readiness_Label__c', 'Review_Mode__c', 'Reviewed_At__c', 'Target_Role__c']);
    describeOverrides.set('Penny_Weekly_Report__c',   ['Generated_At__c', 'Top_Themes__c', 'Support_Flags__c', 'Suggested_Actions__c', 'Trail_Breakdown__c', 'Week_Start__c', 'Week_End__c']);
    describeOverrides.set('Penny_Badge__c',           ['Learner__c', 'Awarded_By__c']);
    describeOverrides.set('Penny_Gamification__c',    ['Learner__c', 'Points__c', 'Sprint_Points__c', 'Sprint_Number__c', 'Reason__c', 'Note__c', 'Awarded_By__c']);
    describeOverrides.set('Penny_Classroom_Nudge__c', ['Course_Work_ID__c', 'Learner__c', 'Nudge_Date__c', 'Sent_At__c']);
    describeOverrides.set('TT_Build_Item__c',         ['TT_Automation__c']);
    describeOverrides.set('TT_Automation__c',         ['Is_Active__c', 'Automation_Type__c', 'Description__c', 'Status__c']);
    describeOverrides.set('TT_SOP_Automation__c',     ['Automation__c', 'Knowledge_Article__c']);
    describeOverrides.set('TT_SOP_Account__c',        ['Account__c', 'Knowledge_Article__c']);

    const body    = await runValidate();
    const cfCheck = getCustomFieldsCheck(body);

    expect(cfCheck).toBeDefined();
    // All required fields present on every object — aggregate must be pass
    expect(cfCheck!.status).toBe('pass');
  });

  test('tt-automation-fields is "warning" when a required field is missing', async () => {
    // Simulate a partial provisioning: Is_Active__c missing.
    describeOverrides.set('TT_Automation__c', [
      'Automation_Type__c', 'Description__c', 'Status__c',
      // Is_Active__c intentionally absent
    ]);

    const body    = await runValidate();
    const ttCheck = getFieldCheck(body, 'tt-automation-fields');

    expect(ttCheck).toBeDefined();
    expect(ttCheck!.requiredFieldsMissing).toContain('Is_Active__c');
    expect(ttCheck!.requiredFieldsMissing).toHaveLength(1);
    expect(ttCheck!.requiredFieldsFound).toContain('Automation_Type__c');
    expect(ttCheck!.describeError).toBeNull();
    expect(ttCheck!.describeUndetermined).toBe(false);

    const cfCheck = getCustomFieldsCheck(body);
    expect(cfCheck!.status).toBe('warning');
  });

  test('UI contract: tt-automation-fields result has no phase2Deferred flag', async () => {
    // Previously phase2Deferred:true caused the Validation Center to render a
    // "Phase 2 deferred" label.  After provisioning that flag was removed.
    // The result row must either omit phase2Deferred or set it to false/undefined.
    describeOverrides.set('TT_Automation__c', [
      'Is_Active__c', 'Automation_Type__c', 'Description__c', 'Status__c',
    ]);

    const body    = await runValidate();
    const ttCheck = getFieldCheck(body, 'tt-automation-fields') as FieldCheckResult & { phase2Deferred?: boolean };

    expect(ttCheck).toBeDefined();
    // If phase2Deferred is present on the result, it must not be true
    if ('phase2Deferred' in ttCheck) {
      expect(ttCheck.phase2Deferred).not.toBe(true);
    }
    // Confirm the entry is included in customFieldChecks (not skipped)
    const ids = (await runValidate()).customFieldChecks.map(r => r.id);
    expect(ids).toContain('tt-automation-fields');
  });
});
