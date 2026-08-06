import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const moduleDraftsTable = pgTable("module_drafts", {
  nodeId:     text("node_id").primaryKey(),          // Salesforce Id (course or module)
  nodeKind:   text("node_kind").notNull(),             // 'course' | 'module'
  sections:   jsonb("sections").notNull().default({}), // Record<string, string>
  nodeStatus: text("node_status").notNull().default("draft"), // 'draft'|'review'|'published'
  savedAt:    timestamp("saved_at").defaultNow().notNull(),
  savedBy:    text("saved_by"),                        // user email
});

export type ModuleDraftRow    = typeof moduleDraftsTable.$inferSelect;
export type InsertModuleDraft = typeof moduleDraftsTable.$inferInsert;
