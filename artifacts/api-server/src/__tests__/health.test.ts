import { describe, test, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('GET /api/healthz', () => {
  test('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  test('returns JSON content-type', async () => {
    const res = await request(app).get('/api/healthz');
    expect(res.headers['content-type']).toMatch(/json/);
  });

  test('unknown route returns 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
