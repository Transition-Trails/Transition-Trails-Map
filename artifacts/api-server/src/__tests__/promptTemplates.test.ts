import { describe, test, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// vi.hoisted: refs that must be accessible inside vi.mock() factory AND in tests
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
  isStaff:        () => true,
  isAdmin:        () => true,
  isSuperAdmin:   () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

vi.mock('@workspace/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ orderBy: mockOrderBy, where: mockWhere })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ onConflictDoNothing: mockOnConflictDoNothing })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: mockUpdateWhere })),
    })),
  },
}));

vi.mock('@workspace/db/schema', () => ({
  promptTemplatesTable: {
    id: 'id',
    data: 'data',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn().mockReturnValue('eq-expr') }));

import app from '../app.js';

beforeEach(() => {
  mockOrderBy.mockResolvedValue([]);
  mockWhere.mockResolvedValue([]);
  mockOnConflictDoNothing.mockResolvedValue({ rowCount: 1 });
  mockUpdateWhere.mockResolvedValue({ rowCount: 1 });
});

// ── GET /api/penny/prompt-templates ─────────────────────────────────────────

describe('GET /api/penny/prompt-templates', () => {
  test('returns 200 with templates array', async () => {
    const res = await request(app).get('/api/penny/prompt-templates');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('templates');
    expect(Array.isArray(res.body.templates)).toBe(true);
  });

  test('returns JSON content-type', async () => {
    const res = await request(app).get('/api/penny/prompt-templates');
    expect(res.headers['content-type']).toMatch(/json/);
  });

  test('maps DB rows to their .data field', async () => {
    const fakeRow = { id: 'tpl-1', data: { id: 'tpl-1', name: 'Intro Prompt', status: 'Approved' } };
    mockOrderBy.mockResolvedValueOnce([fakeRow]);
    const res = await request(app).get('/api/penny/prompt-templates');
    expect(res.status).toBe(200);
    expect(res.body.templates).toHaveLength(1);
    expect(res.body.templates[0]).toMatchObject({ id: 'tpl-1', name: 'Intro Prompt' });
  });

  test('returns empty array when DB is empty', async () => {
    mockOrderBy.mockResolvedValueOnce([]);
    const res = await request(app).get('/api/penny/prompt-templates');
    expect(res.body.templates).toEqual([]);
  });
});

// ── POST /api/penny/prompt-templates ────────────────────────────────────────

describe('POST /api/penny/prompt-templates', () => {
  test('returns 201 with template body when id and name are provided', async () => {
    const payload = { id: 'tpl-new', name: 'New Template', status: 'Draft' };
    const res = await request(app)
      .post('/api/penny/prompt-templates')
      .send(payload)
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('template');
    expect(res.body.template).toMatchObject({ id: 'tpl-new', name: 'New Template' });
  });

  test('returns 400 when id is missing', async () => {
    const res = await request(app)
      .post('/api/penny/prompt-templates')
      .send({ name: 'No ID' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/penny/prompt-templates')
      .send({ id: 'tpl-no-name' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('name');
  });

  test('returns 400 when body is empty', async () => {
    const res = await request(app)
      .post('/api/penny/prompt-templates')
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });
});

// ── POST /api/penny/prompt-templates/seed ───────────────────────────────────

describe('POST /api/penny/prompt-templates/seed', () => {
  test('returns 200 with seeded and total counts', async () => {
    const payload = {
      templates: [
        { id: 'tpl-a', name: 'Template A' },
        { id: 'tpl-b', name: 'Template B' },
      ],
    };
    const res = await request(app)
      .post('/api/penny/prompt-templates/seed')
      .send(payload)
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('seeded');
    expect(res.body).toHaveProperty('total');
    expect(typeof res.body.seeded).toBe('number');
    expect(res.body.total).toBe(2);
  });

  test('seeded equals total when all inserts succeed', async () => {
    const payload = { templates: [{ id: 'x1', name: 'X1' }, { id: 'x2', name: 'X2' }] };
    const res = await request(app)
      .post('/api/penny/prompt-templates/seed')
      .send(payload)
      .set('Content-Type', 'application/json');
    expect(res.body.seeded).toBe(2);
  });

  test('seeded is 0 when all inserts conflict (rowCount 0)', async () => {
    mockOnConflictDoNothing.mockResolvedValue({ rowCount: 0 });
    const payload = { templates: [{ id: 'dup-1', name: 'Dup' }] };
    const res = await request(app)
      .post('/api/penny/prompt-templates/seed')
      .send(payload)
      .set('Content-Type', 'application/json');
    expect(res.body.seeded).toBe(0);
    expect(res.body.total).toBe(1);
  });

  test('returns 400 when templates field is missing', async () => {
    const res = await request(app)
      .post('/api/penny/prompt-templates/seed')
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when templates is not an array', async () => {
    const res = await request(app)
      .post('/api/penny/prompt-templates/seed')
      .send({ templates: 'not-an-array' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });
});

// ── PATCH /api/penny/prompt-templates/:id ───────────────────────────────────

describe('PATCH /api/penny/prompt-templates/:id', () => {
  test('returns 404 when template does not exist', async () => {
    mockWhere.mockResolvedValueOnce([]);
    const res = await request(app)
      .patch('/api/penny/prompt-templates/missing-id')
      .send({ status: 'Approved' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 200 with merged template when found', async () => {
    const existing = { id: 'tpl-1', data: { id: 'tpl-1', name: 'Original', status: 'Draft' } };
    mockWhere.mockResolvedValueOnce([existing]);
    const res = await request(app)
      .patch('/api/penny/prompt-templates/tpl-1')
      .send({ status: 'Approved' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('template');
    expect(res.body.template).toMatchObject({ id: 'tpl-1', name: 'Original', status: 'Approved' });
  });

  test('id in path takes precedence over body id', async () => {
    const existing = { id: 'tpl-1', data: { id: 'tpl-1', name: 'A' } };
    mockWhere.mockResolvedValueOnce([existing]);
    const res = await request(app)
      .patch('/api/penny/prompt-templates/tpl-1')
      .send({ id: 'attempted-override', name: 'Updated' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body.template.id).toBe('tpl-1');
  });
});
