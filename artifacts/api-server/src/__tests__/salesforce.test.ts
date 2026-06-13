import { describe, test, expect, vi } from 'vitest';
import request from 'supertest';

// Mock with a real class so `new ReplitConnectors()` works correctly in ESM
vi.mock('@replit/connectors-sdk', () => {
  class ReplitConnectors {
    createProxyFetch(_connectionId: string) {
      return async function mockProxyFetch(
        _url: string,
        _init?: RequestInit,
      ): Promise<Response> {
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
    // First call populates the in-memory cache
    const r1 = await request(app).get('/api/salesforce/operations/summary');
    expect(r1.status).toBe(200);
    // Second call should hit the cache
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
});
