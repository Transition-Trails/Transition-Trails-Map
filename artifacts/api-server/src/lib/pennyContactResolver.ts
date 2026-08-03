/**
 * pennyContactResolver.ts
 *
 * Resolves the Salesforce Contact ID to associate with a Penny exchange.
 *
 * Priority order:
 *   1. Learner Contact already resolved (passed in as subjectContactId)
 *      — this is the normal learner path; returned immediately, no SF call.
 *   2. Staff user's own Contact, looked up by their Salesforce session email
 *      — ensures internal staff exchanges reach Salesforce and the memory
 *        window works across sessions.
 *   3. null — no Contact found; the exchange proceeds but is not logged to
 *      Salesforce.  A warning names the email so the missing Contact is easy
 *      to diagnose.
 *
 * Cache:
 *   Results (including null) are cached in-process for CACHE_TTL_MS.
 *   A null result is also cached so repeated misses from the same email do
 *   not flood Salesforce with the same failed lookup on every exchange.
 *   A query _failure_ (network error, SF unavailable) is NOT cached — the
 *   next request will retry.
 */

import type { ISalesforceClient } from "./salesforceClient.js";
import { logger } from "./logger.js";

// ── Cache ─────────────────────────────────────────────────────────────────────

/** How long to keep a resolved (or confirmed-missing) Contact ID in memory. */
export const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry {
  contactId:  string | null;
  resolvedAt: number;
}

// Module-level cache — shared across all requests, reset on server restart.
// Exported only for tests; production code uses resolveContactByEmail.
export const _contactCache = new Map<string, CacheEntry>();

// ── Core lookup ───────────────────────────────────────────────────────────────

/**
 * Look up a Contact ID by email address.
 *
 * Returns the Contact's Id string on a hit, null if no Contact matches.
 * On query failure (SF unavailable, token error, etc.) logs a warning and
 * returns null WITHOUT caching so the next request retries.
 */
export async function resolveContactByEmail(
  client: ISalesforceClient,
  email: string
): Promise<string | null> {
  const now = Date.now();
  const cached = _contactCache.get(email);
  if (cached !== undefined && now - cached.resolvedAt < CACHE_TTL_MS) {
    return cached.contactId;
  }

  try {
    // Escape single quotes in the email for SOQL safety (defensive — session
    // emails come from the SF identity endpoint and are unlikely to contain
    // special chars, but correctness matters more than convenience).
    const safeEmail = email.replace(/'/g, "\\'");
    const result = await client.query<{ Id: string }>(
      `SELECT Id FROM Contact WHERE Email = '${safeEmail}' LIMIT 1`
    );
    const contactId = result.records[0]?.Id ?? null;

    // Cache both hits and misses — a confirmed-missing email should not be
    // re-queried on every exchange.
    _contactCache.set(email, { contactId, resolvedAt: now });

    if (!contactId) {
      logger.warn(
        { email },
        `Penny contact resolution: no Contact found for email '${email}'. ` +
        'Exchange will proceed but cannot be logged to Salesforce until a ' +
        'Contact record exists for this email address.'
      );
    }

    return contactId;
  } catch (err) {
    // Query failed — do NOT cache; allow retry on the next request.
    logger.warn(
      { err, email },
      'Penny contact resolution: Contact lookup by email failed — will retry on next exchange'
    );
    return null;
  }
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Determine the subject Contact ID for a Penny exchange.
 *
 * - If `subjectContactId` is already set (learner path), it is returned
 *   immediately and the SF client is not called.
 * - If `subjectContactId` is null, attempts to resolve the staff user's own
 *   Contact by `userEmail`.
 * - Returns null if neither is available or if no Contact matches.
 *
 * @param client           Non-null Salesforce client
 * @param subjectContactId Learner Contact ID if already resolved, else null
 * @param userEmail        Authenticated user's email from the SF session
 */
export async function resolveExchangeContact(
  client: ISalesforceClient,
  subjectContactId: string | null,
  userEmail: string | null | undefined
): Promise<string | null> {
  // Learner Contact takes priority — no SF call needed.
  if (subjectContactId) return subjectContactId;

  // No learner Contact — try the staff user's own Contact.
  if (!userEmail?.trim()) return null;

  return resolveContactByEmail(client, userEmail.trim());
}

// ── Test helper ───────────────────────────────────────────────────────────────

/** Clears the in-process cache.  Call in test afterEach/beforeEach only. */
export function clearContactCache(): void {
  _contactCache.clear();
}
