/**
 * learnerProfile.test.ts
 *
 * Covers GET /api/learner/profile — the canonical learner read model endpoint.
 *
 * Key behaviours tested:
 *  1. Learner with no progress (Contact ok, PE/enrollment/completion empty)
 *  2. Learner with partial progress (Contact + completions, no enrollment)
 *  3. Contact query failure → ok: false, contactError present, 503 status
 *  4. Empty result is distinguishable from failed query
 *  5. No picklist values in WHERE clauses (SOQL inspection)
 *  6. emptyFields report is populated for null Penny fields
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Session shim ───────────────────────────────────────────────────────────────

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {
    learnerAuthenticated: true,
    learnerContactId:     'TEST_CONTACT_001',
    learnerTrail:         'Salesforce Admin',
  };
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

vi.mock('session-file-store', () => ({
  default: () => class FakeFileStore {
    get(_sid: string, cb: (err: null, session: null) => void) { cb(null, null); }
    set(_sid: string, _session: unknown, cb: () => void) { cb(); }
    destroy(_sid: string, cb: () => void) { cb(); }
  },
}));

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:          (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:          (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:               () => true,
  isAdmin:               () => true,
  isSuperAdmin:          () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

import app from '../app.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Build a successful SF query response for a given record set. */
function sfOk(records: unknown[]): Response {
  const body = { totalSize: records.length, done: true, records };
  return {
    ok: true, status: 200,
    json:        async () => body,
    text:        async () => JSON.stringify(body),
    headers:     new Headers({ 'Content-Type': 'application/json' }),
    redirected:  false,
    type:        'basic' as Response['type'],
    url: '', clone: () => sfOk(records),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:        async () => new Blob(),
    formData:    async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

/** Build a failed SF query response. */
function sfErr(status = 400): Response {
  const body = [{ errorCode: 'QUERY_EXCEPTION', message: 'Simulated SF error' }];
  return {
    ok: false, status,
    json:        async () => body,
    text:        async () => JSON.stringify(body),
    headers:     new Headers({ 'Content-Type': 'application/json' }),
    redirected:  false,
    type:        'basic' as Response['type'],
    url: '', clone: () => sfErr(status),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob:        async () => new Blob(),
    formData:    async () => new FormData(),
    body: null, bodyUsed: false,
  } as Response;
}

/** Minimal Contact record with all Penny fields null — simulates a new learner. */
const BARE_CONTACT = {
  Id: 'TEST_CONTACT_001',
  FirstName: 'Alex',
  LastName:  'Learner',
  Email:     'alex@example.com',
  Phone:     null,
  MailingCity:  null,
  MailingState: null,
  Penny_Trail__c:             null,
  Penny_Trail_Config__c:      null,
  Penny_Current_Phase__c:     null,
  Penny_Current_Goal__c:      null,
  Penny_Current_Blockers__c:  null,
  Penny_Coaching_Tone__c:     null,
  Penny_Confidence_Score__c:  null,
  Penny_Skill_Score__c:       null,
  Penny_Sprint_Week__c:       null,
  Penny_Onboarding_Complete__c: false,
  Penny_LMS_Learner_ID__c:    null,
  Penny_Coach__c:             null,
};

/** Contact with some Penny fields populated — simulates a learner in progress. */
const SEEDED_CONTACT = {
  ...BARE_CONTACT,
  Penny_Trail__c:            'Salesforce Admin',
  Penny_Current_Phase__c:    'Explore',
  Penny_Current_Goal__c:     'Earn Admin certification',
  Penny_Confidence_Score__c: 6,
  Penny_Sprint_Week__c:      3,
};

const COMPLETION_RECORD = {
  Id:              'compl_001',
  Name:            'Week 3 Activity',
  Status__c:       'Submitted',
  Submitted_At__c: '2026-08-01T10:00:00Z',
  Graded_At__c:    null,
  Score__c:        88,
  Points_Earned__c: 25,
  Activity__r:     { Name: 'Build a Custom Object' },
  Course_Module__r: { Name: 'Module 3: Custom Objects' },
};

// ── Setup / teardown ───────────────────────────────────────────────────────────

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  for (const k of Object.keys(mockSession)) delete mockSession[k];
  mockSession['learnerAuthenticated'] = true;
  mockSession['learnerContactId']     = 'TEST_CONTACT_001';
  process.env = { ...ORIG_ENV };
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GET /api/learner/profile — learner with no progress', () => {
  test('returns ok:true with empty enrollments and completions when SF has no records', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    // Contact query succeeds; PE / enrollment / completion return empty
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(sfOk([BARE_CONTACT]))   // Contact
      .mockResolvedValueOnce(sfOk([]))               // Program Engagement
      .mockResolvedValueOnce(sfOk([]))               // Course_Enrollment__c
      .mockResolvedValueOnce(sfOk([]))               // Course_Activity_Completion__c
    );

    const res = await request(app).get('/api/learner/profile');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.contact.firstName).toBe('Alex');
    expect(res.body.programEngagements).toEqual([]);
    expect(res.body.enrollments).toEqual([]);
    expect(res.body.completions).toEqual([]);
    expect(res.body.contactError).toBeUndefined();
  });

  test('emptyFields lists all null Penny coaching fields', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(sfOk([BARE_CONTACT]))
      .mockResolvedValueOnce(sfOk([]))
      .mockResolvedValueOnce(sfOk([]))
      .mockResolvedValueOnce(sfOk([]))
    );

    const res = await request(app).get('/api/learner/profile');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.emptyFields)).toBe(true);
    // All Penny coaching fields should appear because BARE_CONTACT has them null
    expect(res.body.emptyFields).toContain('Penny_Trail__c');
    expect(res.body.emptyFields).toContain('Penny_Confidence_Score__c');
    expect(res.body.emptyFields).toContain('Penny_Current_Phase__c');
  });

  test('no picklist values appear in the Contact WHERE clause', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(sfOk([BARE_CONTACT]))
      .mockResolvedValueOnce(sfOk([]))
      .mockResolvedValueOnce(sfOk([]))
      .mockResolvedValueOnce(sfOk([]));
    vi.stubGlobal('fetch', fetchSpy);

    await request(app).get('/api/learner/profile');

    // Inspect all SOQL queries that were executed
    const soqls = (fetchSpy.mock.calls as [string][])
      .map(([url]) => decodeURIComponent(url));

    // Contact query must filter by Id only — no picklist values in WHERE
    const contactSoql = soqls.find(s => s.includes('FROM Contact'));
    expect(contactSoql).toBeDefined();
    expect(contactSoql).toMatch(/WHERE Id = 'TEST_CONTACT_001'/);
    // Must not use a picklist value as a WHERE filter
    expect(contactSoql).not.toMatch(/WHERE.*=\s*'Active'/);
    expect(contactSoql).not.toMatch(/WHERE.*=\s*'Submitted'/);

    // Program Engagement must filter by Contact lookup, not by Stage
    const peSoql = soqls.find(s => s.includes('pmdm__ProgramEngagement__c'));
    expect(peSoql).toBeDefined();
    expect(peSoql).toMatch(/WHERE pmdm__Contact__c = 'TEST_CONTACT_001'/);
    expect(peSoql).not.toMatch(/pmdm__Stage__c\s*=\s*'Active'/);
  });
});

