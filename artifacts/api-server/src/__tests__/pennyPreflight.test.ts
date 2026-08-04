/**
 * Unit tests for GET /api/penny/capabilities/:id/preflight
 *
 * Critical invariant: only a true HTTP 404 from a describe call is conclusive
 * evidence that an SF object is absent from the org.  Any other error
 * (throttle, permissions, network) must produce 'undetermined', never 'missing'.
 */

import { describe, test, expect, vi } from 'vitest';
import request from 'supertest';

// Bypass auth middleware so business-logic tests can run without a session
vi.mock('../middlewares/requireAuth.js', () => ({
  requireStaff: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
  isStaff:        () => true,
  isAdmin:        () => true,
  isSuperAdmin:   () => false,
  TRAIL_OS_STAFF_GROUPS: [],
  TRAIL_OS_ADMIN_GROUPS: [],
}));

// ── Describe-response mode ─────────────────────────────────────────────────────
//
// 'success'   – every describe returns 200 with a minimal fields array
// 'notFound'  – every describe returns 404
// 'throttled' – every describe returns 429 (rate-limited, not absent)
// 'forbidden' – every describe returns 403 (permissions, not absent)

const { mockDescribeMode } = vi.hoisted(() => {
  // Override PF_OBJECT_TIMEOUT_MS to a small value so timeout tests complete in
  // well under 1 second.  This must run inside vi.hoisted() so the env var is
  // set before the app module (and its IIFE constant) is first evaluated.
  process.env['PF_OBJECT_TIMEOUT_MS'] = '50';

  return {
    mockDescribeMode: { value: 'success' as 'success' | 'notFound' | 'throttled' | 'forbidden' | 'timeout' },
  };
});

