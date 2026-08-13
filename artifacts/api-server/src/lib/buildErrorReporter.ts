/**
 * buildErrorReporter.ts
 *
 * Centralized build-error reporting path.
 *
 * Two integration styles are provided so ALL existing and future logging paths
 * are covered with minimal code changes:
 *
 * ── Style A: Automatic (patchLoggerForBuildErrors) ────────────────────────────
 *
 *   Call `patchLoggerForBuildErrors()` once at server startup (before routes
 *   mount).  After that, any `logger.error({ err: ... })` call anywhere in the
 *   process — existing routes, middleware, startup code, background tasks —
 *   automatically fires `createBuildErrorCase()` when the error is classified
 *   as build-required.  No caller changes required.
 *
 * ── Style B: Explicit (reportBuildError) ──────────────────────────────────────
 *
 *   A thin wrapper around `logger.error` + classification.  Useful in new code
 *   where the intent should be obvious at the call site, or in tests.
 *
 *   import { reportBuildError } from '../lib/buildErrorReporter.js';
 *   ...
 *   } catch (err) {
 *     reportBuildError(err, 'Failed to run migration');
 *     return res.status(500).json({ error: 'Internal server error' });
 *   }
 */

import { logger }                from './logger.js';
import { isBuildRequiredError }  from './buildErrorClassifier.js';
import { createBuildErrorCase }  from './buildErrorCaseService.js';

// ── Internal helper ───────────────────────────────────────────────────────────

/**
 * Schedule `createBuildErrorCase(err)` fire-and-forget via setImmediate.
 * All invocations go through here so the behaviour is consistent between the
 * patched logger and the explicit `reportBuildError` helper.
 */
function scheduleCase(err: unknown): void {
  setImmediate(() => {
    createBuildErrorCase(err).catch((serviceErr) => {
      // Use the REAL logger.error — not the patched one — to avoid recursion.
      // At this point `logger.error` may be the wrapper, but `isBuildRequiredError`
      // will return false for the serviceErr so the recursive path terminates.
      logger.error({ err: serviceErr }, 'buildErrorReporter: createBuildErrorCase threw unexpectedly');
    });
  });
}

// ── Style A: Automatic logger patch ──────────────────────────────────────────

/**
 * Wrap `logger.error` so that every `logger.error({ err: ... })` call in the
 * process automatically fires `createBuildErrorCase()` when the error qualifies
 * as build-required.
 *
 * Must be called ONCE at server startup, before routes mount.
 * Safe to call multiple times — subsequent calls are no-ops (checked via a flag
 * on the logger instance to avoid double-wrapping).
 *
 * @example
 *   // index.ts (startup entry point)
 *   import { patchLoggerForBuildErrors } from './lib/buildErrorReporter.js';
 *   patchLoggerForBuildErrors();
 *   app.listen(...);
 */
export function patchLoggerForBuildErrors(): void {
  const log = logger as unknown as Record<string, unknown>;

  // Idempotency guard — do not double-wrap.
  if (log['__buildErrorPatchApplied']) return;
  log['__buildErrorPatchApplied'] = true;

  const origError = (logger.error as Function).bind(logger);

  // Replace the `error` method on the pino logger instance.
  // Using `function` (not arrow) so pino's internal `this` binding works correctly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log['error'] = function(this: unknown, ...args: unknown[]): any {
    // Call the original pino error method.
    origError(...args);

    // Check the first argument for a build-required error.
    // Pino's convention: `logger.error({ err, ...meta }, message)` — first arg is the merging object.
    const firstArg = args[0];
    if (firstArg && typeof firstArg === 'object') {
      const logObj = firstArg as Record<string, unknown>;
      // Support both `err` and `error` keys (pino's standard key is `err`).
      const err = logObj['err'] ?? logObj['error'];
      if (err && isBuildRequiredError(err)) {
        scheduleCase(err);
      }
    }
  };
}

// ── Style B: Explicit helper ──────────────────────────────────────────────────

/**
 * Log an error and — when it is classified as build-required — fire
 * case creation in the background.
 *
 * Prefer `patchLoggerForBuildErrors()` at startup for automatic coverage.
 * Use `reportBuildError` in new code where the intent should be explicit,
 * or in test code where you need direct control over the invocation.
 *
 * @param err     The caught error (any shape).
 * @param msg     Optional log message context (defaults to "Reported error").
 * @param logMeta Additional key-value pairs merged into the log record.
 */
export function reportBuildError(
  err:      unknown,
  msg:      string = 'Reported error',
  logMeta:  Record<string, unknown> = {},
): void {
  // 1. Log synchronously so the message always appears in the log stream.
  logger.error({ err, ...logMeta }, msg);

  // 2. If build-required, fire case creation asynchronously.
  if (isBuildRequiredError(err)) {
    scheduleCase(err);
  }
}
