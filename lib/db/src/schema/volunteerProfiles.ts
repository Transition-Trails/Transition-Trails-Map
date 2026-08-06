import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * volunteer_profiles
 *
 * One row per volunteer (keyed by Google email).
 * Created with nulls on first sign-in; coordinator fills the fields
 * via staff tooling once onboarding is confirmed.
 *
 * monthly_commitment_hours — null means "not yet agreed with coordinator"
 * case_limit               — null falls back to the UI default of 3
 * specialty                — plain-text description of what they handle
 * coordinator_slack_id     — Slack user ID of the assigned coordinator
 * coordinator_name         — Display name of the assigned coordinator
 * volunteer_slack_channel  — Slack channel ID for the volunteer cohort
 */
export const volunteerProfilesTable = pgTable("volunteer_profiles", {
  userEmail:             text("user_email").primaryKey(),
  monthlyCommitmentHours: integer("monthly_commitment_hours"),
  caseLimit:             integer("case_limit"),
  specialty:             text("specialty"),
  coordinatorSlackId:    text("coordinator_slack_id"),
  coordinatorName:       text("coordinator_name"),
  volunteerSlackChannel: text("volunteer_slack_channel"),
  updatedAt:             timestamp("updated_at").defaultNow().notNull(),
});

export type VolunteerProfile      = typeof volunteerProfilesTable.$inferSelect;
export type InsertVolunteerProfile = typeof volunteerProfilesTable.$inferInsert;
