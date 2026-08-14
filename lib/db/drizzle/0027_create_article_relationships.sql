-- Migration 0027: Create article_relationships table
-- Article-to-article relationship records.
-- Every forward link has a corresponding inverse record written in the same transaction.
CREATE TABLE IF NOT EXISTS article_relationships (
  id                  text        PRIMARY KEY,
  article_id          text        NOT NULL,
  related_article_id  text        NOT NULL,
  relation_type       text        NOT NULL,
  reason              text,
  direction           text        NOT NULL DEFAULT 'forward',
  sf_rel_id           text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_relationships_article_id
  ON article_relationships (article_id);
CREATE INDEX IF NOT EXISTS idx_article_relationships_related_article_id
  ON article_relationships (related_article_id);
