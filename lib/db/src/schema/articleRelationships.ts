import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Stores article-to-article relationship records.
 * Every link writes its inverse in the same transaction (prerequisite ↔ next-step, etc.).
 */
export const articleRelationshipsTable = pgTable("article_relationships", {
  id:               text("id").primaryKey(),
  articleId:        text("article_id").notNull(),         // the "from" article
  relatedArticleId: text("related_article_id").notNull(), // the "to" article
  relationType:     text("relation_type").notNull(),      // prerequisite | next-step | reverses | other
  reason:           text("reason"),                       // brief human note e.g. "Required before this step"
  /** 'forward' on the canonical record, 'inverse' on the auto-written mirror. */
  direction:        text("direction").notNull().default("forward"),
  /** Points to the paired inverse/forward record so deletion is always O(1) and precise. */
  pairedRelId:      text("paired_rel_id"),
  sfRelId:          text("sf_rel_id"),                    // SF relationship record Id if synced
  createdAt:        timestamp("created_at").defaultNow().notNull(),
  updatedAt:        timestamp("updated_at").defaultNow().notNull(),
});

export type ArticleRelationship    = typeof articleRelationshipsTable.$inferSelect;
export type NewArticleRelationship = typeof articleRelationshipsTable.$inferInsert;
