/**
 * slackOAuth.ts
 *
 * Per-user Slack OAuth flow and Slack data-fetch routes.
 *
 * OAuth routes:
 *   GET  /slack/oauth/authorize     — start OAuth; redirect to Slack
 *   GET  /slack/oauth/callback      — receive code; store token; redirect back
 *   GET  /slack/oauth/status        — { connected, teamName, slackUserId }
 *   DELETE /slack/oauth/disconnect  — remove stored token
 *
 * Data routes (require connected token):
 *   GET  /slack/conversations               — list user's DMs + channels
 *   GET  /slack/conversations/:id/history   — recent messages
 *   POST /slack/conversations/:id/messages  — send a message as the user
 *
 * All routes are guarded by requireSlackAuth (learner / coach / volunteer / team).
 * The OAuth callback is added to PUBLIC_PATHS in index.ts so Slack's browser
 * redirect lands correctly.
 */

import { Router, type RequestHandler } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { slackUserTokensTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
// requireHomebaseAuth not imported — requireSlackAuth handles auth inline,
// reading only the real session (never the impersonated effective identity).

// ── Token encryption (AES-256-GCM) ───────────────────────────────────────────
// User OAuth tokens are encrypted before persistence so a DB read alone cannot
// yield usable credentials.  The key is derived from SESSION_SECRET via scrypt
// so it is never stored in the DB.

const _RAW_SECRET =
  process.env["SESSION_SECRET"] ??
  process.env["SLACK_CLIENT_SECRET"] ??
  "dev-only-fallback-secret-32bytes!";

// scryptSync is intentionally synchronous — runs once at module load time.
const ENC_KEY = crypto.scryptSync(_RAW_SECRET, "trail_os_slack_token_v1", 32);

/**
 * Encrypt a plaintext token string.
 * Output format: `<ivHex>:<authTagHex>:<ciphertextHex>` (colon-separated)
 */
export function encryptToken(plaintext: string): string {
  const iv       = crypto.randomBytes(12);
  const cipher   = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag  = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a token produced by encryptToken.
 * Returns null if the format is unexpected (e.g. a pre-encryption plaintext row).
 */
export function decryptToken(stored: string): string | null {
  const parts = stored.split(":");
  if (parts.length !== 3) return null;
  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];
  try {
    const iv         = Buffer.from(ivHex, "hex");
    const authTag    = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");
    const decipher   = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null; // tampered or corrupt
  }
}

const router = Router();

// ── requireSlackAuth — single gate for all Slack data routes ─────────────────
//
// Reads ONLY the real session (never res.locals.effectiveEmail which reflects
// the impersonated identity).  Checks in order:
//  1. Authentication   — req.session.googleEmail must exist
//  2. Impersonation    — req.session.impersonatedEmail must NOT be set
//  3. Audience         — req.session.googleAudience must be a homebase audience
//
// Using the real audience (googleAudience) rather than the effective audience
// ensures a superadmin impersonating a learner is rejected at step 2, not
// accidentally permitted because the effective audience looks like a learner.

const SLACK_HOMEBASE_AUDIENCES = ["learner", "coach", "volunteer", "team"] as const;

const requireSlackAuth: RequestHandler = (req, res, next) => {
  // 1. Authentication
  if (!req.session.googleEmail) {
    res.status(401).json({ error: "not_authenticated", message: "Sign in required." });
    return;
  }

  // 2. Impersonation guard — Slack connections are always for the real identity
  if (req.session.impersonatedEmail) {
    res.status(403).json({
      error:   "impersonation_not_permitted",
      message: "Slack connections cannot be managed while impersonating another user.",
    });
    return;
  }

  // 3. Audience check — three permitted states:
  //    a) null   — staff-only session (googleAudience explicitly null); allowed so staff can
  //                connect their own Slack accounts without a homebase audience.
  //    b) a recognised homebase audience string — learner / coach / volunteer / team.
  //    c) undefined / absent — session has no audience at all; rejected.
  //
  // NOTE: do NOT collapse `null` and `undefined` here with a falsy check.  null means
  // "staff, no homebase" (allowed).  undefined means "unauthenticated audience" (blocked).
  // Using `!audience` would silently block null — this was the original regression.
  const audience = req.session.googleAudience;
  const hasValidAudience =
    audience === null ||   // staff-only (permitted)
    (audience !== undefined && SLACK_HOMEBASE_AUDIENCES.includes(audience));
  if (!hasValidAudience) {
    res.status(403).json({
      error:   "not_authorized",
      message: "This resource is only available to Homebase users (learner, coach, volunteer, or team) or staff.",
    });
    return;
  }

  next();
};

// ── Scopes requested from the user ────────────────────────────────────────────
const USER_SCOPES = [
  "channels:read",
  "channels:history",
  "groups:read",
  "groups:history",
  "im:read",
  "im:history",
  "mpim:read",
  "mpim:history",
  "chat:write",
  "search:read",
  "users:read",
  "reactions:write",
  "canvases:read",
  "canvases:write",
].join(",");

// ── In-memory state store (CSRF protection across the OAuth redirect) ─────────
// Keyed by random state token.  Entries expire after 10 minutes.

interface OAuthState {
  email:         string;
  returnPath:    string;
  /** Exact callback URI captured at /authorize time — must match at token-exchange time. */
  callbackUri:   string;
  /** Base URL of the request origin captured at /authorize time — used for post-OAuth redirects. */
  returnBaseUrl: string;
  createdAt:     number;
}
const stateStore = new Map<string, OAuthState>();
const STATE_TTL_MS = 10 * 60 * 1000;

function cleanStateStore() {
  const now = Date.now();
  for (const [key, s] of stateStore) {
    if (now - s.createdAt > STATE_TTL_MS) stateStore.delete(key);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPublicBaseUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (devDomain) return `https://${devDomain}`;
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "http";
  const host  = (req.headers["host"] as string | undefined) ?? "localhost:8080";
  return `${proto}://${host}`;
}

function getCallbackUri(req: Parameters<typeof getPublicBaseUrl>[0]): string {
  return `${getPublicBaseUrl(req)}/api/slack/oauth/callback`;
}

/**
 * Sanitize an OAuth return path so it is always a safe same-origin relative path.
 *
 * Accepts only paths that start with exactly one `/` (no `//`, no absolute URLs,
 * no protocol-relative references).  Strips query strings and hashes to a simple
 * pathname and allowlists only the homebase routes that legitimately appear as
 * return targets.  Falls back to "/" for anything that looks suspicious.
 */
const RETURN_PATH_ALLOWLIST = /^\/homebase(\/[a-zA-Z0-9_-]*)*\/?$/;

export function sanitizeReturnPath(raw: string | undefined): string {
  if (!raw) return "/";

  // Must start with exactly one slash — reject protocol-relative ("//") and absolute URLs
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";

  // Reject anything that looks like an absolute URL embedded with a colon scheme
  if (/^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return "/";

  // Normalise: extract only the pathname (drop query + hash) to prevent
  // encoding tricks that sneak host names into the path
  let pathname: string;
  try {
    // Parse as a relative URL against a dummy base to extract just the pathname
    pathname = new URL(raw, "http://localhost").pathname;
  } catch {
    return "/";
  }

  // Allowlist: only recognisable Homebase routes or root
  if (pathname === "/" || RETURN_PATH_ALLOWLIST.test(pathname)) {
    return pathname;
  }

  return "/";
}

// Slack API error codes that indicate the stored token is no longer valid.
// When detected, the API returns 401 + { error: "token_expired" } so the
// frontend can show a targeted "reconnect" prompt instead of a generic error.
const SLACK_TOKEN_ERRORS = new Set([
  "token_revoked",
  "token_expired",
  "invalid_auth",
  "account_inactive",
  "not_authed",
]);

function isTokenExpiredError(slackError: unknown): boolean {
  return typeof slackError === "string" && SLACK_TOKEN_ERRORS.has(slackError);
}

/**
 * Returns true when the Slack API response indicates the stored token is
 * missing one or more OAuth scopes required for the requested method.
 * The frontend uses this to show a targeted "reconnect to add permissions"
 * prompt instead of a generic error.
 */
function isMissingScopeError(slackError: unknown): boolean {
  return slackError === "missing_scope";
}
/** Call Slack Web API with a user or bot token (GET methods). */
async function slackUserGet(
  token:  string,
  method: string,
  params: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const url = new URL(`https://slack.com/api/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as Record<string, unknown>;
}

/** Look up a user's display name from their Slack user ID. */
async function resolveDisplayName(token: string, userId: string): Promise<string> {
  try {
    const r = await slackUserGet(token, "users.info", { user: userId });
    if (r["ok"] === true) {
      const user = r["user"] as Record<string, unknown>;
      const profile = user["profile"] as Record<string, unknown> | undefined;
      return (
        (profile?.["display_name"] as string | undefined)?.trim() ||
        (profile?.["real_name"] as string | undefined)?.trim() ||
        (user["name"] as string | undefined) ||
        userId
      );
    }
  } catch {
    // ignore — fall back to userId
  }
  return userId;
}

// ── GET /slack/oauth/authorize ────────────────────────────────────────────────

router.get("/slack/oauth/authorize", requireSlackAuth, (req, res) => {
  const clientId     = process.env["SLACK_CLIENT_ID"];
  if (!clientId) {
    res.status(503).json({ error: "SLACK_CLIENT_ID not configured" });
    return;
  }

  // Use the REAL signed-in identity — not the impersonated one (already rejected above).
  const email = req.session.googleEmail;
  if (!email) {
    res.status(401).json({ error: "No authenticated user" });
    return;
  }

  cleanStateStore();

  const state = crypto.randomBytes(20).toString("hex");
  const returnPath    = sanitizeReturnPath(req.query["return"] as string | undefined);
  const callbackUri   = getCallbackUri(req);
  const returnBaseUrl = getPublicBaseUrl(req);

  // Persist both URIs in the state store so the callback uses the EXACT same
  // values regardless of which host/protocol serves that request.
  stateStore.set(state, { email, returnPath, callbackUri, returnBaseUrl, createdAt: Date.now() });

  const params = new URLSearchParams({
    client_id:    clientId,
    user_scope:   USER_SCOPES,
    redirect_uri: callbackUri,
    state,
  });

  res.redirect(`https://slack.com/oauth/v2/authorize?${params.toString()}`);
});

// ── GET /slack/oauth/callback ─────────────────────────────────────────────────
// PUBLIC PATH — added to index.ts allowlist.  Session may or may not be present;
// we identify the user via the state store instead.

router.get("/slack/oauth/callback", async (req, res) => {
  const { code, state, error: oauthError } = req.query as Record<string, string | undefined>;

  // Oauth error (e.g. user cancelled) — we don't yet have state, so fall back
  // to the request origin for the redirect target only if state is absent.
  if (oauthError && !state) {
    const fallbackBase = getPublicBaseUrl(req);
    res.redirect(`${fallbackBase}/?slackOAuth=cancelled`);
    return;
  }

  if (!code || !state) {
    res.status(400).send("Missing code or state parameter.");
    return;
  }

  // Validate state / CSRF
  const stored = stateStore.get(state);
  if (!stored) {
    res.status(400).send("Invalid or expired OAuth state. Please try connecting again.");
    return;
  }
  stateStore.delete(state);

  // Use the exact origins captured at authorize time — not re-derived here.
  const { email, returnPath, callbackUri, returnBaseUrl: baseUrl } = stored;

  // Handle user-cancelled with a valid state (preferred path — origin is known)
  if (oauthError) {
    res.redirect(`${baseUrl}${returnPath}?slackOAuth=cancelled`);
    return;
  }

  const clientId     = process.env["SLACK_CLIENT_ID"];
  const clientSecret = process.env["SLACK_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    res.status(503).send("Slack client credentials not configured.");
    return;
  }

  // Exchange code for token
  let tokenData: Record<string, unknown>;
  try {
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        code,
        redirect_uri:  callbackUri,   // must exactly match the URI used in /authorize
      }),
    });
    tokenData = (await tokenRes.json()) as Record<string, unknown>;
  } catch {
    res.status(502).send("Failed to contact Slack token endpoint.");
    return;
  }

  if (tokenData["ok"] !== true) {
    const errCode = String(tokenData["error"] ?? "unknown");
    req.log?.warn({ errCode }, "slack oauth token exchange failed");
    res.redirect(`${baseUrl}${returnPath}?slackOAuth=error&code=${errCode}`);
    return;
  }

  // Extract user token from the response.
  // Slack v2 OAuth puts user fields under tokenData.authed_user when user_scope is used.
  const authedUser = tokenData["authed_user"] as Record<string, unknown> | undefined;
  const userToken  = authedUser?.["access_token"] as string | undefined;
  const slackUserId = authedUser?.["id"] as string | undefined;

  // Fall back to top-level fields (some grant types)
  const finalToken   = userToken ?? (tokenData["access_token"] as string | undefined);
  const finalUserId  = slackUserId ?? (tokenData["user_id"] as string | undefined);
  const teamId       = (tokenData["team"] as Record<string, unknown> | undefined)?.["id"] as string | undefined
                    ?? tokenData["team_id"] as string | undefined;
  const teamName     = (tokenData["team"] as Record<string, unknown> | undefined)?.["name"] as string | undefined;
  const scopes       = authedUser?.["scope"] as string | undefined ?? tokenData["scope"] as string | undefined;

  if (!finalToken || !finalUserId || !teamId) {
    // Log only non-secret diagnostics — never log the token response body.
    req.log?.warn(
      { hasUserToken: !!finalToken, hasUserId: !!finalUserId, hasTeamId: !!teamId },
      "slack oauth: token exchange succeeded but required fields absent",
    );
    res.redirect(`${baseUrl}${returnPath}?slackOAuth=error&code=missing_token_fields`);
    return;
  }

  // Upsert the token row
  try {
    const encryptedToken = encryptToken(finalToken);

    await db
      .insert(slackUserTokensTable)
      .values({
        userEmail:   email,
        accessToken: encryptedToken,
        slackUserId: finalUserId,
        teamId,
        teamName:    teamName ?? null,
        scopes:      scopes ?? null,
        updatedAt:   new Date(),
      })
      .onConflictDoUpdate({
        target:     slackUserTokensTable.userEmail,
        set: {
          accessToken: encryptedToken,
          slackUserId: finalUserId,
          teamId,
          teamName:    teamName ?? null,
          scopes:      scopes ?? null,
          updatedAt:   new Date(),
        },
      });
  } catch (err) {
    req.log?.error({ err }, "slack oauth DB upsert failed");
    res.redirect(`${baseUrl}${returnPath}?slackOAuth=error&code=db_error`);
    return;
  }

  // Clear any stale conversation cache for this user — they may have connected a
  // new workspace and the cached channel list would belong to the previous one.
  convCache.delete(email);

  res.redirect(`${baseUrl}${returnPath}?slackOAuth=connected`);
});

