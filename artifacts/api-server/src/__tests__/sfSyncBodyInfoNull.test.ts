/**
 * sfSyncBodyInfoNull.test.ts
 *
 * Integration-level regression test for the SF article sync route when
 * `getKavAllBodyFields` returns null (Salesforce body-field discovery fails
 * or the org has no __kav objects).
 *
 * Regression: before the fix, when body discovery returned null, the sync
 * continued and wrote an empty body to every existing article in the DB,
 * silently erasing previously-synced local content. The fix marks all
 * selected kaIds as body-fetch-failed so existing bodies are preserved.
 *
 * This test verifies:
 *   1. The sync completes successfully (200 OK) even when body info is null.
 *   2. A pre-existing article's body is NOT overwritten with an empty string
 *      — db.update().set() must not contain a `body` key for the article.
 *   3. `bodyFetchErrors` is reported as > 0 in the response.
 *   4. A brand-new article (not previously in the DB) is inserted with an
 *      empty body (no prior content to preserve — this is acceptable and
 *      explicitly surfaced via the bodyFetchErrors counter).
 *
 * Architecture: the test mounts only the knowledge router on a minimal
 * express app (no app.ts — which requires SESSION_SECRET and a real DB
 * connection) and injects a fake session and pino-compatible logger so
 * all route internals that rely on req.session / req.log work normally.
 */

import { describe, test, expect, vi, beforeAll, beforeEach } from 'vitest';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// ── DB mock ────────────────────────────────────────────────────────────────────
//
// Captures arguments passed to db.update().set() so tests can assert that
// the `body` field is omitted when body-info discovery fails.
//
// The mock chain mirrors drizzle's fluent API:
//   db.select(...).from(...).where(...)  → whereForSelect (configurable per-call)
//   db.update(...).set(...)             → captures setObj, returns { where }
//   db.insert(...).values(...)          → no-op resolve

const capturedUpdateSets: Record<string, unknown>[] = [];

// vi.mock hoisting: ALL values used inside vi.mock factories must be declared
// in vi.hoisted() because vi.mock factories are hoisted to the top of the file,
// before any const/let declarations.
const { whereForSelectFn, KAV_RECORD } = vi.hoisted(() => {
  const whereForSelectFn = vi.fn();
  const KAV_RECORD = {
    Id:                 'kav0001',
    KnowledgeArticleId: 'ka0001',
    Title:              'How to Apply for Benefits',
    Summary:            'Step-by-step guide',
    ArticleType:        'Knowledge__kav',
    PublishStatus:      'online',
    VersionNumber:      3,
    LastModifiedDate:   '2025-06-01T12:00:00Z',
    CreatedDate:        '2024-01-01T00:00:00Z',
    UrlName:            'how-to-apply-for-benefits',
  };
  return { whereForSelectFn, KAV_RECORD };
});

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: whereForSelectFn }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockImplementation((setObj: Record<string, unknown>) => {
        capturedUpdateSets.push({ ...setObj });
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
  },
}));

// Schema mock: provide the table object with enough shape for column references
vi.mock('@workspace/db/schema', () => ({
  knowledgeArticlesTable: {
    id:              'id',
    sfArticleId:     'sf_article_id',
    sfVersionId:     'sf_version_id',
    sfPublishStatus: 'sf_publish_status',
    status:          'status',
    title:           'title',
    summary:         'summary',
    body:            'body',
    urlName:         'url_name',
    articleType:     'article_type',
    category:        'category',
    publishedAt:     'published_at',
    createdAt:       'created_at',
    updatedAt:       'updated_at',
    dataCategoryGroup: 'data_category_group',
    dataCategory:    'data_category',
  },
  // Other tables imported by the knowledge route must be present to avoid import errors
  knowledgeDocumentsTable: {},
  knowledgeSourcesTable:   {},
  articleReviewsTable:     {},
  trailOsAuditLogTable:    { _: { name: 'trail_os_audit_log' } },
}));

// drizzle-orm helpers: stub query-builder functions so they don't crash when
// called with the plain-object schema columns above
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    inArray: vi.fn(() => 'inArray-stub'),
    eq:      vi.fn(() => 'eq-stub'),
    and:     vi.fn(() => 'and-stub'),
    or:      vi.fn(() => 'or-stub'),
    desc:    vi.fn(() => 'desc-stub'),
    asc:     vi.fn(() => 'asc-stub'),
  };
});

// ── ConnectorSalesforceClient mock ────────────────────────────────────────────
//
// Controls what Salesforce returns so body-info discovery returns null:
//   rest()     → throws (getKavFieldSet falls back to minimal field set — OK)
//   query()    → EntityDefinition returns empty → bodyInfo = null
//   queryAll() → one KnowledgeArticleVersion record for the metadata SOQL

vi.mock('../lib/connectorSalesforceClient.js', () => {
  const mockRest         = vi.fn().mockRejectedValue(new Error('describe unavailable'));
  const mockQuery        = vi.fn().mockResolvedValue({ totalSize: 0, done: true, records: [] });
  const mockQueryAll     = vi.fn().mockResolvedValue([KAV_RECORD]);
  const mockGetOrgBaseUrl = vi.fn().mockResolvedValue('https://test.salesforce.com');

  // Use a regular function (not arrow) so `new ConnectorSalesforceClient()` works
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function ConnectorSalesforceClient(this: any) {
    this.rest          = mockRest;
    this.query         = mockQuery;
    this.queryAll      = mockQueryAll;
    this.getOrgBaseUrl = mockGetOrgBaseUrl;
  }

  return { ConnectorSalesforceClient };
});

