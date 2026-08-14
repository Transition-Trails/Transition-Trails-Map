-- Migration 0028: add review_cycle column to knowledge_articles
-- Stores the Knowledge Studio review cycle selection (Monthly | Quarterly | Yearly)
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS review_cycle text;
