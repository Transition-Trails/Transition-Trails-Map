import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const platformRoleOwnersTable = pgTable("platform_role_owners", {
  id:         text("id").primaryKey(),
  owner:      text("owner").notNull().default(""),
  ownerEmail: text("owner_email").notNull().default(""),
  updatedAt:  timestamp("updated_at").defaultNow().notNull(),
});

export type PlatformRoleOwnerRow    = typeof platformRoleOwnersTable.$inferSelect;
export type InsertPlatformRoleOwner = typeof platformRoleOwnersTable.$inferInsert;
