-- Migration 0019: Create conversations table
-- Stores Penny conversation threads (parent record for messages).

CREATE TABLE IF NOT EXISTS "conversations" (
  "id"         serial                     PRIMARY KEY NOT NULL,
  "title"      text                       NOT NULL,
  "created_at" timestamp with time zone   NOT NULL DEFAULT now()
);
