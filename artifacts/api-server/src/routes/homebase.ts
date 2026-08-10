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
import { timeLogsTable, volunteerProfilesTable, coachProfilesTable } from "@workspace/db/schema";
import { desc, eq, gte, and } from "drizzle-orm";
import { requireHomebaseAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";
import { getGroupsForUser } from "../lib/googleGroupsCache";
import { deriveAudience, isKnownStaff } from "./googleSignIn";

const router = Router();

// ── /auth/homebase/status ─────────────────────────────────────────────────────
//
// Returns the homebase session state.  Safe to call when not signed in
// (returns { isSignedIn: false }) — used by the HomebaseRoute guard on the
// frontend to decide which shell to render.

router.get("/auth/homebase/status", async (req, res) => {
  const email = req.session.googleEmail;

  if (!email) {
    // No session — unauthenticated
    res.json({ isSignedIn: false, audience: null });
    return;
  }

  const now = Date.now();

  // If the group cache has expired, re-fetch groups and re-derive the audience
  // so a group change (e.g. a user removed from the coaches group) is reflected
  // without requiring a sign-out.  This mirrors the refresh logic in /me.
  if (!req.session.googleGroupsExpiry || req.session.googleGroupsExpiry <= now) {
    const { groups, isReliable } = await getGroupsForUser(email);

    if (!isReliable) {
      // The Directory API was unavailable (no token or network error).
      // Do NOT sign the user out — an empty groups list here means "couldn't
      // check", not "confirmed non-member". Leave the TTL expired so the
      // next request retries.
      logger.warn({ email }, "homebase/status: group refresh unreliable — serving cached audience");
    } else {
      const hasStaff = isKnownStaff(groups, email);
      const audience = hasStaff ? null : deriveAudience(groups, email);

      if (!hasStaff && !audience) {
        // API responded and confirmed the user is in no known group — end session.
        logger.warn({ email }, "homebase/status: user is no longer in any known group — ending session");
        req.session.destroy(() => {});
        res.json({ isSignedIn: false, audience: null, reason: "no_groups" });
        return;
      }

      req.session.googleGroups       = groups;
      req.session.googleGroupsExpiry = now + 5 * 60 * 1000;
      req.session.googleAudience     = audience ?? undefined;

      // If the refreshed audience is 'coach', re-fetch the coach level from the
      // DB so a profile change (e.g. promotion to 'advanced') is reflected
      // without requiring a sign-out.  A missing row or a DB error leaves the
      // session value untouched (null by default) and never blocks the response.
      if (audience === "coach") {
        try {
          const rows = await db
            .select()
            .from(coachProfilesTable)
            .where(eq(coachProfilesTable.userEmail, email))
            .limit(1);
          req.session.coachLevel =
            (rows[0]?.coachLevel as typeof req.session.coachLevel) ?? null;
        } catch (err) {
          logger.warn(
            { err },
            "homebase/status: DB coachLevel re-fetch failed — serving cached value",
          );
        }
      }

      // Fire-and-forget save — we return the fresh data immediately below
      req.session.save(() => {});
    }
  }

  const audience = req.session.googleAudience ?? null;

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

// ── Volunteer audience guard ───────────────────────────────────────────────────

function requireVolunteerAudience(req: Request, res: Response, next: NextFunction): void {
  if (req.session.googleAudience !== "volunteer") {
    res.status(403).json({ error: "Volunteer access only" });
    return;
  }
  next();
}

// ── Volunteer helper: resolve or upsert profile ───────────────────────────────

interface VolunteerProfileRow {
  userEmail:             string;
  monthlyCommitmentHours: number | null;
  caseLimit:             number | null;
  specialty:             string | null;
  coordinatorSlackId:    string | null;
  coordinatorName:       string | null;
  volunteerSlackChannel: string | null;
  updatedAt:             Date;
}

async function getOrCreateVolunteerProfile(email: string): Promise<VolunteerProfileRow | null> {
  try {
    const rows = await db
      .select()
      .from(volunteerProfilesTable)
      .where(eq(volunteerProfilesTable.userEmail, email))
      .limit(1);
    if (rows.length > 0) return rows[0] as VolunteerProfileRow;

    // Seed an empty row so future reads are consistent
    const inserted = await db
      .insert(volunteerProfilesTable)
      .values({ userEmail: email })
      .returning();
    return (inserted[0] as VolunteerProfileRow) ?? null;
  } catch (err) {
    logger.warn({ err }, "getOrCreateVolunteerProfile: DB error");
    return null;
  }
}

// ── Merch tier helper ──────────────────────────────────────────────────────────

const MERCH_TIERS = [
  { points: 100,  name: "Trail Sticker" },
  { points: 250,  name: "Trail Tee"     },
  { points: 500,  name: "Trail Hoodie"  },
  { points: 1000, name: "Trail Jacket"  },
];

function nextMerchTier(points: number) {
  const tier = MERCH_TIERS.find(t => t.points > points);
  return tier ?? null;
}

// ── GET /homebase/volunteer/month ─────────────────────────────────────────────
//
// Returns the volunteer's hours logged this calendar month (from time_logs)
// and their monthly commitment (from volunteer_profiles).
// Points = hoursLogged × 10 (local tracking; SF gamification is a follow-on).
//
// Response:
//   { hoursLogged, hoursCommitment, commitmentSet, points,
//     nextMerchTier, nextMerchPoints, pointsToNext, specialty, caseLimit }

router.get("/homebase/volunteer/month", requireHomebaseAuth, requireVolunteerAudience, async (req, res) => {
  const email = req.session.googleEmail!;

  // ── Time log sum for current month ─────────────────────────────────────────
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let hoursLogged = 0;
  try {
    const rows = await db
      .select()
      .from(timeLogsTable)
      .where(
        and(
          eq(timeLogsTable.userEmail, email),
          gte(timeLogsTable.loggedAt, monthStart),
        ),
      )
      .orderBy(desc(timeLogsTable.loggedAt));
    hoursLogged = rows.reduce((sum, r) => sum + Number(r.hours), 0);
    hoursLogged = Math.round(hoursLogged * 100) / 100;
  } catch (err) {
    logger.warn({ err }, "homebase/volunteer/month: time_logs query failed");
  }

  // ── Volunteer profile ──────────────────────────────────────────────────────
  const profile = await getOrCreateVolunteerProfile(email);

  const hoursCommitment    = profile?.monthlyCommitmentHours ?? null;
  const commitmentSet      = hoursCommitment !== null;
  const points             = Math.floor(hoursLogged * 10);
  const nextTier           = nextMerchTier(points);
  const pointsToNext       = nextTier ? Math.max(0, nextTier.points - points) : 0;

  res.json({
    hoursLogged,
    hoursCommitment,
    commitmentSet,
    points,
    nextMerchTier:   nextTier?.name   ?? null,
    nextMerchPoints: nextTier?.points ?? null,
    pointsToNext,
    specialty:  profile?.specialty  ?? null,
    caseLimit:  profile?.caseLimit  ?? null,
  });
});

// ── GET /homebase/volunteer/cases ─────────────────────────────────────────────
//
// Returns open Cases currently owned by this volunteer's SF User record.
// OwnerId on a Case must be a User (005…) or Queue (00G…) — NOT a Contact.
// We look up the volunteer's User by email to get a valid SF User ID.
//
// Three-state error contract:
//   SfNotConfiguredError → { sfUnavailable:true, linked:null }
//   HTTP error           → 503 { sfUnavailable:true }
//   No User record       → { linked:false }
//   Records found        → { linked:true, cases, totalOpen }

router.get("/homebase/volunteer/cases", requireHomebaseAuth, requireVolunteerAudience, async (req, res) => {
  const email = req.session.googleEmail!;

  // ── Step 1: User lookup ───────────────────────────────────────────────────
  // OwnerId on a Case must be a User (Id starts with '005'), not a Contact.
  let userId: string | null;
  try {
    const users = await sfSvcQuery<{ Id: string }>(
      `SELECT Id FROM User WHERE Email = '${email.replace(/'/g, "\\'")}' AND IsActive = true LIMIT 1`,
    );
    userId = users[0]?.Id ?? null;
  } catch (err) {
    if (err instanceof SfNotConfiguredError) {
      res.json({ linked: null, sfUnavailable: true, cases: [], totalOpen: 0 });
      return;
    }
    logger.warn({ err }, "homebase/volunteer/cases: SF user lookup failed");
    res.status(503).json({ error: "Salesforce temporarily unavailable", sfUnavailable: true });
    return;
  }

  if (!userId) {
    res.json({ linked: false, sfUnavailable: false, cases: [], totalOpen: 0 });
    return;
  }

  // ── Step 2: Cases owned by this User ─────────────────────────────────────
  type CaseRecord = {
    Id: string; CaseNumber: string | null; Subject: string | null;
    Status: string | null; Priority: string | null;
    LastModifiedDate: string | null; CreatedDate: string | null;
  };

  let cases: CaseRecord[];
  try {
    cases = await sfSvcQuery<CaseRecord>(
      `SELECT Id, CaseNumber, Subject, Status, Priority, LastModifiedDate, CreatedDate FROM Case WHERE OwnerId = '${userId}' AND IsClosed = false ORDER BY LastModifiedDate DESC LIMIT 20`,
    );
  } catch (err) {
    logger.warn({ err }, "homebase/volunteer/cases: Cases query failed");
    res.status(503).json({ error: "Salesforce temporarily unavailable", sfUnavailable: true });
    return;
  }

  res.json({ linked: true, sfUnavailable: false, cases, totalOpen: cases.length });
});

// ── sfSvcUpdate ───────────────────────────────────────────────────────────────
//
// Issues a PATCH to the SF REST API to update a single sObject record.
// Throws SfNotConfiguredError when credentials are absent; throws Error on
// non-2xx responses (204 No Content is the success case for SF PATCH).

async function sfSvcUpdate(
  sobject: string,
  id:      string,
  body:    Record<string, unknown>,
): Promise<void> {
  const api   = sfSvcApi();
  const token = sfSvcToken();
  if (!api || !token) throw new SfNotConfiguredError();

  // URL-encode the id segment so any unexpected characters cannot escape the path
  const res = await fetch(`${api}/sobjects/${sobject}/${encodeURIComponent(id)}`, {
    method:  "PATCH",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body:   JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });

  // SF returns 204 No Content on a successful PATCH
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SF PATCH ${sobject}/${id} failed (${res.status}): ${text.slice(0, 120)}`);
  }
}

// ── GET /homebase/volunteer/queue ─────────────────────────────────────────────
//
// Returns unassigned SF Cases (OwnerId LIKE '00G%' = a Queue record) that are
// still open.  Each case is tagged matchesSpecialty:true when the Case.Type
// matches the volunteer's specialty (from volunteer_profiles.specialty).
//
// No User/Contact lookup needed here — specialty+limit come from the local
// profile; the queue itself is a pure SF query.
//
// Error contract:
//   SfNotConfiguredError → { sfUnavailable:true, items:[], hasData:false }
//   HTTP error           → { sfUnavailable:true, items:[], hasData:false }
//   Success              → { items, openCount, caseLimit, hasData:true }

router.get("/homebase/volunteer/queue", requireHomebaseAuth, requireVolunteerAudience, async (req, res) => {
  const email     = req.session.googleEmail!;
  const profile   = await getOrCreateVolunteerProfile(email);
  const caseLimit = profile?.caseLimit ?? 3;
  const specialty = profile?.specialty  ?? null;

  // Queue records in SF always have Ids starting with '00G'.
  // Query oldest-first so volunteers see what's been waiting longest.

  type RawCase = {
    Id:          string;
    CaseNumber:  string | null;
    Subject:     string | null;
    Priority:    string | null;
    Type:        string | null;
    CreatedDate: string | null;
    Contact:     { Name: string } | null;
  };

  let rawCases: RawCase[];
  try {
    rawCases = await sfSvcQuery<RawCase>(
      `SELECT Id, CaseNumber, Subject, Priority, Type, CreatedDate, Contact.Name
       FROM Case
       WHERE OwnerId LIKE '00G%' AND IsClosed = false
       ORDER BY CreatedDate ASC
       LIMIT 30`,
    );
  } catch (err) {
    if (err instanceof SfNotConfiguredError) {
      res.json({ items: [], openCount: 0, caseLimit, hasData: false, sfUnavailable: true });
      return;
    }
    logger.warn({ err }, "homebase/volunteer/queue: Cases query failed");
    res.json({ items: [], openCount: 0, caseLimit, hasData: false, sfUnavailable: true });
    return;
  }

  function priorityToSize(p: string | null): "small" | "medium" | "large" | null {
    if (!p) return null;
    const lp = p.toLowerCase();
    if (lp === "high" || lp === "critical") return "large";
    if (lp === "medium")                    return "medium";
    if (lp === "low")                       return "small";
    return null;
  }

  function daysWaiting(createdDate: string | null): number | null {
    if (!createdDate) return null;
    return Math.floor((Date.now() - new Date(createdDate).getTime()) / 86_400_000);
  }

  const specialtyLower = specialty?.toLowerCase() ?? null;

  const items = rawCases.map(c => ({
    id:               c.Id,
    caseNumber:       c.CaseNumber,
    subject:          c.Subject,
    clientName:       (c.Contact as { Name?: string } | null)?.Name ?? null,
    estimatedSize:    priorityToSize(c.Priority),
    daysWaiting:      daysWaiting(c.CreatedDate),
    matchesSpecialty: specialtyLower
      ? (c.Type ?? "").toLowerCase() === specialtyLower
      : false,
  }));

  // Specialty-matched cases float to the top
  items.sort((a, b) => (b.matchesSpecialty ? 1 : 0) - (a.matchesSpecialty ? 1 : 0));

  res.json({ items, openCount: items.length, caseLimit, hasData: true });
});

// ── POST /homebase/volunteer/queue/assign ─────────────────────────────────────
//
// Assigns a queued Case to the volunteer by setting OwnerId = volunteer's SF
// User Id (starts with '005').  Case.OwnerId must be a User or Queue — NOT a
// Contact — so we look up the User record, not the Contact record.
//
// Input validation:
//   caseId must be a valid Salesforce Case ID — exactly 15 or 18 alphanumeric
//   characters with the Case key prefix '500'.  This prevents SOQL injection
//   and rejects obviously invalid payloads before any SF query runs.
//
// Concurrency safety (two layers):
//   Layer 1 — per-volunteer lock (assignmentInFlight keyed by email):
//     serialises concurrent assign requests from the same volunteer so that
//     the read-then-PATCH limit check cannot be raced by double-click.
//   Layer 2 — per-case lock (casesInFlight keyed by caseId):
//     serialises concurrent assign requests from DIFFERENT volunteers for the
//     same case, preventing two volunteers from both seeing queue ownership
//     and both PATCHing (last-write-wins race).
//   Both locks are acquired synchronously (before any await) and released in a
//   finally block — atomic on the single-threaded Node.js event loop.
//
// Steps:
//   1. Validate caseId format (15/18-char alphanumeric with '500' prefix)
//   2. Acquire per-volunteer lock (429 if volunteer already has one in flight)
//   3. Look up volunteer's SF User by email (→ userId '005…')
//   4. Count their currently-owned open cases (fail CLOSED if query fails)
//   5. Enforce case_limit
//   6. Acquire per-case lock (429 if case is being claimed by another volunteer)
//   7. Verify caseId is open AND currently queue-owned (OwnerId LIKE '00G%')
//   8. PATCH Case.OwnerId = userId
//   9. Release both locks
//
// Body:  { caseId: string }
// 200:  { ok: true, caseId }
// 400:  caseId missing/invalid, or volunteer has no active SF User account
// 409:  case is no longer queue-owned (already assigned or closed)
// 422:  { atLimit: true, caseLimit, currentCases }
// 429:  volunteer already has an assignment in flight, OR case is already being
//       claimed by another volunteer
// 503:  SF unavailable

// Valid SF Case ID: '500' key prefix + 12 more alphanumeric chars (15-char ID)
// or + 15 more (18-char ID with 3-char checksum suffix).
const SF_CASE_ID_RE = /^500[A-Za-z0-9]{12}([A-Za-z0-9]{3})?$/;

// In-process per-volunteer assignment lock — exported for direct test access.
export const assignmentInFlight = new Set<string>();

// In-process per-case assignment lock — prevents two different volunteers from
// racing to claim the same queued case.  Exported for direct test access.
export const casesInFlight = new Set<string>();

router.post("/homebase/volunteer/queue/assign", requireHomebaseAuth, requireVolunteerAudience, async (req, res) => {
  const email = req.session.googleEmail!;

  // ── Step 1: Parse + validate caseId ───────────────────────────────────────
  const { caseId } = req.body as { caseId?: unknown };
  if (typeof caseId !== "string" || !caseId.trim()) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  const safeCaseId = caseId.trim();
  if (!SF_CASE_ID_RE.test(safeCaseId)) {
    res.status(400).json({
      error: "caseId must be a valid Salesforce Case ID (15 or 18 alphanumeric characters starting with '500')",
    });
    return;
  }

  // ── Step 2: Acquire per-volunteer lock ────────────────────────────────────
  if (assignmentInFlight.has(email)) {
    res.status(429).json({ error: "An assignment is already in progress. Please wait." });
    return;
  }
  assignmentInFlight.add(email);

  // casesInFlight is added after the limit check (Step 6) — released in finally.
  let caseLockedByThisRequest = false;

  try {
    // ── Profile (for case_limit) ───────────────────────────────────────────
    const profile   = await getOrCreateVolunteerProfile(email);
    const caseLimit = profile?.caseLimit ?? 3;

    // ── Step 3: SF User lookup ────────────────────────────────────────────
    // Case.OwnerId must be a User ID (starts with '005'), never a Contact ID.
    let userId: string | null;
    try {
      const users = await sfSvcQuery<{ Id: string }>(
        `SELECT Id FROM User WHERE Email = '${email.replace(/'/g, "\\'")}' AND IsActive = true LIMIT 1`,
      );
      userId = users[0]?.Id ?? null;
    } catch (err) {
      if (err instanceof SfNotConfiguredError) {
        res.status(503).json({ error: "Salesforce not configured", sfUnavailable: true });
        return;
      }
      logger.warn({ err }, "homebase/volunteer/queue/assign: SF user lookup failed");
      res.status(503).json({ error: "Salesforce temporarily unavailable" });
      return;
    }

    if (!userId) {
      res.status(400).json({ error: "No active Salesforce user account found for this email" });
      return;
    }

    // ── Step 4: Count currently-owned open cases (fail CLOSED on error) ───
    let currentCases: number;
    try {
      const open = await sfSvcQuery<{ Id: string }>(
        `SELECT Id FROM Case WHERE OwnerId = '${userId}' AND IsClosed = false LIMIT 100`,
      );
      currentCases = open.length;
    } catch (err) {
      // Cannot confirm limit — reject to prevent bypassing case_limit
      logger.warn({ err }, "homebase/volunteer/queue/assign: case-count query failed, rejecting");
      res.status(503).json({ error: "Unable to verify current case load. Please try again." });
      return;
    }

    // ── Step 5: Enforce limit ─────────────────────────────────────────────
    if (currentCases >= caseLimit) {
      res.status(422).json({ atLimit: true, caseLimit, currentCases });
      return;
    }

    // ── Step 6: Acquire per-case lock ─────────────────────────────────────
    // Prevents two different volunteers from both passing the queue-ownership
    // check and then racing to PATCH the same case.
    if (casesInFlight.has(safeCaseId)) {
      res.status(429).json({ error: "This case is currently being claimed by another volunteer. Please try a different case." });
      return;
    }
    casesInFlight.add(safeCaseId);
    caseLockedByThisRequest = true;

    // ── Step 7: Verify the case is open and still queue-owned ─────────────
    // safeCaseId is validated alphanumeric so it cannot inject SOQL.
    let caseOwnerId: string | null;
    let caseIsClosed: boolean;
    try {
      const caseRows = await sfSvcQuery<{ OwnerId: string; IsClosed: boolean }>(
        `SELECT OwnerId, IsClosed FROM Case WHERE Id = '${safeCaseId}' LIMIT 1`,
      );
      if (caseRows.length === 0) {
        res.status(409).json({ error: "Case not found" });
        return;
      }
      caseOwnerId  = caseRows[0]!.OwnerId;
      caseIsClosed = caseRows[0]!.IsClosed;
    } catch (err) {
      if (err instanceof SfNotConfiguredError) {
        res.status(503).json({ error: "Salesforce not configured", sfUnavailable: true });
        return;
      }
      logger.warn({ err, caseId: safeCaseId }, "homebase/volunteer/queue/assign: case-verify query failed");
      res.status(503).json({ error: "Salesforce temporarily unavailable" });
      return;
    }

    if (caseIsClosed || !caseOwnerId?.startsWith("00G")) {
      res.status(409).json({
        error: "This case is no longer in the unassigned queue",
        caseIsClosed,
        caseOwnerId,
      });
      return;
    }

    // ── Step 8: Assign ────────────────────────────────────────────────────
    try {
      await sfSvcUpdate("Case", safeCaseId, { OwnerId: userId });
    } catch (err) {
      if (err instanceof SfNotConfiguredError) {
        res.status(503).json({ error: "Salesforce not configured", sfUnavailable: true });
        return;
      }
      logger.warn({ err, caseId: safeCaseId }, "homebase/volunteer/queue/assign: Case PATCH failed");
      res.status(503).json({ error: "Salesforce temporarily unavailable" });
      return;
    }

    logger.info({ email, caseId: safeCaseId, userId }, "homebase/volunteer/queue: case assigned");
    res.json({ ok: true, caseId: safeCaseId });
  } finally {
    // ── Step 9: Always release both locks ─────────────────────────────────
    assignmentInFlight.delete(email);
    if (caseLockedByThisRequest) casesInFlight.delete(safeCaseId);
  }
});

