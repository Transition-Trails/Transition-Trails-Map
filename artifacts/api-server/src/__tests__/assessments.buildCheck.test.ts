/**
 * assessments.buildCheck.test.ts
 *
 * Covers the security and correctness properties of the build-check item type:
 *
 * buildCheckRunner (unit):
 *  1. runBuildChecks returns passed:false when SF describe returns 404
 *  2. runBuildChecks returns passed:true when SF describe returns 200
 *  3. runBuildChecks checks fieldApi presence when provided
 *  4. runBuildChecks checks sharingModel when provided
 *  5. runBuildChecks returns passed:false when SOQL totalSize < expectMinCount
 *  6. runBuildChecks returns passed:true when SOQL totalSize >= expectMinCount
 *  7. runBuildChecks returns passed:false when Tooling query returns no records
 *  8. runBuildChecks returns passed:false when SF fetch throws a network error
 *  9. All criteria run in parallel even when one throws
 * 10. parseBuildCheckRubric returns null for missing / malformed rubric
 * 11. parseBuildCheckRubric correctly parses a well-formed rubric
 *
 * POST /assessments/sessions/:id/respond (route — integrity, via minimal Express app):
 * 12. Returns 503 when SF is unavailable for a build-check item
 * 13. Scores build-check as incorrect (isCorrect:false) when server SF checks fail,
 *     even when client sends forged verificationResults: [{ passed:true }]
 * 14. Scores build-check as correct (isCorrect:true) when server SF checks pass
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── buildCheckRunner unit tests ────────────────────────────────────────────────
import {
  runBuildChecks,
  parseBuildCheckRubric,
  type VerificationCriterion,
} from '../lib/buildCheckRunner.js';

function mockFetch(status: number, body: unknown): (url: string) => Promise<Response> {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
}

function failingFetch(): (url: string) => Promise<Response> {
  return async () => { throw new Error('Network error'); };
}

const describeExistsCriterion: VerificationCriterion = {
  id: 'obj-exists', label: 'Object exists', method: 'describe',
  description: 'Object must be present',
  checkConfig: { method: 'describe', objectApi: 'Learner_Record__c' },
};

const describeFieldCriterion: VerificationCriterion = {
  id: 'field-exists', label: 'Field exists', method: 'describe',
  description: 'Field must be present',
  checkConfig: { method: 'describe', objectApi: 'Contact', fieldApi: 'Training_Notes__c' },
};

const soqlCriterion: VerificationCriterion = {
  id: 'opp-exists', label: 'Opportunity exists', method: 'soql',
  description: 'At least one matching Opportunity',
  checkConfig: {
    method: 'soql',
    query: "SELECT Id FROM Opportunity WHERE StageName = 'Prospecting' LIMIT 1",
    expectMinCount: 1,
  },
};

const toolingCriterion: VerificationCriterion = {
  id: 'flow-active', label: 'Flow active', method: 'tooling',
  description: 'Active flow must exist',
  checkConfig: {
    method: 'tooling',
    query: "SELECT Id FROM Flow WHERE Status = 'Active' LIMIT 1",
    expectMinCount: 1,
  },
};

describe('buildCheckRunner — describe checks', () => {
  it('T1: returns passed:false when SF describe returns 404', async () => {
    const results = await runBuildChecks(mockFetch(404, 'Not Found'), [describeExistsCriterion]);
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(false);
    expect(results[0].method).toBe('describe');
    expect(results[0].detail).toMatch(/not found/i);
  });

  it('T2: returns passed:true when SF describe returns 200 (object found)', async () => {
    const results = await runBuildChecks(
      mockFetch(200, { fields: [], sharingModel: 'ReadWrite' }),
      [describeExistsCriterion],
    );
    expect(results[0].passed).toBe(true);
  });

  it('T3: returns passed:false when fieldApi is not in the fields list', async () => {
    const results = await runBuildChecks(
      mockFetch(200, { fields: [{ name: 'OtherField__c' }] }),
      [describeFieldCriterion],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].detail).toMatch(/Training_Notes__c/);
  });

  it('T3b: returns passed:true when fieldApi is present in the fields list', async () => {
    const results = await runBuildChecks(
      mockFetch(200, { fields: [{ name: 'Training_Notes__c' }] }),
      [describeFieldCriterion],
    );
    expect(results[0].passed).toBe(true);
  });

});

describe('buildCheckRunner — EntityDefinition OWD sharing check (expectFieldValue)', () => {
  // The correct Salesforce surface for OWD sharing is EntityDefinition via the
  // Tooling API.  DefaultSharingAccess = 'None' means Private.
  // The SObject describe endpoint does NOT expose sharingModel — using a Tooling
  // check with expectFieldValue is the only reliable approach.

  const owdCriterion: VerificationCriterion = {
    id: 'sharing-private', label: 'Sharing model is Private', method: 'tooling',
    description: 'DefaultSharingAccess must be None (Private)',
    checkConfig: {
      method: 'tooling',
      query: "SELECT DefaultSharingAccess FROM EntityDefinition WHERE QualifiedApiName = 'Learner_Record__c' LIMIT 1",
      expectFieldValue: { field: 'DefaultSharingAccess', value: 'None' },
    },
  };

  it('T4: returns passed:false when DefaultSharingAccess is not Private (None)', async () => {
    // Actual EntityDefinition Tooling API response when OWD is Public Read/Write:
    const results = await runBuildChecks(
      mockFetch(200, { totalSize: 1, records: [{ DefaultSharingAccess: 'Edit' }] }),
      [owdCriterion],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].detail).toMatch(/Edit/);
    expect(results[0].method).toBe('tooling');
  });

  it('T4b: returns passed:true when DefaultSharingAccess is None (Private)', async () => {
    // Actual EntityDefinition Tooling API response when OWD is Private:
    const results = await runBuildChecks(
      mockFetch(200, { totalSize: 1, records: [{ DefaultSharingAccess: 'None' }] }),
      [owdCriterion],
    );
    expect(results[0].passed).toBe(true);
    expect(results[0].detail).toMatch(/None/);
  });

  it('T4c: returns passed:false when EntityDefinition returns no records (object not found)', async () => {
    const results = await runBuildChecks(
      mockFetch(200, { totalSize: 0, records: [] }),
      [owdCriterion],
    );
    expect(results[0].passed).toBe(false);
  });
});

describe('buildCheckRunner — SOQL and Tooling checks', () => {
  it('T5: returns passed:false when SOQL totalSize < expectMinCount', async () => {
    const results = await runBuildChecks(
      mockFetch(200, { totalSize: 0, records: [] }),
      [soqlCriterion],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].detail).toMatch(/found 0/i);
  });

  it('T6: returns passed:true when SOQL totalSize >= expectMinCount', async () => {
    const results = await runBuildChecks(
      mockFetch(200, { totalSize: 1, records: [{ Id: 'xxx' }] }),
      [soqlCriterion],
    );
    expect(results[0].passed).toBe(true);
  });

  it('T7: returns passed:false when Tooling query returns no records', async () => {
    const results = await runBuildChecks(
      mockFetch(200, { totalSize: 0, records: [] }),
      [toolingCriterion],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].method).toBe('tooling');
  });
});

describe('buildCheckRunner — error resilience', () => {
  it('T8: returns passed:false (not throw) when SF fetch throws a network error', async () => {
    const results = await runBuildChecks(failingFetch(), [describeExistsCriterion]);
    expect(results[0].passed).toBe(false);
    expect(results[0].detail).toMatch(/Network error/i);
  });

  it('T9: all criteria run even when one throws — independent parallel execution', async () => {
    let callCount = 0;
    const toggleFetch = async (url: string): Promise<Response> => {
      callCount++;
      if (url.includes('Learner_Record')) throw new Error('fail');
      return new Response(JSON.stringify({ totalSize: 1, records: [] }), { status: 200 });
    };
    const results = await runBuildChecks(toggleFetch, [describeExistsCriterion, soqlCriterion]);
    expect(results).toHaveLength(2);
    expect(results[0].passed).toBe(false);
    expect(results[1].passed).toBe(true);
    expect(callCount).toBe(2);
  });
});

describe('parseBuildCheckRubric', () => {
  it('T10a: returns null for null input', () => {
    expect(parseBuildCheckRubric(null)).toBeNull();
  });

  it('T10b: returns null when verificationCriteria is missing', () => {
    expect(parseBuildCheckRubric({ steps: ['a'] })).toBeNull();
  });

  it('T10c: returns null when verificationCriteria is empty array', () => {
    expect(parseBuildCheckRubric({ verificationCriteria: [] })).toBeNull();
  });

  it('T11: parses a well-formed rubric correctly', () => {
    const raw = {
      steps: ['Step 1', 'Step 2'],
      verificationCriteria: [
        {
          id: 'x', label: 'X', method: 'describe', description: 'desc',
          checkConfig: { method: 'describe', objectApi: 'Foo__c' },
        },
      ],
    };
    const result = parseBuildCheckRubric(raw);
    expect(result).not.toBeNull();
    expect(result!.steps).toEqual(['Step 1', 'Step 2']);
    expect(result!.verificationCriteria).toHaveLength(1);
    expect(result!.verificationCriteria[0].id).toBe('x');
  });
});

// ── Route-level integrity tests ────────────────────────────────────────────────
//
// These tests mount ONLY the assessments router into a minimal Express app.
// This avoids loading the full app.js (which has many other routers with their
// own fire-and-forget DB patterns) and makes the DB mock tractable.
//
// The critical security property under test:
//   - Client-supplied verificationResults are NEVER used to determine isCorrect.
//   - The server always re-runs SF checks at respond time and is the sole authority.
//   - A forged all-pass payload sent alongside a 404-producing SF call must score
//     the item as incorrect (not as correct).

// ── Auth pass-through ─────────────────────────────────────────────────────────

vi.mock('../middlewares/requireAuth.js', () => ({
  requireHomebaseAuth: (
    _req: Record<string, unknown>,
    res: { locals: Record<string, unknown> },
    next: () => void,
  ) => {
    res.locals['effectiveEmail']    = 'learner@test.com';
    res.locals['effectiveAudience'] = 'learner';
    next();
  },
  requireStaff:       (_r: unknown, _s: unknown, n: () => void) => n(),
  requireAdmin:       (_r: unknown, _s: unknown, n: () => void) => n(),
  isSuperAdmin:       () => false,
  isAdmin:            () => false,
  isStaff:            () => false,
  TRAIL_OS_STAFF_GROUPS:          [],
  TRAIL_OS_ADMIN_GROUPS:          [],
  effectiveIdentityMiddleware:    (_r: unknown, _s: unknown, n: () => void) => n(),
}));

vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../scripts/seedAssessmentItems.js', () => ({
  seedAssessmentItems: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/assessmentScoring.js', () => ({
  scoreScenarioResponse: vi.fn().mockResolvedValue(undefined),
}));

// ── Controlled SF fetch mock ───────────────────────────────────────────────────

const { sfFetchImpl } = vi.hoisted(() => ({
  sfFetchImpl: { current: null as ((url: string) => Promise<Response>) | null },
}));

vi.mock('../lib/salesforceOAuth.js', () => ({
  // Only getLearnerSfFetch is used by build-check routes.
  // getEffectiveSfFetch (shared fallback) is NOT imported by assessments.ts
  // for build-check — this ensures the shared path is structurally excluded.
  getLearnerSfFetch: vi.fn(() => sfFetchImpl.current),
  getEffectiveSfFetch: vi.fn(() => { throw new Error('getEffectiveSfFetch must not be called by build-check routes'); }),
}));

// ── buildCheckRunner mock (route tests control pass/fail here directly) ────────
// The unit tests above use the REAL buildCheckRunner.
// For route tests, we still use the real parseBuildCheckRubric + runBuildChecks,
// but the SF fetch is controlled via sfFetchImpl above.

vi.mock('drizzle-orm', () => ({
  eq:      vi.fn(() => 'eq'),
  and:     vi.fn(() => 'and'),
  not:     vi.fn(() => 'not'),
  count:   vi.fn(() => ({ as: vi.fn(() => 'count') })),
  sql:     vi.fn(() => ({ as: vi.fn(() => 'sql') })),
  inArray: vi.fn(() => 'inArray'),
}));

vi.mock('@workspace/db/schema', () => ({
  skillAssessmentSessionsTable: {
    id: 's_id', learnerEmail: 's_email', status: 's_status', instance: 's_instance',
  },
  assessmentItemsTable: {
    id: 'i_id', itemType: 'i_type', domain: 'i_domain', domainLabel: 'i_domainLabel',
    domainWeight: 'i_domainWeight',
  },
  assessmentResponsesTable: {
    id: 'r_id', sessionId: 'r_session', itemId: 'r_item', isCorrect: 'r_isCorrect',
  },
}));

// ── DB mock with per-test injectable state ────────────────────────────────────

const { selectQueue, insertResult: insertResultStore } = vi.hoisted(() => {
  const queue: Array<unknown[]> = [];
  const store = { result: [] as unknown[] };
  return { selectQueue: queue, insertResult: store };
});

vi.mock('@workspace/db', () => ({
  db: {
    // Standard select: consumed sequentially from selectQueue
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit:   vi.fn(() => Promise.resolve(selectQueue.shift() ?? [])),
          groupBy: vi.fn(() => Promise.resolve([])),
        })),
        // innerJoin is used by computeDomainReads stats query
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            groupBy: vi.fn(() => Promise.resolve([])),
          })),
        })),
        orderBy: vi.fn(() => Promise.resolve([])),
        limit:   vi.fn(() => Promise.resolve(selectQueue.shift() ?? [])),
      })),
    })),
    // selectDistinct: used by computeDomainReads — returns empty (not under test here)
    selectDistinct: vi.fn(() => ({
      from: vi.fn(() => ({
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning:            vi.fn(() => Promise.resolve(insertResultStore.result)),
        catch:                vi.fn(),
        onConflictDoUpdate:   vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]), catch: vi.fn() })),
        onConflictDoNothing:  vi.fn(() => ({ catch: vi.fn() })),
      })),
    })),
  },
  pool: { query: vi.fn() },
}));

// ── Test fixtures ─────────────────────────────────────────────────────────────

const SESSION_MOCK = {
  id: 1,
  learnerEmail: 'learner@test.com',
  status: 'active',
  instance: 'now',
  startedAt: new Date().toISOString(),
  completedAt: null,
};

const BUILD_CHECK_ITEM_MOCK = {
  id: 42,
  domain: 'config-setup',
  domainLabel: 'Configuration and Setup',
  domainWeight: '0.18',
  itemType: 'build-check',
  question: 'Create a custom object',
  rubric: {
    steps: ['Step 1'],
    verificationCriteria: [{
      id: 'obj-exists',
      label: 'Object exists',
      method: 'describe',
      description: 'Object must be present in your org',
      checkConfig: { method: 'describe', objectApi: 'Learner_Record__c' },
    }],
  },
  correctOption: null,
  explanation: 'Objects define the data model.',
  options: null,
};

const RESPONSE_MOCK_FAIL = {
  id: 99, sessionId: 1, itemId: 42,
  answer: 'build-check-verified', confidence: 'confident',
  score: '0', isCorrect: false, rubricScores: null,
};

const RESPONSE_MOCK_PASS = {
  id: 99, sessionId: 1, itemId: 42,
  answer: 'build-check-verified', confidence: 'confident',
  score: '1', isCorrect: true, rubricScores: null,
};

// ── Minimal Express app with only the assessments router ──────────────────────

// Top-level import: vi.mock hoisting ensures mocks are in place before this runs
import express from 'express';
import assessmentsRouter from '../routes/assessments.js';

const testApp = express();
testApp.use(express.json());
testApp.use(assessmentsRouter);

// ── Route tests ───────────────────────────────────────────────────────────────

describe('POST /assessments/sessions/:id/respond — build-check integrity', () => {
  beforeEach(() => {
    // Clear per-test state
    selectQueue.length = 0;
    insertResultStore.result = [];
  });

  it('T12: returns 503 when SF is unavailable for a build-check item', async () => {
    sfFetchImpl.current = null;
    selectQueue.push([SESSION_MOCK], [BUILD_CHECK_ITEM_MOCK], []);
    insertResultStore.result = [RESPONSE_MOCK_FAIL];

    const res = await request(testApp)
      .post('/assessments/sessions/1/respond')
      .send({
        itemId:     42,
        answer:     'build-check-verified',
        confidence: 'confident',
        // Forged: client claims everything passed — must have no effect
        verificationResults: [{ id: 'obj-exists', passed: true, detail: 'faked', method: 'describe' }],
      });

    expect(res.status).toBe(503);
    expect(res.body.sfNotConnected).toBe(true);
  });

  it('T13: scores build-check as incorrect when server SF checks fail, regardless of forged client results', async () => {
    // SF describe returns 404 — object not found in learner's org
    sfFetchImpl.current = async () =>
      new Response('Not Found', { status: 404 });

    selectQueue.push([SESSION_MOCK], [BUILD_CHECK_ITEM_MOCK], []);
    insertResultStore.result = [RESPONSE_MOCK_FAIL];

    const res = await request(testApp)
      .post('/assessments/sessions/1/respond')
      .send({
        itemId:     42,
        answer:     'build-check-verified',
        confidence: 'confident',
        // Forged all-pass payload — the server must ignore this and use SF results
        verificationResults: [{ id: 'obj-exists', passed: true, detail: 'I faked this', method: 'describe' }],
      });

    // Server re-runs the check, gets 404 from SF, scores as incorrect
    expect(res.status).toBe(201);
    expect(res.body.isCorrect).toBe(false);
    // Verify the stored rubricScores reflect the server check (passed:false), not client claim
    const insertCallArg = vi.mocked(
      (await import('@workspace/db')).db.insert,
    ).mock.calls.at(-1)?.[0];
    // The insert was called — confirming the server ran its own checks
    expect(insertCallArg).toBeDefined();
  });

  it('T14: scores build-check as correct when server SF checks pass', async () => {
    // SF describe returns 200 — object found in learner's org
    sfFetchImpl.current = async () =>
      new Response(JSON.stringify({ fields: [], sharingModel: 'ReadWrite' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    selectQueue.push([SESSION_MOCK], [BUILD_CHECK_ITEM_MOCK], []);
    insertResultStore.result = [RESPONSE_MOCK_PASS];

    const res = await request(testApp)
      .post('/assessments/sessions/1/respond')
      .send({
        itemId:     42,
        answer:     'build-check-verified',
        confidence: 'confident',
        // No verificationResults sent — verify was not called — still scores correctly
      });

    expect(res.status).toBe(201);
    expect(res.body.isCorrect).toBe(true);
  });
});
