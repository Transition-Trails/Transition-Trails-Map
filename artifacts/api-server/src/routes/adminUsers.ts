/**
 * adminUsers.ts
 *
 * Routes:
 *   GET /admin/users       — merged list of all Trail OS users
 *   GET /admin/audit-log   — paginated login audit log (filterable by actorEmail)
 *
 * Data sources merged by /admin/users:
 *   1. Salesforce Contacts (learners, coaches, volunteers) — via SF service token
 *   2. Google Groups members (staff) — via existing getGroupMembers pattern
 *   3. trail_os_audit_log — last-login timestamp per email
 *
 * Gated by requireAdmin (admin group or superadmin).
 */

import { Router } from 'express';
import { db } from '@workspace/db';
import { trailOsAuditLogTable } from '@workspace/db/schema';
import { eq, desc, and, gte, lt, max, min, inArray, asc, sql } from 'drizzle-orm';
import { logger } from '../lib/logger.js';
import { getAdminAccessToken } from '../lib/googleAdmin.js';
import { SF_API_VERSION } from '../lib/sfConstants.js';

const router = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserDirectoryEntry {
  email:       string;
  name:        string;
  role:        'Learner' | 'Coach' | 'Volunteer' | 'Staff';
  status:      'active' | 'inactive' | 'never';
  tier:        string | null;    // 'everyday' | 'power' | 'admin' | 'superadmin'
  coachLevel:  string | null;
  sfContactId: string | null;
  lastLoginAt: string | null;   // ISO timestamp
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the configured Trail OS staff + homebase groups to enumerate. */
function getAllGroupDescriptors() {
  return [
    {
      role: 'Staff' as const,
      tier: 'admin',
      email: (process.env['GOOGLE_GROUP_ADMIN']    ?? 'trailosadmin@transitiontrails.org').toLowerCase().trim(),
      label: 'Trail OS Admin',
    },
    {
      role: 'Staff' as const,
      tier: 'power',
      email: (process.env['GOOGLE_GROUP_POWER']    ?? 'trailospennyadmin@transitiontrails.org').toLowerCase().trim(),
      label: 'Trail OS Penny Admin',
    },
    {
      role: 'Staff' as const,
      tier: 'everyday',
      email: (process.env['GOOGLE_GROUP_EVERYDAY'] ?? 'trailosusers@transitiontrails.org').toLowerCase().trim(),
      label: 'Trail OS Users',
    },
    {
      role: 'Staff' as const,
      tier: 'everyday',
      email: (process.env['GOOGLE_GROUP_TEAM']     ?? '').toLowerCase().trim(),
      label: 'Trail OS Team',
    },
    {
      role: 'Coach' as const,
      tier: 'everyday',
      email: (process.env['GOOGLE_GROUP_COACHES']    ?? '').toLowerCase().trim(),
      label: 'Coaches',
    },
    {
      role: 'Volunteer' as const,
      tier: 'everyday',
      email: (process.env['GOOGLE_GROUP_VOLUNTEERS'] ?? '').toLowerCase().trim(),
      label: 'Volunteers',
    },
    {
      role: 'Learner' as const,
      tier: 'everyday',
      email: (process.env['GOOGLE_GROUP_LEARNERS']   ?? '').toLowerCase().trim(),
      label: 'Learners',
    },
  ].filter(g => g.email !== '');
}

/** Returns user role priority order (lower number = higher priority). */
function roleOrder(role: UserDirectoryEntry['role']): number {
  return { 'Staff': 0, 'Coach': 1, 'Volunteer': 2, 'Learner': 3 }[role];
}

/** Returns tier priority (for deriving display tier when in multiple staff groups). */
function tierOrder(tier: string): number {
  return { 'superadmin': 3, 'admin': 2, 'power': 1, 'everyday': 0 }[tier] ?? -1;
}

async function getGroupMembers(
  groupEmail: string,
  accessToken: string,
): Promise<Array<{ email: string; role: string }>> {
  try {
    const url = `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupEmail)}/members`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return [];
    const data = await res.json() as { members?: Array<{ email: string; role: string; type: string }> };
    return (data.members ?? []).filter(m => m.type === 'USER');
  } catch {
    return [];
  }
}

/** Derives a friendly display name from an email local-part. */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  return local
    .split(/[._-]/)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/** Compute login status from lastLoginAt date. */
function deriveStatus(lastLoginAt: string | null): UserDirectoryEntry['status'] {
  if (!lastLoginAt) return 'never';
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return new Date(lastLoginAt).getTime() > thirtyDaysAgo ? 'active' : 'inactive';
}

// ── SF contact fetch (role-typed contacts) ────────────────────────────────────

interface SfContactRecord {
  Id:          string;
  FirstName:   string | null;
  LastName:    string | null;
  Email:       string | null;
  RecordType?: { Name: string } | null;
  // Coach-specific fields
  Coach_Level__c?: string | null;
}

async function fetchSfContacts(): Promise<SfContactRecord[]> {
  const token       = process.env['SF_SERVICE_TOKEN'];
  const instanceUrl = process.env['SALESFORCE_INSTANCE_URL'];
  if (!token || !instanceUrl) {
    logger.warn('adminUsers: SF_SERVICE_TOKEN or SALESFORCE_INSTANCE_URL missing — skipping SF contact fetch');
    return [];
  }

  // Fetch Contacts that have an email, bringing in RecordType name and
  // coach-level field where populated. Limit 1000 to keep the response fast
  // for the current dataset size; paginate when needed in future.
  const soql = `
    SELECT Id, FirstName, LastName, Email, RecordType.Name, Coach_Level__c
    FROM Contact
    WHERE Email != null
    LIMIT 1000
  `.replace(/\s+/g, ' ').trim();

  try {
    const res = await fetch(
      `${instanceUrl}/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    );
    if (!res.ok) {
      logger.warn({ status: res.status }, 'adminUsers: SF contact query failed');
      return [];
    }
    const data = await res.json() as { records: SfContactRecord[]; totalSize: number };
    return data.records ?? [];
  } catch (err) {
    logger.error({ err }, 'adminUsers: SF contact fetch threw');
    return [];
  }
}

/** Map a Salesforce RecordType name to a Trail OS role. */
function sfRecordTypeToRole(recordTypeName: string | null | undefined): UserDirectoryEntry['role'] | null {
  if (!recordTypeName) return null;
  const n = recordTypeName.toLowerCase();
  if (n.includes('coach'))     return 'Coach';
  if (n.includes('volunteer')) return 'Volunteer';
  if (n.includes('learner') || n.includes('client') || n.includes('participant')) return 'Learner';
  return null;
}

// ── GET /admin/users ──────────────────────────────────────────────────────────

router.get('/admin/users', async (_req, res) => {
  try {
    // 1. Build last-login map from audit log (one query, grouped by actorEmail)
    const loginRows = await db
      .select({
        actorEmail:  trailOsAuditLogTable.actorEmail,
        lastLoginAt: max(trailOsAuditLogTable.createdAt),
      })
      .from(trailOsAuditLogTable)
      .where(eq(trailOsAuditLogTable.eventType, 'login'))
      .groupBy(trailOsAuditLogTable.actorEmail);

    const lastLoginMap = new Map<string, string>();
    for (const row of loginRows) {
      if (row.lastLoginAt) {
        lastLoginMap.set(row.actorEmail.toLowerCase(), row.lastLoginAt.toISOString());
      }
    }

    // 2. Fetch SF contacts
    const sfContacts = await fetchSfContacts();

    // 3. Fetch Google Groups members (staff + homebase groups)
    const accessToken = await getAdminAccessToken();
    const groupDescriptors = getAllGroupDescriptors();

    const superadminEmails = (process.env['TRAIL_OS_SUPERADMIN_EMAILS'] ?? '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    // Keyed by lower-cased email, holds the best data we have for this user
    const userMap = new Map<string, UserDirectoryEntry>();

    function upsertUser(
      email:       string,
      name:        string,
      role:        UserDirectoryEntry['role'],
      tier:        string,
      sfContactId: string | null,
      coachLevel:  string | null,
    ) {
      const key = email.toLowerCase();
      const lastLoginAt = lastLoginMap.get(key) ?? null;
      const existing = userMap.get(key);

      // Superadmin override — always 'superadmin' tier
      const effectiveTier = superadminEmails.includes(key) ? 'superadmin' : tier;

      if (!existing) {
        userMap.set(key, {
          email:       key,
          name,
          role,
          status:      deriveStatus(lastLoginAt),
          tier:        effectiveTier,
          coachLevel,
          sfContactId,
          lastLoginAt,
        });
        return;
      }

      // Merge: prefer higher-priority role, higher tier, fill in missing fields
      const useThisRole  = roleOrder(role) < roleOrder(existing.role);
      const useThisTier  = tierOrder(effectiveTier) > tierOrder(existing.tier ?? '');

      userMap.set(key, {
        ...existing,
        role:        useThisRole ? role        : existing.role,
        tier:        useThisTier ? effectiveTier : existing.tier,
        coachLevel:  coachLevel ?? existing.coachLevel,
        sfContactId: sfContactId ?? existing.sfContactId,
        name:        existing.name !== nameFromEmail(key) ? existing.name : name,
      });
    }

    // 3a. Populate from Google Groups
    if (accessToken) {
      const memberSets = await Promise.all(
        groupDescriptors.map(g => getGroupMembers(g.email, accessToken).then(m => ({ ...g, members: m }))),
      );
      for (const { role, tier, members } of memberSets) {
        for (const m of members) {
          upsertUser(m.email, nameFromEmail(m.email), role, tier, null, null);
        }
      }
    }

    // 3b. Populate superadmins who may not appear in any group
    for (const email of superadminEmails) {
      const existing = userMap.get(email);
      if (!existing) {
        upsertUser(email, nameFromEmail(email), 'Staff', 'superadmin', null, null);
      } else {
        userMap.set(email, { ...existing, tier: 'superadmin' });
      }
    }

    // 3c. Populate from Salesforce contacts
    for (const contact of sfContacts) {
      if (!contact.Email) continue;
      const email = contact.Email.toLowerCase();
      const name  = [contact.FirstName, contact.LastName].filter(Boolean).join(' ').trim() || nameFromEmail(email);
      const sfRole = sfRecordTypeToRole(contact.RecordType?.Name) ?? 'Learner';
      const coachLevel = contact.Coach_Level__c ?? null;
      upsertUser(email, name, sfRole, 'everyday', contact.Id, coachLevel);
    }

    // 4. Add any users who have logged in but appear in neither source
    for (const [email, lastLoginAt] of lastLoginMap) {
      if (!userMap.has(email)) {
        userMap.set(email, {
          email,
          name:        nameFromEmail(email),
          role:        'Learner',
          status:      deriveStatus(lastLoginAt),
          tier:        null,
          coachLevel:  null,
          sfContactId: null,
          lastLoginAt,
        });
      }
    }

    // 5. Sort: Staff first, then by name
    const users = [...userMap.values()].sort((a, b) => {
      const rd = roleOrder(a.role) - roleOrder(b.role);
      if (rd !== 0) return rd;
      return a.name.localeCompare(b.name);
    });

    res.json({ users, total: users.length, syncedAt: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, 'adminUsers GET /admin/users threw');
    res.status(500).json({ error: 'Failed to load user directory' });
  }
});

// ── GET /admin/audit-log ──────────────────────────────────────────────────────

router.get('/admin/audit-log', async (req, res) => {
  try {
    const actorEmail = typeof req.query.actorEmail === 'string' && req.query.actorEmail.trim()
      ? req.query.actorEmail.toLowerCase().trim()
      : null;

    const eventTypeFilter = typeof req.query.eventType === 'string' && req.query.eventType.trim()
      ? req.query.eventType.trim()
      : null;

    // dateFrom / dateTo allow arbitrary multi-day ranges (used by Failures + Feature Usage tabs).
    // Single-day `date` param is still supported for backward compat (defaults to [midnight, next midnight)).
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom.trim() : null;
    const dateTo   = typeof req.query.dateTo   === 'string' ? req.query.dateTo.trim()   : null;

    const dateParam = typeof req.query.date === 'string' ? req.query.date.trim() : null;
    let dayStart: Date | null = null;
    let dayEnd:   Date | null = null;

    if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      dayStart = new Date(`${dateFrom}T00:00:00.000Z`);
    } else if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      dayStart = new Date(`${dateParam}T00:00:00.000Z`);
    }

    if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      // dateTo is inclusive — extend to end of that day
      dayEnd = new Date(`${dateTo}T00:00:00.000Z`);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    } else if (dayStart && !dateFrom) {
      // Single-day: dayStart → next midnight
      dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    }

    const page   = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10));
    const limit  = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10)));
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [
      actorEmail      ? eq(trailOsAuditLogTable.actorEmail, actorEmail)        : null,
      eventTypeFilter ? eq(trailOsAuditLogTable.eventType,  eventTypeFilter)   : null,
      dayStart        ? gte(trailOsAuditLogTable.createdAt, dayStart)           : null,
      dayEnd          ? lt(trailOsAuditLogTable.createdAt,  dayEnd)             : null,
    ].filter(Boolean) as Parameters<typeof and>;

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(trailOsAuditLogTable)
        .where(where)
        .orderBy(desc(trailOsAuditLogTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(trailOsAuditLogTable)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    res.json({
      rows: rows.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    });
  } catch (err) {
    logger.error({ err }, 'adminUsers GET /admin/audit-log threw');
    res.status(500).json({ error: 'Failed to load audit log' });
  }
});

// ── Timezone-aware single-day window helper ───────────────────────────────────

/**
 * Returns true when `tz` is a valid IANA timezone identifier.
 * Uses Intl to validate without any extra libraries.
 */
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the first UTC millisecond whose local calendar date (formatted in
 * `tz`) equals `dateStr`.
 *
 * On normal days this equals local midnight. When DST springs forward
 * *through* midnight (e.g. America/Santiago: 00:00 CLT → 01:00 CLST,
 * skipping midnight entirely), this returns the first valid local instant of
 * the day instead (e.g. 01:00 CLST). Fall-back days (midnight repeated) return
 * the first occurrence of midnight.
 *
 * Algorithm — binary search over a ±15-hour window around UTC midnight:
 *   - ±15 h covers every IANA offset (range UTC-12 through UTC+14).
 *   - Finds the transition point where the local calendar date changes from
 *     dateStr-1 to dateStr — the exact start of the local day.
 *   - Converges to 1-second precision in ≤ 17 Intl.formatToParts calls.
 *   - Never oscillates: iterative approaches fail when DST springs forward
 *     exactly at midnight (the signed-distance function has no fixed point at
 *     or near the nonexistent midnight).
 *
 * Exported so it can be unit-tested without starting a server.
 */
export function localMidnightUtc(dateStr: string, tz: string): Date {
  const [ry, rm, rd] = dateStr.split('-').map(Number);
  const reqDateOnlyMs = Date.UTC(ry!, rm! - 1, rd!);

  // Formatter created once and reused across all binary-search iterations.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });

  /** Returns the local calendar date for a given UTC instant, as epoch ms. */
  function localDateMs(utcMs: number): number {
    const parts = fmt.formatToParts(new Date(utcMs));
    const get = (t: string): number =>
      parseInt(parts.find(p => p.type === t)?.value ?? '0', 10);
    return Date.UTC(get('year'), get('month') - 1, get('day'));
  }

  // Binary search for the first UTC second where localDate transitions from
  // dateStr-1 to dateStr.
  //
  // Invariant throughout:
  //   localDateMs(lo) < reqDateOnlyMs  (lo is still in the previous local day)
  //   localDateMs(hi) >= reqDateOnlyMs (hi is already in reqDate or later)
  //
  // Both invariants hold at initialisation for the full IANA offset range:
  //   lo = utcMidnight - 15h: even UTC+14 shows (reqDate - 1h) here, so prev day. ✓
  //   hi = utcMidnight + 15h: even UTC-12 shows (reqDate + 3h) here, so reqDate. ✓
  let lo = reqDateOnlyMs - 15 * 3_600_000;
  let hi = reqDateOnlyMs + 15 * 3_600_000;

  while (hi - lo > 1) { // 1-millisecond precision
    const mid = Math.trunc((lo + hi) / 2);
    if (localDateMs(mid) < reqDateOnlyMs) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return new Date(hi);
}

/**
 * Returns true when `dateStr` is a syntactically and calendrically valid
 * YYYY-MM-DD date.  Rejects values like "2026-02-30" that pass the format
 * regex but represent days that don't exist (JavaScript normalises them).
 */
function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const check = new Date(Date.UTC(y!, m! - 1, d!));
  return (
    check.getUTCFullYear() === y      &&
    check.getUTCMonth()    === m! - 1 &&
    check.getUTCDate()     === d
  );
}

/**
 * Returns the YYYY-MM-DD string for the calendar day that follows dateStr,
 * computed via UTC-noon arithmetic to avoid DST ambiguity.
 * The result is a plain date string (no timezone dependency) suitable for
 * passing back into localMidnightUtc.
 */
function nextCalendarDate(dateStr: string): string {
  // Parse as UTC noon — well away from any DST boundary — then advance one day.
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Compute the [dayStart, dayEnd) window for a single day, respecting the
 * caller's local timezone.
 *
 * dayEnd is the UTC instant of the *next* local midnight — not dayStart + 24h.
 * This means DST spring-forward days produce a 23-hour window and fall-back
 * days produce a 25-hour window, which is exactly right.
 *
 * Query params:
 *   date  YYYY-MM-DD  (defaults to "today" in the effective timezone)
 *   tz    IANA name   (defaults to UTC when absent or invalid)
 *
 * Exported for unit tests.
 */
export function parseSingleDayWindow(
  dateParam: string | null,
  tzParam:   string | null,
): { dayStart: Date; dayEnd: Date; effectiveTz: string; effectiveDate: string } {
  const effectiveTz = (tzParam && isValidTimezone(tzParam)) ? tzParam : 'UTC';

  // Resolve the effective date: use provided date, or today in the effective timezone.
  // isValidCalendarDate rejects impossible dates like "2026-02-30" that pass the
  // format regex but would be silently normalised by JavaScript's Date constructor.
  let effectiveDate: string;
  if (dateParam && isValidCalendarDate(dateParam)) {
    effectiveDate = dateParam;
  } else {
    // "Today" in the staff member's timezone
    effectiveDate = new Intl.DateTimeFormat('en-CA', { timeZone: effectiveTz }).format(new Date());
  }

  const dayStart = localMidnightUtc(effectiveDate, effectiveTz);
  // dayEnd = next local midnight, NOT dayStart + 24h.
  // On DST spring-forward the window is 23 h; on fall-back it is 25 h.
  const dayEnd   = localMidnightUtc(nextCalendarDate(effectiveDate), effectiveTz);
  return { dayStart, dayEnd, effectiveTz, effectiveDate };
}

// ── GET /admin/activity-summary ───────────────────────────────────────────────
//
// Returns per-user session data for a given date, respecting the caller's
// local timezone so that day boundaries match local midnight rather than UTC.
//
// Query params:
//   date  YYYY-MM-DD  (defaults to today in the effective timezone)
//   tz    IANA name   (e.g. America/Los_Angeles; defaults to UTC)
//
// Response: { summary: SessionEntry[]; date: string; tz: string }

router.get('/admin/activity-summary', async (req, res) => {
  try {
    const dateParam = typeof req.query.date === 'string' ? req.query.date.trim() : null;
    const tzParam   = typeof req.query.tz   === 'string' ? req.query.tz.trim()   : null;

    const { dayStart, dayEnd, effectiveTz, effectiveDate } =
      parseSingleDayWindow(dateParam, tzParam);

    const rows = await db
      .select()
      .from(trailOsAuditLogTable)
      .where(and(
        gte(trailOsAuditLogTable.createdAt, dayStart),
        lt(trailOsAuditLogTable.createdAt, dayEnd),
      ))
      .orderBy(asc(trailOsAuditLogTable.createdAt));

    // Group rows by actorEmail
    const byUser = new Map<string, {
      audience:    string | null;
      firstSeen:   Date;
      lastSeen:    Date;
      eventCount:  number;
      featureCounts: Map<string, number>;
    }>();

    for (const row of rows) {
      const key = row.actorEmail.toLowerCase();
      const feature =
        row.eventType === 'feature_use'
          ? ((row.metadata as Record<string, unknown> | null)?.feature as string | undefined) ?? null
          : null;

      const existing = byUser.get(key);
      if (!existing) {
        const featureCounts = new Map<string, number>();
        if (feature) featureCounts.set(feature, 1);
        byUser.set(key, {
          audience:   row.audience ?? null,
          firstSeen:  row.createdAt,
          lastSeen:   row.createdAt,
          eventCount: 1,
          featureCounts,
        });
      } else {
        if (row.createdAt > existing.lastSeen) existing.lastSeen = row.createdAt;
        existing.eventCount++;
        if (feature) {
          existing.featureCounts.set(feature, (existing.featureCounts.get(feature) ?? 0) + 1);
        }
        // Use the most-specific audience we've seen (non-null wins)
        if (!existing.audience && row.audience) existing.audience = row.audience;
      }
    }

    // Build response array
    const summary = [...byUser.entries()].map(([email, data]) => {
      const durationMs      = data.lastSeen.getTime() - data.firstSeen.getTime();
      const durationMinutes = Math.round(durationMs / 60_000);

      // Top 3 features by usage count
      const topFeatures = [...data.featureCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      return {
        email,
        audience:        data.audience,
        firstSeen:       data.firstSeen.toISOString(),
        lastSeen:        data.lastSeen.toISOString(),
        durationMinutes,
        eventCount:      data.eventCount,
        topFeatures,
      };
    });

    // Sort by firstSeen ascending
    summary.sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));

    res.json({ summary, date: effectiveDate, tz: effectiveTz });
  } catch (err) {
    logger.error({ err }, 'adminUsers GET /admin/activity-summary threw');
    res.status(500).json({ error: 'Failed to load activity summary' });
  }
});

// ── GET /admin/feature-usage-summary ─────────────────────────────────────────
//
// Server-side aggregation of feature_use events — no row-count cap.
// Returns counts grouped by feature name (and a separate user-breakdown list).
//
// Query params:
//   dateFrom  YYYY-MM-DD (default: 30 days ago, inclusive)
//   dateTo    YYYY-MM-DD (default: today, inclusive)

router.get('/admin/feature-usage-summary', async (req, res) => {
  try {
    const { dayStart, dayEnd } = parseDateRange(req);

    // Aggregate by feature — no LIMIT; all rows in range included
    const featureRows = await db
      .select({
        feature:     sql<string>`${trailOsAuditLogTable.metadata}->>'feature'`,
        totalUses:   sql<number>`cast(count(*) as int)`,
        uniqueUsers: sql<number>`cast(count(distinct ${trailOsAuditLogTable.actorEmail}) as int)`,
        firstUsed:   min(trailOsAuditLogTable.createdAt),
        lastUsed:    max(trailOsAuditLogTable.createdAt),
      })
      .from(trailOsAuditLogTable)
      .where(and(
        eq(trailOsAuditLogTable.eventType, 'feature_use'),
        gte(trailOsAuditLogTable.createdAt, dayStart),
        lt(trailOsAuditLogTable.createdAt, dayEnd),
        sql`${trailOsAuditLogTable.metadata}->>'feature' is not null`,
        sql`${trailOsAuditLogTable.metadata}->>'feature' != ''`,
      ))
      .groupBy(sql`${trailOsAuditLogTable.metadata}->>'feature'`)
      .orderBy(sql`count(*) desc`);

    // Per-user breakdown (for the "by user" toggle)
    const userRows = await db
      .select({
        email:        trailOsAuditLogTable.actorEmail,
        totalUses:    sql<number>`cast(count(*) as int)`,
        featureCount: sql<number>`cast(count(distinct ${trailOsAuditLogTable.metadata}->>'feature') as int)`,
      })
      .from(trailOsAuditLogTable)
      .where(and(
        eq(trailOsAuditLogTable.eventType, 'feature_use'),
        gte(trailOsAuditLogTable.createdAt, dayStart),
        lt(trailOsAuditLogTable.createdAt, dayEnd),
      ))
      .groupBy(trailOsAuditLogTable.actorEmail)
      .orderBy(sql`count(*) desc`);

    res.json({
      features: featureRows.map(r => ({
        feature:     r.feature,
        totalUses:   r.totalUses,
        uniqueUsers: r.uniqueUsers,
        firstUsed:   r.firstUsed?.toISOString() ?? null,
        lastUsed:    r.lastUsed?.toISOString()  ?? null,
      })),
      userBreakdown: userRows.map(r => ({
        email:        r.email,
        totalUses:    r.totalUses,
        featureCount: r.featureCount,
      })),
      dateFrom: dayStart.toISOString().slice(0, 10),
      dateTo:   new Date(dayEnd.getTime() - 1).toISOString().slice(0, 10),
    });
  } catch (err) {
    logger.error({ err }, 'adminUsers GET /admin/feature-usage-summary threw');
    res.status(500).json({ error: 'Failed to load feature usage summary' });
  }
});

// ── GET /admin/failure-summary ────────────────────────────────────────────────
//
// Server-side aggregation of error events — no row-count cap.
// Returns failures grouped by (route, status, truncated message).
//
// Query params:
//   dateFrom    YYYY-MM-DD (default: 7 days ago, inclusive)
//   dateTo      YYYY-MM-DD (default: today, inclusive)
//   routePrefix (optional) — only include rows where route starts with this
//   actorEmail  (optional) — only include rows for this email

router.get('/admin/failure-summary', async (req, res) => {
  try {
    const { dayStart, dayEnd } = parseDateRange(req, 7);

    const actorEmailFilter = typeof req.query.actorEmail === 'string' && req.query.actorEmail.trim()
      ? req.query.actorEmail.toLowerCase().trim()
      : null;
    const routePrefix = typeof req.query.routePrefix === 'string' && req.query.routePrefix.trim()
      ? req.query.routePrefix.trim()
      : null;

    const conditions = [
      eq(trailOsAuditLogTable.eventType, 'error'),
      gte(trailOsAuditLogTable.createdAt, dayStart),
      lt(trailOsAuditLogTable.createdAt, dayEnd),
      actorEmailFilter ? eq(trailOsAuditLogTable.actorEmail, actorEmailFilter) : null,
      routePrefix
        ? sql`${trailOsAuditLogTable.metadata}->>'route' ilike ${routePrefix + '%'}`
        : null,
    ].filter(Boolean) as Parameters<typeof and>;

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Run the grouped failure query AND the global distinct-user count in parallel.
    // The distinct count must be computed over the full filtered set independently —
    // summing per-group affectedUsers would double-count a user who appears in
    // multiple route/status/message groups.
    const [failureRows, distinctResult] = await Promise.all([
      db
        .select({
          route:         sql<string>`coalesce(${trailOsAuditLogTable.metadata}->>'route', '')`,
          status:        sql<number>`coalesce((${trailOsAuditLogTable.metadata}->>'status')::int, 500)`,
          message:       sql<string>`coalesce(left(${trailOsAuditLogTable.metadata}->>'message', 120), '')`,
          count:         sql<number>`cast(count(*) as int)`,
          affectedUsers: sql<number>`cast(count(distinct ${trailOsAuditLogTable.actorEmail}) as int)`,
          firstAt:       min(trailOsAuditLogTable.createdAt),
          lastAt:        max(trailOsAuditLogTable.createdAt),
        })
        .from(trailOsAuditLogTable)
        .where(where)
        .groupBy(
          sql`coalesce(${trailOsAuditLogTable.metadata}->>'route', '')`,
          sql`coalesce((${trailOsAuditLogTable.metadata}->>'status')::int, 500)`,
          sql`coalesce(left(${trailOsAuditLogTable.metadata}->>'message', 120), '')`,
        )
        .orderBy(sql`count(*) desc`),
      // Separate query: count distinct users across ALL error events in range,
      // not per group — prevents double-counting users with errors on multiple routes.
      db
        .select({ count: sql<number>`cast(count(distinct ${trailOsAuditLogTable.actorEmail}) as int)` })
        .from(trailOsAuditLogTable)
        .where(where),
    ]);

    // Compute top-level stats using the independently-queried distinct user count
    const totalErrors   = failureRows.reduce((s, r) => s + r.count, 0);
    const topRoute      = failureRows[0]?.route ?? '—';
    const trueAffectedUsers = distinctResult[0]?.count ?? 0;

    res.json({
      failures: failureRows.map(r => ({
        route:         r.route,
        status:        r.status,
        message:       r.message,
        count:         r.count,
        affectedUsers: r.affectedUsers,
        firstAt:       r.firstAt?.toISOString() ?? null,
        lastAt:        r.lastAt?.toISOString()  ?? null,
      })),
      stats: {
        totalErrors,
        topRoute,
        affectedUsers: trueAffectedUsers,
      },
      dateFrom: dayStart.toISOString().slice(0, 10),
      dateTo:   new Date(dayEnd.getTime() - 1).toISOString().slice(0, 10),
    });
  } catch (err) {
    logger.error({ err }, 'adminUsers GET /admin/failure-summary threw');
    res.status(500).json({ error: 'Failed to load failure summary' });
  }
});

// ── Shared date-range helper (exported for unit tests) ───────────────────────

export function parseDateRange(
  req: import('express').Request,
  defaultDaysBack = 30,
): { dayStart: Date; dayEnd: Date } {
  const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom.trim() : null;
  const dateTo   = typeof req.query.dateTo   === 'string' ? req.query.dateTo.trim()   : null;

  const now = new Date();

  let dayStart: Date;
  if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
    dayStart = new Date(`${dateFrom}T00:00:00.000Z`);
  } else {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - defaultDaysBack);
    dayStart = d;
  }

  let dayEnd: Date;
  if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    const d = new Date(`${dateTo}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 1); // inclusive: extend to end of day
    dayEnd = d;
  } else {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + 1); // today inclusive
    dayEnd = d;
  }

  return { dayStart, dayEnd };
}

export default router;
