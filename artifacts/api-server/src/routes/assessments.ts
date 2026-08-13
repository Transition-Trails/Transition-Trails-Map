/**
 * assessments.ts  —  /api/assessments/*
 *
 * Skill Assessment session lifecycle and adaptive item selection for the
 * Trail OS v1.7 Skill Assessment feature.
 *
 * Routes:
 *   POST   /assessments/sessions                           — start or resume a session
 *   GET    /assessments/sessions/:id                       — get session + domain-reads state
 *   GET    /assessments/next-item/:sessionId               — adaptive next item selector
 *   POST   /assessments/sessions/:id/respond               — record a response
 *   POST   /assessments/sessions/:id/items/:itemId/verify  — run build-check verification (SF calls)
 *   POST   /assessments/sessions/:id/complete              — mark session done
 *   GET    /assessments/sessions/:id/results               — per-domain debrief data
 *
 * Auth:
 *   Learner routes (start/respond/complete/next-item) use requireHomebaseAuth
 *   Staff routes (results) require a valid staff session (default gate in index.ts)
 *
 * Adaptive settling logic (v1.7 simplified):
 *   A domain is "settled" once the learner has answered 3+ items correctly
 *   OR answered 5 items in that domain — whichever comes first.
 *   When all domains are settled, next-item returns { done: true }.
 */

import { Router }          from "express";
import { db }              from "@workspace/db";
import {
  skillAssessmentSessionsTable,
  assessmentItemsTable,
  assessmentResponsesTable,
}                          from "@workspace/db/schema";
import { eq, and, count, sql, not, inArray, desc } from "drizzle-orm";
import { requireHomebaseAuth, requireStaff } from "../middlewares/requireAuth.js";
import { logger }                            from "../lib/logger.js";
import { seedAssessmentItems }               from "../scripts/seedAssessmentItems.js";
import { scoreScenarioResponse }             from "../lib/assessmentScoring.js";
import { getLearnerSfFetch, getEffectiveSfFetch, makeSfDirectFetch } from "../lib/salesforceOAuth.js";

// ── Shared-credential-only SF fetch ───────────────────────────────────────────
// For system records (Assessment_Result__c) that must land in the canonical
// coaching org, not in a learner's personal dev-org session.
// Tries: (1) env-var service account, (2) Replit Connector proxy.
// Never uses req.session tokens — calling code must NOT pass `req`.
function getSharedSfFetch(): ((url: string, init?: RequestInit) => Promise<Response>) | null {
  const accessToken = process.env["SALESFORCE_ACCESS_TOKEN"];
  const instanceUrl = process.env["SALESFORCE_INSTANCE_URL"];
  if (accessToken && instanceUrl) {
    return makeSfDirectFetch(accessToken, instanceUrl);
  }
  try {
    const { ReplitConnectors } = require("@replit/connectors-sdk") as typeof import("@replit/connectors-sdk");
    const connectors = new ReplitConnectors();
    const proxyFetch = connectors.createProxyFetch("salesforce");
    const proxyUrl   = connectors.getProxyUrl();
    return (path: string, init?: RequestInit): Promise<Response> => {
      const url = path.startsWith("http") ? path : `${proxyUrl}${path}`;
      return proxyFetch(url, init);
    };
  } catch {
    return null;
  }
}

// ── Confidence enum → boolean ─────────────────────────────────────────────────
// The confidence picker stores strings: "confident" | "fairly_sure" | "guessing".
// Only "confident" is treated as high-confidence for calibration purposes.
function isHighConfidence(confidence: string | null | undefined): boolean {
  return confidence === "confident";
}
import { parseBuildCheckRubric, runBuildChecks } from "../lib/buildCheckRunner.js";

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Ensure the item bank is seeded before any route that needs it. */
let seeded = false;
async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  await seedAssessmentItems();
  seeded = true;
}

type DomainRead = "settled" | "reading" | "not_yet";

interface DomainState {
  domain:       string;
  domainLabel:  string;
  domainWeight: number;
  read:         DomainRead;
  answeredCount: number;
  correctCount:  number;
}

/**
 * Returns the per-domain read state for a session.
 * settled = 3+ correct OR 5+ answered
 * reading = at least 1 answered but not settled
 * not_yet = 0 answered
 */
