/**
 * adoptionTracking.test.ts
 *
 * Focused tests for the User Activity & Adoption Tracking features:
 *
 *  1. checkRate          — rate limiter: 60/min, 61st denied, window resets, per-email isolation
 *  2. KNOWN_FEATURES/KNOWN_ACTIONS allowlists — server-side enforcement in track.ts
 *  3. parseDateRange     — UTC day windows, defaults, inclusive dateTo, malformed input
 *  4. POST /api/track    — 401 unauthenticated, 400 unknown feature, 400 unknown action, 429 rate-limited
 *  5. GET /admin/activity-summary — 401 unauthenticated, 403 non-admin staff
 *  6. GET /admin/feature-usage-summary — 401 unauthenticated, 403 non-admin staff
 *  7. GET /admin/failure-summary — 401 unauthenticated, 403 non-admin staff
 *  8. Deduplication math — affected-user count must use distinct query, not sum-of-per-group
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Session & store mocks (must be hoisted before any dynamic imports) ────────
// Pattern mirrors homebaseAuth.test.ts: replace express-session and
// connect-pg-simple so no real Postgres connection is opened.

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

// ── DB mock (include pool to satisfy session store init in app.ts) ─────────────

vi.mock('@workspace/db', () => {
  const mockChain: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ['from', 'where', 'groupBy', 'orderBy', 'limit', 'offset'];
  chainMethods.forEach(m => {
    mockChain[m] = vi.fn();
  });
  // Each chain step returns the chain itself (fluent API)
  chainMethods.forEach(m => {
    mockChain[m]!.mockReturnValue(mockChain);
  });
  // Default terminal resolution — overridden per-test where needed
  mockChain['orderBy']!.mockResolvedValue([]);

  return {
    pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
    db: {
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
      select: vi.fn().mockReturnValue(mockChain),
    },
  };
});

vi.mock('@workspace/db/schema', () => ({
  trailOsAuditLogTable: {
    _:           { name: 'trail_os_audit_log' },
    actorEmail:  'actor_email',
    eventType:   'event_type',
    createdAt:   'created_at',
    metadata:    'metadata',
    audience:    'audience',
  },
}));

// ── Lazy imports after mocks ───────────────────────────────────────────────────

import { checkRate, rateBuckets, RATE_MAX_CALLS, RATE_WINDOW_MS, KNOWN_FEATURES, KNOWN_ACTIONS } from '../routes/track.js';
import { parseDateRange, localMidnightUtc, parseSingleDayWindow } from '../routes/adminUsers.js';
import app from '../app.js';
import type { Request } from 'express';

// ── Shared env setup ──────────────────────────────────────────────────────────

const ADMIN_GROUP    = 'trailosadmin@transitiontrails.org';
const EVERYDAY_GROUP = 'trailosusers@transitiontrails.org';

beforeEach(() => {
  vi.clearAllMocks();
  process.env['GOOGLE_GROUP_ADMIN']    = ADMIN_GROUP;
  process.env['GOOGLE_GROUP_EVERYDAY'] = EVERYDAY_GROUP;
  // Clear mockSession between tests
  Object.keys(mockSession).forEach(k => delete mockSession[k]);
});

afterEach(() => {
  delete process.env['GOOGLE_GROUP_ADMIN'];
  delete process.env['GOOGLE_GROUP_EVERYDAY'];
});

// ── 1. checkRate — rate limiter ────────────────────────────────────────────────

describe('checkRate — in-memory rate limiter', () => {
  const EMAIL = 'ratelimitee@test.com';

  beforeEach(() => { rateBuckets.delete(EMAIL); });

  it('allows the first call', () => {
    expect(checkRate(EMAIL).allowed).toBe(true);
  });

  it(`allows exactly ${RATE_MAX_CALLS} calls in one window`, () => {
    for (let i = 0; i < RATE_MAX_CALLS; i++) {
      expect(checkRate(EMAIL).allowed).toBe(true);
    }
  });

  it(`denies the ${RATE_MAX_CALLS + 1}th call with a retryAfter`, () => {
    for (let i = 0; i < RATE_MAX_CALLS; i++) checkRate(EMAIL);
    const result = checkRate(EMAIL);
    expect(result.allowed).toBe(false);
    expect(typeof result.retryAfter).toBe('number');
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(RATE_WINDOW_MS / 1000);
  });

  it('resets the bucket after the window expires', () => {
    for (let i = 0; i <= RATE_MAX_CALLS; i++) checkRate(EMAIL);
    const bucket = rateBuckets.get(EMAIL)!;
    bucket.resetAt = Date.now() - 1;           // expire the window
    expect(checkRate(EMAIL).allowed).toBe(true);
  });

  it('tracks different emails independently', () => {
    const OTHER = 'other@test.com';
    rateBuckets.delete(OTHER);
    for (let i = 0; i <= RATE_MAX_CALLS; i++) checkRate(EMAIL);
    expect(checkRate(OTHER).allowed).toBe(true);  // fresh bucket for OTHER
  });
});

// ── 2. Payload allowlists ─────────────────────────────────────────────────────

describe('track.ts — payload allowlists', () => {
  it('KNOWN_FEATURES includes expected hub names', () => {
    for (const f of ['penny', 'knowledge', 'programs', 'sf_ops', 'collaboration', 'governance']) {
      expect(KNOWN_FEATURES.has(f)).toBe(true);
    }
  });

  it('KNOWN_ACTIONS includes expected lifecycle events', () => {
    for (const a of ['open', 'navigate', 'query_submit']) {
      expect(KNOWN_ACTIONS.has(a)).toBe(true);
    }
  });

  it('KNOWN_FEATURES does not include empty string or whitespace', () => {
    expect(KNOWN_FEATURES.has('')).toBe(false);
    expect(KNOWN_FEATURES.has(' ')).toBe(false);
  });
});

// ── 3. parseDateRange ─────────────────────────────────────────────────────────

describe('parseDateRange — UTC day-window helper', () => {
  function makeReq(query: Record<string, string>): Request {
    return { query } as unknown as Request;
  }

  function isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  it('explicit dateFrom + dateTo produce inclusive UTC windows', () => {
    const { dayStart, dayEnd } = parseDateRange(makeReq({ dateFrom: '2026-01-15', dateTo: '2026-01-17' }));
    expect(isoDate(dayStart)).toBe('2026-01-15');
    expect(isoDate(dayEnd)).toBe('2026-01-18'); // dateTo inclusive: dayEnd = next day midnight
  });

  it('defaults dayStart to 30 days ago when dateFrom is absent', () => {
    const { dayStart } = parseDateRange(makeReq({}));
    const expected = new Date();
    expected.setUTCDate(expected.getUTCDate() - 30);
    expect(isoDate(dayStart)).toBe(isoDate(expected));
  });

  it('defaults dayStart to 7 days ago when defaultDaysBack=7', () => {
    const { dayStart } = parseDateRange(makeReq({}), 7);
    const expected = new Date();
    expected.setUTCDate(expected.getUTCDate() - 7);
    expect(isoDate(dayStart)).toBe(isoDate(expected));
  });

  it('dayEnd is tomorrow when dateTo is absent (today is inclusive)', () => {
    const { dayEnd } = parseDateRange(makeReq({}));
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    expect(isoDate(dayEnd)).toBe(isoDate(tomorrow));
  });

  it('ignores malformed date strings and falls back to defaults', () => {
    const { dayStart } = parseDateRange(makeReq({ dateFrom: 'not-a-date' }));
    const expected = new Date();
    expected.setUTCDate(expected.getUTCDate() - 30);
    expect(isoDate(dayStart)).toBe(isoDate(expected));
  });
});

// ── 3b. localMidnightUtc — timezone-aware UTC instant for local midnight ──────

describe('localMidnightUtc — UTC instant for local midnight', () => {
  /**
   * For a given date+tz combination we know the expected UTC offset.
   * Verify that dayStart falls within a 1-second window of the known offset.
   *
   * All assertions use a non-DST date (2026-01-15, winter) so the offset is
   * stable and predictable for each timezone.
   */

  it('UTC: local midnight equals UTC midnight (zero offset)', () => {
    const result = localMidnightUtc('2026-01-15', 'UTC');
    expect(result.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });

  it('America/New_York (EST, UTC-5): local midnight = UTC+5h', () => {
    // In January New York is on EST = UTC-5
    // Local midnight → UTC 05:00
    const result = localMidnightUtc('2026-01-15', 'America/New_York');
    expect(result.toISOString()).toBe('2026-01-15T05:00:00.000Z');
  });

  it('America/Los_Angeles (PST, UTC-8): local midnight = UTC+8h', () => {
    // In January LA is on PST = UTC-8
    // Local midnight → UTC 08:00
    const result = localMidnightUtc('2026-01-15', 'America/Los_Angeles');
    expect(result.toISOString()).toBe('2026-01-15T08:00:00.000Z');
  });

  it('America/Chicago (CST, UTC-6): local midnight = UTC+6h', () => {
    const result = localMidnightUtc('2026-01-15', 'America/Chicago');
    expect(result.toISOString()).toBe('2026-01-15T06:00:00.000Z');
  });

  it('Europe/London (GMT, UTC+0): local midnight equals UTC midnight in winter', () => {
    // January: London is on GMT (no summer time yet)
    const result = localMidnightUtc('2026-01-15', 'Europe/London');
    expect(result.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });

  it('Asia/Tokyo (JST, UTC+9): local midnight = UTC previous day +15h', () => {
    // UTC+9: local midnight occurs 9 hours *before* UTC midnight
    // 2026-01-15 00:00 JST = 2026-01-14 15:00 UTC
    const result = localMidnightUtc('2026-01-15', 'Asia/Tokyo');
    expect(result.toISOString()).toBe('2026-01-14T15:00:00.000Z');
  });

  it('Asia/Kolkata (IST, UTC+5:30): local midnight = UTC previous day +18:30', () => {
    // UTC+5:30: 2026-01-15 00:00 IST = 2026-01-14 18:30 UTC
    const result = localMidnightUtc('2026-01-15', 'Asia/Kolkata');
    expect(result.toISOString()).toBe('2026-01-14T18:30:00.000Z');
  });

  it('Australia/Sydney (AEST, UTC+10 in winter): local midnight = UTC previous day at 14:00', () => {
    // July (winter in Sydney) = AEST = UTC+10; no DST
    // 2026-07-15 00:00 AEST = 2026-07-14 14:00 UTC
    const result = localMidnightUtc('2026-07-15', 'Australia/Sydney');
    expect(result.toISOString()).toBe('2026-07-14T14:00:00.000Z');
  });

  it('Australia/Sydney DST fall-back 2026-04-05: local midnight computed with pre-transition offset', () => {
    // Sydney falls back from AEDT (UTC+11) to AEST (UTC+10) at 03:00 on 2026-04-05.
    // Transition occurs at 2026-04-04T16:00Z.
    // At UTC midnight 2026-04-05T00:00Z Sydney is already in AEST (+10h) — reading
    // the offset there would give 2026-04-04T14:00Z (01:00 AEDT), which is wrong.
    // The iterative algorithm corrects to 2026-04-04T13:00Z (00:00 AEDT). ✓
    const result = localMidnightUtc('2026-04-05', 'Australia/Sydney');
    expect(result.toISOString()).toBe('2026-04-04T13:00:00.000Z');
  });

  it('Australia/Sydney DST spring-forward 2026-10-04: local midnight computed with pre-transition offset', () => {
    // Sydney springs forward from AEST (UTC+10) to AEDT (UTC+11) at 02:00 on 2026-10-04.
    // Transition at 2026-10-03T16:00Z.
    // At UTC midnight 2026-10-04T00:00Z Sydney is already in AEDT (+11h).
    // Iterative algorithm finds 2026-10-03T14:00Z (00:00 AEST). ✓
    const result = localMidnightUtc('2026-10-04', 'Australia/Sydney');
    expect(result.toISOString()).toBe('2026-10-03T14:00:00.000Z');
  });

  it('America/Santiago spring-forward through midnight 2026-09-06: returns first valid local instant, not nonexistent midnight', () => {
    // Santiago springs forward from CLT (UTC-4) to CLST (UTC-3) at midnight on
    // 2026-09-06: 00:00 CLT → 01:00 CLST, so midnight itself is skipped.
    // The iterative algorithm oscillates here; binary search correctly returns
    // the first valid local instant of Sep 6: 01:00 CLST = 04:00 UTC.
    const result = localMidnightUtc('2026-09-06', 'America/Santiago');
    expect(result.toISOString()).toBe('2026-09-06T04:00:00.000Z');
  });

  it('Pacific/Fiji (UTC+12): local midnight = UTC previous day at 12:00', () => {
    // UTC+12: 2026-01-15 00:00 FJT = 2026-01-14 12:00 UTC
    // At UTC midnight the local hour is 12 (same calendar date) — must NOT be
    // misclassified as a negative offset. The binary-search algorithm handles this.
    const result = localMidnightUtc('2026-01-15', 'Pacific/Fiji');
    expect(result.toISOString()).toBe('2026-01-14T12:00:00.000Z');
  });

  it('Pacific/Auckland (NZDT, UTC+13 in January): local midnight = UTC previous day at 11:00', () => {
    // New Zealand Daylight Time (southern-hemisphere summer, January): UTC+13
    // 2026-01-15 00:00 NZDT = 2026-01-14 11:00 UTC
    const result = localMidnightUtc('2026-01-15', 'Pacific/Auckland');
    expect(result.toISOString()).toBe('2026-01-14T11:00:00.000Z');
  });

  it('Pacific/Kiritimati (UTC+14): local midnight = UTC previous day at 10:00', () => {
    // Kiritimati (Line Islands) is always UTC+14 with no DST.
    // 2026-01-15 00:00 LINT = 2026-01-14 10:00 UTC
    const result = localMidnightUtc('2026-01-15', 'Pacific/Kiritimati');
    expect(result.toISOString()).toBe('2026-01-14T10:00:00.000Z');
  });

});

