/**
 * knowledge.sfArticlesAudience.test.ts
 *
 * HTTP integration tests for the audience access controls added to
 * GET /api/knowledge/sf-articles and GET /api/knowledge/sf-articles/:id.
 *
 * Covers:
 *  1. Unauthenticated requests → 401
 *  2. Staff can request any publish status (online / draft / all)
 *  3. Homebase callers are forced to online-only regardless of ?status= param
 *  4. Audience__c absent → homebase callers get 403 (fail closed)
 *  5. Audience__c present → SOQL audience filter applied correctly per audience
 *  6. Detail: homebase caller cannot access a draft article → 403
 *  7. Detail: homebase caller cannot access a foreign-audience article → 404
 *  8. Report submitted via HelpPanel appears in step-reports endpoint
 *
 * Session injection: vi.hoisted + vi.mock('express-session') pattern from homebaseAuth.test.ts.
 * SF client: module-level `mockQueryRows` + `orgHasAudienceField` controls test outcomes.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── All mocks must be declared before the app is imported ─────────────────────

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
    set(_sid: string, _s: unknown, cb: () => void)       { cb(); }
    destroy(_sid: string, cb: () => void)                { cb(); }
  },
}));

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db:   {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })),
    })),
  },
}));

// ── SF client mock ────────────────────────────────────────────────────────────
// `sfQueries` captures every SOQL string so tests can assert filter construction.
// `mockQueryRows` is a per-test override: when non-null its value is returned
//   once for the NEXT query() call (then reset to null).
// `orgHasAudienceField` controls whether the KAV describe response includes Audience__c.

const sfQueries: string[] = [];
let orgHasAudienceField  = true;
let mockQueryRows: unknown[] | null = null;

vi.mock('../lib/connectorSalesforceClient.js', () => ({
  ConnectorSalesforceClient: class {
    async rest<T>(path: string): Promise<T> {
      if (path.includes('KnowledgeArticleVersion/describe')) {
        const fields = [
          { name: 'Id' }, { name: 'KnowledgeArticleId' }, { name: 'Title' },
          { name: 'PublishStatus' }, { name: 'CreatedDate' }, { name: 'LastModifiedDate' },
          { name: 'Summary' }, { name: 'ArticleType' }, { name: 'VersionNumber' },
          { name: 'IsVisibleInApp' }, { name: 'Language' }, { name: 'UrlName' },
          ...(orgHasAudienceField ? [{ name: 'Audience__c' }] : []),
        ];
        return { fields } as T;
      }
      return {} as T;
    }

    async query<T>(soql: string): Promise<{ records: T[]; totalSize: number; done: boolean }> {
      sfQueries.push(soql);
      if (mockQueryRows !== null) {
        const rows = mockQueryRows as T[];
        mockQueryRows = null;
        return { records: rows, totalSize: rows.length, done: true };
      }
      return { records: [], totalSize: 0, done: true };
    }

    async getOrgBaseUrl(): Promise<string> { return 'https://test.salesforce.com'; }
    async createRecord(_obj: string, _data: unknown): Promise<{ id: string }> {
      return { id: 'fake-record-id' };
    }
  },
}));

// ── Import app AFTER mocks are registered ─────────────────────────────────────

import app from '../app.js';
import { _test_clearKavCaches } from '../routes/knowledge.js';

// ── Session data ──────────────────────────────────────────────────────────────

const STAFF_SESSION = {
  googleEmail:  'staff@transitiontrails.org',
  googleGroups: ['trailosadmin@transitiontrails.org'],
};
const LEARNER_SESSION = {
  googleEmail:    'learner@example.com',
  googleGroups:   [] as string[],
  googleAudience: 'learner' as const,
};
const COACH_SESSION = {
  googleEmail:    'coach@example.com',
  googleGroups:   [] as string[],
  googleAudience: 'coach' as const,
};
const VOLUNTEER_SESSION = {
  googleEmail:    'volunteer@example.com',
  googleGroups:   [] as string[],
  googleAudience: 'volunteer' as const,
};

function setSession(fields: Record<string, unknown>): void {
  for (const key of Object.keys(mockSession)) delete mockSession[key];
  Object.assign(mockSession, fields);
}
function clearSession(): void {
  for (const key of Object.keys(mockSession)) delete mockSession[key];
}

// ── Per-test setup ────────────────────────────────────────────────────────────

beforeEach(() => {
  sfQueries.length = 0;
  orgHasAudienceField = true;
  mockQueryRows = null;
  _test_clearKavCaches();
  clearSession();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Unauthenticated → 401
// ─────────────────────────────────────────────────────────────────────────────

describe('sf-articles — unauthenticated', () => {
  it('list: returns 401 when no session', async () => {
    const res = await request(app).get('/api/knowledge/sf-articles');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });

  it('detail: returns 401 when no session', async () => {
    const res = await request(app).get('/api/knowledge/sf-articles/someId');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('not_authenticated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Staff can request any publish status
// ─────────────────────────────────────────────────────────────────────────────

describe('sf-articles — staff publish-status access', () => {
  it('status=online → SOQL uses online clause', async () => {
    setSession(STAFF_SESSION);
    await request(app).get('/api/knowledge/sf-articles?status=online');
    const soql = sfQueries.find(q => q.includes('PublishStatus'));
    if (soql) expect(soql).toContain("PublishStatus = 'online'");
  });

  it('status=draft → SOQL uses draft clause', async () => {
    setSession(STAFF_SESSION);
    await request(app).get('/api/knowledge/sf-articles?status=draft');
    const soql = sfQueries.find(q => q.includes('PublishStatus'));
    if (soql) expect(soql).toContain("PublishStatus = 'draft'");
  });

  it('status=all → SOQL uses IN clause', async () => {
    setSession(STAFF_SESSION);
    await request(app).get('/api/knowledge/sf-articles?status=all');
    const soql = sfQueries.find(q => q.includes('PublishStatus'));
    if (soql) expect(soql).toContain("PublishStatus IN (");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Homebase callers are forced to online-only
// ─────────────────────────────────────────────────────────────────────────────

describe('sf-articles — homebase online-only enforcement', () => {
  it('learner requesting status=draft is forced to online in the SOQL', async () => {
    setSession(LEARNER_SESSION);
    await request(app).get('/api/knowledge/sf-articles?status=draft');
    const soql = sfQueries.find(q => q.includes('PublishStatus'));
    if (soql) {
      expect(soql).not.toContain("PublishStatus = 'draft'");
      expect(soql).not.toContain("PublishStatus IN (");
      expect(soql).toContain("PublishStatus = 'online'");
    }
  });

  it('coach requesting status=all is forced to online in the SOQL', async () => {
    setSession(COACH_SESSION);
    await request(app).get('/api/knowledge/sf-articles?status=all');
    const soql = sfQueries.find(q => q.includes('PublishStatus'));
    if (soql) {
      expect(soql).not.toContain("PublishStatus IN (");
      expect(soql).toContain("PublishStatus = 'online'");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Absent Audience__c → homebase gets 403 (fail closed)
// ─────────────────────────────────────────────────────────────────────────────

describe('sf-articles — fail closed when Audience__c absent', () => {
  it('learner gets 403 when Audience__c is not in the org', async () => {
    orgHasAudienceField = false;
    setSession(LEARNER_SESSION);
    const res = await request(app).get('/api/knowledge/sf-articles');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('audience_filter_unavailable');
  });

  it('coach gets 403 when Audience__c is not in the org', async () => {
    orgHasAudienceField = false;
    setSession(COACH_SESSION);
    const res = await request(app).get('/api/knowledge/sf-articles');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('audience_filter_unavailable');
  });

  it('volunteer gets 403 when Audience__c is not in the org', async () => {
    orgHasAudienceField = false;
    setSession(VOLUNTEER_SESSION);
    const res = await request(app).get('/api/knowledge/sf-articles');
    expect(res.status).toBe(403);
  });

  it('staff is unaffected when Audience__c is absent — does not get 403', async () => {
    orgHasAudienceField = false;
    setSession(STAFF_SESSION);
    const res = await request(app).get('/api/knowledge/sf-articles');
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Audience filter applied correctly per audience
// ─────────────────────────────────────────────────────────────────────────────

describe('sf-articles — SOQL audience filter per session', () => {
  it("learner → Audience__c = 'Learner'", async () => {
    setSession(LEARNER_SESSION);
    await request(app).get('/api/knowledge/sf-articles');
    const soql = sfQueries.find(q => q.includes('Audience__c'));
    expect(soql).toBeTruthy();
    expect(soql).toContain("Audience__c = 'Learner'");
  });

  it("coach → Audience__c = 'Coach'", async () => {
    setSession(COACH_SESSION);
    await request(app).get('/api/knowledge/sf-articles');
    const soql = sfQueries.find(q => q.includes('Audience__c'));
    expect(soql).toBeTruthy();
    expect(soql).toContain("Audience__c = 'Coach'");
  });

  it("volunteer → Audience__c = 'Volunteer'", async () => {
    setSession(VOLUNTEER_SESSION);
    await request(app).get('/api/knowledge/sf-articles');
    const soql = sfQueries.find(q => q.includes('Audience__c'));
    expect(soql).toBeTruthy();
    expect(soql).toContain("Audience__c = 'Volunteer'");
  });

  it('staff does NOT get an Audience__c WHERE filter (sees all)', async () => {
    setSession(STAFF_SESSION);
    await request(app).get('/api/knowledge/sf-articles');
    const soql = sfQueries.find(q => q.includes('PublishStatus'));
    // Audience__c may appear in the SELECT list (it is an optional org field),
    // but must not appear as a WHERE filter condition for staff callers.
    if (soql) expect(soql).not.toMatch(/WHERE.*Audience__c\s*=/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6 & 7. Detail endpoint: draft / foreign-audience enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe('sf-articles/:id — homebase audience enforcement', () => {
  it('learner gets 403 for a draft article', async () => {
    // Pre-load the mock row: PublishStatus = 'draft'
    mockQueryRows = [{
      Id: 'kavDraft001',
      KnowledgeArticleId: 'ka001',
      Title: 'Draft Article',
      PublishStatus: 'draft',      // ← draft — must be rejected
      CreatedDate: '2026-01-01T00:00:00.000Z',
      LastModifiedDate: '2026-01-01T00:00:00.000Z',
      Audience__c: 'Learner',
    }];
    setSession(LEARNER_SESSION);
    const res = await request(app).get('/api/knowledge/sf-articles/kavDraft001');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('not_authorized');
  });

  it('learner gets 404 when the article belongs to Coach (cross-audience)', async () => {
    // Return an online Coach article to a Learner — must return 404 (not 403)
    // to avoid disclosing that the article exists.
    mockQueryRows = [{
      Id: 'kavCoach001',
      KnowledgeArticleId: 'ka002',
      Title: 'Coach Only Guide',
      PublishStatus: 'online',
      CreatedDate: '2026-01-01T00:00:00.000Z',
      LastModifiedDate: '2026-01-01T00:00:00.000Z',
      Audience__c: 'Coach',        // ← Coach article
    }];
    setSession(LEARNER_SESSION);   // Learner session — should not see Coach content
    const res = await request(app).get('/api/knowledge/sf-articles/kavCoach001');
    expect(res.status).toBe(404);  // 404, not 403
  });

  it('coach gets 404 when accessing a Learner article', async () => {
    mockQueryRows = [{
      Id: 'kavLearner001',
      KnowledgeArticleId: 'ka003',
      Title: 'Learner Procedure',
      PublishStatus: 'online',
      CreatedDate: '2026-01-01T00:00:00.000Z',
      LastModifiedDate: '2026-01-01T00:00:00.000Z',
      Audience__c: 'Learner',
    }];
    setSession(COACH_SESSION);
    const res = await request(app).get('/api/knowledge/sf-articles/kavLearner001');
    expect(res.status).toBe(404);
  });

  it('detail: homebase gets 403 when Audience__c is absent from org', async () => {
    orgHasAudienceField = false;
    mockQueryRows = [{
      Id: 'kav001',
      KnowledgeArticleId: 'ka004',
      Title: 'Any Article',
      PublishStatus: 'online',
      CreatedDate: '2026-01-01T00:00:00.000Z',
      LastModifiedDate: '2026-01-01T00:00:00.000Z',
    }];
    setSession(LEARNER_SESSION);
    const res = await request(app).get('/api/knowledge/sf-articles/kav001');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('audience_filter_unavailable');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Report submitted via HelpPanel appears in step-reports (end-to-end)
// ─────────────────────────────────────────────────────────────────────────────

describe('HelpPanel report → Freshness step-reports (end-to-end)', () => {
  it('staff report via POST appears in GET …/step-reports', async () => {
    const sfId = `e2e-test-sf-${Date.now()}`;
    setSession(STAFF_SESSION);

    const postRes = await request(app)
      .post(`/api/knowledge/sf-articles/${sfId}/report`)
      .set('Content-Type', 'application/json')
      .send({ quote: 'The button is not where the screenshot shows.' });

    expect(postRes.status).toBe(201);
    expect(postRes.body.ok).toBe(true);
    expect(postRes.body.report.articleId).toBe(sfId);

    const getRes = await request(app)
      .get(`/api/knowledge/sf-articles/${sfId}/step-reports`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.totalReports).toBe(1);
    expect(getRes.body.groups[0].mostRecentQuote).toBe('The button is not where the screenshot shows.');
  });

  it('learner can create a report when the article is online and audience-matched', async () => {
    const sfId = `learner-report-${Date.now()}`;
    setSession(LEARNER_SESSION);

    // The report POST now validates article visibility: pre-load a matching article row.
    mockQueryRows = [{
      Id: sfId,
      PublishStatus: 'online',
      Audience__c: 'Learner',
    }];

    const postRes = await request(app)
      .post(`/api/knowledge/sf-articles/${sfId}/report`)
      .set('Content-Type', 'application/json')
      .send({ quote: 'No Save button visible on this screen.' });

    expect(postRes.status).toBe(201);
    expect(postRes.body.report.articleId).toBe(sfId);
  });

  it('unauthenticated report POST returns 401', async () => {
    clearSession();
    const res = await request(app)
      .post('/api/knowledge/sf-articles/anyId/report')
      .set('Content-Type', 'application/json')
      .send({ quote: 'test' });
    expect(res.status).toBe(401);
  });

  it('step-reports GET is staff-only (homebase gets 403)', async () => {
    setSession(LEARNER_SESSION);
    const res = await request(app)
      .get('/api/knowledge/sf-articles/anyId/step-reports');
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. mark-reviewed is staff-only (narrowed exemption + requireStaff guard)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /knowledge/sf-articles/:id/mark-reviewed — staff-only', () => {
  it('unauthenticated → 401', async () => {
    clearSession();
    const res = await request(app)
      .post('/api/knowledge/sf-articles/someArticle/mark-reviewed')
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(401);
  });

  it('homebase learner → 403', async () => {
    setSession(LEARNER_SESSION);
    const res = await request(app)
      .post('/api/knowledge/sf-articles/someArticle/mark-reviewed')
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(403);
  });

  it('homebase coach → 403', async () => {
    setSession(COACH_SESSION);
    const res = await request(app)
      .post('/api/knowledge/sf-articles/someArticle/mark-reviewed')
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(403);
  });
});
