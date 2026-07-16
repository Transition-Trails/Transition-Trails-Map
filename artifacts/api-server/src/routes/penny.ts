import { Router } from "express";
import { getSalesforceClient } from "../lib/getSalesforceClient.js";
import {
  getLearnerContext,
  getTrailConfig,
  getInteractionHistory,
  logInteraction,
} from "../lib/salesforceService.js";
import { buildPennySystemPrompt } from "../lib/pennyPromptBuilder.js";
import { DEFAULT_TRAIL_CONFIG } from "../lib/defaultTrailConfig.js";
import type { SalesforceClient } from "../lib/salesforceClient.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ─── In-memory rate limiter (10 req / 60 s per IP) ────────────────────────────
const RATE_WINDOW_MS  = 60_000;
const RATE_MAX_REQ    = 10;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): { allowed: boolean; retryAfter?: number } {
  const now  = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(ip, bucket);
  }
  bucket.count++;
  if (bucket.count > RATE_MAX_REQ) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

// ─── Penny base system prompt ─────────────────────────────────────────────────

const PENNY_BASE = `You are Penny, AI Chief of Staff for Transition Trails Academy — a career development and professional transition training organisation. Your role is to assist the Transition Trails team with day-to-day operations inside their Trail OS platform.

Domains you support:
- Program operations: cohort scheduling, delivery status, phase tracking via the RESOLVE framework (Recognize, Explore, Select, Outline, Launch, Verify, Evolve)
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
- ALWAYS include the exact Trail OS route path when directing someone to take an action or find something. Write the route on its own line prefixed with "→" (e.g. "→ /admin/integrations" or "→ /collaboration/slack"). Users can click these paths to navigate directly. Use these routes: /admin/integrations (integration setup & secrets), /admin/integrations/google-auth (Google OAuth), /admin/integrations/secrets (secrets audit), /admin/people-access (user roles & access), /admin/phase1-readiness (readiness dashboard), /operations/health (health indicators), /operations/demand (demand & cases), /operations/scorecards (scorecards), /penny (Penny command center), /penny/prompts (prompt studio), /penny/capabilities (capability registry), /penny/learners (learner list), /penny/trail-configs (trail configs), /knowledge/sources (knowledge sources), /collaboration/slack (Slack integration), /collaboration/gmail (Gmail), /collaboration/calendar-live (Calendar), /program (program map & curriculum).
- Never fabricate data. If uncertain, say so.`;

// ─── Role-aware context injected per request ──────────────────────────────────

function roleContext(role?: string): string {
  switch (role) {
    case 'superadmin':
      return `\nThe current user is a Super Admin — they have full platform access including secrets management, integration configuration, user role assignment, and all admin tools. Tailor responses to platform-level decisions and configuration concerns.`;
    case 'admin':
      return `\nThe current user is an Admin — they can manage programs, knowledge sources, Penny capabilities, and team operations but cannot change integrations or user roles. Tailor responses to team operations and program management.`;
    case 'poweruser':
      return `\nThe current user is a Penny Power User — they use advanced Penny capabilities (coaching, resume review, deep analytics) and can author watch rules. Tailor responses to learning, coaching, and career development topics.`;
    case 'everyday':
      return `\nThe current user is an Everyday User — a learner focused on their trail, next actions, and program progress. Keep responses clear, encouraging, and jargon-free. Avoid surfacing admin details.`;
    default:
      return '';
  }
}

// ─── Retrieved knowledge context ──────────────────────────────────────────────

interface RetrievedChunk {
  name: string;
  category: string;
  sourceType: string;
  snippet: string;
  relevance: number;
}

function buildRetrievedSection(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '';
  const lines = chunks.map((c, i) =>
    `[Source ${i + 1}: ${c.name} (${c.category} · ${c.sourceType})]\n${c.snippet}`
  ).join('\n\n');
  return `\n\n---\nRetrieved Knowledge (ground your answer in these sources where relevant):\n\n${lines}\n---`;
}

// ─── POST /api/penny/ask ───────────────────────────────────────────────────────

interface HistoryItem { role: 'user' | 'model'; text: string; }

