/**
 * alertSettings.test.ts
 *
 * Tests for the error-alert settings endpoints and background job.
 *
 * The DB mock is STATEFUL: db.insert() writes to a shared in-memory object;
 * db.select() reads from it. This means the E2E tests (PATCH → checkAndAlert)
 * verify that the job uses values the route actually persisted — not a
 * separately pre-seeded row.
 *
 * API route tests (GET / PATCH /slack/alert-settings):
 *   A1. GET returns default payload when DB has no row
 *   A2. GET returns DB row when one is seeded
 *   A3. PATCH — 401 with no session
 *   A4. PATCH — 403 with non-admin session
 *   A5. PATCH — 200, merged values returned, updatedBy set from session email
 *   A6. PATCH partial update — only threshold → windowMinutes preserved from existing row
 *   A7. PATCH — 400 when threshold is below minimum (0)
 *   A8. PATCH — 400 when windowMinutes exceeds maximum (1441)
 *   A9. PATCH — 400 when body has neither field
 *
 * End-to-end: PATCH → checkAndAlert uses saved values
 *   E1. Saving threshold=5 via PATCH → checkAndAlert alerts for 6 errors (6 > 5)
 *   E2. Saving threshold=20 via PATCH → checkAndAlert is silent for 6 errors (6 ≤ 20)
 *
 * errorAlertJob unit tests:
 *   J1. checkAndAlert falls back to env/default when DB row is absent
 *   J2. checkAndAlert does NOT post when error count equals threshold (must strictly exceed)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Session shim ──────────────────────────────────────────────────────────────

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {};
  return { mockSession };
});

vi.mock('express-session', () => ({
  default: () => (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req['session'] = new Proxy(mockSession, {
      get(target, prop) {
        if (prop === 'save')       return (cb?: () => void) => cb?.();
        if (prop === 'destroy')    return (cb?: () => void) => cb?.();
        if (prop === 'regenerate') return (cb?: () => void) => cb?.();
        if (prop === 'reload')     return (cb?: () => void) => cb?.();
        if (prop === 'touch')      return (cb?: () => void) => cb?.();
        return (target as Record<string | symbol, unknown>)[prop];
      },
      set(target, prop, value) {
        (target as Record<string | symbol, unknown>)[prop] = value;
        return true;
      },
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

// ── Stateful in-memory "fake database" ────────────────────────────────────────
//
// db.insert() writes here; db.select() reads from here.
// Both the PATCH route and checkAndAlert share the same object so we can test
// the full save → read cycle without pre-seeding the job separately.

interface FakeSettingsRow {
  id:            string;
  threshold:     number;
  windowMinutes: number;
  updatedBy:     string | null;
  updatedAt:     Date;
}

const fakeDb = {
  settings:  null as FakeSettingsRow | null,
  auditRows: [] as { metadata: unknown }[],
};

function resetFakeDb() {
  fakeDb.settings  = null;
  fakeDb.auditRows = [];
}

// ── DB mock functions ─────────────────────────────────────────────────────────

const { mockDbSelect, mockDbInsert } = vi.hoisted(() => {
  const mockDbSelect = vi.fn();
  const mockDbInsert = vi.fn();
  return { mockDbSelect, mockDbInsert };
});

/**
 * Wire mockDbSelect to read from fakeDb.
 *
 * The result of .where() is both:
 *   • A Promise → resolves to auditRows (audit-log query, no .limit())
 *   • Has .limit() → resolves to settings rows (alertSettings query)
 */
function useStatefulSelect() {
  mockDbSelect.mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => {
        // Resolve to auditRows when awaited directly (no .limit()).
        const p = Promise.resolve([...fakeDb.auditRows]) as
          Promise<unknown[]> & { limit: (n: number) => Promise<unknown[]> };
        // Resolve to settings row when .limit(1) is called.
        p.limit = (_n: number) =>
          Promise.resolve(fakeDb.settings ? [{ ...fakeDb.settings }] : []);
        return p;
      }),
    }),
  }));
}

/**
 * Wire mockDbInsert to write to fakeDb.settings.
 * Captures the values() argument (the full merged row from the PATCH route).
 */
function useStatefulInsert() {
  mockDbInsert.mockImplementation(() => ({
    values: vi.fn().mockImplementation((row: FakeSettingsRow) => {
      // Persist — subsequent select()…limit() calls will see this row.
      fakeDb.settings = { ...row, id: 'default' };
      return { onConflictDoUpdate: vi.fn().mockResolvedValue([]) };
    }),
  }));
}

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
  },
}));

// ── App import ────────────────────────────────────────────────────────────────

import app from '../app.js';

// ── Session helpers ───────────────────────────────────────────────────────────

