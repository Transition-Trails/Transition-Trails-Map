/**
 * googleGroupsCache.ts
 *
 * Per-email cache of Trail OS Google Group membership.
 *
 * Design:
 *  - Cache both positive (member of ≥1 group) and null (member of 0 groups)
 *    results for TTL_MS (5 minutes) so rapid sign-ins don't hammer the Directory API.
 *  - Do NOT cache lookup failures (no token / network error) so the next request retries.
 *  - Uses GET /members/{memberKey} — one request per group per user — which requires
 *    only the admin.directory.group.member.readonly scope already present on the DWD SA.
 */

import { getAdminAccessToken } from './googleAdmin';
import { logger } from './logger';

// ── Trail OS group emails — single source of truth for the server ─────────────
export const TRAIL_OS_GROUPS = [
  'trailosadmin@transitiontrails.org',
  'trailospennyadmin@transitiontrails.org',
  'trailosusers@transitiontrails.org',
] as const satisfies readonly string[];

export type TrailOsGroup = (typeof TRAIL_OS_GROUPS)[number];

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  /** The Trail OS groups the user belongs to (may be empty — that IS a valid cached result). */
  groups:  string[];
  expires: number;
}

const _cache = new Map<string, CacheEntry>();

/** Clear the in-memory cache. Used in tests. */
export function clearGroupsCache(): void {
  _cache.clear();
}

/**
 * Check whether a specific email is a direct member of a group.
 * Returns true on HTTP 200, false on 404 or any error.
 */
async function isMemberOf(
  groupEmail: string,
  userEmail:  string,
  accessToken: string,
): Promise<boolean> {
  try {
    const url = `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupEmail)}/members/${encodeURIComponent(userEmail)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Return the set of Trail OS groups the given email belongs to.
 *
 * Cache policy
 *  - Hit (in cache, not expired)   → return cached value immediately
 *  - Miss / expired                → fetch from Directory API, cache result
 *  - Failure (no token or throw)   → return stale value if available; do NOT update cache
 */
export async function getGroupsForUser(email: string): Promise<string[]> {
  const key = email.toLowerCase();
  const now = Date.now();

  const hit = _cache.get(key);
  if (hit && hit.expires > now) {
    return hit.groups;
  }

  const accessToken = await getAdminAccessToken();
  if (!accessToken) {
    logger.warn({ email }, 'googleGroupsCache: no admin access token — lookup skipped, result not cached');
    // Return stale data if we have it, otherwise empty (caller decides what to do)
    return hit?.groups ?? [];
  }

  try {
    const checks = await Promise.all(
      TRAIL_OS_GROUPS.map(async (g) => {
        const isMember = await isMemberOf(g, key, accessToken);
        return isMember ? (g as string) : null;
      }),
    );
    const groups: string[] = checks.filter((g) => g !== null) as string[];

    // Cache both member results AND empty results — non-membership should be cached too
    _cache.set(key, { groups, expires: now + TTL_MS });
    return groups;
  } catch (err) {
    logger.error({ email, err }, 'googleGroupsCache: lookup threw — result not cached');
    return hit?.groups ?? [];
  }
}
