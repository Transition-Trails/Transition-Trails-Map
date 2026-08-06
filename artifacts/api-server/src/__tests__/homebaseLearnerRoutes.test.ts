/**
 * homebaseLearnerRoutes.test.ts
 *
 * Covers the learner-specific Homebase routes added in task #250:
 *
 *  Auth / audience guard
 *   1. All /homebase/learner/* routes → 401 when no session
 *   2. All /homebase/learner/* routes → 403 when audience is coach (not learner)
 *
 *  GET /api/homebase/learner/quest
 *   3. Returns quest:null when GEMINI_API_KEY is absent (not 500)
 *   4. Returns cached quest from session without calling Gemini
 *   5. Returns quest:null when Gemini fetch throws
 *
 *  POST /api/homebase/learner/quest/set-stone
 *   6. Returns { ok:true, stoneSet:true } and marks homebaseStoneSet in session
 *
 *  GET /api/homebase/learner/cases
 *   7. Returns sfUnavailable:true (200) when SALESFORCE_INSTANCE_URL / SF_SERVICE_TOKEN absent
 *   8. Returns linked:false when SF query returns no Contact (fetch success, empty records)
 *   9. Returns linked:true with cases when Contact and cases exist
 *  10. Returns 503 when the SF Contact query fails with an HTTP error
 *
 *  GET /api/homebase/learner/week
 *  11. Returns { items: [], hasData: false } with 200
 *
 *  GET /api/homebase/learner/coach
 *  12. Returns sfUnavailable:true when SF not configured
 *  13. Returns linked:false when SF query returns no Contact
 *  14. Returns linked:true when Contact found (coach:null Phase-1 stub)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Session shim (same pattern as homebaseAuth.test.ts) ───────────────────────

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

// ── DB mock (needed by homebase.ts import chain) ──────────────────────────────

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })) })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([]) })) })) })),
  },
}));

vi.mock('@workspace/db/schema', () => ({
  timeLogsTable: { id: 'id', userEmail: 'user_email', audience: 'audience', activityLabel: 'activity_label', hours: 'hours', loggedAt: 'logged_at' },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(f => ({ __desc: f })),
  eq:   vi.fn().mockReturnValue({ __eq: true }),
  gte:  vi.fn().mockReturnValue({ __gte: true }),
}));

import app from '../app.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clearSession() {
  for (const key of Object.keys(mockSession)) delete mockSession[key];
}

const TODAY = new Date().toISOString().slice(0, 10);

const LEARNER_SESSION = {
  googleEmail:    'learner@transitiontrails.org',
  googleName:     'Kim Learner',
  googleAudience: 'learner' as const,
  googleGroups:   [] as string[],
};

const COACH_SESSION = {
  googleEmail:    'coach@transitiontrails.org',
  googleName:     'Kim Coach',
  googleAudience: 'coach' as const,
  googleGroups:   [] as string[],
};

const LEARNER_ROUTES_GET  = [
  '/api/homebase/learner/quest',
  '/api/homebase/learner/cases',
  '/api/homebase/learner/week',
  '/api/homebase/learner/coach',
] as const;

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  clearSession();
  vi.clearAllMocks();
  // Restore env so each test starts clean
  for (const k of ['GEMINI_API_KEY', 'SALESFORCE_INSTANCE_URL', 'SF_SERVICE_TOKEN']) {
    if (ORIG_ENV[k] !== undefined) process.env[k] = ORIG_ENV[k];
    else delete process.env[k];
  }
});

afterEach(() => {
  clearSession();
  for (const k of ['GEMINI_API_KEY', 'SALESFORCE_INSTANCE_URL', 'SF_SERVICE_TOKEN']) {
    if (ORIG_ENV[k] !== undefined) process.env[k] = ORIG_ENV[k];
    else delete process.env[k];
  }
});

// ── 1. No session → 401 ───────────────────────────────────────────────────────

describe('All /homebase/learner/* routes → 401 when no session', () => {
  for (const path of LEARNER_ROUTES_GET) {
    it(`GET ${path}`, async () => {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    });
  }

  it('POST /api/homebase/learner/quest/set-stone', async () => {
    const res = await request(app).post('/api/homebase/learner/quest/set-stone');
    expect(res.status).toBe(401);
  });
});

// ── 2. Wrong audience → 403 ───────────────────────────────────────────────────

describe('All /homebase/learner/* routes → 403 when audience is coach', () => {
  beforeEach(() => { Object.assign(mockSession, COACH_SESSION); });

  for (const path of LEARNER_ROUTES_GET) {
    it(`GET ${path}`, async () => {
      const res = await request(app).get(path);
      expect(res.status).toBe(403);
    });
  }

  it('POST /api/homebase/learner/quest/set-stone', async () => {
    const res = await request(app).post('/api/homebase/learner/quest/set-stone');
    expect(res.status).toBe(403);
  });
});

// ── 3–5. GET /api/homebase/learner/quest ──────────────────────────────────────

describe('GET /api/homebase/learner/quest', () => {
  beforeEach(() => { Object.assign(mockSession, LEARNER_SESSION); });

  it('returns quest:null with 200 when GEMINI_API_KEY is absent', async () => {
    delete process.env['GEMINI_API_KEY'];
    // Ensure SF is also absent so sfSvcQuery doesn't accidentally call fetch
    delete process.env['SALESFORCE_INSTANCE_URL'];
    delete process.env['SF_SERVICE_TOKEN'];

    const res = await request(app).get('/api/homebase/learner/quest');
    expect(res.status).toBe(200);
    expect(res.body.quest).toBeNull();
    expect(res.body.stoneSet).toBe(false);
    expect(res.body.cairnTarget).toBe(7);
  });

  it('returns cached quest from session without calling Gemini', async () => {
    const cachedQuest = {
      title: 'Cached Quest', description: 'Desc', difficulty: 'Beginner',
      pointValue: 10, category: 'Admin', acceptanceCriteria: 'Do it',
    };
    mockSession['homebaseQuest']     = cachedQuest;
    mockSession['homebaseQuestDate'] = TODAY;

    // Mock fetch to fail so we can confirm it was NOT called for Gemini
    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Should not be called'));

    const res = await request(app).get('/api/homebase/learner/quest');
    expect(res.status).toBe(200);
    expect(res.body.quest).toMatchObject({ title: 'Cached Quest' });
    // fetch should not have been called (no SF or Gemini request)
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('returns quest:null when Gemini fetch throws (timeout/network)', async () => {
    process.env['GEMINI_API_KEY'] = 'test-key';
    delete process.env['SALESFORCE_INSTANCE_URL'];
    delete process.env['SF_SERVICE_TOKEN'];

    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const res = await request(app).get('/api/homebase/learner/quest');
    expect(res.status).toBe(200);
    expect(res.body.quest).toBeNull();

    fetchSpy.mockRestore();
  });
});

// ── 6. POST /api/homebase/learner/quest/set-stone ─────────────────────────────

describe('POST /api/homebase/learner/quest/set-stone', () => {
  beforeEach(() => { Object.assign(mockSession, LEARNER_SESSION); });

  it('returns { ok:true, stoneSet:true } and sets homebaseStoneSet in session', async () => {
    const res = await request(app).post('/api/homebase/learner/quest/set-stone');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.stoneSet).toBe(true);
    // Session should be marked with today's date
    expect(mockSession['homebaseStoneSet']).toBe(TODAY);
  });
});

// ── 7–10. GET /api/homebase/learner/cases ────────────────────────────────────

describe('GET /api/homebase/learner/cases', () => {
  beforeEach(() => { Object.assign(mockSession, LEARNER_SESSION); });

  it('returns sfUnavailable:true with 200 when SALESFORCE_INSTANCE_URL / SF_SERVICE_TOKEN absent', async () => {
    delete process.env['SALESFORCE_INSTANCE_URL'];
    delete process.env['SF_SERVICE_TOKEN'];

    const res = await request(app).get('/api/homebase/learner/cases');
    expect(res.status).toBe(200);
    expect(res.body.sfUnavailable).toBe(true);
    expect(res.body.linked).toBeNull();
    expect(Array.isArray(res.body.cases)).toBe(true);
  });

  it('returns linked:false when SF query returns no Contact record', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    // First fetch (Contact lookup): success, empty records
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ records: [] }), { status: 200 }),
    );

    const res = await request(app).get('/api/homebase/learner/cases');
    expect(res.status).toBe(200);
    expect(res.body.linked).toBe(false);
    expect(res.body.sfUnavailable).toBe(false);
    expect(res.body.cases).toEqual([]);

    fetchSpy.mockRestore();
  });

  it('returns linked:true with cases when Contact and open Cases exist', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    const fetchSpy = vi.spyOn(global, 'fetch')
      // Contact lookup → found
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ records: [{ Id: 'CONTACT_001' }] }), { status: 200 }),
      )
      // Cases query → one open case
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          records: [{
            Id: 'CASE_001', CaseNumber: '00001234', Subject: 'Test Case',
            Status: 'New', Priority: 'Medium', LastModifiedDate: new Date().toISOString(),
            CreatedDate: new Date().toISOString(),
          }],
        }), { status: 200 }),
      );

    const res = await request(app).get('/api/homebase/learner/cases');
    expect(res.status).toBe(200);
    expect(res.body.linked).toBe(true);
    expect(res.body.sfUnavailable).toBe(false);
    expect(res.body.totalOpen).toBe(1);
    expect(res.body.cases[0].Subject).toBe('Test Case');

    fetchSpy.mockRestore();
  });

  it('returns 503 when the SF Contact query returns an HTTP error', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('Forbidden', { status: 403 }),
    );

    const res = await request(app).get('/api/homebase/learner/cases');
    expect(res.status).toBe(503);
    expect(res.body.sfUnavailable).toBe(true);

    fetchSpy.mockRestore();
  });
});

// ── 11. GET /api/homebase/learner/week ────────────────────────────────────────

describe('GET /api/homebase/learner/week', () => {
  it('returns { items: [], hasData: false } with 200', async () => {
    Object.assign(mockSession, LEARNER_SESSION);
    const res = await request(app).get('/api/homebase/learner/week');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.hasData).toBe(false);
  });
});

// ── 12–14. GET /api/homebase/learner/coach ────────────────────────────────────

describe('GET /api/homebase/learner/coach', () => {
  beforeEach(() => { Object.assign(mockSession, LEARNER_SESSION); });

  it('returns sfUnavailable:true when SF not configured', async () => {
    delete process.env['SALESFORCE_INSTANCE_URL'];
    delete process.env['SF_SERVICE_TOKEN'];

    const res = await request(app).get('/api/homebase/learner/coach');
    expect(res.status).toBe(200);
    expect(res.body.sfUnavailable).toBe(true);
    expect(res.body.linked).toBeNull();
    expect(res.body.coach).toBeNull();
  });

  it('returns linked:false when SF returns no Contact', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ records: [] }), { status: 200 }),
    );

    const res = await request(app).get('/api/homebase/learner/coach');
    expect(res.status).toBe(200);
    expect(res.body.linked).toBe(false);
    expect(res.body.sfUnavailable).toBe(false);
    expect(res.body.coach).toBeNull();

    fetchSpy.mockRestore();
  });

  it('returns linked:true with coach:null (Phase-1 stub) when Contact found', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ records: [{ Id: 'CONTACT_001' }] }), { status: 200 }),
    );

    const res = await request(app).get('/api/homebase/learner/coach');
    expect(res.status).toBe(200);
    expect(res.body.linked).toBe(true);
    expect(res.body.sfUnavailable).toBe(false);
    // Phase 1: coaching fields not yet provisioned — coach is null
    expect(res.body.coach).toBeNull();

    fetchSpy.mockRestore();
  });
});
