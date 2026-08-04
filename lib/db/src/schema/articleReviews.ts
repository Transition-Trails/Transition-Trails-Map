import { pgTable, text, timestamp, serial } from "drizzle-orm/pg-core";

export const articleReviewsTable = pgTable("article_reviews", {
  id:          serial("id").primaryKey(),
  articleId:   text("article_id").notNull(),   // KnowledgeArticleVersion.Id (SF record ID)
  reviewedAt:  timestamp("reviewed_at").defaultNow().notNull(),
  reviewedBy:  text("reviewed_by"),            // reviewer email, if available
});

export type ArticleReviewRow    = typeof articleReviewsTable.$inferSelect;
export type InsertArticleReview = typeof articleReviewsTable.$inferInsert;
