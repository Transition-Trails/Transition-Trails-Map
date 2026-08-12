/**
 * useMissionControlTour
 *
 * Tracks whether the current user has completed the Mission Control walkthrough
 * tour, and provides controls to start or skip it.
 *
 * Mirrors useHomebaseTour exactly — module-level shared store, same API surface
 * — but uses independent persistence keys so the two tours never interfere.
 *
 * Persistence:
 *   - Tour-complete flag: /api/user/prefs  (server-side, cross-device)
 *     Key: "hasSeenMissionControlTour"
 *   - Seen step keys:     localStorage     (lightweight, per-browser)
 *     Key: "missionControlTourSeenSteps" → JSON array of step title strings
 *
 * Skipping logic:
 *   When startTour() is called the current seen-step set is snapshotted into
 *   _seenStepKeysAtOpen. MissionControlTour uses that snapshot (not the live
 *   set) for filtering, so the step list is stable for the whole session.
 *   markStepSeen() persists to localStorage WITHOUT notifying subscribers,
 *   ensuring no mid-tour re-renders or index resets.
 *
 *   showAllSteps() clears the seen set and snapshots an empty set, forcing
 *   every step to be shown on the next open.
 */

import { useEffect, useState, useCallback } from "react";

const PREF_KEY          = "hasSeenMissionControlTour";
const PREFS_URL         = "/api/user/prefs";
const SEEN_STEPS_LS_KEY = "missionControlTourSeenSteps";

// ── Seen-step helpers (localStorage) ─────────────────────────────────────────

function _loadSeenSteps(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_STEPS_LS_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore parse / quota errors */ }
  return new Set();
}

function _persistSeenSteps(keys: Set<string>): void {
  try {
    localStorage.setItem(SEEN_STEPS_LS_KEY, JSON.stringify([...keys]));
  } catch { /* non-critical */ }
}

// ── Module-level shared store ─────────────────────────────────────────────────

let _completed:    boolean       = false;
let _isReady:      boolean       = false;
let _tourActive:   boolean       = false;
let _fetchPromise: Promise<void> | null = null;

/** Full live set of seen step titles — updated by markStepSeen, persisted to localStorage. */
let _seenStepKeys: Set<string> = _loadSeenSteps();

/**
 * Snapshot of seenStepKeys taken when the tour opens.
 * MissionControlTour uses this for filtering so the step list is stable for
 * the whole session — markStepSeen does NOT notify subscribers.
 */
let _seenStepKeysAtOpen: Set<string> = new Set();

const _subscribers = new Set<() => void>();

function _notify() { _subscribers.forEach(fn => fn()); }

function _setCompleted(v: boolean)  { _completed  = v; _notify(); }
function _setTourActive(v: boolean) { _tourActive = v; _notify(); }
function _markReady()               { _isReady    = true; _notify(); }

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

/**
 * Record that a step (identified by its title) has been shown.
 * Persists to localStorage but does NOT notify subscribers — the step list
 * in MissionControlTour is derived from the at-open snapshot and must not
 * shift mid-session.
 */
function _markStepSeen(title: string): void {
  if (_seenStepKeys.has(title)) return;
  _seenStepKeys = new Set([..._seenStepKeys, title]);
  _persistSeenSteps(_seenStepKeys);
  // Intentionally no _notify() — avoids recomputing step list mid-tour.
}

// ── Public hook ───────────────────────────────────────────────────────────────

export interface MissionControlTourResult {
  /** True once the prefs fetch has resolved. */
  isReady:              boolean;
  /** True when the tour overlay should be visible. */
  tourActive:           boolean;
  /** True when the user hasn't seen the tour yet (auto-start signal). */
  shouldAutoStart:      boolean;
  /**
   * Snapshot of the seen-step set taken when the tour last opened.
   * Stable for the duration of the session.
   */
  seenStepKeysAtOpen:   Set<string>;
  /** Open the tour overlay (snapshots current seen set). */
  startTour:            () => void;
  /** Open the tour in "show all" mode — every step shown regardless of history. */
  showAllSteps:         () => void;
  /** Persist a step as seen (silent — no re-render). */
  markStepSeen:         (title: string) => void;
  /** Mark the tour as complete and persist the pref. */
  completeTour:         () => void;
}

export function useMissionControlTour(): MissionControlTourResult {
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    _subscribers.add(forceUpdate);
    _ensureLoaded();
    return () => { _subscribers.delete(forceUpdate); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startTour = useCallback(() => {
    _seenStepKeysAtOpen = new Set(_seenStepKeys);
    _setTourActive(true);
  }, []);

  const showAllSteps = useCallback(() => {
    _seenStepKeysAtOpen = new Set();
    _setTourActive(true);
  }, []);

  const markStepSeen = useCallback((title: string) => {
    _markStepSeen(title);
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
    }).catch(() => { /* non-critical — tour re-fires next session */ });
  }, []);

  return {
    isReady:            _isReady,
    tourActive:         _tourActive,
    shouldAutoStart:    _isReady && !_completed && !_tourActive,
    seenStepKeysAtOpen: _seenStepKeysAtOpen,
    startTour,
    showAllSteps,
    markStepSeen,
    completeTour,
  };
}
