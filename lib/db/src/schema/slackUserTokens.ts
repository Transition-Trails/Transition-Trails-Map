import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * slack_user_tokens
 *
 * Stores one row per Trail OS homebase user who has authorised the app via
 * Slack user OAuth.  The access_token is a personal user token (xoxp-…) so
 * API calls made with it act as the individual user — not the bot.
 *
 * Row is upserted on each OAuth completion and deleted on disconnect.
 */
export const slackUserTokensTable = pgTable("slack_user_tokens", {
  id:          serial("id").primaryKey(),
  /** Trail OS identity — homebase users' Google email */
  userEmail:   text("user_email").notNull().unique(),
  /** Slack user token (xoxp-…) — treat as a secret; never log */
  accessToken: text("access_token").notNull(),
  /** Slack user ID (U-prefixed) for the authenticated user */
  slackUserId: text("slack_user_id").notNull(),
  /** Slack workspace ID (T-prefixed) */
  teamId:      text("team_id").notNull(),
  /** Human-readable workspace name for display in the panel */
  teamName:    text("team_name"),
  /** Space-delimited list of granted OAuth scopes */
  scopes:      text("scopes"),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

export type SlackUserTokenRow    = typeof slackUserTokensTable.$inferSelect;
export type InsertSlackUserToken = typeof slackUserTokensTable.$inferInsert;
