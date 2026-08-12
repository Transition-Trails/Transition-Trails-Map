/**
 * sfTaskOwnership.test.ts
 *
 * Confirms that GET /api/sf/tasks and PATCH /api/sf/tasks/:id/complete
 * enforce per-user ownership so that one staff member can never read or
 * mutate a colleague's Salesforce Tasks.
 *
 * Auth model mirrors slackOAuthRoutes.test.ts — session is injected via the
 * express-session shim so the real middleware stack is exercised.
 *
 * Covers:
 *  1.  GET /sf/tasks — 401 when sfUserId is absent from session
 *  2.  GET /sf/tasks — SOQL always contains OwnerId = current user's ID
 *  3.  PATCH /sf/tasks/:id/complete — 401 when sfUserId absent from session
 *  4.  PATCH /sf/tasks/:id/complete — 404 when query returns no owned record (cross-owner attempt)
 *  5.  PATCH /sf/tasks/:id/complete — 200 when query confirms ownership
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Auth middleware passthrough ───────────────────────────────────────────────
// staffAuthGate in routes/index.ts calls requireStaff; mock it to pass through
// so tests reach the route handler without a real staff session.

vi.mock('../middlewares/requireAuth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../middlewares/requireAuth.js')>();
  return {
    ...actual,
    requireStaff:        (_req: unknown, _res: unknown, next: () => void) => next(),
    requireAdmin:        (_req: unknown, _res: unknown, next: () => void) => next(),
  requireSuperAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
    requireHomebaseAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
    isStaff:     () => true,
    isAdmin:     () => true,
    isSuperAdmin: () => false,
  };
});

// ── Session shim ──────────────────────────────────────────────────────────────

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {};
  return { mockSession };
});

vi.mock('express-session', () => ({
  default: () => (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req['session'] = new Proxy(mockSession, {
      get(target, prop) {
        if (prop === 'save')       return (cb?: () => void) => cb?.();
        if (prop === 'destroy')    return (cb?: () => void) => cb?.();
        if (prop === 'regenerate') return (cb?: () => void) => cb?.();
        if (prop === 'reload')     return (cb?: () => void) => cb?.();
        if (prop === 'touch')      return (cb?: () => void) => cb?.();
        return (target as Record<string | symbol, unknown>)[prop];
      },
      set(target, prop, value) {
        (target as Record<string | symbol, unknown>)[prop] = value;
        return true;
      },
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

// ── SalesforceClient mock ─────────────────────────────────────────────────────
//
// getSalesforceClient returns a SalesforceClient built from session tokens.
// We mock the constructor so tests control query() and updateRecord() without
// making real HTTP calls.

const { mockQuery, mockUpdateRecord } = vi.hoisted(() => ({
  mockQuery:        vi.fn(),
  mockUpdateRecord: vi.fn(),
}));

vi.mock('../lib/getSalesforceClient.js', () => ({
  getSalesforceClient: () => ({
    query:        mockQuery,
    updateRecord: mockUpdateRecord,
    createRecord: vi.fn().mockResolvedValue({ id: 'NEW_TASK_ID', success: true }),
  }),
}));

// ── App import (after all mocks registered) ───────────────────────────────────

import app from '../app.js';

// ── Session helpers ───────────────────────────────────────────────────────────

function setStaffSession(sfUserId = '005CURRENT0001ABC') {
  Object.assign(mockSession, {
    googleEmail:      'staff@transitiontrails.org',
    googleGroups:     ['trailosmembers'],
    googleAudience:   null,
    sfAccessToken:    'ACCESS',
    sfRefreshToken:   'REFRESH',
    sfInstanceUrl:    'https://test.salesforce.com',
    sfUserId:         sfUserId,
  });
}

function clearSession() {
  for (const key of Object.keys(mockSession)) delete mockSession[key];
}

function resetMocks() {
  vi.clearAllMocks();
  // Default: query returns an empty result set
  mockQuery.mockResolvedValue({ totalSize: 0, done: true, records: [] });
  mockUpdateRecord.mockResolvedValue(undefined);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SF task ownership enforcement', () => {
  beforeEach(() => {
    clearSession();
    resetMocks();
  });

  // ── GET /sf/tasks ───────────────────────────────────────────────────────────

  it('1. GET /sf/tasks — 401 when sfUserId is absent from session', async () => {
    // Auth tokens present but sfUserId not set (SF connection incomplete)
    Object.assign(mockSession, {
      googleEmail:    'staff@transitiontrails.org',
      googleGroups:   ['trailosmembers'],
      googleAudience: null,
      sfAccessToken:  'ACCESS',
      sfRefreshToken: 'REFRESH',
      sfInstanceUrl:  'https://test.salesforce.com',
      // sfUserId intentionally absent
    });

    const res = await request(app).get('/api/sf/tasks');
    expect(res.status).toBe(401);
  });

  it('2. GET /sf/tasks — SOQL contains OwnerId scoped to session sfUserId', async () => {
    setStaffSession('005ALICE0001AAAAAA');

    mockQuery.mockResolvedValue({
      totalSize: 1,
      done: true,
      records: [{ Id: 'TASK_001', Subject: 'Alice task', Status: 'Not Started' }],
    });

    const res = await request(app).get('/api/sf/tasks');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);

    // The executed SOQL must be scoped to Alice's ID — never a cross-org query
    const [capturedSoql] = mockQuery.mock.calls[0] as [string];
    expect(capturedSoql).toContain("OwnerId = '005ALICE0001AAAAAA'");
    // Confirm IsDeleted = false is also applied so soft-deleted tasks are excluded
    expect(capturedSoql).toContain('IsDeleted = false');
  });

  // ── PATCH /sf/tasks/:id/complete ───────────────────────────────────────────

  it('3. PATCH /sf/tasks/:id/complete — 401 when sfUserId absent from session', async () => {
    Object.assign(mockSession, {
      googleEmail:    'staff@transitiontrails.org',
      googleGroups:   ['trailosmembers'],
      googleAudience: null,
      sfAccessToken:  'ACCESS',
      sfRefreshToken: 'REFRESH',
      sfInstanceUrl:  'https://test.salesforce.com',
      // sfUserId intentionally absent
    });

    const res = await request(app).patch('/api/sf/tasks/00T000000000001AAA/complete');
    expect(res.status).toBe(401);
    // updateRecord must not be called — the task must not be mutated
    expect(mockUpdateRecord).not.toHaveBeenCalled();
  });

  it('4. PATCH /sf/tasks/:id/complete — 404 when Task is not owned by current user (cross-owner IDOR attempt)', async () => {
    setStaffSession('005BOB00001BBBBBB');

    // Ownership query returns no records — the task belongs to someone else
    mockQuery.mockResolvedValue({ totalSize: 0, done: true, records: [] });

    const res = await request(app).patch('/api/sf/tasks/00T000000000002AAA/complete');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'Task not found.' });

    // updateRecord must NOT be called — foreign task must never be mutated
    expect(mockUpdateRecord).not.toHaveBeenCalled();

    // Ownership SOQL must scope to Bob's ID
    const [ownershipSoql] = mockQuery.mock.calls[0] as [string];
    expect(ownershipSoql).toContain("OwnerId = '005BOB00001BBBBBB'");
    expect(ownershipSoql).toContain("Id = '00T000000000002AAA'");
  });

  it('5. PATCH /sf/tasks/:id/complete — 200 when task is owned by current user', async () => {
    setStaffSession('005ALICE0001AAAAAA');

    // Ownership query returns the task — it belongs to Alice
    mockQuery.mockResolvedValue({
      totalSize: 1,
      done: true,
      records: [{ Id: '00T000000000003AAA' }],
    });

    const res = await request(app).patch('/api/sf/tasks/00T000000000003AAA/complete');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });

    // updateRecord must be called with Status: Completed
    expect(mockUpdateRecord).toHaveBeenCalledOnce();
    const [objectName, taskId, fields] = mockUpdateRecord.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(objectName).toBe('Task');
    expect(taskId).toBe('00T000000000003AAA');
    expect(fields).toMatchObject({ Status: 'Completed' });
  });
});