// ── GET /slack/oauth/status ───────────────────────────────────────────────────

router.get("/slack/oauth/status", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ connected: false }); return; }

  try {
    const rows = await db
      .select({
        teamName:    slackUserTokensTable.teamName,
        slackUserId: slackUserTokensTable.slackUserId,
        scopes:      slackUserTokensTable.scopes,
      })
      .from(slackUserTokensTable)
      .where(eq(slackUserTokensTable.userEmail, email))
      .limit(1);

    if (rows.length === 0) {
      res.json({ connected: false });
      return;
    }
    const row = rows[0]!;
    res.json({ connected: true, teamName: row.teamName, slackUserId: row.slackUserId, scopes: row.scopes });
  } catch (err) {
    req.log.error({ err }, "slack oauth status DB error");
    res.status(500).json({ connected: false, error: "db_error" });
  }
});

// ── DELETE /slack/oauth/disconnect ────────────────────────────────────────────

router.delete("/slack/oauth/disconnect", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ ok: false }); return; }

  try {
    await db.delete(slackUserTokensTable).where(eq(slackUserTokensTable.userEmail, email));
    convCache.delete(email);   // clear stale cached conversations immediately
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "slack oauth disconnect DB error");
    res.status(500).json({ ok: false, error: "db_error" });
  }
});