// ── GET /homebase/volunteer/growth ────────────────────────────────────────────
//
// Phase-1 stub. Returns empty skill suggestions.
// Will generate Penny skill recommendations from unmatched queue analysis.

router.get("/homebase/volunteer/growth", requireHomebaseAuth, requireVolunteerAudience, (_req, res) => {
  res.json({ skills: [], hasData: false });
});

// ── GET /homebase/volunteer/shareables ────────────────────────────────────────
//
// Phase-1 stub. Returns empty shareable content.
// Will pull advocacy posts and volunteer work highlights in a future sprint.

router.get("/homebase/volunteer/shareables", requireHomebaseAuth, requireVolunteerAudience, (_req, res) => {
  res.json({ items: [], hasData: false });
});

// ── GET /homebase/volunteer/coordinator ───────────────────────────────────────
//
// Returns the volunteer coordinator contact from volunteer_profiles.
// Phase 1: reads from local DB only; SF Contact lookup is a follow-on once
// coordinator data is wired into SF records.

router.get("/homebase/volunteer/coordinator", requireHomebaseAuth, requireVolunteerAudience, async (req, res) => {
  const email   = req.session.googleEmail!;
  const profile = await getOrCreateVolunteerProfile(email);

  res.json({
    coordinatorName:       profile?.coordinatorName       ?? null,
    coordinatorSlackId:    profile?.coordinatorSlackId    ?? null,
    volunteerSlackChannel: profile?.volunteerSlackChannel ?? null,
    linked: profile?.coordinatorName ? true : null,
  });
});

