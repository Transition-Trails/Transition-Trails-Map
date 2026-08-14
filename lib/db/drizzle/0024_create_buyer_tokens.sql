-- Migration: create buyer_tokens table
-- Magic-link tokens for the Buyer Kit Page (standalone public surface).

CREATE TABLE IF NOT EXISTS "buyer_tokens" (
  "id"         text        PRIMARY KEY,
  "asset_id"   text        NOT NULL,
  "created_at" timestamp   NOT NULL DEFAULT now(),
  "created_by" text,
  "expires_at" timestamp,
  "revoked_at" timestamp
);