// ── Helper: load user token from DB ──────────────────────────────────────────

async function getTokenForUser(email: string): Promise<string | null> {
  const rows = await db
    .select({ accessToken: slackUserTokensTable.accessToken })
    .from(slackUserTokensTable)
    .where(eq(slackUserTokensTable.userEmail, email))
    .limit(1);
  const stored = rows[0]?.accessToken;
  if (!stored) return null;
  return decryptToken(stored); // returns null if stored value is corrupt/tampered
}

// ── In-memory conversation list cache (60 s per user) ─────────────────────────

interface ConvCacheEntry {
  data:      ConversationItem[];
  fetchedAt: number;
}
const convCache = new Map<string, ConvCacheEntry>();
const CONV_TTL_MS = 60_000;

export interface ConversationItem {
  id:        string;
  type:      "im" | "mpim" | "channel";
  name:      string;
  isPrivate: boolean;
  userId?:   string;   // DM partner's Slack user ID (im type only) — used for presence lookups
}

// ── GET /slack/conversations ──────────────────────────────────────────────────

router.get("/slack/conversations", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ error: "unauthenticated" }); return; }

  // Serve from cache if fresh
  const cachedConvs = convCache.get(email);
  if (cachedConvs && Date.now() - cachedConvs.fetchedAt < CONV_TTL_MS) {
    res.json({ conversations: cachedConvs.data });
    return;
  }

  let token: string | null;
  try { token = await getTokenForUser(email); }
  catch (err) { req.log.error({ err }, "slack conversations DB error"); res.status(500).json({ error: "db_error" }); return; }
  if (!token) { res.status(403).json({ error: "not_connected" }); return; }

  try {
    const r = await slackUserGet(token, "conversations.list", {
      exclude_archived: "true",
      limit: "200",
      types: "public_channel,private_channel,im,mpim",
    });

    if (r["ok"] !== true) {
      const slackErr = r["error"];
      req.log.warn({ error: slackErr }, "slack conversations.list failed");
      if (isTokenExpiredError(slackErr)) {
        res.status(401).json({ error: "token_expired", message: "Slack token is no longer valid. Please reconnect." });
        return;
      }
      if (isMissingScopeError(slackErr)) {
        res.status(403).json({ error: "missing_scope", needed: parseMissingScopes(r) });
        return;
      }
      res.status(502).json({ error: String(slackErr ?? "slack_api_error") });
      return;
    }

    const rawChannels = (r["channels"] as Record<string, unknown>[]) ?? [];

    // Resolve DM partner names (parallel, best-effort)
    const conversations: ConversationItem[] = await Promise.all(
      rawChannels.map(async (ch): Promise<ConversationItem> => {
        const isIm   = ch["is_im"]   === true;
        const isMpim = ch["is_mpim"] === true;
        const id     = ch["id"] as string;

        if (isIm) {
          // DM partner user ID — resolve to display name and expose for presence lookups
          const dmUserId    = ch["user"] as string | undefined;
          const partnerName = dmUserId ? await resolveDisplayName(token!, dmUserId) : "Direct Message";
          return { id, type: "im", name: partnerName, isPrivate: true, userId: dmUserId };
        }

        if (isMpim) {
          return {
            id,
            type:      "mpim",
            name:      (ch["name"] as string | undefined) ?? "Group DM",
            isPrivate: true,
          };
        }

        return {
          id,
          type:      "channel",
          name:      (ch["name"] as string | undefined) ?? id,
          isPrivate: ch["is_private"] === true,
        };
      }),
    );

    // DMs first, then group DMs, then channels
    const sorted = [
      ...conversations.filter(c => c.type === "im"),
      ...conversations.filter(c => c.type === "mpim"),
      ...conversations.filter(c => c.type === "channel"),
    ];

    convCache.set(email, { data: sorted, fetchedAt: Date.now() });
    res.json({ conversations: sorted });
  } catch (err) {
    req.log.error({ err }, "slack conversations fetch error");
    res.status(502).json({ error: "fetch_error" });
  }
});

