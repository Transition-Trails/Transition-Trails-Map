import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const knowledgeDocumentsTable = pgTable("knowledge_documents", {
  id:        text("id").primaryKey(),
  data:      jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type KnowledgeDocumentRow    = typeof knowledgeDocumentsTable.$inferSelect;
export type InsertKnowledgeDocument = typeof knowledgeDocumentsTable.$inferInsert;
