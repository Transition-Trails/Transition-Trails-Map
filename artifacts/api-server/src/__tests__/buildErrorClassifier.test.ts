/**
 * buildErrorClassifier.test.ts
 *
 * Unit tests for the error classification and fingerprint helpers.
 * These run against pure functions — no DB, no network, no mocks needed.
 *
 * Test matrix:
 *
 *  isBuildRequiredError
 *   C1.  null / non-object → false
 *   C2.  err.buildRequired === true → true
 *   C3.  err.code === 'MODULE_NOT_FOUND' → true
 *   C4.  PostgreSQL SQLSTATE 42P01 (undefined_table) → true
 *   C5.  PostgreSQL SQLSTATE 42703 (undefined_column) → true
 *   C6.  PostgreSQL SQLSTATE 42P07 (duplicate_table) → true
 *   C7.  "DrizzleError" in error name → true
 *   C8.  Missing env var "environment variable is required" → true
 *   C9.  Missing env var "must be set" → true
 *   C10. Generic runtime TypeError → false
 *   C11. Salesforce API error → false
 *   C12. "NeonDbError" in error name → true
 *   C13. "schema mismatch" in message → true
 *   C14. Generic "does not exist" message without PG code → false (too broad)
 *   C15. SQLSTATE 22P02 (invalid_text_representation) → true
 *
 *  buildErrorFingerprint
 *   F1.  Returns "ErrorName:first-120-chars-of-message"
 *   F2.  Message truncated at 120 chars
 *   F3.  Non-Error input → "UnknownError:..." fingerprint
 *   F4.  Same error produces same fingerprint (idempotent)
 *   F5.  Different error names produce different fingerprints
 *   F6.  Whitespace in message is collapsed to single spaces
 *
 *  buildDedupKey
 *   K1.  Returns "fingerprint:<bucket>" where bucket = floor(ms / 3_600_000)
 *   K2.  Two calls in the same clock-hour produce the same key
 *   K3.  Calls in different clock-hours produce different keys
 *   K4.  Different fingerprints produce different keys even in the same hour
 */

import { describe, test, expect } from 'vitest';
import {
  isBuildRequiredError,
  buildErrorFingerprint,
  buildDedupKey,
} from '../lib/buildErrorClassifier.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeErr(
  name: string,
  message: string,
  extra?: Record<string, unknown>,
): Error & Record<string, unknown> {
  const e = Object.assign(new Error(message), extra);
  e.name = name;
  return e as Error & Record<string, unknown>;
}

// ── isBuildRequiredError ───────────────────────────────────────────────────────

describe('isBuildRequiredError', () => {
  test('C1: null input → false', () => {
    expect(isBuildRequiredError(null)).toBe(false);
  });

  test('C1: non-object string input → false', () => {
    expect(isBuildRequiredError('something went wrong')).toBe(false);
  });

  test('C2: err.buildRequired === true → true', () => {
    const err = makeErr('CustomError', 'something broke', { buildRequired: true });
    expect(isBuildRequiredError(err)).toBe(true);
  });

  test('C3: err.code === MODULE_NOT_FOUND → true', () => {
    const err = makeErr('Error', "Cannot find module './missing'", { code: 'MODULE_NOT_FOUND' });
    expect(isBuildRequiredError(err)).toBe(true);
  });

  test('C4: PostgreSQL SQLSTATE 42P01 (undefined_table) → true', () => {
    const err = makeErr('error', 'relation "build_error_logs" does not exist', { code: '42P01' });
    expect(isBuildRequiredError(err)).toBe(true);
  });

  test('C5: PostgreSQL SQLSTATE 42703 (undefined_column) → true', () => {
    const err = makeErr('error', 'column "sf_case_id" does not exist', { code: '42703' });
    expect(isBuildRequiredError(err)).toBe(true);
  });

  test('C6: PostgreSQL SQLSTATE 42P07 (duplicate_table) → true', () => {
    const err = makeErr('error', 'relation "sessions" already exists', { code: '42P07' });
    expect(isBuildRequiredError(err)).toBe(true);
  });

  test('C7: "DrizzleError" in error name → true', () => {
    const err = makeErr('DrizzleError', 'schema push failed');
    expect(isBuildRequiredError(err)).toBe(true);
  });

  test('C8: "environment variable is required" in message → true', () => {
    const err = makeErr('Error', 'SESSION_SECRET environment variable is required but was not provided.');
    expect(isBuildRequiredError(err)).toBe(true);
  });

  test('C9: "must be set" in message → true', () => {
    const err = makeErr('Error', 'DATABASE_URL must be set. Did you forget to provision a database?');
    expect(isBuildRequiredError(err)).toBe(true);
  });

  test('C10: generic runtime TypeError → false', () => {
    const err = makeErr('TypeError', "Cannot read properties of undefined (reading 'id')");
    expect(isBuildRequiredError(err)).toBe(false);
  });

  test('C11: Salesforce API error → false', () => {
    const err = makeErr('SalesforceError', "INVALID_FIELD: No such column 'Foo__c' on entity 'Case'");
    expect(isBuildRequiredError(err)).toBe(false);
  });

  test('C12: "NeonDbError" in error name → true', () => {
    const err = makeErr('NeonDbError', 'connection refused');
    expect(isBuildRequiredError(err)).toBe(true);
  });

  test('C13: "schema mismatch" in message → true', () => {
    const err = makeErr('Error', 'Drizzle detected a schema mismatch in the current migration');
    expect(isBuildRequiredError(err)).toBe(true);
  });

  test('C14: generic "does not exist" without PG SQLSTATE code → false (not a schema error)', () => {
    // A business-logic error saying "record does not exist" must NOT trigger auto-case creation.
    const err = makeErr('NotFoundError', 'The requested contact does not exist in Salesforce.');
    expect(isBuildRequiredError(err)).toBe(false);
  });

  test('C15: SQLSTATE 22P02 (invalid_text_representation) → true', () => {
    const err = makeErr('error', "invalid input syntax for type integer: 'abc'", { code: '22P02' });
    expect(isBuildRequiredError(err)).toBe(true);
  });
});