// ── GET /slack/conversations/:id/history ─────────────────────────────────────

router.get("/slack/conversations/:id/history", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ error: "unauthenticated" }); return; }

  const channelId = String(req.params["id"]);
  const limit     = Math.min(Number(req.query["limit"] ?? 30), 50).toString();

  let token: string | null;
  try { token = await getTokenForUser(email); }
  catch (err) { req.log.error({ err }, "slack history DB error"); res.status(500).json({ error: "db_error" }); return; }
  if (!token) { res.status(403).json({ error: "not_connected" }); return; }

  try {
    const r = await slackUserGet(token, "conversations.history", {
      channel: channelId,
      limit,
    });

    if (r["ok"] !== true) {
      const slackErr = r["error"];
      req.log.warn({ error: slackErr, channelId }, "slack conversations.history failed");
      if (isTokenExpiredError(slackErr)) {
        res.status(401).json({ error: "token_expired", message: "Slack token is no longer valid. Please reconnect." });
        return;
      }
      if (isMissingScopeError(slackErr)) {
        res.status(403).json({ error: "missing_scope", needed: parseMissingScopes(r) });
        return;
      }
      res.status(502).json({ error: String(slackErr ?? "slack_api_error") });
      return;
    }

    const rawMessages = (r["messages"] as Record<string, unknown>[]) ?? [];

    // Collect unique user IDs: senders + any <@USERID> mention tokens inside message text
    const mentionIds = rawMessages.flatMap(m => {
      const text = (m["text"] as string | undefined) ?? "";
      return [...text.matchAll(/<@([UW][A-Z0-9]+)>/g)].map(match => match[1]!);
    });

    const userIds = [...new Set([
      ...rawMessages
        .map(m => m["user"] as string | undefined)
        .filter((u): u is string => !!u),
      ...mentionIds,
    ])];

    // Resolve display names in parallel (resolveDisplayName is internally cached)
    const nameMap = new Map<string, string>();
    await Promise.all(
      userIds.map(async uid => {
        const displayName = await resolveDisplayName(token!, uid);
        nameMap.set(uid, displayName);
      }),
    );

    // Replace <@USERID> tokens in message text with @DisplayName
    const resolveMentions = (text: string): string =>
      text.replace(/<@([UW][A-Z0-9]+)>/g, (_, uid: string) =>
        `@${nameMap.get(uid) ?? uid}`,
      );

    const messages = rawMessages.map(m => ({
      ts:       m["ts"] as string,
      text:     resolveMentions((m["text"] as string | undefined) ?? ""),
      userId:   (m["user"] as string | undefined) ?? null,
      userName: (m["user"] as string | undefined)
        ? (nameMap.get(m["user"] as string) ?? m["user"])
        : (m["username"] as string | undefined) ?? "Unknown",
      isBot:    m["bot_id"] !== undefined || m["subtype"] === "bot_message",
      reactions: ((m["reactions"] as Array<{ name: string; count: number; users: string[] }> | undefined) ?? [])
        .map(r => ({ name: r.name, count: r.count, users: r.users ?? [] })),
    }));

    res.json({ messages, hasMore: r["has_more"] === true });
  } catch (err) {
    req.log.error({ err }, "slack history fetch error");
    res.status(502).json({ error: "fetch_error" });
  }
});

