import { createSign } from 'node:crypto';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ServiceAccountKey {
  type: string;
  project_id?: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
}

interface CachedToken {
  token: string;
  expiresAt: number; // ms epoch
}

// ── Module-level token caches ──────────────────────────────────────────────────

let _cache:      CachedToken | null = null; // group.member scope
let _userCache:  CachedToken | null = null; // user.readonly scope

// ── Service Account JWT ────────────────────────────────────────────────────────

function parseServiceAccountKey(): ServiceAccountKey | null {
  const raw = process.env.GOOGLE_ADMIN_CREDENTIALS;
  if (!raw) return null;
  try {
    const key = JSON.parse(raw) as ServiceAccountKey;
    if (key.type !== 'service_account' || !key.private_key || !key.client_email) return null;
    return key;
  } catch {
    return null;
  }
}

function createJWT(key: ServiceAccountKey, impersonate: string, scope: string): string {
  const now = Math.floor(Date.now() / 1000);

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss:   key.client_email,
    sub:   impersonate,
    scope,
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  })).toString('base64url');

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const sig = signer.sign(key.private_key, 'base64url');

  return `${header}.${payload}.${sig}`;
}

async function exchangeJWTForToken(jwt: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion:  jwt,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

// ── Refresh token fallback (legacy) ───────────────────────────────────────────

async function tokenFromRefreshToken(): Promise<string | null> {
  const rt = process.env.GOOGLE_DIRECTORY_REFRESH_TOKEN;
  if (!rt) return null;
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID     ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        refresh_token: rt,
        grant_type:    'refresh_token',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns an access token for the Google Admin Directory API.
 *
 * Priority:
 *   1. Service account JWT (GOOGLE_ADMIN_CREDENTIALS + GOOGLE_ADMIN_IMPERSONATE_EMAIL)
 *   2. OAuth refresh token fallback (GOOGLE_DIRECTORY_REFRESH_TOKEN) — legacy
 *
 * Tokens are cached in memory for 50 minutes to avoid repeated JWT exchanges.
 */
async function getTokenWithScope(
  scope: string,
  cache: CachedToken | null,
  setCache: (c: CachedToken) => void,
): Promise<string | null> {
  if (cache && Date.now() < cache.expiresAt - 60_000) return cache.token;

  const key = parseServiceAccountKey();
  const impersonate = process.env.GOOGLE_ADMIN_IMPERSONATE_EMAIL?.trim();

  if (key && impersonate) {
    try {
      const jwt   = createJWT(key, impersonate, scope);
      const token = await exchangeJWTForToken(jwt);
      if (token) {
        setCache({ token, expiresAt: Date.now() + 50 * 60_000 });
        return token;
      }
    } catch { /* fall through */ }
  }

  // group-member scope falls back to refresh token; user scope does not
  if (scope.includes('group')) {
    const fallback = await tokenFromRefreshToken();
    if (fallback) {
      setCache({ token: fallback, expiresAt: Date.now() + 55 * 60_000 });
      return fallback;
    }
  }

  return null;
}

export async function getAdminAccessToken(): Promise<string | null> {
  return getTokenWithScope(
    'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
    _cache,
    c => { _cache = c; },
  );
}

/** Token scoped for reading user profiles (admin.directory.user.readonly).
 *  Requires this scope to be added to DWD in Google Workspace Admin.
 *  Returns null if not authorized — callers should degrade gracefully. */
export async function getAdminUserAccessToken(): Promise<string | null> {
  return getTokenWithScope(
    'https://www.googleapis.com/auth/admin.directory.user.readonly',
    _userCache,
    c => { _userCache = c; },
  );
}

export type AdminDirectoryMethod = 'service-account' | 'refresh-token' | 'none';

export interface AdminDirectoryStatus {
  configured: boolean;
  method: AdminDirectoryMethod;
  serviceAccountEmail?: string;
}

/**
 * Reports which auth method is available — does NOT make a live API call.
 * Use for status endpoints and health checks.
 */
export function getAdminDirectoryStatus(): AdminDirectoryStatus {
  const key = parseServiceAccountKey();
  const impersonate = process.env.GOOGLE_ADMIN_IMPERSONATE_EMAIL?.trim();

  if (key && impersonate) {
    return { configured: true, method: 'service-account', serviceAccountEmail: key.client_email };
  }
  if (process.env.GOOGLE_DIRECTORY_REFRESH_TOKEN) {
    return { configured: true, method: 'refresh-token' };
  }
  return { configured: false, method: 'none' };
}