// ── GET /homebase/volunteer/profiles (staff only) ─────────────────────────────
//
// Lists all rows in volunteer_profiles so staff can see current field values
// and identify which volunteers still need their profile filled in.
// Auth: requireStaff (global staffAuthGate already covers /homebase/* — but
// this is a staff-facing admin endpoint so we check the session explicitly).

router.get("/homebase/volunteer/profiles", async (req, res) => {
  // Must be a signed-in staff session (googleAudience is null for staff)
  if (!req.session.googleEmail) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.session.googleAudience !== undefined && req.session.googleAudience !== null) {
    // Homebase audience sessions (learner/volunteer/coach) must not access this
    res.status(403).json({ error: "Staff access only" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(volunteerProfilesTable)
      .orderBy(volunteerProfilesTable.userEmail);

    res.json({ profiles: rows });
  } catch (err) {
    logger.error({ err }, "homebase/volunteer/profiles: DB error");
    res.status(500).json({ error: "Failed to load volunteer profiles" });
  }
});

// ── PATCH /homebase/volunteer/profile/:email (staff only) ─────────────────────
//
// Upserts a volunteer profile row with whichever fields the staff member
// provides. All fields are optional — omit a field to leave it unchanged.
//
// Body fields (all optional):
//   monthlyCommitmentHours: number | null
//   caseLimit:              number | null
//   specialty:              string | null
//   coordinatorName:        string | null
//   coordinatorSlackId:     string | null
//   volunteerSlackChannel:  string | null

router.patch("/homebase/volunteer/profile/:email", async (req, res) => {
  if (!req.session.googleEmail) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.session.googleAudience !== undefined && req.session.googleAudience !== null) {
    res.status(403).json({ error: "Staff access only" });
    return;
  }

  const targetEmail = decodeURIComponent(req.params["email"] ?? "").trim().toLowerCase();
  if (!targetEmail) {
    res.status(400).json({ error: "email param is required" });
    return;
  }

  const body = req.body as Record<string, unknown>;

  // Build the patch — only include keys present in the request body
  const patch: Partial<{
    monthlyCommitmentHours: number | null;
    caseLimit:              number | null;
    specialty:              string | null;
    coordinatorName:        string | null;
    coordinatorSlackId:     string | null;
    volunteerSlackChannel:  string | null;
    updatedAt:              Date;
  }> = { updatedAt: new Date() };

  if ("monthlyCommitmentHours" in body) {
    const v = body["monthlyCommitmentHours"];
    if (v === null) {
      patch.monthlyCommitmentHours = null;
    } else {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 744) {
        res.status(400).json({ error: "monthlyCommitmentHours must be a number 0–744 or null" });
        return;
      }
      patch.monthlyCommitmentHours = Math.round(n);
    }
  }

  if ("caseLimit" in body) {
    const v = body["caseLimit"];
    if (v === null) {
      patch.caseLimit = null;
    } else {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        res.status(400).json({ error: "caseLimit must be a number 0–100 or null" });
        return;
      }
      patch.caseLimit = Math.round(n);
    }
  }

  for (const key of ["specialty", "coordinatorName", "coordinatorSlackId", "volunteerSlackChannel"] as const) {
    if (key in body) {
      const v = body[key];
      patch[key] = typeof v === "string" && v.trim() ? v.trim() : null;
    }
  }

  try {
    // Upsert: insert if absent, update on conflict
    const [row] = await db
      .insert(volunteerProfilesTable)
      .values({ userEmail: targetEmail, ...patch })
      .onConflictDoUpdate({
        target: volunteerProfilesTable.userEmail,
        set:    patch,
      })
      .returning();

    logger.info({ targetEmail, patch }, "homebase/volunteer/profile: updated by staff");
    res.json({ ok: true, profile: row });
  } catch (err) {
    logger.error({ err }, "homebase/volunteer/profile: DB error");
    res.status(500).json({ error: "Failed to update volunteer profile" });
  }
});

export default router;
