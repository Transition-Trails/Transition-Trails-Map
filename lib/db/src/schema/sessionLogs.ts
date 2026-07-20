import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const sessionLogsTable = pgTable("session_logs", {
  id:              serial("id").primaryKey(),
  sessionType:     text("session_type").notNull(),      // 'office_hours' | 'campfire' | 'private'
  coachName:       text("coach_name"),
  coachEmail:      text("coach_email"),
  learnerName:     text("learner_name"),
  sfContactId:     text("sf_contact_id"),
  trailId:         text("trail_id"),
  programName:     text("program_name"),
  sessionDate:     text("session_date").notNull(),       // YYYY-MM-DD
  durationMinutes: integer("duration_minutes"),
  notes:           text("notes"),
  outcome:         text("outcome"),                      // 'completed' | 'no-show' | 'rescheduled'
  createdAt:       timestamp("created_at").defaultNow().notNull(),
});
