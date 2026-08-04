import { Router } from "express";
import { getSalesforceClient } from "../lib/getSalesforceClient.js";
import { getEffectiveSfFetch } from "../lib/salesforceOAuth.js";
import {
  getLearnerContext,
  getTrailConfig,
  logInteraction,
  getInteractionHistory,
} from "../lib/salesforceService.js";
import {
  recordSfWriteAttempt,
  recordSfWriteSuccess,
  recordSfWriteFailure,
  getSfWriteHealth,
} from "../lib/sfWriteHealth.js";
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

    const soql =
      "SELECT Id, Source__c, Prompt_Mode__c, CreatedDate " +
      "FROM Penny_Interaction_Log__c " +
      "ORDER BY CreatedDate DESC LIMIT 5";
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

    const durationMs  = Date.now() - start;
    // Describe what actually happened rather than hardcoding "ask".
    // Prompt_Mode__c is a plain string field (not a picklist) so any value is
    // accepted by Salesforce — we use it to show admins which context layers
    // were active for this exchange.
    const promptMode  = derivePromptMode(learnerCtx !== null, recentExchanges.length > 0);
    const learnerName = learnerCtx
      ? `${learnerCtx.firstName} ${learnerCtx.lastName}`.trim()
      : null;

    // Fire-and-forget: write to DB (always) + Salesforce (when contact known).
    // Neither write is awaited — a failed write must never cost the user their
    // reply.  The local DB is the primary persistence path; SF is supplementary.
    db.insert(pennyLogsTable).values({
      sessionId:     req.sessionID ?? null,
      userTier:      typeof role === 'string' ? role : null,
      userEmail:     req.session.sfEmail ?? null,
      userMessage:   query.trim(),
      pennyResponse: text,
      promptMode,
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
      // Source__c is a RESTRICTED picklist — only 'dashboard', 'slack_dm',
      // 'slack_mention', 'mobile' are permitted.  Any other value causes
      // Salesforce to silently reject the entire insert.
      // This endpoint is the Trail OS web interface → 'dashboard'.
      // When Slack / mobile channels are added they will pass their own source.
      recordSfWriteAttempt();
      logInteraction(sfClient, {
        contactId:     sfContactId,
        userMessage:   query.trim(),
        pennyResponse: text,
        promptMode,
        source:        'dashboard',
      }).then(() => {
        recordSfWriteSuccess();
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

async function pfSfGetRetry(proxyFetch: SfFetchFn, path: string): Promise<Record<string, unknown>> {
  try { return await pfSfGet(proxyFetch, path); }
  catch (e) {
    if ((e as { status?: number }).status === 429) {
      await new Promise(r => setTimeout(r, process.env['NODE_ENV'] === 'test' ? 0 : 12_000));
      return pfSfGet(proxyFetch, path);
    }
    throw e;
  }
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

const BACKEND_REQUIREMENTS: Record<string, BReq[]> = {
  'cap-learner-coaching': [
    { id: 'salesforce-connected', label: 'Salesforce integration connected', kind: 'integration', integrationKey: 'salesforce', fixRoute: '/admin/integrations', fixLabel: 'Open Integrations', pennyMissingNote: 'Without a Salesforce connection I have no learner context.' },
    { id: 'sf-contact-accessible', label: 'Contact object accessible in Salesforce', kind: 'sf-object', sfObject: 'Contact', pennyMissingNote: 'I read the Contact record to know who I\'m coaching.' },
    { id: 'sf-penny-trail-config', label: 'Penny_Trail_Config__c field on Contact', kind: 'sf-field', sfObject: 'Contact', sfField: 'Penny_Trail_Config__c', fixRoute: '/admin/integrations', fixLabel: 'Open SF Validation', pennyMissingNote: 'This field links each learner to their Trail configuration.' },
    { id: 'sf-program-engagement', label: 'Program_Engagement__c object accessible', kind: 'sf-object', sfObject: 'Program_Engagement__c', pennyMissingNote: 'I use engagement records to track progress.' },
  ],
  'cap-reflection-prompts': [
    { id: 'cap-learner-coaching-active', label: 'Learner Coaching capability active', kind: 'config', capabilityDep: 'cap-learner-coaching', fixRoute: '/penny/capabilities', fixLabel: 'Enable Learner Coaching', pennyMissingNote: 'Reflection Prompts builds on Learner Coaching — set that up first.' },
    { id: 'sf-training-plan-item', label: 'Training_Plan_Item__c object accessible', kind: 'sf-object', sfObject: 'Training_Plan_Item__c', pennyMissingNote: 'Module completion events come from Training_Plan_Item__c.' },
    { id: 'slack-connected', label: 'Slack integration connected', kind: 'integration', integrationKey: 'slack', fixRoute: '/admin/integrations', fixLabel: 'Connect Slack', pennyMissingNote: 'I deliver reflection prompts through Slack DMs.' },
  ],
  'cap-resume-review': [
    { id: 'salesforce-connected', label: 'Salesforce integration connected', kind: 'integration', integrationKey: 'salesforce', fixRoute: '/admin/integrations', fixLabel: 'Open Integrations', pennyMissingNote: 'I need Salesforce to look up certification and program data.' },
    { id: 'sf-contact-accessible', label: 'Contact object accessible in Salesforce', kind: 'sf-object', sfObject: 'Contact', pennyMissingNote: 'I check program stage from the Contact record.' },
    { id: 'sf-program-engagement', label: 'Program_Engagement__c object accessible', kind: 'sf-object', sfObject: 'Program_Engagement__c', pennyMissingNote: 'Program completion status calibrates the feedback.' },
  ],
  'cap-interview-prep': [
    { id: 'cap-resume-review-active', label: 'Resume Review capability active', kind: 'config', capabilityDep: 'cap-resume-review', fixRoute: '/penny/capabilities', fixLabel: 'Enable Resume Review', pennyMissingNote: 'Interview Prep works best after Resume Review is in place.' },
    { id: 'sf-contact-accessible', label: 'Contact object accessible in Salesforce', kind: 'sf-object', sfObject: 'Contact', pennyMissingNote: 'I need completion data to select the right interview questions.' },
  ],
  'cap-study-coach': [
    { id: 'cap-learner-coaching-active', label: 'Learner Coaching capability active', kind: 'config', capabilityDep: 'cap-learner-coaching', fixRoute: '/penny/capabilities', fixLabel: 'Enable Learner Coaching', pennyMissingNote: 'Study Coach extends Learner Coaching — enable that first.' },
    { id: 'sf-training-plan-item', label: 'Training_Plan_Item__c accessible', kind: 'sf-object', sfObject: 'Training_Plan_Item__c', pennyMissingNote: 'I check module deadlines from Training_Plan_Item__c.' },
    { id: 'sf-program-engagement', label: 'Program_Engagement__c accessible', kind: 'sf-object', sfObject: 'Program_Engagement__c', pennyMissingNote: 'I need the engagement record to see where each learner is in their sprint.' },
  ],
};

const DEFAULT_BACKEND_REQUIREMENTS: BReq[] = [
  { id: 'salesforce-connected', label: 'Salesforce integration connected', kind: 'integration', integrationKey: 'salesforce', fixRoute: '/admin/integrations', fixLabel: 'Open Integrations', pennyMissingNote: 'I need a Salesforce connection to access learner and program data.' },
  { id: 'sf-contact-accessible', label: 'Contact object accessible in Salesforce', kind: 'sf-object', sfObject: 'Contact', pennyMissingNote: 'I need Contact access to personalise my responses.' },
];

// ── GET /penny/capabilities/:id/preflight ──────────────────────────────────────

router.get("/penny/capabilities/:id/preflight", async (req, res): Promise<void> => {
  const capabilityId = req.params["id"] ?? "";
  const requirements = BACKEND_REQUIREMENTS[capabilityId] ?? DEFAULT_BACKEND_REQUIREMENTS;

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

  const describeCache = new Map<string, Record<string, unknown> | null>();
  if (proxyFetch) {
    for (const objName of uniqueSfObjects) {
      try {
        const describe = await pfSfGetRetry(proxyFetch, `/sobjects/${objName}/describe`);
        describeCache.set(objName, describe);
      } catch {
        describeCache.set(objName, null); // mark as inaccessible
      }
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
      if (describe === null) return { ...base, status: 'missing', detail: 'Not accessible' };
      if (!describe)         return { ...base, status: 'undetermined', detail: 'Could not check' };
      return { ...base, status: 'met', detail: 'Accessible' };
    }

    if (r.kind === 'sf-field') {
      if (describe === null) return { ...base, status: 'missing', detail: 'Object not accessible' };
      if (!describe)         return { ...base, status: 'undetermined', detail: 'Could not check' };
      const fields = (describe['fields'] as Array<{ name: string }>) ?? [];
      const found  = fields.some(f => f.name === r.sfField);
      return { ...base, status: found ? 'met' : 'missing', detail: found ? 'Present' : 'Missing' };
    }

    return { ...base, status: 'undetermined', detail: 'Unknown requirement kind' };
  });

  res.json({ capabilityId, sfConnected, requirements: results });
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
