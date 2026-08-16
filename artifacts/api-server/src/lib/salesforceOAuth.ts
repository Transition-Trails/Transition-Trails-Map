import { randomBytes, createHash } from "crypto";
import type { Request } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface SalesforceTokenResponse {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  idToken: string;
  issuedAt: string;
}

export interface SalesforceUserIdentity {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  organizationId: string;
}

// ── Env helpers ───────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Set it in Replit Secrets before using the Salesforce OAuth flow.`
    );
  }
  return value;
}

// ── PKCE ──────────────────────────────────────────────────────────────────────

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
    .slice(0, 128);

  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return { codeVerifier, codeChallenge };
}

// ── Authorization URL ─────────────────────────────────────────────────────────

export function buildAuthorizationUrl(codeChallenge: string, state: string, redirectUri: string): string {
  const instanceUrl  = requireEnv("SALESFORCE_INSTANCE_URL");
  const clientId     = requireEnv("SALESFORCE_CLIENT_ID");

  const params = new URLSearchParams({
    response_type:         "code",
    client_id:             clientId,
    redirect_uri:          redirectUri,
    scope:                 "api refresh_token offline_access openid",
    code_challenge:        codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  return `${instanceUrl}/services/oauth2/authorize?${params.toString()}`;
}

// ── Token exchange ────────────────────────────────────────────────────────────

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<SalesforceTokenResponse> {
  const instanceUrl  = requireEnv("SALESFORCE_INSTANCE_URL");
  const clientId     = requireEnv("SALESFORCE_CLIENT_ID");
  const clientSecret = requireEnv("SALESFORCE_CLIENT_SECRET");

  const body = new URLSearchParams({
    grant_type:    "authorization_code",
    code,
    client_id:     clientId,
    client_secret: clientSecret,
    redirect_uri:  redirectUri,
    code_verifier: codeVerifier,
  });

  const resp = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "(no body)");
    throw new Error(
      `Salesforce token exchange failed (HTTP ${resp.status}): ${text}`
    );
  }

  const data = await resp.json() as {
    access_token:  string;
    refresh_token: string;
    instance_url:  string;
    id_token?:     string;
    issued_at:     string;
  };

  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    instanceUrl:  data.instance_url,
    idToken:      data.id_token ?? "",
    issuedAt:     data.issued_at,
  };
}

// ── Token refresh ─────────────────────────────────────────────────────────────

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; issuedAt: string }> {
  const instanceUrl  = requireEnv("SALESFORCE_INSTANCE_URL");
  const clientId     = requireEnv("SALESFORCE_CLIENT_ID");
  const clientSecret = requireEnv("SALESFORCE_CLIENT_SECRET");

  const body = new URLSearchParams({
    grant_type:    "refresh_token",
    refresh_token: refreshToken,
    client_id:     clientId,
    client_secret: clientSecret,
  });

  const resp = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "(no body)");
    throw new Error(
      `Salesforce token refresh failed (HTTP ${resp.status}): ${text}`
    );
  }

  const data = await resp.json() as {
    access_token: string;
    issued_at:    string;
  };

  return {
    accessToken: data.access_token,
    issuedAt:    data.issued_at,
  };
}

// ── Per-user token resolution ─────────────────────────────────────────────────

export interface SfCredentials {
  accessToken: string;
  instanceUrl: string;
}

/**
 * Returns the best available Salesforce credentials for this request.
 *
 * Priority:
 *  1. req.session.sfAccessToken + sfInstanceUrl — per-user token from the OAuth flow.
 *  2. SALESFORCE_ACCESS_TOKEN + SALESFORCE_INSTANCE_URL env vars — explicit shared
 *     service-account fallback (for admin/system calls or legacy deployments).
 *
 * NOTE: getCachedSfToken() is deliberately excluded. Falling back to another
 * user's session-cached token would constitute cross-user token reuse.
 *
 * Returns null when no credentials are available so callers can return 401.
 */
export function getEffectiveSfToken(req: Request): SfCredentials | null {
  // 1. Per-user session token — set after the user completes the SF OAuth flow
  if (req.session.sfAccessToken && req.session.sfInstanceUrl) {
    return {
      accessToken: req.session.sfAccessToken,
      instanceUrl: req.session.sfInstanceUrl,
    };
  }

  // 2. Explicit shared-service-account env vars — admin/system fallback only.
  //    getCachedSfToken() (another user's session) is intentionally NOT included
  //    here to prevent cross-user token reuse.
  const accessToken = process.env["SALESFORCE_ACCESS_TOKEN"];
  const instanceUrl = process.env["SALESFORCE_INSTANCE_URL"];
  if (accessToken && instanceUrl) {
    return { accessToken, instanceUrl };
  }

  return null;
}

