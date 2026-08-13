import { pgTable, serial, integer, text, numeric, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { skillAssessmentSessionsTable } from "./skillAssessmentSessions";
import { assessmentItemsTable }          from "./assessmentItems";

/**
 * assessment_responses
 *
 * One row per item answered in a session.
 *
 * confidence values: 'confident' | 'fairly_sure' | 'guessing'
 * score:            0–1 (1 = fully correct)
 *
 * Coach-signal fields (keystroke_count, paste_count, focus_time_ms) are
 * captured by the learner UI and posted alongside the answer.  They are
 * stored for later Penny coaching analysis but not used in the v1.7 score.
 */
export const assessmentResponsesTable = pgTable(
  "assessment_responses",
  {
    id:             serial("id").primaryKey(),
    sessionId:      integer("session_id")
                      .notNull()
                      .references(() => skillAssessmentSessionsTable.id, { onDelete: "cascade" }),
    itemId:         integer("item_id")
                      .notNull()
                      .references(() => assessmentItemsTable.id),
    /** Chosen option id ('a'/'b'/'c'/'d') or free-text for scenario items */
    answer:         text("answer"),
    /** 'confident' | 'fairly_sure' | 'guessing' */
    confidence:     text("confidence"),
    /** 0–1 */
    score:          numeric("score", { precision: 4, scale: 3 }),
    isCorrect:      boolean("is_correct"),
    keystrokeCount: integer("keystroke_count"),
    pasteCount:     integer("paste_count"),
    focusTimeMs:      integer("focus_time_ms"),
    /** Length of the longest single paste event (chars) */
    longestInsertion: integer("longest_insertion"),
    /** Share of submitted text that was pasted (0.000–1.000) */
    pasteRatio:       numeric("paste_ratio", { precision: 4, scale: 3 }),
    /** Whether the learner granted screen capture for this item */
    screenShared:     boolean("screen_shared"),
    /** Penny per-criterion rubric scores — [{ id, pass, rationale }] */
    rubricScores:     jsonb("rubric_scores"),
    respondedAt:      timestamp("responded_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_ar_session").on(t.sessionId),
    index("idx_ar_session_item").on(t.sessionId, t.itemId),
  ],
);

export type AssessmentResponse       = typeof assessmentResponsesTable.$inferSelect;
export type InsertAssessmentResponse = typeof assessmentResponsesTable.$inferInsert;
