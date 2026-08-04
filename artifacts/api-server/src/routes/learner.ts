import { Router, type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger.js";
import { SF_API_VERSION } from "../lib/sfConstants.js";

const router = Router();

// ── SF service helpers ────────────────────────────────────────────────────────
//
// DELIBERATE: These routes use SF_SERVICE_TOKEN rather than the connector-based
// OAuth path used elsewhere.  The learner auth flow (learnerAuth.ts) runs before
// a session exists — the learner is not yet logged in when we need to look up
// their Salesforce Contact.  The connector path requires an active session, so
// a static service-account token is the only viable option for this flow.
// Do not remove without also reworking learnerAuth.ts.
//
const SF_API = () => {
  const u = process.env["SALESFORCE_INSTANCE_URL"];
  return u ? `${u}/services/data/${SF_API_VERSION}` : null;
};
const SF_TOKEN = () => process.env["SF_SERVICE_TOKEN"];

/**
 * sfQuery — throws on HTTP failure or missing credentials.
 * An empty slice means the query succeeded but returned no records.
 * Callers that need to distinguish "SF unavailable" from "genuinely empty"
 * should wrap in try/catch and surface the error to the caller.
 */
async function sfQuery<T>(soql: string): Promise<T[]> {
  const api   = SF_API();
  const token = SF_TOKEN();
  if (!api || !token) {
    throw new Error("Salesforce not configured (SF_SERVICE_TOKEN or SALESFORCE_INSTANCE_URL missing)");
  }
  const res = await fetch(`${api}/query?q=${encodeURIComponent(soql)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Salesforce query failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json() as { records: T[] };
  return data.records;
}

/**
 * sfCreate — throws on any failure.  A returned id is a confirmed write;
 * null is never returned.
 */
async function sfCreate(object: string, fields: Record<string, unknown>): Promise<string> {
  const api   = SF_API();
  const token = SF_TOKEN();
  if (!api || !token) throw new Error("Salesforce not configured");
  const res = await fetch(`${api}/sobjects/${object}`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(fields),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Salesforce create failed for ${object} (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json() as { id: string };
  return data.id;
}

/**
 * sfPatch — throws on any failure.  204 No Content is a success.
 */
async function sfPatch(object: string, id: string, fields: Record<string, unknown>): Promise<void> {
  const api   = SF_API();
  const token = SF_TOKEN();
  if (!api || !token) throw new Error("Salesforce not configured");
  const res = await fetch(`${api}/sobjects/${object}/${id}`, {
    method:  "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(fields),
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.text().catch(() => "");
    throw new Error(`Salesforce patch failed for ${object}/${id} (${res.status}): ${body.slice(0, 200)}`);
  }
}

// ── Auth guard ────────────────────────────────────────────────────────────────
function requireLearnerAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.learnerAuthenticated !== true) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

router.use("/learner", requireLearnerAuth);

// ── GET /api/learner/me ───────────────────────────────────────────────────────
router.get("/learner/me", async (req, res) => {
  const contactId = req.session.learnerContactId!;
  try {
    const soql = `SELECT Id, FirstName, LastName, Email, Penny_Trail__c, Penny_Trail_Config__c, Penny_Current_Phase__c, Penny_Current_Goal__c, Penny_Current_Blockers__c, Penny_Confidence_Score__c, Penny_Coaching_Tone__c, Penny_Sprint_Week__c FROM Contact WHERE Id = '${contactId}'`;
    const records = await sfQuery<Record<string, unknown>>(soql);
    return res.json({ authenticated: true, contact: records[0] ?? null });
  } catch (e) {
    logger.warn({ e }, "learner/me: query failed");
    return res.json({ authenticated: true, contact: null });
  }
});

// ── GET /api/learner/assignments ─────────────────────────────────────────────
//
// Uses Course_Activity_Completion__c — the per-learner activity progress object.
// It carries Contact__c (direct learner link), Activity__c, Status__c,
// Submitted_At__c, Graded_At__c, Score__c, and Points_Earned__c.
//
// SCHEMA NOTE (probed Aug 4 2026 against live org):
// Neither Course_Activity_Completion__c nor Course_Enrollment__c carries a
// Due_Date__c field.  hasDueDate: false is returned so the learner UI can
// suppress the due-date column rather than showing blanks.  If due dates are
// added to the schema in a future sprint, add Due_Date__c to this query and
// flip hasDueDate to true.
//
// The previous implementation queried Course_Module_Activity__c filtering on
// Learner__c and Due_Date__c — neither field exists on that object (it is the
// curriculum catalogue, not per-learner data).
//
router.get("/learner/assignments", async (req, res) => {
  const contactId = req.session.learnerContactId!;
  try {
    const soql = [
      "SELECT Id, Name, Status__c, Submitted_At__c, Graded_At__c,",
      "Score__c, Points_Earned__c, Activity__r.Name, Course_Module__r.Name",
      `FROM Course_Activity_Completion__c WHERE Contact__c = '${contactId}'`,
      "ORDER BY CreatedDate DESC LIMIT 20",
    ].join(" ");
    const records = await sfQuery<Record<string, unknown>>(soql);
    return res.json({ assignments: records, hasDueDate: false });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    logger.warn({ e }, "learner/assignments: query failed");
    // 503 (not 200) so the caller can distinguish SF-down from genuinely empty.
    return res.status(503).json({ assignments: [], error: "assignments_unavailable", detail });
  }
});

// ── GET /api/learner/gamification ────────────────────────────────────────────
router.get("/learner/gamification", async (req, res) => {
  const contactId = req.session.learnerContactId!;
  try {
    const soql = `SELECT Id, Points__c FROM Penny_Gamification__c WHERE Learner__c = '${contactId}' LIMIT 1`;
    const records = await sfQuery<{ Id: string; Points__c: number }>(soql);
    const record = records[0];
    return res.json({ points: record?.Points__c ?? 0, recordId: record?.Id ?? null });
  } catch {
    return res.json({ points: 0, recordId: null });
  }
});

// ── GET /api/learner/daily-quest ─────────────────────────────────────────────
interface DailyQuest {
  title:              string;
  description:        string;
  difficulty:         "Beginner" | "Intermediate" | "Expert";
  pointValue:         number;
  category:           string;
  acceptanceCriteria: string;
  /** Set when the quest is anchored to a Quest_Eligible__c activity from the learner's current enrollment. Omitted for AI-invented quests with no SF anchor. */
  activityId?:        string;
}

router.get("/learner/daily-quest", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  if (req.session.dailyQuest && req.session.dailyQuestDate === today) {
    return res.json({ ...(req.session.dailyQuest as unknown as DailyQuest), cached: true });
  }

  const contactId = req.session.learnerContactId!;
  const apiKey    = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    return res.status(503).json({ error: "Quest generation not configured — set GEMINI_API_KEY" });
  }

  // Best-effort context fetch — SF unavailable just falls back to session values.
  let trail = req.session.learnerTrail ?? "Salesforce Admin";
  let phase = "Explore";
  let goal  = "Develop Salesforce Admin skills";
  try {
    const records = await sfQuery<{
      Penny_Trail__c:        string;
      Penny_Current_Phase__c: string;
      Penny_Current_Goal__c:  string;
    }>(`SELECT Penny_Trail__c, Penny_Current_Phase__c, Penny_Current_Goal__c FROM Contact WHERE Id = '${contactId}'`);
    const ctx = records[0];
    if (ctx) {
      trail = ctx.Penny_Trail__c         ?? trail;
      phase = ctx.Penny_Current_Phase__c ?? phase;
      goal  = ctx.Penny_Current_Goal__c  ?? goal;
    }
  } catch { /* use fallback values above */ }

  // Best-effort: resolve the learner's current module and find a Quest_Eligible__c
  // activity within it.  When found the activity's Name and Description seed the
  // Gemini prompt (instead of the open-ended trail/phase strings), and the Id is
  // returned so the submission can populate Penny_Quest_Submission__c.Assignment__c.
  // If no eligible activity is found the route falls back to open-ended generation.
  let eligibleActivityId: string | undefined;
  let activityName:        string | undefined;
  let activityDescription: string | undefined;
  try {
    const enrollRecords = await sfQuery<{ Current_Module__c: string | null }>(
      `SELECT Current_Module__c FROM Course_Enrollment__c WHERE Contact__c = '${contactId}' AND Current_Module__c != null LIMIT 1`
    );
    const currentModuleId = enrollRecords[0]?.Current_Module__c;
    if (currentModuleId) {
      const activityRecords = await sfQuery<{ Id: string; Name: string; Description__c: string | null }>(
        `SELECT Id, Name, Description__c FROM Course_Module_Activity__c WHERE Quest_Eligible__c = true AND Course_Module__c = '${currentModuleId}' LIMIT 1`
      );
      const activity = activityRecords[0];
      if (activity) {
        eligibleActivityId  = activity.Id;
        activityName        = activity.Name;
        activityDescription = activity.Description__c ?? undefined;
      }
    }
  } catch { /* activity lookup is advisory — quest generation proceeds without it */ }

  // Build prompt — activity-seeded when we have an eligible anchor, open-ended otherwise.
  const systemText = eligibleActivityId && activityName
    ? `You are Penny, an AI coaching companion for Transition Trails Academy. Generate exactly one daily Salesforce Admin learning quest based on a specific curriculum activity. The quest must be a practical scenario-based challenge that takes 10–15 minutes and directly relates to the given activity.`
    : `You are Penny, an AI coaching companion for Transition Trails Academy. Generate exactly one daily Salesforce Admin learning quest for a learner on the ${trail} trail in phase ${phase}. The quest must be a practical scenario-based challenge that takes 10–15 minutes.`;

  const userText = eligibleActivityId && activityName
    ? `Generate today's daily quest based on this curriculum activity:\nActivity: ${activityName}${activityDescription ? `\nDescription: ${activityDescription}` : ""}\n\nThe quest should help a learner practise and demonstrate mastery of this activity. Return JSON with these exact fields: { "title": string, "description": string, "difficulty": "Beginner"|"Intermediate"|"Expert", "pointValue": number (10 for Beginner, 25 for Intermediate, 50 for Expert), "category": string, "acceptanceCriteria": string }`
    : `Generate today's daily quest for a ${trail} learner in phase ${phase} with goal: ${goal}. Return JSON with these exact fields: { "title": string, "description": string, "difficulty": "Beginner"|"Intermediate"|"Expert", "pointValue": number (10 for Beginner, 25 for Intermediate, 50 for Expert), "category": string, "acceptanceCriteria": string }`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemText }],
        },
        contents: [{
          role:  "user",
          parts: [{ text: userText }],
        }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens:  512,
          temperature:      0.8,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!geminiRes.ok) {
      logger.warn({ status: geminiRes.status }, "Gemini quest generation failed");
      return res.status(502).json({ error: "Quest generation failed" });
    }

    const body  = await geminiRes.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw   = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const quest: DailyQuest = {
      ...(JSON.parse(raw) as DailyQuest),
      ...(eligibleActivityId ? { activityId: eligibleActivityId } : {}),
    };

    req.session.dailyQuest     = quest as unknown as Record<string, unknown>;
    req.session.dailyQuestDate = today;

    return res.json({ ...quest, cached: false });
  } catch (e) {
    logger.warn({ e }, "daily-quest: generation error");
    return res.status(502).json({ error: "Quest generation failed" });
  }
});

