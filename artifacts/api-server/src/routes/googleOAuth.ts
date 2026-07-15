import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";

const router = Router();

// ── Session store ──────────────────────────────────────────────────────────────
// Holds state across OAuth redirect round-trip + one-time token display.
// Nothing persisted — memory only. TTL 10 min, tokens cleared after first read.

interface PendingSession {
  phase: "state";
  state: string;
  createdAt: number;
}
interface CompleteSession {
  phase: "complete";
  refreshToken: string;
  scopesGranted: string;
  email: string;
  createdAt: number;
}
type OAuthSession = PendingSession | CompleteSession;

const sessions = new Map<string, OAuthSession>();
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 min

function cleanSessions() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  // gmail.send is a "sensitive" scope — works in Testing mode for test users.
  // gmail.readonly is a "restricted" scope — requires Google security assessment
  // before it works even in Testing mode. Inbox reading is disabled until the
  // app passes that review; compose/send still works via gmail.send alone.
  "https://www.googleapis.com/auth/gmail.send",
  "openid",
  "email",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPublicBaseUrl(req: Request): string {
  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (devDomain) return `https://${devDomain}`;
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "http";
  const host = (req.headers["host"] as string | undefined) ?? "localhost:8080";
  return `${proto}://${host}`;
}

function getRedirectUri(req: Request): string {
  return `${getPublicBaseUrl(req)}/api/google/oauth/callback`;
}

function getFrontendBase(req: Request): string {
  return getPublicBaseUrl(req);
}

function credentialsPresent(): { clientId: boolean; clientSecret: boolean; ok: boolean } {
  const clientId = !!process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = !!process.env["GOOGLE_CLIENT_SECRET"];
  return { clientId, clientSecret, ok: clientId && clientSecret };
}

function refreshTokensPresent(): { drive: boolean; calendar: boolean; gmail: boolean } {
  const drive = !!(
    process.env["GOOGLE_DRIVE_REFRESH_TOKEN"] ??
    process.env["GDRIVE_REFRESH_TOKEN"] ??
    process.env["GOOGLE_REFRESH_TOKEN"]
  );
  const calendar = !!(
    process.env["GOOGLE_CALENDAR_REFRESH_TOKEN"] ??
    process.env["GCAL_REFRESH_TOKEN"] ??
    process.env["GOOGLE_CAL_REFRESH_TOKEN"]
  );
  const gmail = !!process.env["GOOGLE_GMAIL_REFRESH_TOKEN"];
  return { drive, calendar, gmail };
}

// ── GET /google/oauth/info ────────────────────────────────────────────────────
// Returns the redirect URI and current auth tier so the UI can show setup state.

router.get("/google/oauth/info", (req: Request, res: Response) => {
  const redirectUri = getRedirectUri(req);
  const creds = credentialsPresent();
  const tokens = refreshTokensPresent();

  return res.json({
    redirectUri,
    scopes: SCOPES,
    scopeDisplay: "drive.readonly, drive.file, calendar.readonly, calendar.events, gmail.send",
    credentials: creds,
    tokens,
    authUrl: creds.ok
      ? `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(process.env["GOOGLE_CLIENT_ID"] ?? "")}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(SCOPES.join(" "))}` +
        `&access_type=offline` +
        `&prompt=consent`
      : null,
    status: !creds.ok
      ? "credentials_missing"
      : tokens.drive && tokens.calendar && tokens.gmail
      ? "fully_authorized"
      : tokens.drive || tokens.calendar || tokens.gmail
      ? "partially_authorized"
      : "awaiting_oauth",
  });
});

// ── GET /google/oauth/start ───────────────────────────────────────────────────
// Redirects the user's browser to Google's consent screen.

