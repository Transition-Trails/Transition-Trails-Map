-- Migration 0021: Create build_error_logs table
-- Tracks runtime errors that triggered automatic Salesforce case creation.
-- dedup_key prevents duplicate SF cases for the same error within a 1-hour window.

CREATE TABLE IF NOT EXISTS "build_error_logs" (
  "id"              serial    PRIMARY KEY NOT NULL,
  "fingerprint"     text      NOT NULL,
  "dedup_key"       text      NOT NULL,
  "error_name"      text      NOT NULL,
  "error_message"   text      NOT NULL,
  "stack_trace"     text,
  "sf_case_id"      text,
  "sf_case_number"  text,
  "sf_org_base_url" text,
  "resolution_plan" text,
  "resolved_at"     timestamp,
  "created_at"      timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "build_error_logs_dedup_key_unique" UNIQUE ("dedup_key")
);
