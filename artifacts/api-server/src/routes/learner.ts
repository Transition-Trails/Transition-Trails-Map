import { Router, type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

// ── SF service helpers ────────────────────────────────────────────────────────
const SF_API = () => {
  const u = process.env["SALESFORCE_INSTANCE_URL"];
  return u ? `${u}/services/data/v59.0` : null;
};
const SF_TOKEN = () => process.env["SF_SERVICE_TOKEN"];

async function sfQuery<T>(soql: string): Promise<T[]> {
  const api   = SF_API();
  const token = SF_TOKEN();
  if (!api || !token) return [];
  try {
    const res = await fetch(`${api}/query?q=${encodeURIComponent(soql)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json() as { records: T[] };
    return data.records;
  } catch {
    return [];
  }
}

async function sfCreate(object: string, fields: Record<string, unknown>): Promise<string | null> {
  const api   = SF_API();
  const token = SF_TOKEN();
  if (!api || !token) return null;
  try {
    const res = await fetch(`${api}/sobjects/${object}`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(fields),
    });
    if (!res.ok) return null;
    const data = await res.json() as { id: string };
    return data.id;
  } catch {
    return null;
  }
}

async function sfPatch(object: string, id: string, fields: Record<string, unknown>): Promise<boolean> {
  const api   = SF_API();
  const token = SF_TOKEN();
  if (!api || !token) return false;
  try {
    const res = await fetch(`${api}/sobjects/${object}/${id}`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(fields),
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
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
router.get("/learner/assignments", async (req, res) => {
  const contactId = req.session.learnerContactId!;
  try {
    const soql = `SELECT Id, Name, Due_Date__c, Status__c, Course_Module__r.Name FROM Course_Module_Activity__c WHERE Learner__c = '${contactId}' AND Due_Date__c >= THIS_WEEK ORDER BY Due_Date__c ASC LIMIT 20`;
    const records = await sfQuery<Record<string, unknown>>(soql);
    return res.json({ assignments: records });
  } catch {
    return res.json({ assignments: [], error: "assignments_unavailable" });
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
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Expert";
  pointValue: number;
  category: string;
  acceptanceCriteria: string;
}

router.get("/learner/daily-quest", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  if (req.session.dailyQuest && req.session.dailyQuestDate === today) {
    return res.json({ ...(req.session.dailyQuest as unknown as DailyQuest), cached: true });
  }

  const contactId = req.session.learnerContactId!;
  const apiKey    = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return res.status(503).json({ error: "Quest generation not configured — set ANTHROPIC_API_KEY" });
  }

  const records = await sfQuery<{
    Penny_Trail__c: string;
    Penny_Current_Phase__c: string;
    Penny_Current_Goal__c: string;
  }>(`SELECT Penny_Trail__c, Penny_Current_Phase__c, Penny_Current_Goal__c FROM Contact WHERE Id = '${contactId}'`);

  const ctx   = records[0];
  const trail = ctx?.Penny_Trail__c       ?? req.session.learnerTrail ?? "Salesforce Admin";
  const phase = ctx?.Penny_Current_Phase__c ?? "Explore";
  const goal  = ctx?.Penny_Current_Goal__c  ?? "Develop Salesforce Admin skills";

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 512,
        system:     `You are Penny, an AI coaching companion for Transition Trails Academy. Generate exactly one daily Salesforce Admin learning quest for a learner on the ${trail} trail in phase ${phase}. The quest must be a practical scenario-based challenge that takes 10-15 minutes. Return ONLY valid JSON with no markdown, no backticks, no explanation — just the raw JSON object.`,
        messages: [{
          role:    "user",
          content: `Generate today's daily quest for a ${trail} learner in phase ${phase} with goal: ${goal}. Return JSON: { "title": string, "description": string, "difficulty": "Beginner"|"Intermediate"|"Expert", "pointValue": number (10 for Beginner, 25 for Intermediate, 50 for Expert), "category": string, "acceptanceCriteria": string }`,
        }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!anthropicRes.ok) {
      logger.warn({ status: anthropicRes.status }, "Anthropic quest generation failed");
      return res.status(502).json({ error: "Quest generation failed" });
    }

    const body = await anthropicRes.json() as { content?: Array<{ text?: string }> };
    const raw  = body.content?.[0]?.text?.trim() ?? "";
    const quest = JSON.parse(raw) as DailyQuest;

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
  const { questTitle, questDescription, pointValue, learnerResponse } = req.body as {
    questTitle?:      string;
    questDescription?: string;
    pointValue?:      number;
    learnerResponse?: string;
  };

  if (!questTitle || !learnerResponse || typeof pointValue !== "number") {
    return res.status(400).json({ error: "questTitle, pointValue, and learnerResponse are required" });
  }

  try {
    await sfCreate("Penny_Quest_Submission__c", {
      Learner__c:     contactId,
      Name:           questTitle,
      Submitted_At__c: new Date().toISOString(),
    });

    const gamifRecords = await sfQuery<{ Id: string; Points__c: number }>(
      `SELECT Id, Points__c FROM Penny_Gamification__c WHERE Learner__c = '${contactId}' LIMIT 1`
    );
    const existing    = gamifRecords[0];
    let totalPoints   = pointValue;

    if (existing) {
      totalPoints = (existing.Points__c ?? 0) + pointValue;
      await sfPatch("Penny_Gamification__c", existing.Id, { Points__c: totalPoints });
    } else {
      await sfCreate("Penny_Gamification__c", { Learner__c: contactId, Points__c: pointValue });
    }

    // Penny feedback via Gemini
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
  } catch (e) {
    logger.warn({ e }, "quest/submit: failed");
    return res.status(500).json({ error: "Submission failed — please try again" });
  }
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

  // Build learner-aware system prompt
  let systemText = `You are Penny, AI coaching companion for Transition Trails Academy. You are speaking directly with ${req.session.learnerName ?? "a learner"} who is on the ${req.session.learnerTrail ?? "Salesforce Admin"} trail. Be warm, encouraging, and focused on their learning journey. Keep responses concise — 2-4 sentences unless more detail is clearly needed.`;

  const ctxRecords = await sfQuery<{
    Penny_Current_Phase__c:   string | null;
    Penny_Current_Goal__c:    string | null;
    Penny_Coaching_Tone__c:   string | null;
    Penny_Confidence_Score__c: number | null;
  }>(`SELECT Penny_Current_Phase__c, Penny_Current_Goal__c, Penny_Coaching_Tone__c, Penny_Confidence_Score__c FROM Contact WHERE Id = '${contactId}'`);

  const ctx = ctxRecords[0];
  if (ctx) {
    systemText += `\n\nLearner context:\n- Trail: ${req.session.learnerTrail ?? "Unknown"}\n- Phase: ${ctx.Penny_Current_Phase__c ?? "Unknown"}\n- Goal: ${ctx.Penny_Current_Goal__c ?? "Not set"}\n- Coaching tone: ${ctx.Penny_Coaching_Tone__c ?? "Encouraging"}\n- Confidence: ${ctx.Penny_Confidence_Score__c ?? 0}/10`;
  }

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
