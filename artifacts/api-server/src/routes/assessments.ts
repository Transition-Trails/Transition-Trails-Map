/**
 * assessments.ts  —  /api/assessments/*
 *
 * Skill Assessment session lifecycle and adaptive item selection for the
 * Trail OS v1.7 Skill Assessment feature.
 *
 * Routes:
 *   POST   /assessments/sessions             — start or resume a session
 *   GET    /assessments/sessions/:id         — get session + domain-reads state
 *   GET    /assessments/next-item/:sessionId — adaptive next item selector
 *   POST   /assessments/sessions/:id/respond — record a response
 *   POST   /assessments/sessions/:id/complete — mark session done
 *   GET    /assessments/sessions/:id/results  — per-domain debrief data
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
import { eq, and, count, sql, not, inArray } from "drizzle-orm";
import { requireHomebaseAuth, requireStaff } from "../middlewares/requireAuth.js";
import { logger }                            from "../lib/logger.js";
import { seedAssessmentItems }               from "../scripts/seedAssessmentItems.js";

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
  } = (req.body ?? {}) as {
    itemId?:         number;
    answer?:         string;
    confidence?:     string;
    keystrokeCount?: number;
    pasteCount?:     number;
    focusTimeMs?:    number;
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

  // Score MC items; scenario/build-check scored externally (score = null for now)
  let isCorrect: boolean | null = null;
  let score: string | null      = null;

  if (item.itemType === "mc" && item.correctOption) {
    isCorrect = answer.trim().toLowerCase() === item.correctOption.toLowerCase();
    score     = isCorrect ? "1" : "0";
  }

  const [response] = await db
    .insert(assessmentResponsesTable)
    .values({
      sessionId,
      itemId,
      answer:         answer.trim(),
      confidence:     confidence ?? null,
      score:          score,
      isCorrect:      isCorrect,
      keystrokeCount: keystrokeCount ?? null,
      pasteCount:     pasteCount     ?? null,
      focusTimeMs:    focusTimeMs    ?? null,
    })
    .returning();

  const domainReads = await computeDomainReads(sessionId);

  return res.status(201).json({
    response,
    isCorrect,
    correctOption: item.itemType === "mc" ? item.correctOption : null,
    explanation:   item.explanation ?? null,
    domainReads,
  });
});

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
  return res.json({ session: updated, domainReads, alreadyCompleted: false });
});

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
      keystrokeCount: assessmentResponsesTable.keystrokeCount,
      pasteCount:    assessmentResponsesTable.pasteCount,
      focusTimeMs:   assessmentResponsesTable.focusTimeMs,
      respondedAt:   assessmentResponsesTable.respondedAt,
      // Item detail
      question:      assessmentItemsTable.question,
      domain:        assessmentItemsTable.domain,
      domainLabel:   assessmentItemsTable.domainLabel,
      itemType:      assessmentItemsTable.itemType,
      correctOption: assessmentItemsTable.correctOption,
      explanation:   assessmentItemsTable.explanation,
      options:       assessmentItemsTable.options,
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