// ── POST /api/learner/quest/submit ───────────────────────────────────────────
router.post("/learner/quest/submit", async (req, res) => {
  const contactId = req.session.learnerContactId!;
  const { questTitle, questDescription, pointValue, learnerResponse, activityId } = req.body as {
    questTitle?:        string;
    questDescription?:  string;
    pointValue?:        number;
    learnerResponse?:   string;
    activityId?:        string; // Course_Module_Activity__c Id — required by Penny_Quest_Submission__c.Assignment__c
  };

  if (!questTitle || !learnerResponse || typeof pointValue !== "number") {
    return res.status(400).json({ error: "questTitle, pointValue, and learnerResponse are required" });
  }

  // ── Step 1: Submission write (critical) ──────────────────────────────────────
  // Penny_Quest_Submission__c.Assignment__c is a required lookup to
  // Course_Module_Activity__c — no record can be created without it.
  // AI-generated daily quests have no activity anchor, so the SF write is
  // skipped for them.  When activityId IS provided, a failed write is a real
  // error and must not be swallowed.
  if (activityId) {
    try {
      await sfCreate("Penny_Quest_Submission__c", {
        Assignment__c:      activityId,
        Name:               questTitle.slice(0, 80),
        Submission_Text__c: learnerResponse,
        Submitted_At__c:    new Date().toISOString(),
      });
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : String(e);
      logger.error({ e, activityId }, "quest/submit: Penny_Quest_Submission__c create failed");
      return res.status(502).json({
        error: "Submission could not be recorded in Salesforce — please try again.",
        detail,
      });
    }
  }

  // ── Step 2: Gamification (best-effort — failure does not block submission) ───
  let totalPoints = pointValue;
  try {
    const gamifRecords = await sfQuery<{ Id: string; Points__c: number }>(
      `SELECT Id, Points__c FROM Penny_Gamification__c WHERE Learner__c = '${contactId}' LIMIT 1`
    );
    const existing = gamifRecords[0];
    if (existing) {
      totalPoints = (existing.Points__c ?? 0) + pointValue;
      await sfPatch("Penny_Gamification__c", existing.Id, { Points__c: totalPoints });
    } else {
      await sfCreate("Penny_Gamification__c", { Learner__c: contactId, Points__c: pointValue });
    }
  } catch (gamifErr: unknown) {
    logger.warn({ gamifErr }, "quest/submit: gamification update failed — points not recorded this attempt");
  }

  // ── Step 3: Penny feedback (best-effort — failure returns default copy) ──────
  let feedback = "Great work completing today's quest! Keep building those Salesforce skills.";
  const geminiKey = process.env["GEMINI_API_KEY"];
  if (geminiKey) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: `You are Penny, an AI coaching companion for Transition Trails Academy. Evaluate the learner's quest response and provide specific, encouraging feedback in 2-3 sentences. Quest: "${questTitle}". Acceptance criteria: "${questDescription ?? ""}"` }],
            },
            contents: [{ role: "user", parts: [{ text: learnerResponse }] }],
            generationConfig: { maxOutputTokens: 256, temperature: 0.7 },
          }),
          signal: AbortSignal.timeout(15_000),
        }
      );
      if (geminiRes.ok) {
        const body = await geminiRes.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        feedback = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? feedback;
      }
    } catch { /* use default feedback */ }
  }

  return res.json({ success: true, feedback, pointsEarned: pointValue, totalPoints });
});

