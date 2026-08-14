import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// ── buyer_tokens ──────────────────────────────────────────────────────────────
// Magic-link tokens issued when a staff member activates a Trail Kit order.
// Each token maps to a Salesforce Asset record (assetId) and is used by the
// standalone Buyer Kit Page to authenticate the request without a user login.
//
// Lifecycle columns:
//   expiresAt  — optional hard expiry; NULL means the token never auto-expires.
//                Tokens past this timestamp are treated as invalid (404).
//   revokedAt  — set to mark a token as revoked (e.g. resend new link).
//                Revoked tokens are treated as invalid (404), never 410.

export const buyerTokensTable = pgTable("buyer_tokens", {
  /** Random 32-character URL-safe slug, used as the magic-link token. */
  id:        text("id").primaryKey(),
  /** Salesforce Asset record ID this token was issued for. */
  assetId:   text("asset_id").notNull(),
  /** Timestamp the token was created. */
  createdAt: timestamp("created_at").defaultNow().notNull(),
  /** Staff email that generated the token (for audit). */
  createdBy: text("created_by"),
  /**
   * Optional hard expiry.  NULL means the token never auto-expires.
   * Tokens with expiresAt in the past are rejected with 404.
   * Phase 1: no expiry is set; this column is reserved for future policy.
   */
  expiresAt: timestamp("expires_at"),
  /**
   * Revocation timestamp.  Non-null means the token has been invalidated.
   * Revoked tokens are rejected with 404 (same presentation as an unknown token
   * so callers cannot distinguish revoked from never-issued).
   */
  revokedAt: timestamp("revoked_at"),
});

export type BuyerTokenRow    = typeof buyerTokensTable.$inferSelect;
export type InsertBuyerToken = typeof buyerTokensTable.$inferInsert;