describe('GET /api/learner/profile — learner with partial progress', () => {
  test('returns completions and emptyFields reports only remaining nulls', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(sfOk([SEEDED_CONTACT]))
      .mockResolvedValueOnce(sfOk([]))               // no PE records yet
      .mockResolvedValueOnce(sfOk([]))               // no enrollment yet
      .mockResolvedValueOnce(sfOk([COMPLETION_RECORD]))
    );

    const res = await request(app).get('/api/learner/profile');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.contact.pennyTrail).toBe('Salesforce Admin');
    expect(res.body.contact.currentPhase).toBe('Explore');
    expect(res.body.contact.confidenceScore).toBe(6);
    expect(res.body.completions).toHaveLength(1);
    expect(res.body.completions[0].activityName).toBe('Build a Custom Object');
    expect(res.body.completions[0].status).toBe('Submitted');
    // Seeded fields must NOT appear in emptyFields
    expect(res.body.emptyFields).not.toContain('Penny_Trail__c');
    expect(res.body.emptyFields).not.toContain('Penny_Confidence_Score__c');
    // Unseeded fields still appear
    expect(res.body.emptyFields).toContain('Penny_LMS_Learner_ID__c');
  });

  test('enrollment completions are not confused with empty data', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(sfOk([SEEDED_CONTACT]))
      .mockResolvedValueOnce(sfOk([]))
      .mockResolvedValueOnce(sfOk([{
        Id: 'enroll_001', Name: 'Admin Course Enrollment',
        Current_Module__c: 'mod_003',
        Current_Module__r: { Name: 'Module 3' },
        Course__r: { Name: 'Salesforce Admin Foundations' },
      }]))
      .mockResolvedValueOnce(sfOk([COMPLETION_RECORD]))
    );

    const res = await request(app).get('/api/learner/profile');

    expect(res.body.enrollments).toHaveLength(1);
    expect(res.body.enrollments[0].currentModuleName).toBe('Module 3');
    expect(res.body.enrollments[0].courseName).toBe('Salesforce Admin Foundations');
    expect(res.body.completions).toHaveLength(1);
  });
});

