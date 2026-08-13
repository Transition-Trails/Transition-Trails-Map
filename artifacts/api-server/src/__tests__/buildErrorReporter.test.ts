/**
 * buildErrorReporter.test.ts
 *
 * Integration tests for the centralized build-error reporting path.
 *
 * `reportBuildError` is the single function any route or middleware calls to
 * both log an error AND trigger SF case creation for build-required errors.
 * These tests verify the contract: only build-required errors produce a case,
 * and the case service is fired at most once per call.
 *
 * Test matrix:
 *
 *  R1. Build-required error (SQLSTATE 42P01) → createBuildErrorCase called
 *  R2. Generic runtime error (TypeError)      → createBuildErrorCase NOT called
 *  R3. Explicitly flagged error (buildRequired:true) → case created
 *  R4. Same error called twice                → createBuildErrorCase called twice
 *      (deduplication is the service's responsibility; reporter is per-call)
 *  R5. Case service failure does NOT propagate — reportBuildError never throws
 *  R6. Error is always logged regardless of build-required classification
 *  R7. A locally-caught + reported build error triggers exactly one case
 *      (integration: simulates a route catching its own error)
 */

import { describe, test, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../lib/buildErrorCaseService.js', () => ({
  createBuildErrorCase: vi.fn().mockResolvedValue(undefined),
}));

// Provide a plain object logger mock.  The `__buildErrorPatchApplied` guard in
// patchLoggerForBuildErrors checks and sets a property on this same object, so
// each test group that calls the patch must ensure the guard is cleared between
// tests (done in the `logger patch` describe block below).
vi.mock('../lib/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn:  vi.fn(),
    info:  vi.fn(),
  },
}));

// ── Lazy imports ──────────────────────────────────────────────────────────────

import { createBuildErrorCase }    from '../lib/buildErrorCaseService.js';
import { logger }                  from '../lib/logger.js';
import { reportBuildError, patchLoggerForBuildErrors } from '../lib/buildErrorReporter.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Wait for setImmediate callbacks to drain, then drain the microtask queue
 * once more so that promise `.then`/`.catch` chains triggered inside the
 * setImmediate callback also complete before the next assertion.
 */
async function flushImmediate(): Promise<void> {
  await new Promise<void>(resolve => setImmediate(resolve));
  await Promise.resolve(); // drain microtasks produced by the setImmediate callback
}