vi.mock('@replit/connectors-sdk', () => {
  class ReplitConnectors {
    getProxyUrl() {
      return 'https://mock-sf-proxy.replit.test';
    }
    createProxyFetch(_connectionId: string) {
      return async function mockProxyFetch(url: string): Promise<Response> {
        const isDescribe = url.includes('/sobjects/') && url.includes('/describe');

        if (isDescribe) {
          if (mockDescribeMode.value === 'notFound') {
            return {
              ok: false,
              status: 404,
              statusText: 'Not Found',
              headers: new Headers(),
              json: async () => ({}),
              text: async () => 'Not found',
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

          if (mockDescribeMode.value === 'throttled') {
            return {
              ok: false,
              status: 429,
              statusText: 'Too Many Requests',
              headers: new Headers({ 'Retry-After': '0' }),
              json: async () => ({}),
              text: async () => 'Rate limit exceeded.',
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

          if (mockDescribeMode.value === 'timeout') {
            // Return a promise that never settles — pfSfGetRetry's per-object
            // timeout (PF_OBJECT_TIMEOUT_MS, set to 50 ms above) will race
            // against this and reject with 'preflight-timeout' first.
            return new Promise<Response>(() => { /* never resolves */ });
          }

          if (mockDescribeMode.value === 'forbidden') {
            return {
              ok: false,
              status: 403,
              statusText: 'Forbidden',
              headers: new Headers(),
              json: async () => ({}),
              text: async () => 'You do not have access to this resource.',
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

          // 'success' mode — return a minimal describe response with a
          // Penny_Trail_Config__c field so sf-field checks also pass
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers(),
            json: async () => ({
              name: 'Contact',
              fields: [
                { name: 'Id' },
                { name: 'Name' },
                { name: 'Penny_Trail_Config__c' },
              ],
            }),
            text: async () => '',
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
        }

        // Any other endpoint (SOQL queries, etc.) — return a safe empty response
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ totalSize: 0, done: true, records: [] }),
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

// ── Helper types ───────────────────────────────────────────────────────────────

interface PreflightReq {
  id: string;
  kind: string;
  status: string;
  detail: string;
}

interface PreflightBody {
  capabilityId: string;
  sfConnected: boolean;
  requirements: PreflightReq[];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GET /api/penny/capabilities/:id/preflight — sf-object status logic', () => {
  test('returns 200 with sfConnected:true when describe succeeds', async () => {
    mockDescribeMode.value = 'success';
    const res = await request(app).get('/api/penny/capabilities/cap-learner-coaching/preflight');
    expect(res.status).toBe(200);
    const body = res.body as PreflightBody;
    expect(body.sfConnected).toBe(true);
    expect(Array.isArray(body.requirements)).toBe(true);
  });

  test('sf-object requirement is "met" when describe succeeds', async () => {
    mockDescribeMode.value = 'success';
    const res = await request(app).get('/api/penny/capabilities/cap-learner-coaching/preflight');
    const body = res.body as PreflightBody;
    const sfObjectReqs = body.requirements.filter(r => r.kind === 'sf-object');
    expect(sfObjectReqs.length).toBeGreaterThan(0);
    for (const r of sfObjectReqs) {
      expect(r.status).toBe('met');
    }
  });

  test('sf-object requirement is "missing" when describe returns 404', async () => {
    mockDescribeMode.value = 'notFound';
    const res = await request(app).get('/api/penny/capabilities/cap-learner-coaching/preflight');
    const body = res.body as PreflightBody;
    const sfObjectReqs = body.requirements.filter(r => r.kind === 'sf-object');
    expect(sfObjectReqs.length).toBeGreaterThan(0);
    for (const r of sfObjectReqs) {
      expect(r.status).toBe('missing');
      expect(r.detail).toMatch(/not found/i);
    }
  });

  test('sf-object requirement is "undetermined" (NOT "missing") when describe is throttled (429)', async () => {
    mockDescribeMode.value = 'throttled';
    const res = await request(app).get('/api/penny/capabilities/cap-learner-coaching/preflight');
    const body = res.body as PreflightBody;
    const sfObjectReqs = body.requirements.filter(r => r.kind === 'sf-object');
    expect(sfObjectReqs.length).toBeGreaterThan(0);
    for (const r of sfObjectReqs) {
      // A throttle is NOT evidence of absence — must not report "missing"
      expect(r.status).toBe('undetermined');
      expect(r.status).not.toBe('missing');
    }
  });

  test('sf-object requirement is "undetermined" (NOT "missing") when describe returns 403', async () => {
    mockDescribeMode.value = 'forbidden';
    const res = await request(app).get('/api/penny/capabilities/cap-learner-coaching/preflight');
    const body = res.body as PreflightBody;
    const sfObjectReqs = body.requirements.filter(r => r.kind === 'sf-object');
    expect(sfObjectReqs.length).toBeGreaterThan(0);
    for (const r of sfObjectReqs) {
      // A permissions error is NOT evidence of absence — must not report "missing"
      expect(r.status).toBe('undetermined');
      expect(r.status).not.toBe('missing');
    }
  });

  test('sf-field requirement is "missing" when parent object describe returns 404', async () => {
    mockDescribeMode.value = 'notFound';
    const res = await request(app).get('/api/penny/capabilities/cap-learner-coaching/preflight');
    const body = res.body as PreflightBody;
    const sfFieldReqs = body.requirements.filter(r => r.kind === 'sf-field');
    expect(sfFieldReqs.length).toBeGreaterThan(0);
    for (const r of sfFieldReqs) {
      expect(r.status).toBe('missing');
    }
  });

  test('sf-field requirement is "undetermined" (NOT "missing") when parent describe is throttled', async () => {
    mockDescribeMode.value = 'throttled';
    const res = await request(app).get('/api/penny/capabilities/cap-learner-coaching/preflight');
    const body = res.body as PreflightBody;
    const sfFieldReqs = body.requirements.filter(r => r.kind === 'sf-field');
    expect(sfFieldReqs.length).toBeGreaterThan(0);
    for (const r of sfFieldReqs) {
      // A throttle on the parent object describe must not propagate as a missing field
      expect(r.status).toBe('undetermined');
      expect(r.status).not.toBe('missing');
    }
  });

  test('returns valid structure for all capability IDs', async () => {
    mockDescribeMode.value = 'success';
    const capabilityIds = [
      'cap-learner-coaching',
      'cap-reflection-prompts',
      'cap-resume-review',
      'cap-interview-prep',
      'cap-study-coach',
      'cap-cohort-summaries',
      'cap-progress-insights',
    ];
    for (const id of capabilityIds) {
      const res = await request(app).get(`/api/penny/capabilities/${id}/preflight`);
      expect(res.status).toBe(200);
      const body = res.body as PreflightBody;
      expect(body.capabilityId).toBe(id);
      expect(Array.isArray(body.requirements)).toBe(true);
      // Every requirement must have a valid status
      for (const r of body.requirements) {
        expect(['met', 'missing', 'undetermined']).toContain(r.status);
      }
    }
  });

  test('BACKEND_REQUIREMENTS does not reference Training_Plan_Item__c', async () => {
    // Training_Plan_Item__c was verified absent from the live org on 2026-08-04.
    // This test ensures the phantom object never silently re-enters the preflight checks.
    mockDescribeMode.value = 'success';
    const capabilityIds = [
      'cap-learner-coaching',
      'cap-reflection-prompts',
      'cap-resume-review',
      'cap-interview-prep',
      'cap-study-coach',
      'cap-cohort-summaries',
      'cap-progress-insights',
    ];
    for (const id of capabilityIds) {
      const res = await request(app).get(`/api/penny/capabilities/${id}/preflight`);
      const body = res.body as PreflightBody;
      for (const r of body.requirements) {
        // The label may reference an object name; ensure Training_Plan_Item__c is not there
        expect(r.label).not.toMatch(/Training_Plan_Item__c/);
        // id field also must not reference the phantom object
        expect(JSON.stringify(r)).not.toMatch(/Training_Plan_Item__c/);
      }
    }
  });
});

// ── cap-cohort-summaries: pmdm__ServiceSchedule__c probe ──────────────────────
//
// pmdm__ServiceSchedule__c has NOT been verified against the live org via a
// direct describe probe.  These tests pin the exact semantics for that object:
//  - A true 404 from describe is the only conclusive evidence of absence → 'missing'
//  - Any other non-200 (throttle, permissions, network) → 'undetermined'

describe('GET /api/penny/capabilities/cap-cohort-summaries/preflight — pmdm__ServiceSchedule__c probe', () => {
  test('sf-object requirement for pmdm__ServiceSchedule__c is "met" when describe succeeds', async () => {
    mockDescribeMode.value = 'success';
    const res = await request(app).get('/api/penny/capabilities/cap-cohort-summaries/preflight');
    expect(res.status).toBe(200);
    const body = res.body as PreflightBody;
    expect(body.capabilityId).toBe('cap-cohort-summaries');
    const scheduleReq = body.requirements.find(r => r.kind === 'sf-object' && r.id === 'sf-service-schedule');
    expect(scheduleReq).toBeDefined();
    expect(scheduleReq!.status).toBe('met');
  });

  test('sf-object requirement for pmdm__ServiceSchedule__c is "missing" when describe returns 404', async () => {
    mockDescribeMode.value = 'notFound';
    const res = await request(app).get('/api/penny/capabilities/cap-cohort-summaries/preflight');
    expect(res.status).toBe(200);
    const body = res.body as PreflightBody;
    const scheduleReq = body.requirements.find(r => r.kind === 'sf-object' && r.id === 'sf-service-schedule');
    expect(scheduleReq).toBeDefined();
    expect(scheduleReq!.status).toBe('missing');
    expect(scheduleReq!.detail).toMatch(/not found/i);
  });

  test('sf-object requirement for pmdm__ServiceSchedule__c is "undetermined" (NOT "missing") when describe is throttled (429)', async () => {
    mockDescribeMode.value = 'throttled';
    const res = await request(app).get('/api/penny/capabilities/cap-cohort-summaries/preflight');
    expect(res.status).toBe(200);
    const body = res.body as PreflightBody;
    const scheduleReq = body.requirements.find(r => r.kind === 'sf-object' && r.id === 'sf-service-schedule');
    expect(scheduleReq).toBeDefined();
    // A throttle is NOT evidence of absence — must never report "missing"
    expect(scheduleReq!.status).toBe('undetermined');
    expect(scheduleReq!.status).not.toBe('missing');
  });

  test('sf-object requirement for pmdm__ServiceSchedule__c is "undetermined" (NOT "missing") when describe returns 403', async () => {
    mockDescribeMode.value = 'forbidden';
    const res = await request(app).get('/api/penny/capabilities/cap-cohort-summaries/preflight');
    expect(res.status).toBe(200);
    const body = res.body as PreflightBody;
    const scheduleReq = body.requirements.find(r => r.kind === 'sf-object' && r.id === 'sf-service-schedule');
    expect(scheduleReq).toBeDefined();
    // A permissions error is NOT evidence of absence — must never report "missing"
    expect(scheduleReq!.status).toBe('undetermined');
    expect(scheduleReq!.status).not.toBe('missing');
  });
});

// ── Per-object timeout path ────────────────────────────────────────────────────
//
// pfSfGetRetry wraps every SF describe in a race against PF_OBJECT_TIMEOUT_MS.
// If the describe stalls, the timeout rejects first with 'preflight-timeout'.
// Because that error does NOT start with '404', it must never be treated as
// conclusive evidence of absence — only 'undetermined' is correct.
//
// PF_OBJECT_TIMEOUT_MS is overridden to 50 ms in vi.hoisted() above, so these
// tests complete in well under 1 second even though the mock never settles.

describe('GET /api/penny/capabilities/:id/preflight — per-object timeout path', () => {
  test('sf-object requirement is "undetermined" (NOT "missing") when describe call times out', async () => {
    mockDescribeMode.value = 'timeout';
    const res = await request(app).get('/api/penny/capabilities/cap-learner-coaching/preflight');
    expect(res.status).toBe(200);
    const body = res.body as PreflightBody;
    const sfObjectReqs = body.requirements.filter(r => r.kind === 'sf-object');
    expect(sfObjectReqs.length).toBeGreaterThan(0);
    for (const r of sfObjectReqs) {
      // A timeout means we cannot conclude the object is absent — must never report "missing"
      expect(r.status).toBe('undetermined');
      expect(r.status).not.toBe('missing');
    }
  });

  test('sf-field requirement is "undetermined" (NOT "missing") when parent describe call times out', async () => {
    mockDescribeMode.value = 'timeout';
    const res = await request(app).get('/api/penny/capabilities/cap-learner-coaching/preflight');
    expect(res.status).toBe(200);
    const body = res.body as PreflightBody;
    const sfFieldReqs = body.requirements.filter(r => r.kind === 'sf-field');
    expect(sfFieldReqs.length).toBeGreaterThan(0);
    for (const r of sfFieldReqs) {
      // A timeout on the parent describe must not propagate as a missing field
      expect(r.status).toBe('undetermined');
      expect(r.status).not.toBe('missing');
    }
  });
});