async function computeDomainReads(sessionId: number): Promise<DomainState[]> {
  // All domains from the item bank
  const domains = await db
    .selectDistinct({
      domain:       assessmentItemsTable.domain,
      domainLabel:  assessmentItemsTable.domainLabel,
      domainWeight: assessmentItemsTable.domainWeight,
    })
    .from(assessmentItemsTable)
    .orderBy(assessmentItemsTable.domain);

  // Per-domain response counts
  const stats = await db
    .select({
      domain:       assessmentItemsTable.domain,
      total:        count().as("total"),
      correct:      sql<number>`SUM(CASE WHEN ${assessmentResponsesTable.isCorrect} = true THEN 1 ELSE 0 END)`.as("correct"),
    })
    .from(assessmentResponsesTable)
    .innerJoin(assessmentItemsTable, eq(assessmentResponsesTable.itemId, assessmentItemsTable.id))
    .where(eq(assessmentResponsesTable.sessionId, sessionId))
    .groupBy(assessmentItemsTable.domain);

  const statsMap = new Map(stats.map(s => [s.domain, s]));

  return domains.map(d => {
    const s            = statsMap.get(d.domain);
    const answeredCount = Number(s?.total   ?? 0);
    const correctCount  = Number(s?.correct ?? 0);
    const settled       = correctCount >= 3 || answeredCount >= 5;
    const read: DomainRead =
      answeredCount === 0 ? "not_yet" :
      settled             ? "settled" : "reading";
    return {
      domain:       d.domain,
      domainLabel:  d.domainLabel,
      domainWeight: Number(d.domainWeight),
      read,
      answeredCount,
      correctCount,
    };
  });
}

// ── POST /assessments/sessions ─────────────────────────────────────────────────
// Start a new session or return the existing active one for this learner + instance.

