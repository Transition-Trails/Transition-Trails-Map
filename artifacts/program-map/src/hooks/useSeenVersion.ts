/**
 * useSeenVersion
 *
 * Tracks whether the current user has acknowledged the latest Trail OS release.
 *
 * State is held in a MODULE-LEVEL store (not per-component useState) so that
 * every mounted instance of the hook shares the same value. Calling markSeen()
 * from the toast in InnerApp immediately clears the sidebar dot — no page
 * reload required.
 *
 * - Reads `lastSeenVersion` from /api/user/prefs on the first mount of any
 *   consumer (server-side session; roams across devices automatically).
 * - Exposes `hasUnseenRelease` — true when APP_VERSION !== lastSeenVersion.
 * - Exposes `markSeen()` — call when the user opens the release notes; PATCHes
 *   the pref and updates all subscribers immediately (optimistic).
 */

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { APP_VERSION } from "@/config/version";

const PREF_KEY  = "lastSeenVersion";
const PREFS_URL = "/api/user/prefs";

// ── Module-level shared store ─────────────────────────────────────────────────
// All hook instances read from and write to these variables, so any call to
// markSeen() is immediately visible to every mounted consumer.

let _lastSeen: string | null = null; // null = not yet fetched
let _isReady                 = false;
let _fetchPromise: Promise<void> | null = null;

const _subscribers = new Set<() => void>();

function _notify() {
  _subscribers.forEach((fn) => fn());
}

function _setLastSeen(v: string | null) {
  _lastSeen = v;
  _notify();
}

function _markReady() {
  _isReady = true;
  _notify();
}

/** Ensures the prefs are fetched exactly once across all hook instances. */
function _ensureLoaded(): void {
  if (_isReady || _fetchPromise) return;
  _fetchPromise = fetch(PREFS_URL, { credentials: "include" })
    .then((r) => (r.ok ? r.json() : { prefs: {} }))
    .then((data: unknown) => {
      const prefs = (data as { prefs?: Record<string, unknown> }).prefs ?? {};
      _setLastSeen(typeof prefs[PREF_KEY] === "string" ? (prefs[PREF_KEY] as string) : null);
      _markReady();
    })
    .catch(() => {
      _markReady(); // treat fetch failure as "no preference stored"
    });
}

// ── Public hook ───────────────────────────────────────────────────────────────

export interface SeenVersionResult {
  /** True when the user has not yet acknowledged the current release. */
  hasUnseenRelease: boolean;
  /**
   * Call when the user views the release notes. Clears the dot in ALL mounted
   * consumers immediately (optimistic), then PATCHes the server in the background.
   */
  markSeen: () => void;
  /** False until the prefs fetch resolves (avoids a flash of the dot). */
  isReady: boolean;
  /**
   * The version string the user last acknowledged, or null if never set / not
   * yet loaded. Useful for highlighting entries newer than their last seen version.
   */
  lastSeenVersion: string | null;
}

export function useSeenVersion(): SeenVersionResult {
  // A no-op state increment used purely to trigger re-renders when the shared
  // store changes. Using useState (not useReducer) so the hook type is stable
  // across HMR updates that swap implementations.
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // Subscribe this instance to store changes.
    _subscribers.add(forceUpdate);
    // Kick off the prefs fetch if nobody has done it yet.
    _ensureLoaded();
    return () => {
      _subscribers.delete(forceUpdate);
    };
  }, []);

  const markSeen = useCallback(() => {
    if (_lastSeen === APP_VERSION) return; // already acknowledged
    // Optimistic update — all subscribers re-render immediately.
    _setLastSeen(APP_VERSION);
    // Reset the fetch gate so future mounts (new sessions) re-read from the server.
    _fetchPromise = null;
    fetch(PREFS_URL, {
      method:      "PATCH",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ prefs: { [PREF_KEY]: APP_VERSION } }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`PATCH ${r.status}`);
      })
      .catch(() => {
        // Roll back — reinstate the dot so the user can try again.
        _setLastSeen(null);
        toast.error("Couldn't save your preference — try again");
      });
  }, []);

  return {
    hasUnseenRelease: _isReady && _lastSeen !== APP_VERSION,
    markSeen,
    isReady: _isReady,
    lastSeenVersion: _lastSeen,
  };
}
