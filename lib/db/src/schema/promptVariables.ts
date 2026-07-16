import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const promptVariablesTable = pgTable("prompt_variables", {
  id:        text("id").primaryKey(),
  data:      jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PromptVariableRow    = typeof promptVariablesTable.$inferSelect;
export type InsertPromptVariable = typeof promptVariablesTable.$inferInsert;
