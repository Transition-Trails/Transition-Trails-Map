import { randomBytes, createHash } from "crypto";

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

export function buildAuthorizationUrl(codeChallenge: string, state: string): string {
  const instanceUrl  = requireEnv("SALESFORCE_INSTANCE_URL");
  const clientId     = requireEnv("SALESFORCE_CLIENT_ID");
  const redirectUri  = requireEnv("SALESFORCE_CALLBACK_URL");

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
  codeVerifier: string
): Promise<SalesforceTokenResponse> {
  const instanceUrl  = requireEnv("SALESFORCE_INSTANCE_URL");
  const clientId     = requireEnv("SALESFORCE_CLIENT_ID");
  const clientSecret = requireEnv("SALESFORCE_CLIENT_SECRET");
  const redirectUri  = requireEnv("SALESFORCE_CALLBACK_URL");

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
