import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

/**
 * skill_assessment_sessions
 *
 * One row per learner attempt at the Skill Assessment.
 * instance values: 'now' (baseline), 'week-6', 'end'
 * status values:   'active', 'completed', 'abandoned'
 */
export const skillAssessmentSessionsTable = pgTable(
  "skill_assessment_sessions",
  {
    id:           serial("id").primaryKey(),
    learnerEmail: text("learner_email").notNull(),
    /** 'now' | 'week-6' | 'end' */
    instance:     text("instance").notNull().default("now"),
    /** 'active' | 'completed' | 'abandoned' */
    status:       text("status").notNull().default("active"),
    startedAt:    timestamp("started_at").defaultNow().notNull(),
    completedAt:  timestamp("completed_at"),
  },
  (t) => [
    index("idx_sas_learner_instance").on(t.learnerEmail, t.instance),
  ],
);

export type SkillAssessmentSession       = typeof skillAssessmentSessionsTable.$inferSelect;
export type InsertSkillAssessmentSession = typeof skillAssessmentSessionsTable.$inferInsert;