router.post("/penny/ask", async (req, res) => {
  const start = Date.now();

  // Rate limit
  const ip = (req.ip ?? req.socket.remoteAddress ?? 'unknown').replace(/^::ffff:/, '');
  const rate = checkRate(ip);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfter));
    return res.status(429).json({
      error: `Too many requests — Penny is taking a breath. Try again in ${rate.retryAfter}s.`,
    });
  }

  const { query, context, role, history, retrievedChunks, contactId: contactIdOverride } = req.body as {
    query?: unknown;
    context?: unknown;
    role?: unknown;
    history?: unknown;
    retrievedChunks?: unknown;
    contactId?: unknown;
  };

  // ── Validate query ────────────────────────────────────────────────────────
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

  // ── Build system prompt (Salesforce-backed if authenticated, PENNY_BASE fallback) ──
  const roleStr      = typeof role === 'string' ? role : undefined;
  const validChunks: RetrievedChunk[] = Array.isArray(retrievedChunks)
    ? (retrievedChunks as unknown[]).filter((c): c is RetrievedChunk =>
        typeof c === 'object' && c !== null &&
        typeof (c as RetrievedChunk).name    === 'string' &&
        typeof (c as RetrievedChunk).snippet === 'string'
      ).slice(0, 5)
    : [];

  let systemText: string;
  let sfClient: SalesforceClient | null = null;
  let sfContactId: string | null = null;
  let learnerCtx: Awaited<ReturnType<typeof getLearnerContext>> | null = null;
  let trailCfg:   Awaited<ReturnType<typeof getTrailConfig>> | null   = null;
  let promptPath: 'salesforce' | 'fallback' = 'fallback';

  const contactIdStr = typeof contactIdOverride === 'string' && contactIdOverride.trim()
    ? contactIdOverride.trim()
    : undefined;

  try {
    sfClient    = getSalesforceClient(req);
    sfContactId = contactIdStr ?? req.session.sfContactId ?? null;

    logger.info(
      {
        sfContactId,
        contactIdOverride:  contactIdStr ?? null,
        sessionContactId:   req.session.sfContactId ?? null,
        sessionUserId:      req.session.sfUserId ?? null,
      },
      'Penny ask — resolved contact ID'
    );

    if (!sfContactId) throw new Error("No Salesforce contact ID in session");

    if (contactIdStr) {
      logger.info({ contactIdOverride: contactIdStr, sfContactId }, 'Admin testing Penny as learner override');
    }

    learnerCtx         = await getLearnerContext(sfClient, sfContactId);
    trailCfg           = learnerCtx.pennyTrailConfigId
      ? await getTrailConfig(sfClient, learnerCtx.pennyTrailConfigId)
      : DEFAULT_TRAIL_CONFIG;
    const interactions = await getInteractionHistory(sfClient, sfContactId, 10);

    systemText = buildPennySystemPrompt(learnerCtx, trailCfg, interactions)
      + buildRetrievedSection(validChunks);
    promptPath = 'salesforce';
  } catch (err) {
    logger.warn({ err }, "Salesforce context unavailable — falling back to PENNY_BASE");
    sfClient   = null;
    systemText = PENNY_BASE + roleContext(roleStr) + buildRetrievedSection(validChunks);
  }

  // ── Build context-enriched user message ──────────────────────────────────
  const pageCtx = typeof context === "string" && context.trim()
    ? `[Page context: ${context.trim()}]\n\n`
    : '';
  const userText = pageCtx + query.trim();

  // ── Build conversation history for Gemini ────────────────────────────────
  const validHistory: HistoryItem[] = Array.isArray(history)
    ? (history as unknown[]).filter((h): h is HistoryItem =>
        typeof h === 'object' && h !== null &&
        (h as HistoryItem).role === 'user' || (h as HistoryItem).role === 'model' &&
        typeof (h as HistoryItem).text === 'string'
      ).slice(-10)   // cap at last 10 turns to control token budget
    : [];

  const contents = [
    ...validHistory.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user' as const, parts: [{ text: userText }] },
  ];

  // ── Call Gemini 2.5 Flash via REST ────────────────────────────────────────
  const model = "gemini-2.5-flash";
  const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({})) as { error?: { message?: string } };
      const msg  = body.error?.message ?? `Gemini API returned HTTP ${resp.status}`;
      return res.status(502).json({ error: msg });
    }

    const body = await resp.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    };

    const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return res.status(502).json({ error: "Penny returned an empty response. Try rephrasing your question." });
    }

    // Fire-and-forget interaction log — never blocks the Penny response
    if (sfClient !== null && sfContactId !== null) {
      logInteraction(sfClient, {
        contactId:     sfContactId,
        userMessage:   query.trim(),
        pennyResponse: text,
        promptMode:    "ask",
        source:        "web",
      }).catch((logErr: unknown) => {
        logger.warn({ logErr }, "Failed to log Penny interaction to Salesforce");
      });
    }

    return res.json({
      reply: text,
      model,
      durationMs: Date.now() - start,
      contextMeta: {
        contactId:         sfContactId,
        learnerName:       learnerCtx ? `${learnerCtx.firstName} ${learnerCtx.lastName}` : null,
        trailId:           trailCfg?.trailId ?? null,
        trailConfigId:     learnerCtx?.pennyTrailConfigId ?? null,
        currentPhase:      learnerCtx?.currentPhase ?? null,
        currentGoal:       learnerCtx?.currentGoal ?? null,
        coachingTone:      learnerCtx?.coachingTone ?? null,
        confidenceScore:   learnerCtx?.confidenceScore ?? null,
        promptPath,
        interactionLogged: sfClient !== null && sfContactId !== null,
      },
    });
  } catch (e: unknown) {
    const isTimeout = e instanceof Error && e.name === "TimeoutError";
    const msg = isTimeout
      ? "Penny took too long to respond (30s timeout). Try a shorter question."
      : `Could not reach Gemini: ${e instanceof Error ? e.message : String(e)}`;
    return res.status(502).json({ error: msg });
  }
});

export default router;
