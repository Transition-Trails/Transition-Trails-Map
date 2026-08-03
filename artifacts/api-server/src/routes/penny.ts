import { Router } from "express";
import { getSalesforceClient } from "../lib/getSalesforceClient.js";
import {
  getLearnerContext,
  getTrailConfig,
  logInteraction,
  getInteractionHistory,
} from "../lib/salesforceService.js";
import { resolveExchangeContact } from "../lib/pennyContactResolver.js";
import {
  assemblePrompt,
  type AssemblerInput,
  type RetrievedChunk,
  type MemoryExchange,
} from "../lib/pennyPromptAssembler.js";
import { DEFAULT_TRAIL_CONFIG } from "../lib/defaultTrailConfig.js";
import type { SalesforceClient } from "../lib/salesforceClient.js";
import { logger } from "../lib/logger.js";
import { db } from "@workspace/db";
import { pennyLogsTable } from "@workspace/db/schema";
import { desc, gte, sql } from "drizzle-orm";

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

// ─── POST /api/penny/ask ───────────────────────────────────────────────────────

interface HistoryItem { role: 'user' | 'model'; text: string; }

/**
 * Validates a single conversation-history entry before it is sent to Gemini.
 *
 * Rules:
 *  - Must be a non-null object.
 *  - role must be exactly 'user' or 'model'  (grouped so the text check
 *    applies to BOTH roles — the original bug was missing parentheses here).
 *  - text must be a string AND non-empty after trimming (an empty string is
 *    just as useless as undefined to Gemini).
 *
 * Invalid items are silently dropped by the caller's .filter(); a history
 * array that is entirely bad degrades to [] and the request still proceeds
 * with only the current question.
 */