router.post("/assessments/sessions", requireHomebaseAuth, async (req, res) => {
  const learnerEmail = res.locals["effectiveEmail"] as string;
  const { instance = "now" } = (req.body ?? {}) as { instance?: string };

  const validInstances = ["now", "week-6", "end"];
  if (!validInstances.includes(instance)) {
    return res.status(400).json({ error: "instance must be 'now', 'week-6', or 'end'" });
  }

  await ensureSeeded();

  // Return existing active session if present
  const existing = await db
    .select()
    .from(skillAssessmentSessionsTable)
    .where(
      and(
        eq(skillAssessmentSessionsTable.learnerEmail, learnerEmail),
        eq(skillAssessmentSessionsTable.instance, instance),
        eq(skillAssessmentSessionsTable.status, "active"),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const session     = existing[0]!;
    const domainReads = await computeDomainReads(session.id);
    return res.json({ session, domainReads, resumed: true });
  }

  const [session] = await db
    .insert(skillAssessmentSessionsTable)
    .values({ learnerEmail, instance, status: "active" })
    .returning();

  if (!session) return res.status(500).json({ error: "Failed to create session" });

  const domainReads = await computeDomainReads(session.id);
  logger.info({ learnerEmail, instance, sessionId: session.id }, "assessment session started");
  return res.status(201).json({ session, domainReads, resumed: false });
});

// ── GET /assessments/sessions/:id ─────────────────────────────────────────────

router.get("/assessments/sessions/:id", requireHomebaseAuth, async (req, res) => {
  const sessionId = parseInt(String(req.params["id"] ?? ""), 10);
  if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session id" });

  const learnerEmail = res.locals["effectiveEmail"] as string;

  const [session] = await db
    .select()
    .from(skillAssessmentSessionsTable)
    .where(
      and(
        eq(skillAssessmentSessionsTable.id, sessionId),
        eq(skillAssessmentSessionsTable.learnerEmail, learnerEmail),
      ),
    )
    .limit(1);

  if (!session) return res.status(404).json({ error: "Session not found" });

  const domainReads = await computeDomainReads(session.id);
  return res.json({ session, domainReads });
});

// ── GET /assessments/next-item/:sessionId ──────────────────────────────────────
//
// Adaptive next-item selection:
//  1. Find the first unsettled domain (fewest responses as tiebreaker)
//  2. Within that domain pick a random item the learner hasn't answered yet
//  3. Return { done: true } when all domains are settled

router.get("/assessments/next-item/:sessionId", requireHomebaseAuth, async (req, res) => {
  const sessionId = parseInt(String(req.params["sessionId"] ?? ""), 10);
  if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session id" });

  const learnerEmail = res.locals["effectiveEmail"] as string;

  const [session] = await db
    .select()
    .from(skillAssessmentSessionsTable)
    .where(
      and(
        eq(skillAssessmentSessionsTable.id, sessionId),
        eq(skillAssessmentSessionsTable.learnerEmail, learnerEmail),
      ),
    )
    .limit(1);

  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status !== "active") return res.json({ done: true, reason: "session_completed" });

  await ensureSeeded();

  const domainReads = await computeDomainReads(sessionId);
  const unsettled   = domainReads.filter(d => d.read !== "settled");

  if (unsettled.length === 0) {
    return res.json({ done: true, domainReads });
  }

  // Pick the unsettled domain with fewest answers (priority: least-answered first)
  unsettled.sort((a, b) => a.answeredCount - b.answeredCount);
  const targetDomain = unsettled[0]!;

  // Items already answered in this session
  const answeredItems = await db
    .select({ itemId: assessmentResponsesTable.itemId })
    .from(assessmentResponsesTable)
    .where(eq(assessmentResponsesTable.sessionId, sessionId));

  const answeredIds = answeredItems.map(r => r.itemId);

  // Pull candidate items for the target domain, excluding already-answered
  const candidates = await db
    .select()
    .from(assessmentItemsTable)
    .where(
      answeredIds.length > 0
        ? and(
            eq(assessmentItemsTable.domain, targetDomain.domain),
            not(inArray(assessmentItemsTable.id, answeredIds)),
          )
        : eq(assessmentItemsTable.domain, targetDomain.domain),
    );

  if (candidates.length === 0) {
    // Domain exhausted but not settled — re-run without that domain
    const nextUnsettled = unsettled.slice(1);
    if (nextUnsettled.length === 0) return res.json({ done: true, domainReads });
    const fallback = nextUnsettled[0]!;
    const fallbackItems = await db
      .select()
      .from(assessmentItemsTable)
      .where(eq(assessmentItemsTable.domain, fallback.domain));
    if (fallbackItems.length === 0) return res.json({ done: true, domainReads });
    const item = fallbackItems[Math.floor(Math.random() * fallbackItems.length)]!;
    return res.json({ item, domainReads, done: false });
  }

  // Random selection within domain
  const item = candidates[Math.floor(Math.random() * candidates.length)]!;

  // Strip correct_option before sending to client (never expose answers)
  const { correctOption: _hidden, ...safeItem } = item;
  void _hidden;

  return res.json({ item: safeItem, domainReads, done: false });
});

// ── POST /assessments/sessions/:id/respond ────────────────────────────────────

