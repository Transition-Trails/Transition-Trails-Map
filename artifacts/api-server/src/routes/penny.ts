import { Router } from "express";

const router = Router();

// ─── Penny system prompt ───────────────────────────────────────────────────────
// Grounded in Transition Trails Academy context so every answer is on-platform.

const PENNY_SYSTEM = `You are Penny, AI Chief of Staff for Transition Trails Academy — a career development and professional transition training organisation. Your role is to assist the Transition Trails team with day-to-day operations inside their Trail OS platform.

Domains you support:
- Program operations: cohort scheduling, delivery status, phase tracking via the RESOLVE framework (Resolve, Explore, Sustain, Optimise, Launch, Validate, Execute)
- Learner journey: enrollment, coaching activity, trail quest progress, capstone milestones, assessment results
- Knowledge management: source documents, curriculum standards, blueprint updates, content relationships
- Salesforce intelligence: Account and Contact data, Program, Cohort, and Service Delivery objects (NPSP + PMM), Opportunity pipeline
- Slack coordination: channel activity, learner communication, team signals, bot alerts
- Operations: demand intake, change requests, resource allocation, health scores, program health metrics
- Administration: integration setup, secrets audit, readiness dashboards, user access

Communication rules:
- Be concise and direct. 2–4 sentences unless a longer answer is clearly needed.
- Use the team's language: programs, cohorts, trail quests, learners, capstones, blueprints, RESOLVE phases.
- If you don't have live data for a specific question, say so honestly and suggest where to find it in Trail OS.
- Reference specific Trail OS routes when useful (e.g. "see /admin/sf-validation" or "check /operations/program-health").
- Never fabricate data. If uncertain, say so.`;

// ─── POST /api/penny/ask ───────────────────────────────────────────────────────

router.post("/penny/ask", async (req, res) => {
  const start = Date.now();
  const { query, context } = req.body as { query?: unknown; context?: unknown };

  // ── Input validation ─────────────────────────────────────────────────────────
  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query is required and must be a non-empty string" });
  }
  if (query.length > 2000) {
    return res.status(400).json({ error: "query must be 2000 characters or fewer" });
  }

  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    return res.status(503).json({ error: "Gemini API key not configured. Set GEMINI_API_KEY in Replit Secrets." });
  }

  // ── Build user message with optional page context ────────────────────────────
  const pageCtx = typeof context === "string" && context.trim()
    ? `The user is currently on the "${context.trim()}" section of Trail OS.`
    : null;
  const userMessage = pageCtx ? `[Page context: ${pageCtx}]\n\n${query.trim()}` : query.trim();

  // ── Call Gemini 2.5 Flash via REST ───────────────────────────────────────────
  // 2.5-flash confirmed live (serviceTier: standard); 2x token budget for thinking
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: PENNY_SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({})) as { error?: { message?: string; status?: string } };
      const msg = body.error?.message ?? `Gemini API returned HTTP ${resp.status}`;
      return res.status(502).json({ error: msg });
    }

    const body = await resp.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };

    const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return res.status(502).json({ error: "Gemini returned an empty response. Try rephrasing your question." });
    }

    return res.json({ reply: text, model, durationMs: Date.now() - start });
  } catch (e: unknown) {
    const isTimeout = e instanceof Error && e.name === "TimeoutError";
    const msg = isTimeout
      ? "Gemini took too long to respond (30s timeout). Try a shorter question."
      : `Could not reach Gemini: ${e instanceof Error ? e.message : String(e)}`;
    return res.status(502).json({ error: msg });
  }
});

export default router;