/**
 * Returns a ready-to-use Salesforce fetch function for this request.
 *
 * Priority:
 *  1. req.session.sfAccessToken + sfInstanceUrl — per-user token from the OAuth flow.
 *  2. SALESFORCE_ACCESS_TOKEN + SALESFORCE_INSTANCE_URL env vars — explicit shared
 *     service-account fallback.
 *  3. Replit Connector proxy ("salesforce") — managed auth, always available when the
 *     Salesforce integration is connected in the Replit environment.
 *
 * Returns null only when all three options are unavailable.
 */
/**
 * Returns a fetch bound to the LEARNER's own Salesforce OAuth session.
 * Unlike getEffectiveSfFetch, this intentionally does NOT fall back to shared
 * service-account credentials or the Replit Connector.
 *
 * Use this for any operation where assessment integrity requires that the
 * action is verified against the individual learner's personal dev org —
 * e.g. build-check verify/respond.  Returns null when the learner has no
 * active per-user SF session, which must be surfaced to the caller as
 * sfNotConnected (503) rather than silently falling back to shared state.
 */
export function getLearnerSfFetch(
  req: Request,
): ((url: string, init?: RequestInit) => Promise<Response>) | null {
  if (req.session.sfAccessToken && req.session.sfInstanceUrl) {
    return makeSfDirectFetch(req.session.sfAccessToken, req.session.sfInstanceUrl);
  }
  return null;
}

export function getEffectiveSfFetch(
  req: Request
): ((url: string, init?: RequestInit) => Promise<Response>) | null {
  // 1. Per-user session token
  if (req.session.sfAccessToken && req.session.sfInstanceUrl) {
    return makeSfDirectFetch(req.session.sfAccessToken, req.session.sfInstanceUrl);
  }

  // 2. Explicit env-var service account
  const accessToken = process.env["SALESFORCE_ACCESS_TOKEN"];
  const instanceUrl = process.env["SALESFORCE_INSTANCE_URL"];
  if (accessToken && instanceUrl) {
    return makeSfDirectFetch(accessToken, instanceUrl);
  }

  // 3. Replit Connector proxy — handles token refresh automatically
  try {
    const connectors = new ReplitConnectors();
    const proxyFetch = connectors.createProxyFetch("salesforce");
    const proxyUrl   = connectors.getProxyUrl();
    return (path: string, init?: RequestInit): Promise<Response> => {
      const url = path.startsWith("http") ? path : `${proxyUrl}${path}`;
      return proxyFetch(url, init);
    };
  } catch {
    return null;
  }
}

/**
 * Creates a fetch-compatible function that calls Salesforce directly with the
 * given Bearer token.  Drop-in replacement for ReplitConnectors.createProxyFetch
 * — paths starting with "/" are prepended with instanceUrl automatically.
 */
export function makeSfDirectFetch(
  accessToken: string,
  instanceUrl: string
): (url: string, init?: RequestInit) => Promise<Response> {
  return (path: string, init?: RequestInit): Promise<Response> => {
    const url = path.startsWith("http") ? path : `${instanceUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    const incoming = init?.headers;
    if (incoming) {
      if (incoming instanceof Headers) {
        incoming.forEach((v, k) => { headers[k] = v; });
      } else if (Array.isArray(incoming)) {
        for (const [k, v] of incoming) headers[k] = v;
      } else {
        Object.assign(headers, incoming);
      }
    }
    return fetch(url, { ...init, headers });
  };
}

// ── User identity ─────────────────────────────────────────────────────────────

export async function getUserIdentity(
  accessToken: string,
  instanceUrl: string
): Promise<SalesforceUserIdentity> {
  const resp = await fetch(`${instanceUrl}/services/oauth2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "(no body)");
    throw new Error(
      `Salesforce userinfo request failed (HTTP ${resp.status}): ${text}`
    );
  }

  const data = await resp.json() as {
    user_id:          string;
    preferred_username: string;
    email:            string;
    name:             string;
    organization_id:  string;
  };

  return {
    userId:         data.user_id,
    username:       data.preferred_username,
    email:          data.email,
    displayName:    data.name,
    organizationId: data.organization_id,
  };
}