describe('GET /api/learner/profile — query failure', () => {
  test('returns 503 with ok:false and contactError when Contact query fails', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sfErr(500)));

    const res = await request(app).get('/api/learner/profile');

    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(typeof res.body.contactError).toBe('string');
    expect(res.body.contact).toBeNull();
  });

  test('503 failure is distinguishable from 200 empty result', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    // Failure case
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sfErr(503)));
    const failed = await request(app).get('/api/learner/profile');
    expect(failed.status).toBe(503);
    expect(failed.body.ok).toBe(false);
    expect(typeof failed.body.contactError).toBe('string');

    vi.restoreAllMocks();

    // Empty-but-ok case
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(sfOk([BARE_CONTACT]))
      .mockResolvedValueOnce(sfOk([]))
      .mockResolvedValueOnce(sfOk([]))
      .mockResolvedValueOnce(sfOk([]))
    );
    const empty = await request(app).get('/api/learner/profile');
    expect(empty.status).toBe(200);
    expect(empty.body.ok).toBe(true);
    expect(empty.body.contactError).toBeUndefined();
    expect(empty.body.completions).toEqual([]);
  });

  test('returns 503 when SF is not configured', async () => {
    delete process.env['SALESFORCE_INSTANCE_URL'];
    delete process.env['SF_SERVICE_TOKEN'];

    const res = await request(app).get('/api/learner/profile');

    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.contactError).toBeDefined();
  });

  test('PE failure does not block Contact data from returning', async () => {
    process.env['SALESFORCE_INSTANCE_URL'] = 'https://test.salesforce.com';
    process.env['SF_SERVICE_TOKEN']        = 'test-token';

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(sfOk([SEEDED_CONTACT]))  // Contact ok
      .mockResolvedValueOnce(sfErr(403))              // PE fails (permissions)
      .mockResolvedValueOnce(sfOk([]))                // enrollment ok
      .mockResolvedValueOnce(sfOk([]))                // completions ok
    );

    const res = await request(app).get('/api/learner/profile');

    // Contact succeeded → ok is true, contact is populated
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.contact.firstName).toBe('Alex');
    // PE failed → error noted, array empty
    expect(res.body.programEngagements).toEqual([]);
    expect(typeof res.body.engagementError).toBe('string');
  });
});
