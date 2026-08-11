import { Router } from "express";
import { getSalesforceClient } from "../lib/getSalesforceClient.js";
import { getEffectiveSfFetch } from "../lib/salesforceOAuth.js";
import {
  getLearnerProfile,
  getTrailConfig,
  logInteraction,
  getInteractionHistory,
} from "../lib/salesforceService.js";
import {
  recordSfWriteAttempt,
  recordSfWriteSuccess,
  recordSfWriteFailure,
  recordSfWriteSkip,
  getSfWriteHealth,
} from "../lib/sfWriteHealth.js";
import { resolveExchangeContact } from "../lib/pennyContactResolver.js";
import {
  assemblePrompt,
  type AssemblerInput,
  type PennyAudience,
  type RetrievedChunk,
  type MemoryExchange,
} from "../lib/pennyPromptAssembler.js";
import { DEFAULT_TRAIL_CONFIG } from "../lib/defaultTrailConfig.js";
import type { SalesforceClient } from "../lib/salesforceClient.js";
import { logger } from "../lib/logger.js";
import { db } from "@workspace/db";
import { pennyLogsTable } from "@workspace/db/schema";
import { desc, gte, sql } from "drizzle-orm";
import type { CapabilityId } from "@workspace/api-zod";

const router = Router();

// ── Prompt mode derivation ─────────────────────────────────────────────────────
/**
 * Compute a human-readable Prompt_Mode__c value that describes which context
 * layers were active.  Prompt_Mode__c is a plain string (not a picklist) so
 * any value is accepted by Salesforce, but it should be meaningful to admins
 * reading the record.
 */