router.get("/google/oauth/start", (req: Request, res: Response) => {
  cleanSessions();

  const creds = credentialsPresent();
  if (!creds.ok) {
    return res.status(400).send(
      `<html><body style="font-family:sans-serif;padding:2rem">
        <h2>❌ Google OAuth credentials not configured</h2>
        <p>GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set in Replit Secrets before starting the OAuth flow.</p>
        <p><a href="javascript:window.history.back()">← Go back</a></p>
      </body></html>`
    );
  }

  const clientId = process.env["GOOGLE_CLIENT_ID"]!;
  const redirectUri = getRedirectUri(req);

  // CSRF state
  const stateId = crypto.randomUUID();
  const state = crypto.randomBytes(16).toString("hex");
  sessions.set(stateId, { phase: "state", state, createdAt: Date.now() });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: `${stateId}:${state}`,
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// ── GET /google/oauth/callback ────────────────────────────────────────────────
// Google redirects here after the user authorises (or denies).

router.get("/google/oauth/callback", async (req: Request, res: Response) => {
  cleanSessions();

  const { code, state: rawState, error } = req.query as Record<string, string>;
  const frontendBase = getFrontendBase(req);

  // ── OAuth error from Google ─────────────────────────────────────────────────
  if (error) {
    return res.redirect(
      `${frontendBase}/admin/integrations/google-auth?status=error&error=${encodeURIComponent(error)}`
    );
  }

  // ── Validate CSRF state ─────────────────────────────────────────────────────
  const [stateId, stateVal] = (rawState ?? "").split(":");
  const pending = sessions.get(stateId);
  if (!pending || pending.phase !== "state" || pending.state !== stateVal) {
    return res.redirect(
      `${frontendBase}/admin/integrations/google-auth?status=error&error=${encodeURIComponent("Invalid or expired state — please restart the authorization flow.")}`
    );
  }
  sessions.delete(stateId);

  if (!code) {
    return res.redirect(
      `${frontendBase}/admin/integrations/google-auth?status=error&error=${encodeURIComponent("No authorization code received from Google.")}`
    );
  }

  // ── Exchange code for tokens ────────────────────────────────────────────────
  const clientId     = process.env["GOOGLE_CLIENT_ID"]!;
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"]!;
  const redirectUri  = getRedirectUri(req);

  let refreshToken: string;
  let scopesGranted: string;
  let email: string;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
      signal: AbortSignal.timeout(12_000),
    });

    const body = await tokenRes.json() as {
      refresh_token?: string;
      scope?: string;
      error?: string;
      error_description?: string;
      id_token?: string;
    };

    if (!tokenRes.ok || body.error) {
      const msg = body.error_description ?? body.error ?? `HTTP ${tokenRes.status}`;
      return res.redirect(
        `${frontendBase}/admin/integrations/google-auth?status=error&error=${encodeURIComponent(`Token exchange failed: ${msg}`)}`
      );
    }

    if (!body.refresh_token) {
      return res.redirect(
        `${frontendBase}/admin/integrations/google-auth?status=error&error=${encodeURIComponent("Google did not return a refresh token. This can happen if the account was previously authorized without prompt=consent. Please revoke access at myaccount.google.com/permissions and try again.")}`
      );
    }

    refreshToken  = body.refresh_token;
    scopesGranted = body.scope ?? SCOPES.join(" ");

    // Decode email from id_token (no signature verification needed for display only)
    try {
      const payload = JSON.parse(
        Buffer.from((body.id_token ?? "").split(".")[1] ?? "", "base64url").toString()
      ) as { email?: string };
      email = payload.email ?? "(unknown)";
    } catch {
      email = "(unknown)";
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.redirect(
      `${frontendBase}/admin/integrations/google-auth?status=error&error=${encodeURIComponent(`Network error during token exchange: ${msg}`)}`
    );
  }

  // ── Store result in session (one-time retrieval) ────────────────────────────
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    phase: "complete",
    refreshToken,
    scopesGranted,
    email,
    createdAt: Date.now(),
  });

  return res.redirect(
    `${frontendBase}/admin/integrations/google-auth?status=success&session=${encodeURIComponent(sessionId)}`
  );
});

// ── GET /google/oauth/session/:id ─────────────────────────────────────────────
// One-time retrieval of the refresh token after a successful OAuth flow.
// Token is cleared from memory after the first call.

router.get("/google/oauth/session/:id", (req: Request, res: Response) => {
  cleanSessions();

  const id = req.params["id"] as string;
  const session = sessions.get(id);

  if (!session || session.phase !== "complete") {
    return res.status(404).json({ error: "Session not found or already retrieved. It may have expired (10-minute TTL)." });
  }

  const { refreshToken, scopesGranted, email } = session;

  // Clear immediately — one-time only
  sessions.delete(id);

  return res.json({
    refreshToken,
    scopesGranted,
    email,
    // Security note: this is the only response that ever contains a token value.
    // The server never logs it (pino serializer strips query/body details),
    // it's transmitted over HTTPS only, and cleared from memory before this response returns.
    warning: "Store this refresh token immediately. It will not be shown again.",
    instructions: {
      drive:    "Add GOOGLE_DRIVE_REFRESH_TOKEN = <value> to Replit Secrets",
      calendar: "Add GOOGLE_CALENDAR_REFRESH_TOKEN = <value> to Replit Secrets (same value)",
      gmail:    "Add GOOGLE_GMAIL_REFRESH_TOKEN = <value> to Replit Secrets (same value — covers gmail.readonly + gmail.send)",
      restart:  "Restart the API server after adding secrets so they load into the environment",
    },
  });
});

export default router;
