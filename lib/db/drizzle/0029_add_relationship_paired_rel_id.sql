-- Migration 0029: add paired_rel_id column to article_relationships
-- Allows precise deletion of exactly one forward+inverse pair without
-- accidentally removing unrelated links between the same two articles.
ALTER TABLE article_relationships ADD COLUMN IF NOT EXISTS paired_rel_id text;
