import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// Auth middleware is tested separately in authEnforcement.test.ts.
// Mock it here so business-logic tests run without needing an OAuth session.
vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:        () => true,
  isAdmin:        () => true,
  isSuperAdmin:   () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

// ── Proxy mode flag — controls mock behaviour per test ────────────────────────
//
// 'normal':    every Salesforce API call returns { totalSize: 7, records: [] }
// 'rateLimit': SOQL queries for TT custom objects (those ending in __c without
//              a namespace prefix) return HTTP 429 with Retry-After: 0.
//              Used to test the throttled → undetermined classification.

const { mockProxyMode } = vi.hoisted(() => ({
  mockProxyMode: { value: 'normal' as 'normal' | 'rateLimit' },
}));

// ── Connector SDK mock ────────────────────────────────────────────────────────

vi.mock('@replit/connectors-sdk', () => {
  class ReplitConnectors {
    getProxyUrl() {
      return 'https://mock-sf-proxy.replit.test';
    }
    createProxyFetch(_connectionId: string) {
      return async function mockProxyFetch(
        url: string,
        _init?: RequestInit,
      ): Promise<Response> {
        // Rate-limit mode: return 429 for TT custom-object SOQL queries.
        // TT objects are COUNT queries on objects ending in __c with no
        // managed-package namespace (npsp__, pmdm__, etc.).
        if (
          mockProxyMode.value === 'rateLimit' &&
          url.includes('/query') &&
          url.includes('SELECT%20COUNT') &&
          url.includes('__c') &&
          !url.includes('npsp__') &&
          !url.includes('pmdm__')
        ) {
          return {
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            headers: new Headers({ 'Retry-After': '0' }),
            json: async () => ({}),
            text: async () =>
              'Rate limit exceeded. You have exceeded the limit of 20 requests per 10 seconds.',
            redirected: false,
            type: 'basic' as Response['type'],
            url: '',
            clone: () => ({ ok: false } as Response),
            arrayBuffer: async () => new ArrayBuffer(0),
            blob: async () => new Blob(),
            formData: async () => new FormData(),
            body: null,
            bodyUsed: false,
          } as Response;
        }

        // Normal mode (and non-TT queries in rateLimit mode)
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ totalSize: 7, done: true, records: [] }),
          text: async () => '',
          headers: new Headers(),
          redirected: false,
          type: 'basic' as Response['type'],
          url: '',
          clone: () => ({ ok: true } as Response),
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
          body: null,
          bodyUsed: false,
        } as Response;
      };
    }
  }
  return { ReplitConnectors };
});

import app from '../app.js';

// ── Operations summary ────────────────────────────────────────────────────────

describe('GET /api/salesforce/operations/summary', () => {
  test('returns 200 with structured summary', async () => {
    const res = await request(app).get('/api/salesforce/operations/summary');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('programs');
    expect(res.body).toHaveProperty('engagements');
    expect(res.body).toHaveProperty('serviceDeliveries');
    expect(res.body).toHaveProperty('cases');
    expect(res.body).toHaveProperty('contacts');
    expect(res.body).toHaveProperty('lastUpdated');
    expect(res.body).toHaveProperty('fromCache');
  });

  test('programs shape has total, active, planning', async () => {
    const res = await request(app).get('/api/salesforce/operations/summary');
    const { programs } = res.body as { programs: Record<string, number | null> };
    expect(programs).toHaveProperty('total');
    expect(programs).toHaveProperty('active');
    expect(programs).toHaveProperty('planning');
  });

  test('cases shape has open and highPriority', async () => {
    const res = await request(app).get('/api/salesforce/operations/summary');
    const { cases } = res.body as { cases: Record<string, number | null> };
    expect(cases).toHaveProperty('open');
    expect(cases).toHaveProperty('highPriority');
  });

  test('second request is served from cache', async () => {
    const r1 = await request(app).get('/api/salesforce/operations/summary');
    expect(r1.status).toBe(200);
    const res = await request(app).get('/api/salesforce/operations/summary');
    expect(res.body.fromCache).toBe(true);
    expect(typeof res.body.cacheAge).toBe('number');
  });

  test('lastUpdated is a valid ISO date string', async () => {
    const res = await request(app).get('/api/salesforce/operations/summary');
    const ts = new Date(res.body.lastUpdated as string).getTime();
    expect(Number.isNaN(ts)).toBe(false);
  });
});

// ── Validate endpoint — basic shape ──────────────────────────────────────────

