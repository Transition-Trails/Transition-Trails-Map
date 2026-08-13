-- Migration 0020: Create messages table
-- Stores individual messages within a conversation thread.
-- Depends on conversations (0019); must run after it.

CREATE TABLE IF NOT EXISTS "messages" (
  "id"              serial                   PRIMARY KEY NOT NULL,
  "conversation_id" integer                  NOT NULL
                      REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role"            text                     NOT NULL,
  "content"         text                     NOT NULL,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now()
);
