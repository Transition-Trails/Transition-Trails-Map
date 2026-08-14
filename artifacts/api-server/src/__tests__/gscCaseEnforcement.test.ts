/**
 * gscCaseEnforcement.test.ts
 *
 * Server-side enforcement for General Service Contract (GSC) cases:
 * record-type lookup must use the Salesforce-resolved name, not the
 * client-supplied string; retry path must not forward underscore-prefixed
 * helper keys to Salesforce.
 *
 * Test matrix:
 *
 *  POST /api/cases/submit — GSC enforcement
 *   G1. GSC record type + no contactId → 400 Contact required
 *   G2. GSC record type + contactId but no serviceContractId → 400 Service Contract required
 *   G3. Forged recordTypeName (different string) with real GSC recordTypeId → 400 (server resolves name from SF)
 *   G4. RecordType lookup throws → 503 (fail closed)
 *   G5. RecordType lookup returns no row → 400 (fail closed)
 *   G6. GSC + all required fields, no SF session → 201 saved locally
 *
 *  GET /api/cases/search/service-contracts
 *   S1. q < 2 chars → 200 { results: [] }
 *   S2. No SF session → 503
 *   S3. SF query succeeds → 200 with id / type / label results
 *   S4. SF query throws → 200 { results: [] } (graceful degradation)
 *
 *  POST /api/cases/:id/retry — customFields filtering
 *   R1+R2. Underscore-prefixed keys stripped; ServiceContractId forwarded
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Auth bypass ────────────────────────────────────────────────────────────────

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:                (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:                (_req: unknown, _res: unknown, next: () => void) => next(),
  requireSuperAdmin:           (_req: unknown, _res: unknown, next: () => void) => next(),
  requireHomebaseAuth:         (_req: unknown, _res: unknown, next: () => void) => next(),
  effectiveIdentityMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:        () => true,
  isAdmin:        () => true,
  isSuperAdmin:   () => false,
  getStaffGroups: () => [],
  getAdminGroups: () => [],
  getTeamGroup:   () => null,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

// ── SF client mock — behaviour controlled per test ─────────────────────────────
// vi.hoisted runs before vi.mock hoisting, making sfCtrl available inside the
// getSalesforceClient factory below.

const { sfCtrl, capturedSf } = vi.hoisted(() => ({
  sfCtrl: {
    available:      true,
    rtName:         'General Service Contract' as string,
    rtQueryThrows:  false,
    rtQueryEmpty:   false,
    scRecords:      [{ Id: 'SC001', Name: 'Service Contract One' }] as Array<{ Id: string; Name: string }>,
    scQueryThrows:  false,
  },
  capturedSf: {
    createArgs: null as Record<string, unknown> | null,
  },
}));

vi.mock('../lib/getSalesforceClient.js', () => ({
  getSalesforceClient: (_req: unknown) => {
    if (!sfCtrl.available) throw new Error('No SF session');
    return {
      query: async <T>(soql: string): Promise<{ records: T[]; totalSize: number; done: boolean }> => {
        if (soql.includes('FROM RecordType')) {
          if (sfCtrl.rtQueryThrows) throw new Error('SF RecordType query error');
          if (sfCtrl.rtQueryEmpty)  return { records: [] as T[], totalSize: 0, done: true };
          return { records: [{ Name: sfCtrl.rtName }] as unknown as T[], totalSize: 1, done: true };
        }
        if (soql.includes('FROM ServiceContract')) {
          if (sfCtrl.scQueryThrows) throw new Error('SF ServiceContract query error');
          return { records: sfCtrl.scRecords as unknown as T[], totalSize: sfCtrl.scRecords.length, done: true };
        }
        // Case number query after create / retry
        return { records: [{ CaseNumber: 'CASE-9999' }] as unknown as T[], totalSize: 1, done: true };
      },
      createRecord: async (_obj: string, data: Record<string, unknown>) => {
        capturedSf.createArgs = data;
        return { id: 'SF_CASE_001', success: true };
      },
    };
  },
}));

// ── proxyFetch stub — return null so orgBaseUrl = "" ──────────────────────────

vi.mock('../lib/salesforceOAuth.js', () => ({
  getEffectiveSfFetch: () => null,
}));

// ── DB mock ───────────────────────────────────────────────────────────────────
// Row objects live inside vi.hoisted so they exist when vi.mock is hoisted.

const { dbRows } = vi.hoisted(() => {
  const LOCAL_ROW = {
    id: 1, subject: 'Test Case', priority: 'Medium', status: 'New',
    recordTypeId: 'RT_GSC', recordTypeName: 'General Service Contract',
    contactId: 'CON001', contactName: null,
    accountId: null, accountName: null,
    ownerId: null, ownerName: null, ownerType: null,
    syncStatus: 'pending',
    customFields: null,
    sfCaseId: null, sfCaseNumber: null, sfCaseUrl: null,
    createdByEmail: 'staff@transitiontrails.org',
    createdAt: new Date(), updatedAt: new Date(),
  };

  const CLAIMED_ROW = {
    ...LOCAL_ROW,
    id: 99,
    syncStatus: 'retrying',
    // customFields holds a real SF field AND underscore-prefixed helper keys
    customFields: {
      ServiceContractId: 'SC001',
      _displayName:      'SC One Display',
      _helper:           'internal-only',
    } as Record<string, unknown>,
  };

  return {
    dbRows: {
      insert:  [LOCAL_ROW]   as unknown[],
      update1: [CLAIMED_ROW] as unknown[],
      update2: [{ ...CLAIMED_ROW, syncStatus: 'synced', sfCaseId: 'SF_CASE_001' }] as unknown[],
      select:  []            as unknown[],
    },
  };
});

// updateCallCount is a plain module-level variable; closures in vi.mock capture
// it by reference so reading it at call-time (not at initialisation-time) is fine.
let updateCallCount = 0;

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(dbRows.insert)),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => {
            updateCallCount += 1;
            return Promise.resolve(updateCallCount === 1 ? dbRows.update1 : dbRows.update2);
          }),
        })),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue(dbRows.select),
          limit:   vi.fn().mockResolvedValue(dbRows.select),
        })),
      })),
    })),
  },
  submittedCasesTable: {},
}));

vi.mock('drizzle-orm', () => ({
  eq:      vi.fn().mockReturnValue({ __eq: true }),
  desc:    vi.fn(f => ({ __desc: f })),
  and:     vi.fn().mockReturnValue({ __and: true }),
  inArray: vi.fn().mockReturnValue({ __inArray: true }),
}));

// ── Session shim ──────────────────────────────────────────────────────────────

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

import app from '../app.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAFF_SESSION = {
  googleEmail:    'staff@transitiontrails.org',
  googleAudience: 'staff' as const,
  googleGroups:   [] as string[],
  sfUserId:       '005SF000001StaffXXX',
};

function clearSession() {
  for (const k of Object.keys(mockSession)) delete mockSession[k];
}

function resetControls() {
  sfCtrl.available     = true;
  sfCtrl.rtName        = 'General Service Contract';
  sfCtrl.rtQueryThrows = false;
  sfCtrl.rtQueryEmpty  = false;
  sfCtrl.scRecords     = [{ Id: 'SC001', Name: 'Service Contract One' }];
  sfCtrl.scQueryThrows = false;
  capturedSf.createArgs = null;
  updateCallCount = 0;
}

beforeEach(() => {
  clearSession();
  resetControls();
  Object.assign(mockSession, STAFF_SESSION);
});

// ── POST /api/cases/submit — GSC enforcement ──────────────────────────────────

describe('POST /api/cases/submit — General Service Contract enforcement', () => {
  const RT_ID = 'RT000GSC001aaaBBBc';   // alphanumeric Salesforce-style ID

  it('G1: GSC type + no contactId → 400 Contact required', async () => {
    const res = await request(app)
      .post('/api/cases/submit')
      .send({ subject: 'Test', recordTypeId: RT_ID, serviceContractId: 'SC001' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Contact is required/i);
  });

  it('G2: GSC type + contactId but no serviceContractId → 400 Service Contract required', async () => {
    const res = await request(app)
      .post('/api/cases/submit')
      .send({ subject: 'Test', recordTypeId: RT_ID, contactId: 'CON001' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Service Contract is required/i);
  });

  it('G3: forged recordTypeName with real GSC recordTypeId → server still enforces GSC rules', async () => {
    // Client sends a non-GSC name, but SF resolves the ID to GSC.
    // Server must use the SF-resolved name, not the client string.
    const res = await request(app)
      .post('/api/cases/submit')
      .send({
        subject:        'Test',
        recordTypeId:   RT_ID,
        recordTypeName: 'Standard Case',   // forged — SF says it is GSC
        contactId:      'CON001',
        // serviceContractId intentionally omitted
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Service Contract is required/i);
  });

  it('G4: RecordType lookup throws → 503 (fail closed, not fall-back)', async () => {
    sfCtrl.rtQueryThrows = true;
    const res = await request(app)
      .post('/api/cases/submit')
      .send({ subject: 'Test', recordTypeId: RT_ID, contactId: 'CON001', serviceContractId: 'SC001' });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/unable to verify record type/i);
  });

  it('G5: RecordType lookup returns no row → 400 (fail closed)', async () => {
    sfCtrl.rtQueryEmpty = true;
    const res = await request(app)
      .post('/api/cases/submit')
      .send({ subject: 'Test', recordTypeId: RT_ID, contactId: 'CON001', serviceContractId: 'SC001' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not found in Salesforce/i);
  });

  it('G6: GSC + all required fields, no SF session → 201 saved locally', async () => {
    sfCtrl.available = false;   // no session → client-supplied name used as fallback
    const res = await request(app)
      .post('/api/cases/submit')
      .send({
        subject:           'GSC Local Save',
        recordTypeId:      RT_ID,
        recordTypeName:    'General Service Contract',
        contactId:         'CON001',
        serviceContractId: 'SC001',
      });

    expect(res.status).toBe(201);
    expect(res.body.synced).toBe(false);
  });
});

// ── GET /api/cases/search/service-contracts ───────────────────────────────────

describe('GET /api/cases/search/service-contracts', () => {
  it('S1: q shorter than 2 chars → 200 with empty results (no SF call)', async () => {
    const res = await request(app).get('/api/cases/search/service-contracts?q=x');

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('S2: no SF session → 503', async () => {
    sfCtrl.available = false;
    const res = await request(app).get('/api/cases/search/service-contracts?q=Acme');

    expect(res.status).toBe(503);
  });

  it('S3: SF query succeeds → 200 with id / type / label mapped results', async () => {
    const res = await request(app).get('/api/cases/search/service-contracts?q=Acme');

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([
      { id: 'SC001', type: 'ServiceContract', label: 'Service Contract One' },
    ]);
  });

  it('S4: SF query throws → 200 with empty results (graceful degradation)', async () => {
    sfCtrl.scQueryThrows = true;
    const res = await request(app).get('/api/cases/search/service-contracts?q=Acme');

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });
});

// ── POST /api/cases/:id/retry — customFields filtering ────────────────────────

describe('POST /api/cases/:id/retry — underscore-prefixed key filtering', () => {
  it('R1+R2: _ prefixed keys stripped from SF payload; ServiceContractId forwarded', async () => {
    // dbRows.update1 = [CLAIMED_ROW] whose customFields has ServiceContractId
    // plus _displayName and _helper.  After retry the SF createRecord call must
    // include ServiceContractId but exclude the underscore-prefixed helpers.
    await request(app).post('/api/cases/99/retry');

    expect(capturedSf.createArgs).not.toBeNull();

    const data = capturedSf.createArgs!;

    // R2: real SF field forwarded
    expect(data).toHaveProperty('ServiceContractId', 'SC001');

    // R1: underscore helper keys absent
    expect(Object.keys(data)).not.toContain('_displayName');
    expect(Object.keys(data)).not.toContain('_helper');
  });
});