function pgErr(message: string, sqlstate: string): Error & { code: string } {
  const e = Object.assign(new Error(message), { code: sqlstate });
  e.name = 'error';
  return e as Error & { code: string };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('reportBuildError', () => {
  // Flush pending setImmediate callbacks from the previous test BEFORE clearing
  // mocks, so that async fire-and-forget chains from prior tests do not bleed
  // into the current test's spy call counts.
  beforeEach(async () => {
    await flushImmediate();
    vi.clearAllMocks();
  });

  test('R1: build-required error (SQLSTATE 42P01) → createBuildErrorCase called', async () => {
    const err = pgErr('relation "build_error_logs" does not exist', '42P01');
    reportBuildError(err, 'Migration check failed');
    await flushImmediate();
    expect(createBuildErrorCase).toHaveBeenCalledOnce();
    expect(createBuildErrorCase).toHaveBeenCalledWith(err);
  });

  test('R2: generic TypeError → createBuildErrorCase NOT called', async () => {
    const err = new TypeError("Cannot read properties of undefined (reading 'id')");
    reportBuildError(err, 'Route handler error');
    await flushImmediate();
    expect(createBuildErrorCase).not.toHaveBeenCalled();
  });

  test('R3: err.buildRequired === true → case created', async () => {
    const err = Object.assign(new Error('custom failure'), { buildRequired: true });
    reportBuildError(err, 'Custom build error');
    await flushImmediate();
    expect(createBuildErrorCase).toHaveBeenCalledOnce();
  });

  test('R4: reportBuildError called twice → createBuildErrorCase called twice (dedup is service-level)', async () => {
    const err = pgErr('column "foo" does not exist', '42703');
    reportBuildError(err, 'Attempt 1');
    reportBuildError(err, 'Attempt 2');
    await flushImmediate();
    // Reporter fires once per call; deduplication in service prevents duplicate SF cases
    expect(createBuildErrorCase).toHaveBeenCalledTimes(2);
  });

  test('R5: case service throws → reportBuildError does not throw', async () => {
    (createBuildErrorCase as unknown as MockInstance).mockRejectedValueOnce(new Error('DB down'));
    const err = pgErr('relation "x" does not exist', '42P01');
    // Must not throw — fire-and-forget
    await expect(async () => {
      reportBuildError(err, 'Should not throw');
      await flushImmediate();
    }).not.toThrow();
  });

  test('R6: error is always logged regardless of classification', async () => {
    const buildErr  = pgErr('relation "x" does not exist', '42P01');
    const routineErr = new TypeError('null reference');

    reportBuildError(buildErr,   'build error');
    reportBuildError(routineErr, 'routine error');

    await flushImmediate();
    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  test('R7: locally-caught route error → exactly one case filed (simulated route)', async () => {
    // Simulates a route handler that catches an error locally and calls reportBuildError.
    // This proves caught errors DO trigger case creation without needing the Express
    // global error handler to see the error.
    let casesCreated = 0;
    (createBuildErrorCase as unknown as MockInstance).mockImplementation(async () => {
      casesCreated++;
    });

    // Simulate route catching its own DB error
    async function simulatedRoute() {
      try {
        throw pgErr('relation "programs" does not exist', '42P01');
      } catch (err) {
        reportBuildError(err, 'simulatedRoute: DB query failed');
        // route returns 500 locally — error never reaches Express error handler
      }
    }

    await simulatedRoute();
    await flushImmediate();

    expect(casesCreated).toBe(1);
  });
});

// ── Logger patch integration tests ────────────────────────────────────────────
//
// These tests exercise `patchLoggerForBuildErrors()`, which wraps logger.error
// so that ALL existing caller sites (routes, middleware, startup code) get
// automatic case filing without any code changes at those sites.
//
// Test matrix:
//
//  P1. patchLoggerForBuildErrors() → logger.error with SQLSTATE err fires case
//  P2. patchLoggerForBuildErrors() → logger.error with plain TypeError does NOT fire
//  P3. Patch is idempotent — calling it twice does not double-fire
//  P4. An existing-route-style logger.error({ err }) call (simulating homebase.ts /
//      programs.ts error handlers) triggers exactly one case

describe('logger patch (patchLoggerForBuildErrors)', () => {
  // Save the original mock logger.error before the patch mutates it.
  // Each test restores it so subsequent tests start clean.
  let savedLoggerError: typeof logger.error;

  beforeEach(async () => {
    await flushImmediate();
    vi.clearAllMocks();
    savedLoggerError = logger.error;
    // Clear the idempotency flag so each test gets a fresh patch.
    delete (logger as unknown as Record<string, unknown>)['__buildErrorPatchApplied'];
  });

  afterEach(() => {
    // Restore the original mock error method and clear the patch flag.
    (logger as unknown as Record<string, unknown>)['error'] = savedLoggerError;
    delete (logger as unknown as Record<string, unknown>)['__buildErrorPatchApplied'];
  });

  test('P1: patched logger.error with SQLSTATE 42P01 error → createBuildErrorCase called', async () => {
    patchLoggerForBuildErrors();
    const err = pgErr('relation "build_error_logs" does not exist', '42P01');

    logger.error({ err }, 'programs route: DB query failed');
    await flushImmediate();

    expect(createBuildErrorCase).toHaveBeenCalledOnce();
    expect(createBuildErrorCase).toHaveBeenCalledWith(err);
  });

  test('P2: patched logger.error with plain TypeError → createBuildErrorCase NOT called', async () => {
    patchLoggerForBuildErrors();
    const err = new TypeError("Cannot read properties of undefined (reading 'userId')");

    logger.error({ err }, 'homebase route: unexpected error');
    await flushImmediate();

    expect(createBuildErrorCase).not.toHaveBeenCalled();
  });

  test('P3: calling patchLoggerForBuildErrors twice is idempotent — case fires exactly once', async () => {
    patchLoggerForBuildErrors();
    patchLoggerForBuildErrors(); // second call should be a no-op
    const err = pgErr('column "sf_case_id" does not exist', '42703');

    logger.error({ err }, 'moduleDrafts route: DB fetch failed');
    await flushImmediate();

    expect(createBuildErrorCase).toHaveBeenCalledTimes(1);
  });

  test('P4: simulated existing route logger.error call — exactly one case pipeline invocation', async () => {
    patchLoggerForBuildErrors();
    let pipelineInvocations = 0;
    (createBuildErrorCase as unknown as MockInstance).mockImplementation(async () => {
      pipelineInvocations++;
    });

    // This directly replicates the pattern used in routes like homebase.ts and programs.ts:
    //   logger.error({ err }, 'some message')
    // — no call to reportBuildError; the patch handles it automatically.
    async function existingRouteHandler() {
      try {
        throw pgErr('relation "program_penny_configs" does not exist', '42P01');
      } catch (err) {
        // Existing route code — only logger.error, no reportBuildError
        logger.error({ err }, 'programs GET /penny-config: DB query failed');
        // Route returns 500 locally without passing to Express error handler
      }
    }

    await existingRouteHandler();
    await flushImmediate();

    expect(pipelineInvocations).toBe(1);
  });
});