export function isValidHistoryItem(h: unknown): h is HistoryItem {
  return (
    typeof h === 'object' &&
    h !== null &&
    ((h as HistoryItem).role === 'user' || (h as HistoryItem).role === 'model') &&
    typeof (h as HistoryItem).text === 'string' &&
    (h as HistoryItem).text.trim().length > 0
  );
}

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

  // ── Validate inputs ────────────────────────────────────────────────────────
  const roleStr = typeof role === 'string' ? role : undefined;
  const validChunks: RetrievedChunk[] = Array.isArray(retrievedChunks)
    ? (retrievedChunks as unknown[]).filter((c): c is RetrievedChunk =>
        typeof c === 'object' && c !== null &&
        typeof (c as RetrievedChunk).name    === 'string' &&
        typeof (c as RetrievedChunk).snippet === 'string'
      ).slice(0, 5)
    : [];

  // ── Fetch Salesforce context (layers 2 + 3) ────────────────────────────────
  let sfClient: SalesforceClient | null = null;
  let sfContactId: string | null = null;
  // Tracks whether sfContactId belongs to a learner (session/override) vs the
  // staff user's own Contact (resolved by email below).  Controls audience in
  // the prompt assembler — staff users should get the 'internal' identity even
  // after their own Contact is resolved.
  let isLearnerContact = false;
  let learnerCtx: Awaited<ReturnType<typeof getLearnerContext>> | null = null;
  let trailCfg:   Awaited<ReturnType<typeof getTrailConfig>> | null   = null;
  let promptPath: 'salesforce' | 'fallback' = 'fallback';

  const contactIdStr = typeof contactIdOverride === 'string' && contactIdOverride.trim()
    ? contactIdOverride.trim()
    : undefined;

  try {
    sfClient    = getSalesforceClient(req);
    sfContactId = contactIdStr ?? req.session.sfContactId ?? null;

    if (sfContactId) {
      // Learner path: a Contact is already known from the session or admin
      // override — fetch the learner's trail config and coaching context.
      isLearnerContact = true;
      if (contactIdStr) {
        logger.info({ contactIdOverride: contactIdStr, sfContactId }, 'Admin testing Penny as learner override');
      }
      learnerCtx = await getLearnerContext(sfClient, sfContactId);
      trailCfg   = learnerCtx.pennyTrailConfigId
        ? await getTrailConfig(sfClient, learnerCtx.pennyTrailConfigId)
        : DEFAULT_TRAIL_CONFIG;
    }
    // Staff path: no learner Contact yet — sfClient is preserved so the
    // resolver below can look up the staff user's own Contact by email.
    promptPath = 'salesforce';
  } catch (err) {
    logger.warn({ err }, "Salesforce context unavailable — assembling from identity + knowledge only");
    sfClient = null;
  }

  // ── Resolve staff user's own Contact when no learner Contact is in play ────
  // Matches the authenticated user's Salesforce email to their Contact record
  // so every exchange — learner or internal staff — can be logged to SF and
  // the memory window works for staff users too.
  // resolveExchangeContact handles errors internally and always returns a
  // string | null — never throws.
  if (sfClient !== null && sfContactId === null) {
    sfContactId = await resolveExchangeContact(sfClient, null, req.session.sfEmail ?? null);
  }

  logger.info(
    {
      sfContactId,
      isLearnerContact,
      resolvedViaEmail:  !isLearnerContact && sfContactId !== null,
      contactIdOverride: contactIdStr ?? null,
      sessionContactId:  req.session.sfContactId ?? null,
      sessionUserId:     req.session.sfUserId ?? null,
    },
    'Penny ask — resolved contact ID'
  );

  // ── Fetch layer 7: recent interaction history (memory window) ──────────────
  // Runs after the main SF block so a history failure never degrades layers 2–3.
  // Returns the last 5 exchanges in reverse-chronological order (newest first);
  // layer7MemoryWindow reverses them to oldest-first before formatting.
  let recentExchanges: MemoryExchange[] = [];
  if (sfClient !== null && sfContactId !== null) {
    try {
      const raw = await getInteractionHistory(sfClient, sfContactId, 5);
      recentExchanges = raw.map(r => ({
        userMessage:   r.userMessage,
        pennyResponse: r.pennyResponse,
        createdDate:   r.createdDate,
      }));
    } catch (histErr) {
      logger.warn({ histErr }, "Failed to fetch interaction history for memory window — proceeding without");
    }
  }

  // ── Assemble the prompt from all seven layers ──────────────────────────────
  // The Gemini call receives only the finished string; it has no knowledge of
  // how the prompt was built.  Layers with no data contribute nothing.
  const assemblerInput: AssemblerInput = {
    audience:        isLearnerContact ? 'learner' : 'internal',
    role:            roleStr,
    trailConfig:     trailCfg,
    learnerContext:  learnerCtx,
    retrievedChunks: validChunks,
    recentExchanges,
  };
  const { systemPrompt, layersPresent } = assemblePrompt(assemblerInput);

  // ── Build context-enriched user message ──────────────────────────────────
  const pageCtx = typeof context === "string" && context.trim()
    ? `[Page context: ${context.trim()}]\n\n`
    : '';
  const userText = pageCtx + query.trim();

  // ── Build conversation history for Gemini ────────────────────────────────
  const validHistory: HistoryItem[] = Array.isArray(history)
    ? (history as unknown[]).filter(isValidHistoryItem).slice(-10)  // cap at last 10 turns to control token budget
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
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          maxOutputTokens: 4096,
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

    const durationMs = Date.now() - start;
    const learnerName = learnerCtx
      ? `${learnerCtx.firstName} ${learnerCtx.lastName}`.trim()
      : null;

    // Fire-and-forget: write to DB (always) + Salesforce (when contact known)
    db.insert(pennyLogsTable).values({
      sessionId:     req.sessionID ?? null,
      userTier:      typeof role === 'string' ? role : null,
      userEmail:     req.session.sfEmail ?? null,
      userMessage:   query.trim(),
      pennyResponse: text,
      promptMode:    "ask",
      model,
      durationMs,
      contextRoute:  null,
      sfContactId,
      learnerName,
      trailId:       trailCfg?.trailId ?? null,
    }).catch((dbErr: unknown) => {
      logger.warn({ dbErr }, "Failed to write Penny interaction to DB");
    });

    if (sfClient !== null && sfContactId !== null) {
      // Fire-and-forget Salesforce write.  Any failure here is caught and
      // logged but NEVER surfaced to the caller — the user already has their
      // reply.  The local DB write above is the primary persistence path; this
      // is supplementary and is allowed to fail silently.
      logInteraction(sfClient, {
        contactId:     sfContactId,
        userMessage:   query.trim(),
        pennyResponse: text,
        promptMode:    "ask",
        source:        "web",
      }).catch((logErr: unknown) => {
        const errMsg = logErr instanceof Error ? logErr.message : String(logErr);
        const isPermission =
          errMsg.includes('INSUFFICIENT_ACCESS') ||
          errMsg.includes('FIELD_INTEGRITY_EXCEPTION') ||
          errMsg.includes('Required fields are missing') ||
          errMsg.includes('CREATE_FAILED');
        if (isPermission) {
          // Loud error so a new integration user's missing Create permission
          // is found immediately rather than silently losing records.
          logger.error(
            { logErr, object: 'Penny_Interaction_Log__c', sfContactId },
            'SF WRITE REFUSED — Penny_Interaction_Log__c — Create permission denied. ' +
            'If the integration user was recently changed, grant Create on ' +
            'Penny_Interaction_Log__c in the connected permission set.'
          );
        } else {
          logger.warn(
            { logErr, object: 'Penny_Interaction_Log__c' },
            'Failed to log Penny interaction to Salesforce'
          );
        }
      });
    }

    return res.json({
      reply: text,
      model,
      durationMs,
      layersPresent,
      contextMeta: {
        contactId:         sfContactId,
        learnerName,
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

// ── GET /penny/logs ────────────────────────────────────────────────────────────

router.get("/penny/logs", async (req, res): Promise<void> => {
  try {
    const limitParam = parseInt(String(req.query["limit"] ?? "50"), 10);
    const limit = Math.min(Math.max(limitParam, 1), 200);

    const dateParam = req.query["date"] as string | undefined;
    let rows;
    if (dateParam) {
      // Filter to a specific date (YYYY-MM-DD)
      const dayStart = new Date(`${dateParam}T00:00:00.000Z`);
      rows = await db
        .select()
        .from(pennyLogsTable)
        .where(gte(pennyLogsTable.createdAt, dayStart))
        .orderBy(desc(pennyLogsTable.createdAt))
        .limit(limit);
    } else {
      // Default: today (server local midnight)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      rows = await db
        .select()
        .from(pennyLogsTable)
        .where(gte(pennyLogsTable.createdAt, todayStart))
        .orderBy(desc(pennyLogsTable.createdAt))
        .limit(limit);
    }

    // Also return total lifetime count
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(pennyLogsTable);

    res.json({ logs: rows, total: count });
  } catch (err) {
    logger.error({ err }, "Failed to fetch Penny logs");
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

export default router;
