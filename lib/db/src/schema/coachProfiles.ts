import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * coach_profiles
 *
 * One row per coach (keyed by Google email).
 * coachLevel is set by staff tooling after onboarding is confirmed.
 *
 * coachLevel values:
 *   'assistant' — observer / co-reader; cannot issue verdicts independently
 *   'associate' — standard coach; issues verdicts on one squad
 *   'advanced'  — senior coach; oversees multiple squads and co-signs assistants
 *
 * A missing row (or null coachLevel) means "not yet assigned a level by staff".
 * The frontend falls back to 'associate' when coachLevel is absent.
 */
export const coachProfilesTable = pgTable("coach_profiles", {
  userEmail:  text("user_email").primaryKey(),
  coachLevel: text("coach_level").$type<"assistant" | "associate" | "advanced">(),
  updatedAt:  timestamp("updated_at").defaultNow().notNull(),
});

export type CoachProfile       = typeof coachProfilesTable.$inferSelect;
export type InsertCoachProfile = typeof coachProfilesTable.$inferInsert;
