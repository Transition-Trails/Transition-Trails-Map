/**
 * buildErrorCaseService.test.ts
 *
 * Integration-style tests for the build-error case service.
 *
 * Strategy: mock the three external dependencies (DB, Salesforce client, LLM)
 * and exercise the service logic end-to-end, including the atomic INSERT ON
 * CONFLICT DO NOTHING deduplication path.
 *
 * Test matrix:
 *
 *  Atomic deduplication
 *   D1. First occurrence (insert returns 1 row) → proceeds to LLM + SF + update
 *   D2. Duplicate (insert returns 0 rows via conflict) → skips LLM + SF entirely
 *   D3. Concurrent invocations: only the first insert succeeds; second is a no-op
 *
 *  SF case creation
 *   S1. SF client returns id → sfCaseId stored via DB update
 *   S2. SF client throws → sfCaseId is null but update is still called
 *   S3. orgBaseUrl is persisted via DB update when SF client provides it
 *
 *  LLM resolution plan
 *   L1. LLM responds → resolutionPlan stored via DB update
 *   L2. LLM throws → resolutionPlan is null but outer function does not throw
 *
 *  Error shape
 *   E1. Works with a plain Error object
 */

import { describe, test, expect, vi, beforeEach, type MockInstance } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@workspace/db', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../lib/llm/index.js', () => ({
  callLLM: vi.fn(),
}));

vi.mock('../lib/connectorSalesforceClient.js', () => ({
  ConnectorSalesforceClient: vi.fn(),
}));

vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const fetchMock = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ ok: true }),
});
vi.stubGlobal('fetch', fetchMock);

// ── Lazy imports ──────────────────────────────────────────────────────────────

import { db }                       from '@workspace/db';
import { callLLM }                  from '../lib/llm/index.js';
import { ConnectorSalesforceClient } from '../lib/connectorSalesforceClient.js';
import { createBuildErrorCase }     from '../lib/buildErrorCaseService.js';

// ── Mock builders ─────────────────────────────────────────────────────────────

/**
 * Build a chainable Drizzle insert mock.
 *
 * @param conflicted  When true, `returning()` resolves to [] (ON CONFLICT DO NOTHING fired).
 *                    When false, resolves to [{ id: rowId }] (row inserted).
 */
function mockInsert(opts: { conflicted?: boolean; rowId?: number } = {}) {
  const returning = opts.conflicted ? [] : [{ id: opts.rowId ?? 1 }];
  const chain = {
    values:              vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    returning:           vi.fn().mockResolvedValue(returning),
  };
  (db.insert as unknown as MockInstance).mockReturnValue(chain);
  return chain;
}

/**
 * Build a chainable Drizzle update mock.
 */
function mockUpdate() {
  const chain = {
    set:   vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  (db.update as unknown as MockInstance).mockReturnValue(chain);
  return chain;
}

/**
 * Build a mock ConnectorSalesforceClient instance.
 * Uses a `function` keyword (not arrow) so Vitest allows it as a constructor.
 */
function mockSfClient(opts: {
  createId?:     string;
  caseNumber?:   string;
  orgBaseUrl?:   string;
  createThrows?: boolean;
}) {
  const instance = {
    createRecord:  opts.createThrows
      ? vi.fn().mockRejectedValue(new Error('SF unavailable'))
      : vi.fn().mockResolvedValue({ id: opts.createId ?? 'SF_CASE_001', success: true }),
    query:         vi.fn().mockResolvedValue({ records: [{ CaseNumber: opts.caseNumber ?? '00001234' }] }),
    getOrgBaseUrl: vi.fn().mockResolvedValue(opts.orgBaseUrl ?? 'https://myorg.my.salesforce.com'),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ConnectorSalesforceClient as unknown as MockInstance).mockImplementation(function(this: unknown): any {
    return instance;
  });
  return instance;
}

function makeError(name: string, message: string): Error {
  const e = new Error(message);
  e.name  = name;
  return e;
}

const LLM_OK = { text: '1. Check schema\n2. Redeploy\n3. Clear cache', provider: 'gemini' as const, model: 'gemini-2.5-flash' };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('createBuildErrorCase — atomic deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (callLLM as unknown as MockInstance).mockResolvedValue(LLM_OK);
    fetchMock.mockResolvedValue({ json: () => Promise.resolve({ ok: true }) });
  });

  test('D1: first occurrence — insert succeeds → LLM + SF called, then update', async () => {
    const ins = mockInsert({ rowId: 42 });
    const upd = mockUpdate();
    mockSfClient({});

    await createBuildErrorCase(makeError('DrizzleError', 'schema mismatch'));

    // Insert was attempted
    expect(ins.onConflictDoNothing).toHaveBeenCalledOnce();
    expect(ins.returning).toHaveBeenCalledOnce();
    // LLM was called (first occurrence proceeds)
    expect(callLLM).toHaveBeenCalledOnce();
    // Update was called with SF case details
    expect(upd.set).toHaveBeenCalledOnce();
  });

  test('D2: duplicate (conflict) — insert returns [] → LLM + SF NOT called', async () => {
    mockInsert({ conflicted: true });
    const upd = mockUpdate();
    mockSfClient({});

    await createBuildErrorCase(makeError('DrizzleError', 'schema mismatch'));

    // LLM must NOT be called for a duplicate
    expect(callLLM).not.toHaveBeenCalled();
    // Update must NOT be called either
    expect(upd.set).not.toHaveBeenCalled();
  });

  test('D3: concurrent invocations — only one proceeds (atomic conflict simulation)', async () => {
    // Simulate two concurrent calls: first insert succeeds, second conflicts.
    let callCount = 0;
    (db.insert as unknown as MockInstance).mockImplementation(() => {
      callCount++;
      const succeeds = callCount === 1; // only first call wins
      const returning = succeeds ? [{ id: callCount }] : [];
      return {
        values:              vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning:           vi.fn().mockResolvedValue(returning),
      };
    });
    const upd = mockUpdate();
    mockSfClient({});

    // Fire two concurrent invocations for the exact same error
    await Promise.all([
      createBuildErrorCase(makeError('DrizzleError', 'schema mismatch')),
      createBuildErrorCase(makeError('DrizzleError', 'schema mismatch')),
    ]);

    // callLLM should be called exactly once — only the first claimant proceeds
    expect(callLLM).toHaveBeenCalledTimes(1);
    // update should be called exactly once
    expect(upd.set).toHaveBeenCalledTimes(1);
  });
});

