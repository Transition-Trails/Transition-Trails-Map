import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * sf_sync_settings
 *
 * Singleton table (single row with id='default') that stores admin-configurable
 * settings for the automated Salesforce Knowledge article background sync job.
 */
export const sfSyncSettingsTable = pgTable("sf_sync_settings", {
  /** Always 'default' — one row per installation. */
  id:            text("id").primaryKey().default("default"),
  /** Whether the background auto-sync job is active. */
  enabled:       boolean("enabled").notNull().default(true),
  /** How often the sync runs (hours). Default: 6 hours. */
  intervalHours: integer("interval_hours").notNull().default(6),
  /** Email of the admin who last changed the settings. */
  updatedBy:     text("updated_by"),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
});

export type SfSyncSettingsRow    = typeof sfSyncSettingsTable.$inferSelect;
export type InsertSfSyncSettings = typeof sfSyncSettingsTable.$inferInsert;