router.post("/assessments/sessions/:id/respond", requireHomebaseAuth, async (req, res) => {
  const sessionId = parseInt(String(req.params["id"] ?? ""), 10);
  if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session id" });

  const learnerEmail = res.locals["effectiveEmail"] as string;

  const [session] = await db
    .select()
    .from(skillAssessmentSessionsTable)
    .where(
      and(
        eq(skillAssessmentSessionsTable.id, sessionId),
        eq(skillAssessmentSessionsTable.learnerEmail, learnerEmail),
        eq(skillAssessmentSessionsTable.status, "active"),
      ),
    )
    .limit(1);

  if (!session) return res.status(404).json({ error: "Active session not found" });

  const {
    itemId,
    answer,
    confidence,
    keystrokeCount,
    pasteCount,
    focusTimeMs,
    longestInsertion,
    pasteRatio,
    screenShared,
    // NOTE: verificationResults from the client is NEVER used for scoring.
    // Build-check items are re-verified server-side in the scoring block below.
    // Accepting it here prevents client confusion; it has no effect on isCorrect.
  } = (req.body ?? {}) as {
    itemId?:           number;
    answer?:           string;
    confidence?:       string;
    keystrokeCount?:   number;
    pasteCount?:       number;
    focusTimeMs?:      number;
    longestInsertion?: number;
    pasteRatio?:       number;
    screenShared?:     boolean;
  };

  if (typeof itemId !== "number") {
    return res.status(400).json({ error: "itemId (number) is required" });
  }
  if (!answer || typeof answer !== "string") {
    return res.status(400).json({ error: "answer is required" });
  }

  const validConfidence = ["confident", "fairly_sure", "guessing"];
  if (confidence && !validConfidence.includes(confidence)) {
    return res.status(400).json({ error: `confidence must be one of: ${validConfidence.join(", ")}` });
  }

  // Fetch item to score
  const [item] = await db
    .select()
    .from(assessmentItemsTable)
    .where(eq(assessmentItemsTable.id, itemId))
    .limit(1);

  if (!item) return res.status(404).json({ error: "Item not found" });

  // Prevent duplicate responses for the same item in this session
  const [dupe] = await db
    .select()
    .from(assessmentResponsesTable)
    .where(
      and(
        eq(assessmentResponsesTable.sessionId, sessionId),
        eq(assessmentResponsesTable.itemId, itemId),
      ),
    )
    .limit(1);

  if (dupe) return res.status(409).json({ error: "Item already answered in this session" });

  // Score items by type:
  //   mc          — immediate pass/fail against correctOption
  //   build-check — re-run SF checks server-side; NEVER trust client-supplied results
  //   scenario    — scored asynchronously by Penny after insert
  let isCorrect: boolean | null          = null;
  let score: string | null               = null;
  let rubricScoresForInsert: unknown     = null;

  if (item.itemType === "mc" && item.correctOption) {
    isCorrect = answer.trim().toLowerCase() === item.correctOption.toLowerCase();
    score     = isCorrect ? "1" : "0";
  } else if (item.itemType === "build-check") {
    // Security: the client's verificationResults are ignored.
    // We re-run every SF check here so the server is the sole authority on pass/fail.
    // Build-check requires the learner's own personal SF dev org session.
    // getLearnerSfFetch returns null (never shared service account or connector)
    // so a learner without a connected org correctly gets 503.
    const sfFetch = getLearnerSfFetch(req);
    if (!sfFetch) {
      return res.status(503).json({
        sfNotConnected: true,
        error: "Connect your Salesforce developer org to verify this item.",
      });
    }
    const buildRubric = parseBuildCheckRubric(item.rubric);
    if (buildRubric && buildRubric.verificationCriteria.length > 0) {
      const checkResults    = await runBuildChecks(sfFetch, buildRubric.verificationCriteria);
      isCorrect             = checkResults.every(r => r.passed);
      score                 = isCorrect ? "1" : "0";
      rubricScoresForInsert = checkResults;
      logger.info(
        { sessionId, itemId, isCorrect, failCount: checkResults.filter(r => !r.passed).length },
        "build-check respond: server-side re-verification completed",
      );
    }
  }

  const [response] = await db
    .insert(assessmentResponsesTable)
    .values({
      sessionId,
      itemId,
      answer:           answer.trim(),
      confidence:       confidence       ?? null,
      score:            score,
      isCorrect:        isCorrect,
      keystrokeCount:   keystrokeCount   ?? null,
      pasteCount:       pasteCount       ?? null,
      focusTimeMs:      focusTimeMs      ?? null,
      longestInsertion: longestInsertion ?? null,
      pasteRatio:       pasteRatio != null ? String(pasteRatio) : null,
      screenShared:     screenShared     ?? null,
      rubricScores:     rubricScoresForInsert ?? null,
    })
    .returning();

  // ── Penny async rubric scoring for scenario items ──────────────────────────
  // Fire-and-forget — the shell advances immediately; scores persist to the
  // rubric_scores column in the background and surface at debrief time.
  if (item.itemType === "scenario" && item.rubric && response) {
    scoreScenarioResponse(response.id, item.question, answer.trim(), item.rubric).catch(
      (err: unknown) => logger.warn({ err, responseId: response?.id }, "Penny scenario scoring failed"),
    );
  }

  const domainReads = await computeDomainReads(sessionId);

  return res.status(201).json({
    response,
    isCorrect,
    correctOption: item.itemType === "mc" ? item.correctOption : null,
    explanation:   item.explanation ?? null,
    domainReads,
  });
});

