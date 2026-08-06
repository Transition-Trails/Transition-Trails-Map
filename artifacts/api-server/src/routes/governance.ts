import { Router } from "express";
import { db } from "@workspace/db";
import { articleReviewsTable } from "@workspace/db/schema";
import { desc, sql, inArray } from "drizzle-orm";
import { ConnectorSalesforceClient } from "../lib/connectorSalesforceClient.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/governance/review-cycles
//
// Returns aggregated knowledge-article review stats derived from real DB data.
// The Governance Hub Review Cycles tab uses this to show live overdue counts
// instead of hardcoded dates from governanceData.ts.
// Also returns an `overdueArticles` array with article IDs, titles, and the
// date each article's review became overdue.
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

    // Collect overdue articles for detailed listing
    const overdueEntries: { articleId: string; overdueSince: string }[] = [];

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
        overdueEntries.push({
          articleId: row.articleId,
          overdueSince: due.toISOString(),
        });
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

    const totalReviewed = latestPerArticle.length;

    // ── Fetch article titles from Salesforce ──────────────────────────────────
    // Best-effort: if SF is unavailable or returns an error, we still return
    // the overdue list with null titles so the UI can fall back gracefully.
    interface OverdueArticle {
      articleId:   string;
      title:       string | null;
      overdueSince: string;
    }

    let overdueArticles: OverdueArticle[] = overdueEntries.map(e => ({
      articleId:   e.articleId,
      title:       null,
      overdueSince: e.overdueSince,
    }));

    if (overdueEntries.length > 0) {
      try {
        const client = new ConnectorSalesforceClient();
        const ids = overdueEntries.map(e => `'${e.articleId}'`).join(", ");
        const result = await client.query<{ Id: string; Title: string }>(
          `SELECT Id, Title FROM KnowledgeArticleVersion WHERE Id IN (${ids})`
        );
        const titleMap = new Map<string, string>();
        for (const rec of result.records) {
          titleMap.set(rec.Id, rec.Title);
        }
        overdueArticles = overdueEntries.map(e => ({
          articleId:   e.articleId,
          title:       titleMap.get(e.articleId) ?? null,
          overdueSince: e.overdueSince,
        }));
      } catch (sfErr) {
        req.log.warn(sfErr, "Could not fetch article titles from Salesforce for governance review-cycles; returning IDs only");
      }
    }

    // Sort overdue articles oldest-first (most urgent first)
    overdueArticles.sort((a, b) =>
      new Date(a.overdueSince).getTime() - new Date(b.overdueSince).getTime()
    );

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
        overdueArticles,
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/governance/article-reviews-batch?ids=id1,id2,...
//
// Returns the most-recent review record for each requested article ID in a
// single query.  The Article Health tab uses this to determine real overdue
// status instead of relying on the article's own reviewedAt field.
//
// Response: { reviews: { [articleId]: { reviewedAt, reviewedBy, nextReviewDue } } }
// Articles that have no review record are simply absent from the map.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/governance/article-reviews-batch", async (req, res): Promise<void> => {
  const rawIds = typeof req.query.ids === "string" ? req.query.ids : "";
  const ids = rawIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 200); // safety cap

  if (ids.length === 0) {
    res.json({ reviews: {} });
    return;
  }

  try {
    const rows = await db
      .select({
        articleId:     articleReviewsTable.articleId,
        reviewedAt:    sql<string>`MAX(${articleReviewsTable.reviewedAt})`.as("reviewed_at"),
        reviewedBy:    sql<string>`(array_agg(${articleReviewsTable.reviewedBy} ORDER BY ${articleReviewsTable.reviewedAt} DESC))[1]`.as("reviewed_by"),
        nextReviewDue: sql<string>`(array_agg(${articleReviewsTable.nextReviewDue} ORDER BY ${articleReviewsTable.reviewedAt} DESC))[1]`.as("next_review_due"),
      })
      .from(articleReviewsTable)
      .where(inArray(articleReviewsTable.articleId, ids))
      .groupBy(articleReviewsTable.articleId);

    const reviews: Record<
      string,
      { reviewedAt: string | null; reviewedBy: string | null; nextReviewDue: string | null }
    > = {};

    for (const row of rows) {
      reviews[row.articleId] = {
        reviewedAt:    row.reviewedAt    ? new Date(row.reviewedAt).toISOString()    : null,
        reviewedBy:    row.reviewedBy    ?? null,
        nextReviewDue: row.nextReviewDue ? new Date(row.nextReviewDue).toISOString() : null,
      };
    }

    res.json({ reviews });
  } catch (err) {
    req.log.error(err, "Failed to fetch batch article reviews");
    res.status(500).json({ error: "Failed to fetch article reviews" });
  }
});

export default router;