// ── POST /slack/conversations/:id/messages ────────────────────────────────────

router.post("/slack/conversations/:id/messages", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ error: "unauthenticated" }); return; }

  const channelId = String(req.params["id"]);
  const text      = ((req.body as { text?: string })?.text ?? "").trim();

  if (!text) {
    res.status(400).json({ error: "text_required" });
    return;
  }

  let token: string | null;
  try { token = await getTokenForUser(email); }
  catch (err) { req.log.error({ err }, "slack reaction DB error"); res.status(500).json({ error: "db_error" }); return; }
  if (!token) { res.status(403).json({ error: "not_connected" }); return; }

  try {
    const r = await fetch("https://slack.com/api/chat.postMessage", {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ channel: channelId, text }),
    });
    const result = (await r.json()) as { ok: boolean; error?: string; ts?: string };

    if (!result.ok) {
      req.log.warn({ error: result.error, channelId }, "slack chat.postMessage failed");
      if (isTokenExpiredError(result.error)) {
        res.status(401).json({ ok: false, error: "token_expired", message: "Slack token is no longer valid. Please reconnect." });
        return;
      }
      if (isMissingScopeError(result.error)) {
        res.status(403).json({ ok: false, error: "missing_scope", needed: parseMissingScopes(result as unknown as Record<string, unknown>) });
        return;
      }
      res.status(502).json({ ok: false, error: result.error ?? "slack_api_error" });
      return;
    }

    // Invalidate conversation cache so sender sees their message on next poll
    convCache.delete(email);

    res.json({ ok: true, ts: result.ts });
  } catch (err) {
    req.log.error({ err }, "slack send fetch error");
    res.status(502).json({ ok: false, error: "fetch_error" });
  }
});

// ── Presence cache ────────────────────────────────────────────────────────────
// Keyed by `${googleEmail}:${slackUserId}` so entries are strictly per
// authenticated user.  A plain slackUserId key would allow any authenticated
// Homebase user (including those not connected to Slack) to read cached values
// belonging to someone else's session.
const presenceCache = new Map<string, { presence: string; fetchedAt: number }>();
const PRESENCE_TTL_MS = 60_000;

// ── GET /slack/users/:userId/presence ─────────────────────────────────────────

router.get("/slack/users/:userId/presence", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ error: "unauthenticated" }); return; }

  const userId = String(req.params["userId"]);

  // Verify the requester has a live Slack connection BEFORE consulting the
  // cache.  This prevents unauthenticated-to-Slack users from reading cached
  // presence data that was populated by another user's session.
  let token: string | null;
  try { token = await getTokenForUser(email); }
  catch (err) { req.log.error({ err }, "slack presence DB error"); res.status(500).json({ error: "db_error" }); return; }
  if (!token) { res.status(403).json({ error: "not_connected" }); return; }

  // Cache key is scoped to the authenticated Google account so entries cannot
  // leak across users or workspaces.
  const cacheKey = `${email}:${userId}`;
  const cached = presenceCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < PRESENCE_TTL_MS) {
    res.json({ presence: cached.presence });
    return;
  }

  try {
    const r = await slackUserGet(token, "users.getPresence", { user: userId });

    if (r["ok"] !== true) {
      const slackErr = r["error"];
      if (isTokenExpiredError(slackErr)) {
        res.status(401).json({ error: "token_expired" }); return;
      }
      if (isMissingScopeError(slackErr)) {
        res.status(403).json({ error: "missing_scope", needed: parseMissingScopes(r) }); return;
      }
      res.status(502).json({ error: String(slackErr ?? "slack_api_error") }); return;
    }
    const presence = String(r["presence"] ?? "away");
    presenceCache.set(cacheKey, { presence, fetchedAt: Date.now() });
    res.json({ presence });
  } catch (err) {
    req.log.error({ err }, "slack presence fetch error");
    res.status(502).json({ error: "fetch_error" });
  }
});