// ── POST /assessments/sessions/:id/items/:itemId/verify ───────────────────────
// Run build-check verification for one item against the learner's connected SF org.
// Stateless — no DB write; results are sent back to the client and submitted
// via the normal respond route when the learner clicks Continue.
//
// 503 with { sfNotConnected: true } when no SF session is available.

router.post(
  "/assessments/sessions/:id/items/:itemId/verify",
  requireHomebaseAuth,
  async (req, res) => {
    const sessionId = parseInt(String(req.params["id"]     ?? ""), 10);
    const itemId    = parseInt(String(req.params["itemId"] ?? ""), 10);
    if (isNaN(sessionId) || isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid session or item id" });
    }

    const learnerEmail = res.locals["effectiveEmail"] as string;

    // Verify session belongs to this learner
    const [session] = await db
      .select()
      .from(skillAssessmentSessionsTable)
      .where(
        and(
          eq(skillAssessmentSessionsTable.id, sessionId),
          eq(skillAssessmentSessionsTable.learnerEmail, learnerEmail),
          eq(skillAssessmentSessionsTable.status, "active"),
        ),
      )
      .limit(1);

    if (!session) return res.status(404).json({ error: "Active session not found" });

    // Load item
    const [item] = await db
      .select()
      .from(assessmentItemsTable)
      .where(eq(assessmentItemsTable.id, itemId))
      .limit(1);

    if (!item)                          return res.status(404).json({ error: "Item not found" });
    if (item.itemType !== "build-check") return res.status(400).json({ error: "Item is not a build-check type" });

    // Parse the rubric
    const rubric = parseBuildCheckRubric(item.rubric);
    if (!rubric || rubric.verificationCriteria.length === 0) {
      return res.status(400).json({ error: "Item has no verification criteria configured" });
    }

    // Build-check requires the learner's own personal SF dev org session.
    // getLearnerSfFetch never falls back to shared service-account or connector,
    // so a learner without a connected org correctly gets 503 here.
    const sfFetch = getLearnerSfFetch(req);
    if (!sfFetch) {
      return res.status(503).json({ sfNotConnected: true, error: "Connect your Salesforce developer org to verify this item." });
    }

    // Run all checks in parallel
    const results = await runBuildChecks(sfFetch, rubric.verificationCriteria);
    const allPassed = results.every(r => r.passed);

    logger.info(
      { sessionId, itemId, allPassed, failCount: results.filter(r => !r.passed).length },
      "build-check verification completed",
    );

    return res.json({ results, allPassed });
  },
);

// ── POST /assessments/sessions/:id/complete ────────────────────────────────────

