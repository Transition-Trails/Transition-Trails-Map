import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * fathom_user_keys
 *
 * Stores one row per staff member who has connected their personal Fathom
 * account.  The api_key is encrypted at rest (AES-256-GCM via the same helper
 * used for Slack tokens) — never log the raw value.
 *
 * Row is upserted on connect and deleted on disconnect.
 */
export const fathomUserKeysTable = pgTable("fathom_user_keys", {
  id:          serial("id").primaryKey(),
  /** Trail OS identity — staff member's Google email */
  userEmail:   text("user_email").notNull().unique(),
  /** Encrypted Fathom personal API key — treat as a secret; never log */
  apiKey:      text("api_key").notNull(),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

export type FathomUserKeyRow    = typeof fathomUserKeysTable.$inferSelect;
export type InsertFathomUserKey = typeof fathomUserKeysTable.$inferInsert;