// ── GET /slack/search ─────────────────────────────────────────────────────────

router.get("/slack/search", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ error: "unauthenticated" }); return; }

  const query = ((req.query["q"] as string | undefined) ?? "").trim();
  if (!query || query.length < 2) { res.json({ results: [] }); return; }

  let token: string | null;
  try { token = await getTokenForUser(email); }
  catch (err) { req.log.error({ err }, "slack reaction DB error"); res.status(500).json({ error: "db_error" }); return; }
  if (!token) { res.status(403).json({ error: "not_connected" }); return; }

  try {
    const r = await slackUserGet(token, "search.messages", { query, count: "20" });

    if (r["ok"] !== true) {
      const slackErr = r["error"];
      if (isTokenExpiredError(slackErr)) {
        res.status(401).json({ error: "token_expired" }); return;
      }
      if (isMissingScopeError(slackErr)) {
        res.status(403).json({ error: "missing_scope", needed: parseMissingScopes(r) }); return;
      }
      res.status(502).json({ error: String(slackErr ?? "slack_api_error") }); return;
    }

    // Slack returns results under messages.matches
    const rawMatches = ((r["messages"] as Record<string, unknown> | undefined)?.["matches"] as Record<string, unknown>[]) ?? [];

    const results = rawMatches.map(m => {
      const ch = m["channel"] as Record<string, unknown> | undefined;
      return {
        ts:          m["ts"] as string,
        text:        m["text"] as string,
        userId:      (m["user"] as string | undefined) ?? null,
        userName:    (m["username"] as string | undefined) ?? (m["user"] as string | undefined) ?? "Unknown",
        channelId:   ch?.["id"] as string | undefined,
        channelName: ch?.["name"] as string | undefined,
        permalink:   m["permalink"] as string | undefined,
      };
    });

    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "slack search fetch error");
    res.status(502).json({ error: "fetch_error" });
  }
});

// ── GET /slack/unreads ────────────────────────────────────────────────────────
// Returns channels and DMs that have unread messages, sorted by unread count.

router.get("/slack/unreads", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ error: "unauthenticated" }); return; }

  let token: string | null;
  try { token = await getTokenForUser(email); }
  catch (err) { req.log.error({ err }, "slack unreads DB error"); res.status(500).json({ error: "db_error" }); return; }
  if (!token) { res.status(403).json({ error: "not_connected" }); return; }

  try {
    const r = await slackUserGet(token, "conversations.list", {
      exclude_archived: "true",
      limit: "200",
      types: "public_channel,private_channel,im,mpim",
    });

    if (r["ok"] !== true) {
      const slackErr = r["error"];
      req.log.warn({ error: slackErr }, "slack unreads conversations.list failed");
      if (isTokenExpiredError(slackErr)) { res.status(401).json({ error: "token_expired" }); return; }
      if (isMissingScopeError(slackErr)) { res.status(403).json({ error: "missing_scope", needed: parseMissingScopes(r) }); return; }
      res.status(502).json({ error: String(slackErr ?? "slack_api_error") }); return;
    }

    const rawChannels = (r["channels"] as Record<string, unknown>[]) ?? [];
    const withUnreads = rawChannels.filter(ch => {
      const count = ch["unread_count"] as number | undefined;
      return typeof count === "number" && count > 0;
    });

    const items = await Promise.all(
      withUnreads.map(async (ch): Promise<{ id: string; name: string; type: string; unreadCount: number }> => {
        const id          = ch["id"] as string;
        const unreadCount = (ch["unread_count"] as number) ?? 0;
        if (ch["is_im"] === true) {
          const dmUserId = ch["user"] as string | undefined;
          const name     = dmUserId ? await resolveDisplayName(token!, dmUserId) : "Direct Message";
          return { id, name, type: "im", unreadCount };
        }
        if (ch["is_mpim"] === true) {
          return { id, name: (ch["name"] as string | undefined) ?? "Group DM", type: "mpim", unreadCount };
        }
        return { id, name: (ch["name"] as string | undefined) ?? id, type: "channel", unreadCount };
      }),
    );

    items.sort((a, b) => b.unreadCount - a.unreadCount);
    res.json({ unreads: items });
  } catch (err) {
    req.log.error({ err }, "slack unreads fetch error");
    res.status(502).json({ error: "fetch_error" });
  }
});

// ── GET /slack/threads ────────────────────────────────────────────────────────
// Scans the user's most recently active conversations for threaded messages
// with reply activity, returns up to 10 sorted by latest reply timestamp.

