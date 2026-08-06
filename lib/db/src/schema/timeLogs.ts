import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const timeLogsTable = pgTable("time_logs", {
  id:            serial("id").primaryKey(),
  userEmail:     text("user_email").notNull(),
  /** 'learner' | 'coach' | 'volunteer' */
  audience:      text("audience").notNull(),
  activityLabel: text("activity_label").notNull(),
  /** Stored as numeric so sub-hour increments (0.5) are preserved. */
  hours:         numeric("hours", { precision: 4, scale: 2 }).notNull(),
  loggedAt:      timestamp("logged_at").defaultNow().notNull(),
});

export type TimeLogs    = typeof timeLogsTable.$inferSelect;
export type InsertTimeLog = typeof timeLogsTable.$inferInsert;
