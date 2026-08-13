-- Migration 0015: Create article_reviews table
-- Tracks Knowledge article review history (reviewed_at, reviewed_by, next_review_due).

CREATE TABLE IF NOT EXISTS "article_reviews" (
  "id"              serial       PRIMARY KEY NOT NULL,
  "article_id"      text         NOT NULL,
  "reviewed_at"     timestamp    NOT NULL DEFAULT now(),
  "reviewed_by"     text,
  "next_review_due" timestamp
);
