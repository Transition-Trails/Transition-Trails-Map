-- Migration 0026: Create article_procedure_steps table
-- Structured step records for Knowledge Studio articles.
-- SF write-through targets Procedure_Step__c (best-effort; local table is authoritative).
CREATE TABLE IF NOT EXISTS article_procedure_steps (
  id            text        PRIMARY KEY,
  article_id    text        NOT NULL,
  sequence      integer     NOT NULL,
  instruction   text        NOT NULL DEFAULT '',
  verify_line   text,
  direct_url    text,
  capture_url   text,
  tool_version  text,
  capture_date  timestamptz,
  sf_step_id    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_procedure_steps_article_id
  ON article_procedure_steps (article_id);
