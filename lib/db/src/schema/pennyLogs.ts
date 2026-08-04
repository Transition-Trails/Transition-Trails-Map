import { pgTable, text, timestamp, integer, serial } from "drizzle-orm/pg-core";

export const pennyLogsTable = pgTable("penny_logs", {
  id:            serial("id").primaryKey(),
  sessionId:     text("session_id"),
  userTier:      text("user_tier"),
  userEmail:     text("user_email"),
  userMessage:   text("user_message").notNull(),
  pennyResponse: text("penny_response").notNull(),
  promptMode:    text("prompt_mode").notNull().default("ask"),
  model:         text("model"),
  durationMs:    integer("duration_ms"),
  contextRoute:  text("context_route"),
  sfContactId:   text("sf_contact_id"),
  learnerName:   text("learner_name"),
  trailId:       text("trail_id"),
  /**
   * The resolved audience for this exchange — 'learner', 'internal', etc.
   * Derived from session state only (never from the request body).
   * Null for rows written before this column was added.
   */
  audience:      text("audience"),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

export type PennyLogRow    = typeof pennyLogsTable.$inferSelect;
export type InsertPennyLog = typeof pennyLogsTable.$inferInsert;
