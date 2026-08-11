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
  const email = req.session.googleEmail;   // real identity; impersonation rejected above
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
  const email = req.session.googleEmail;   // real identity; impersonation rejected above
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
  const email = req.session.googleEmail;   // real identity; impersonation rejected above
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
}

// ── GET /slack/conversations ──────────────────────────────────────────────────

router.get("/slack/conversations", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;   // real identity; impersonation rejected above
  if (!email) { res.status(401).json({ error: "unauthenticated" }); return; }

  // Serve from cache if fresh
  const cached = convCache.get(email);
  if (cached && Date.now() - cached.fetchedAt < CONV_TTL_MS) {
    res.json({ conversations: cached.data });
    return;
  }

  let token: string | null;
  try {
    token = await getTokenForUser(email);
  } catch (err) {
    req.log.error({ err }, "slack conversations DB error");
    res.status(500).json({ error: "db_error" });
    return;
  }

  if (!token) {
    res.status(403).json({ error: "not_connected" });
    return;
  }

  try {
    // Fetch DMs, group DMs, and channels in one call
    const r = await slackUserGet(token, "conversations.list", {
      types:            "im,mpim,private_channel,public_channel",
      limit:            "100",
      exclude_archived: "true",
    });

    if (r["ok"] !== true) {
      const slackErr = r["error"];
      req.log.warn({ error: slackErr }, "slack conversations.list failed");
      if (isTokenExpiredError(slackErr)) {
        res.status(401).json({ error: "token_expired", message: "Slack token is no longer valid. Please reconnect." });
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
          // DM partner user ID — resolve to display name
          const userId    = ch["user"] as string | undefined;
          const partnerName = userId ? await resolveDisplayName(token!, userId) : "Direct Message";
          return { id, type: "im", name: partnerName, isPrivate: true };
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
  const email = req.session.googleEmail;   // real identity; impersonation rejected above
  if (!email) { res.status(401).json({ error: "unauthenticated" }); return; }

  const channelId = String(req.params["id"]);
  const limit     = Math.min(Number(req.query["limit"] ?? 30), 50).toString();

  let token: string | null;
  try {
    token = await getTokenForUser(email);
  } catch (err) {
    req.log.error({ err }, "slack history DB error");
    res.status(500).json({ error: "db_error" });
    return;
  }

  if (!token) {
    res.status(403).json({ error: "not_connected" });
    return;
  }

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
      res.status(502).json({ error: String(slackErr ?? "slack_api_error") });
      return;
    }

    const rawMessages = (r["messages"] as Record<string, unknown>[]) ?? [];

    // Collect unique user IDs to resolve
    const userIds = [...new Set(
      rawMessages
        .map(m => m["user"] as string | undefined)
        .filter((u): u is string => !!u),
    )];

    // Resolve display names in parallel
    const nameMap = new Map<string, string>();
    await Promise.all(
      userIds.map(async uid => {
        const name = await resolveDisplayName(token!, uid);
        nameMap.set(uid, name);
      }),
    );

    const messages = rawMessages.map(m => ({
      ts:       m["ts"] as string,
      text:     m["text"] as string,
      userId:   (m["user"] as string | undefined) ?? null,
      userName: (m["user"] as string | undefined)
        ? (nameMap.get(m["user"] as string) ?? m["user"])
        : (m["username"] as string | undefined) ?? "Unknown",
      isBot:    m["bot_id"] !== undefined || m["subtype"] === "bot_message",
    }));

    res.json({ messages, hasMore: r["has_more"] === true });
  } catch (err) {
    req.log.error({ err }, "slack history fetch error");
    res.status(502).json({ error: "fetch_error" });
  }
});

// ── POST /slack/conversations/:id/messages ────────────────────────────────────

router.post("/slack/conversations/:id/messages", requireSlackAuth, async (req, res) => {
  const email = req.session.googleEmail;   // real identity; impersonation rejected above
  if (!email) { res.status(401).json({ error: "unauthenticated" }); return; }

  const channelId = String(req.params["id"]);
  const text      = ((req.body as { text?: string })?.text ?? "").trim();

  if (!text) {
    res.status(400).json({ error: "text_required" });
    return;
  }

  let token: string | null;
  try {
    token = await getTokenForUser(email);
  } catch (err) {
    req.log.error({ err }, "slack send DB error");
    res.status(500).json({ error: "db_error" });
    return;
  }

  if (!token) {
    res.status(403).json({ error: "not_connected" });
    return;
  }

  try {
    const r = await fetch("https://slack.com/api/chat.postMessage", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel:       channelId,
        text,
        unfurl_links:  false,
        unfurl_media:  false,
      }),
    });
    const result = (await r.json()) as { ok: boolean; error?: string; ts?: string };

    if (!result.ok) {
      req.log.warn({ error: result.error, channelId }, "slack chat.postMessage failed");
      if (isTokenExpiredError(result.error)) {
        res.status(401).json({ ok: false, error: "token_expired", message: "Slack token is no longer valid. Please reconnect." });
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

export default router;
