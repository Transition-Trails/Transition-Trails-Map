import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const promptTemplatesTable = pgTable("prompt_templates", {
  id:        text("id").primaryKey(),
  data:      jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PromptTemplateRow    = typeof promptTemplatesTable.$inferSelect;
export type InsertPromptTemplate = typeof promptTemplatesTable.$inferInsert;
