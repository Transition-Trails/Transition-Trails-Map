/**
 * buildErrorClassifier.ts
 *
 * Classifies runtime errors as "build-required" — errors that indicate the
 * running API server binary is broken and needs a rebuild/redeploy to recover.
 *
 * Deliberately kept pure (no I/O, no DB) so it can be unit-tested cheaply.
 */

// ── PostgreSQL SQLSTATE codes that indicate schema/migration failures ──────────
//
// These are assigned by the PostgreSQL server and surfaced as `err.code` on
// pg/node-postgres errors (and propagated by Drizzle).  They are authoritative
// indicators that a schema migration was not applied, not generic runtime errors.
//
// 42P01 — undefined_table  (relation does not exist)
// 42703 — undefined_column
// 42P07 — duplicate_table  (migration applied twice / out of order)
// 42601 — syntax_error     (malformed migration SQL)
// 22P02 — invalid_text_representation (type cast failure from schema mismatch)
// 23502 — not_null_violation (required column missing value post-migration)

const DB_SCHEMA_SQLSTATES = new Set([
  '42P01', // undefined_table
  '42703', // undefined_column
  '42P07', // duplicate_table
  '42601', // syntax_error in SQL
  '22P02', // invalid_text_representation
  '23502', // not_null_violation
]);

// ── Known build-break message patterns ────────────────────────────────────────
//
// Only used when a SQLSTATE code is not present.  Keep these narrow and
// qualified — avoid broad substrings that match unrelated runtime errors.

/** Substrings that identify Drizzle ORM / Neon DB error classes in the name. */
const DRIZZLE_NAME_PATTERNS: string[] = [
  'DrizzleError',
  'NeonDbError',
];

/** Specific schema-level message substrings (used as fallback when no code). */
const SCHEMA_MESSAGE_PATTERNS: string[] = [
  'schema mismatch',
  'invalid input syntax for type', // PG type mismatch — schema may have changed
];

/** Env-var assertion strings typically thrown in startup guards. */
const ENV_VAR_PATTERNS: string[] = [
  'environment variable is required',
  'must be set',
  'must be defined',
  'is not set',
];

/** Node module-resolution error code. */
const MODULE_NOT_FOUND = 'MODULE_NOT_FOUND';

// ── Public helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true when the error signals a broken build / deployment.
 *
 * Checks (in order):
 *  1. Explicit opt-in: `err.buildRequired === true` on the error object.
 *  2. Node module resolution failure (`err.code === 'MODULE_NOT_FOUND'`).
 *  3. PostgreSQL SQLSTATE codes for schema/migration failures (`err.code` in DB_SCHEMA_SQLSTATES).
 *  4. Drizzle / Neon error class names in `err.name`.
 *  5. Specific schema-level message substrings (fallback, narrowed set only).
 *  6. Missing required environment variable patterns in the message.
 */
export function isBuildRequiredError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;

  const e = err as Record<string, unknown>;

  // 1. Explicit opt-in
  if (e['buildRequired'] === true) return true;

  // 2. Node module not found
  if (e['code'] === MODULE_NOT_FOUND) return true;

  // 3. PostgreSQL SQLSTATE schema codes (authoritative — surfaced by pg/Drizzle)
  if (typeof e['code'] === 'string' && DB_SCHEMA_SQLSTATES.has(e['code'])) return true;

  const name    = (typeof e['name']    === 'string' ? e['name']    : '').toLowerCase();
  const message = (typeof e['message'] === 'string' ? e['message'] : '').toLowerCase();

  // 4. Drizzle / Neon error class name
  for (const pattern of DRIZZLE_NAME_PATTERNS) {
    if (name.includes(pattern.toLowerCase())) return true;
  }

  // 5. Narrow schema-specific message patterns
  for (const pattern of SCHEMA_MESSAGE_PATTERNS) {
    if (message.includes(pattern.toLowerCase())) return true;
  }

  // 6. Missing required env var (specific startup-guard language)
  for (const pattern of ENV_VAR_PATTERNS) {
    if (message.includes(pattern.toLowerCase())) return true;
  }

  return false;
}

/**
 * Compute a stable deduplication fingerprint for a build-required error.
 *
 * Format: `"ErrorName:first-120-chars-of-message"`
 * The fingerprint is combined with a 1-hour time bucket in the service to
 * form the atomic dedup key stored in `build_error_logs.dedup_key`.
 */
export function buildErrorFingerprint(err: unknown): string {
  const e = (err && typeof err === 'object') ? (err as Record<string, unknown>) : {};

  const name    = typeof e['name']    === 'string' ? e['name']    : 'UnknownError';
  const message = typeof e['message'] === 'string' ? e['message'] : String(err ?? '');

  const truncatedMessage = message.slice(0, 120).replace(/\s+/g, ' ').trim();
  return `${name}:${truncatedMessage}`;
}

/**
 * Compute the atomic dedup key used for INSERT ON CONFLICT.
 *
 * Format: `"<fingerprint>:<1-hour-bucket>"` where bucket is
 * `floor(epochMs / 3_600_000)`.  Identical errors within the same 60-minute
 * clock-hour produce the same key, preventing duplicate SF cases.
 */
export function buildDedupKey(fingerprint: string, nowMs: number = Date.now()): string {
  const bucket = Math.floor(nowMs / 3_600_000);
  return `${fingerprint}:${bucket}`;
}
