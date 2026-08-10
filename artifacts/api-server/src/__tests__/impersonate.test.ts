/**
 * impersonate.test.ts
 *
 * Tests for the superadmin impersonation feature covering:
 *
 *  UNIT (pure helpers):
 *    - isSuperAdmin, requireSuperAdmin, effectiveIdentityMiddleware,
 *      requireHomebaseAuth (impersonation-aware variant)
 *
 *  ROUTE-LEVEL (HTTP via supertest):
 *    - POST /admin/impersonate success path
 *    - POST /admin/impersonate: nested, self, superadmin-target, unauthenticated, non-superadmin
 *    - POST /admin/impersonate: audit write failure → 500, session NOT modified
 *    - POST /admin/impersonate: session save failure after audit → 500, audit was written
 *    - POST /admin/impersonate/exit success path
 *    - POST /admin/impersonate/exit: not impersonating → 200 no-op
 *    - POST /admin/impersonate/exit: audit write failure → 500, session unchanged
 *    - POST /admin/impersonate/exit: session save failure after audit → 500
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

// ── DB mock (must be hoisted before dynamic imports) ─────────────────────────

vi.mock('@workspace/db', () => {
  const valuesFn = vi.fn().mockResolvedValue(undefined);
  const insertFn = vi.fn().mockReturnValue({ values: valuesFn });
  return { db: { insert: insertFn } };
});

vi.mock('@workspace/db/schema', () => ({
  trailOsAuditLogTable: { _: { name: 'trail_os_audit_log' } },
}));

// Lazy-import after mocks are registered
async function getDb() {
  const { db } = await import('@workspace/db');
  return db;
}
async function getTable() {
  const { trailOsAuditLogTable } = await import('@workspace/db/schema');
  return trailOsAuditLogTable;
}

// ── Unit tests — pure helpers ─────────────────────────────────────────────────

import {
  isSuperAdmin,
  requireSuperAdmin,
  requireHomebaseAuth,
  effectiveIdentityMiddleware,
} from '../middlewares/requireAuth.js';

describe('isSuperAdmin', () => {
  const SA = 'super@transitiontrails.org';
  beforeEach(() => { process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = SA; });
  afterEach(()  => { delete process.env['TRAIL_OS_SUPERADMIN_EMAILS']; });

  it('returns true for listed email (case-insensitive)', () => {
    expect(isSuperAdmin(SA)).toBe(true);
    expect(isSuperAdmin(SA.toUpperCase())).toBe(true);
  });
  it('returns false for unlisted email', () => {
    expect(isSuperAdmin('other@transitiontrails.org')).toBe(false);
  });
  it('returns false when env var is empty', () => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = '';
    expect(isSuperAdmin(SA)).toBe(false);
  });
  it('supports comma-separated list', () => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = `${SA}, second@transitiontrails.org`;
    expect(isSuperAdmin('second@transitiontrails.org')).toBe(true);
  });
});

describe('requireSuperAdmin middleware', () => {
  const SA = 'super@transitiontrails.org';
  beforeEach(() => { process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = SA; });
  afterEach(()  => { delete process.env['TRAIL_OS_SUPERADMIN_EMAILS']; });

  function invoke(email?: string) {
    const req = { session: { googleEmail: email } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    const next = vi.fn();
    requireSuperAdmin(req as never, res as never, next);
    return { req, res, next };
  }

  it('returns 401 when there is no session email', () => {
    const { res, next } = invoke(undefined);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
  it('returns 403 for non-superadmin email', () => {
    const { res, next } = invoke('admin@transitiontrails.org');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
  it('calls next() for superadmin email', () => {
    const { res, next } = invoke(SA);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('effectiveIdentityMiddleware', () => {
  function invoke(session: Record<string, unknown>) {
    const req = { session };
    const res = { locals: {} as Record<string, unknown> };
    const next = vi.fn();
    effectiveIdentityMiddleware(req as never, res as never, next);
    return { res, next };
  }

  it('uses real email/audience when not impersonating', () => {
    const { res } = invoke({ googleEmail: 'staff@x.org', googleAudience: null });
    expect(res.locals['effectiveEmail']).toBe('staff@x.org');
    expect(res.locals['effectiveAudience']).toBeNull();
  });
  it('uses impersonated email/audience when impersonating', () => {
    const { res } = invoke({
      googleEmail: 'super@x.org', googleAudience: null,
      impersonatedEmail: 'learner@x.org', impersonatedAudience: 'learner',
    });
    expect(res.locals['effectiveEmail']).toBe('learner@x.org');
    expect(res.locals['effectiveAudience']).toBe('learner');
  });
  it('handles coach audience', () => {
    const { res } = invoke({
      googleEmail: 'super@x.org', googleAudience: null,
      impersonatedEmail: 'coach@x.org', impersonatedAudience: 'coach',
    });
    expect(res.locals['effectiveAudience']).toBe('coach');
  });
  it('handles volunteer audience', () => {
    const { res } = invoke({
      googleEmail: 'super@x.org', googleAudience: null,
      impersonatedEmail: 'vol@x.org', impersonatedAudience: 'volunteer',
    });
    expect(res.locals['effectiveAudience']).toBe('volunteer');
  });
});

describe('requireHomebaseAuth — impersonation-aware', () => {
  function invoke(session: Record<string, unknown>, effectiveAudience: string | null) {
    const req = { session };
    const res = {
      locals: { effectiveAudience } as Record<string, unknown>,
      status: vi.fn().mockReturnThis(),
      json:   vi.fn().mockReturnThis(),
    };
    const next = vi.fn();
    requireHomebaseAuth(req as never, res as never, next);
    return { res, next };
  }

  it('401 when no real session email', () => {
    const { res, next } = invoke({}, 'learner');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
  it('403 when effective audience is null', () => {
    const { res, next } = invoke({ googleEmail: 'staff@x.org' }, null);
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it('passes for impersonated learner', () => {
    const { next } = invoke(
      { googleEmail: 'super@x.org', googleAudience: null }, 'learner',
    );
    expect(next).toHaveBeenCalled();
  });
  it('passes for impersonated coach', () => {
    const { next } = invoke(
      { googleEmail: 'super@x.org', googleAudience: null }, 'coach',
    );
    expect(next).toHaveBeenCalled();
  });
  it('passes for impersonated volunteer', () => {
    const { next } = invoke(
      { googleEmail: 'super@x.org', googleAudience: null }, 'volunteer',
    );
    expect(next).toHaveBeenCalled();
  });
  it('403 for team audience (not a homebase data audience)', () => {
    const { res } = invoke({ googleEmail: 'team@x.org', googleAudience: 'team' }, 'team');
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ── Route-level HTTP tests ────────────────────────────────────────────────────
// Each test builds a minimal Express app with a fake session middleware so we
// can control session state and save() behavior, then exercises the actual
// route handler over HTTP.

const SA    = 'super@transitiontrails.org';
const SA2   = 'super2@transitiontrails.org';
const TARGET = 'learner@transitiontrails.org';

/** Build a test Express app with a controlled session. */
function buildApp(opts: {
  /** Fields pre-loaded in the session before the request. */
  session?: Record<string, unknown>;
  /** If provided, save() will call cb(err) on the nth call (1-indexed). */
  saveFailOnCall?: number;
} = {}): { app: Express; sessionStore: Record<string, unknown>; saveCalls: Error[] } {
  const sessionStore: Record<string, unknown> = { googleEmail: SA, ...(opts.session ?? {}) };
  const saveCalls: Error[] = [];
  let saveCallCount = 0;

  const app = express();
  app.use(express.json());

  // Fake session middleware — exposes a controllable save()
  app.use((req, _res, next) => {
    (req as never as { session: Record<string, unknown> }).session = {
      ...sessionStore,
      save: (cb: (err?: Error | null) => void) => {
        saveCallCount++;
        const shouldFail = opts.saveFailOnCall != null && saveCallCount === opts.saveFailOnCall;
        if (shouldFail) {
          const err = new Error('Session store unavailable');
          saveCalls.push(err);
          // Sync the in-memory session to store for non-failing calls
          cb(err);
        } else {
          // Sync in-memory modifications to store
          const s = (req as never as { session: Record<string, unknown> }).session;
          for (const k of Object.keys(s)) {
            if (k !== 'save') sessionStore[k] = s[k];
          }
          // Also handle deletions
          for (const k of Object.keys(sessionStore)) {
            if (!(k in s) || s[k] === undefined) delete sessionStore[k];
          }
          cb(null);
        }
      },
    };
    next();
  });

  // requireSuperAdmin gate
  app.use(requireSuperAdmin);

  // Dynamic import-based router (can't use static import due to mock timing)
  // We use a lazy route registration trick
  app.use(async (req, res, next) => {
    const { default: impersonateRouter } = await import('../routes/impersonate.js');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (impersonateRouter as any)(req, res, next);
  });

  return { app, sessionStore, saveCalls };
}

