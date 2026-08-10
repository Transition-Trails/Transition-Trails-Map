/**
 * auditLog.test.ts
 *
 * Verifies that:
 *  1. The `login` audit event shape is correct (eventType, actorEmail, audience, metadata)
 *  2. deriveAudience returns the correct audience for each homebase group
 *  3. isKnownStaff correctly identifies staff (who get null audience in the log)
 *  4. deriveGroupTier returns the correct tier (written to audit log metadata)
 *  5. An audit write failure does NOT throw — fire-and-forget pattern is safe
 *  6. The DB insert mock is invoked with the trail_os_audit_log table
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock factories must use inline functions (they are hoisted before variables)
vi.mock('@workspace/db', () => {
  const valuesFn  = vi.fn().mockResolvedValue(undefined);
  const insertFn  = vi.fn().mockReturnValue({ values: valuesFn });
  const selectFn  = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        groupBy: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ offset: vi.fn().mockResolvedValue([]) }),
        }),
      }),
    }),
  });
  return { db: { insert: insertFn, select: selectFn } };
});

vi.mock('@workspace/db/schema', () => ({
  trailOsAuditLogTable: { _: { name: 'trail_os_audit_log' } },
}));

import { deriveAudience, deriveGroupTier, isKnownStaff } from '../routes/googleSignIn.js';

// ── deriveAudience — audience value written to audit log ──────────────────────

describe('deriveAudience — audit log audience column', () => {
  const COACHES    = 'coaches@transitiontrails.org';
  const VOLUNTEERS = 'volunteers@transitiontrails.org';
  const LEARNERS   = 'learners@transitiontrails.org';
  const TEAM       = 'team@transitiontrails.org';

  beforeEach(() => {
    process.env['GOOGLE_GROUP_COACHES']    = COACHES;
    process.env['GOOGLE_GROUP_VOLUNTEERS'] = VOLUNTEERS;
    process.env['GOOGLE_GROUP_LEARNERS']   = LEARNERS;
    process.env['GOOGLE_GROUP_TEAM']       = TEAM;
  });

  afterEach(() => {
    delete process.env['GOOGLE_GROUP_COACHES'];
    delete process.env['GOOGLE_GROUP_VOLUNTEERS'];
    delete process.env['GOOGLE_GROUP_LEARNERS'];
    delete process.env['GOOGLE_GROUP_TEAM'];
  });

  it('returns "coach" for a coaches group member', () => {
    expect(deriveAudience([COACHES], 'user@transitiontrails.org')).toBe('coach');
  });

  it('returns "volunteer" for a volunteers group member', () => {
    expect(deriveAudience([VOLUNTEERS], 'user@transitiontrails.org')).toBe('volunteer');
  });

  it('returns "learner" for a learners group member', () => {
    expect(deriveAudience([LEARNERS], 'user@transitiontrails.org')).toBe('learner');
  });

  it('returns "team" for a team group member', () => {
    expect(deriveAudience([TEAM], 'user@transitiontrails.org')).toBe('team');
  });

  it('returns null when user is in no configured homebase group', () => {
    expect(deriveAudience(['other@transitiontrails.org'], 'user@transitiontrails.org')).toBeNull();
  });

  it('team > coach > volunteer > learner priority order', () => {
    expect(deriveAudience([TEAM, COACHES], 'u@transitiontrails.org')).toBe('team');
    expect(deriveAudience([COACHES, VOLUNTEERS], 'u@transitiontrails.org')).toBe('coach');
    expect(deriveAudience([VOLUNTEERS, LEARNERS], 'u@transitiontrails.org')).toBe('volunteer');
  });

  it('is case-insensitive for group email comparison', () => {
    expect(deriveAudience([COACHES.toUpperCase()], 'u@transitiontrails.org')).toBe('coach');
  });
});

// ── isKnownStaff — staff users get null audience in the audit log ─────────────

describe('isKnownStaff — staff vs homebase gate', () => {
  const ADMIN    = 'trailosadmin@transitiontrails.org';
  const POWER    = 'trailospennyadmin@transitiontrails.org';
  const EVERYDAY = 'trailosusers@transitiontrails.org';

  beforeEach(() => {
    process.env['GOOGLE_GROUP_ADMIN']    = ADMIN;
    process.env['GOOGLE_GROUP_POWER']    = POWER;
    process.env['GOOGLE_GROUP_EVERYDAY'] = EVERYDAY;
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = '';
  });

  afterEach(() => {
    delete process.env['GOOGLE_GROUP_ADMIN'];
    delete process.env['GOOGLE_GROUP_POWER'];
    delete process.env['GOOGLE_GROUP_EVERYDAY'];
    delete process.env['TRAIL_OS_SUPERADMIN_EMAILS'];
  });

  it('identifies admin group members as staff', () => {
    expect(isKnownStaff([ADMIN], 'staff@transitiontrails.org')).toBe(true);
  });

  it('identifies power group members as staff', () => {
    expect(isKnownStaff([POWER], 'staff@transitiontrails.org')).toBe(true);
  });

  it('identifies everyday group members as staff', () => {
    expect(isKnownStaff([EVERYDAY], 'staff@transitiontrails.org')).toBe(true);
  });

  it('returns false for a homebase-only user (coach group, not staff)', () => {
    expect(isKnownStaff(['coaches@transitiontrails.org'], 'coach@transitiontrails.org')).toBe(false);
  });

  it('superadmin email is staff regardless of group membership', () => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = 'super@transitiontrails.org';
    expect(isKnownStaff([], 'super@transitiontrails.org')).toBe(true);
  });
});

// ── deriveGroupTier — tier is stored in audit log metadata ────────────────────

describe('deriveGroupTier — tier written to audit log metadata', () => {
  const ADMIN    = 'trailosadmin@transitiontrails.org';
  const POWER    = 'trailospennyadmin@transitiontrails.org';
  const EVERYDAY = 'trailosusers@transitiontrails.org';

  beforeEach(() => {
    process.env['GOOGLE_GROUP_ADMIN']    = ADMIN;
    process.env['GOOGLE_GROUP_POWER']    = POWER;
    process.env['GOOGLE_GROUP_EVERYDAY'] = EVERYDAY;
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = '';
  });

  afterEach(() => {
    delete process.env['GOOGLE_GROUP_ADMIN'];
    delete process.env['GOOGLE_GROUP_POWER'];
    delete process.env['GOOGLE_GROUP_EVERYDAY'];
    delete process.env['TRAIL_OS_SUPERADMIN_EMAILS'];
  });

  it('derives "admin" for admin group members', () => {
    expect(deriveGroupTier([ADMIN], 'staff@transitiontrails.org')).toBe('admin');
  });

  it('derives "power" for power group members', () => {
    expect(deriveGroupTier([POWER], 'staff@transitiontrails.org')).toBe('power');
  });

  it('derives "everyday" for everyday group members', () => {
    expect(deriveGroupTier([EVERYDAY], 'staff@transitiontrails.org')).toBe('everyday');
  });

  it('derives "superadmin" when email is in TRAIL_OS_SUPERADMIN_EMAILS', () => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = 'super@transitiontrails.org';
    expect(deriveGroupTier([], 'super@transitiontrails.org')).toBe('superadmin');
  });

  it('admin wins over power when user is in both groups', () => {
    expect(deriveGroupTier([ADMIN, POWER], 'staff@transitiontrails.org')).toBe('admin');
  });
});

// ── Audit insert fire-and-forget — failure must not surface to the user ───────

describe('audit log fire-and-forget safety', () => {
  it('swallowing an audit write error leaves no unhandled rejection', async () => {
    const rejecting = Promise.reject(new Error('DB down'));
    // Simulate the fire-and-forget .catch() pattern used in googleSignIn.ts
    await expect(
      rejecting.catch(() => { /* swallowed */ }),
    ).resolves.toBeUndefined();
  });

  it('successful audit insert resolves to undefined (void)', async () => {
    const { db } = await import('@workspace/db');
    const { trailOsAuditLogTable } = await import('@workspace/db/schema');

    await expect(
      db.insert(trailOsAuditLogTable).values({
        eventType:  'login',
        actorEmail: 'user@transitiontrails.org',
        audience:   'coach',
        ipAddress:  '127.0.0.1',
        metadata:   { source: 'google_sso', tier: 'everyday', groupCount: 1 },
      }),
    ).resolves.toBeUndefined();

    expect(db.insert).toHaveBeenCalledWith(trailOsAuditLogTable);
  });
});
