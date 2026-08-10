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

/**
 * Returns the three configured Trail OS staff group emails at call time.
 *
 * Reads from ENV vars so a group-address change takes effect without a code
 * deploy.  Defaults match the historic hard-coded values so existing
 * installations continue to work without the vars set.
 *
 *   GOOGLE_GROUP_ADMIN    — trailosadmin@transitiontrails.org
 *   GOOGLE_GROUP_POWER    — trailospennyadmin@transitiontrails.org
 *   GOOGLE_GROUP_EVERYDAY — trailosusers@transitiontrails.org
 */
function getStaffGroups(): string[] {
  return [
    (process.env['GOOGLE_GROUP_ADMIN']    ?? 'trailosadmin@transitiontrails.org').toLowerCase().trim(),
    (process.env['GOOGLE_GROUP_POWER']    ?? 'trailospennyadmin@transitiontrails.org').toLowerCase().trim(),
    (process.env['GOOGLE_GROUP_EVERYDAY'] ?? 'trailosusers@transitiontrails.org').toLowerCase().trim(),
  ].filter(Boolean);
}

/**
 * Returns the dynamic list of all groups to probe for a given user.
 *
 * Includes the three configurable Trail OS staff groups (read from ENV vars)
 * PLUS any configured Homebase groups (GOOGLE_GROUP_COACHES, etc.).
 * Missing/empty ENV values are silently skipped — if a homebase group isn't
 * configured, its users simply don't gain an audience and are rejected as
 * having no groups during sign-in.
 */
function getGroupsToProbe(): string[] {
  const staffGroups = getStaffGroups();
  const homebaseGroups = [
    process.env['GOOGLE_GROUP_COACHES'],
    process.env['GOOGLE_GROUP_VOLUNTEERS'],
    process.env['GOOGLE_GROUP_LEARNERS'],
    process.env['GOOGLE_GROUP_TEAM'],
  ].filter((g): g is string => Boolean(g));

  // Deduplicate in case an ENV var was accidentally set to a staff group email
  const all = [...staffGroups, ...homebaseGroups];
  return [...new Set(all)];
}

/** @deprecated Use string — staff groups are now configurable via ENV vars. */
export type TrailOsGroup = string;

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
 *
 * Returns:
 *   true  — HTTP 200 (definitive member)
 *   false — HTTP 404 (definitive non-member)
 *   throws — any other status (429, 500, 503…) or network error (transient failure)
 *
 * Callers must NOT equate a thrown error with non-membership.  A transient
 * failure means "we don't know", not "they left the group".
 */
async function isMemberOf(
  groupEmail: string,
  userEmail:  string,
  accessToken: string,
): Promise<boolean> {
  const url = `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupEmail)}/members/${encodeURIComponent(userEmail)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 200) return true;
  if (res.status === 404) return false;
  // Transient failure (rate-limited, server error, etc.) — throw so the caller
  // can serve stale data instead of incorrectly treating the user as non-member.
  throw new Error(`Directory API transient error: HTTP ${res.status} for group ${groupEmail}`);
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
    if (hit) {
      // Serve the stale cached result so a temporary token-acquisition hiccup
      // doesn't incorrectly revoke the user's group membership.
      logger.warn({ email }, 'googleGroupsCache: serving stale groups (no access token)');
      return hit.groups;
    }
    // No stale data and no token — propagate so callers like /me can fall back
    // to session data rather than signing the user out.
    throw new Error('googleGroupsCache: no admin access token and no stale cache for ' + email);
  }

  try {
    const groupsToProbe = getGroupsToProbe();
    const checks = await Promise.all(
      groupsToProbe.map(async (g) => {
        const isMember = await isMemberOf(g, key, accessToken);
        // Normalize to lower-case so all callers (frontend includes() and
        // server-side comparisons) work consistently regardless of how the
        // env var was cased.
        return isMember ? g.toLowerCase() : null;
      }),
    );
    const groups: string[] = checks.filter((g) => g !== null) as string[];

    // Cache both member results AND empty results — non-membership should be cached too
    _cache.set(key, { groups, expires: now + TTL_MS });
    return groups;
  } catch (err) {
    logger.error({ email, err }, 'googleGroupsCache: lookup threw — result not cached');
    if (hit) {
      // Serve the stale cached result so a temporary API hiccup doesn't
      // incorrectly revoke the user's group membership.
      logger.warn({ email }, 'googleGroupsCache: serving stale groups after transient failure');
      return hit.groups;
    }
    // No stale data available — propagate so the caller can decide how to
    // handle the failure (e.g. /me serves from session rather than signing out).
    throw err;
  }
}