describe('createBuildErrorCase — SF case creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (callLLM as unknown as MockInstance).mockResolvedValue(LLM_OK);
    fetchMock.mockResolvedValue({ json: () => Promise.resolve({ ok: true }) });
  });

  test('S1: SF client returns id → sfCaseId stored in DB update', async () => {
    mockInsert({ rowId: 10 });
    const upd = mockUpdate();
    mockSfClient({ createId: 'SF_CASE_ABC', caseNumber: '00005678' });

    await createBuildErrorCase(makeError('DrizzleError', 'schema mismatch'));

    const setCall = upd.set.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setCall['sfCaseId']).toBe('SF_CASE_ABC');
    expect(setCall['sfCaseNumber']).toBe('00005678');
  });

  test('S2: SF client throws → sfCaseId is null but update is still called', async () => {
    mockInsert({ rowId: 11 });
    const upd = mockUpdate();
    mockSfClient({ createThrows: true });

    await createBuildErrorCase(makeError('DrizzleError', 'schema mismatch'));

    const setCall = upd.set.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setCall['sfCaseId']).toBeNull();
    expect(upd.set).toHaveBeenCalledOnce(); // update still fires
  });

  test('S3: orgBaseUrl is persisted in the DB update', async () => {
    mockInsert({ rowId: 12 });
    const upd = mockUpdate();
    mockSfClient({ orgBaseUrl: 'https://myorg.lightning.force.com' });

    await createBuildErrorCase(makeError('DrizzleError', 'schema mismatch'));

    const setCall = upd.set.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setCall['sfOrgBaseUrl']).toBe('https://myorg.lightning.force.com');
  });
});

describe('createBuildErrorCase — LLM resolution plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue({ json: () => Promise.resolve({ ok: true }) });
  });

  test('L1: LLM responds → resolutionPlan stored in DB update', async () => {
    mockInsert({ rowId: 20 });
    const upd = mockUpdate();
    mockSfClient({});
    (callLLM as unknown as MockInstance).mockResolvedValue({
      text: '1. Run migrations\n2. Check env vars\n3. Restart server',
      provider: 'gemini',
      model:    'gemini-2.5-flash',
    });

    await createBuildErrorCase(makeError('DrizzleError', 'schema mismatch'));

    const setCall = upd.set.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setCall['resolutionPlan']).toContain('Run migrations');
  });

  test('L2: LLM throws → resolutionPlan is null, outer function does not throw', async () => {
    mockInsert({ rowId: 21 });
    const upd = mockUpdate();
    mockSfClient({});
    (callLLM as unknown as MockInstance).mockRejectedValue(new Error('LLM quota exceeded'));

    await expect(
      createBuildErrorCase(makeError('DrizzleError', 'schema mismatch'))
    ).resolves.toBeUndefined();

    const setCall = upd.set.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setCall['resolutionPlan']).toBeNull();
  });
});

describe('createBuildErrorCase — error shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (callLLM as unknown as MockInstance).mockResolvedValue(LLM_OK);
    fetchMock.mockResolvedValue({ json: () => Promise.resolve({ ok: true }) });
  });

  test('E1: works with a plain Error object', async () => {
    mockInsert({ rowId: 30 });
    mockUpdate();
    mockSfClient({});

    const err = new Error('DATABASE_URL must be set');
    err.name  = 'Error';
    await expect(createBuildErrorCase(err)).resolves.toBeUndefined();
    expect(callLLM).toHaveBeenCalledOnce();
  });
});