router.post("/assessments/sessions/:id/complete", requireHomebaseAuth, async (req, res) => {
  const sessionId = parseInt(String(req.params["id"] ?? ""), 10);
  if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session id" });

  const learnerEmail = res.locals["effectiveEmail"] as string;

  const [session] = await db
    .select()
    .from(skillAssessmentSessionsTable)
    .where(
      and(
        eq(skillAssessmentSessionsTable.id, sessionId),
        eq(skillAssessmentSessionsTable.learnerEmail, learnerEmail),
      ),
    )
    .limit(1);

  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status === "completed") {
    return res.json({ session, alreadyCompleted: true });
  }

  const [updated] = await db
    .update(skillAssessmentSessionsTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(skillAssessmentSessionsTable.id, sessionId))
    .returning();

  logger.info({ sessionId, learnerEmail }, "assessment session completed");

  const domainReads = await computeDomainReads(sessionId);

  // ── Fire-and-forget Salesforce write ────────────────────────────────────────
  // Write an Assessment_Result__c record so coaches have a permanent SF record.
  // Uses the shared connector credentials (not the learner's SF dev-org session).
  // Non-blocking: a failed SF write never prevents the response.
  const responses = await db
    .select({ isCorrect: assessmentResponsesTable.isCorrect })
    .from(assessmentResponsesTable)
    .where(eq(assessmentResponsesTable.sessionId, sessionId));
  const totalAnswered = responses.length;
  const totalCorrect  = responses.filter(r => r.isCorrect).length;
  const overallScore  = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const passed        = overallScore >= 70;

  try {
    // Use shared credentials only — never the learner's per-user SF session —
    // so the record lands in the canonical coaching org.
    const sfFetch = getSharedSfFetch();
    if (!sfFetch) throw new Error("No shared SF credentials available");
    const sfPayload = {
      Name:                  `${updated.instance.toUpperCase()} — ${learnerEmail.split("@")[0]?.slice(0, 30) ?? "learner"}`,
      Score__c:              overallScore,
      Passed__c:             passed,
      Total_Items_Answered__c: totalAnswered,
      Correct_Items__c:      totalCorrect,
      Session_Instance__c:   updated.instance,
      Learner_Email__c:      learnerEmail,
      Domain_Scores_JSON__c: JSON.stringify(
        domainReads.map(d => ({ domain: d.domain, score: d.answeredCount > 0 ? Math.round((d.correctCount / d.answeredCount) * 100) : null }))
      ).slice(0, 32000),
      Completed_Date__c:     updated.completedAt?.toISOString().split("T")[0] ?? new Date().toISOString().split("T")[0],
    };
    void sfFetch(`/services/data/v62.0/sobjects/Assessment_Result__c`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body:    JSON.stringify(sfPayload),
    }).then(async r => {
      if (!r.ok) {
        const body = await r.text().catch(() => "(unreadable)");
        logger.warn({ sessionId, sfStatus: r.status, body }, "Assessment_Result__c SF write returned non-2xx (non-blocking)");
      } else {
        logger.info({ sessionId, sfStatus: r.status, passed }, "Assessment_Result__c written to SF");
      }
    }).catch((sfErr: unknown) => {
      logger.warn({ sfErr, sessionId }, "Assessment_Result__c SF write failed (non-blocking)");
    });
  } catch (sfSetupErr: unknown) {
    logger.warn({ sfSetupErr, sessionId }, "SF connector unavailable for assessment result write (non-blocking)");
  }

  return res.json({ session: updated, domainReads, alreadyCompleted: false, overallScore, passed });
});

// ── GET /assessments/sessions/:id/debrief ─────────────────────────────────────
// Learner-owned debrief data: domain scores + confidence calibration.
// Does NOT expose correctOption — only the learner who owns the session can call this.

router.get("/assessments/sessions/:id/debrief", requireHomebaseAuth, async (req, res) => {
  const sessionId = parseInt(String(req.params["id"] ?? ""), 10);
  if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session id" });

  const learnerEmail = res.locals["effectiveEmail"] as string;

  const [session] = await db
    .select()
    .from(skillAssessmentSessionsTable)
    .where(and(
      eq(skillAssessmentSessionsTable.id, sessionId),
      eq(skillAssessmentSessionsTable.learnerEmail, learnerEmail),
    ))
    .limit(1);

  if (!session) return res.status(404).json({ error: "Session not found" });

  // Debrief is only valid for completed sessions — reject mid-assessment requests
  // to prevent score data from being read before the adaptive flow is finished.
  if (session.status !== "completed") {
    return res.status(409).json({ error: "Session is not yet completed" });
  }

  const domainReads = await computeDomainReads(sessionId);

  // Responses without correctOption (never expose answer key to the learner)
  const responses = await db
    .select({
      confidence:    assessmentResponsesTable.confidence,
      isCorrect:     assessmentResponsesTable.isCorrect,
      domain:        assessmentItemsTable.domain,
      domainLabel:   assessmentItemsTable.domainLabel,
      itemType:      assessmentItemsTable.itemType,
      rubricScores:  assessmentResponsesTable.rubricScores,
    })
    .from(assessmentResponsesTable)
    .innerJoin(assessmentItemsTable, eq(assessmentResponsesTable.itemId, assessmentItemsTable.id))
    .where(eq(assessmentResponsesTable.sessionId, sessionId))
    .orderBy(assessmentResponsesTable.respondedAt);

  // Confidence calibration — "confident" string = high-confidence.
  // The picker stores "confident" | "fairly_sure" | "guessing"; only "confident"
  // meets the threshold. isHighConfidence() handles this mapping explicitly
  // so NaN from Number(string) never silently zeroes out the counts.
  let calibrated = 0, misconception = 0, insight = 0, needsWork = 0;

  // Per-domain calibration map
  const domainCalMap = new Map<string, {
    domain: string; domainLabel: string;
    calibrated: number; misconception: number; insight: number; needsWork: number;
    total: number; correct: number;
  }>();

  for (const r of responses) {
    const isConf  = isHighConfidence(r.confidence);
    const correct = r.isCorrect ?? false;

    if (isConf && correct)  calibrated++;
    else if (isConf)         misconception++;
    else if (correct)        insight++;
    else                     needsWork++;

    if (!domainCalMap.has(r.domain)) {
      domainCalMap.set(r.domain, { domain: r.domain, domainLabel: r.domainLabel, calibrated: 0, misconception: 0, insight: 0, needsWork: 0, total: 0, correct: 0 });
    }
    const dc = domainCalMap.get(r.domain)!;
    dc.total++;
    if (correct) dc.correct++;
    if (isConf && correct)  dc.calibrated++;
    else if (isConf)         dc.misconception++;
    else if (correct)        dc.insight++;
    else                     dc.needsWork++;
  }

  const totalAnswered = responses.length;
  const totalCorrect  = responses.filter(r => r.isCorrect).length;
  const overallScore  = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  return res.json({
    session,
    domainReads,
    confidenceCalibration: { calibrated, misconception, insight, needsWork, total: totalAnswered },
    domainCalibration: Array.from(domainCalMap.values()),
    summary: {
      totalAnswered,
      totalCorrect,
      overallScore,
      passed: overallScore >= 70,
      settledDomains: domainReads.filter(d => d.read === "settled").length,
      totalDomains: domainReads.length,
    },
  });
});

