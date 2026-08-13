import { pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core';

/**
 * build_error_logs
 *
 * Tracks runtime errors classified as "build-required" by the API server's
 * global error handler.  Each row corresponds to a Salesforce case that was
 * auto-created on behalf of the engineering team.
 *
 * Deduplication: an INSERT ON CONFLICT DO NOTHING on `dedup_key` is used to
 * atomically claim the deduplication slot before any external calls (LLM,
 * Salesforce).  This prevents duplicate SF cases even under concurrent load
 * where multiple requests hit the same build error simultaneously.
 *
 * `dedup_key` = "<fingerprint>:<1-hour-bucket>" where the bucket is
 * floor(epoch_ms / 3_600_000).  This gives a 60-minute fixed-window dedup
 * without a sliding-window SELECT that would be subject to race conditions.
 */
export const buildErrorLogsTable = pgTable('build_error_logs', {
  id:          serial('id').primaryKey(),

  /**
   * Error-class fingerprint — "ErrorName:first-120-chars-of-message".
   * Multiple rows can share the same fingerprint across different 1-hour
   * buckets; the uniqueness is enforced on `dedup_key`, not `fingerprint`.
   */
  fingerprint: text('fingerprint').notNull(),

  /**
   * Atomic deduplication key — "<fingerprint>:<1-hour-bucket>".
   * UNIQUE constraint prevents concurrent invocations from creating duplicate
   * SF cases for the same error within the same 60-minute window.
   */
  dedupKey:    text('dedup_key').notNull(),

  errorName:   text('error_name').notNull(),
  errorMessage:text('error_message').notNull(),

  /** Stack trace, truncated to 2000 chars before storage. */
  stackTrace:  text('stack_trace'),

  /** SF Case ID (null if SF creation failed). */
  sfCaseId:    text('sf_case_id'),

  /** Human-readable SF case number, e.g. "00001234" (null until SF confirms). */
  sfCaseNumber:text('sf_case_number'),

  /**
   * Salesforce org base URL captured at case-creation time, e.g.
   * "https://myorg.my.salesforce.com".  Used to construct Lightning deep-links
   * in the admin UI.  Null if org URL lookup failed at creation time.
   */
  sfOrgBaseUrl:text('sf_org_base_url'),

  /** AI-generated 3-bullet resolution plan text (null if LLM call failed). */
  resolutionPlan: text('resolution_plan'),

  /**
   * Timestamp when the associated SF case was resolved / closed.
   * Null until the team manually updates this via the admin UI or API.
   */
  resolvedAt:  timestamp('resolved_at'),

  createdAt:   timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  unique('build_error_logs_dedup_key_unique').on(t.dedupKey),
]);

export type BuildErrorLog    = typeof buildErrorLogsTable.$inferSelect;
export type NewBuildErrorLog = typeof buildErrorLogsTable.$inferInsert;
