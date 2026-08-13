import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * alert_settings
 *
 * Singleton table (single row with id='default') that stores admin-configurable
 * error-alert thresholds for the errorAlertJob.  When a row exists the job reads
 * these values at runtime; the ERROR_ALERT_THRESHOLD env var is the fallback.
 */
export const alertSettingsTable = pgTable("alert_settings", {
  /** Always 'default' — one row per installation. */
  id:            text("id").primaryKey().default("default"),
  /** Number of 5xx errors in windowMinutes that triggers a Slack alert. */
  threshold:     integer("threshold").notNull().default(10),
  /** Rolling window length (minutes) over which errors are counted. */
  windowMinutes: integer("window_minutes").notNull().default(15),
  /** Email of the admin who last changed the settings. */
  updatedBy:     text("updated_by"),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
});

export type AlertSettingsRow    = typeof alertSettingsTable.$inferSelect;
export type InsertAlertSettings = typeof alertSettingsTable.$inferInsert;