// ── GET /assessments/staff/sessions ───────────────────────────────────────────
// Coach view: all assessment sessions for a specific learner by email.
// Staff-only. Returns per-session domain scores + calibration summary.

router.get(
  "/assessments/staff/sessions",
  requireStaff as import("express").RequestHandler,
  async (req, res) => {
    const learnerEmail = String(req.query["learnerEmail"] ?? "").trim();
    if (!learnerEmail) return res.status(400).json({ error: "learnerEmail query param required" });

    const sessions = await db
      .select()
      .from(skillAssessmentSessionsTable)
      .where(eq(skillAssessmentSessionsTable.learnerEmail, learnerEmail))
      .orderBy(desc(skillAssessmentSessionsTable.startedAt));

    // Enrich each session with domain reads + overall score
    const enriched = await Promise.all(sessions.map(async s => {
      const domainReads = await computeDomainReads(s.id);
      const resps = await db
        .select({ confidence: assessmentResponsesTable.confidence, isCorrect: assessmentResponsesTable.isCorrect })
        .from(assessmentResponsesTable)
        .where(eq(assessmentResponsesTable.sessionId, s.id));

      const total   = resps.length;
      const correct = resps.filter(r => r.isCorrect).length;
      const score   = total > 0 ? Math.round((correct / total) * 100) : 0;

      // Confidence calibration — "confident" string = high-confidence.
      let calibrated = 0, misconception = 0;
      for (const r of resps) {
        const isConf = isHighConfidence(r.confidence);
        if (isConf && r.isCorrect)  calibrated++;
        else if (isConf)             misconception++;
      }

      return { ...s, domainReads, overallScore: score, passed: score >= 70, totalAnswered: total, totalCorrect: correct, calibrated, misconception };
    }));

    return res.json({ sessions: enriched });
  },
);

// ── GET /assessments/staff/overview ───────────────────────────────────────────
// Staff Assessments page: aggregate view of all completed sessions across learners.
// Staff-only. Replaces the hardcoded LEARNER_RESULTS array in the frontend.

