import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const programPennyConfigsTable = pgTable("program_penny_configs", {
  programId: text("program_id").primaryKey(),
  status:    text("status").notNull().default("Not Planned"),
  notes:     text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProgramPennyConfigRow    = typeof programPennyConfigsTable.$inferSelect;
export type InsertProgramPennyConfig = typeof programPennyConfigsTable.$inferInsert;
