import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const knowledgeSourcesTable = pgTable("knowledge_sources", {
  id:        text("id").primaryKey(),
  data:      jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type KnowledgeSourceRow    = typeof knowledgeSourcesTable.$inferSelect;
export type InsertKnowledgeSource = typeof knowledgeSourcesTable.$inferInsert;
