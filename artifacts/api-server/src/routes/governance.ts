import { Router } from "express";
import { db } from "@workspace/db";
import { articleReviewsTable } from "@workspace/db/schema";
import { desc, sql } from "drizzle-orm";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/governance/review-cycles
//
// Returns aggregated knowledge-article review stats derived from real DB data.
// The Governance Hub Review Cycles tab uses this to show live overdue counts
// instead of hardcoded dates from governanceData.ts.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/governance/review-cycles", async (req, res): Promise<void> => {
  try {
    const now = new Date();

    // Fetch the most-recent review per article_id
    const latestPerArticle = await db
      .select({
        articleId:     articleReviewsTable.articleId,
        reviewedAt:    sql<Date>`MAX(${articleReviewsTable.reviewedAt})`.as("reviewed_at"),
        reviewedBy:    sql<string>`(array_agg(${articleReviewsTable.reviewedBy} ORDER BY ${articleReviewsTable.reviewedAt} DESC))[1]`.as("reviewed_by"),
        nextReviewDue: sql<Date>`(array_agg(${articleReviewsTable.nextReviewDue} ORDER BY ${articleReviewsTable.reviewedAt} DESC))[1]`.as("next_review_due"),
      })
      .from(articleReviewsTable)
      .groupBy(articleReviewsTable.articleId);

    const UPCOMING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

    let overdueCount    = 0;
    let upcomingCount   = 0;
    let currentCount    = 0;
    let oldestOverdueSince: Date | null = null;
    let nextDueSoonest:     Date | null = null;
    let mostRecentReviewedAt:  Date | null = null;
    let mostRecentReviewedBy:  string | null = null;

    for (const row of latestPerArticle) {
      const due = row.nextReviewDue ? new Date(row.nextReviewDue) : null;
      const reviewedAt = row.reviewedAt ? new Date(row.reviewedAt) : null;

      // Track most-recent overall review
      if (reviewedAt && (!mostRecentReviewedAt || reviewedAt > mostRecentReviewedAt)) {
        mostRecentReviewedAt = reviewedAt;
        mostRecentReviewedBy = row.reviewedBy ?? null;
      }

      if (!due) {
        // Has a review record but no next_review_due — treat as current
        currentCount++;
        continue;
      }

      if (due < now) {
        overdueCount++;
        if (!oldestOverdueSince || due < oldestOverdueSince) {
          oldestOverdueSince = due;
        }
      } else if (due.getTime() - now.getTime() <= UPCOMING_WINDOW_MS) {
        upcomingCount++;
        if (!nextDueSoonest || due < nextDueSoonest) {
          nextDueSoonest = due;
        }
      } else {
        currentCount++;
        if (!nextDueSoonest || due < nextDueSoonest) {
          nextDueSoonest = due;
        }
      }
    }

    const totalReviewed   = latestPerArticle.length;

    res.json({
      knowledgeArticles: {
        totalReviewed,
        overdue:         overdueCount,
        upcoming:        upcomingCount,
        current:         currentCount,
        // Articles that have never been reviewed are tracked implicitly by
        // the caller (it knows the SF total from the articles list).
        oldestOverdueSince: oldestOverdueSince?.toISOString() ?? null,
        nextDueSoonest:     nextDueSoonest?.toISOString()     ?? null,
        lastReviewedAt:     mostRecentReviewedAt?.toISOString() ?? null,
        lastReviewedBy:     mostRecentReviewedBy ?? null,
      },
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch governance review cycles");
    res.status(500).json({ error: "Failed to fetch review cycles" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/governance/article-review/:articleId
//
// Returns the latest review record for a specific article.
// Used by the article detail panel to show "Last reviewed by X on Y".
// ─────────────────────────────────────────────────────────────────────────────

router.get("/governance/article-review/:articleId", async (req, res): Promise<void> => {
  const { articleId } = req.params;
  if (!articleId || typeof articleId !== "string") {
    res.status(400).json({ error: "Invalid articleId" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(articleReviewsTable)
      .where(sql`${articleReviewsTable.articleId} = ${articleId}`)
      .orderBy(desc(articleReviewsTable.reviewedAt))
      .limit(1);

    const latest = rows[0] ?? null;
    res.json({ review: latest });
  } catch (err) {
    req.log.error(err, "Failed to fetch article review");
    res.status(500).json({ error: "Failed to fetch article review" });
  }
});

export default router;
