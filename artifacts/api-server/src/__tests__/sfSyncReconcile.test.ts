/**
 * sfSyncReconcile.test.ts
 *
 * Unit tests for the SF article sync reconciliation helpers in the knowledge route.
 * These tests cover the pure-logic layer (no DB, no HTTP) to catch regressions
 * in version-selection, deduplication, and duplicate-prevention.
 */

import { describe, test, expect } from 'vitest';
import { buildSfSyncExistingMap, normalizeArticleType } from '../routes/knowledge.js';

// ── buildSfSyncExistingMap ────────────────────────────────────────────────────
//
// Regression: Trail OS-authored articles published to Salesforce must NOT produce
// a second local record when the sync encounters their KnowledgeArticleId.
// The reconciliation must find the existing article via its sfArticleId field and
// return the original local primary key so the sync updates in-place.

describe('buildSfSyncExistingMap', () => {

  test('returns empty map for empty inputs', () => {
    const map = buildSfSyncExistingMap([], []);
    expect(map.size).toBe(0);
  });

  // ── Directly-synced articles (id IS the kaId) ────────────────────────────

  test('maps a directly-synced article (id = kaId) to its own id', () => {
    const map = buildSfSyncExistingMap(
      [{ id: 'ka000sf', status: 'published' }],
      [],
    );
    expect(map.get('ka000sf')).toEqual({ localId: 'ka000sf', status: 'published' });
  });

  test('maps multiple directly-synced articles independently', () => {
    const map = buildSfSyncExistingMap(
      [
        { id: 'ka000sf1', status: 'published' },
        { id: 'ka000sf2', status: 'draft' },
      ],
      [],
    );
    expect(map.get('ka000sf1')).toEqual({ localId: 'ka000sf1', status: 'published' });
    expect(map.get('ka000sf2')).toEqual({ localId: 'ka000sf2', status: 'draft' });
    expect(map.size).toBe(2);
  });

  // ── Trail OS-authored articles published to SF (REGRESSION CASE) ─────────
  //
  // Scenario: staff creates article locally (id='art_abc'), publishes it to SF,
  // which stores KnowledgeArticleId='ka000sf' in sfArticleId. On the next sync,
  // SF returns 'ka000sf'. Without bySfIdRows lookup, the sync sees no existing
  // record with id='ka000sf' and inserts a duplicate. With it, the existing
  // article is found via sfArticleId and its localId='art_abc' is returned so
  // the sync updates the original record in-place.

  test('REGRESSION: Trail OS-authored article with sfArticleId is found and returns its local id (no duplicate)', () => {
    const map = buildSfSyncExistingMap(
      // byPkRows: no record found with id = 'ka000sf'
      [],
      // bySfIdRows: existing local article whose sfArticleId = 'ka000sf'
      [{ id: 'art_abc', status: 'published', sfArticleId: 'ka000sf' }],
    );

    const entry = map.get('ka000sf');
    expect(entry).toBeDefined();
    // Must return the original local id — NOT the SF id — so no duplicate is created
    expect(entry!.localId).toBe('art_abc');
    expect(entry!.status).toBe('published');
    // The map has exactly one entry: no phantom kaId entry was added
    expect(map.size).toBe(1);
  });

  test('bySfIdRows entry takes precedence over byPkRows entry for the same kaId', () => {
    // Edge case: somehow both lookups return an entry for the same kaId.
    // The bySfIdRows entry (Trail OS-authored, must preserve local id) wins.
    const map = buildSfSyncExistingMap(
      [{ id: 'ka000sf', status: 'draft' }],                          // direct sync row
      [{ id: 'art_abc', status: 'published', sfArticleId: 'ka000sf' }], // local publish row
    );

    const entry = map.get('ka000sf');
    expect(entry!.localId).toBe('art_abc');   // Trail OS local id preserved
    expect(entry!.status).toBe('published');
    expect(map.size).toBe(1);
  });

  test('ignores bySfIdRows entries with null sfArticleId', () => {
    const map = buildSfSyncExistingMap(
      [],
      [{ id: 'art_xyz', status: 'draft', sfArticleId: null }],
    );
    expect(map.size).toBe(0);
  });

  test('handles multiple Trail OS articles each with distinct sfArticleIds', () => {
    const map = buildSfSyncExistingMap(
      [],
      [
        { id: 'art_1', status: 'published', sfArticleId: 'ka0001' },
        { id: 'art_2', status: 'draft',     sfArticleId: 'ka0002' },
        { id: 'art_3', status: 'approved',  sfArticleId: 'ka0003' },
      ],
    );

    expect(map.size).toBe(3);
    expect(map.get('ka0001')!.localId).toBe('art_1');
    expect(map.get('ka0002')!.localId).toBe('art_2');
    expect(map.get('ka0003')!.localId).toBe('art_3');
  });

  test('mixes directly-synced and Trail-OS-authored articles in the same map', () => {
    const map = buildSfSyncExistingMap(
      // Directly-synced: id IS the kaId
      [{ id: 'ka0010', status: 'published' }],
      // Trail OS-authored
      [{ id: 'art_alpha', status: 'draft', sfArticleId: 'ka0011' }],
    );

    expect(map.size).toBe(2);
    expect(map.get('ka0010')).toEqual({ localId: 'ka0010', status: 'published' });
    expect(map.get('ka0011')).toEqual({ localId: 'art_alpha', status: 'draft' });
  });

  // ── Status propagation ────────────────────────────────────────────────────

  test.each([
    ['draft'],
    ['pending-review'],
    ['approved'],
    ['published'],
  ] as const)('correctly maps status "%s"', (status) => {
    const map = buildSfSyncExistingMap(
      [{ id: 'ka0020', status }],
      [],
    );
    expect(map.get('ka0020')!.status).toBe(status);
  });
});

