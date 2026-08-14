/**
 * sfArticleRecallCycle.test.ts
 *
 * Integration test for the full recall → submit → approve → publish-to-sf
 * cycle for SF-originated articles.
 *
 * Critical invariants verified:
 *   (a) sfArticleId equals the original Salesforce KnowledgeArticleId after
 *       re-publishing — it must not be cleared or replaced.
 *   (b) sfVersionId is updated to the newly created __kav version returned by
 *       the mock SF client.
 *   (c) The actual POST body sent to Salesforce includes KnowledgeArticleId so
 *       SF links the new version to the existing article record (no duplicate).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Article type used across mocks and tests ──────────────────────────────────

type ArticleStatus = 'draft' | 'pending-review' | 'approved' | 'published';

interface ArticleRow {
  id: string;
  title: string;
  status: ArticleStatus;
  sfArticleId: string | null;
  sfVersionId: string | null;
  sfPublishStatus: string | null;
  body: string | null;
  summary: string | null;
  urlName: string | null;
  articleType: string | null;
  dataCategoryGroup: string | null;
  dataCategory: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  submittedAt: Date | null;
  publishedAt: Date | null;
  updatedAt: Date;
}

// ── Hoisted refs (accessible inside vi.mock factories) ────────────────────────

const {
  mockSelectWhere, mockStepsOrderBy, mockSetFn, mockInsertValues, capturedSfPostBodies,
  ARTICLES_TABLE_SENTINEL, STEPS_TABLE_SENTINEL,
} = vi.hoisted(() => {
  // Sentinel symbols used by the db.select().from() mock to identify which table
  // is being queried and return the appropriate chain.
  // Must live inside vi.hoisted() so they are accessible in vi.mock() factories.
  const ARTICLES_TABLE_SENTINEL = Symbol('knowledgeArticlesTable');
  const STEPS_TABLE_SENTINEL    = Symbol('articleProcedureStepsTable');

  // Tracks every body sent to Salesforce via POST so tests can assert the payload.
  const capturedSfPostBodies: Record<string, unknown>[] = [];

  // select().from(knowledgeArticlesTable).where()
  const mockSelectWhere = vi.fn();

  // select().from(articleProcedureStepsTable).where().orderBy()
  // Returns empty steps by default → Penny checks produce zero required findings.
  const mockStepsOrderBy = vi.fn().mockResolvedValue([]);

  // update().set(patch) — must be re-implemented per test (see beforeEach)
  const mockSetFn = vi.fn();

  const mockInsertValues = vi.fn().mockResolvedValue([]);

  return {
    mockSelectWhere, mockStepsOrderBy, mockSetFn, mockInsertValues, capturedSfPostBodies,
    ARTICLES_TABLE_SENTINEL, STEPS_TABLE_SENTINEL,
  };
});

// ── Auth middleware stub ───────────────────────────────────────────────────────

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireSuperAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireHomebaseAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:        () => true,
  isAdmin:        () => true,
  isSuperAdmin:   () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
  effectiveIdentityMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ── Session store stub ─────────────────────────────────────────────────────────

vi.mock('connect-pg-simple', () => ({
  default: () => class FakePgStore {
    on() {}
    get(_sid: string, cb: (err: null, s: null) => void) { cb(null, null); }
    set(_sid: string, _s: unknown, cb: () => void) { cb(); }
    destroy(_sid: string, cb: () => void) { cb(); }
  },
}));

// ── DB mock ────────────────────────────────────────────────────────────────────

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: { _sentinel?: symbol }) => {
        if (table?._sentinel === STEPS_TABLE_SENTINEL) {
          // Procedure-steps query: .where().orderBy() → empty steps by default
          return { where: vi.fn(() => ({ orderBy: mockStepsOrderBy })) };
        }
        // All other tables (including articles): .where() → mockSelectWhere
        return { where: mockSelectWhere };
      }),
    })),
    update: vi.fn(() => ({ set: mockSetFn })),
    insert: vi.fn(() => ({ values: mockInsertValues })),
  },
}));

vi.mock('@workspace/db/schema', () => {
  const col = (name: string) => ({ name });
  return {
    knowledgeArticlesTable: {
      _sentinel:         ARTICLES_TABLE_SENTINEL,
      id: col('id'), title: col('title'), status: col('status'),
      sfArticleId: col('sf_article_id'), sfVersionId: col('sf_version_id'),
      sfPublishStatus: col('sf_publish_status'), body: col('body'),
      summary: col('summary'), urlName: col('url_name'),
      articleType: col('article_type'), dataCategoryGroup: col('data_category_group'),
      dataCategory: col('data_category'), reviewedBy: col('reviewed_by'),
      reviewedAt: col('reviewed_at'), reviewNote: col('review_note'),
      submittedAt: col('submitted_at'), publishedAt: col('published_at'),
      updatedAt: col('updated_at'),
    },
    articleProcedureStepsTable: {
      _sentinel:    STEPS_TABLE_SENTINEL,
      id:           col('id'),
      articleId:    col('article_id'),
      sequence:     col('sequence'),
      instruction:  col('instruction'),
      verifyLine:   col('verify_line'),
      directUrl:    col('direct_url'),
      updatedAt:    col('updated_at'),
    },
    knowledgeSourcesTable: { id: col('id'), data: col('data'), updatedAt: col('updated_at') },
    knowledgeDocumentsTable: { id: col('id') },
    articleReviewsTable: { id: col('id'), reviewedAt: col('reviewed_at'), reviewedBy: col('reviewed_by'), nextReviewDue: col('next_review_due') },
    sfSyncSettingsTable: {
      id: col('id'), enabled: col('enabled'), intervalHours: col('interval_hours'),
    },
    trailOsAuditLogTable: { _: { name: 'trail_os_audit_log' } },
  };
});

vi.mock('drizzle-orm', () => ({
  eq:      vi.fn().mockReturnValue('eq-expr'),
  desc:    vi.fn().mockReturnValue('desc-expr'),
  asc:     vi.fn().mockReturnValue('asc-expr'),
  inArray: vi.fn().mockReturnValue('in-expr'),
  or:      vi.fn().mockReturnValue('or-expr'),
}));

// ── Salesforce connector mock ──────────────────────────────────────────────────
//
// Handles all five interaction patterns used by publish-to-sf:
//   1. EntityDefinition SOQL  → getKavAllBodyFields discovery
//   2. Knowledge__kav describe → body field discovery
//   3. POST /sobjects/Knowledge__kav → create __kav version (body is captured)
//   4. PATCH /sobjects/Knowledge__kav/:id → publish Online (204)
//
// Every POST body is decoded and stored in capturedSfPostBodies so tests can
// assert the payload (specifically that KnowledgeArticleId is present).

const NEW_SF_VERSION_ID = 'kav-newly-created-version-001';

vi.mock('@replit/connectors-sdk', () => {
  class ReplitConnectors {
    getProxyUrl() { return 'https://mock-sf-proxy.test'; }

    createProxyFetch(_connectionId: string) {
      return async function mockProxyFetch(url: string, init?: RequestInit): Promise<Response> {
        const method = (init?.method ?? 'GET').toUpperCase();

        // ── EntityDefinition SOQL ─────────────────────────────────────────────
        if (method === 'GET' && url.includes('/query') && url.includes('EntityDefinition')) {
          return makeJsonResponse(200, {
            totalSize: 1, done: true,
            records: [{ QualifiedApiName: 'Knowledge__kav' }],
          });
        }

        // ── Generic SOQL (empty result) ───────────────────────────────────────
        if (method === 'GET' && url.includes('/query')) {
          return makeJsonResponse(200, { totalSize: 0, done: true, records: [] });
        }

        // ── Describe Knowledge__kav ───────────────────────────────────────────
        if (method === 'GET' && url.includes('Knowledge__kav/describe')) {
          return makeJsonResponse(200, {
            fields: [
              { name: 'Body__c', type: 'richtextarea', label: 'Body'     },
              { name: 'Title',   type: 'string',       label: 'Title'    },
              { name: 'UrlName', type: 'string',       label: 'URL Name' },
              { name: 'Summary', type: 'string',       label: 'Summary'  },
            ],
          });
        }

        // ── createRecord: POST to the __kav sobject ───────────────────────────
        if (method === 'POST' && url.includes('/sobjects/Knowledge__kav')) {
          // Decode and store the body so tests can assert its contents.
          try {
            const parsed = JSON.parse((init?.body ?? '{}') as string) as Record<string, unknown>;
            capturedSfPostBodies.push(parsed);
          } catch {
            capturedSfPostBodies.push({ _parseError: true });
          }
          return makeJsonResponse(201, { id: NEW_SF_VERSION_ID, success: true, errors: [] });
        }

        // ── updateRecord: PATCH PublishStatus → Online (204 No Content) ───────
        if (method === 'PATCH' && url.includes('/sobjects/Knowledge__kav/')) {
          return { ok: true, status: 204, json: async () => undefined } as Response;
        }

        // ── Fallback ──────────────────────────────────────────────────────────
        return makeJsonResponse(404, { error: `Unmapped mock SF URL: ${method} ${url}` }, false);
      };
    }
  }

  function makeJsonResponse(status: number, body: unknown, ok = true): Response {
    return {
      ok,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response;
  }

  return { ReplitConnectors };
});

// ── Import app after all mocks are registered ─────────────────────────────────

import { resetKavBodyInfoCachesForTest } from '../routes/knowledge.js';
import app from '../app.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ARTICLE_ID         = 'art-recall-cycle-test-001';
const ORIGINAL_SF_ART_ID = 'ka-original-salesforce-ka-id';
const ORIGINAL_SF_VER_ID = 'kav-original-version-before-recall';

function makeArticle(overrides: Partial<ArticleRow> = {}): ArticleRow {
  return {
    id:                ARTICLE_ID,
    title:             'Recall Cycle Test Article',
    status:            'published',
    sfArticleId:       ORIGINAL_SF_ART_ID,
    sfVersionId:       ORIGINAL_SF_VER_ID,
    sfPublishStatus:   'Online',
    body:              '<p>Article body content</p>',
    summary:           'Article summary',
    urlName:           'recall-cycle-test',
    articleType:       'Knowledge__kav',
    dataCategoryGroup: null,
    dataCategory:      null,
    reviewedBy:        null,
    reviewedAt:        null,
    reviewNote:        null,
    submittedAt:       null,
    publishedAt:       new Date('2025-01-01T00:00:00Z'),
    updatedAt:         new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Configures the DB mocks so the article row mutates in place as each endpoint
 * runs, simulating a real persistent store through the lifecycle.
 */
