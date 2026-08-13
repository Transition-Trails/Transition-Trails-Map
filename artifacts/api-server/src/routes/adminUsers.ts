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
import { eq, desc, and, gte, lt, max, inArray, sql } from 'drizzle-orm';
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

    // date param: YYYY-MM-DD → inclusive day range [midnight, next midnight)
    const dateParam = typeof req.query.date === 'string' ? req.query.date.trim() : null;
    let dayStart: Date | null = null;
    let dayEnd:   Date | null = null;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      dayStart = new Date(`${dateParam}T00:00:00.000Z`);
      dayEnd   = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    }

    const page   = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10)));
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [
      actorEmail ? eq(trailOsAuditLogTable.actorEmail, actorEmail) : null,
      dayStart   ? gte(trailOsAuditLogTable.createdAt, dayStart)   : null,
      dayEnd     ? lt(trailOsAuditLogTable.createdAt,  dayEnd)     : null,
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

export default router;
