import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Stores structured procedure steps for a knowledge article.
 * Each step maps (eventually) to a Procedure_Step__c child record in Salesforce.
 * SF write-through is best-effort; this table is the authoritative local copy.
 */
export const articleProcedureStepsTable = pgTable("article_procedure_steps", {
  id:          text("id").primaryKey(),          // local UUID
  articleId:   text("article_id").notNull(),      // references knowledge_articles.id
  sequence:    integer("sequence").notNull(),     // 1-based display order
  instruction: text("instruction").notNull().default(""),
  verifyLine:  text("verify_line"),              // "You should see…" copy; null = needs attention
  directUrl:   text("direct_url"),               // the deep link for this step
  captureUrl:  text("capture_url"),              // screenshot thumbnail path / URL
  toolVersion: text("tool_version"),             // e.g. "Spring '25" — stamped on capture
  captureDate: timestamp("capture_date"),
  sfStepId:    text("sf_step_id"),               // Salesforce Procedure_Step__c record Id (if exists)
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

export type ArticleProcedureStep     = typeof articleProcedureStepsTable.$inferSelect;
export type NewArticleProcedureStep  = typeof articleProcedureStepsTable.$inferInsert;