function derivePromptMode(hasLearnerCtx: boolean, hasMemory: boolean): string {
  if (hasLearnerCtx && hasMemory) return 'ask+learner+memory';
  if (hasLearnerCtx)              return 'ask+learner';
  if (hasMemory)                  return 'ask+memory';
  return 'ask';
}

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
    contactId?: unknown; // admin "test as learner" — loads learner data but does NOT change audience
  };

  // ── Resolve audience from session — never from request body ──────────────
  // A request body cannot be trusted to self-report its audience; a learner
  // surface could otherwise pass audience: 'internal' to receive direct answers
  // instead of coaching.  The session is the only trustworthy signal.
  //
  // Priority:
  //   1. learnerAuthenticated === true  → 'learner'   (most specific)
  //   2. sfEmail or sfUserId present   → 'internal'  (Google SSO staff)
  //   3. Unresolvable                  → 'learner'   (most restricted fallback)
  const audience: PennyAudience =
    req.session.learnerAuthenticated === true ? 'learner'
    : (req.session.sfEmail != null || req.session.sfUserId != null) ? 'internal'
    : 'learner'; // safest fallback when session state cannot be determined

  // ── Validate query ────────────────────────────────────────────────────────
  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query is required and must be a non-empty string" });
  }
  if (query.length > 2000) {
    return res.status(400).json({ error: "query must be 2000 characters or fewer" });
  }

  // ── Validate inputs ────────────────────────────────────────────────────────
  // Note: GEMINI_API_KEY is checked inside the Gemini/learner branch below so
  // that a missing Gemini key never blocks staff (Claude) requests.
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

    const soql =
      "SELECT Id, Source__c, Prompt_Mode__c, CreatedDate " +
      "FROM Penny_Interaction_Log__c " +
      "ORDER BY CreatedDate DESC LIMIT 5";
  let sfContactId: string | null = null;
  // isLearnerContact tracks whether sfContactId refers to a learner's Contact
  // (for SF logging decisions) — it is SEPARATE from audience identity, which
  // is derived from session state only and set above.
  let isLearnerContact = false;
  let learnerCtx: Awaited<ReturnType<typeof getLearnerProfile>>['contact'] = null;
  let trailCfg:   Awaited<ReturnType<typeof getTrailConfig>> | null   = null;
  let promptPath: 'salesforce' | 'fallback' = 'fallback';

  const contactIdStr = typeof contactIdOverride === 'string' && contactIdOverride.trim()
    ? contactIdOverride.trim()
    : undefined;

  try {
    sfClient    = getSalesforceClient(req);
    sfContactId = contactIdStr ?? req.session.sfContactId ?? null;

    if (sfContactId) {
      // A Contact is known — fetch learner trail config and coaching context.
      // Note: contactIdStr may come from an admin "test as learner" override.
      // In that case isLearnerContact is still true (so SF logging targets the
      // Contact) but the audience identity stays 'internal' because audience is
      // derived from session, not from which Contact is loaded.
      isLearnerContact = audience === 'learner';
      if (contactIdStr && audience !== 'learner') {
        logger.info({ contactIdOverride: contactIdStr, sfContactId, audience }, 'Staff testing Penny with learner Contact — retaining internal identity');
      }
      if (contactIdStr && audience === 'learner') {
        logger.info({ contactIdOverride: contactIdStr, sfContactId }, 'Learner session with explicit contactId override');
      }
      const profile = await getLearnerProfile(sfClient, sfContactId);
      learnerCtx = profile.contact;
      if (!profile.ok) {
        logger.warn({ contactError: profile.contactError, sfContactId }, 'getLearnerProfile: Contact query failed — assembling without learner context');
      }
      trailCfg = learnerCtx?.pennyTrailConfigId
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
      // audience filter prevents internal-staff test sessions from polluting
      // a learner's coaching memory — only 'learner'-audience exchanges surface here.
      const raw = await getInteractionHistory(sfClient, sfContactId, 5, 'learner');
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
    // audience is resolved from session state only — see derivation above.
    // Never set from req.body or from isLearnerContact.
    audience,
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

  // ── Build conversation history ────────────────────────────────────────────
  const validHistory: HistoryItem[] = Array.isArray(history)
    ? (history as unknown[]).filter(isValidHistoryItem).slice(-10)  // cap at last 10 turns to control token budget
    : [];

  // ── LLM dispatch: Claude for staff, Gemini for learners ──────────────────
  //
  // Staff (audience === 'internal') → Claude Sonnet.
  //   On timeout or any non-2xx: fail with 503.  There is NO silent fallback
  //   to Gemini — this keeps Anthropic outages visible in logs immediately.
  //
  // Learner (audience === 'learner') → Gemini 2.5 Flash with the existing
  //   overload retry / back-off logic (completely unchanged).

  // ─── Shared helper: fire-and-forget persistence ──────────────────────────
  // Called by BOTH provider branches to avoid duplicating the DB + SF write
  // logic.  Neither write is awaited — a failed write must never cost the user
  // their reply.
  function persistInteraction(
    responseText: string,
    modelName:    string,
    durationMs:   number,
  ): { shouldWriteToSf: boolean; staffEmail: string | null } {
    const promptMode  = derivePromptMode(learnerCtx !== null, recentExchanges.length > 0);
    const learnerName = learnerCtx
      ? `${learnerCtx.firstName} ${learnerCtx.lastName}`.trim()
      : null;

    // DB write (always)
    db.insert(pennyLogsTable).values({
      sessionId:     req.sessionID ?? null,
      userTier:      typeof role === 'string' ? role : null,
      userEmail:     req.session.sfEmail ?? null,
      userMessage:   (query as string).trim(),
      pennyResponse: responseText,
      promptMode,
      model:         modelName,
      durationMs,
      contextRoute:  null,
      sfContactId,
      learnerName,
      trailId:       trailCfg?.trailId ?? null,
      audience,
    }).catch((dbErr: unknown) => {
      logger.warn({ dbErr }, "Failed to write Penny interaction to DB");
    });

    // SF write (when a contact is known)
    const staffEmail   = !isLearnerContact ? (req.session.sfEmail ?? null) : null;
    const shouldWrite  = sfClient !== null && (sfContactId !== null || staffEmail !== null);

    if (sfClient !== null) {
      const sfSource     = 'TRAIL OS' as const;
      const isStaffWrite = sfContactId === null;

      if (isStaffWrite) {
        // Learner__c is a required (non-nillable) lookup — staff write deferred.
        recordSfWriteSkip('Learner__c is required — staff SF logging deferred pending schema change');
        logger.info({ adminEmail: staffEmail, audience }, 'Penny interaction skipped SF write (Learner__c required)');
      } else if (shouldWrite) {
        recordSfWriteAttempt(false);
        logInteraction(sfClient, {
          contactId:     sfContactId!,
          adminEmail:    null,
          userMessage:   (query as string).trim(),
          pennyResponse: responseText,
          promptMode,
          source:        sfSource,
          audience,
        }).then(() => {
          recordSfWriteSuccess(false);
        }).catch((logErr: unknown) => {
          const errMsg = logErr instanceof Error ? logErr.message : String(logErr);
          recordSfWriteFailure('Penny_Interaction_Log__c', errMsg);
          const isPermission =
            errMsg.includes('INSUFFICIENT_ACCESS') ||
            errMsg.includes('FIELD_INTEGRITY_EXCEPTION') ||
            errMsg.includes('Required fields are missing') ||
            errMsg.includes('CREATE_FAILED');
          if (isPermission) {
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
    }

    return { shouldWriteToSf: sfClient !== null && sfContactId !== null, staffEmail };
  }

  // ─── Shared helper: build the contextMeta response object ────────────────
  function buildContextMeta(shouldWriteToSf: boolean) {
    return {
      audience,
      contactId:         sfContactId,
      learnerName:       learnerCtx ? `${learnerCtx.firstName} ${learnerCtx.lastName}`.trim() : null,
      trailId:           trailCfg?.trailId ?? null,
      trailConfigId:     learnerCtx?.pennyTrailConfigId ?? null,
      currentPhase:      learnerCtx?.currentPhase ?? null,
      currentGoal:       learnerCtx?.currentGoal ?? null,
      coachingTone:      learnerCtx?.coachingTone ?? null,
      confidenceScore:   learnerCtx?.confidenceScore ?? null,
      promptPath,
      interactionLogged: shouldWriteToSf,
    };
  }

  // ─── Branch: Claude for internal/staff ───────────────────────────────────
  if (audience === 'internal') {
    const anthropicKey = process.env["ANTHROPIC_API_KEY"];
    if (!anthropicKey) {
      logger.error({ audience }, 'ANTHROPIC_API_KEY not configured — staff Penny unavailable');
      return res.status(503).json({
        error: "Penny is not available for staff right now — the AI provider is not configured. Contact your system administrator.",
      });
    }

    // Anthropic messages API uses 'assistant' role, not 'model'
    const anthropicMessages = [
      ...validHistory.map(h => ({
        role:    h.role === 'model' ? 'assistant' as const : 'user' as const,
        content: h.text,
      })),
      { role: 'user' as const, content: userText },
    ];

    const claudeModel = "claude-sonnet-4-5";

    try {
      const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type":    "application/json",
          "x-api-key":       anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model:      claudeModel,
          max_tokens: 4096,
          system:     systemPrompt,
          messages:   anthropicMessages,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!claudeResp.ok) {
        // Explicit failure — log with full detail so the issue is visible in
        // logs immediately.  Do NOT fall back to Gemini.
        const errBody = await claudeResp.json().catch(() => ({})) as {
          error?: { type?: string; message?: string };
        };
        const errType = errBody.error?.type ?? 'unknown';
        const errMsg  = errBody.error?.message ?? `HTTP ${claudeResp.status}`;
        logger.error(
          {
            status:    claudeResp.status,
            errType,
            errMsg,
            audience,
            userEmail: req.session.sfEmail ?? null,
          },
          'Claude API returned non-2xx — returning 503 to staff (no Gemini fallback)'
        );
        return res.status(503).json({
          error:     "Penny is temporarily unavailable for staff. Please try again in a moment.",
          retryable: true,
        });
      }

      const claudeData = await claudeResp.json() as {
        content?: Array<{ type: string; text?: string }>;
      };
      const claudeText = (claudeData.content ?? [])
        .filter(b => b.type === 'text')
        .map(b => b.text ?? '')
        .join('')
        .trim();

      if (!claudeText) {
        logger.warn({ audience, userEmail: req.session.sfEmail ?? null }, 'Claude returned empty content — 503 to staff (no Gemini fallback)');
        return res.status(503).json({
          error:     "Penny returned an empty response. Please try again.",
          retryable: true,
        });
      }

      const durationMs = Date.now() - start;
      const { shouldWriteToSf } = persistInteraction(claudeText, claudeModel, durationMs);

      return res.json({
        reply:      claudeText,
        model:      claudeModel,
        durationMs,
        layersPresent,
        contextMeta: buildContextMeta(shouldWriteToSf),
      });

    } catch (e: unknown) {
      const isTimeout = e instanceof Error && e.name === 'TimeoutError';
      // Log with ERROR severity so Anthropic outages appear in log searches.
      // Do NOT fall back to Gemini.
      logger.error(
        {
          err:       e instanceof Error ? e.message : String(e),
          isTimeout,
          audience,
          userEmail: req.session.sfEmail ?? null,
        },
        isTimeout
          ? 'Claude request timed out after 30s — 503 to staff (no Gemini fallback)'
          : 'Claude request threw unexpected error — 503 to staff (no Gemini fallback)'
      );
      return res.status(503).json({
        error: isTimeout
          ? "Penny took too long to respond (30s timeout). Please try again."
          : "Penny is temporarily unavailable for staff. Please try again in a moment.",
        retryable: true,
      });
    }
  }

  // ─── Branch: Gemini for learner audience (unchanged) ─────────────────────
  // Build Gemini-format contents array and call with overload retry logic.
  // Nothing below this point has been modified from the original implementation.
  const contents = [
    ...validHistory.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user' as const, parts: [{ text: userText }] },
  ];

  // ── Call Gemini 2.5 Flash via REST (with overload retries) ──────────────
  // Verify the Gemini key here — after audience dispatch — so a missing key
  // never blocks the staff/Claude branch above.
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    return res.status(503).json({ error: "Gemini API key not configured. Set GEMINI_API_KEY in Replit Secrets." });
  }

  const model = "gemini-2.5-flash";
  const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const geminiBody = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.7,
    },
  });

  /** True when the Gemini response signals a transient overload. */
  function isOverloaded(status: number, msg: string): boolean {
    return status === 503 || status === 429 ||
      /high demand|overload|resource.has.been.exhausted|quota/i.test(msg);
  }

  const MAX_ATTEMPTS = 3;
  let lastStatus = 502;
  let lastErrMsg  = '';

  try {
    let resp: Response | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) {
        // exponential back-off: 1s → 2s
        await new Promise(r => setTimeout(r, (attempt - 1) * 1000));
      }
      resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: geminiBody,
        signal: AbortSignal.timeout(30_000),
      });

      if (resp.ok) break;

      const errBody = await resp.json().catch(() => ({})) as { error?: { message?: string } };
      lastStatus  = resp.status;
      lastErrMsg  = errBody.error?.message ?? `Gemini API returned HTTP ${resp.status}`;

      if (!isOverloaded(resp.status, lastErrMsg)) break; // non-retryable error
      // else loop and retry
      resp = null;
    }

    if (!resp) {
      // All attempts hit an overload — return a friendly message
      return res.status(503).json({
        error: "Penny is temporarily busy due to high demand. Please try again in a moment.",
        retryable: true,
      });
    }

    if (!resp.ok) {
      return res.status(502).json({ error: lastErrMsg });
    }

    const body = await resp.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    };

    const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return res.status(502).json({ error: "Penny returned an empty response. Try rephrasing your question." });
    }

    const durationMs  = Date.now() - start;
    const { shouldWriteToSf } = persistInteraction(text, model, durationMs);

    return res.json({
      reply: text,
      model,
      durationMs,
      layersPresent,
      contextMeta: buildContextMeta(shouldWriteToSf),
    });
  } catch (e: unknown) {
    const isTimeout = e instanceof Error && e.name === "TimeoutError";
    const msg = isTimeout
      ? "Penny took too long to respond (30s timeout). Try a shorter question."
      : `Could not reach Gemini: ${e instanceof Error ? e.message : String(e)}`;
    return res.status(502).json({ error: msg });
  }
});

