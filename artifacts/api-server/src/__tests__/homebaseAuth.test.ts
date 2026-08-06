/**
 * homebaseAuth.test.ts
 *
 * Covers the Homebase authentication and authorisation layer:
 *
 *  1. GET /api/auth/homebase/status — public; returns { isSignedIn: false } when no session
 *  2. GET /api/auth/homebase/status — staff session (audience:null) → isSignedIn:true, audience:null
 *  3. GET /api/auth/homebase/status — learner session → isSignedIn:true, audience:'learner'
 *  4. POST /api/homebase/log-time — 401 when no session
 *  5. POST /api/homebase/log-time — 403 when staff session (no audience)
 *  6. POST /api/homebase/log-time — 201 with valid learner session and body
 *  7. POST /api/homebase/log-time — 400 for missing activityLabel
 *  8. POST /api/homebase/log-time — 400 for invalid hours (zero / negative / >24)
 *  9. GET  /api/homebase/log-time — 401 when no session
 * 10. GET  /api/homebase/log-time — 200 with entries and totalHours for learner session
 * 11. GET  /api/homebase/log-time — 403 for staff session (no audience)
 * 12. Staff-plus-homebase priority: deriveAudience unit — coach wins over volunteer
 * 13. deriveAudience unit — learner returned when only learner group matches
 * 14. deriveAudience unit — null when no homebase ENV vars are set
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Session shim ──────────────────────────────────────────────────────────────
// Use the same pattern as pennyAudienceResolution.test.ts: replace express-session
// entirely with a mock that reads from a plain JS object so tests can set
// session fields without real cookies or a real Postgres session store.

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {};
  return { mockSession };
});

vi.mock('express-session', () => ({
  default: () => (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req['session'] = new Proxy(mockSession, {
      get(target, prop) {
        if (prop === 'save')    return (cb?: () => void) => cb?.();
        if (prop === 'destroy') return (cb?: () => void) => cb?.();
        return target[prop as string];
      },
      set(target, prop, value) { target[prop as string] = value; return true; },
    });
    next();
  },
}));

vi.mock('connect-pg-simple', () => ({
  default: () => class FakePgStore {
    get(_sid: string, cb: (err: null, s: null) => void) { cb(null, null); }
    set(_sid: string, _s: unknown, cb: () => void) { cb(); }
    destroy(_sid: string, cb: () => void) { cb(); }
  },
}));

// ── DB mock ───────────────────────────────────────────────────────────────────

const { mockInsertReturning, mockSelectOrderBy } = vi.hoisted(() => ({
  mockInsertReturning: vi.fn().mockResolvedValue([{
    id: 1, userEmail: 'learner@transitiontrails.org', audience: 'learner',
    activityLabel: 'Client session', hours: '1.00', loggedAt: new Date(),
  }]),
  mockSelectOrderBy: vi.fn().mockResolvedValue([]),
}));

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: mockInsertReturning })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ orderBy: mockSelectOrderBy })),
      })),
    })),
  },
}));

vi.mock('@workspace/db/schema', () => ({
  timeLogsTable: {
    id:            'id',
    userEmail:     'user_email',
    audience:      'audience',
    activityLabel: 'activity_label',
    hours:         'hours',
    loggedAt:      'logged_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(f  => ({ __desc: f })),
  eq:   vi.fn()  .mockReturnValue({ __eq: true }),
  gte:  vi.fn()  .mockReturnValue({ __gte: true }),
}));

// requireAuth is tested separately in authEnforcement.test.ts.
// For homebaseAuth we test the real requireHomebaseAuth middleware, so we do
// NOT mock requireAuth.js here — only staff-middleware behaviour is bypassed
// where explicitly needed (none of our homebase tests use requireStaff).

import app from '../app.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clearSession() {
  for (const key of Object.keys(mockSession)) delete mockSession[key];
}

const LEARNER_SESSION = {
  googleEmail:    'learner@transitiontrails.org',
  googleName:     'Kim Learner',
  googleAudience: 'learner' as const,
  googleGroups:   [] as string[],
};

const STAFF_SESSION = {
  googleEmail:    'staff@transitiontrails.org',
  googleName:     'Kim Staff',
  // googleAudience is intentionally absent — staff users have no homebase audience
  googleGroups:   ['trailosadmin@transitiontrails.org'],
};

beforeEach(() => {
  clearSession();
  vi.clearAllMocks();
  mockInsertReturning.mockResolvedValue([{
    id: 1, userEmail: 'learner@transitiontrails.org', audience: 'learner',
    activityLabel: 'Client session', hours: '1.00', loggedAt: new Date(),
  }]);
  mockSelectOrderBy.mockResolvedValue([]);
});

afterEach(() => { clearSession(); });

// ── 1–3. GET /api/auth/homebase/status ────────────────────────────────────────

describe('GET /api/auth/homebase/status', () => {
  it('returns { isSignedIn: false, audience: null } when no session', async () => {
    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(false);
    expect(res.body.audience).toBeNull();
  });

  it('returns isSignedIn:true with audience:null for a staff session (no audience stored)', async () => {
    Object.assign(mockSession, STAFF_SESSION);
    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(true);
    expect(res.body.audience).toBeNull();
    expect(res.body.email).toBe('staff@transitiontrails.org');
  });

  it('returns isSignedIn:true with audience:learner for a homebase session', async () => {
    Object.assign(mockSession, LEARNER_SESSION);
    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).toBe(200);
    expect(res.body.isSignedIn).toBe(true);
    expect(res.body.audience).toBe('learner');
    expect(res.body.email).toBe('learner@transitiontrails.org');
  });

  it('is reachable without a session (public path — no 401/403)', async () => {
    const res = await request(app).get('/api/auth/homebase/status');
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ── 4–8. POST /api/homebase/log-time ─────────────────────────────────────────

describe('POST /api/homebase/log-time', () => {
  it('returns 401 when there is no session', async () => {
    const res = await request(app)
      .post('/api/homebase/log-time')
      .send({ activityLabel: 'Client session', hours: 1 });
    expect(res.status).toBe(401);
  });

  it('returns 403 when the user is staff (no homebase audience)', async () => {
    Object.assign(mockSession, STAFF_SESSION);
    const res = await request(app)
      .post('/api/homebase/log-time')
      .send({ activityLabel: 'Client session', hours: 1 });
    expect(res.status).toBe(403);
  });

  it('returns 201 with a valid learner session and body', async () => {
    Object.assign(mockSession, LEARNER_SESSION);
    const res = await request(app)
      .post('/api/homebase/log-time')
      .send({ activityLabel: 'Client session', hours: 1.5 });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.entry).toBeDefined();
  });

  it('returns 400 when activityLabel is missing', async () => {
    Object.assign(mockSession, LEARNER_SESSION);
    const res = await request(app)
      .post('/api/homebase/log-time')
      .send({ hours: 2 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when hours is zero', async () => {
    Object.assign(mockSession, LEARNER_SESSION);
    const res = await request(app)
      .post('/api/homebase/log-time')
      .send({ activityLabel: 'Client session', hours: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when hours exceeds 24', async () => {
    Object.assign(mockSession, LEARNER_SESSION);
    const res = await request(app)
      .post('/api/homebase/log-time')
      .send({ activityLabel: 'Client session', hours: 25 });
    expect(res.status).toBe(400);
  });
});

// ── 9–11. GET /api/homebase/log-time ─────────────────────────────────────────

describe('GET /api/homebase/log-time', () => {
  it('returns 401 when there is no session', async () => {
    const res = await request(app).get('/api/homebase/log-time');
    expect(res.status).toBe(401);
  });

  it('returns 200 with entries array and totalHours for a learner session', async () => {
    Object.assign(mockSession, LEARNER_SESSION);
    mockSelectOrderBy.mockResolvedValueOnce([
      { id: 1, userEmail: 'learner@transitiontrails.org', audience: 'learner',
        activityLabel: 'Client session', hours: '1.50', loggedAt: new Date() },
    ]);
    const res = await request(app).get('/api/homebase/log-time');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(typeof res.body.totalHours).toBe('number');
  });

  it('returns 403 for a staff user without a homebase audience', async () => {
    Object.assign(mockSession, STAFF_SESSION);
    const res = await request(app).get('/api/homebase/log-time');
    expect(res.status).toBe(403);
  });
});

// ── 12–14. deriveAudience unit tests ─────────────────────────────────────────

describe('deriveAudience priority and group matching', () => {
  const ORIG_ENV = { ...process.env };

  afterEach(() => { Object.assign(process.env, ORIG_ENV); });

  it('returns null when no homebase ENV vars are set', async () => {
    const { deriveAudience } = await import('../routes/googleSignIn.js');
    delete process.env['GOOGLE_GROUP_COACHES'];
    delete process.env['GOOGLE_GROUP_VOLUNTEERS'];
    delete process.env['GOOGLE_GROUP_LEARNERS'];
    expect(deriveAudience(['any@example.com'], 'user@transitiontrails.org')).toBeNull();
  });

  it('returns coach when user is in both coach and volunteer groups (coach wins)', async () => {
    const { deriveAudience } = await import('../routes/googleSignIn.js');
    process.env['GOOGLE_GROUP_COACHES']    = 'coaches@transitiontrails.org';
    process.env['GOOGLE_GROUP_VOLUNTEERS'] = 'volunteers@transitiontrails.org';
    process.env['GOOGLE_GROUP_LEARNERS']   = 'learners@transitiontrails.org';
    const result = deriveAudience(
      ['coaches@transitiontrails.org', 'volunteers@transitiontrails.org'],
      'user@transitiontrails.org',
    );
    expect(result).toBe('coach');
  });

  it('returns learner when only the learner group matches', async () => {
    const { deriveAudience } = await import('../routes/googleSignIn.js');
    process.env['GOOGLE_GROUP_COACHES']    = 'coaches@transitiontrails.org';
    process.env['GOOGLE_GROUP_VOLUNTEERS'] = 'volunteers@transitiontrails.org';
    process.env['GOOGLE_GROUP_LEARNERS']   = 'learners@transitiontrails.org';
    expect(
      deriveAudience(['learners@transitiontrails.org'], 'user@transitiontrails.org'),
    ).toBe('learner');
  });
});
