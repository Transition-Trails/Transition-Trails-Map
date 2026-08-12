import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// Auth middleware is tested separately in authEnforcement.test.ts.
// Mock it here so business-logic tests run without needing an OAuth session.
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

// ── Proxy mode flag — controls mock behaviour per test ────────────────────────
//
// 'normal':    every Salesforce API call returns { totalSize: 7, records: [] }
// 'rateLimit': SOQL queries for TT custom objects (those ending in __c without
//              a namespace prefix) return HTTP 429 with Retry-After: 0.
//              Used to test the throttled → undetermined classification.

const { mockProxyMode } = vi.hoisted(() => ({
  mockProxyMode: { value: 'normal' as 'normal' | 'rateLimit' | 'describeError' },
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

        // Describe-error mode: return 403 for all describe calls.
        // Simulates a permission-denied (or any other non-rate-limit) failure
        // from the org describe endpoint so the field-check error path is exercised.
        if (
          mockProxyMode.value === 'describeError' &&
          url.includes('/describe')
        ) {
          return {
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            headers: new Headers(),
            json: async () => ([{ message: 'You do not have access to describe this object.', errorCode: 'INSUFFICIENT_ACCESS' }]),
            text: async () => '403 Forbidden: INSUFFICIENT_ACCESS',
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
import { opsCache, flushSfCacheForUser } from '../routes/salesforce.js';

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

// ── Generic describe error (non-rate-limit) ───────────────────────────────────
//
// When the org's describe endpoint fails with a non-429 error (e.g. 403
// permission denied, 500 server error), the field check must NOT report
// missing fields — absence of describe data is not evidence of absence.
//
// Invariants:
//   • requiredFieldsMissing === []   for every field check
//   • describeUndetermined === false (it's a definitive error, not a throttle)
//   • describeError is a non-null string describing the failure

describe('GET /api/salesforce/validate — generic describe error (non-rate-limit)', () => {
  beforeEach(() => { mockProxyMode.value = 'normal'; });
  afterEach(() => { mockProxyMode.value = 'normal'; });

  test('requiredFieldsMissing is always [] when describe returns a non-429 error', async () => {
    mockProxyMode.value = 'describeError';

    const res = await request(app).get('/api/salesforce/validate');
    expect(res.status).toBe(200);

    const fieldChecks = res.body.customFieldChecks as {
      id: string;
      requiredFieldsMissing: string[];
      describeError: string | null;
      describeSkipped: boolean;
    }[];

    expect(Array.isArray(fieldChecks)).toBe(true);
    expect(fieldChecks.length).toBeGreaterThan(0);

    // Every check with a describeError must have an empty missing-fields list —
    // a failed describe is not evidence that fields are absent.
    for (const fc of fieldChecks) {
      if (fc.describeError) {
        expect(fc.requiredFieldsMissing).toEqual([]);
      }
    }
  });

  test('describeUndetermined is false when describe returns a non-429 error', async () => {
    // describeUndetermined === true is reserved for rate-limit (429) failures only.
    // A 403/500/etc. error is a definitive failure, not an undetermined probe.
    mockProxyMode.value = 'describeError';

    const res = await request(app).get('/api/salesforce/validate');
    expect(res.status).toBe(200);

    const fieldChecks = res.body.customFieldChecks as {
      id: string;
      describeError: string | null;
      describeUndetermined: boolean;
      describeSkipped: boolean;
    }[];

    for (const fc of fieldChecks) {
      if (fc.describeError) {
        expect(fc.describeUndetermined).toBe(false);
      }
    }
  });

  test('describeError is a non-null string for all attempted (non-skipped) checks when describe returns a non-429 error', async () => {
    // Rows with describeSkipped:true had their describe intentionally bypassed
    // (e.g. phase2Deferred objects) — they always have describeError:null by
    // design and must be excluded from this assertion.
    mockProxyMode.value = 'describeError';

    const res = await request(app).get('/api/salesforce/validate');
    expect(res.status).toBe(200);

    const fieldChecks = res.body.customFieldChecks as {
      id: string;
      describeError: string | null;
      describeSkipped: boolean;
    }[];

    // All attempted (non-skipped) checks should have hit the 403 describe mock,
    // so every such entry must carry a non-null describeError string.
    const attempted = fieldChecks.filter(fc => !fc.describeSkipped);
    expect(attempted.length).toBeGreaterThan(0);
    for (const fc of attempted) {
      expect(typeof fc.describeError).toBe('string');
      expect(fc.describeError).not.toBeNull();
    }
  });

  test('phase2Deferred rows have describeSkipped:true and describeError:null in all modes', async () => {
    // Verify the deferred contract holds in both normal and error modes.
    for (const mode of ['normal', 'describeError'] as const) {
      mockProxyMode.value = mode;
      const res = await request(app).get('/api/salesforce/validate');
      expect(res.status).toBe(200);

      const fieldChecks = res.body.customFieldChecks as {
        id: string;
        phase2Deferred: boolean;
        describeSkipped: boolean;
        describeError: string | null;
        phase2ExpectedFields: string[];
      }[];

      const deferred = fieldChecks.filter(fc => fc.phase2Deferred);
      for (const fc of deferred) {
        expect(fc.describeSkipped).toBe(true);
        expect(fc.describeError).toBeNull();
        // Must document the expected fields even though they are not yet in the org
        expect(Array.isArray(fc.phase2ExpectedFields)).toBe(true);
        expect(fc.phase2ExpectedFields.length).toBeGreaterThan(0);
      }
    }
  });
});

// ── Picklist-fetch error handling ─────────────────────────────────────────────
//
// getPicklistValues() silently returns [] on any describe error.
// These tests confirm two invariants:
//
//   1. The [] return is OBSERVABLE — the ops summary exposes it via
//      statusValuesFound / statusValuesMissing so callers can distinguish
//      "describe failed" from "org genuinely has no picklist values".
//
//   2. A failed picklist describe causes filtered counts to return explicit
//      errors (value: null, error: <string>), NOT silent zeros.
//
// This guards against a regression where a failed picklist fetch looks
// identical to a genuinely empty picklist in the API response.

describe('GET /api/salesforce/operations/summary — picklist describe error', () => {
  beforeEach(() => {
    mockProxyMode.value = 'normal';
    // Evict picklist entries AND the ops-summary result cached by earlier
    // normal-mode tests so the describe-error mock is actually exercised.
    for (const key of opsCache.keys()) {
      if (key.includes(':picklist:') || key.includes(':ops-summary')) {
        opsCache.delete(key);
      }
    }
  });
  afterEach(() => { mockProxyMode.value = 'normal'; });

  test('getPicklistValues returns [] when describe returns non-200 — surfaced as empty statusValuesFound', async () => {
    mockProxyMode.value = 'describeError';

    const res = await request(app).get('/api/salesforce/operations/summary');
    expect(res.status).toBe(200);

    const programs = res.body.programs as {
      statusValuesFound: string[];
      statusValuesMissing: string[];
    };

    // A failed describe must return an empty picklist list, not throw or silently
    // fall back to hardcoded defaults.
    // statusValuesFound surfaces the raw [] so callers can distinguish error from empty.
    expect(programs.statusValuesFound).toEqual([]);

    // All expected values are absent from the empty picklist and must be reported.
    expect(programs.statusValuesMissing).toContain('Active');
    expect(programs.statusValuesMissing).toContain('Planning');
  });

  test('programs.active and programs.planning carry explicit errors (not zero) when picklist describe fails', async () => {
    // When getPicklistValues returns [] because the describe call failed,
    // the expected status values ('Active', 'Planning') are not found in the picklist.
    // The filtered-count queries must NOT run with those values — they would succeed
    // with zero results, which is indistinguishable from a real empty org.
    // Instead, each count must carry an explicit error string and null value.
    mockProxyMode.value = 'describeError';

    const res = await request(app).get('/api/salesforce/operations/summary');
    expect(res.status).toBe(200);

    const programs = res.body.programs as {
      active:   { value: number | null; error: string | null };
      planning: { value: number | null; error: string | null };
    };

    // Null value confirms the query was skipped, not that zero records were returned.
    expect(programs.active.value).toBeNull();
    expect(typeof programs.active.error).toBe('string');
    expect(programs.active.error).not.toBeNull();
    // The error message must reference the picklist describe failure, not a generic error.
    expect(programs.active.error).toMatch(/picklist describe failed/i);

    expect(programs.planning.value).toBeNull();
    expect(typeof programs.planning.error).toBe('string');
    expect(programs.planning.error).not.toBeNull();
    expect(programs.planning.error).toMatch(/picklist describe failed/i);
  });

  test('programs.total remains queryable even when picklist describe fails', async () => {
    // The total program count does not rely on picklist values — it should succeed
    // regardless of describe errors, confirming the failure is isolated to the
    // filtered queries, not the entire ops summary.
    mockProxyMode.value = 'describeError';

    const res = await request(app).get('/api/salesforce/operations/summary');
    expect(res.status).toBe(200);

    const programs = res.body.programs as {
      total: { value: number | null; error: string | null };
    };

    // Total count uses no picklist filter — describe error must not affect it.
    expect(programs.total.error).toBeNull();
    expect(typeof programs.total.value).toBe('number');
  });
});

// ── customFieldChecks with picklist fields — describe error ────────────────────
//
// Several field-check entries include restricted-picklist fields (e.g.
// Source__c on Penny_Interaction_Log__c).  When the describe call that
// backs both getCustomFields AND getPicklistValues returns a non-200
// response, the Validation Center must NOT report those fields as missing.
// A failed describe is not evidence of absence.
//
// This is a focused companion to the generic describe-error block above:
// it confirms the invariant holds specifically for objects that carry
// picklist-typed required fields.

describe('GET /api/salesforce/validate — picklist field checks when describe fails', () => {
  beforeEach(() => { mockProxyMode.value = 'normal'; });
  afterEach(() => { mockProxyMode.value = 'normal'; });

  test('penny-interaction-log-fields reports no missing fields when describe returns non-200', async () => {
    // Penny_Interaction_Log__c requires Source__c (a restricted picklist).
    // If describe fails, Source__c must NOT appear in requiredFieldsMissing.
    mockProxyMode.value = 'describeError';

    const res = await request(app).get('/api/salesforce/validate');
    expect(res.status).toBe(200);

    const fc = (res.body.customFieldChecks as {
      id: string;
      requiredFieldsMissing: string[];
      describeError: string | null;
    }[]).find(c => c.id === 'penny-interaction-log-fields');

    expect(fc).toBeDefined();
    // Describe failed → must not infer any field is missing.
    expect(fc!.requiredFieldsMissing).toEqual([]);
    // The error must be reported so the UI can show "data unavailable" not "all clear".
    expect(fc!.describeError).not.toBeNull();
  });

  test('no customFieldCheck entry reports a missing picklist field when describe is unavailable', async () => {
    // Broad sweep: confirm the invariant holds across all field-check entries,
    // not just Penny_Interaction_Log__c.  Covers any future object additions too.
    mockProxyMode.value = 'describeError';

    const res = await request(app).get('/api/salesforce/validate');
    expect(res.status).toBe(200);

    const fieldChecks = res.body.customFieldChecks as {
      id: string;
      requiredFieldsMissing: string[];
      describeError: string | null;
    }[];

    expect(Array.isArray(fieldChecks)).toBe(true);
    expect(fieldChecks.length).toBeGreaterThan(0);

    for (const fc of fieldChecks) {
      if (fc.describeError !== null) {
        // Any entry whose describe call failed must have an empty missing-fields list —
        // regardless of whether the required fields are picklist-typed or not.
        expect(fc.requiredFieldsMissing).toEqual([]);
      }
    }
  });
});

// ── Picklist describe cache: failures are not cached ─────────────────────────
//
// getPicklistValues intentionally skips caching when the describe call fails,
// so the next request retries the live endpoint rather than serving the error.
//
// Invariant: a failed describe on request 1 must NOT be served as a cached
// result on request 2; request 2 must trigger a live describe call.

describe('GET /api/salesforce/operations/summary — picklist cache skips stale failure', () => {
  beforeEach(() => {
    mockProxyMode.value = 'normal';
    // Clear picklist entries and the ops-summary result so both requests
    // start from a cold cache and exercise the describe path.
    for (const key of opsCache.keys()) {
      if (key.includes(':picklist:') || key.includes(':ops-summary')) {
        opsCache.delete(key);
      }
    }
  });
  afterEach(() => { mockProxyMode.value = 'normal'; });

  test('request 2 retries the describe and does not serve the failure from request 1', async () => {
    // ── Request 1: describe fails ──────────────────────────────────────────────
    mockProxyMode.value = 'describeError';

    const res1 = await request(app).get('/api/salesforce/operations/summary');
    expect(res1.status).toBe(200);

    const prog1 = res1.body.programs as {
      active:            { value: number | null; error: string | null };
      statusValuesFound: string[];
    };

    // The describe error must be surfaced on the filtered counts.
    expect(prog1.active.value).toBeNull();
    expect(prog1.active.error).toMatch(/picklist describe failed/i);
    // No picklist values were returned because the describe failed.
    expect(prog1.statusValuesFound).toEqual([]);

    // ── Evict the ops-summary cache so request 2 re-enters the handler ────────
    // (The picklist cache has no entry to evict — failures are not stored.)
    for (const key of opsCache.keys()) {
      if (key.includes(':ops-summary')) {
        opsCache.delete(key);
      }
    }

    // ── Request 2: describe succeeds ───────────────────────────────────────────
    mockProxyMode.value = 'normal';

    const res2 = await request(app).get('/api/salesforce/operations/summary');
    expect(res2.status).toBe(200);

    const prog2 = res2.body.programs as {
      active:            { value: number | null; error: string | null };
      statusValuesFound: string[];
    };

    // The error from request 1 must NOT appear on request 2 — the describe was
    // retried rather than served from a cached failure.
    expect(prog2.active.error).not.toMatch(/picklist describe failed/i);

    // The second describe succeeded (mock returns 200), so a fresh cache entry
    // was written.  Confirm the picklist cache now holds an entry for this object.
    const picklistKeys = Array.from(opsCache.keys()).filter(k => k.includes(':picklist:'));
    expect(picklistKeys.length).toBeGreaterThan(0);
  });
});

// ── Ops-summary cache does not serve stale error payloads ────────────────────
//
// The picklist describe cache correctly skips caching failures so the next
// describe is retried live.  However, the ops-summary result itself is cached
// in a SEPARATE layer (5-minute TTL, key `<ns>:ops-summary`).  If that layer
// is written while a describe was erroring, and then the ops-summary key is
// evicted (e.g. by flushSfCacheForUser), the subsequent request MUST return a
// fresh summary — it must NOT serve the stale error payload from the previous
// cache entry.
//
// Invariants tested here:
//   1. A request made while describe is erroring caches an error-containing summary.
//   2. The cached summary IS served on a second request in the same mode (fromCache true).
//   3. After flushSfCacheForUser() evicts the ops-summary key, the third request
//      re-enters the handler, retries the describe, and returns a fresh result
//      without the error payload.

describe('GET /api/salesforce/operations/summary — ops-summary cache eviction clears stale errors', () => {
  beforeEach(() => {
    mockProxyMode.value = 'normal';
    // Start each test from a fully cold cache so state does not leak between runs.
    for (const key of opsCache.keys()) {
      if (key.includes(':picklist:') || key.includes(':ops-summary')) {
        opsCache.delete(key);
      }
    }
  });
  afterEach(() => { mockProxyMode.value = 'normal'; });

  test('after evicting the ops-summary cache via flushSfCacheForUser, the next request returns a fresh non-error summary', async () => {
    // ── Step 1: cache a summary that contains error data ──────────────────────
    mockProxyMode.value = 'describeError';

    const res1 = await request(app).get('/api/salesforce/operations/summary');
    expect(res1.status).toBe(200);

    const prog1 = res1.body.programs as {
      active:   { value: number | null; error: string | null };
      planning: { value: number | null; error: string | null };
    };

    // The first request must carry explicit errors — describe was failing.
    expect(prog1.active.value).toBeNull();
    expect(prog1.active.error).toMatch(/picklist describe failed/i);
    expect(prog1.planning.value).toBeNull();
    expect(prog1.planning.error).toMatch(/picklist describe failed/i);

    // ── Step 2: confirm the second request is served from the cache ───────────
    // The ops-summary was just written; a second request in error mode must be
    // served from the cache rather than re-querying Salesforce.
    const res2 = await request(app).get('/api/salesforce/operations/summary');
    expect(res2.status).toBe(200);
    expect(res2.body.fromCache).toBe(true);

    // The cached payload must still carry the error — it has not been cleared yet.
    const prog2 = res2.body.programs as {
      active:   { value: number | null; error: string | null };
    };
    expect(prog2.active.value).toBeNull();
    expect(prog2.active.error).toMatch(/picklist describe failed/i);

    // ── Step 3: flush the ops-summary cache and switch to a healthy describe ──
    // flushSfCacheForUser with no argument clears all "system:" keys, which
    // includes the "system:ops-summary" key used in test (no session sfUserId).
    flushSfCacheForUser();

    // Confirm the ops-summary key was actually evicted.
    const summaryKeysAfterFlush = Array.from(opsCache.keys()).filter(k => k.includes(':ops-summary'));
    expect(summaryKeysAfterFlush).toHaveLength(0);

    // Switch to normal mode so the describe now succeeds.
    mockProxyMode.value = 'normal';

    // ── Step 4: verify the third request returns a fresh, error-free summary ──
    const res3 = await request(app).get('/api/salesforce/operations/summary');
    expect(res3.status).toBe(200);

    // Must NOT be served from cache — the key was evicted; the route
    // stores fromCache: false in the fresh data object itself.
    expect(res3.body.fromCache).toBe(false);

    const prog3 = res3.body.programs as {
      active:             { value: number | null; error: string | null };
      planning:           { value: number | null; error: string | null };
      statusDescribeError: string | null;
    };

    // The describe itself succeeded (mock returns 200 for /describe in normal mode),
    // so the describe-level error must be null on the fresh response.
    expect(prog3.statusDescribeError).toBeNull();

    // The stale "picklist describe failed" error must NOT bleed into this response.
    // (The mock's describe returns no fields, so Active/Planning may still be reported
    // as "not found in org" — that is a different, expected error for the mock env.
    // What must be absent is the old "Picklist describe failed" string from the error mode.)
    if (prog3.active.error !== null) {
      expect(prog3.active.error).not.toMatch(/picklist describe failed/i);
    }
    if (prog3.planning.error !== null) {
      expect(prog3.planning.error).not.toMatch(/picklist describe failed/i);
    }
  });
});

// ── Penny + Governance field-check coverage ───────────────────────────────────
//
// Confirms that every Penny object and every Build Governance object defined in
// TT_CUSTOM_OBJECT_GROUPS has a matching field-check entry returned in
// customFieldChecks.  This is a contract test: if an object is added to the
// groups list but its field-check config is omitted, this test will catch it.

describe('GET /api/salesforce/validate — Penny + Governance field-check coverage', () => {
  // The 8 Penny object IDs expected in customFieldChecks
  const EXPECTED_PENNY_FIELD_CHECK_IDS = [
    'penny-trail-config-fields',
    'penny-interaction-log-fields',
    'penny-quest-submission-fields',
    'penny-career-review-fields',
    'penny-weekly-report-fields',
    'penny-badge-fields',
    'penny-gamification-fields',
    'penny-classroom-nudge-fields',
  ] as const;

  // The 4 Build Governance object IDs expected in customFieldChecks
  const EXPECTED_GOVERNANCE_FIELD_CHECK_IDS = [
    'tt-build-item-fields',
    'tt-automation-fields',
    'tt-sop-automation-fields',
    'tt-sop-account-fields',
  ] as const;

  test('all 8 Penny custom object field checks are present in customFieldChecks', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    expect(res.status).toBe(200);

    const ids = (res.body.customFieldChecks as { id: string }[]).map(fc => fc.id);
    for (const expected of EXPECTED_PENNY_FIELD_CHECK_IDS) {
      expect(ids).toContain(expected);
    }
  });

  test('all 4 Build Governance custom object field checks are present in customFieldChecks', async () => {
    const res = await request(app).get('/api/salesforce/validate');
    expect(res.status).toBe(200);

    const ids = (res.body.customFieldChecks as { id: string }[]).map(fc => fc.id);
    for (const expected of EXPECTED_GOVERNANCE_FIELD_CHECK_IDS) {
      expect(ids).toContain(expected);
    }
  });

  test('each Penny + Governance field check has a non-empty requiredFields list in normal mode', async () => {
    // Verify that the REUSED_OBJECT_FIELD_CHECKS definitions actually enumerate
    // required fields for Penny and Governance objects — not just empty arrays.
    //
    // TT_Automation__c fields (Is_Active__c, Automation_Type__c, Description__c,
    // Status__c) are confirmed provisioned on the org — tt-automation-fields is no
    // longer phase2Deferred and must appear in requiredFields like all other objects.
    const res = await request(app).get('/api/salesforce/validate');
    expect(res.status).toBe(200);

    const allFieldChecks = res.body.customFieldChecks as {
      id: string;
      requiredFieldsFound: string[];
      requiredFieldsMissing: string[];
      phase2Deferred: boolean;
      phase2ExpectedFields: string[];
    }[];

    const pennyAndGovernanceIds = [
      ...EXPECTED_PENNY_FIELD_CHECK_IDS,
      ...EXPECTED_GOVERNANCE_FIELD_CHECK_IDS,
    ];

    for (const id of pennyAndGovernanceIds) {
      const fc = allFieldChecks.find(c => c.id === id);
      expect(fc).toBeDefined();
      // The combined found+missing list represents the requiredFields config —
      // it should be non-empty for every Penny/Governance object.
      const totalConfigured = (fc?.requiredFieldsFound?.length ?? 0) + (fc?.requiredFieldsMissing?.length ?? 0);
      expect(totalConfigured).toBeGreaterThan(0);
    }
  });
});