describe('POST /admin/impersonate — route-level', () => {
  const SA = 'super@transitiontrails.org';
  const SA2 = 'super2@transitiontrails.org';
  const TARGET = 'learner@transitiontrails.org';

  beforeEach(() => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = `${SA}, ${SA2}`;
  });
  afterEach(() => {
    delete process.env['TRAIL_OS_SUPERADMIN_EMAILS'];
    vi.clearAllMocks();
  });

  it('unauthenticated → 401', async () => {
    const { app } = buildApp({ session: { googleEmail: undefined } });
    const res = await request(app)
      .post('/admin/impersonate')
      .send({ targetEmail: TARGET, targetAudience: 'learner' });
    expect(res.status).toBe(401);
  });

  it('non-superadmin → 403', async () => {
    const { app } = buildApp({ session: { googleEmail: 'admin@transitiontrails.org' } });
    const res = await request(app)
      .post('/admin/impersonate')
      .send({ targetEmail: TARGET, targetAudience: 'learner' });
    expect(res.status).toBe(403);
  });

  it('nested impersonation → 409', async () => {
    const { app } = buildApp({
      session: {
        googleEmail: SA,
        impersonatedEmail: TARGET,
        originalSuperadminEmail: SA,
      },
    });
    const res = await request(app)
      .post('/admin/impersonate')
      .send({ targetEmail: 'other@transitiontrails.org' });
    expect(res.status).toBe(409);
  });

  it('self-impersonation → 400', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/admin/impersonate')
      .send({ targetEmail: SA });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('self_impersonation');
  });

  it('impersonating another superadmin → 403', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/admin/impersonate')
      .send({ targetEmail: SA2 });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('target_is_superadmin');
  });

  it('missing targetEmail → 400', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/admin/impersonate').send({});
    expect(res.status).toBe(400);
  });

  it('success → 200, session has impersonation fields, audit written', async () => {
    const { app, sessionStore } = buildApp();
    const db = await getDb();
    const table = await getTable();

    const res = await request(app)
      .post('/admin/impersonate')
      .send({ targetEmail: TARGET, targetName: 'A Learner', targetAudience: 'learner' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.impersonatedAs).toBe(TARGET);
    expect(res.body.audience).toBe('learner');

    // Session was persisted with impersonation fields
    expect(sessionStore['impersonatedEmail']).toBe(TARGET);
    expect(sessionStore['impersonatedAudience']).toBe('learner');
    expect(sessionStore['originalSuperadminEmail']).toBe(SA);

    // Audit record was written before the session
    expect(db.insert).toHaveBeenCalledWith(table);
  });

  it('audit write failure → 500, session NOT modified', async () => {
    const { app, sessionStore } = buildApp();
    const db = await getDb();
    // Make the insert().values() reject
    const valuesFn = vi.fn().mockRejectedValueOnce(new Error('DB down'));
    vi.mocked(db.insert).mockReturnValueOnce({ values: valuesFn } as never);

    const res = await request(app)
      .post('/admin/impersonate')
      .send({ targetEmail: TARGET, targetAudience: 'learner' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('audit_log_failed');

    // Session must NOT have impersonation fields — audit wrote first, save never ran
    expect(sessionStore['impersonatedEmail']).toBeUndefined();
    expect(sessionStore['originalSuperadminEmail']).toBeUndefined();
  });

  it('session save failure after successful audit → 500', async () => {
    // saveFailOnCall: 1 — the very first save() call fails (the one in the start route)
    const { app, sessionStore } = buildApp({ saveFailOnCall: 1 });

    const res = await request(app)
      .post('/admin/impersonate')
      .send({ targetEmail: TARGET, targetAudience: 'learner' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('session_save_failed');
    // The sessionStore was not updated because the save failed
    expect(sessionStore['impersonatedEmail']).toBeUndefined();
  });
});

describe('POST /admin/impersonate/exit — route-level', () => {
  const SA = 'super@transitiontrails.org';
  const TARGET = 'learner@transitiontrails.org';

  beforeEach(() => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = SA;
  });
  afterEach(() => {
    delete process.env['TRAIL_OS_SUPERADMIN_EMAILS'];
    vi.clearAllMocks();
  });

  it('not currently impersonating → 200 no-op', async () => {
    const { app, sessionStore } = buildApp({ session: { googleEmail: SA } });
    const res = await request(app).post('/admin/impersonate/exit').send({});
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // Session unchanged
    expect(sessionStore['impersonatedEmail']).toBeUndefined();
  });

  it('success → 200, session fields cleared, audit end event written', async () => {
    const { app, sessionStore } = buildApp({
      session: {
        googleEmail: SA,
        impersonatedEmail:       TARGET,
        impersonatedAudience:    'learner',
        impersonatedDisplayName: 'A Learner',
        originalSuperadminEmail: SA,
      },
    });
    const db = await getDb();
    const table = await getTable();

    const res = await request(app).post('/admin/impersonate/exit').send({});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Session fields must be cleared
    expect(sessionStore['impersonatedEmail']).toBeUndefined();
    expect(sessionStore['impersonatedAudience']).toBeUndefined();
    expect(sessionStore['originalSuperadminEmail']).toBeUndefined();

    // Audit end event was written
    expect(db.insert).toHaveBeenCalledWith(table);
  });

  it('audit write failure → 500, session NOT cleared (still impersonating)', async () => {
    const { app, sessionStore } = buildApp({
      session: {
        googleEmail: SA,
        impersonatedEmail:       TARGET,
        impersonatedAudience:    'learner',
        originalSuperadminEmail: SA,
      },
    });
    const db = await getDb();
    const valuesFn = vi.fn().mockRejectedValueOnce(new Error('DB down'));
    vi.mocked(db.insert).mockReturnValueOnce({ values: valuesFn } as never);

    const res = await request(app).post('/admin/impersonate/exit').send({});

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('audit_log_failed');

    // Session MUST still have impersonation fields — exit was rejected
    expect(sessionStore['impersonatedEmail']).toBe(TARGET);
    expect(sessionStore['originalSuperadminEmail']).toBe(SA);
  });

  it('session save failure after audit → 500', async () => {
    // First save() call in the exit route (the clear + save) fails
    const { app } = buildApp({
      session: {
        googleEmail: SA,
        impersonatedEmail:       TARGET,
        impersonatedAudience:    'learner',
        originalSuperadminEmail: SA,
      },
      saveFailOnCall: 1,
    });

    const res = await request(app).post('/admin/impersonate/exit').send({});

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('session_save_failed');
  });
});