function setAdminSession(email = 'admin@transitiontrails.org') {
  Object.assign(mockSession, {
    googleEmail:  email,
    googleGroups: ['trailosadmin@transitiontrails.org'],
  });
}

function setStaffSession() {
  Object.assign(mockSession, {
    googleEmail:  'staff@transitiontrails.org',
    googleGroups: ['trailosusers@transitiontrails.org'],
  });
}

function clearSession() {
  for (const key of Object.keys(mockSession)) delete mockSession[key];
}

// ── API route tests ───────────────────────────────────────────────────────────

describe('GET /slack/alert-settings', () => {
  beforeEach(() => {
    clearSession();
    resetFakeDb();
    useStatefulSelect();
    useStatefulInsert();
    setStaffSession(); // GET is not admin-gated
  });

  it('A1. returns default payload (source=default) when DB has no row', async () => {
    const res = await request(app).get('/api/slack/alert-settings');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      threshold:     expect.any(Number),
      windowMinutes: 15,
      source:        'default',
      updatedBy:     null,
      updatedAt:     null,
    });
  });

  it('A2. returns DB values (source=db) when a row is present', async () => {
    fakeDb.settings = {
      id:            'default',
      threshold:     25,
      windowMinutes: 30,
      updatedBy:     'admin@transitiontrails.org',
      updatedAt:     new Date('2026-08-01T10:00:00Z'),
    };

    const res = await request(app).get('/api/slack/alert-settings');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      threshold:     25,
      windowMinutes: 30,
      source:        'db',
      updatedBy:     'admin@transitiontrails.org',
    });
    expect(typeof res.body.updatedAt).toBe('string');
    expect(res.body.updatedAt).toContain('2026-08-01');
  });
});

describe('PATCH /slack/alert-settings', () => {
  beforeEach(() => {
    clearSession();
    resetFakeDb();
    useStatefulSelect();
    useStatefulInsert();
  });

  it('A3. 401 with no session', async () => {
    const res = await request(app)
      .patch('/api/slack/alert-settings')
      .send({ threshold: 20 });
    expect(res.status).toBe(401);
  });

  it('A4. 403 with non-admin (everyday staff) session', async () => {
    setStaffSession();
    const res = await request(app)
      .patch('/api/slack/alert-settings')
      .send({ threshold: 20 });
    expect(res.status).toBe(403);
  });

  it('A5. 200 with merged values and updatedBy set to admin email', async () => {
    setAdminSession('admin@transitiontrails.org');

    const res = await request(app)
      .patch('/api/slack/alert-settings')
      .send({ threshold: 20, windowMinutes: 30 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, threshold: 20, windowMinutes: 30 });

    // Verify the persisted row carries the admin's email in updatedBy
    expect(fakeDb.settings).not.toBeNull();
    expect(fakeDb.settings!.threshold).toBe(20);
    expect(fakeDb.settings!.windowMinutes).toBe(30);
    expect(fakeDb.settings!.updatedBy).toBe('admin@transitiontrails.org');
  });

  it('A6. partial update: only threshold → existing windowMinutes is preserved', async () => {
    // Seed an existing row so PATCH can merge against it
    fakeDb.settings = { id: 'default', threshold: 10, windowMinutes: 45, updatedBy: null, updatedAt: new Date() };
    setAdminSession();

    const res = await request(app)
      .patch('/api/slack/alert-settings')
      .send({ threshold: 99 }); // windowMinutes omitted

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, threshold: 99, windowMinutes: 45 });

    // Persisted row must carry the original windowMinutes
    expect(fakeDb.settings!.threshold).toBe(99);
    expect(fakeDb.settings!.windowMinutes).toBe(45);
  });

  it('A7. 400 when threshold is 0 (below minimum)', async () => {
    setAdminSession();
    const res = await request(app)
      .patch('/api/slack/alert-settings')
      .send({ threshold: 0, windowMinutes: 15 });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false, error: expect.stringMatching(/threshold/i) });
  });

  it('A8. 400 when windowMinutes is 1441 (above maximum)', async () => {
    setAdminSession();
    const res = await request(app)
      .patch('/api/slack/alert-settings')
      .send({ threshold: 10, windowMinutes: 1441 });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false, error: expect.stringMatching(/windowMinutes/i) });
  });

  it('A9. 400 when body has neither threshold nor windowMinutes', async () => {
    setAdminSession();
    const res = await request(app)
      .patch('/api/slack/alert-settings')
      .send({ unrelated: true });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false });
  });
});

// ── End-to-end: PATCH → checkAndAlert uses saved values ──────────────────────
//
// These tests verify the full save → runtime path:
//   1. Admin PATCHes a threshold via the HTTP route
//   2. checkAndAlert is called without any extra DB setup
//   3. The job uses the threshold that was just persisted, NOT a pre-seeded row

