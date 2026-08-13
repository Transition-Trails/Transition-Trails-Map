-- Migration 0010: Add knowledge-authoring workflow fields to knowledge_articles.
--
-- knowledge_articles was initially created by drizzle-kit push and has no earlier
-- CREATE TABLE migration.  This file creates the table with its base schema (IF NOT
-- EXISTS) before adding the new columns so that fresh-database setups work without
-- requiring drizzle-kit to run first.

CREATE TABLE IF NOT EXISTS "knowledge_articles" (
  "id"                text        PRIMARY KEY NOT NULL,
  "title"             text        NOT NULL,
  "summary"           text        NOT NULL DEFAULT '',
  "body"              text        NOT NULL DEFAULT '',
  "category"          text        NOT NULL DEFAULT '',
  "url_name"          text        NOT NULL,
  "article_type"      text        NOT NULL DEFAULT '',
  "status"            text        NOT NULL DEFAULT 'draft',
  "authored_by"       text,
  "reviewed_by"       text,
  "reviewed_at"       timestamp,
  "review_note"       text,
  "published_at"      timestamp,
  "submitted_at"      timestamp,
  "sf_article_id"     text,
  "sf_version_id"     text,
  "sf_publish_status" text,
  "created_at"        timestamp   NOT NULL DEFAULT now(),
  "updated_at"        timestamp   NOT NULL DEFAULT now()
);

-- Add the authoring-workflow columns introduced in this migration.
-- All guarded with IF NOT EXISTS so re-runs on existing databases are safe.
ALTER TABLE "knowledge_articles"
  ADD COLUMN IF NOT EXISTS "data_category_group"   text,
  ADD COLUMN IF NOT EXISTS "data_category"          text,
  ADD COLUMN IF NOT EXISTS "sf_review_case_id"      text,
  ADD COLUMN IF NOT EXISTS "sf_review_case_number"  text,
  ADD COLUMN IF NOT EXISTS "reviewer_email"          text,
  ADD COLUMN IF NOT EXISTS "recording_url"           text,
  ADD COLUMN IF NOT EXISTS "submitted_at"            timestamp;
