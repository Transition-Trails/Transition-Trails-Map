/**
 * useSeenVersion.test.ts
 *
 * Confirms the "What's New" dot logic in useSeenVersion across the full
 * end-to-end flow: first load → mark seen → reload → dot stays cleared.
 * Also verifies graceful degradation when the PATCH fails.
 *
 * Scenarios
 * ─────────
 * S1. First load with no stored pref → hasUnseenRelease is true (dot visible).
 * S2. markSeen() clears the dot optimistically — no wait for network.
 * S3. markSeen() sends a PATCH with the correct payload to /api/user/prefs.
 * S4. After reload (fresh module), server returns APP_VERSION →
 *     hasUnseenRelease is false (dot stays cleared).
 * S5. After reload (fresh module), server returns old version →
 *     hasUnseenRelease is true (dot re-appears — version mismatch).
 * S6. Failed PATCH (network error) → module-level optimistic state is cleared,
 *     but a fresh module load re-fetches from server; if server has no pref,
 *     the dot re-appears (graceful degradation, not silent success).
 * S7. isReady is false before the prefs fetch resolves → avoids flash of dot.
 * S8. Multiple hook instances share the same module-level store; markSeen()
 *     in one instance immediately clears the dot in all others.
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Prevent the sonner toast() call inside markSeen from erroring in jsdom.
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error:   vi.fn(),
    success: vi.fn(),
    info:    vi.fn(),
    warning: vi.fn(),
  }),
}));

// APP_VERSION is "1.7" (from src/config/version.ts).
// We import it dynamically after vi.resetModules() to pick up the fresh module.
const APP_VERSION = '1.7';

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Prefs response where the user has already seen the current release. */
function seenPrefs() {
  return jsonResponse({ prefs: { lastSeenVersion: APP_VERSION } });
}

/** Prefs response with no stored version (fresh session). */
function emptyPrefs() {
  return jsonResponse({ prefs: {} });
}

/** Prefs response where only an older version is stored. */
function oldPrefs(version = '1.4') {
  return jsonResponse({ prefs: { lastSeenVersion: version } });
}

// ── Suite setup ───────────────────────────────────────────────────────────────

