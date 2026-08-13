/**
 * errorAlertJob.test.ts
 *
 * Verifies the error-spike alert job's core behaviour:
 *
 *  1. Below threshold  — no Slack message posted
 *  2. At/above threshold — message posted to SLACK_ADMIN_CHANNEL_ID with
 *     correct error count and top-failing route
 *  3. Rate limiting    — a second call within the same hour is suppressed
 *  4. Rate limit resets — after the hour window, the alert fires again
 *  5. No Slack token   — silently skips (no crash)
 *  6. No admin channel — silently skips (no crash)
 *  7. responseLogger writes an audit event for explicit res.status(5xx) calls
 *  8. responseLogger skips rows already logged by errorLogger (dedup flag)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRows, mockFetch, mockInsert } = vi.hoisted(() => {
  const mockRows: Array<{ metadata: unknown }> = [];
  const mockFetch  = vi.fn();
  const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
  return { mockRows, mockFetch, mockInsert };
});

// ── DB mock ───────────────────────────────────────────────────────────────────

vi.mock('@workspace/db', () => {
  const selectChain = {
    from:  vi.fn(),
    where: vi.fn(),
  };

  selectChain.from.mockReturnValue(selectChain);

  // where() resolves to whatever mockRows holds at call time
  selectChain.where.mockImplementation(() => Promise.resolve(mockRows));

  return {
    db: {
      insert: mockInsert,
      select: vi.fn().mockReturnValue(selectChain),
    },
    pool: {},
  };
});

vi.mock('@workspace/db/schema', () => ({
  trailOsAuditLogTable: { _: { name: 'trail_os_audit_log' } },
}));

// ── Drizzle operators (no-ops in test) ─────────────────────────────────────────

vi.mock('drizzle-orm', () => ({
  eq:  vi.fn((...a: unknown[]) => a),
  gte: vi.fn((...a: unknown[]) => a),
  and: vi.fn((...a: unknown[]) => a),
  sql: vi.fn(),
}));

// ── Global fetch mock ─────────────────────────────────────────────────────────

vi.stubGlobal('fetch', mockFetch);

// ── auditLog helper mock (for responseLogger tests) ──────────────────────────

vi.mock('../lib/auditLog.js', () => ({
  insertAuditEvent: mockInsert,
}));

// ── Import the module under test ──────────────────────────────────────────────

import { checkAndAlert, _resetRateLimitForTesting } from '../lib/errorAlertJob.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeErrorRows(count: number, route = '/api/penny/ask') {
  return Array.from({ length: count }, () => ({ metadata: { route } }));
}

function slackOkResponse() {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ ok: true, ts: '123.456', channel: 'C123' }),
  });
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('checkAndAlert — error spike detection', () => {
  const ENV_TOKEN   = 'SLACK_BOT_TOKEN';
  const ENV_CHANNEL = 'SLACK_ADMIN_CHANNEL_ID';
  const ENV_THRESH  = 'ERROR_ALERT_THRESHOLD';

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    mockRows.length = 0;   // reset rows
    _resetRateLimitForTesting();  // clear per-route rate-limit state between tests

    // Set up a working Slack env
    process.env[ENV_TOKEN]   = 'xoxb-test-token';
    process.env[ENV_CHANNEL] = 'C0ADMIN1234';
    process.env[ENV_THRESH]  = '5';  // low threshold for tests
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env[ENV_TOKEN];
    delete process.env[ENV_CHANNEL];
    delete process.env[ENV_THRESH];
  });

  // ── 1. At or below threshold — no alert ────────────────────────────────────

  it('does NOT post to Slack when error count is below threshold', async () => {
    mockRows.push(...makeErrorRows(4));   // threshold is 5, 4 < 5
    await checkAndAlert();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does NOT post to Slack when error count exactly equals threshold', async () => {
    mockRows.push(...makeErrorRows(5));  // exactly at threshold — must NOT alert
    await checkAndAlert();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── 2. Strictly above threshold — alert fires ───────────────────────────────

  it('posts a Slack message when error count strictly exceeds threshold', async () => {
    mockRows.push(...makeErrorRows(6));  // 6 > threshold of 5
    mockFetch.mockReturnValueOnce(slackOkResponse());

    await checkAndAlert();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body['channel']).toBe('C0ADMIN1234');
    // Message should mention the error count
    expect(String(body['text'])).toContain('6');
    // Message should contain the top-failing route
    expect(String(body['text'])).toContain('/api/penny/ask');
  });

  it('identifies the route with the most errors as the top-failing route', async () => {
    // 3 errors on /api/sf/cases, 6 on /api/penny/ask → total 9 > threshold 5
    mockRows.push(
      ...makeErrorRows(3, '/api/sf/cases'),
      ...makeErrorRows(6, '/api/penny/ask'),
    );
    mockFetch.mockReturnValueOnce(slackOkResponse());

    await checkAndAlert();

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(String(body['text'])).toContain('/api/penny/ask');
    expect(String(body['text'])).not.toContain('/api/sf/cases');
  });

  it('posts error count in the Slack message text', async () => {
    mockRows.push(...makeErrorRows(12));
    mockFetch.mockReturnValueOnce(slackOkResponse());

    await checkAndAlert();

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(String(body['text'])).toContain('12');
  });

  // ── 3. Rate limiting — second alert within the hour is suppressed ───────────

  it('suppresses a second Slack alert for the same top-failing route within 1 hour', async () => {
    mockRows.push(...makeErrorRows(6));   // 6 > threshold 5
    mockFetch.mockReturnValue(slackOkResponse());

    // First call should fire
    await checkAndAlert();
    expect(mockFetch).toHaveBeenCalledOnce();

    // Second call within the same hour — must NOT fire
    await checkAndAlert();
    expect(mockFetch).toHaveBeenCalledOnce();  // still only 1 call
  });

  // ── 4. Rate limit resets after 1 hour ──────────────────────────────────────

  it('fires again after the 1-hour rate-limit window has elapsed', async () => {
    mockRows.push(...makeErrorRows(6));   // 6 > threshold 5
    mockFetch.mockReturnValue(slackOkResponse());

    // First alert fires
    await checkAndAlert();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance time by 61 minutes
    vi.advanceTimersByTime(61 * 60 * 1000);

    // Second call should fire again
    await checkAndAlert();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // ── 5. No Slack bot token ───────────────────────────────────────────────────

  it('silently skips when SLACK_BOT_TOKEN is not set', async () => {
    delete process.env[ENV_TOKEN];
    mockRows.push(...makeErrorRows(10));

    await expect(checkAndAlert()).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── 6. No admin channel ─────────────────────────────────────────────────────

  it('silently skips when SLACK_ADMIN_CHANNEL_ID is not set', async () => {
    delete process.env[ENV_CHANNEL];
    mockRows.push(...makeErrorRows(10));

    await expect(checkAndAlert()).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ── responseLogger deduplication ─────────────────────────────────────────────

describe('responseLogger — audit event deduplication', () => {
  it('writes an audit event when res.statusCode is 500 and errorLogged is not set', async () => {
    const { responseLogger } = await import('../middlewares/responseLogger.js');

    const listeners: Record<string, () => void> = {};
    const req = {
      path:    '/api/test-route',
      method:  'GET',
      headers: {},
      socket:  { remoteAddress: '127.0.0.1' },
      session: { googleEmail: 'admin@test.org' },
    } as unknown as import('express').Request;

    const res = {
      statusCode: 500,
      locals: {},
      on(event: string, handler: () => void) { listeners[event] = handler; },
    } as unknown as import('express').Response;

    const next = vi.fn();

    mockInsert.mockClear();
    responseLogger(req, res, next);
    expect(next).toHaveBeenCalledOnce();

    // Simulate the finish event
    listeners['finish']?.();

    // insertAuditEvent should have been called
    expect(mockInsert).toHaveBeenCalled();
  });

  it('skips the audit event when res.locals.errorLogged is true (already logged by errorLogger)', async () => {
    const { responseLogger } = await import('../middlewares/responseLogger.js');

    const listeners: Record<string, () => void> = {};
    const req = {
      path:    '/api/test-route',
      method:  'GET',
      headers: {},
      socket:  { remoteAddress: '127.0.0.1' },
      session: { googleEmail: 'admin@test.org' },
    } as unknown as import('express').Request;

    const res = {
      statusCode: 500,
      locals: { errorLogged: true },  // set by errorLogger
      on(event: string, handler: () => void) { listeners[event] = handler; },
    } as unknown as import('express').Response;

    const next = vi.fn();

    mockInsert.mockClear();
    responseLogger(req, res, next);
    listeners['finish']?.();

    // Should NOT write a duplicate audit event
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('skips the audit event for 4xx responses', async () => {
    const { responseLogger } = await import('../middlewares/responseLogger.js');

    const listeners: Record<string, () => void> = {};
    const req = {
      path:    '/api/not-found',
      method:  'GET',
      headers: {},
      socket:  { remoteAddress: '127.0.0.1' },
      session: {},
    } as unknown as import('express').Request;

    const res = {
      statusCode: 404,
      locals: {},
      on(event: string, handler: () => void) { listeners[event] = handler; },
    } as unknown as import('express').Response;

    mockInsert.mockClear();
    responseLogger(req, res, vi.fn());
    listeners['finish']?.();

    expect(mockInsert).not.toHaveBeenCalled();
  });
});