// ── GET /penny/write-health ───────────────────────────────────────────────────
// Returns the in-process Salesforce write health state so the admin UI can
// surface a write failure within minutes rather than on the next org query.
// State resets on server restart — stale errors from a prior deployment mislead.

router.get("/penny/write-health", (_req, res) => {
  res.json(getSfWriteHealth());
});

// ── Preflight helpers (minimal SF client, rate-limit-aware) ───────────────────

type SfFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

const SF_API_VERSION = "v62.0";

async function pfSfGet(proxyFetch: SfFetchFn, path: string): Promise<Record<string, unknown>> {
  const res = await proxyFetch(`/services/data/${SF_API_VERSION}${path}`, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 429) throw Object.assign(new Error("rate-limited"), { status: 429 });
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`${res.status}: ${text.slice(0, 120)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Per-object timeout for preflight describe calls.
 * Configurable via PF_OBJECT_TIMEOUT_MS env var; defaults to 5 s.
 * A slow describe never blocks the entire preflight response beyond this budget.
 */
const PF_OBJECT_TIMEOUT_MS = (() => {
  const v = parseInt(process.env['PF_OBJECT_TIMEOUT_MS'] ?? '', 10);
  return isNaN(v) || v <= 0 ? 5_000 : v;
})();

/**
 * Maximum number of SF describe calls issued concurrently during a preflight
 * batch.  Configurable via PF_CONCURRENCY env var; defaults to 5.
 * Running describes in parallel collapses N × PF_OBJECT_TIMEOUT_MS serial waits
 * into approximately one timeout window regardless of object count.
 */
const PF_CONCURRENCY = (() => {
  const v = parseInt(process.env['PF_CONCURRENCY'] ?? '', 10);
  return isNaN(v) || v <= 0 ? 5 : v;
})();

/**
 * Wraps pfSfGet with:
 *  1. A hard per-object timeout (PF_OBJECT_TIMEOUT_MS).  If the describe
 *     call stalls, the timeout resolves first and the object is classified
 *     as 'undetermined' by the caller.
 *  2. No retry on 429.  A throttle is not evidence of absence — the preflight
 *     batch loop classifies rate-limited objects as 'undetermined' immediately
 *     rather than waiting the old 12-second hold.
 */
async function pfSfGetRetry(proxyFetch: SfFetchFn, path: string): Promise<Record<string, unknown>> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(Object.assign(new Error('preflight-timeout'), { status: 0 })),
      PF_OBJECT_TIMEOUT_MS,
    )
  );
  return Promise.race([pfSfGet(proxyFetch, path), timeoutPromise]);
}

// ── Capability requirement definitions (backend mirror) ────────────────────────

interface BReq {
  id: string;
  label: string;
  kind: 'sf-field' | 'sf-object' | 'integration' | 'config';
  sfObject?: string;
  sfField?: string;
  integrationKey?: string;
  capabilityDep?: string;
  fixRoute?: string;
  fixLabel?: string;
  pennyMissingNote: string;
}

// satisfies Record<CapabilityId, BReq[]> ensures TypeScript fails at compile
// time if any capability ID present in the shared CapabilityId union is missing
// from this map.  Add the new ID to CapabilityId first, then add the entry here.
const BACKEND_REQUIREMENTS = {
  'cap-learner-coaching': [
    { id: 'salesforce-connected', label: 'Salesforce integration connected', kind: 'integration', integrationKey: 'salesforce', fixRoute: '/admin/integrations', fixLabel: 'Open Integrations', pennyMissingNote: 'Without a Salesforce connection I have no learner context.' },
    { id: 'sf-contact-accessible', label: 'Contact object accessible in Salesforce', kind: 'sf-object', sfObject: 'Contact', pennyMissingNote: 'I read the Contact record to know who I\'m coaching.' },
    { id: 'sf-penny-trail-config', label: 'Penny_Trail_Config__c field on Contact', kind: 'sf-field', sfObject: 'Contact', sfField: 'Penny_Trail_Config__c', fixRoute: '/admin/integrations', fixLabel: 'Open SF Validation', pennyMissingNote: 'This field links each learner to their Trail configuration.' },
    { id: 'sf-program-engagement', label: 'pmdm__ProgramEngagement__c object accessible', kind: 'sf-object', sfObject: 'pmdm__ProgramEngagement__c', pennyMissingNote: 'I use engagement records to track progress.' },
  ],
  'cap-reflection-prompts': [
    { id: 'cap-learner-coaching-active', label: 'Learner Coaching capability active', kind: 'config', capabilityDep: 'cap-learner-coaching', fixRoute: '/penny/capabilities', fixLabel: 'Enable Learner Coaching', pennyMissingNote: 'Reflection Prompts builds on Learner Coaching — set that up first.' },
    // Verified 2026-08-04: Training_Plan_Item__c does not exist in the live org.
    // The TT curriculum uses Learner_Course_Module__c (confirmed accessible, 14 fields) to track
    // module completion per learner — this is the direct equivalent for reflection trigger events.
    { id: 'sf-training-plan-item', label: 'Learner_Course_Module__c object accessible', kind: 'sf-object', sfObject: 'Learner_Course_Module__c', pennyMissingNote: 'Module completion events come from Learner_Course_Module__c.' },
    { id: 'slack-connected', label: 'Slack integration connected', kind: 'integration', integrationKey: 'slack', fixRoute: '/admin/integrations', fixLabel: 'Connect Slack', pennyMissingNote: 'I deliver reflection prompts through Slack DMs.' },
  ],
  'cap-resume-review': [
    { id: 'salesforce-connected', label: 'Salesforce integration connected', kind: 'integration', integrationKey: 'salesforce', fixRoute: '/admin/integrations', fixLabel: 'Open Integrations', pennyMissingNote: 'I need Salesforce to look up certification and program data.' },
    { id: 'sf-contact-accessible', label: 'Contact object accessible in Salesforce', kind: 'sf-object', sfObject: 'Contact', pennyMissingNote: 'I check program stage from the Contact record.' },
    { id: 'sf-program-engagement', label: 'pmdm__ProgramEngagement__c object accessible', kind: 'sf-object', sfObject: 'pmdm__ProgramEngagement__c', pennyMissingNote: 'Program completion status calibrates the feedback.' },
  ],
  'cap-interview-prep': [
    { id: 'cap-resume-review-active', label: 'Resume Review capability active', kind: 'config', capabilityDep: 'cap-resume-review', fixRoute: '/penny/capabilities', fixLabel: 'Enable Resume Review', pennyMissingNote: 'Interview Prep works best after Resume Review is in place.' },
    { id: 'sf-contact-accessible', label: 'Contact object accessible in Salesforce', kind: 'sf-object', sfObject: 'Contact', pennyMissingNote: 'I need completion data to select the right interview questions.' },
  ],
  'cap-study-coach': [
    { id: 'cap-learner-coaching-active', label: 'Learner Coaching capability active', kind: 'config', capabilityDep: 'cap-learner-coaching', fixRoute: '/penny/capabilities', fixLabel: 'Enable Learner Coaching', pennyMissingNote: 'Study Coach extends Learner Coaching — enable that first.' },
    // Verified 2026-08-04: Training_Plan_Item__c does not exist in the live org.
    // Learner_Course_Module__c is the correct object for checking module progress and deadlines.
    { id: 'sf-training-plan-item', label: 'Learner_Course_Module__c accessible', kind: 'sf-object', sfObject: 'Learner_Course_Module__c', pennyMissingNote: 'I check module progress from Learner_Course_Module__c to send pacing alerts before it\'s too late.' },
    { id: 'sf-program-engagement', label: 'pmdm__ProgramEngagement__c accessible', kind: 'sf-object', sfObject: 'pmdm__ProgramEngagement__c', pennyMissingNote: 'I need the engagement record to see where each learner is in their sprint.' },
  ],
  'cap-cohort-summaries': [
    { id: 'cap-learner-coaching-active', label: 'Learner Coaching capability active', kind: 'config', capabilityDep: 'cap-learner-coaching', fixRoute: '/penny/capabilities', fixLabel: 'Enable Learner Coaching', pennyMissingNote: 'Cohort Summaries aggregates data that comes through Learner Coaching. Set that up first.' },
    { id: 'sf-service-schedule', label: 'pmdm__ServiceSchedule__c object accessible', kind: 'sf-object', sfObject: 'pmdm__ServiceSchedule__c', pennyMissingNote: 'Program schedule data lives in pmdm__ServiceSchedule__c — I need it to generate cohort briefs.' },
    { id: 'slack-connected', label: 'Slack integration connected', kind: 'integration', integrationKey: 'slack', fixRoute: '/admin/integrations', fixLabel: 'Connect Slack', pennyMissingNote: 'I deliver cohort summaries to the coach channel every Monday. Slack is required.' },
  ],
  'cap-progress-insights': [
    { id: 'cap-learner-coaching-active', label: 'Learner Coaching capability active', kind: 'config', capabilityDep: 'cap-learner-coaching', fixRoute: '/penny/capabilities', fixLabel: 'Enable Learner Coaching', pennyMissingNote: 'Progress Insights builds on Learner Coaching context. Enable that first.' },
    { id: 'sf-program-engagement', label: 'pmdm__ProgramEngagement__c accessible', kind: 'sf-object', sfObject: 'pmdm__ProgramEngagement__c', pennyMissingNote: 'I track what each learner has completed by reading their pmdm__ProgramEngagement__c record.' },
  ],
} satisfies Record<CapabilityId, BReq[]>;

const DEFAULT_BACKEND_REQUIREMENTS: BReq[] = [
  { id: 'salesforce-connected', label: 'Salesforce integration connected', kind: 'integration', integrationKey: 'salesforce', fixRoute: '/admin/integrations', fixLabel: 'Open Integrations', pennyMissingNote: 'I need a Salesforce connection to access learner and program data.' },
  { id: 'sf-contact-accessible', label: 'Contact object accessible in Salesforce', kind: 'sf-object', sfObject: 'Contact', pennyMissingNote: 'I need Contact access to personalise my responses.' },
];

// ── GET /penny/capabilities/:id/preflight ──────────────────────────────────────

router.get("/penny/capabilities/:id/preflight", async (req, res): Promise<void> => {
  const capabilityId = req.params["id"] ?? "";
  // Cast to Record<string, BReq[]> for the runtime lookup; the satisfies constraint
  // above already guarantees every CapabilityId has an entry at compile time.
  const requirements = (BACKEND_REQUIREMENTS as Record<string, BReq[]>)[capabilityId] ?? DEFAULT_BACKEND_REQUIREMENTS;

  // Attempt to get an authenticated SF fetch function
  let proxyFetch: SfFetchFn | null = null;
  let sfConnected = false;
  try {
    proxyFetch = await getEffectiveSfFetch(req);
    sfConnected = true;
  } catch {
    /* SF not connected — degrade gracefully */
  }

  // Batch unique SF object describes to minimise API calls
  const uniqueSfObjects = [...new Set(
    requirements
      .filter(r => (r.kind === 'sf-field' || r.kind === 'sf-object') && r.sfObject)
      .map(r => r.sfObject!)
  )];

  const describeCache      = new Map<string, Record<string, unknown> | null>();
  const describeErrorCache = new Map<string, string>();
  if (proxyFetch) {
    // Issue describes in parallel, PF_CONCURRENCY at a time, so that N × timeout
    // collapses to roughly one timeout window even when every object stalls.
    const describeFetch = proxyFetch; // capture for closure — already non-null here
    for (let i = 0; i < uniqueSfObjects.length; i += PF_CONCURRENCY) {
      const batch = uniqueSfObjects.slice(i, i + PF_CONCURRENCY);
      await Promise.all(batch.map(async (objName) => {
        try {
          const describe = await pfSfGetRetry(describeFetch, `/sobjects/${objName}/describe`);
          describeCache.set(objName, describe);
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          describeCache.set(objName, null);
          describeErrorCache.set(objName, errMsg);
          logger.warn({ sfObject: objName, err: errMsg }, 'preflight: SF describe failed');
        }
      }));
    }
  }

  // Check Slack availability (session-based heuristic — no full API call needed)
  const sess = req.session as unknown as Record<string, unknown>;
  const slackConnected =
    typeof sess['slackAccessToken'] === 'string' ||
    typeof sess['slackBotToken']    === 'string';

  // Evaluate each requirement
  const results = requirements.map(r => {
    const base = { ...r };

    if (r.kind === 'config') {
      // Resolved client-side; return undetermined so the frontend overrides it
      return { ...base, status: 'undetermined', detail: 'Checked by browser' };
    }

    if (r.kind === 'integration') {
      if (r.integrationKey === 'salesforce') {
        return { ...base, status: sfConnected ? 'met' : 'missing', detail: sfConnected ? 'Connected' : 'Not connected' };
      }
      if (r.integrationKey === 'slack') {
        return { ...base, status: slackConnected ? 'met' : 'missing', detail: slackConnected ? 'Connected' : 'Not connected' };
      }
      return { ...base, status: 'undetermined', detail: 'Cannot check automatically' };
    }

    if (!proxyFetch) {
      return { ...base, status: 'undetermined', detail: 'Salesforce not connected' };
    }

    const describe = r.sfObject ? describeCache.get(r.sfObject) : null;

    if (r.kind === 'sf-object') {
      if (describe === null) {
        const errMsg = r.sfObject ? (describeErrorCache.get(r.sfObject) ?? '') : '';
        // Only a 404 is proof the object genuinely does not exist in this org.
        // Any other error (throttle, permissions, network) is inconclusive — report
        // 'undetermined' so the admin is not shown a false "missing" result.
        if (errMsg.startsWith('404')) {
          return { ...base, status: 'missing', detail: 'Object not found in this org' };
        }
        const detail = errMsg ? `Could not check — ${errMsg.slice(0, 80)}` : 'Could not check';
        return { ...base, status: 'undetermined', detail };
      }
      if (!describe) return { ...base, status: 'undetermined', detail: 'Could not check' };
      return { ...base, status: 'met', detail: 'Accessible' };
    }

    if (r.kind === 'sf-field') {
      if (describe === null) {
        const errMsg = r.sfObject ? (describeErrorCache.get(r.sfObject) ?? '') : '';
        // Same principle: only a 404 on the parent object is conclusive.
        if (errMsg.startsWith('404')) {
          return { ...base, status: 'missing', detail: 'Parent object not found in this org' };
        }
        return { ...base, status: 'undetermined', detail: errMsg ? `Could not check — ${errMsg.slice(0, 80)}` : 'Could not check' };
      }
      if (!describe) return { ...base, status: 'undetermined', detail: 'Could not check' };
      const fields = (describe['fields'] as Array<{ name: string }>) ?? [];
      const found  = fields.some(f => f.name === r.sfField);
      return { ...base, status: found ? 'met' : 'missing', detail: found ? 'Present' : 'Missing' };
    }

    return { ...base, status: 'undetermined', detail: 'Unknown requirement kind' };
  });

  res.json({ capabilityId, sfConnected, requirements: results });
});

// ── GET /penny/stats ──────────────────────────────────────────────────────────
// Aggregated engagement stats for the Penny dashboard.
// Returns today's counts by audience + trail, lifetime totals, and the 10
// most recent interactions.

router.get("/penny/stats", async (_req, res): Promise<void> => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Today's rows (all of them — low volume, aggregate in JS)
    const todayRows = await db
      .select({
        audience:  pennyLogsTable.audience,
        trailId:   pennyLogsTable.trailId,
      })
      .from(pennyLogsTable)
      .where(gte(pennyLogsTable.createdAt, todayStart));

    // Lifetime aggregates
    const [lifetimeResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(pennyLogsTable);

    // Lifetime by audience (top 5 audiences, rest lumped)
    const lifetimeRows = await db
      .select({
        audience: pennyLogsTable.audience,
        count:    sql<number>`COUNT(*)::int`,
      })
      .from(pennyLogsTable)
      .groupBy(pennyLogsTable.audience);

    // 10 most recent interactions
    const recent = await db
      .select({
        id:           pennyLogsTable.id,
        audience:     pennyLogsTable.audience,
        trailId:      pennyLogsTable.trailId,
        learnerName:  pennyLogsTable.learnerName,
        userEmail:    pennyLogsTable.userEmail,
        promptMode:   pennyLogsTable.promptMode,
        model:        pennyLogsTable.model,
        durationMs:   pennyLogsTable.durationMs,
        createdAt:    pennyLogsTable.createdAt,
      })
      .from(pennyLogsTable)
      .orderBy(desc(pennyLogsTable.createdAt))
      .limit(10);

    // Aggregate today by audience + trail
    const todayByAudience: Record<string, number> = {};
    const todayByTrail:    Record<string, number> = {};
    for (const row of todayRows) {
      const aud = row.audience ?? 'unknown';
      todayByAudience[aud] = (todayByAudience[aud] ?? 0) + 1;
      if (row.trailId) {
        todayByTrail[row.trailId] = (todayByTrail[row.trailId] ?? 0) + 1;
      }
    }

    const lifetimeByAudience: Record<string, number> = {};
    for (const row of lifetimeRows) {
      lifetimeByAudience[row.audience ?? 'unknown'] = row.count;
    }

    const lastInteraction = recent[0]?.createdAt ?? null;

    res.json({
      today: {
        total:      todayRows.length,
        byAudience: todayByAudience,
        byTrail:    todayByTrail,
      },
      lifetime: {
        total:      lifetimeResult?.count ?? 0,
        byAudience: lifetimeByAudience,
      },
      recentInteractions: recent.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      lastInteractionAt: lastInteraction ? lastInteraction.toISOString() : null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to compute Penny stats");
    res.status(500).json({ error: "Failed to compute stats" });
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

// ── GET /penny/sf-recent-logs ─────────────────────────────────────────────────
// Queries the live Salesforce org for the 5 most recently created
// Penny_Interaction_Log__c records.  Used by the admin Command Center to
// confirm that fire-and-forget writes are landing in the org.
// Returns { records: [...], error: string|null, sfConnected: boolean }.

router.get("/penny/sf-recent-logs", async (req, res): Promise<void> => {
  let sfClient: SalesforceClient | null = null;
  try {
    sfClient = getSalesforceClient(req);
  } catch {
    res.json({ records: [], sfConnected: false, error: "Salesforce not connected" });
    return;
  }

  try {
    const soql =
      "SELECT Id, Source__c, Prompt_Mode__c, CreatedDate " +
      "FROM Penny_Interaction_Log__c " +
      "ORDER BY CreatedDate DESC LIMIT 5";
    const result = await sfClient.query<{
      Id: string;
      Source__c: string;
      Prompt_Mode__c: string;
      CreatedDate: string;
    }>(soql);
    res.json({
      records: result.records,
      sfConnected: true,
      error: null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.json({ records: [], sfConnected: true, error: msg });
  }
});

export default router;