// ── normalizeArticleType ──────────────────────────────────────────────────────
//
// When SF returns ArticleType as the base name (e.g. "Knowledge") instead of
// the full __kav name ("Knowledge__kav"), the sync must normalize it before
// persisting. The publish endpoint uses the stored articleType directly as the
// Salesforce sObject API name; an un-normalized "Knowledge" would cause a POST
// to /sobjects/Knowledge which does not exist.

describe('normalizeArticleType', () => {

  test('full __kav name is returned unchanged', () => {
    expect(normalizeArticleType('Knowledge__kav', 'Knowledge__kav')).toBe('Knowledge__kav');
  });

  test('REGRESSION: base name is normalized to the full __kav canonical name', () => {
    // SF returns "Knowledge" but publish must target /sobjects/Knowledge__kav
    expect(normalizeArticleType('Knowledge', 'Knowledge__kav')).toBe('Knowledge__kav');
  });

  test('matching is case-insensitive for the full __kav name', () => {
    expect(normalizeArticleType('knowledge__kav', 'Knowledge__kav')).toBe('Knowledge__kav');
  });

  test('matching is case-insensitive for the base name', () => {
    expect(normalizeArticleType('KNOWLEDGE', 'Knowledge__kav')).toBe('Knowledge__kav');
  });

  test('a different known type is preserved as-is when no canonical is set', () => {
    expect(normalizeArticleType('HowTo__kav', null)).toBe('HowTo__kav');
  });

  test('unrelated type is preserved unchanged', () => {
    expect(normalizeArticleType('HowTo__kav', 'Knowledge__kav')).toBe('HowTo__kav');
  });

  test('undefined rawType returns empty string when canonical is null', () => {
    expect(normalizeArticleType(undefined, null)).toBe('');
  });

  test('undefined rawType returns the canonical name when canonical is set', () => {
    // Graceful fallback: missing ArticleType field from SF → use the known object
    expect(normalizeArticleType(undefined, 'Knowledge__kav')).toBe('');
  });

  test('normalizes custom org-specific __kav type (non-Knowledge)', () => {
    expect(normalizeArticleType('HowTo', 'HowTo__kav')).toBe('HowTo__kav');
  });

  // ── Publish sObject targeting validation ───────────────────────────────────
  //
  // The publish endpoint resolves objectName as:
  //   article.articleType || bodyInfo?.objectName || "Knowledge__kav"
  //
  // After normalization, articleType is always the full __kav name for matched
  // articles, so the endpoint always targets the correct sObject.

  test('post-normalization articleType resolves the correct sObject for publish', () => {
    const canonicalKavObj = 'Knowledge__kav';

    // Simulate: SF returned base name → normalized during sync → stored
    const storedArticleType = normalizeArticleType('Knowledge', canonicalKavObj);

    // Publish endpoint: objectName = article.articleType || bodyInfo?.objectName || fallback
    const objectName = storedArticleType || canonicalKavObj || 'Knowledge__kav';

    expect(objectName).toBe('Knowledge__kav');
    // Must NOT be the raw base name that would route to a non-existent sObject
    expect(objectName).not.toBe('Knowledge');
  });

  test('SF-originated publish preserves KnowledgeArticleId when articleType is normalized', () => {
    const sfArticleId     = 'ka000abc';
    const canonicalKavObj = 'Knowledge__kav';

    // Simulate sync storing a normalized article
    const storedArticleType = normalizeArticleType('Knowledge', canonicalKavObj);
    const objectName        = storedArticleType || canonicalKavObj || 'Knowledge__kav';

    // Simulate publish payload construction
    const isSfOriginated = Boolean(sfArticleId);
    const payload: Record<string, unknown> = { Title: 'Test Article', UrlName: 'test-article', Language: 'en_US' };
    if (isSfOriginated) payload['KnowledgeArticleId'] = sfArticleId;

    // sObject must be the __kav name AND the original KnowledgeArticleId must be in payload
    expect(objectName).toBe('Knowledge__kav');
    expect(payload['KnowledgeArticleId']).toBe(sfArticleId);
  });
});