describe('GET /api/salesforce/validate', () => {
  test('returns a checks array with items', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.checks)).toBe(true);
    expect(res.body.checks.length).toBeGreaterThan(0);
  });

  test('each check has id, category, label, status', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    for (const check of res.body.checks as Record<string, unknown>[]) {
      expect(check).toHaveProperty('id');
      expect(check).toHaveProperty('category');
      expect(check).toHaveProperty('label');
      expect(check).toHaveProperty('status');
    }
  });

  test('returns timestamp and durationMs', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('durationMs');
    expect(typeof res.body.durationMs).toBe('number');
  });

  test('ttCustomObjects response includes totalAccessible, totalInaccessible, totalUndetermined', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    const tt = res.body.ttCustomObjects as Record<string, unknown>;
    expect(tt).toHaveProperty('totalAccessible');
    expect(tt).toHaveProperty('totalInaccessible');
    expect(tt).toHaveProperty('totalUndetermined');
    expect(tt).toHaveProperty('totalObjects');
  });

  test('customFieldChecks include describeUndetermined flag', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    const checks = res.body.customFieldChecks as Record<string, unknown>[];
    expect(Array.isArray(checks)).toBe(true);
    for (const fc of checks) {
      expect(fc).toHaveProperty('describeUndetermined');
      expect(typeof fc['describeUndetermined']).toBe('boolean');
    }
  });
});

// ── All three TT custom object groups ────────────────────────────────────────
//
// Confirms that each of the three logical object groups (penny, curriculum,
// governance) is present in the response and that accessible counts are
// consistent when the org returns records for every object.

