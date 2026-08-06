/**
 * homebase.ts
 *
 * Routes for the Trail OS Homebase — the external-facing surface for Learners,
 * Coaches, and Volunteers. These routes are distinct from the internal admin
 * surface and use homebase-specific auth middleware.
 *
 * Public (no auth):
 *   GET  /auth/homebase/status   — returns audience + sign-in state from session
 *
 * Homebase-auth-gated:
 *   POST /homebase/log-time      — record a time entry for the current user
 *   GET  /homebase/log-time      — fetch the current user's time entries for this month
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { timeLogsTable } from "@workspace/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import { requireHomebaseAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router = Router();

// ── /auth/homebase/status ─────────────────────────────────────────────────────
//
// Returns the homebase session state.  Safe to call when not signed in
// (returns { isSignedIn: false }) — used by the HomebaseRoute guard on the
// frontend to decide which shell to render.

router.get("/auth/homebase/status", (req, res) => {
  const email    = req.session.googleEmail;
  const audience = req.session.googleAudience ?? null;

  if (!email) {
    // No session — unauthenticated
    res.json({ isSignedIn: false, audience: null });
    return;
  }

  // Authenticated — could be staff (audience:null) or homebase (audience set)
  res.json({
    isSignedIn:  true,
    audience,
    email,
    displayName: req.session.googleName ?? email,
    coachLevel:  req.session.coachLevel ?? null,
  });
});

// ── POST /homebase/log-time ───────────────────────────────────────────────────

router.post("/homebase/log-time", requireHomebaseAuth, async (req, res) => {
  const email    = req.session.googleEmail!;
  const audience = req.session.googleAudience!;

  const { activityLabel, hours } = req.body as {
    activityLabel?: unknown;
    hours?:         unknown;
  };

  if (typeof activityLabel !== "string" || !activityLabel.trim()) {
    res.status(400).json({ error: "activityLabel is required" });
    return;
  }

  const parsedHours = Number(hours);
  if (!Number.isFinite(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
    res.status(400).json({ error: "hours must be a positive number (max 24)" });
    return;
  }

  try {
    const [row] = await db
      .insert(timeLogsTable)
      .values({
        userEmail:     email,
        audience,
        activityLabel: activityLabel.trim(),
        hours:         parsedHours.toFixed(2),
      })
      .returning();

    logger.info({ email, audience, hours: parsedHours }, "homebase: time logged");
    res.status(201).json({ ok: true, entry: row });
  } catch (err) {
    logger.error({ err }, "homebase: error inserting time log");
    res.status(500).json({ error: "Failed to save time entry" });
  }
});

// ── GET /homebase/log-time ────────────────────────────────────────────────────

router.get("/homebase/log-time", requireHomebaseAuth, async (req, res) => {
  const email = req.session.googleEmail!;

  // Start of current calendar month
  const now       = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const rows = await db
      .select()
      .from(timeLogsTable)
      .where(eq(timeLogsTable.userEmail, email))
      .orderBy(desc(timeLogsTable.loggedAt));

    // Filter in JS for current month (avoids timezone edge cases in SQL)
    const thisMonth = rows.filter(r => new Date(r.loggedAt) >= monthStart);

    const totalHours = thisMonth.reduce((sum, r) => sum + Number(r.hours), 0);

    res.json({ entries: thisMonth, totalHours: Math.round(totalHours * 100) / 100 });
  } catch (err) {
    logger.error({ err }, "homebase: error fetching time logs");
    res.status(500).json({ error: "Failed to load time entries" });
  }
});

// ── SF service token helpers ──────────────────────────────────────────────────
//
// Homebase learners authenticate via Google SSO, not Salesforce OAuth.
// The service token (SF_SERVICE_TOKEN) is the only viable way to query SF
// on their behalf.  Same pattern as artifacts/api-server/src/routes/learner.ts.
//
// Error contract (IMPORTANT):
//   - sfSvcQuery throws SfNotConfiguredError when the token or instance URL is absent.
//   - sfSvcQuery throws Error when the HTTP response is non-2xx or the fetch times out.
//   - sfSvcQuery returns [] ONLY when the query succeeded but Salesforce returned no records.
//
// Callers MUST distinguish these three cases:
//   SfNotConfiguredError  → credentials missing (expected in dev); respond with sfUnavailable:true
//   other Error           → SF reachable but query failed; respond 503 with sfUnavailable:true
//   []                    → query succeeded, genuinely no matching records

const SVC_SF_VERSION = "v62.0";

class SfNotConfiguredError extends Error {
  constructor() { super("SF_SERVICE_TOKEN or SALESFORCE_INSTANCE_URL not set"); this.name = "SfNotConfiguredError"; }
}

function sfSvcApi(): string | null {
  const u = process.env["SALESFORCE_INSTANCE_URL"];
  return u ? `${u}/services/data/${SVC_SF_VERSION}` : null;
}
function sfSvcToken(): string | null {
  return process.env["SF_SERVICE_TOKEN"] ?? null;
}

async function sfSvcQuery<T>(soql: string): Promise<T[]> {
  const api   = sfSvcApi();
  const token = sfSvcToken();
  if (!api || !token) throw new SfNotConfiguredError();

  const res = await fetch(`${api}/query?q=${encodeURIComponent(soql)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal:  AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Salesforce query failed (${res.status}): ${body.slice(0, 100)}`);
  }

  const d = await res.json() as { records: T[] };
  return d.records ?? [];
}

// ── requireLearnerAudience ────────────────────────────────────────────────────

function requireLearnerAudience(
  req:  import("express").Request,
  res:  import("express").Response,
  next: import("express").NextFunction,
): void {
  if (req.session.googleAudience !== "learner") {
    res.status(403).json({ error: "This resource is only available to learners." });
    return;
  }
  next();
}

// ── GET /homebase/learner/quest ───────────────────────────────────────────────
//
// Returns today's quest (cached in session).  Generates via Gemini if absent.
// If Gemini is not configured, returns quest: null so the UI shows an empty state.

router.get("/homebase/learner/quest", requireHomebaseAuth, requireLearnerAudience, async (req, res) => {
  const today    = new Date().toISOString().slice(0, 10);
  const stoneSet = req.session.homebaseStoneSet === today;

  // Return cached quest for today
  if (req.session.homebaseQuestDate === today && req.session.homebaseQuest) {
    res.json({
      quest:          req.session.homebaseQuest,
      stoneSet,
      stonesThisCairn: stoneSet ? 1 : 0,
      cairnTarget:    7,
      trailBehind:    [],
    });
    return;
  }

  const email  = req.session.googleEmail!;
  const apiKey = process.env["GEMINI_API_KEY"];

  if (!apiKey) {
    res.json({ quest: null, stoneSet: false, stonesThisCairn: 0, cairnTarget: 7, trailBehind: [] });
    return;
  }

  // Best-effort: fetch learner context from SF Contact for a personalised prompt.
  // This is advisory — if SF is unavailable or not configured, quest generation
  // proceeds with defaults (Salesforce Admin trail / Explore phase).
  let trail = "Salesforce Admin";
  let phase  = "Explore";
  let goal   = "Develop Salesforce Admin skills";

  try {
    const contacts = await sfSvcQuery<{
      Penny_Trail__c:        string | null;
      Penny_Current_Phase__c: string | null;
      Penny_Current_Goal__c:  string | null;
    }>(`SELECT Penny_Trail__c, Penny_Current_Phase__c, Penny_Current_Goal__c FROM Contact WHERE Email = '${email.replace(/'/g, "\\'")}' LIMIT 1`);

    const ctx = contacts[0];
    if (ctx) {
      trail = ctx.Penny_Trail__c         ?? trail;
      phase = ctx.Penny_Current_Phase__c ?? phase;
      goal  = ctx.Penny_Current_Goal__c  ?? goal;
    }
  } catch {
    // SF unavailable — use defaults above
  }

  try {
    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: `You are Penny, an AI coaching companion for Transition Trails Academy. Generate exactly one daily Salesforce Admin learning quest for a learner on the ${trail} trail in phase ${phase}. The quest must be a practical scenario-based challenge that takes 10–15 minutes.` }],
          },
          contents: [{
            role:  "user",
            parts: [{ text: `Generate today's daily quest for a ${trail} learner in phase ${phase} with goal: ${goal}. Return JSON with these exact fields: { "title": string, "description": string, "difficulty": "Beginner"|"Intermediate"|"Expert", "pointValue": number (10 for Beginner, 25 for Intermediate, 50 for Expert), "category": string, "acceptanceCriteria": string }` }],
          }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 512, temperature: 0.8 },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!gemRes.ok) {
      res.json({ quest: null, stoneSet: false, stonesThisCairn: 0, cairnTarget: 7, trailBehind: [] });
      return;
    }

    const body  = await gemRes.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw   = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const quest = JSON.parse(raw) as Record<string, unknown>;

    req.session.homebaseQuest     = quest;
    req.session.homebaseQuestDate = today;
    req.session.save((err) => {
      if (err) logger.warn({ err }, "homebase/quest: session save error");
    });

    res.json({ quest, stoneSet: false, stonesThisCairn: 0, cairnTarget: 7, trailBehind: [] });
  } catch (err) {
    logger.warn({ err }, "homebase/learner/quest: generation failed");
    res.json({ quest: null, stoneSet: false, stonesThisCairn: 0, cairnTarget: 7, trailBehind: [] });
  }
});

// ── POST /homebase/learner/quest/set-stone ────────────────────────────────────
//
// Marks "today's stone" as set for the session.  SF persistence is deferred
// to task #254 (Salesforce fields provisioning).

router.post("/homebase/learner/quest/set-stone", requireHomebaseAuth, requireLearnerAudience, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  req.session.homebaseStoneSet = today;
  req.session.save((err) => {
    if (err) logger.warn({ err }, "homebase/set-stone: session save error");
  });
  res.json({ ok: true, stoneSet: true, stonesThisCairn: 1 });
});

// ── GET /homebase/learner/cases ───────────────────────────────────────────────
//
// Returns open SF Cases linked to the learner's Contact record.
// linked:false signals the UI to render the "account setup" empty state rather
// than an empty list, which would be misleading.

router.get("/homebase/learner/cases", requireHomebaseAuth, requireLearnerAudience, async (req, res) => {
  const email = req.session.googleEmail!;

  // ── Step 1: look up Contact by email ──────────────────────────────────────
  let contactId: string | null;
  try {
    const contacts = await sfSvcQuery<{ Id: string }>(
      `SELECT Id FROM Contact WHERE Email = '${email.replace(/'/g, "\\'")}' LIMIT 1`,
    );
    contactId = contacts[0]?.Id ?? null;
  } catch (err) {
    if (err instanceof SfNotConfiguredError) {
      // Credentials absent (common in dev without SF_SERVICE_TOKEN).
      // Return sfUnavailable so the UI shows "Salesforce connection unavailable"
      // rather than the misleading "account setup" empty state.
      res.json({ linked: null, sfUnavailable: true, cases: [], totalOpen: 0 });
      return;
    }
    logger.warn({ err }, "homebase/learner/cases: SF contact lookup failed");
    res.status(503).json({ error: "Salesforce temporarily unavailable", sfUnavailable: true });
    return;
  }

  // ── Step 2: no Contact → genuinely unlinked account ──────────────────────
  if (!contactId) {
    // Query succeeded but returned no record — the learner's email is not in SF.
    res.json({ linked: false, sfUnavailable: false, cases: [], totalOpen: 0 });
    return;
  }

  // ── Step 3: fetch open Cases for this Contact ─────────────────────────────
  type CaseRecord = {
    Id:               string;
    CaseNumber:       string | null;
    Subject:          string | null;
    Status:           string | null;
    Priority:         string | null;
    LastModifiedDate: string | null;
    CreatedDate:      string | null;
  };

  let cases: CaseRecord[];
  try {
    cases = await sfSvcQuery<CaseRecord>(
      `SELECT Id, CaseNumber, Subject, Status, Priority, LastModifiedDate, CreatedDate FROM Case WHERE ContactId = '${contactId}' AND IsClosed = false ORDER BY LastModifiedDate DESC LIMIT 20`,
    );
  } catch (err) {
    logger.warn({ err }, "homebase/learner/cases: Case query failed");
    res.status(503).json({ error: "Salesforce temporarily unavailable", sfUnavailable: true });
    return;
  }

  res.json({ linked: true, sfUnavailable: false, cases, totalOpen: cases.length });
});

// ── GET /homebase/learner/week ────────────────────────────────────────────────
//
// Phase 1: SF objects not yet provisioned (task #254).
// Returns an empty item list with hasData:false so the UI renders the honest
// "Nothing scheduled yet" empty state.

router.get("/homebase/learner/week", requireHomebaseAuth, requireLearnerAudience, (_req, res) => {
  res.json({ items: [], hasData: false });
});

// ── GET /homebase/learner/coach ───────────────────────────────────────────────
//
// Phase 1: Coaching relationship fields not yet provisioned in SF (task #254).
// Returns coach: null so the UI renders the Penny fallback.

router.get("/homebase/learner/coach", requireHomebaseAuth, requireLearnerAudience, async (req, res) => {
  const email = req.session.googleEmail!;

  let linked: boolean;
  try {
    const contacts = await sfSvcQuery<{ Id: string }>(
      `SELECT Id FROM Contact WHERE Email = '${email.replace(/'/g, "\\'")}' LIMIT 1`,
    );
    linked = !!contacts[0]?.Id;
  } catch (err) {
    if (err instanceof SfNotConfiguredError) {
      res.json({ coach: null, cohortSlackChannel: null, linked: null, sfUnavailable: true });
      return;
    }
    logger.warn({ err }, "homebase/learner/coach: SF contact lookup failed");
    res.status(503).json({ error: "Salesforce temporarily unavailable", sfUnavailable: true });
    return;
  }

  res.json({ coach: null, cohortSlackChannel: null, linked, sfUnavailable: false });
});

// ── requireCoachAudience ──────────────────────────────────────────────────────
//
// Guards all /homebase/coach/* routes.  Audience must be exactly 'coach';
// learner / volunteer / staff all get 403.

function requireCoachAudience(req: Request, res: Response, next: NextFunction): void {
  if (req.session.googleAudience !== "coach") {
    res.status(403).json({ error: "This resource is only available to coaches." });
    return;
  }
  next();
}

// ── GET /homebase/coach/penny-prepared ────────────────────────────────────────
//
// Returns draft items that Penny has staged for coach review:
// draft verdicts, date-change proposals, countersign requests, nudges.
//
// Phase 1: Penny coaching layer not yet wired (task #254 provisions SF fields).
// Returns an empty list so the UI renders the honest empty state.
// Each real item shape: { id, kind, title, body }

router.get("/homebase/coach/penny-prepared", requireHomebaseAuth, requireCoachAudience, (_req, res) => {
  // Phase 1 stub — replace with Penny prep query once SF coaching fields exist.
  res.json({ items: [], hasData: false });
});

// ── GET /homebase/coach/artefacts ─────────────────────────────────────────────
//
// Lists learner artefacts awaiting a coach verdict.
// Heading and CTA label vary by coach level:
//   assistant  → "Artefacts to read" / "Draft →"
//   others     → "Artefacts awaiting a verdict" / "Issue verdict →"
//
// Phase 1 stub — SF artefact objects not yet provisioned.

router.get("/homebase/coach/artefacts", requireHomebaseAuth, requireCoachAudience, (_req, res) => {
  res.json({ items: [], hasData: false });
});

// ── GET /homebase/coach/squad ─────────────────────────────────────────────────
//
// Returns squad learner cards for the current coach.
// Advanced coaches see both squads.
//
// Each learner shape:
//   { id, name, buddy, activity, phase, passedCount, reworkCount, isStuck }
//
// Phase 1 stub — coach–learner assignment not yet SF-backed.

router.get("/homebase/coach/squad", requireHomebaseAuth, requireCoachAudience, (_req, res) => {
  res.json({ squads: [], hasData: false });
});

// ── GET /homebase/coach/lead ──────────────────────────────────────────────────
//
// Returns the lead coach contact info for the right People panel.
// Also returns the cohort Slack channel for the channel feed.
//
// Phase 1: SF coaching fields not yet provisioned.  Returns sfUnavailable when
// SF service token is absent; null lead otherwise.

router.get("/homebase/coach/lead", requireHomebaseAuth, requireCoachAudience, async (req, res) => {
  const email = req.session.googleEmail!;

  let linked: boolean;
  try {
    const contacts = await sfSvcQuery<{ Id: string }>(
      `SELECT Id FROM Contact WHERE Email = '${email.replace(/'/g, "\\'")}' LIMIT 1`,
    );
    linked = !!contacts[0]?.Id;
  } catch (err) {
    if (err instanceof SfNotConfiguredError) {
      res.json({ lead: null, cohortSlackChannel: null, linked: null, sfUnavailable: true });
      return;
    }
    logger.warn({ err }, "homebase/coach/lead: SF contact lookup failed");
    res.status(503).json({ error: "Salesforce temporarily unavailable", sfUnavailable: true });
    return;
  }

  // Phase 1: lead coach info not yet in SF — return null stub.
  res.json({ lead: null, cohortSlackChannel: null, linked, sfUnavailable: false });
});

// ── GET /homebase/coach/cases ─────────────────────────────────────────────────
//
// Returns open SF Cases linked to the coach's own Contact record.
// Same three-state error contract as the learner cases endpoint:
//   SfNotConfiguredError → { sfUnavailable:true, linked:null }
//   HTTP error           → 503 { sfUnavailable:true }
//   No Contact record    → { linked:false }
//   Records found        → { linked:true, cases, totalOpen }

router.get("/homebase/coach/cases", requireHomebaseAuth, requireCoachAudience, async (req, res) => {
  const email = req.session.googleEmail!;

  // ── Step 1: look up Contact by email ──────────────────────────────────────
  let contactId: string | null;
  try {
    const contacts = await sfSvcQuery<{ Id: string }>(
      `SELECT Id FROM Contact WHERE Email = '${email.replace(/'/g, "\\'")}' LIMIT 1`,
    );
    contactId = contacts[0]?.Id ?? null;
  } catch (err) {
    if (err instanceof SfNotConfiguredError) {
      res.json({ linked: null, sfUnavailable: true, cases: [], totalOpen: 0 });
      return;
    }
    logger.warn({ err }, "homebase/coach/cases: SF contact lookup failed");
    res.status(503).json({ error: "Salesforce temporarily unavailable", sfUnavailable: true });
    return;
  }

  // ── Step 2: no Contact → genuinely unlinked account ──────────────────────
  if (!contactId) {
    res.json({ linked: false, sfUnavailable: false, cases: [], totalOpen: 0 });
    return;
  }

  // ── Step 3: fetch open Cases for this Contact ─────────────────────────────
  type CaseRecord = {
    Id:               string;
    CaseNumber:       string | null;
    Subject:          string | null;
    Status:           string | null;
    Priority:         string | null;
    LastModifiedDate: string | null;
    CreatedDate:      string | null;
  };

  let cases: CaseRecord[];
  try {
    cases = await sfSvcQuery<CaseRecord>(
      `SELECT Id, CaseNumber, Subject, Status, Priority, LastModifiedDate, CreatedDate FROM Case WHERE ContactId = '${contactId}' AND IsClosed = false ORDER BY LastModifiedDate DESC LIMIT 20`,
    );
  } catch (err) {
    logger.warn({ err }, "homebase/coach/cases: Case query failed");
    res.status(503).json({ error: "Salesforce temporarily unavailable", sfUnavailable: true });
    return;
  }

  res.json({ linked: true, sfUnavailable: false, cases, totalOpen: cases.length });
});

export default router;
