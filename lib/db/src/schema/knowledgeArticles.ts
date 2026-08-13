import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Tracks articles authored in TRAIL OS through the draft → review → publish workflow.
 * Once published, sf_article_id / sf_version_id hold the Salesforce record IDs.
 */
export const knowledgeArticlesTable = pgTable("knowledge_articles", {
  id:              text("id").primaryKey(),
  title:           text("title").notNull(),
  summary:         text("summary").notNull().default(""),
  body:            text("body").notNull().default(""),
  category:        text("category").notNull().default(""),
  urlName:         text("url_name").notNull(),
  articleType:     text("article_type").notNull().default(""),

  // Workflow status: 'draft' | 'pending-review' | 'approved' | 'published'
  status:          text("status").notNull().default("draft"),

  // People
  authoredBy:      text("authored_by"),
  reviewedBy:      text("reviewed_by"),
  reviewedAt:      timestamp("reviewed_at"),
  reviewNote:      text("review_note"),   // change-request message from reviewer
  publishedAt:     timestamp("published_at"),
  submittedAt:     timestamp("submitted_at"),

  // Salesforce
  sfArticleId:     text("sf_article_id"),      // KnowledgeArticle.Id
  sfVersionId:     text("sf_version_id"),       // __kav record Id
  sfPublishStatus: text("sf_publish_status"),   // 'Draft' | 'Online'

  // SF Data Category Group fields (set when publishing to SF Knowledge)
  dataCategoryGroup: text("data_category_group"),
  dataCategory:      text("data_category"),

  // SF review Case linked to this article's review workflow
  sfReviewCaseId:     text("sf_review_case_id"),
  sfReviewCaseNumber: text("sf_review_case_number"),

  // Reviewer email (denormalized for quick display)
  reviewerEmail: text("reviewer_email"),

  // Screen recording URL (stored in server filesystem, served via /api/knowledge/recordings/:filename)
  recordingUrl: text("recording_url"),

  createdAt:       timestamp("created_at").defaultNow().notNull(),
  updatedAt:       timestamp("updated_at").defaultNow().notNull(),
});

export type KnowledgeArticleRow    = typeof knowledgeArticlesTable.$inferSelect;
export type InsertKnowledgeArticle = typeof knowledgeArticlesTable.$inferInsert;
export type ArticleStatus = "draft" | "pending-review" | "approved" | "published";