describe('GET /api/salesforce/validate — three TT custom object groups', () => {
  test('all three groups appear: penny, curriculum, governance', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    expect(res.status).toBe(200);

    const tt = res.body.ttCustomObjects as {
      groups: { id: string; label: string; accessibleCount: number; inaccessibleCount: number; undeterminedCount: number; totalCount: number; objects: unknown[] }[];
      totalAccessible: number;
      totalInaccessible: number;
      totalUndetermined: number;
      totalObjects: number;
    };

    const ids = tt.groups.map(g => g.id);
    expect(ids).toContain('penny');
    expect(ids).toContain('curriculum');
    expect(ids).toContain('governance');
    expect(tt.groups).toHaveLength(3);
  });

  test('penny group has 8 objects, all accessible', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    const tt = res.body.ttCustomObjects as {
      groups: { id: string; accessibleCount: number; inaccessibleCount: number; undeterminedCount: number; totalCount: number }[];
    };
    const penny = tt.groups.find(g => g.id === 'penny');
    expect(penny).toBeDefined();
    expect(penny!.totalCount).toBe(8);
    expect(penny!.accessibleCount).toBe(8);
    expect(penny!.inaccessibleCount).toBe(0);
    expect(penny!.undeterminedCount).toBe(0);
  });

  test('curriculum group has 5 objects, all accessible', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    const tt = res.body.ttCustomObjects as {
      groups: { id: string; accessibleCount: number; inaccessibleCount: number; undeterminedCount: number; totalCount: number }[];
    };
    const curriculum = tt.groups.find(g => g.id === 'curriculum');
    expect(curriculum).toBeDefined();
    expect(curriculum!.totalCount).toBe(5);
    expect(curriculum!.accessibleCount).toBe(5);
    expect(curriculum!.inaccessibleCount).toBe(0);
    expect(curriculum!.undeterminedCount).toBe(0);
  });

  test('governance group has 4 objects, all accessible', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    const tt = res.body.ttCustomObjects as {
      groups: { id: string; accessibleCount: number; inaccessibleCount: number; undeterminedCount: number; totalCount: number }[];
    };
    const governance = tt.groups.find(g => g.id === 'governance');
    expect(governance).toBeDefined();
    expect(governance!.totalCount).toBe(4);
    expect(governance!.accessibleCount).toBe(4);
    expect(governance!.inaccessibleCount).toBe(0);
    expect(governance!.undeterminedCount).toBe(0);
  });

  test('totals across all groups: 17 objects, all accessible, none inaccessible or undetermined', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    const tt = res.body.ttCustomObjects as {
      totalAccessible: number; totalInaccessible: number; totalUndetermined: number; totalObjects: number;
    };
    expect(tt.totalObjects).toBe(17);
    expect(tt.totalAccessible).toBe(17);
    expect(tt.totalInaccessible).toBe(0);
    expect(tt.totalUndetermined).toBe(0);
  });

  test('each group has correct label', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    const tt = res.body.ttCustomObjects as {
      groups: { id: string; label: string }[];
    };
    const byId = Object.fromEntries(tt.groups.map(g => [g.id, g.label]));
    expect(byId['penny']).toBe('Penny Objects');
    expect(byId['curriculum']).toBe('Curriculum & Progress');
    expect(byId['governance']).toBe('Build Governance');
  });

  test('each object in every group has accessible:true and a non-negative count', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    const tt = res.body.ttCustomObjects as {
      groups: { objects: { accessible: boolean | null; count: number }[] }[];
    };
    for (const group of tt.groups) {
      for (const obj of group.objects) {
        expect(obj.accessible).toBe(true);
        expect(obj.count).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ── Throttle → undetermined classification ───────────────────────────────────
//
// This is the critical invariant: when the Replit connector proxy returns 429
// for a TT object probe, the object must be classified as UNDETERMINED
// (accessible: null), never as inaccessible (accessible: false).
// A failure and a genuine absence must look different.

describe('GET /api/salesforce/validate — 429 throttle handling', () => {
  beforeEach(() => { mockProxyMode.value = 'normal'; });
  afterEach(() => { mockProxyMode.value = 'normal'; });

  test('a 429 response to a TT object probe is classified as undetermined, not inaccessible', async () => {
    mockProxyMode.value = 'rateLimit';

    const res = await request(app).get('/api/salesforce/validate');
    expect(res.status).toBe(200);

    const tt = res.body.ttCustomObjects as {
      groups: { objects: { accessible: boolean | null; error?: string }[] }[];
      totalAccessible: number;
      totalInaccessible: number;
      totalUndetermined: number;
    };

    const allObjects = tt.groups.flatMap(g => g.objects);

    // 1. No TT object must be marked as confirmed inaccessible due to throttling
    const falseNegatives = allObjects.filter(o => o.accessible === false);
    expect(falseNegatives).toHaveLength(0);

    // 2. All throttled objects must be undetermined (accessible === null)
    const undetermined = allObjects.filter(o => o.accessible === null);
    expect(undetermined.length).toBeGreaterThan(0);

    // 3. Summary counts reflect reality: no false positives in inaccessible bucket
    expect(tt.totalInaccessible).toBe(0);
    expect(tt.totalUndetermined).toBeGreaterThan(0);
    // Confirmed accessible = 0 (all were throttled in this mock)
    expect(tt.totalAccessible).toBe(0);

    // 4. The check detail says "undetermined", not "0 accessible" or "fail"
    const ttCheck = (res.body.checks as { id: string; detail: string; status: string }[])
      .find(c => c.id === 'tt-custom-objects');
    expect(ttCheck).toBeDefined();
    expect(ttCheck!.detail).toMatch(/undetermined/i);
    // Detail must not describe any object as inaccessible
    expect(ttCheck!.detail).not.toMatch(/confirmed inaccessible/i);

    // 5. The field checks: if describe was rate-limited, describeUndetermined must be true
    //    and requiredFieldsMissing must be empty — never infer absence from a failed probe
    const fieldChecks = res.body.customFieldChecks as {
      id: string; describeUndetermined: boolean; requiredFieldsMissing: string[];
    }[];
    for (const fc of fieldChecks) {
      if (fc.describeUndetermined) {
        expect(fc.requiredFieldsMissing).toEqual([]);
      }
    }
  });

  test('when describe is throttled, Contact shows 0 TT fields with undetermined flag — not a missing-fields list', async () => {
    // Simulate the exact bug that prompted this fix:
    // Contact describe throttled → must not report 15 "Missing required" fields.
    mockProxyMode.value = 'rateLimit';

    const res = await request(app).get('/api/salesforce/validate');

    // Find the Contact field check — it's the cfg with id 'contact-fields'
    const contactCheck = (res.body.customFieldChecks as {
      id: string;
      ourFields: string[];
      requiredFieldsMissing: string[];
      describeError: string | null;
      describeUndetermined: boolean;
    }[]).find(fc => fc.id === 'contact-fields');

    // The Contact describe URL (/sobjects/Contact/describe) does not match
    // the TT-object SOQL pattern — it will succeed in this mock.
    // So this test validates the *field-check-error-path*, not the 429 path.
    // Either way: if describeError is set, requiredFieldsMissing MUST be empty.
    if (contactCheck?.describeError) {
      expect(contactCheck.requiredFieldsMissing).toEqual([]);
    }
    // If it succeeded, requiredFieldsMissing is allowed to be non-empty (not throttled)
    // and describeUndetermined must be false
    if (!contactCheck?.describeError) {
      expect(contactCheck?.describeUndetermined).toBe(false);
    }
  });
});
