import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// ── content_items ─────────────────────────────────────────────────────────────
// Tracks per-item production metadata for Content Studio items (video, article,
// guide, etc.).  The primary key is the local string ID used in the frontend
// mock data (e.g. "bwm-07").  When a real content-management backend exists,
// this table can be extended or replaced.

export const contentItemsTable = pgTable("content_items", {
  /** Application-assigned ID, e.g. "bwm-07" or "ci-009". */
  id:            text("id").primaryKey(),
  /** Narrator choice for video items. */
  selectedVoice: text("selected_voice").$type<"penny" | "learner" | null>(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
  updatedBy:     text("updated_by"),
});

export type ContentItemRow    = typeof contentItemsTable.$inferSelect;
export type InsertContentItem = typeof contentItemsTable.$inferInsert;
