/**
 * useHomebaseLayout.race.test.ts
 *
 * Verifies the conflict-resolution logic inside useHomebaseLayout when a user
 * acts (reorders cards or toggles collapse) while the server GET /api/user/prefs
 * fetch is still in-flight.
 *
 * Scenarios tested
 * ────────────────
 * R1. setCardOrder BEFORE server responds → user order wins; stale server
 *     order is silently discarded.
 * R2. toggleCollapse BEFORE server responds → user collapsed state wins; stale
 *     server collapsed state is silently discarded.
 * R3. PATCH for setCardOrder carries the user-chosen order, not the stale one.
 * R4. PATCH for toggleCollapse carries the user-toggled state, not the stale one.
 * R5. No race (server responds first) → server card order is applied and
 *     localStorage is kept in sync.
 * R6. Cross-device roam — a fresh hook load inherits the server collapsed state
 *     set on a second device.
 * R7. Per-field independence — acting on order does NOT suppress the server
 *     collapsed state; acting on collapsed does NOT suppress the server order.
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DEFAULT_CARD_ORDER } from '@/hooks/useHomebaseLayout';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ORDER_KEY     = 'homebase:card-order';
const COLLAPSED_KEY = 'homebase:card-collapsed';

/** A valid reordered card list (first two cards swapped). */
const REORDERED = [
  'today-meetings',
  'today-tasks',
  'meeting-notes',
  'active-tasks',
  'cases-card',
  'my-time',
];

/** Server order from a "second device" (last two cards swapped). */
const SERVER_ORDER = [
  'today-tasks',
  'today-meetings',
  'meeting-notes',
  'active-tasks',
  'my-time',
  'cases-card',
];

// ── Test suite ────────────────────────────────────────────────────────────────

