/**
 * promptTemplatesAuth.test.ts
 *
 * Verifies that POST and PATCH /api/penny/prompt-templates require admin
 * access, and that the self-approval rule is enforced server-side on PATCH.
 *
 * Separate from promptTemplates.test.ts so the requireAdmin mock can be
 * controlled per-test without affecting the business-logic suite.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Hoisted refs ───────────────────────────────────────────────────────────────

const { mockRequireAdmin, mockWhere, mockOnConflictDoNothing, mockUpdateWhere, mockSession } =
  vi.hoisted(() => {
    const mockSession: Record<string, unknown> = {};
    return {
      mockRequireAdmin:        vi.fn(),
      mockWhere:               vi.fn().mockResolvedValue([]),
      mockOnConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 1 }),
      mockUpdateWhere:         vi.fn().mockResolvedValue({ rowCount: 1 }),
      mockSession,
    };
  });

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff:        (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin:        (...args: unknown[]) => (mockRequireAdmin as (...a: unknown[]) => void)(...args),
  requireHomebaseAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:               () => true,
  isAdmin:               () => true,
  isSuperAdmin:          () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
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

vi.mock('session-file-store', () => ({
  default: () => class FakeFileStore {
    get(_sid: string, cb: (err: null, session: null) => void) { cb(null, null); }
    set(_sid: string, _session: unknown, cb: () => void) { cb(); }
    destroy(_sid: string, cb: () => void) { cb(); }
  },
}));

vi.mock('@workspace/db', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([]), where: mockWhere })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoNothing: mockOnConflictDoNothing })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: mockUpdateWhere })) })),
  },
}));

vi.mock('@workspace/db/schema', () => ({
  promptTemplatesTable: { id: 'id', data: 'data', createdAt: 'created_at', updatedAt: 'updated_at' },
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn().mockReturnValue('eq-expr') }));

import app from '../app.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Make requireAdmin act as a real admin gate that returns 403. */
function denyAdmin() {
  mockRequireAdmin.mockImplementation(
    (_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }, _next: unknown) => {
      res.status(403).json({ error: 'Forbidden' });
    }
  );
}

/** Make requireAdmin pass through (authenticated admin). */
function allowAdmin(email = 'admin@transitiontrails.org') {
  mockRequireAdmin.mockImplementation(
    (_req: Record<string, unknown>, _res: unknown, next: () => void) => {
      // Inject email into the session shim so self-approval checks can read it.
      mockSession['sfEmail'] = email;
      next();
    }
  );
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset session
  for (const k of Object.keys(mockSession)) delete mockSession[k];
  // Default: admin allowed
  allowAdmin();
  mockWhere.mockResolvedValue([]);
});

// ── POST auth ──────────────────────────────────────────────────────────────────

describe('POST /api/penny/prompt-templates — auth enforcement', () => {
  test('returns 403 when caller is not an admin', async () => {
    denyAdmin();
    const res = await request(app)
      .post('/api/penny/prompt-templates')
      .send({ id: 'tpl-x', name: 'Test' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(403);
  });

  test('returns 201 when caller is an admin', async () => {
    const res = await request(app)
      .post('/api/penny/prompt-templates')
      .send({ id: 'tpl-y', name: 'Valid' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(201);
  });
});

// ── PATCH auth ─────────────────────────────────────────────────────────────────

describe('PATCH /api/penny/prompt-templates/:id — auth enforcement', () => {
  test('returns 403 when caller is not an admin', async () => {
    denyAdmin();
    const res = await request(app)
      .patch('/api/penny/prompt-templates/tpl-1')
      .send({ status: 'Approved' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(403);
  });

  test('returns 404 when admin patches a missing template', async () => {
    mockWhere.mockResolvedValueOnce([]);
    const res = await request(app)
      .patch('/api/penny/prompt-templates/missing')
      .send({ status: 'Approved' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(404);
  });

  test('returns 200 when admin patches an existing template', async () => {
    const existing = { id: 'tpl-1', data: { id: 'tpl-1', name: 'My Template', status: 'Draft' } };
    mockWhere.mockResolvedValueOnce([existing]);
    allowAdmin('reviewer@transitiontrails.org');

    const res = await request(app)
      .patch('/api/penny/prompt-templates/tpl-1')
      .send({ status: 'Approved' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body.template.status).toBe('Approved');
  });
});

// ── Self-approval rule ─────────────────────────────────────────────────────────

describe('PATCH /api/penny/prompt-templates/:id — self-approval rule', () => {
  test('returns 403 when the approver is the same person who requested review', async () => {
    const SUBMITTER = 'alice@transitiontrails.org';
    allowAdmin(SUBMITTER);

    const existing = {
      id: 'tpl-2',
      data: { id: 'tpl-2', name: 'Alice Template', status: 'Review', reviewRequestedBy: SUBMITTER },
    };
    mockWhere.mockResolvedValueOnce([existing]);

    const res = await request(app)
      .patch('/api/penny/prompt-templates/tpl-2')
      .send({ status: 'Approved' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Self-approval/i);
  });

  test('returns 200 when a different admin approves the template', async () => {
    const SUBMITTER = 'alice@transitiontrails.org';
    allowAdmin('bob@transitiontrails.org'); // different admin

    const existing = {
      id: 'tpl-3',
      data: { id: 'tpl-3', name: 'Alice Template', status: 'Review', reviewRequestedBy: SUBMITTER },
    };
    mockWhere.mockResolvedValueOnce([existing]);

    const res = await request(app)
      .patch('/api/penny/prompt-templates/tpl-3')
      .send({ status: 'Approved' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.template.status).toBe('Approved');
  });

  test('allows approval when reviewRequestedBy is not set', async () => {
    // Template has no reviewRequestedBy — self-approval rule does not apply.
    allowAdmin('admin@transitiontrails.org');

    const existing = {
      id: 'tpl-4',
      data: { id: 'tpl-4', name: 'Unowned Template', status: 'Draft' },
    };
    mockWhere.mockResolvedValueOnce([existing]);

    const res = await request(app)
      .patch('/api/penny/prompt-templates/tpl-4')
      .send({ status: 'Approved' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
  });

  test('allows non-approval patches by the original submitter', async () => {
    // Editing a template (not approving) is not subject to the self-approval rule.
    const SUBMITTER = 'alice@transitiontrails.org';
    allowAdmin(SUBMITTER);

    const existing = {
      id: 'tpl-5',
      data: { id: 'tpl-5', name: 'Alice Template', status: 'Review', reviewRequestedBy: SUBMITTER },
    };
    mockWhere.mockResolvedValueOnce([existing]);

    const res = await request(app)
      .patch('/api/penny/prompt-templates/tpl-5')
      .send({ name: 'Updated Name' }) // not an approval
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
  });
});
