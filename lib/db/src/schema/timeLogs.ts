import { pgTable, serial, text, numeric, timestamp, date, index } from "drizzle-orm/pg-core";

export const timeLogsTable = pgTable(
  "time_logs",
  {
    id:            serial("id").primaryKey(),
    userEmail:     text("user_email").notNull(),
    /** 'learner' | 'coach' | 'volunteer' | 'staff' */
    audience:      text("audience").notNull(),
    activityLabel: text("activity_label").notNull(),
    /** Stored as numeric so 0.25-hour increments are preserved. */
    hours:         numeric("hours", { precision: 4, scale: 2 }).notNull(),
    loggedAt:      timestamp("logged_at").defaultNow().notNull(),

    // ── Staff time-tracking fields (nullable for backward compat) ─────────
    /** 'case' | 'account' | 'task' | 'opportunity' */
    sfObjectType:  text("sf_object_type"),
    /** Salesforce record ID */
    sfObjectId:    text("sf_object_id"),
    /** Cached display name for the SF record */
    sfObjectName:  text("sf_object_name"),
    /** The actual date the work was performed */
    workDate:      date("work_date"),
    /** Optional free-text note */
    notes:         text("notes"),
  },
  (t) => [
    index("idx_time_logs_sf_object").on(t.sfObjectType, t.sfObjectId),
  ]
);

export type TimeLog       = typeof timeLogsTable.$inferSelect;
export type InsertTimeLog = typeof timeLogsTable.$inferInsert;

// Legacy aliases kept for any existing callers
export type TimeLogs = TimeLog;
