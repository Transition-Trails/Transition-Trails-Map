-- Migration 0016: Create module_drafts table
-- Stores in-progress Procedure Builder drafts keyed by Salesforce node ID.

CREATE TABLE IF NOT EXISTS "module_drafts" (
  "node_id"     text    PRIMARY KEY NOT NULL,
  "node_kind"   text    NOT NULL,
  "sections"    jsonb   NOT NULL DEFAULT '{}',
  "node_status" text    NOT NULL DEFAULT 'draft',
  "saved_at"    timestamp NOT NULL DEFAULT now(),
  "saved_by"    text
);