describe('useSeenVersion', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset the module-level singleton (_lastSeen, _isReady, _fetchPromise)
    // so each test starts with a clean slate — exactly as if a new browser
    // tab was opened.
    vi.resetModules();
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    vi.clearAllMocks();
  });

  // ── S1: first load, no stored pref ───────────────────────────────────────────

  it('S1: hasUnseenRelease is true when server returns no lastSeenVersion', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve(emptyPrefs())
    );

    const { useSeenVersion } = await import('@/hooks/useSeenVersion');
    const { result } = renderHook(() => useSeenVersion());

    // isReady starts false — dot hidden until fetch resolves (no flash)
    expect(result.current.isReady).toBe(false);

    await act(async () => { await Promise.resolve(); });

    expect(result.current.isReady).toBe(true);
    expect(result.current.hasUnseenRelease).toBe(true);
  });

  // ── S2: markSeen() clears dot immediately (optimistic) ───────────────────────

  it('S2: markSeen() sets hasUnseenRelease to false immediately without waiting for PATCH', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'PATCH') return Promise.resolve(jsonResponse({ prefs: { lastSeenVersion: APP_VERSION } }));
      return Promise.resolve(emptyPrefs());
    });

    const { useSeenVersion } = await import('@/hooks/useSeenVersion');
    const { result } = renderHook(() => useSeenVersion());

    // Wait for initial fetch
    await act(async () => { await Promise.resolve(); });
    expect(result.current.hasUnseenRelease).toBe(true);

    // Call markSeen — dot should clear synchronously (optimistic)
    act(() => { result.current.markSeen(); });
    expect(result.current.hasUnseenRelease).toBe(false);
  });

  // ── S3: markSeen() sends the correct PATCH payload ───────────────────────────

  it('S3: markSeen() PATCHes /api/user/prefs with { prefs: { lastSeenVersion: APP_VERSION } }', async () => {
    const patchBodies: string[] = [];

    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'PATCH') {
        patchBodies.push(init?.body as string ?? '');
        return Promise.resolve(jsonResponse({ prefs: { lastSeenVersion: APP_VERSION } }));
      }
      return Promise.resolve(emptyPrefs());
    });

    const { useSeenVersion } = await import('@/hooks/useSeenVersion');
    const { result } = renderHook(() => useSeenVersion());

    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.markSeen(); });

    // Let the fire-and-forget PATCH dispatch
    await act(async () => { await Promise.resolve(); });

    expect(patchBodies).toHaveLength(1);

    const payload = JSON.parse(patchBodies[0]);
    expect(payload).toEqual({ prefs: { lastSeenVersion: APP_VERSION } });
  });

  // ── S4: page reload — server has the pref → dot stays cleared ────────────────

  it('S4: after reload, server returns APP_VERSION → hasUnseenRelease is false (dot cleared)', async () => {
    // Simulate: PATCH was previously sent and stored on the server.
    // Fresh module (vi.resetModules in beforeEach) mimics a new page load.
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve(seenPrefs())
    );

    const { useSeenVersion } = await import('@/hooks/useSeenVersion');
    const { result } = renderHook(() => useSeenVersion());

    await act(async () => { await Promise.resolve(); });

    expect(result.current.isReady).toBe(true);
    expect(result.current.hasUnseenRelease).toBe(false);
  });

  // ── S5: version mismatch after reload → dot re-appears ───────────────────────

  it('S5: server returns an older version after reload → hasUnseenRelease is true (dot visible)', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve(oldPrefs('1.4'))
    );

    const { useSeenVersion } = await import('@/hooks/useSeenVersion');
    const { result } = renderHook(() => useSeenVersion());

    await act(async () => { await Promise.resolve(); });

    expect(result.current.isReady).toBe(true);
    // 1.4 !== 1.5 — user has not seen this release
    expect(result.current.hasUnseenRelease).toBe(true);
  });

  // ── S6: failed PATCH → optimistic state rolls back in the same session ────────

  it('S6: when PATCH fails (network error), hasUnseenRelease is reinstated immediately and a fresh load also re-shows the dot', async () => {
    const { toast } = await import('sonner');
    const toastError = vi.mocked((toast as unknown as { error: ReturnType<typeof vi.fn> }).error);

    // === First "session": PATCH fails ===
    let patchCalled = false;
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'PATCH') {
        patchCalled = true;
        return Promise.reject(new Error('network offline'));
      }
      return Promise.resolve(emptyPrefs());
    });

    const { useSeenVersion: useV1 } = await import('@/hooks/useSeenVersion');
    const { result: r1 } = renderHook(() => useV1());

    await act(async () => { await Promise.resolve(); });
    expect(r1.current.hasUnseenRelease).toBe(true);

    // markSeen clears the dot optimistically
    act(() => { r1.current.markSeen(); });
    expect(r1.current.hasUnseenRelease).toBe(false); // optimistic

    // Let the failed PATCH settle — rollback should fire
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
    expect(patchCalled).toBe(true); // PATCH was attempted

    // ── Key rollback assertions (same session) ────────────────────────────────
    expect(r1.current.hasUnseenRelease).toBe(true);  // dot reinstated
    expect(toastError).toHaveBeenCalledWith("Couldn't save your preference — try again");

    // === Second "session": fresh module load, server still has no pref ===
    vi.resetModules();
    fetchSpy.mockRestore();

    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve(emptyPrefs()) // server never stored anything
    );

    const { useSeenVersion: useV2 } = await import('@/hooks/useSeenVersion');
    const { result: r2 } = renderHook(() => useV2());

    await act(async () => { await Promise.resolve(); });

    // Dot must also re-appear on next load — server has no record
    expect(r2.current.isReady).toBe(true);
    expect(r2.current.hasUnseenRelease).toBe(true);
  });

  // ── S7: isReady is false before fetch resolves → no flash of dot ─────────────

  it('S7: isReady is false until the prefs fetch completes (prevents dot flash on load)', async () => {
    let resolvePrefs!: (r: Response) => void;
    const deferredPrefs = new Promise<Response>((res) => { resolvePrefs = res; });

    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => deferredPrefs);

    const { useSeenVersion } = await import('@/hooks/useSeenVersion');
    const { result } = renderHook(() => useSeenVersion());

    // Before fetch resolves — isReady=false means hasUnseenRelease is false too
    // (the expression is: _isReady && _lastSeen !== APP_VERSION)
    expect(result.current.isReady).toBe(false);
    expect(result.current.hasUnseenRelease).toBe(false);

    // Resolve the fetch
    await act(async () => {
      resolvePrefs(emptyPrefs());
      await Promise.resolve();
    });

    expect(result.current.isReady).toBe(true);
    // Now properly computed
    expect(result.current.hasUnseenRelease).toBe(true);
  });

  // ── S8: multiple instances share module-level store ───────────────────────────

  it('S8: markSeen() in one hook instance immediately clears the dot in all mounted consumers', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'PATCH') return Promise.resolve(jsonResponse({ prefs: { lastSeenVersion: APP_VERSION } }));
      return Promise.resolve(emptyPrefs());
    });

    const { useSeenVersion } = await import('@/hooks/useSeenVersion');

    // Two independent hook consumers (e.g. Sidebar + notification badge)
    const { result: a } = renderHook(() => useSeenVersion());
    const { result: b } = renderHook(() => useSeenVersion());

    await act(async () => { await Promise.resolve(); });

    expect(a.current.hasUnseenRelease).toBe(true);
    expect(b.current.hasUnseenRelease).toBe(true);

    // markSeen() on instance A
    act(() => { a.current.markSeen(); });

    // Both instances must reflect the change immediately
    expect(a.current.hasUnseenRelease).toBe(false);
    expect(b.current.hasUnseenRelease).toBe(false);
  });
});