router.get("/slack/threads", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ error: "unauthenticated" }); return; }

  let token: string | null;
  try { token = await getTokenForUser(email); }
  catch (err) { req.log.error({ err }, "slack threads DB error"); res.status(500).json({ error: "db_error" }); return; }
  if (!token) { res.status(403).json({ error: "not_connected" }); return; }

  try {
    // Fetch the user's conversations to identify which channels to scan
    const convsR = await slackUserGet(token, "conversations.list", {
      exclude_archived: "true",
      limit: "50",
      types: "public_channel,private_channel,im,mpim",
    });

    if (convsR["ok"] !== true) {
      const slackErr = convsR["error"];
      if (isTokenExpiredError(slackErr)) { res.status(401).json({ error: "token_expired" }); return; }
      if (isMissingScopeError(slackErr)) { res.status(403).json({ error: "missing_scope", needed: parseMissingScopes(convsR) }); return; }
      res.status(502).json({ error: String(slackErr ?? "slack_api_error") }); return;
    }

    const rawConvs = (convsR["channels"] as Record<string, unknown>[]) ?? [];

    // Pick the 5 most recently active conversations by their latest message timestamp
    const topConvs = rawConvs
      .filter(ch => ch["is_member"] !== false)
      .sort((a, b) => {
        const tsA = parseFloat(((a["latest"] as Record<string, unknown> | undefined)?.["ts"] as string | undefined) ?? "0");
        const tsB = parseFloat(((b["latest"] as Record<string, unknown> | undefined)?.["ts"] as string | undefined) ?? "0");
        return tsB - tsA;
      })
      .slice(0, 5);

    // Scan each conversation for threaded messages
    const allThreads: Array<{
      channelId:   string;
      channelName: string;
      threadTs:    string;
      text:        string;
      replyCount:  number;
      latestReply: string;
    }> = [];

    await Promise.allSettled(
      topConvs.map(async ch => {
        const channelId   = ch["id"] as string;
        const channelName =
          ch["is_im"] === true ? "DM" : ((ch["name"] as string | undefined) ?? channelId);

        const histR = await slackUserGet(token!, "conversations.history", {
          channel: channelId,
          limit: "20",
        });
        if (histR["ok"] !== true) return;

        const messages = (histR["messages"] as Record<string, unknown>[]) ?? [];
        for (const msg of messages) {
          const replyCount = (msg["reply_count"] as number | undefined) ?? 0;
          if (replyCount > 0) {
            allThreads.push({
              channelId,
              channelName,
              threadTs:    msg["ts"] as string,
              text:        ((msg["text"] as string | undefined) ?? "").slice(0, 120),
              replyCount,
              latestReply: (msg["latest_reply"] as string | undefined) ?? (msg["ts"] as string),
            });
          }
        }
      }),
    );

    allThreads.sort((a, b) => parseFloat(b.latestReply) - parseFloat(a.latestReply));
    res.json({ threads: allThreads.slice(0, 10) });
  } catch (err) {
    req.log.error({ err }, "slack threads fetch error");
    res.status(502).json({ error: "fetch_error" });
  }
});

// ── POST /slack/conversations/:channelId/messages/:ts/reactions ───────────────

// ── Canvas text extraction ────────────────────────────────────────────────────
//
// Slack canvas sections use a nested rich-text block structure.  Each section
// has an `elements` array of blocks (type "rich_text", "heading", etc.), each
// block has its own `elements` array of inline objects, and leaf nodes carry
// `{ type: "text", text: "…" }`.  There is no top-level `text` field on a
// section — callers must recurse to collect the actual string content.

function extractTextFromBlocks(node: unknown): string {
  if (!Array.isArray(node)) return "";
  return node.map((el): string => {
    if (typeof el !== "object" || el === null) return "";
    const e = el as Record<string, unknown>;

    // Leaf: a text run
    if (e["type"] === "text" && typeof e["text"] === "string") {
      const text  = e["text"] as string;
      const style = e["style"] as Record<string, unknown> | undefined;
      if (style?.["bold"])   return `**${text}**`;
      if (style?.["italic"]) return `_${text}_`;
      if (style?.["code"])   return `\`${text}\``;
      return text;
    }

    // List item: prefix with bullet
    if (e["type"] === "rich_text_list_item" && Array.isArray(e["elements"])) {
      return "• " + extractTextFromBlocks(e["elements"]);
    }

    // Any container element: recurse into its elements
    if (Array.isArray(e["elements"])) {
      return extractTextFromBlocks(e["elements"]);
    }

    return "";
  }).join("");
}

// ── GET /slack/conversations/:id/canvas ──────────────────────────────────────
//
// Returns the canvas attached to a Slack channel, if one exists.
// Requires canvases:read scope.
//
// Response shapes:
//   { canvas: { id, content, title } }          — canvas found; content may be ""
//   { canvas: null }                            — no canvas attached
//   { error: "missing_scope" }   (HTTP 403)     — token lacks canvases:read
//   { error: "token_expired" }   (HTTP 401)     — token invalid

router.get("/slack/conversations/:id/canvas", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ error: "unauthenticated" }); return; }

  const channelId = String(req.params["id"]);

  let token: string | null;
  try { token = await getTokenForUser(email); }
  catch (err) { req.log.error({ err }, "slack canvas DB error"); res.status(500).json({ error: "db_error" }); return; }
  if (!token) { res.status(403).json({ error: "not_connected" }); return; }

  try {
    // Step 1 — fetch channel info to discover attached canvas id
    const infoR = await slackUserGet(token, "conversations.info", {
      channel:               channelId,
      include_all_metadata:  "true",
    });

    if (infoR["ok"] !== true) {
      const slackErr = infoR["error"];
      if (isTokenExpiredError(slackErr)) {
        res.status(401).json({ error: "token_expired" }); return;
      }
      if (slackErr === "missing_scope") {
        res.status(403).json({ error: "missing_scope", neededScope: "canvases:read" }); return;
      }
      // Channel not found, archived, or inaccessible — treat as no canvas
      res.json({ canvas: null }); return;
    }

    const channelObj = infoR["channel"] as Record<string, unknown> | undefined;
    const canvasObj  = channelObj?.["canvas"] as Record<string, unknown> | undefined;
    const canvasId   = canvasObj?.["file_id"] as string | undefined;

    if (!canvasId) {
      res.json({ canvas: null }); return;
    }

    // Step 2 — fetch canvas sections via canvases.sections.lookup.
    // Sections carry nested `elements` arrays (Slack rich-text block format);
    // use extractTextFromBlocks() to walk the tree and collect plain text.
    const sectionsR = await fetch("https://slack.com/api/canvases.sections.lookup", {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ canvas_id: canvasId, criteria: {} }),
    });
    const sectionsData = (await sectionsR.json()) as Record<string, unknown>;

    if (sectionsData["ok"] !== true) {
      const slackErr = sectionsData["error"];
      if (isTokenExpiredError(slackErr)) {
        res.status(401).json({ error: "token_expired" }); return;
      }
      if (slackErr === "missing_scope") {
        res.status(403).json({ error: "missing_scope", neededScope: "canvases:read" }); return;
      }
      // Paid plan required or other transient error — surface canvas with no content
      req.log.warn({ slackErr, canvasId }, "canvases.sections.lookup failed");
      res.json({ canvas: { id: canvasId, content: "", title: "Channel Canvas" } }); return;
    }

    const sections = (sectionsData["sections"] as Array<Record<string, unknown>>) ?? [];

    // Each section's readable text is extracted by walking its `elements` tree.
    const content = sections
      .map(s => extractTextFromBlocks(s["elements"]))
      .filter(Boolean)
      .join("\n\n");

    res.json({ canvas: { id: canvasId, content, title: "Channel Canvas" } });
  } catch (err) {
    req.log.error({ err }, "slack canvas fetch error");
    res.status(502).json({ error: "fetch_error" });
  }
});

