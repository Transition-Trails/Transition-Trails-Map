/**
 * useHomebaseTour
 *
 * Tracks whether the current user has completed the Homebase walkthrough tour,
 * and provides controls to start or skip it.
 *
 * State lives in a MODULE-LEVEL store so every mounted consumer shares the
 * same value — calling startTour() from Release Notes immediately affects
 * HomebaseShell without needing prop-drilling or a context provider.
 *
 * Persistence: reads/writes `hasSeenHomebaseTour` in /api/user/prefs so the
 * tour fires once across devices, then never again unless replayed manually.
 */

import { useEffect, useState, useCallback } from "react";

const PREF_KEY  = "hasSeenHomebaseTour";
const PREFS_URL = "/api/user/prefs";

// ── Module-level shared store ─────────────────────────────────────────────────

let _completed:    boolean       = false; // true once pref is confirmed or user finishes
let _isReady:      boolean       = false; // true once the prefs fetch resolves
let _tourActive:   boolean       = false; // true while tour overlay is open
let _fetchPromise: Promise<void> | null = null;

const _subscribers = new Set<() => void>();

function _notify() { _subscribers.forEach(fn => fn()); }

function _setCompleted(v: boolean) { _completed = v; _notify(); }
function _setTourActive(v: boolean) { _tourActive = v; _notify(); }
function _markReady()              { _isReady = true; _notify(); }

function _ensureLoaded(): void {
  if (_isReady || _fetchPromise) return;
  _fetchPromise = fetch(PREFS_URL, { credentials: "include" })
    .then(r => (r.ok ? r.json() : { prefs: {} }))
    .then((data: unknown) => {
      const prefs = (data as { prefs?: Record<string, unknown> }).prefs ?? {};
      _setCompleted(prefs[PREF_KEY] === true);
      _markReady();
    })
    .catch(() => { _markReady(); });
}

// ── Public hook ───────────────────────────────────────────────────────────────

export interface HomebaseTourResult {
  /** True once the prefs fetch has resolved. */
  isReady:     boolean;
  /** True when the tour overlay should be visible. */
  tourActive:  boolean;
  /** True when the user hasn't seen the tour yet (auto-start signal). */
  shouldAutoStart: boolean;
  /** Open the tour overlay. */
  startTour:   () => void;
  /** Mark the tour as complete and persist the pref. */
  completeTour: () => void;
}

export function useHomebaseTour(): HomebaseTourResult {
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    _subscribers.add(forceUpdate);
    _ensureLoaded();
    return () => { _subscribers.delete(forceUpdate); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startTour = useCallback(() => {
    _setTourActive(true);
  }, []);

  const completeTour = useCallback(() => {
    _setTourActive(false);
    if (_completed) return;
    _setCompleted(true);
    fetch(PREFS_URL, {
      method:      "PATCH",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ prefs: { [PREF_KEY]: true } }),
    }).catch(() => { /* non-critical — tour just re-fires next session */ });
  }, []);

  return {
    isReady:         _isReady,
    tourActive:      _tourActive,
    shouldAutoStart: _isReady && !_completed && !_tourActive,
    startTour,
    completeTour,
  };
}
