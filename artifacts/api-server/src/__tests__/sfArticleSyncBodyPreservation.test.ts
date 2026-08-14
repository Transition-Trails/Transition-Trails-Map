/**
 * sfArticleSyncBodyPreservation.test.ts
 *
 * Confirms that `runSfArticleSync` (the function shared by the manual-sync
 * HTTP route AND the background job) preserves article bodies for records in
 * 'pending-review' or 'approved' state, while correctly creating new articles
 * and fully refreshing existing non-review articles.
 *
 * This is the end-to-end confirmation referenced in the knowledge.ts comment:
 *   "Articles in 'pending-review' or 'approved' state have their body and
 *    status preserved — only SF metadata is refreshed."
 *
 * Architecture: calls runSfArticleSync() directly (as the background job does)
 * with a fully mocked SF client and DB.  No HTTP layer, no app.ts.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ── Captured call arguments ───────────────────────────────────────────────────

const capturedInserts: Record<string, unknown>[] = [];
const capturedUpdates: Record<string, unknown>[] = [];

// ── vi.hoisted: constants + mock fns shared between factory and test body ─────
//
// vi.mock factories are hoisted above all imports, so any values the factory
// needs that are also used in test bodies MUST be declared in vi.hoisted().

const {
  mockQueryAll,
  mockRest,
  mockQuery,
  mockGetOrgBaseUrl,
  whereForSelectFn,
  KAV_RECORDS,
  BODY_ROWS,
  SF_BODY_PENDING,
  SF_BODY_NEW,
  SF_BODY_EXISTING,
} = vi.hoisted(() => {
  // ── Body content strings ────────────────────────────────────────────────
  const SF_BODY_PENDING  = '<p>SF body — pending-review article</p>';
  const SF_BODY_NEW      = '<p>SF body — brand-new article</p>';
  const SF_BODY_EXISTING = '<p>SF body — existing published article</p>';

  // ── Three KAV records that SF returns in the main SOQL ─────────────────
  const KAV_RECORDS = [
    {
      Id:                 'kav-pending',
      KnowledgeArticleId: 'ka-pending',
      Title:              'Article In Review',
      Summary:            'A summary',
      ArticleType:        'Knowledge__kav',
      PublishStatus:      'online',
      VersionNumber:      2,
      CreatedDate:        '2024-01-01T00:00:00Z',
      LastModifiedDate:   '2025-06-01T12:00:00Z',
      UrlName:            'article-in-review',
    },
    {
      Id:                 'kav-new',
      KnowledgeArticleId: 'ka-new',
      Title:              'Brand New Article',
      Summary:            'New summary',
      ArticleType:        'Knowledge__kav',
      PublishStatus:      'online',
      VersionNumber:      1,
      CreatedDate:        '2025-07-01T00:00:00Z',
      LastModifiedDate:   '2025-07-15T10:00:00Z',
      UrlName:            'brand-new-article',
    },
    {
      Id:                 'kav-existing',
      KnowledgeArticleId: 'ka-existing',
      Title:              'Existing Published Article',
      Summary:            'Published summary',
      ArticleType:        'Knowledge__kav',
      PublishStatus:      'online',
      VersionNumber:      5,
      CreatedDate:        '2023-06-01T00:00:00Z',
      LastModifiedDate:   '2025-08-01T08:00:00Z',
      UrlName:            'existing-published-article',
    },
  ];

  // ── Body rows returned by the second client.queryAll() (body batch SOQL) ─
  const BODY_ROWS = [
    { Id: 'kav-pending',  'Body__c': SF_BODY_PENDING  },
    { Id: 'kav-new',      'Body__c': SF_BODY_NEW      },
    { Id: 'kav-existing', 'Body__c': SF_BODY_EXISTING },
  ];

  // ── Shared mock functions (reusable across factory + beforeEach) ─────────
  const whereForSelectFn = vi.fn();

  // queryAll is called twice per sync run:
  //   call 1 — main KAV SOQL  → KAV_RECORDS
  //   call 2 — body batch SOQL → BODY_ROWS
  // The sequence is set up in beforeEach after vi.clearAllMocks().
  const mockQueryAll     = vi.fn();

  // rest() is called with different URL paths — use mockImplementation.
  // The implementation survives vi.clearAllMocks() because clearAllMocks only
  // clears call history and queued once-values, NOT permanent implementations.
  const mockRest = vi.fn().mockImplementation((path: string) => {
    if (path.includes('KnowledgeArticleVersion')) {
      return Promise.resolve({
        fields: [
          { name: 'Id'                 },
          { name: 'KnowledgeArticleId' },
          { name: 'Title'              },
          { name: 'Summary'            },
          { name: 'ArticleType'        },
          { name: 'PublishStatus'      },
          { name: 'VersionNumber'      },
          { name: 'CreatedDate'        },
          { name: 'LastModifiedDate'   },
          { name: 'UrlName'            },
        ],
      });
    }
    if (path.includes('Knowledge__kav')) {
      return Promise.resolve({
        fields: [
          { name: 'Id',      type: 'id',          label: 'Record ID' },
          { name: 'Title',   type: 'string',       label: 'Title'     },
          { name: 'Body__c', type: 'richTextArea', label: 'Body'      },
          { name: 'Summary', type: 'string',       label: 'Summary'   },
        ],
      });
    }
    return Promise.reject(new Error(`Unexpected rest() path: ${path}`));
  });

  // query() is called once per sync for the EntityDefinition SOQL.
  const mockQuery = vi.fn().mockImplementation(() =>
    Promise.resolve({
      totalSize: 1,
      done:      true,
      records:   [{ QualifiedApiName: 'Knowledge__kav' }],
    }),
  );

  const mockGetOrgBaseUrl = vi.fn().mockResolvedValue('https://test.salesforce.com');

  return {
    mockQueryAll,
    mockRest,
    mockQuery,
    mockGetOrgBaseUrl,
    whereForSelectFn,
    KAV_RECORDS,
    BODY_ROWS,
    SF_BODY_PENDING,
    SF_BODY_NEW,
    SF_BODY_EXISTING,
  };
});

// ── DB mock ───────────────────────────────────────────────────────────────────

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    // select().from().where() is called twice in runSfArticleSync:
    //   call 1 (byPkRows)   — rows found by id IN sfArticleIds
    //   call 2 (bySfIdRows) — rows found by sfArticleId IN sfArticleIds
    // Return values are queued in beforeEach via mockResolvedValueOnce.
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: whereForSelectFn }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockImplementation((setObj: Record<string, unknown>) => ({
        where: vi.fn().mockImplementation(() => {
          capturedUpdates.push({ ...setObj });
          return Promise.resolve([]);
        }),
      })),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
        capturedInserts.push({ ...vals });
        return Promise.resolve([]);
      }),
    }),
  },
}));

// ── Schema mock ───────────────────────────────────────────────────────────────

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
    reviewNote:      'review_note',
    submittedAt:     'submitted_at',
    reviewedBy:      'reviewed_by',
    reviewedAt:      'reviewed_at',
  },
  knowledgeDocumentsTable: {},
  knowledgeSourcesTable:   {},
  articleReviewsTable:     {},
  sfSyncSettingsTable:     { id: 'id', enabled: 'enabled', intervalHours: 'interval_hours' },
  trailOsAuditLogTable:    { _: { name: 'trail_os_audit_log' } },
}));

// ── drizzle-orm helpers ────────────────────────────────────────────────────────

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

vi.mock('../lib/connectorSalesforceClient.js', () => {
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

import { runSfArticleSync, resetKavBodyInfoCachesForTest } from '../routes/knowledge.js';

// ── No-op logger ──────────────────────────────────────────────────────────────

const noopLog = {
  info:  (_obj: object | string, _msg?: string) => {},
  warn:  (_obj: object | string, _msg?: string) => {},
  error: (_obj: object | string, _msg?: string) => {},
};

// ── Standard DB state for the three-article scenario ─────────────────────────
//
// byPkRows   — ka-pending (pending-review) and ka-existing (published) exist
// bySfIdRows — no Trail OS-authored articles linked to these kaIds

function setupStandardDbState(pendingStatus: 'pending-review' | 'approved' = 'pending-review'): void {
  whereForSelectFn
    .mockResolvedValueOnce([
      { id: 'ka-pending',  status: pendingStatus },
      { id: 'ka-existing', status: 'published'   },
    ])
    .mockResolvedValueOnce([]); // bySfIdRows
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  capturedInserts.length = 0;
  capturedUpdates.length = 0;
  resetKavBodyInfoCachesForTest();

  // Restore permanent mockImplementation on mockRest after clearAllMocks.
  // clearAllMocks() removes mockImplementation, so we must re-apply it.
  mockRest.mockImplementation((path: string) => {
    if (path.includes('KnowledgeArticleVersion')) {
      return Promise.resolve({
        fields: [
          { name: 'Id'                 },
          { name: 'KnowledgeArticleId' },
          { name: 'Title'              },
          { name: 'Summary'            },
          { name: 'ArticleType'        },
          { name: 'PublishStatus'      },
          { name: 'VersionNumber'      },
          { name: 'CreatedDate'        },
          { name: 'LastModifiedDate'   },
          { name: 'UrlName'            },
        ],
      });
    }
    if (path.includes('Knowledge__kav')) {
      return Promise.resolve({
        fields: [
          { name: 'Id',      type: 'id',          label: 'Record ID' },
          { name: 'Title',   type: 'string',       label: 'Title'     },
          { name: 'Body__c', type: 'richTextArea', label: 'Body'      },
          { name: 'Summary', type: 'string',       label: 'Summary'   },
        ],
      });
    }
    return Promise.reject(new Error(`Unexpected rest() path: ${path}`));
  });

  mockQuery.mockResolvedValue({
    totalSize: 1,
    done:      true,
    records:   [{ QualifiedApiName: 'Knowledge__kav' }],
  });

  mockGetOrgBaseUrl.mockResolvedValue('https://test.salesforce.com');

  // Queue the two queryAll calls for each sync run:
  //   call 1 — main KAV SOQL  → KAV_RECORDS (the 3 articles)
  //   call 2 — body batch SOQL → BODY_ROWS   (the body content)
  mockQueryAll
    .mockResolvedValueOnce(KAV_RECORDS)
    .mockResolvedValueOnce(BODY_ROWS);

  // Default DB state: pending-review + published + new
  setupStandardDbState('pending-review');
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('runSfArticleSync — in-review body preservation', () => {

  test('pending-review article: body is NOT overwritten, status is NOT changed', async () => {
    const result = await runSfArticleSync(noopLog);

    // The sync must count it as skipped (not updated)
    expect(result.skipped).toBe(1);

    // Find the update call for the pending-review article by title
    const pendingUpdate = capturedUpdates.find(
      u => (u['title'] as string | undefined)?.includes('In Review'),
    );
    expect(pendingUpdate).toBeDefined();

    // Core assertion: body must NOT be present in the set object for a
    // pending-review article — even though SF returned a different body.
    expect(Object.prototype.hasOwnProperty.call(pendingUpdate, 'body')).toBe(false);

    // Status must NOT be overwritten (local 'pending-review' must be preserved)
    expect(Object.prototype.hasOwnProperty.call(pendingUpdate, 'status')).toBe(false);

    // The SF body text must not appear anywhere in the update payload
    expect(JSON.stringify(pendingUpdate)).not.toContain(SF_BODY_PENDING);

    // Metadata fields SHOULD be refreshed
    expect(pendingUpdate!['title']).toBe('Article In Review');
    expect(pendingUpdate!['summary']).toBe('A summary');
    expect(pendingUpdate!['sfVersionId']).toBe('kav-pending');
    expect(pendingUpdate!['sfPublishStatus']).toBe('online');
    expect(pendingUpdate!['updatedAt']).toBeInstanceOf(Date);
  });

  test('approved article: body is NOT overwritten and status is NOT changed', async () => {
    // Re-queue mocks (beforeEach set pending-review; override to approved)
    vi.clearAllMocks();
    capturedInserts.length = 0;
    capturedUpdates.length = 0;
    resetKavBodyInfoCachesForTest();

    mockRest.mockImplementation((path: string) => {
      if (path.includes('KnowledgeArticleVersion')) {
        return Promise.resolve({ fields: [
          { name: 'Id' }, { name: 'KnowledgeArticleId' }, { name: 'Title' },
          { name: 'Summary' }, { name: 'ArticleType' }, { name: 'PublishStatus' },
          { name: 'VersionNumber' }, { name: 'CreatedDate' }, { name: 'LastModifiedDate' },
          { name: 'UrlName' },
        ]});
      }
      if (path.includes('Knowledge__kav')) {
        return Promise.resolve({ fields: [
          { name: 'Id',      type: 'id',          label: 'Record ID' },
          { name: 'Body__c', type: 'richTextArea', label: 'Body'      },
        ]});
      }
      return Promise.reject(new Error(`Unexpected rest() path: ${path}`));
    });
    mockQuery.mockResolvedValue({ totalSize: 1, done: true, records: [{ QualifiedApiName: 'Knowledge__kav' }] });
    mockGetOrgBaseUrl.mockResolvedValue('https://test.salesforce.com');
    mockQueryAll
      .mockResolvedValueOnce(KAV_RECORDS)
      .mockResolvedValueOnce(BODY_ROWS);
    setupStandardDbState('approved');

    const result = await runSfArticleSync(noopLog);

    expect(result.skipped).toBe(1);

    const approvedUpdate = capturedUpdates.find(
      u => (u['title'] as string | undefined)?.includes('In Review'),
    );
    expect(approvedUpdate).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(approvedUpdate, 'body')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(approvedUpdate, 'status')).toBe(false);
    expect(JSON.stringify(approvedUpdate)).not.toContain(SF_BODY_PENDING);
  });

  test('new article (not yet in DB): inserted with the SF body', async () => {
    await runSfArticleSync(noopLog);

    expect(capturedInserts).toHaveLength(1);
    const inserted = capturedInserts[0]!;

    // Body from SF must be persisted for new articles
    expect(inserted['body']).toBe(SF_BODY_NEW);
    expect(inserted['id']).toBe('ka-new');
    expect(inserted['title']).toBe('Brand New Article');
    // Status reflects what SF says ('online' → 'published')
    expect(inserted['status']).toBe('published');
  });

  test('existing non-review article (published): body and status refreshed from SF', async () => {
    await runSfArticleSync(noopLog);

    const existingUpdate = capturedUpdates.find(
      u => (u['title'] as string | undefined)?.includes('Existing Published'),
    );
    expect(existingUpdate).toBeDefined();

    // Full refresh: body MUST be present and match SF's value
    expect(Object.prototype.hasOwnProperty.call(existingUpdate, 'body')).toBe(true);
    expect(existingUpdate!['body']).toBe(SF_BODY_EXISTING);

    // Status is refreshed from SF ('online' → 'published')
    expect(existingUpdate!['status']).toBe('published');
    expect(existingUpdate!['title']).toBe('Existing Published Article');
  });

  test('result counters reflect all three branches correctly', async () => {
    const result = await runSfArticleSync(noopLog);

    expect(result.total).toBe(3);
    expect(result.created).toBe(1);   // ka-new
    expect(result.updated).toBe(1);   // ka-existing
    expect(result.skipped).toBe(1);   // ka-pending (in review)
    expect(result.errors).toBe(0);
    expect(typeof result.syncedAt).toBe('string');
    expect(result.syncedAt.length).toBeGreaterThan(0);
  });

  test('exactly one db.insert and two db.updates are issued for three articles', async () => {
    await runSfArticleSync(noopLog);

    // One insert for the new article, two updates (one metadata-only + one full)
    expect(capturedInserts).toHaveLength(1);
    expect(capturedUpdates).toHaveLength(2);

    const titles = capturedUpdates.map(u => u['title'] as string);
    expect(titles).toContain('Article In Review');
    expect(titles).toContain('Existing Published Article');
  });
});