// ── POST /slack/conversations/:id/canvas ─────────────────────────────────────
//
// Creates a new canvas for the channel (or replaces content on an existing one).
// Requires canvases:write scope.
//
// Request body: { markdown?: string }   — initial markdown content (optional)
// Response:     { ok: true, canvasId: string }

router.post("/slack/conversations/:id/canvas", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ error: "unauthenticated" }); return; }

  const channelId = String(req.params["id"]);
  const markdown  = ((req.body as { markdown?: string })?.markdown ?? "").trim();

  let token: string | null;
  try { token = await getTokenForUser(email); }
  catch (err) { req.log.error({ err }, "slack canvas create DB error"); res.status(500).json({ error: "db_error" }); return; }
  if (!token) { res.status(403).json({ error: "not_connected" }); return; }

  try {
    const payload: Record<string, unknown> = { channel_id: channelId };
    if (markdown) {
      payload["document_content"] = { type: "markdown", markdown };
    }

    const r = await fetch("https://slack.com/api/conversations.canvases.create", {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const result = (await r.json()) as { ok: boolean; error?: string; canvas_id?: string };

    if (!result.ok) {
      req.log.warn({ error: result.error, channelId }, "slack conversations.canvases.create failed");
      if (isTokenExpiredError(result.error)) {
        res.status(401).json({ ok: false, error: "token_expired" }); return;
      }
      if (result.error === "missing_scope") {
        res.status(403).json({ ok: false, error: "missing_scope", neededScope: "canvases:write" }); return;
      }
      // canvas_already_exists — not a real error, return the existing canvas
      if (result.error === "canvas_already_exists") {
        res.json({ ok: true, canvasId: null, alreadyExists: true }); return;
      }
      res.status(502).json({ ok: false, error: result.error ?? "slack_api_error" }); return;
    }

    res.json({ ok: true, canvasId: result.canvas_id ?? null });
  } catch (err) {
    req.log.error({ err }, "slack canvas create error");
    res.status(502).json({ ok: false, error: "fetch_error" });
  }
});

// ── POST /slack/conversations/:channelId/messages/:ts/reactions ───────────────

router.post("/slack/conversations/:channelId/messages/:ts/reactions", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ error: "unauthenticated" }); return; }

  const channelId = String(req.params["channelId"]);
  const ts        = String(req.params["ts"]);
  const name      = ((req.body as { name?: string })?.name ?? "").trim().replace(/:/g, "");

  if (!name) { res.status(400).json({ error: "emoji_name_required" }); return; }

  let token: string | null;
  try { token = await getTokenForUser(email); }
  catch (err) { req.log.error({ err }, "slack reaction DB error"); res.status(500).json({ error: "db_error" }); return; }
  if (!token) { res.status(403).json({ error: "not_connected" }); return; }

  try {
    const r = await fetch("https://slack.com/api/reactions.add", {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ channel: channelId, timestamp: ts, name }),
    });
    const result = (await r.json()) as { ok: boolean; error?: string };

    // "already_reacted" is not a real error — idempotent success
    if (!result.ok && result.error !== "already_reacted") {
      if (isTokenExpiredError(result.error)) {
        res.status(401).json({ ok: false, error: "token_expired" }); return;
      }
      if (isMissingScopeError(result.error)) {
        res.status(403).json({ ok: false, error: "missing_scope", needed: parseMissingScopes(result as unknown as Record<string, unknown>) }); return;
      }
      res.status(502).json({ ok: false, error: result.error ?? "slack_api_error" }); return;
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "slack reactions.add error");
    res.status(502).json({ ok: false, error: "fetch_error" });
  }
});

export default router;

/**
 * Parse the `needed` field from a Slack missing_scope response body.
 * Slack returns it as a comma-separated string (e.g. "search:read,users:read").
 * Returns an array of scope strings, or an empty array if unavailable.
 */
function parseMissingScopes(body: Record<string, unknown>): string[] {
  const raw = body["needed"];
  if (typeof raw === "string") return raw.split(",").map(s => s.trim()).filter(Boolean);
  if (Array.isArray(raw)) return (raw as unknown[]).map(String);
  return [];
}
