/**
 * Server-side cache for a Salesforce service token.
 *
 * Populated the first time any admin user completes the SF OAuth flow, and
 * refreshed whenever a session-based token refresh succeeds. Used by withClient()
 * in pennyData.ts as a fallback when a request carries no session-based SF token
 * (e.g. a Clerk-authed admin who hasn't personally gone through SF OAuth).
 *
 * Lives in process memory — resets on server restart. That is intentional:
 * the cache is re-populated on the next SF OAuth login.
 */

interface CachedSfToken {
  accessToken:  string;
  refreshToken: string;
  instanceUrl:  string;
}

let _cached: CachedSfToken | null = null;

export function setCachedSfToken(token: CachedSfToken): void {
  _cached = { ...token };
}

export function getCachedSfToken(): CachedSfToken | null {
  return _cached;
}
