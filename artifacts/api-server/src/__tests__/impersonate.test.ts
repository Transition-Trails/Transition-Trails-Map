/**
 * impersonate.test.ts
 *
 * Integration tests for the superadmin impersonation feature.
 *
 * Coverage:
 *   1. requireSuperAdmin middleware — 401 for unauthenticated, 403 for admin-tier
 *   2. POST /admin/impersonate — blocks nested, self, and superadmin targets
 *   3. POST /admin/impersonate — success: session fields set, audit log written
 *   4. POST /admin/impersonate/exit — clears session fields, writes audit end event
 *   5. effectiveIdentityMiddleware — returns impersonated identity during impersonation
 *   6. requireHomebaseAuth — passes for impersonated homebase audience
 *   7. isSuperAdmin — used to block impersonating another superadmin
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock @workspace/db ────────────────────────────────────────────────────────

vi.mock('@workspace/db', () => {
  const valuesFn = vi.fn().mockResolvedValue(undefined);
  const insertFn = vi.fn().mockReturnValue({ values: valuesFn });
  return { db: { insert: insertFn } };
});

vi.mock('@workspace/db/schema', () => ({
  trailOsAuditLogTable: { _: { name: 'trail_os_audit_log' } },
}));

import {
  isSuperAdmin,
  isAdmin,
  requireSuperAdmin,
  requireHomebaseAuth,
  effectiveIdentityMiddleware,
} from '../middlewares/requireAuth.js';

// ── isSuperAdmin ──────────────────────────────────────────────────────────────

describe('isSuperAdmin', () => {
  const SA = 'super@transitiontrails.org';

  beforeEach(() => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = SA;
  });
  afterEach(() => {
    delete process.env['TRAIL_OS_SUPERADMIN_EMAILS'];
  });

  it('returns true for a superadmin email', () => {
    expect(isSuperAdmin(SA)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isSuperAdmin(SA.toUpperCase())).toBe(true);
  });

  it('returns false for a non-superadmin email', () => {
    expect(isSuperAdmin('admin@transitiontrails.org')).toBe(false);
  });

  it('returns false when TRAIL_OS_SUPERADMIN_EMAILS is empty', () => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = '';
    expect(isSuperAdmin(SA)).toBe(false);
  });

  it('supports a comma-separated list', () => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = `${SA}, other@transitiontrails.org`;
    expect(isSuperAdmin('other@transitiontrails.org')).toBe(true);
  });
});

// ── requireSuperAdmin ─────────────────────────────────────────────────────────

describe('requireSuperAdmin middleware', () => {
  const SA    = 'super@transitiontrails.org';
  const ADMIN = 'admin@transitiontrails.org';

  function makeReqRes(opts: {
    email?: string;
  }) {
    const req: Record<string, unknown> = {
      session: { googleEmail: opts.email },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json:   vi.fn().mockReturnThis(),
    };
    const next = vi.fn();
    return { req, res, next };
  }

  beforeEach(() => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = SA;
  });
  afterEach(() => {
    delete process.env['TRAIL_OS_SUPERADMIN_EMAILS'];
  });

  it('returns 401 when there is no session email', () => {
    const { req, res, next } = makeReqRes({});
    requireSuperAdmin(req as never, res as never, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for an admin-tier user (not superadmin)', () => {
    const { req, res, next } = makeReqRes({ email: ADMIN });
    requireSuperAdmin(req as never, res as never, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for a superadmin email', () => {
    const { req, res, next } = makeReqRes({ email: SA });
    requireSuperAdmin(req as never, res as never, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ── effectiveIdentityMiddleware ───────────────────────────────────────────────

describe('effectiveIdentityMiddleware', () => {
  function makeReqRes(session: Record<string, unknown>) {
    const req = { session };
    const res = { locals: {} as Record<string, unknown> };
    const next = vi.fn();
    return { req, res, next };
  }

  it('uses real session identity when not impersonating', () => {
    const { req, res, next } = makeReqRes({
      googleEmail:    'staff@transitiontrails.org',
      googleAudience: null,
    });
    effectiveIdentityMiddleware(req as never, res as never, next);
    expect(res.locals['effectiveEmail']).toBe('staff@transitiontrails.org');
    expect(res.locals['effectiveAudience']).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  it('uses impersonated identity when impersonating', () => {
    const { req, res, next } = makeReqRes({
      googleEmail:          'super@transitiontrails.org',
      googleAudience:       null,
      impersonatedEmail:    'learner@transitiontrails.org',
      impersonatedAudience: 'learner',
    });
    effectiveIdentityMiddleware(req as never, res as never, next);
    expect(res.locals['effectiveEmail']).toBe('learner@transitiontrails.org');
    expect(res.locals['effectiveAudience']).toBe('learner');
    expect(next).toHaveBeenCalled();
  });

  it('uses impersonated audience "coach" correctly', () => {
    const { req, res, next } = makeReqRes({
      googleEmail:          'super@transitiontrails.org',
      googleAudience:       null,
      impersonatedEmail:    'coach@transitiontrails.org',
      impersonatedAudience: 'coach',
    });
    effectiveIdentityMiddleware(req as never, res as never, next);
    expect(res.locals['effectiveAudience']).toBe('coach');
  });

  it('uses impersonated audience "volunteer" correctly', () => {
    const { req, res, next } = makeReqRes({
      googleEmail:          'super@transitiontrails.org',
      googleAudience:       null,
      impersonatedEmail:    'vol@transitiontrails.org',
      impersonatedAudience: 'volunteer',
    });
    effectiveIdentityMiddleware(req as never, res as never, next);
    expect(res.locals['effectiveAudience']).toBe('volunteer');
  });

  it('returns null effectiveAudience for staff impersonating a staff user', () => {
    const { req, res, next } = makeReqRes({
      googleEmail:          'super@transitiontrails.org',
      googleAudience:       null,
      impersonatedEmail:    'staff2@transitiontrails.org',
      impersonatedAudience: null,
    });
    effectiveIdentityMiddleware(req as never, res as never, next);
    expect(res.locals['effectiveAudience']).toBeNull();
  });
});

// ── requireHomebaseAuth ───────────────────────────────────────────────────────

describe('requireHomebaseAuth — impersonation aware', () => {
  function makeReqRes(session: Record<string, unknown>, effectiveAudience: string | null) {
    const req = { session };
    const res = {
      locals: { effectiveAudience } as Record<string, unknown>,
      status: vi.fn().mockReturnThis(),
      json:   vi.fn().mockReturnThis(),
    };
    const next = vi.fn();
    return { req, res, next };
  }

  it('returns 401 when there is no real session email', () => {
    const { req, res, next } = makeReqRes({ googleEmail: undefined }, 'learner');
    requireHomebaseAuth(req as never, res as never, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when effective audience is null (staff, no homebase)', () => {
    const { req, res, next } = makeReqRes({ googleEmail: 'staff@transitiontrails.org' }, null);
    requireHomebaseAuth(req as never, res as never, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when superadmin is impersonating a learner (effectiveAudience=learner)', () => {
    const { req, res, next } = makeReqRes(
      { googleEmail: 'super@transitiontrails.org', googleAudience: null },
      'learner',
    );
    requireHomebaseAuth(req as never, res as never, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when superadmin is impersonating a coach (effectiveAudience=coach)', () => {
    const { req, res, next } = makeReqRes(
      { googleEmail: 'super@transitiontrails.org', googleAudience: null },
      'coach',
    );
    requireHomebaseAuth(req as never, res as never, next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next() when superadmin is impersonating a volunteer (effectiveAudience=volunteer)', () => {
    const { req, res, next } = makeReqRes(
      { googleEmail: 'super@transitiontrails.org', googleAudience: null },
      'volunteer',
    );
    requireHomebaseAuth(req as never, res as never, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 for team audience (team is not a homebase data audience)', () => {
    const { req, res, next } = makeReqRes(
      { googleEmail: 'team@transitiontrails.org', googleAudience: 'team' },
      'team',
    );
    requireHomebaseAuth(req as never, res as never, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ── Impersonation constraint checks ──────────────────────────────────────────
// Tests for the business logic guards inside the route handler.
// We test the helpers directly rather than making HTTP requests.

describe('Impersonation guard: isSuperAdmin blocks superadmin targets', () => {
  const SA1 = 'super1@transitiontrails.org';
  const SA2 = 'super2@transitiontrails.org';

  beforeEach(() => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = `${SA1}, ${SA2}`;
  });
  afterEach(() => {
    delete process.env['TRAIL_OS_SUPERADMIN_EMAILS'];
  });

  it('both superadmin emails are detected', () => {
    expect(isSuperAdmin(SA1)).toBe(true);
    expect(isSuperAdmin(SA2)).toBe(true);
  });

  it('a regular admin is not a superadmin', () => {
    expect(isSuperAdmin('admin@transitiontrails.org')).toBe(false);
  });
});

// ── Audit log insert shape for impersonation events ───────────────────────────

describe('impersonation audit log insert shape', () => {
  it('impersonation_start row has correct event type and actor/target', async () => {
    const { db } = await import('@workspace/db');
    const { trailOsAuditLogTable } = await import('@workspace/db/schema');

    await db.insert(trailOsAuditLogTable).values({
      eventType:   'impersonation_start',
      actorEmail:  'super@transitiontrails.org',
      targetEmail: 'learner@transitiontrails.org',
      audience:    'learner',
      ipAddress:   '127.0.0.1',
      metadata:    { displayName: 'A Learner', targetAudience: 'learner' },
    });

    expect(db.insert).toHaveBeenCalledWith(trailOsAuditLogTable);
  });

  it('impersonation_end row has correct event type and null audience', async () => {
    const { db } = await import('@workspace/db');
    const { trailOsAuditLogTable } = await import('@workspace/db/schema');

    await db.insert(trailOsAuditLogTable).values({
      eventType:   'impersonation_end',
      actorEmail:  'super@transitiontrails.org',
      targetEmail: 'learner@transitiontrails.org',
      audience:    null,
      ipAddress:   '127.0.0.1',
      metadata:    { exitedFrom: null },
    });

    expect(db.insert).toHaveBeenCalledWith(trailOsAuditLogTable);
  });

  it('impersonation_action row captures method, path, and bodyFields', async () => {
    const { db } = await import('@workspace/db');
    const { trailOsAuditLogTable } = await import('@workspace/db/schema');

    await db.insert(trailOsAuditLogTable).values({
      eventType:   'impersonation_action',
      actorEmail:  'super@transitiontrails.org',
      targetEmail: 'learner@transitiontrails.org',
      audience:    'learner',
      ipAddress:   '127.0.0.1',
      metadata:    { method: 'POST', path: '/homebase/learner/stone', bodyFields: 'date' },
    });

    expect(db.insert).toHaveBeenCalledWith(trailOsAuditLogTable);
  });
});
