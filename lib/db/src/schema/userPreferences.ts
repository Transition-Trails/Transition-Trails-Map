import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * user_preferences
 *
 * Durable per-user UI preference store, keyed by the user's Google email
 * (the primary identity used throughout Trail OS).  Storing prefs here (rather
 * than in the Express session) means they roam across browsers and devices for
 * the same authenticated user.
 *
 * The `prefs` column is a flat JSON object whose values are primitives
 * (string | number | boolean | null).  Callers merge patches server-side;
 * no deep-merge is performed — top-level keys are overwritten on PATCH.
 */
export const userPreferencesTable = pgTable("user_preferences", {
  /** Trail OS identity — the user's Google email address. */
  userEmail: text("user_email").primaryKey(),
  /** Flat JSON blob: { [prefKey: string]: string | number | boolean | null } */
  prefs:     jsonb("prefs").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserPreferencesRow    = typeof userPreferencesTable.$inferSelect;
export type InsertUserPreferences = typeof userPreferencesTable.$inferInsert;
