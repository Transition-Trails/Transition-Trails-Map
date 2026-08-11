import { describe, test, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// vi.hoisted: refs accessible inside vi.mock() factory AND in tests
const { mockOrderBy, mockWhere, mockOnConflictDoNothing, mockUpdateWhere } = vi.hoisted(() => ({
  mockOrderBy: vi.fn().mockResolvedValue([]),
  mockWhere: vi.fn().mockResolvedValue([]),
  mockOnConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 1 }),
  mockUpdateWhere: vi.fn().mockResolvedValue({ rowCount: 1 }),
}));

// Auth middleware is tested separately in authEnforcement.test.ts.
// Mock it here so business-logic tests run without needing an OAuth session.
vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireHomebaseAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:        () => true,
  isAdmin:        () => true,
  isSuperAdmin:   () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

vi.mock('connect-pg-simple', () => ({
  default: () => class FakePgStore {
    on(_event: string, _cb: () => void) {}
    get(_sid: string, cb: (err: null, s: null) => void) { cb(null, null); }
    set(_sid: string, _s: unknown, cb: () => void) { cb(); }
    destroy(_sid: string, cb: () => void) { cb(); }
  },
}));

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ orderBy: mockOrderBy, where: mockWhere })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ onConflictDoNothing: mockOnConflictDoNothing, catch: vi.fn() })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: mockUpdateWhere })),
    })),
  },
}));

vi.mock('@workspace/db/schema', () => ({
  promptVariablesTable: {
    id: 'id',
    data: 'data',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  trailOsAuditLogTable: { _: { name: 'trail_os_audit_log' } },
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn().mockReturnValue('eq-expr') }));

import app from '../app.js';

beforeEach(() => {
  mockOrderBy.mockResolvedValue([]);
  mockWhere.mockResolvedValue([]);
  mockOnConflictDoNothing.mockResolvedValue({ rowCount: 1 });
  mockUpdateWhere.mockResolvedValue({ rowCount: 1 });
});

// ── GET /api/penny/prompt-variables ─────────────────────────────────────────

describe('GET /api/penny/prompt-variables', () => {
  test('returns 200 with variables array', async () => {
    const res = await request(app).get('/api/penny/prompt-variables');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('variables');
    expect(Array.isArray(res.body.variables)).toBe(true);
  });

  test('returns JSON content-type', async () => {
    const res = await request(app).get('/api/penny/prompt-variables');
    expect(res.headers['content-type']).toMatch(/json/);
  });

  test('maps DB rows to their .data field', async () => {
    const fakeRow = { id: 'var-1', data: { id: 'var-1', name: 'learner_name', type: 'text' } };
    mockOrderBy.mockResolvedValueOnce([fakeRow]);
    const res = await request(app).get('/api/penny/prompt-variables');
    expect(res.status).toBe(200);
    expect(res.body.variables).toHaveLength(1);
    expect(res.body.variables[0]).toMatchObject({ id: 'var-1', name: 'learner_name' });
  });

  test('returns empty array when DB is empty', async () => {
    mockOrderBy.mockResolvedValueOnce([]);
    const res = await request(app).get('/api/penny/prompt-variables');
    expect(res.body.variables).toEqual([]);
  });
});

// ── POST /api/penny/prompt-variables ────────────────────────────────────────

describe('POST /api/penny/prompt-variables', () => {
  test('returns 201 with variable body when id and name are provided', async () => {
    const payload = { id: 'var-new', name: 'program_name', type: 'text', source: 'Salesforce' };
    const res = await request(app)
      .post('/api/penny/prompt-variables')
      .send(payload)
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('variable');
    expect(res.body.variable).toMatchObject({ id: 'var-new', name: 'program_name' });
  });

  test('returns 400 when id is missing', async () => {
    const res = await request(app)
      .post('/api/penny/prompt-variables')
      .send({ name: 'no_id' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/penny/prompt-variables')
      .send({ id: 'var-no-name' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('name');
  });

  test('returns 400 when body is empty', async () => {
    const res = await request(app)
      .post('/api/penny/prompt-variables')
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });
});

// ── POST /api/penny/prompt-variables/seed ───────────────────────────────────

describe('POST /api/penny/prompt-variables/seed', () => {
  test('returns 200 with seeded and total counts', async () => {
    const payload = {
      variables: [
        { id: 'v-a', name: 'learner_name' },
        { id: 'v-b', name: 'program_stage' },
      ],
    };
    const res = await request(app)
      .post('/api/penny/prompt-variables/seed')
      .send(payload)
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('seeded');
    expect(res.body).toHaveProperty('total');
    expect(res.body.total).toBe(2);
    expect(typeof res.body.seeded).toBe('number');
  });

  test('seeded equals total when all inserts succeed', async () => {
    const payload = { variables: [{ id: 'v1', name: 'v1' }, { id: 'v2', name: 'v2' }] };
    const res = await request(app)
      .post('/api/penny/prompt-variables/seed')
      .send(payload)
      .set('Content-Type', 'application/json');
    expect(res.body.seeded).toBe(2);
  });

  test('seeded is 0 when all inserts conflict (rowCount 0)', async () => {
    mockOnConflictDoNothing.mockResolvedValue({ rowCount: 0 });
    const payload = { variables: [{ id: 'dup-v', name: 'dup' }] };
    const res = await request(app)
      .post('/api/penny/prompt-variables/seed')
      .send(payload)
      .set('Content-Type', 'application/json');
    expect(res.body.seeded).toBe(0);
    expect(res.body.total).toBe(1);
  });

  test('returns 400 when variables field is missing', async () => {
    const res = await request(app)
      .post('/api/penny/prompt-variables/seed')
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when variables is not an array', async () => {
    const res = await request(app)
      .post('/api/penny/prompt-variables/seed')
      .send({ variables: 'not-an-array' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });
});

// ── PATCH /api/penny/prompt-variables/:id ───────────────────────────────────

describe('PATCH /api/penny/prompt-variables/:id', () => {
  test('returns 404 when variable does not exist', async () => {
    mockWhere.mockResolvedValueOnce([]);
    const res = await request(app)
      .patch('/api/penny/prompt-variables/missing-id')
      .send({ type: 'list' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 200 with merged variable when found', async () => {
    const existing = {
      id: 'var-1',
      data: { id: 'var-1', name: 'learner_name', type: 'text', source: 'Salesforce' },
    };
    mockWhere.mockResolvedValueOnce([existing]);
    const res = await request(app)
      .patch('/api/penny/prompt-variables/var-1')
      .send({ type: 'list' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('variable');
    expect(res.body.variable).toMatchObject({ id: 'var-1', name: 'learner_name', type: 'list' });
  });

  test('id in path takes precedence over body id', async () => {
    const existing = { id: 'var-1', data: { id: 'var-1', name: 'x' } };
    mockWhere.mockResolvedValueOnce([existing]);
    const res = await request(app)
      .patch('/api/penny/prompt-variables/var-1')
      .send({ id: 'attempted-override', name: 'Updated' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body.variable.id).toBe('var-1');
  });
});