// ── Imports after mocks ────────────────────────────────────────────────────────

import knowledgeRouter, { resetKavBodyInfoCachesForTest } from '../routes/knowledge.js';

// ── Minimal test express app ───────────────────────────────────────────────────
//
// Mirrors the pattern in sfCacheIsolation.test.ts: mount only the knowledge
// router on a lightweight express app so we avoid app.ts's SESSION_SECRET
// requirement and real Postgres connection.  A fake session middleware injects
// admin credentials so requireAdmin passes.

const ADMIN_GROUP = 'trailosadmin@transitiontrails.org';

let testApp: Express;

beforeAll(() => {
  process.env['GOOGLE_GROUP_ADMIN']    = ADMIN_GROUP;
  process.env['GOOGLE_GROUP_EVERYDAY'] = 'trailosusers@transitiontrails.org';

  testApp = express();
  testApp.use(express.json());

  // Inject a pino-compatible no-op logger so req.log.warn / req.log.error work
  testApp.use((req: Request, _res: Response, next: NextFunction) => {
    (req as unknown as Record<string, unknown>)['log'] = {
      info:  () => {},
      warn:  () => {},
      error: () => {},
      debug: () => {},
    };
    next();
  });

  // Inject admin session so requireAdmin middleware passes
  testApp.use((req: Request, _res: Response, next: NextFunction) => {
    req.session = {
      googleEmail:  'admin@transitiontrails.org',
      googleGroups: [ADMIN_GROUP],
      save:    (cb?: (err?: unknown) => void) => { cb?.(); },
      destroy: (cb?: (err?: unknown) => void) => { cb?.(); },
      reload:  (cb?: (err?: unknown) => void) => { cb?.(); },
      id:      'test-session-id',
      cookie:  {} as import('express-session').Cookie,
    } as unknown as import('express').Request['session'];
    next();
  });

  testApp.use('/', knowledgeRouter);
});

// ── Shared setup per test ──────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  capturedUpdateSets.length = 0;
  // Reset module-level KAV discovery caches so each test starts with a clean slate
  resetKavBodyInfoCachesForTest();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('POST /knowledge/sf-articles/sync — bodyInfo null (discovery failure)', () => {

  test('REGRESSION: existing article body is NOT overwritten when body-field discovery fails', async () => {
    // byPkRows: article found by primary key (previously synced or authored locally)
    // bySfIdRows: no Trail OS articles linked to this kaId
    whereForSelectFn
      .mockResolvedValueOnce([{ id: 'ka0001', status: 'published' }])   // byPkRows
      .mockResolvedValueOnce([]);                                          // bySfIdRows

    const res = await request(testApp)
      .post('/knowledge/sf-articles/sync')
      .send({});

    expect({ status: res.status, err: res.body?.error }).toMatchObject({ status: 200 });

    // ── Core regression assertion ──────────────────────────────────────────────
    // db.update().set() must have been called once (for the existing article)
    expect(capturedUpdateSets).toHaveLength(1);
    const setObj = capturedUpdateSets[0]!;

    // The `body` key must NOT appear in the update when bodyInfo is null.
    // Before the fix, this would erase the existing body with an empty string.
    expect(Object.prototype.hasOwnProperty.call(setObj, 'body')).toBe(false);

    // Other metadata fields should still be refreshed
    expect(setObj['title']).toBeDefined();
    expect(setObj['sfVersionId']).toBeDefined();
  });

  test('bodyFetchErrors > 0 and bodyFetchWarning are present in the response when discovery fails', async () => {
    whereForSelectFn
      .mockResolvedValueOnce([{ id: 'ka0001', status: 'published' }])
      .mockResolvedValueOnce([]);

    const res = await request(testApp)
      .post('/knowledge/sf-articles/sync')
      .send({});

    expect(res.status).toBe(200);

    // The caller must be informed that body content could not be fetched
    expect(typeof res.body.bodyFetchErrors).toBe('number');
    expect(res.body.bodyFetchErrors).toBeGreaterThan(0);
    expect(typeof res.body.bodyFetchWarning).toBe('string');
    expect(res.body.bodyFetchWarning.length).toBeGreaterThan(0);
  });

  test('a brand-new article is inserted (with empty body) even when body discovery fails', async () => {
    // Neither lookup finds the article — it is brand new to Trail OS
    whereForSelectFn
      .mockResolvedValueOnce([])  // byPkRows: not found by pk
      .mockResolvedValueOnce([]); // bySfIdRows: no Trail OS match

    const { db } = await import('@workspace/db');

    const res = await request(testApp)
      .post('/knowledge/sf-articles/sync')
      .send({});

    expect(res.status).toBe(200);
    // Insert should be called once for the new article
    expect(vi.mocked(db.insert)).toHaveBeenCalledOnce();
    // No update should occur (nothing pre-existed)
    expect(capturedUpdateSets).toHaveLength(0);
    // Caller is still informed via bodyFetchErrors
    expect(res.body.bodyFetchErrors).toBeGreaterThan(0);
  });

  test('response counters: updated=1 and created=0 for one existing article', async () => {
    whereForSelectFn
      .mockResolvedValueOnce([{ id: 'ka0001', status: 'published' }])
      .mockResolvedValueOnce([]);

    const res = await request(testApp)
      .post('/knowledge/sf-articles/sync')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(1);
    expect(res.body.created).toBe(0);
    expect(res.body.bodyFetchErrors).toBeGreaterThan(0);
  });
});
