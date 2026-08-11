/**
 * useCollapsible.race.test.ts
 *
 * Verifies the conflict-resolution logic inside useCollapsible when a user
 * toggles while the server GET /api/user/prefs fetch is still in-flight.
 *
 * Scenarios tested
 * ────────────────
 * R1. Toggle BEFORE server responds → user intent wins; stale server value
 *     is silently discarded when the fetch finally resolves.
 * R2. PATCH payload is correct — the toggled value is sent, not the stale one.
 * R3. No race (server responds first) → server value is applied and
 *     localStorage is kept in sync.
 * R4. Cross-device roam — a fresh hook load inherits the server value that
 *     was set on a second device (different from the local default).
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

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

/** Storage key format used by the hook. */
function storageKey(key: string): string {
  return `homebase:collapse:${key}`;
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('useCollapsible — race condition & server-roam behaviour', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  // We must reset the module-level `serverFetchPromise` singleton between
  // tests; the only reliable way is to re-import the module fresh each time.
  // Vitest supports dynamic ESM re-import after vi.resetModules().
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── R1: toggle in the race window → user intent wins ────────────────────────

  it('R1: toggle during in-flight fetch keeps toggled value; server reply is discarded', async () => {
    // Controlled server fetch — we decide when it resolves.
    const serverDeferred = deferred<Response>();

    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      if (String(url).includes('/api/user/prefs') && !(url instanceof Request && url.method === 'PATCH')) {
        return serverDeferred.promise;
      }
      // PATCH — fire-and-forget, let it succeed silently.
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    // Re-import so serverFetchPromise starts as null.
    const { useCollapsible } = await import('@/hooks/useCollapsible');

    const KEY = 'widget-tasks';
    // Default is open (true); server will return closed (0) — the conflict.
    const { result } = renderHook(() => useCollapsible(KEY, true));

    // Initial state: defaultOpen=true (no localStorage entry yet).
    expect(result.current[0]).toBe(true);

    // User toggles → now closed, serverApplied.current set to true inside hook.
    act(() => { result.current[1](); });
    expect(result.current[0]).toBe(false);

    // Server fetch resolves with the opposite value (open=1).
    // The hook should ignore this because serverApplied.current is already true.
    await act(async () => {
      serverDeferred.resolve(
        jsonResponse({ prefs: { [storageKey(KEY)]: 1 } })
      );
      // Flush all microtasks.
      await Promise.resolve();
    });

    // State must remain what the user toggled (false = closed), not server's 1.
    expect(result.current[0]).toBe(false);
    // localStorage must also reflect the toggled value.
    expect(localStorage.getItem(storageKey(KEY))).toBe('0');
  });

  // ── R2: PATCH carries the correct toggled value ──────────────────────────────

  it('R2: PATCH is sent with the value the user toggled to, not the stale server value', async () => {
    const serverDeferred = deferred<Response>();
    const patchBodies: string[] = [];

    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();

      if (url.includes('/api/user/prefs') && method === 'PATCH') {
        patchBodies.push(init?.body as string);
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      if (url.includes('/api/user/prefs')) {
        return serverDeferred.promise;
      }
      return Promise.resolve(jsonResponse({}));
    });

    const { useCollapsible } = await import('@/hooks/useCollapsible');

    const KEY = 'coach-quick-links';
    // Start open (true).
    const { result } = renderHook(() => useCollapsible(KEY, true));
    expect(result.current[0]).toBe(true);

    // User toggles to closed.
    act(() => { result.current[1](); });
    expect(result.current[0]).toBe(false);

    // Wait a tick for the fire-and-forget PATCH to be dispatched.
    await act(async () => { await Promise.resolve(); });

    // Exactly one PATCH should have been sent.
    expect(patchBodies).toHaveLength(1);

    const patchPayload = JSON.parse(patchBodies[0]);
    // Value must be 0 (closed), not 1 (open / stale server value).
    expect(patchPayload.prefs[storageKey(KEY)]).toBe(0);
  });

  // ── R3: no race — server responds first → server value applied ───────────────

  it('R3: server value is applied when it arrives before any user toggle', async () => {
    // Server says closed (0); default is open (true).
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      if (String(url).includes('/api/user/prefs')) {
        return Promise.resolve(
          jsonResponse({ prefs: { [storageKey('sidebar-nav')]: 0 } })
        );
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    const { useCollapsible } = await import('@/hooks/useCollapsible');

    const KEY = 'sidebar-nav';
    const { result } = renderHook(() => useCollapsible(KEY, true));

    // Wait for the server fetch effect to complete.
    await act(async () => { await Promise.resolve(); });

    // Server said closed — state must be false.
    expect(result.current[0]).toBe(false);
    // localStorage kept in sync with server.
    expect(localStorage.getItem(storageKey(KEY))).toBe('0');
  });

  // ── R4: cross-device roam — fresh session inherits second-device value ────────

  it('R4: a fresh hook load inherits the server pref set on a second device', async () => {
    // Second device had the section closed (0); this device has no local opinion.
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      if (String(url).includes('/api/user/prefs')) {
        return Promise.resolve(
          jsonResponse({ prefs: { [storageKey('active-tasks')]: 0 } })
        );
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    const { useCollapsible } = await import('@/hooks/useCollapsible');

    // No localStorage entry — virgin state.
    const KEY = 'active-tasks';
    expect(localStorage.getItem(storageKey(KEY))).toBeNull();

    // Default open (true).
    const { result } = renderHook(() => useCollapsible(KEY, true));
    expect(result.current[0]).toBe(true); // snapshot before server resolves

    await act(async () => { await Promise.resolve(); });

    // Server value (closed) wins over the default.
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem(storageKey(KEY))).toBe('0');
  });
});