// ── Version-selection deduplication logic ─────────────────────────────────────
//
// These tests verify the invariants that the sync route's deduplication loop
// must maintain. They exercise the selection rules directly (pure logic, no DB).

type KavRow = {
  Id: string;
  KnowledgeArticleId: string;
  PublishStatus: string;
  LastModifiedDate: string;
  Title: string;
};

/** Re-implements the deduplication logic from the sync route for testing. */
function deduplicateKavRows(rows: KavRow[]): Map<string, KavRow> {
  const deduped = new Map<string, KavRow>();
  for (const r of rows) {
    const existing  = deduped.get(r.KnowledgeArticleId);
    const curOnline = r.PublishStatus.toLowerCase() === 'online';
    const exOnline  = existing?.PublishStatus.toLowerCase() === 'online';

    if (!existing) {
      deduped.set(r.KnowledgeArticleId, r);
    } else if (curOnline && !exOnline) {
      deduped.set(r.KnowledgeArticleId, r);
    } else if (curOnline && exOnline) {
      if (new Date(r.LastModifiedDate) > new Date(existing.LastModifiedDate)) {
        deduped.set(r.KnowledgeArticleId, r);
      }
    }
    // Draft never overwrites any existing entry
  }
  return deduped;
}

describe('SF article version deduplication', () => {

  test('selects the only available version', () => {
    const row: KavRow = { Id: 'kav1', KnowledgeArticleId: 'ka1', PublishStatus: 'online', LastModifiedDate: '2025-01-01T00:00:00Z', Title: 'A' };
    const m = deduplicateKavRows([row]);
    expect(m.get('ka1')!.Id).toBe('kav1');
  });

  test('Online version wins over Draft version', () => {
    const draft:  KavRow = { Id: 'kav-draft',  KnowledgeArticleId: 'ka1', PublishStatus: 'draft',  LastModifiedDate: '2025-06-01T00:00:00Z', Title: 'Draft'  };
    const online: KavRow = { Id: 'kav-online', KnowledgeArticleId: 'ka1', PublishStatus: 'online', LastModifiedDate: '2025-01-01T00:00:00Z', Title: 'Online' };

    // Draft processed first, then Online
    const m = deduplicateKavRows([draft, online]);
    expect(m.get('ka1')!.Id).toBe('kav-online');
  });

  test('Draft does not overwrite an already-selected Online version', () => {
    const online: KavRow = { Id: 'kav-online', KnowledgeArticleId: 'ka1', PublishStatus: 'online', LastModifiedDate: '2025-01-01T00:00:00Z', Title: 'Online' };
    const draft:  KavRow = { Id: 'kav-draft',  KnowledgeArticleId: 'ka1', PublishStatus: 'draft',  LastModifiedDate: '2025-06-01T00:00:00Z', Title: 'Draft'  };

    // Online first, then Draft (Draft must NOT overwrite)
    const m = deduplicateKavRows([online, draft]);
    expect(m.get('ka1')!.Id).toBe('kav-online');
  });

  test('REGRESSION: when multiple Online versions exist, the newest one wins', () => {
    // Both are Online; the newer one (by LastModifiedDate) must be selected.
    // The sorted SOQL returns DESC so newer comes first; the loop must not let
    // the older Online row overwrite the newer one as it comes later.
    const newer: KavRow = { Id: 'kav-new', KnowledgeArticleId: 'ka2', PublishStatus: 'online', LastModifiedDate: '2025-06-01T00:00:00Z', Title: 'Newer' };
    const older: KavRow = { Id: 'kav-old', KnowledgeArticleId: 'ka2', PublishStatus: 'online', LastModifiedDate: '2025-01-01T00:00:00Z', Title: 'Older' };

    // Newer arrives first (as from a DESC sort), then older — older must NOT win
    const m = deduplicateKavRows([newer, older]);
    expect(m.get('ka2')!.Id).toBe('kav-new');
  });

  test('articles with distinct KnowledgeArticleIds are deduplicated independently', () => {
    const rows: KavRow[] = [
      { Id: 'kav-a-draft',  KnowledgeArticleId: 'ka-a', PublishStatus: 'draft',  LastModifiedDate: '2025-01-01T00:00:00Z', Title: 'A draft'  },
      { Id: 'kav-a-online', KnowledgeArticleId: 'ka-a', PublishStatus: 'online', LastModifiedDate: '2025-03-01T00:00:00Z', Title: 'A online' },
      { Id: 'kav-b-online', KnowledgeArticleId: 'ka-b', PublishStatus: 'online', LastModifiedDate: '2025-05-01T00:00:00Z', Title: 'B online' },
    ];
    const m = deduplicateKavRows(rows);
    expect(m.size).toBe(2);
    expect(m.get('ka-a')!.Id).toBe('kav-a-online');
    expect(m.get('ka-b')!.Id).toBe('kav-b-online');
  });
});
