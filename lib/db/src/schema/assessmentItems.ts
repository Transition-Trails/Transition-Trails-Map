import { pgTable, serial, text, numeric, jsonb, index } from "drizzle-orm/pg-core";

/**
 * assessment_items
 *
 * The question bank.  Each row is one item in the assessment.
 *
 * item_type values: 'mc' (multiple-choice), 'scenario', 'build-check'
 *
 * For 'mc' items:
 *   options       — [{ id: 'a', text: '...' }, ...]
 *   correct_option — 'a' | 'b' | 'c' | 'd'
 *
 * For 'scenario' items:
 *   rubric — { criteria: string, passingThreshold: number }
 *   correct_option is null; Penny scores the free-text answer
 *
 * For 'build-check' items:
 *   rubric — { verificationSteps: string[] }
 *   scored by querying the learner's Salesforce dev org
 *
 * weight — relative item difficulty weight within domain (default 1.0)
 */
export const assessmentItemsTable = pgTable(
  "assessment_items",
  {
    id:            serial("id").primaryKey(),
    /** Short slug, e.g. 'config-setup' */
    domain:        text("domain").notNull(),
    /** Human label, e.g. 'Configuration and Setup' */
    domainLabel:   text("domain_label").notNull(),
    /** Exam weight for this domain as a fraction, e.g. 0.18 */
    domainWeight:  numeric("domain_weight", { precision: 4, scale: 3 }).notNull(),
    /** 'mc' | 'scenario' | 'build-check' */
    itemType:      text("item_type").notNull().default("mc"),
    question:      text("question").notNull(),
    /** MC answer choices: [{ id, text }] */
    options:       jsonb("options"),
    /** For MC: 'a' | 'b' | 'c' | 'd' */
    correctOption: text("correct_option"),
    /** For scenario/build-check scoring */
    rubric:        jsonb("rubric"),
    /** Explanation shown in debrief */
    explanation:   text("explanation"),
    /** Relative weight within the domain (default 1) */
    weight:        numeric("weight", { precision: 4, scale: 2 }).notNull().default("1"),
  },
  (t) => [
    index("idx_ai_domain").on(t.domain),
  ],
);

export type AssessmentItem       = typeof assessmentItemsTable.$inferSelect;
export type InsertAssessmentItem = typeof assessmentItemsTable.$inferInsert;
