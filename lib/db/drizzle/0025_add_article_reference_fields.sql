-- Migration 0025: Add reference / metadata fields to knowledge_articles
-- These fields drive the left-column panel in the Knowledge Studio Article editor.
ALTER TABLE knowledge_articles
  ADD COLUMN IF NOT EXISTS owner_department  text,
  ADD COLUMN IF NOT EXISTS difficulty        text,
  ADD COLUMN IF NOT EXISTS audience          text,
  ADD COLUMN IF NOT EXISTS applies_to        text,
  ADD COLUMN IF NOT EXISTS estimated_time    text,
  ADD COLUMN IF NOT EXISTS last_tested_version text,
  ADD COLUMN IF NOT EXISTS retrieval_abstract  text,
  ADD COLUMN IF NOT EXISTS prerequisites     text;