describe('useHomebaseLayout — race condition & server-roam behavior', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  // Reset the module-level `serverFetchPromise` singleton between tests by
  // re-importing the module fresh each time via vi.resetModules().
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    vi.clearAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  // ── R1: setCardOrder in the race window → user intent wins ──────────────────

  it('R1: setCardOrder during in-flight GET keeps user order; server reply is discarded', async () => {
    const serverDeferred = deferred<Response>();

    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((_input, init?) => {
      if ((init?.method ?? 'GET').toUpperCase() === 'PATCH') {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return serverDeferred.promise;
    });

    const { useHomebaseLayout } = await import('@/hooks/useHomebaseLayout');
    const { result } = renderHook(() => useHomebaseLayout());

    expect(result.current.cardOrder).toEqual([...DEFAULT_CARD_ORDER]);

    // User reorders cards while GET is still in-flight.
    act(() => { result.current.setCardOrder(REORDERED); });
    expect(result.current.cardOrder).toEqual(REORDERED);

    // Server resolves with the old default order — must be discarded.
    await act(async () => {
      serverDeferred.resolve(
        jsonResponse({ prefs: { [ORDER_KEY]: JSON.stringify([...DEFAULT_CARD_ORDER]) } })
      );
      await Promise.resolve();
    });

    expect(result.current.cardOrder).toEqual(REORDERED);
    expect(localStorage.getItem(ORDER_KEY)).toBe(JSON.stringify(REORDERED));
  });

  // ── R2: toggleCollapse in the race window → user intent wins ───────────────

  it('R2: toggleCollapse during in-flight GET keeps user collapsed state; server reply is discarded', async () => {
    const serverDeferred = deferred<Response>();

    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((_input, init?) => {
      if ((init?.method ?? 'GET').toUpperCase() === 'PATCH') {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return serverDeferred.promise;
    });

    const { useHomebaseLayout } = await import('@/hooks/useHomebaseLayout');
    const { result } = renderHook(() => useHomebaseLayout());

    expect(result.current.collapsed.size).toBe(0);

    // User collapses 'active-tasks' while GET is still in-flight.
    act(() => { result.current.toggleCollapse('active-tasks'); });
    expect(result.current.collapsed.has('active-tasks')).toBe(true);

    // Server resolves with an empty collapsed set — must be discarded.
    await act(async () => {
      serverDeferred.resolve(
        jsonResponse({ prefs: { [COLLAPSED_KEY]: JSON.stringify([]) } })
      );
      await Promise.resolve();
    });

    expect(result.current.collapsed.has('active-tasks')).toBe(true);
    expect(localStorage.getItem(COLLAPSED_KEY)).toBe(JSON.stringify(['active-tasks']));
  });

  // ── R3: PATCH for setCardOrder carries the correct order ────────────────────

  it('R3: PATCH is sent with the user-chosen card order, not the stale server order', async () => {
    const serverDeferred = deferred<Response>();
    const patchBodies: string[] = [];

    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((_input, init?) => {
      if ((init?.method ?? 'GET').toUpperCase() === 'PATCH') {
        patchBodies.push(init?.body as string);
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return serverDeferred.promise;
    });

    const { useHomebaseLayout } = await import('@/hooks/useHomebaseLayout');
    const { result } = renderHook(() => useHomebaseLayout());

    act(() => { result.current.setCardOrder(REORDERED); });

    // Advance past the 500 ms debounce.
    await act(async () => { vi.advanceTimersByTime(600); });

    expect(patchBodies).toHaveLength(1);
    const payload = JSON.parse(patchBodies[0]);
    expect(JSON.parse(payload.prefs[ORDER_KEY])).toEqual(REORDERED);
  });

  // ── R4: PATCH for toggleCollapse carries the correct collapsed array ─────────

  it('R4: PATCH is sent with the user-toggled collapsed state, not the stale server state', async () => {
    const serverDeferred = deferred<Response>();
    const patchBodies: string[] = [];

    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((_input, init?) => {
      if ((init?.method ?? 'GET').toUpperCase() === 'PATCH') {
        patchBodies.push(init?.body as string);
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return serverDeferred.promise;
    });

    const { useHomebaseLayout } = await import('@/hooks/useHomebaseLayout');
    const { result } = renderHook(() => useHomebaseLayout());

    act(() => { result.current.toggleCollapse('cases-card'); });

    await act(async () => { vi.advanceTimersByTime(600); });

    expect(patchBodies).toHaveLength(1);
    const payload = JSON.parse(patchBodies[0]);
    expect(JSON.parse(payload.prefs[COLLAPSED_KEY])).toContain('cases-card');
  });

  // ── R5: no race — server responds first → server order applied ──────────────

  it('R5: server card order is applied when it arrives before any user action', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((_input, init?) => {
      if ((init?.method ?? 'GET').toUpperCase() === 'PATCH') {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return Promise.resolve(
        jsonResponse({ prefs: { [ORDER_KEY]: JSON.stringify(SERVER_ORDER) } })
      );
    });

    const { useHomebaseLayout } = await import('@/hooks/useHomebaseLayout');
    const { result } = renderHook(() => useHomebaseLayout());

    await act(async () => { await Promise.resolve(); });

    expect(result.current.cardOrder).toEqual(SERVER_ORDER);
    expect(localStorage.getItem(ORDER_KEY)).toBe(JSON.stringify(SERVER_ORDER));
  });

  // ── R6: cross-device roam — fresh session inherits second-device collapsed ───

  it('R6: a fresh hook load inherits the collapsed state set on a second device', async () => {
    const secondDeviceCollapsed = ['today-tasks', 'my-time'];

    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((_input, init?) => {
      if ((init?.method ?? 'GET').toUpperCase() === 'PATCH') {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return Promise.resolve(
        jsonResponse({ prefs: { [COLLAPSED_KEY]: JSON.stringify(secondDeviceCollapsed) } })
      );
    });

    const { useHomebaseLayout } = await import('@/hooks/useHomebaseLayout');
    expect(localStorage.getItem(COLLAPSED_KEY)).toBeNull();

    const { result } = renderHook(() => useHomebaseLayout());
    expect(result.current.collapsed.size).toBe(0);

    await act(async () => { await Promise.resolve(); });

    expect(result.current.collapsed.has('today-tasks')).toBe(true);
    expect(result.current.collapsed.has('my-time')).toBe(true);
    expect(localStorage.getItem(COLLAPSED_KEY)).toBe(JSON.stringify(secondDeviceCollapsed));
  });

  // ── R7: per-field independence ───────────────────────────────────────────────

  it('R7a: acting on order does NOT prevent server collapsed state from being applied', async () => {
    const serverDeferred = deferred<Response>();

    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((_input, init?) => {
      if ((init?.method ?? 'GET').toUpperCase() === 'PATCH') {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return serverDeferred.promise;
    });

    const { useHomebaseLayout } = await import('@/hooks/useHomebaseLayout');
    const { result } = renderHook(() => useHomebaseLayout());

    // User acts on order while GET is in-flight.
    act(() => { result.current.setCardOrder(REORDERED); });

    // Server resolves with both a different order AND a non-empty collapsed set.
    const serverCollapsed = ['meeting-notes', 'my-time'];
    await act(async () => {
      serverDeferred.resolve(
        jsonResponse({
          prefs: {
            [ORDER_KEY]:     JSON.stringify([...DEFAULT_CARD_ORDER]),
            [COLLAPSED_KEY]: JSON.stringify(serverCollapsed),
          },
        })
      );
      await Promise.resolve();
    });

    // Order guard fired → user's REORDERED is kept; server order discarded.
    expect(result.current.cardOrder).toEqual(REORDERED);

    // Collapsed guard did NOT fire → server's collapsed state IS applied.
    expect(result.current.collapsed.has('meeting-notes')).toBe(true);
    expect(result.current.collapsed.has('my-time')).toBe(true);
  });

  it('R7b: acting on collapsed does NOT prevent server card order from being applied', async () => {
    const serverDeferred = deferred<Response>();

    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((_input, init?) => {
      if ((init?.method ?? 'GET').toUpperCase() === 'PATCH') {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return serverDeferred.promise;
    });

    const { useHomebaseLayout } = await import('@/hooks/useHomebaseLayout');
    const { result } = renderHook(() => useHomebaseLayout());

    // User collapses a card while GET is in-flight.
    act(() => { result.current.toggleCollapse('active-tasks'); });

    // Server resolves with a different order AND no collapsed state.
    await act(async () => {
      serverDeferred.resolve(
        jsonResponse({
          prefs: {
            [ORDER_KEY]:     JSON.stringify(SERVER_ORDER),
            [COLLAPSED_KEY]: JSON.stringify([]),
          },
        })
      );
      await Promise.resolve();
    });

    // Collapsed guard fired → user's collapse is kept; server empty discarded.
    expect(result.current.collapsed.has('active-tasks')).toBe(true);

    // Order guard did NOT fire → server's order IS applied.
    expect(result.current.cardOrder).toEqual(SERVER_ORDER);
  });
});