// ── buildErrorFingerprint ──────────────────────────────────────────────────────

describe('buildErrorFingerprint', () => {
  test('F1: returns "ErrorName:first-120-chars-of-message"', () => {
    const err = makeErr('TypeError', 'bad value');
    const fp  = buildErrorFingerprint(err);
    expect(fp).toBe('TypeError:bad value');
  });

  test('F2: message is truncated at 120 chars', () => {
    const longMsg = 'x'.repeat(200);
    const err     = makeErr('Error', longMsg);
    const fp      = buildErrorFingerprint(err);
    expect(fp).toBe(`Error:${'x'.repeat(120)}`);
    expect(fp.length).toBe('Error:'.length + 120);
  });

  test('F3: non-Error plain object → "UnknownError:..." fingerprint', () => {
    const fp = buildErrorFingerprint({ message: 'plain object error', foo: 'bar' });
    expect(fp.startsWith('UnknownError:')).toBe(true);
    expect(fp).toContain('plain object error');
  });

  test('F4: same error input produces the same fingerprint (idempotent)', () => {
    const err = makeErr('PgError', 'relation "users" does not exist');
    expect(buildErrorFingerprint(err)).toBe(buildErrorFingerprint(err));
  });

  test('F5: different error names produce different fingerprints', () => {
    const e1 = makeErr('TypeError', 'the same message');
    const e2 = makeErr('RangeError', 'the same message');
    expect(buildErrorFingerprint(e1)).not.toBe(buildErrorFingerprint(e2));
  });

  test('F6: whitespace in message is collapsed to single spaces', () => {
    const err = makeErr('Error', 'line one\n  line two\t\tline three');
    const fp  = buildErrorFingerprint(err);
    expect(fp).not.toMatch(/\n/);
    expect(fp).not.toMatch(/\s{2,}/);
  });
});

// ── buildDedupKey ──────────────────────────────────────────────────────────────

describe('buildDedupKey', () => {
  const fingerprint = 'DrizzleError:schema push failed';
  const HOUR_MS = 3_600_000;

  test('K1: returns "fingerprint:<bucket>" where bucket = floor(ms / 3_600_000)', () => {
    const nowMs  = 7_500_000; // bucket = 2
    const key    = buildDedupKey(fingerprint, nowMs);
    expect(key).toBe(`${fingerprint}:2`);
  });

  test('K2: two calls in the same clock-hour produce the same key', () => {
    const start = 10 * HOUR_MS;          // start of hour 10
    const end   = 10 * HOUR_MS + 3599_000; // 1 second before hour 11
    expect(buildDedupKey(fingerprint, start)).toBe(buildDedupKey(fingerprint, end));
  });

  test('K3: calls in different clock-hours produce different keys', () => {
    const hour10 = 10 * HOUR_MS;
    const hour11 = 11 * HOUR_MS;
    expect(buildDedupKey(fingerprint, hour10)).not.toBe(buildDedupKey(fingerprint, hour11));
  });

  test('K4: different fingerprints produce different keys in the same hour', () => {
    const nowMs = 5 * HOUR_MS;
    const fp1 = 'DrizzleError:a';
    const fp2 = 'TypeError:a';
    expect(buildDedupKey(fp1, nowMs)).not.toBe(buildDedupKey(fp2, nowMs));
  });
});
