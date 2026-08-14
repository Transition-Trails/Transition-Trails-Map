-- Migration: create content_items table for Content Studio production metadata
CREATE TABLE IF NOT EXISTS "content_items" (
  "id"             text PRIMARY KEY NOT NULL,
  "selected_voice" text,
  "updated_at"     timestamp DEFAULT now() NOT NULL,
  "updated_by"     text
);