router.get(
  "/assessments/staff/overview",
  requireStaff as import("express").RequestHandler,
  async (req, res) => {
    const completed = await db
      .select()
      .from(skillAssessmentSessionsTable)
      .where(eq(skillAssessmentSessionsTable.status, "completed"))
      .orderBy(desc(skillAssessmentSessionsTable.completedAt))
      .limit(100);

    const enriched = await Promise.all(completed.map(async s => {
      const resps = await db
        .select({ isCorrect: assessmentResponsesTable.isCorrect })
        .from(assessmentResponsesTable)
        .where(eq(assessmentResponsesTable.sessionId, s.id));

      const total   = resps.length;
      const correct = resps.filter(r => r.isCorrect).length;
      const score   = total > 0 ? Math.round((correct / total) * 100) : 0;

      return {
        id:           s.id,
        learnerEmail: s.learnerEmail,
        instance:     s.instance,
        completedAt:  s.completedAt,
        startedAt:    s.startedAt,
        score,
        passed:       score >= 70,
        totalAnswered: total,
        totalCorrect:  correct,
      };
    }));

    const total        = enriched.length;
    const passedCount  = enriched.filter(s => s.passed).length;
    const avgScore     = total > 0 ? Math.round(enriched.reduce((acc, s) => acc + s.score, 0) / total) : 0;
    const needsCoaching = enriched.filter(s => !s.passed).length;

    return res.json({
      sessions: enriched,
      stats: {
        total,
        passed:       passedCount,
        passRate:     total > 0 ? Math.round((passedCount / total) * 100) : 0,
        avgScore,
        needsCoaching,
      },
    });
  },
);

// ── GET /assessments/sessions/:id/results ─────────────────────────────────────
// Staff-accessible results endpoint — explicit requireStaff guard because the
// /assessments prefix is exempt from the global staffAuthGate (learner routes need it).

router.get("/assessments/sessions/:id/results", requireStaff as import("express").RequestHandler, async (req, res) => {
  const sessionId = parseInt(String(req.params["id"] ?? ""), 10);
  if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session id" });

  const [session] = await db
    .select()
    .from(skillAssessmentSessionsTable)
    .where(eq(skillAssessmentSessionsTable.id, sessionId))
    .limit(1);

  if (!session) return res.status(404).json({ error: "Session not found" });

  // Per-domain settled scores
  const domainReads = await computeDomainReads(sessionId);

  // Full response log with item detail (for debrief UI)
  const responses = await db
    .select({
      responseId:    assessmentResponsesTable.id,
      itemId:        assessmentResponsesTable.itemId,
      answer:        assessmentResponsesTable.answer,
      confidence:    assessmentResponsesTable.confidence,
      score:         assessmentResponsesTable.score,
      isCorrect:     assessmentResponsesTable.isCorrect,
      keystrokeCount:   assessmentResponsesTable.keystrokeCount,
      pasteCount:       assessmentResponsesTable.pasteCount,
      focusTimeMs:      assessmentResponsesTable.focusTimeMs,
      // Extended coach-signal and Penny-scoring fields (added in 0013 migration)
      longestInsertion: assessmentResponsesTable.longestInsertion,
      pasteRatio:       assessmentResponsesTable.pasteRatio,
      screenShared:     assessmentResponsesTable.screenShared,
      rubricScores:     assessmentResponsesTable.rubricScores,
      respondedAt:      assessmentResponsesTable.respondedAt,
      // Item detail
      question:         assessmentItemsTable.question,
      domain:           assessmentItemsTable.domain,
      domainLabel:      assessmentItemsTable.domainLabel,
      itemType:         assessmentItemsTable.itemType,
      correctOption:    assessmentItemsTable.correctOption,
      explanation:      assessmentItemsTable.explanation,
      options:          assessmentItemsTable.options,
      rubric:           assessmentItemsTable.rubric,
    })
    .from(assessmentResponsesTable)
    .innerJoin(assessmentItemsTable, eq(assessmentResponsesTable.itemId, assessmentItemsTable.id))
    .where(eq(assessmentResponsesTable.sessionId, sessionId))
    .orderBy(assessmentResponsesTable.respondedAt);

  // Overall score
  const totalAnswered = responses.length;
  const totalCorrect  = responses.filter(r => r.isCorrect).length;
  const overallScore  = totalAnswered > 0
    ? Math.round((totalCorrect / totalAnswered) * 100)
    : 0;

  return res.json({
    session,
    domainReads,
    responses,
    summary: {
      totalAnswered,
      totalCorrect,
      overallScore,
      settledDomains: domainReads.filter(d => d.read === "settled").length,
      totalDomains:   domainReads.length,
    },
  });
});

export default router;
