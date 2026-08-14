/**
 * gscCaseRetrySync.test.ts
 *
 * End-to-end verification that a General Service Contract (GSC) case saved
 * locally without a Salesforce session syncs correctly once the connection
 * is restored.
 *
 * Scenario under test:
 *   1. POST /api/cases/submit with no SF session → case stored locally with
 *      syncStatus "pending" and ServiceContractId inside customFields.
 *   2. POST /api/cases/:id/retry (once SF is connected) → retry reads the
 *      local row, spreads customFields into the SF payload, and creates the
 *      SF Case with both ContactId and ServiceContractId set correctly.
 *   3. Local row is updated to syncStatus "synced" and sfCaseId is populated.
 *
 * Test matrix:
 *
 *  Local-save path (POST /api/cases/submit, no SF session)
 *   L1. Response is 201, synced:false when SF unavailable
 *   L2. DB insert receives ServiceContractId inside customFields
 *   L3. DB insert receives contactId as a top-level column
 *   L4. DB insert records syncStatus "pending"
 *   L5. No SF createRecord call is made when there is no session
 *
 *  Retry-sync path (POST /api/cases/:id/retry, SF now connected)
 *   R1. Response is 200, synced:true on a pending GSC case
 *   R2. SF payload includes ContactId
 *   R3. SF payload includes ServiceContractId (spread from customFields)
 *   R4. SF payload does NOT include underscore-prefixed helper keys
 *   R5. Local row is updated to syncStatus "synced" after successful retry
 *   R6. sfCaseId returned in the response matches what SF returned
 *
 *  Edge cases
 *   E1. Retry on an already-synced case → 409 (idempotency guard)
 *   E2. Retry without SF session → 401 (connection required)
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

// ── SF client mock ────────────────────────────────────────────────────────────
//
// sfCtrl.available controls whether getSalesforceClient throws (no session) or
// returns a working mock.  capturedSf records the data passed to createRecord.

const { sfCtrl, capturedSf } = vi.hoisted(() => ({
  sfCtrl: {
    available: false as boolean,   // default: no SF session (local-save scenario)
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
          // Return GSC name so server passes GSC validation when SF is connected
          return {
            records: [{ Name: 'General Service Contract' }] as unknown as T[],
            totalSize: 1, done: true,
          };
        }
        // Case number fetch after create
        return {
          records: [{ CaseNumber: 'GSC-00042' }] as unknown as T[],
          totalSize: 1, done: true,
        };
      },
      createRecord: async (_obj: string, data: Record<string, unknown>) => {
        capturedSf.createArgs = data;
        return { id: 'SF_GSC_CASE_001', success: true };
      },
    };
  },
}));

// ── proxyFetch stub — no orgBaseUrl needed for these tests ───────────────────

vi.mock('../lib/salesforceOAuth.js', () => ({
  getEffectiveSfFetch: () => null,
}));

// ── DB mock ───────────────────────────────────────────────────────────────────
//
// The DB mock must:
//  • Capture the values object passed to db.insert().values() so tests can
//    assert what customFields / contactId the server tried to persist.
//  • Return a LOCAL_ROW that mimics a pending GSC case (customFields contains
//    ServiceContractId, contactId is set at the top level).
//  • Return a CLAIMED_ROW on the first update (retry → "retrying") that
//    carries the customFields the retry endpoint reads.
//  • Return a SYNCED_ROW on the second update (retry succeeded → "synced").

const { dbCapture, dbRows } = vi.hoisted(() => {
  const LOCAL_ROW = {
    id: 42,
    subject: 'GSC Test Case',
    description: null,
    priority: 'Medium',
    status: 'New',
    recordTypeId:   'RT000GSC001aaaBBBc',
    recordTypeName: 'General Service Contract',
    contactId:   'CON_GSC_001',
    contactName: 'Jane Learner',
    accountId:   null,
    accountName: null,
    ownerId:   null,
    ownerName: null,
    ownerType: null,
    syncStatus:     'pending',
    syncError:      null,
    sfCaseId:       null,
    sfCaseNumber:   null,
    customFields: {
      ServiceContractId: 'SC_GSC_001',
    } as Record<string, unknown>,
    createdByEmail: 'staff@transitiontrails.org',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Claimed row (returned by first update: pending → retrying).
  // Includes an underscore-prefixed helper key to verify it is stripped.
  const CLAIMED_ROW = {
    ...LOCAL_ROW,
    syncStatus: 'retrying',
    customFields: {
      ServiceContractId: 'SC_GSC_001',
      _displayLabel:     'Service Contract One — for display only',
    } as Record<string, unknown>,
  };

  const SYNCED_ROW = {
    ...LOCAL_ROW,
    syncStatus:   'synced',
    sfCaseId:     'SF_GSC_CASE_001',
    sfCaseNumber: 'GSC-00042',
    syncError:    null,
  };

  return {
    dbCapture: {
      insertValues: null as Record<string, unknown> | null,
    },
    dbRows: { LOCAL_ROW, CLAIMED_ROW, SYNCED_ROW },
  };
});

// updateCallCount tracks which update call we are on (1 = claim, 2 = synced/failed).
let updateCallCount = 0;

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    insert: vi.fn(() => ({
      values: vi.fn((vals: Record<string, unknown>) => {
        dbCapture.insertValues = vals;
        return {
          returning: vi.fn(() => Promise.resolve([dbRows.LOCAL_ROW])),
        };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => {
            updateCallCount += 1;
            if (updateCallCount === 1) {
              // Retry atomic claim: pending → retrying
              return Promise.resolve([dbRows.CLAIMED_ROW]);
            }
            // Sync success: retrying → synced
            return Promise.resolve([dbRows.SYNCED_ROW]);
          }),
        })),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue([]),
          limit:   vi.fn().mockResolvedValue([]),
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

const { mockSession } = vi.hoisted(() => ({
  mockSession: {} as Record<string, unknown>,
}));

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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const STAFF_SESSION = {
  googleEmail:    'staff@transitiontrails.org',
  googleAudience: 'staff' as const,
  googleGroups:   [] as string[],
  sfUserId:       '005SF000001StaffXXX',
};

const GSC_SUBMIT_BODY = {
  subject:           'General Service Contract Case',
  recordTypeId:      'RT000GSC001aaaBBBc',
  recordTypeName:    'General Service Contract',
  contactId:         'CON_GSC_001',
  contactName:       'Jane Learner',
  serviceContractId: 'SC_GSC_001',
  priority:          'High',
};

function clearSession() {
  for (const k of Object.keys(mockSession)) delete mockSession[k];
}

function resetState() {
  sfCtrl.available      = false;
  capturedSf.createArgs = null;
  dbCapture.insertValues = null;
  updateCallCount        = 0;
}

beforeEach(() => {
  clearSession();
  resetState();
  Object.assign(mockSession, STAFF_SESSION);
});

// ── L: Local-save path (no SF session) ───────────────────────────────────────

describe('POST /api/cases/submit — GSC local save (no SF session)', () => {
  it('L1: returns 201 with synced:false when SF is unavailable', async () => {
    const res = await request(app)
      .post('/api/cases/submit')
      .send(GSC_SUBMIT_BODY);

    expect(res.status).toBe(201);
    expect(res.body.synced).toBe(false);
  });

  it('L2: DB insert receives ServiceContractId inside customFields', async () => {
    await request(app)
      .post('/api/cases/submit')
      .send(GSC_SUBMIT_BODY);

    expect(dbCapture.insertValues).not.toBeNull();
    const cf = dbCapture.insertValues!['customFields'] as Record<string, unknown>;
    expect(cf).toMatchObject({ ServiceContractId: 'SC_GSC_001' });
  });

  it('L3: DB insert receives contactId as a top-level column', async () => {
    await request(app)
      .post('/api/cases/submit')
      .send(GSC_SUBMIT_BODY);

    expect(dbCapture.insertValues).not.toBeNull();
    expect(dbCapture.insertValues!['contactId']).toBe('CON_GSC_001');
  });

  it('L4: DB insert records syncStatus as "pending"', async () => {
    await request(app)
      .post('/api/cases/submit')
      .send(GSC_SUBMIT_BODY);

    expect(dbCapture.insertValues).not.toBeNull();
    expect(dbCapture.insertValues!['syncStatus']).toBe('pending');
  });

  it('L5: no SF createRecord call is made when there is no session', async () => {
    await request(app)
      .post('/api/cases/submit')
      .send(GSC_SUBMIT_BODY);

    expect(capturedSf.createArgs).toBeNull();
  });
});

// ── R: Retry-sync path (SF now connected) ─────────────────────────────────────

describe('POST /api/cases/:id/retry — GSC sync after local save', () => {
  beforeEach(() => {
    // Restore connection for retry tests
    sfCtrl.available = true;
  });

  it('R1: returns 200 with synced:true when retry succeeds', async () => {
    const res = await request(app).post('/api/cases/42/retry');

    expect(res.status).toBe(200);
    expect(res.body.synced).toBe(true);
  });

  it('R2: SF payload includes ContactId from the local row', async () => {
    await request(app).post('/api/cases/42/retry');

    expect(capturedSf.createArgs).not.toBeNull();
    expect(capturedSf.createArgs!['ContactId']).toBe('CON_GSC_001');
  });

  it('R3: SF payload includes ServiceContractId spread from customFields', async () => {
    await request(app).post('/api/cases/42/retry');

    expect(capturedSf.createArgs).not.toBeNull();
    expect(capturedSf.createArgs!['ServiceContractId']).toBe('SC_GSC_001');
  });

  it('R4: SF payload does NOT include underscore-prefixed helper keys', async () => {
    await request(app).post('/api/cases/42/retry');

    expect(capturedSf.createArgs).not.toBeNull();
    const keys = Object.keys(capturedSf.createArgs!);
    const underscoreKeys = keys.filter(k => k.startsWith('_'));
    expect(underscoreKeys).toHaveLength(0);
  });

  it('R5: response body shows syncStatus "synced" after a successful retry', async () => {
    const res = await request(app).post('/api/cases/42/retry');

    expect(res.body.case).toBeDefined();
    expect(res.body.case.syncStatus).toBe('synced');
  });

  it('R6: sfCaseId in the response matches the ID returned by Salesforce', async () => {
    const res = await request(app).post('/api/cases/42/retry');

    expect(res.body.sfCaseId).toBe('SF_GSC_CASE_001');
  });
});

// ── E: Edge cases ─────────────────────────────────────────────────────────────

describe('POST /api/cases/:id/retry — edge cases', () => {
  it('E2: retry without SF session → 401 (connection required before claiming the row)', async () => {
    // sfCtrl.available is false by default (set in resetState)
    const res = await request(app).post('/api/cases/42/retry');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/not connected to salesforce/i);
  });

  it('E1: retry on an already-synced case → 409 (idempotency guard)', async () => {
    sfCtrl.available = true;
    // The atomic claim update returns [] (no row claimed) because the status
    // is not in [failed, pending] — simulate by making update return nothing.
    // Then the select fallback must return a synced row.
    //
    // Re-wire db.update to return [] for the claim, and db.select to return
    // the synced row for the fallback lookup.
    const { db } = await import('@workspace/db');

    const selectMock = vi.mocked(db.select);
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue([]),
          limit:   vi.fn().mockResolvedValue([{
            syncStatus:   'synced',
            sfCaseId:     'SF_GSC_CASE_001',
            sfCaseNumber: 'GSC-00042',
          }]),
        })),
      })),
    } as ReturnType<typeof db.select>);

    const updateMock = vi.mocked(db.update);
    updateMock.mockReturnValueOnce({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([]),  // claim fails → row already synced
        })),
      })),
    } as ReturnType<typeof db.update>);

    const res = await request(app).post('/api/cases/42/retry');

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already synced/i);
  });
});