function configureStatefulMocks(initial: ArticleRow): { getRow: () => ArticleRow } {
  let row = { ...initial };

  mockSelectWhere.mockImplementation(() => Promise.resolve([row]));

  mockSetFn.mockImplementation((patch: Partial<ArticleRow>) => ({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockImplementation(() => {
        row = { ...row, ...patch };
        return Promise.resolve([row]);
      }),
    }),
  }));

  return { getRow: () => row };
}

beforeEach(() => {
  resetKavBodyInfoCachesForTest();
  capturedSfPostBodies.length = 0;
  mockSelectWhere.mockReset();
  mockStepsOrderBy.mockReset();
  mockStepsOrderBy.mockResolvedValue([]);  // default: no steps → Penny checks pass
  mockSetFn.mockReset();
  mockInsertValues.mockReset();
  mockInsertValues.mockResolvedValue([]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Full recall → submit → approve → publish-to-sf cycle
// ─────────────────────────────────────────────────────────────────────────────

describe('SF article recall → re-publish cycle', () => {

  test('sfArticleId is preserved, sfVersionId is updated, and KnowledgeArticleId is in the SF payload', async () => {
    const { getRow } = configureStatefulMocks(makeArticle({ status: 'published' }));

    // ── Step 1: RECALL ─────────────────────────────────────────────────────
    {
      const res = await request(app)
        .post(`/api/knowledge/articles/${ARTICLE_ID}/recall`);

      expect(res.status).toBe(200);
      expect(res.body.article.status).toBe('draft');
      // SF IDs must survive the recall
      expect(getRow().sfArticleId).toBe(ORIGINAL_SF_ART_ID);
      expect(getRow().sfVersionId).toBe(ORIGINAL_SF_VER_ID);
    }

    // ── Step 2: SUBMIT for review ──────────────────────────────────────────
    {
      const res = await request(app)
        .post(`/api/knowledge/articles/${ARTICLE_ID}/submit`);

      expect(res.status).toBe(200);
      expect(res.body.article.status).toBe('pending-review');
      expect(getRow().sfArticleId).toBe(ORIGINAL_SF_ART_ID);
    }

    // ── Step 3: APPROVE ────────────────────────────────────────────────────
    {
      const res = await request(app)
        .post(`/api/knowledge/articles/${ARTICLE_ID}/approve`);

      expect(res.status).toBe(200);
      expect(res.body.article.status).toBe('approved');
      expect(getRow().sfArticleId).toBe(ORIGINAL_SF_ART_ID);
    }

    // ── Step 4: PUBLISH TO SF ──────────────────────────────────────────────
    {
      const res = await request(app)
        .post(`/api/knowledge/articles/${ARTICLE_ID}/publish-to-sf`);

      expect(res.status).toBe(200);

      const published = res.body.article as ArticleRow;

      // (a) Original KnowledgeArticleId is preserved in the DB row
      expect(published.sfArticleId).toBe(ORIGINAL_SF_ART_ID);
      expect(getRow().sfArticleId).toBe(ORIGINAL_SF_ART_ID);

      // (b) Version ID is updated to the newly created __kav record
      expect(published.sfVersionId).toBe(NEW_SF_VERSION_ID);
      expect(published.sfVersionId).not.toBe(ORIGINAL_SF_VER_ID);
      expect(getRow().sfVersionId).toBe(NEW_SF_VERSION_ID);

      // Status is published
      expect(published.status).toBe('published');

      // (c) The POST body sent to Salesforce contains KnowledgeArticleId so SF
      //     links the new version to the existing article, not a new one.
      //     capturedSfPostBodies[0] is from the __kav createRecord call.
      expect(capturedSfPostBodies).toHaveLength(1);
      const sfPayload = capturedSfPostBodies[0]!;
      expect(sfPayload['KnowledgeArticleId']).toBe(ORIGINAL_SF_ART_ID);
    }
  });

  // ── Guard: recall blocked when sfArticleId is absent ─────────────────────

  test('recall is rejected (409) when the article has no sfArticleId', async () => {
    mockSelectWhere.mockResolvedValue([makeArticle({ status: 'published', sfArticleId: null })]);

    const res = await request(app)
      .post(`/api/knowledge/articles/${ARTICLE_ID}/recall`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/no Salesforce link/i);
  });

  // ── Guard: recall blocked when article is not published ───────────────────

  test('recall is rejected (409) when the article status is not published', async () => {
    mockSelectWhere.mockResolvedValue([makeArticle({ status: 'draft', sfArticleId: ORIGINAL_SF_ART_ID })]);

    const res = await request(app)
      .post(`/api/knowledge/articles/${ARTICLE_ID}/recall`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/must be 'published'/i);
  });

  // ── Payload guard: KnowledgeArticleId present for SF-originated articles ──
  //
  // Independently verifies that publish-to-sf includes KnowledgeArticleId in the
  // Salesforce POST body when the article has an sfArticleId set, even without
  // running the full recall cycle first.

  test('publish-to-sf sends KnowledgeArticleId in the SF payload for SF-originated articles', async () => {
    configureStatefulMocks(makeArticle({ status: 'approved', sfVersionId: ORIGINAL_SF_VER_ID }));

    const res = await request(app)
      .post(`/api/knowledge/articles/${ARTICLE_ID}/publish-to-sf`);

    expect(res.status).toBe(200);

    // Exactly one POST was made to the __kav sobject
    expect(capturedSfPostBodies).toHaveLength(1);
    const sfPayload = capturedSfPostBodies[0]!;

    // KnowledgeArticleId links the new version to the existing SF article record.
    // Without this field, Salesforce creates a brand-new, duplicate article.
    expect(sfPayload['KnowledgeArticleId']).toBe(ORIGINAL_SF_ART_ID);
  });

  // ── Penny gate: approve blocked when required findings exist ──────────────
  //
  // Simulates a step with a named-person reference and no verify line.
  // Approval must return 409 with requiredCount, not advance status.

  test('approve is rejected (409) when the article has required Penny findings', async () => {
    mockSelectWhere.mockResolvedValue([makeArticle({ status: 'pending-review' })]);
    // Return one step that has both required findings: no verifyLine + named person
    mockStepsOrderBy.mockResolvedValue([{
      id:          'step-001',
      sequence:    1,
      instruction: 'Contact John Smith to get access.',
      verifyLine:  null,   // missing → no-verify-line (required)
      directUrl:   null,
    }]);

    const res = await request(app)
      .post(`/api/knowledge/articles/${ARTICLE_ID}/approve`);

    expect(res.status).toBe(409);
    expect(res.body.requiredCount).toBeGreaterThan(0);
    expect(res.body.error).toMatch(/required.*Penny finding/i);
  });

  // ── Penny gate: approve succeeds when all required findings are cleared ────

  test('approve succeeds (200) when the article has no required Penny findings', async () => {
    configureStatefulMocks(makeArticle({ status: 'pending-review' }));
    // Step with a verify line and no named person → no required findings
    mockStepsOrderBy.mockResolvedValue([{
      id:          'step-001',
      sequence:    1,
      instruction: 'Navigate to Setup > Objects.',
      verifyLine:  'You should see the Object Manager page.',
      directUrl:   null,
    }]);

    const res = await request(app)
      .post(`/api/knowledge/articles/${ARTICLE_ID}/approve`);

    expect(res.status).toBe(200);
    expect(res.body.article.status).toBe('approved');
  });

  // ── Penny gate: publish-to-sf blocked when required findings exist ─────────
  //
  // Guards against post-approval step edits reaching Salesforce.

  test('publish-to-sf is rejected (409) when the article has required Penny findings post-approval', async () => {
    mockSelectWhere.mockResolvedValue([makeArticle({ status: 'approved' })]);
    // Step edited after approval: missing verify line
    mockStepsOrderBy.mockResolvedValue([{
      id:          'step-001',
      sequence:    1,
      instruction: 'Click Save.',
      verifyLine:  null,   // no-verify-line (required)
      directUrl:   null,
    }]);

    const res = await request(app)
      .post(`/api/knowledge/articles/${ARTICLE_ID}/publish-to-sf`);

    expect(res.status).toBe(409);
    expect(res.body.requiredCount).toBeGreaterThan(0);
    expect(res.body.error).toMatch(/required.*Penny finding/i);
  });
});
