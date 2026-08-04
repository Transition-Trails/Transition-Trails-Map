import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const personaHealthDismissalsTable = pgTable("persona_health_dismissals", {
  persona:          text("persona").primaryKey(),
  dismissedIssues:  text("dismissed_issues").notNull().default("[]"), // JSON string[]
  updatedAt:        timestamp("updated_at").defaultNow().notNull(),
});

export type PersonaHealthDismissalRow    = typeof personaHealthDismissalsTable.$inferSelect;
export type InsertPersonaHealthDismissal = typeof personaHealthDismissalsTable.$inferInsert;