// ── POST /api/learner/penny/ask ───────────────────────────────────────────────
interface HistoryItem { role: "user" | "model"; text: string; }

router.post("/learner/penny/ask", async (req, res) => {
  const contactId = req.session.learnerContactId!;
  const { query, history } = req.body as { query?: string; history?: unknown[] };

  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query is required" });
  }

  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) return res.status(503).json({ error: "AI not configured" });

  // Build learner-aware system prompt; context fetch is best-effort.
  let systemText = `You are Penny, AI coaching companion for Transition Trails Academy. You are speaking directly with ${req.session.learnerName ?? "a learner"} who is on the ${req.session.learnerTrail ?? "Salesforce Admin"} trail. Be warm, encouraging, and focused on their learning journey. Keep responses concise — 2-4 sentences unless more detail is clearly needed.`;

  try {
    const ctxRecords = await sfQuery<{
      Penny_Current_Phase__c:    string | null;
      Penny_Current_Goal__c:     string | null;
      Penny_Coaching_Tone__c:    string | null;
      Penny_Confidence_Score__c: number | null;
    }>(`SELECT Penny_Current_Phase__c, Penny_Current_Goal__c, Penny_Coaching_Tone__c, Penny_Confidence_Score__c FROM Contact WHERE Id = '${contactId}'`);
    const ctx = ctxRecords[0];
    if (ctx) {
      systemText += `\n\nLearner context:\n- Trail: ${req.session.learnerTrail ?? "Unknown"}\n- Phase: ${ctx.Penny_Current_Phase__c ?? "Unknown"}\n- Goal: ${ctx.Penny_Current_Goal__c ?? "Not set"}\n- Coaching tone: ${ctx.Penny_Coaching_Tone__c ?? "Encouraging"}\n- Confidence: ${ctx.Penny_Confidence_Score__c ?? 0}/10`;
    }
  } catch { /* SF unavailable — proceed without learner context */ }

  const validHistory: HistoryItem[] = Array.isArray(history)
    ? (history as unknown[]).filter((h): h is HistoryItem =>
        typeof h === "object" && h !== null &&
        ((h as HistoryItem).role === "user" || (h as HistoryItem).role === "model") &&
        typeof (h as HistoryItem).text === "string"
      ).slice(-10)
    : [];

  const contents = [
    ...validHistory.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: "user" as const, parts: [{ text: query.trim() }] },
  ];

  try {
    const start = Date.now();
    const url   = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!geminiRes.ok) return res.status(502).json({ error: "AI response failed" });

    const body = await geminiRes.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return res.status(502).json({ error: "Empty response" });

    return res.json({ reply: text, durationMs: Date.now() - start });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Network error";
    return res.status(502).json({ error: msg });
  }
});

export default router;