describe('End-to-end: PATCH → checkAndAlert uses saved values', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearSession();
    resetFakeDb();
    useStatefulSelect();
    useStatefulInsert();
    setAdminSession();

    process.env['SLACK_BOT_TOKEN']        = 'xoxb-test-token';
    process.env['SLACK_ADMIN_CHANNEL_ID'] = 'C0ADMINCHAN';
    process.env['APP_BASE_URL']           = 'https://example.com';

    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env['SLACK_BOT_TOKEN'];
    delete process.env['SLACK_ADMIN_CHANNEL_ID'];
    delete process.env['APP_BASE_URL'];
  });

  it('E1. PATCH saves threshold=5 → checkAndAlert alerts when 6 errors arrive', async () => {
    // Step 1: persist threshold=5 via the HTTP route
    const patchRes = await request(app)
      .patch('/api/slack/alert-settings')
      .send({ threshold: 5, windowMinutes: 15 });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.threshold).toBe(5);

    // Confirm the row was actually written to the shared fake DB
    expect(fakeDb.settings!.threshold).toBe(5);

    // Step 2: populate audit rows — 6 errors, which exceeds the saved threshold of 5
    fakeDb.auditRows = Array.from({ length: 6 }, () => ({ metadata: { route: '/api/test' } }));

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, ts: '111.222' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Step 3: run the job — must read from the same DB state PATCH just wrote
    const { checkAndAlert, _resetRateLimitForTesting } = await import('../lib/errorAlertJob.js');
    _resetRateLimitForTesting();
    await checkAndAlert();

    // Slack must have been called: 6 errors > threshold of 5
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://slack.com/api/chat.postMessage',
      expect.objectContaining({ method: 'POST' }),
    );

    const body = JSON.parse(
      (fetchSpy.mock.calls[0]! as [string, RequestInit])[1].body as string,
    ) as Record<string, unknown>;
    // Alert message must mention both the actual count and the saved threshold
    expect(String(body['text'])).toContain('6');   // error count
    expect(String(body['text'])).toContain('5');   // threshold from PATCH
  });

  it('E2. PATCH raises threshold to 20 → checkAndAlert is silent for 6 errors', async () => {
    // Step 1: persist a higher threshold
    const patchRes = await request(app)
      .patch('/api/slack/alert-settings')
      .send({ threshold: 20, windowMinutes: 15 });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.threshold).toBe(20);
    expect(fakeDb.settings!.threshold).toBe(20);

    // Step 2: 6 errors — below the new threshold of 20
    fakeDb.auditRows = Array.from({ length: 6 }, () => ({ metadata: { route: '/api/test' } }));

    // Step 3: job must NOT post a Slack alert (6 ≤ 20)
    const { checkAndAlert, _resetRateLimitForTesting } = await import('../lib/errorAlertJob.js');
    _resetRateLimitForTesting();
    await checkAndAlert();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ── Job unit tests ────────────────────────────────────────────────────────────

describe('errorAlertJob — checkAndAlert', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetFakeDb();
    useStatefulSelect();
    useStatefulInsert();

    process.env['SLACK_BOT_TOKEN']        = 'xoxb-test-token';
    process.env['SLACK_ADMIN_CHANNEL_ID'] = 'C0ADMINCHAN';
    process.env['APP_BASE_URL']           = 'https://example.com';

    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env['SLACK_BOT_TOKEN'];
    delete process.env['SLACK_ADMIN_CHANNEL_ID'];
    delete process.env['APP_BASE_URL'];
    delete process.env['ERROR_ALERT_THRESHOLD'];
  });

  it('J1. falls back to env/default threshold when DB has no row', async () => {
    process.env['ERROR_ALERT_THRESHOLD'] = '3';
    // No settings row → should use env threshold of 3
    // 4 errors → exceeds env threshold
    fakeDb.auditRows = Array.from({ length: 4 }, () => ({ metadata: { route: '/api/fallback' } }));

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, ts: '999' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { checkAndAlert, _resetRateLimitForTesting } = await import('../lib/errorAlertJob.js');
    _resetRateLimitForTesting();
    await checkAndAlert();

    // Alert posted because env threshold (3) was used and 4 > 3
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://slack.com/api/chat.postMessage',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('J2. does NOT post when error count equals threshold (must strictly exceed)', async () => {
    fakeDb.settings  = { id: 'default', threshold: 10, windowMinutes: 15, updatedBy: null, updatedAt: new Date() };
    // Exactly at threshold — no alert
    fakeDb.auditRows = Array.from({ length: 10 }, () => ({ metadata: { route: '/api/equal' } }));

    const { checkAndAlert, _resetRateLimitForTesting } = await import('../lib/errorAlertJob.js');
    _resetRateLimitForTesting();
    await checkAndAlert();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