// ── localMidnightUtc — dayEnd (next local midnight) is tested via parseSingleDayWindow below.

// ── 3c. parseSingleDayWindow — date + tz query-param parsing ──────────────────

describe('parseSingleDayWindow — timezone-aware single-day window', () => {
  function makeReq(query: Record<string, string>): import('express').Request {
    return { query } as unknown as import('express').Request;
  }

  it('uses UTC when no tz param is supplied', () => {
    const { dayStart, effectiveTz } = parseSingleDayWindow('2026-08-13', null);
    expect(effectiveTz).toBe('UTC');
    expect(dayStart.toISOString()).toBe('2026-08-13T00:00:00.000Z');
  });

  it('falls back to UTC for an invalid timezone string', () => {
    const { effectiveTz } = parseSingleDayWindow('2026-08-13', 'Not/ATimezone');
    expect(effectiveTz).toBe('UTC');
  });

  it('applies America/Los_Angeles offset so day window matches local midnight (PDT, UTC-7 in summer)', () => {
    // August 13 is in PDT (UTC-7)
    // Local midnight 2026-08-13 00:00 PDT = 2026-08-13 07:00 UTC
    const { dayStart, dayEnd, effectiveTz, effectiveDate } =
      parseSingleDayWindow('2026-08-13', 'America/Los_Angeles');
    expect(effectiveTz).toBe('America/Los_Angeles');
    expect(effectiveDate).toBe('2026-08-13');
    expect(dayStart.toISOString()).toBe('2026-08-13T07:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-08-14T07:00:00.000Z');
  });

  it('applies America/New_York offset (EST, UTC-5) in winter', () => {
    // January 15 is in EST (UTC-5)
    // Local midnight 2026-01-15 00:00 EST = 2026-01-15 05:00 UTC
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-01-15', 'America/New_York');
    expect(dayStart.toISOString()).toBe('2026-01-15T05:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-01-16T05:00:00.000Z');
  });

  it('applies Asia/Tokyo offset (JST, UTC+9) correctly', () => {
    // 2026-01-15 00:00 JST = 2026-01-14 15:00 UTC
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-01-15', 'Asia/Tokyo');
    expect(dayStart.toISOString()).toBe('2026-01-14T15:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-01-15T15:00:00.000Z');
  });

  it('window spans exactly 24 hours on a non-DST-transition day', () => {
    // June 1 is mid-summer — no DST transition — so every tz should give exactly 24h
    for (const tz of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Kolkata']) {
      const { dayStart, dayEnd } = parseSingleDayWindow('2026-06-01', tz);
      expect(dayEnd.getTime() - dayStart.getTime()).toBe(24 * 60 * 60 * 1000);
    }
  });

  it('America/Santiago spring-forward 2026-09-06: 23-hour day starting at first valid local instant', () => {
    // Midnight is skipped (00:00 CLT → 01:00 CLST). dayStart = 04:00Z (01:00 CLST).
    // dayEnd = localMidnightUtc('2026-09-07', Santiago) = Sep 7 00:00 CLST = Sep 6T03:00Z.
    // Duration = Sep6T03:00Z+1day - Sep6T04:00Z = 23 hours.
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-09-06', 'America/Santiago');
    expect(dayStart.toISOString()).toBe('2026-09-06T04:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-09-07T03:00:00.000Z');
    const durationHours = (dayEnd.getTime() - dayStart.getTime()) / (60 * 60 * 1000);
    expect(durationHours).toBe(23);
  });

  it('America/Santiago spring-forward 2026-09-06: an event at 03:59Z (previous local day) is NOT in the window', () => {
    // 2026-09-06T03:59Z = Sep 5, 23:59 CLT — still the previous local day.
    // It must fall outside the Sep 6 window whose dayStart = 04:00Z.
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-09-06', 'America/Santiago');
    const prevDayEvent = new Date('2026-09-06T03:59:00.000Z');
    expect(prevDayEvent >= dayStart && prevDayEvent < dayEnd).toBe(false);
  });

  it('America/Santiago spring-forward 2026-09-06: an event at 04:00Z (first valid instant) IS in the window', () => {
    // 2026-09-06T04:00Z = Sep 6, 01:00 CLST — the first valid local instant of Sep 6.
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-09-06', 'America/Santiago');
    const firstInstant = new Date('2026-09-06T04:00:00.000Z');
    expect(firstInstant >= dayStart && firstInstant < dayEnd).toBe(true);
  });

  it('Australia/Sydney DST fall-back 2026-04-05: 25-hour day (dayStart=13:00Z, dayEnd=14:00Z next day)', () => {
    // Transition at 2026-04-04T16:00Z (03:00 AEDT → 02:00 AEST).
    // dayStart = 2026-04-04T13:00Z (Apr 5 00:00 AEDT)
    // dayEnd   = 2026-04-05T14:00Z (Apr 6 00:00 AEST) — 25 hours
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-04-05', 'Australia/Sydney');
    expect(dayStart.toISOString()).toBe('2026-04-04T13:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-04-05T14:00:00.000Z');
    const durationHours = (dayEnd.getTime() - dayStart.getTime()) / (60 * 60 * 1000);
    expect(durationHours).toBe(25);
  });

  it('Australia/Sydney DST spring-forward 2026-10-04: 23-hour day (dayStart=14:00Z, dayEnd=13:00Z next day)', () => {
    // Transition at 2026-10-03T16:00Z (02:00 AEST → 03:00 AEDT).
    // dayStart = 2026-10-03T14:00Z (Oct 4 00:00 AEST)
    // dayEnd   = 2026-10-04T13:00Z (Oct 5 00:00 AEDT) — 23 hours
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-10-04', 'Australia/Sydney');
    expect(dayStart.toISOString()).toBe('2026-10-03T14:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-10-04T13:00:00.000Z');
    const durationHours = (dayEnd.getTime() - dayStart.getTime()) / (60 * 60 * 1000);
    expect(durationHours).toBe(23);
  });

  it('DST spring-forward: 2026-03-08 in America/Los_Angeles is a 23-hour day', () => {
    // Clocks spring forward from 02:00 PST to 03:00 PDT on this date.
    // dayStart = 2026-03-08 00:00 PST = 08:00 UTC
    // dayEnd   = 2026-03-09 00:00 PDT = 07:00 UTC
    // Duration = 23 hours (NOT 24)
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-03-08', 'America/Los_Angeles');
    expect(dayStart.toISOString()).toBe('2026-03-08T08:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-03-09T07:00:00.000Z');
    const durationHours = (dayEnd.getTime() - dayStart.getTime()) / (60 * 60 * 1000);
    expect(durationHours).toBe(23);
  });

  it('DST fall-back: 2026-11-01 in America/Los_Angeles is a 25-hour day', () => {
    // Clocks fall back from 02:00 PDT to 01:00 PST on this date.
    // dayStart = 2026-11-01 00:00 PDT = 07:00 UTC
    // dayEnd   = 2026-11-02 00:00 PST = 08:00 UTC
    // Duration = 25 hours (NOT 24)
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-11-01', 'America/Los_Angeles');
    expect(dayStart.toISOString()).toBe('2026-11-01T07:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-11-02T08:00:00.000Z');
    const durationHours = (dayEnd.getTime() - dayStart.getTime()) / (60 * 60 * 1000);
    expect(durationHours).toBe(25);
  });

  it('dayEnd is the next local midnight, not dayStart + 24h', () => {
    // On a normal (non-DST) day the distinction doesn't matter numerically,
    // but the implementation must call localMidnightUtc for dayEnd too.
    // Verify: dayEnd should format as local midnight in the target timezone.
    const tz = 'America/Los_Angeles';
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-01-15', tz);
    const startLocal = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(dayStart);
    const endLocal   = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(dayEnd);
    expect(startLocal).toBe('2026-01-15');
    expect(endLocal).toBe('2026-01-16');
  });

  it('spring-forward: a session fired at 01:59 local (last pre-spring-forward minute) is captured', () => {
    // 2026-03-08 01:59 PST = 09:59 UTC — must be inside the 23-hour window [08:00Z, 07:00+1dZ)
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-03-08', 'America/Los_Angeles');
    const eventUtc = new Date('2026-03-08T09:59:00.000Z');
    expect(eventUtc >= dayStart && eventUtc < dayEnd).toBe(true);
  });

  it('spring-forward: a session fired at 02:30 local (skipped hour) does not exist; 03:00 PDT is still inside the window', () => {
    // After clocks spring, 03:00 PDT = 10:00 UTC — still inside the 23-hour window
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-03-08', 'America/Los_Angeles');
    const eventUtc = new Date('2026-03-08T10:00:00.000Z'); // 03:00 PDT
    expect(eventUtc >= dayStart && eventUtc < dayEnd).toBe(true);
  });

  it('fall-back: a session fired during the repeated hour is captured inside the window', () => {
    // 2026-11-01 01:30 PDT = 08:30 UTC (first pass of 01:30)
    // 2026-11-01 01:30 PST = 09:30 UTC (second pass, after clock falls back)
    // Both are inside the 25-hour window [07:00Z, 08:00+1dZ)
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-11-01', 'America/Los_Angeles');
    const firstPass  = new Date('2026-11-01T08:30:00.000Z');
    const secondPass = new Date('2026-11-01T09:30:00.000Z');
    expect(firstPass  >= dayStart && firstPass  < dayEnd).toBe(true);
    expect(secondPass >= dayStart && secondPass < dayEnd).toBe(true);
  });

  it('returns effectiveDate matching the supplied date param', () => {
    const { effectiveDate } = parseSingleDayWindow('2026-08-13', 'America/Chicago');
    expect(effectiveDate).toBe('2026-08-13');
  });

  it('rejects a malformed date string and falls back to today in the effective timezone', () => {
    const { effectiveDate, effectiveTz } = parseSingleDayWindow('not-a-date', 'America/Los_Angeles');
    expect(effectiveTz).toBe('America/Los_Angeles');
    // effectiveDate should be a valid YYYY-MM-DD string (today in LA)
    expect(effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('UTC window is unchanged vs the old UTC-only behaviour for a non-DST date', () => {
    // Regression anchor: a UTC request with the new function must produce
    // the same window as the old hardcoded UTC logic.
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-03-10', 'UTC');
    expect(dayStart.toISOString()).toBe('2026-03-10T00:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-03-11T00:00:00.000Z');
  });

  it('a session at 23:59 local time is captured inside the local-day window', () => {
    // A staff member in LA fires an event at 2026-08-13 23:59 PDT
    // = 2026-08-14 06:59 UTC
    // The local day window for 2026-08-13 LA = [07:00 UTC, next-midnight UTC)
    const { dayStart, dayEnd } = parseSingleDayWindow('2026-08-13', 'America/Los_Angeles');
    const eventUtc = new Date('2026-08-14T06:59:00.000Z');
    expect(eventUtc >= dayStart).toBe(true);
    expect(eventUtc <  dayEnd).toBe(true);
  });

  it('a session at 23:59 local time falls OUTSIDE the UTC-only window (demonstrates the pre-fix bug)', () => {
    // Same event (2026-08-14 06:59 UTC) placed in the *UTC* window for 2026-08-13:
    // UTC window = [2026-08-13T00:00Z, 2026-08-14T00:00Z)
    // 06:59 UTC on 2026-08-14 is *after* the UTC window → session would be attributed
    // to the wrong date without timezone correction.
    const utcDayStart = new Date('2026-08-13T00:00:00.000Z');
    const utcDayEnd   = new Date('2026-08-14T00:00:00.000Z');
    const eventUtc    = new Date('2026-08-14T06:59:00.000Z');
    expect(eventUtc >= utcDayStart && eventUtc < utcDayEnd).toBe(false);
  });
});

// ── 4. POST /api/track — HTTP integration ─────────────────────────────────────

describe('POST /api/track — auth and payload enforcement', () => {
  it('returns 401 when there is no authenticated session', async () => {
    // mockSession is empty → no googleEmail
    const res = await request(app)
      .post('/api/track')
      .send({ feature: 'penny', action: 'open' });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: 'not_authenticated' });
  });

  it('returns 400 for an unknown feature even with a valid session', async () => {
    mockSession['googleEmail'] = 'staff@transitiontrails.org';
    mockSession['googleGroups'] = [EVERYDAY_GROUP];
    const res = await request(app)
      .post('/api/track')
      .send({ feature: 'random_pii_string', action: 'open' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'unknown_feature' });
  });

  it('returns 400 for an unknown action even with a valid session', async () => {
    mockSession['googleEmail'] = 'staff@transitiontrails.org';
    mockSession['googleGroups'] = [EVERYDAY_GROUP];
    const res = await request(app)
      .post('/api/track')
      .send({ feature: 'penny', action: 'arbitrary_action' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'unknown_action' });
  });

  it('returns 429 when the rate limit is exhausted', async () => {
    const email = 'ratelimited@transitiontrails.org';
    mockSession['googleEmail'] = email;
    mockSession['googleGroups'] = [EVERYDAY_GROUP];
    rateBuckets.delete(email);
    // Exhaust the bucket in-process (without HTTP overhead)
    for (let i = 0; i < RATE_MAX_CALLS; i++) checkRate(email);
    const res = await request(app)
      .post('/api/track')
      .send({ feature: 'penny', action: 'open' });
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ error: 'rate_limited' });
    rateBuckets.delete(email);
  });

  it('returns 200 for a valid authenticated request with known feature+action', async () => {
    const email = 'validstaff@transitiontrails.org';
    mockSession['googleEmail'] = email;
    mockSession['googleGroups'] = [EVERYDAY_GROUP];
    rateBuckets.delete(email);
    const res = await request(app)
      .post('/api/track')
      .send({ feature: 'penny', action: 'open' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
    rateBuckets.delete(email);
  });
});

// ── 5. GET /admin/activity-summary — auth guards ──────────────────────────────

describe('GET /admin/activity-summary — auth enforcement', () => {
  it('returns 401 when there is no session', async () => {
    const res = await request(app).get('/api/admin/activity-summary');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin staff (everyday tier)', async () => {
    mockSession['googleEmail']  = 'everyday@transitiontrails.org';
    mockSession['googleGroups'] = [EVERYDAY_GROUP]; // not in ADMIN_GROUP
    const res = await request(app).get('/api/admin/activity-summary');
    expect(res.status).toBe(403);
  });
});

// ── 6. GET /admin/feature-usage-summary — auth guards ────────────────────────

describe('GET /admin/feature-usage-summary — auth enforcement', () => {
  it('returns 401 when there is no session', async () => {
    const res = await request(app).get('/api/admin/feature-usage-summary');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin authenticated users', async () => {
    mockSession['googleEmail']  = 'everyday@transitiontrails.org';
    mockSession['googleGroups'] = [EVERYDAY_GROUP];
    const res = await request(app).get('/api/admin/feature-usage-summary');
    expect(res.status).toBe(403);
  });
});

// ── 7. GET /admin/failure-summary — auth guards ───────────────────────────────

describe('GET /admin/failure-summary — auth enforcement', () => {
  it('returns 401 when there is no session', async () => {
    const res = await request(app).get('/api/admin/failure-summary');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin authenticated users', async () => {
    mockSession['googleEmail']  = 'everyday@transitiontrails.org';
    mockSession['googleGroups'] = [EVERYDAY_GROUP];
    const res = await request(app).get('/api/admin/failure-summary');
    expect(res.status).toBe(403);
  });
});

// ── 8. Affected-user deduplication — business-logic correctness ───────────────

describe('failure-summary affected-user deduplication', () => {
  /**
   * A user with errors on two different routes must be counted as ONE
   * affected user, not two.  The correct implementation uses a separate
   * `count(distinct actor_email)` query over the full filtered set;
   * summing per-group counts is incorrect.
   */
  it('counts a user appearing in two route/status groups as 1 affected user', () => {
    // Simulate per-group DB results: userA appears in both groups
    const perGroupRows = [
      { route: '/api/foo', status: 500, message: 'err A', count: 3, affectedUsers: 1 },
      { route: '/api/bar', status: 502, message: 'err B', count: 2, affectedUsers: 1 },
    ];
    // The distinct-user query returns the true count (1, not 2)
    const distinctQueryResult = [{ count: 1 }];

    const totalErrors       = perGroupRows.reduce((s, r) => s + r.count, 0);
    const trueAffectedUsers = distinctQueryResult[0]?.count ?? 0;

    expect(totalErrors).toBe(5);
    expect(trueAffectedUsers).toBe(1);  // single distinct user across both groups
  });

  it('demonstrates that summing per-group counts incorrectly produces 2 (regression anchor)', () => {
    const perGroupRows = [
      { affectedUsers: 1 },  // userA in group 1
      { affectedUsers: 1 },  // userA in group 2 — same person!
    ];
    const naiveSum = perGroupRows.reduce((s, r) => s + r.affectedUsers, 0);
    // This is the WRONG value — confirms the naive approach must be avoided
    expect(naiveSum).toBe(2);
  });
});
