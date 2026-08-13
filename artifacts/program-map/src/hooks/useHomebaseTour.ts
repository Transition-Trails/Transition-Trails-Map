/**
 * useHomebaseTour
 *
 * Tracks whether the current user has dismissed the Homebase walkthrough tour
 * for the current release, and provides controls to start or skip it.
 *
 * ── Release versioning ──────────────────────────────────────────────────────
 * TOUR_RELEASE is the single value to bump when new tour content ships.
 * Dismissal is stored as the release string that was active when the user
 * dismissed, so changing TOUR_RELEASE automatically re-triggers the tour for
 * everyone — even users who previously skipped or completed it.
 *
 * ── Persistence (two layers) ───────────────────────────────────────────────
 * 1. localStorage (fast-path, per-browser):
 *    Checked synchronously at module init — prevents the tour from flashing
 *    before the server responds, and ensures dismiss is honoured even when the
 *    server-side PATCH fails (e.g. DB not yet migrated in dev).
 *    Key: "homebaseTourRelease" → the TOUR_RELEASE string the user last dismissed.
 *
 * 2. /api/user/prefs (server-side, cross-device):
 *    PATCH-ed after every dismiss/complete.  Key: "homebaseTourLastRelease".
 *    On load, if the stored value matches TOUR_RELEASE the tour is suppressed
 *    cross-device (works once user_preferences table exists in the DB).
 *
 * ── Skip = dismissed ───────────────────────────────────────────────────────
 * Clicking X, clicking the scrim, or finishing the last step all call
 * completeTour().  All three are treated as "dismissed for this release" and
 * suppress auto-start until TOUR_RELEASE next changes.
 *
 * ── Seen-step tracking ─────────────────────────────────────────────────────
 * Individual step titles are stored in localStorage under "homebaseTourSeenSteps"
 * so shared steps aren't repeated within a release even across multiple openings.
 * showAllSteps() snapshots an empty set, forcing every step to render once.
 */

import { useEffect, useState, useCallback } from "react";

// ── Release version ───────────────────────────────────────────────────────────
// Bump this string whenever a new release ships tour content that all users
// should see again.  Format: "YYYY-MM" or any string that changes per release.
export const TOUR_RELEASE = "2026-08";

// ── Storage keys ──────────────────────────────────────────────────────────────
const LS_RELEASE_KEY    = "homebaseTourRelease";   // localStorage: last-dismissed release
const LS_SEEN_STEPS_KEY = "homebaseTourSeenSteps"; // localStorage: seen step titles
const PREFS_URL         = "/api/user/prefs";
const PREF_RELEASE_KEY  = "homebaseTourLastRelease"; // server prefs key

// ── Seen-step helpers (localStorage) ─────────────────────────────────────────

function _loadSeenSteps(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_SEEN_STEPS_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore parse / quota errors */ }
  return new Set();
}

function _persistSeenSteps(keys: Set<string>): void {
  try {
    localStorage.setItem(LS_SEEN_STEPS_KEY, JSON.stringify([...keys]));
  } catch { /* non-critical */ }
}

// ── Release dismiss helpers (localStorage) ────────────────────────────────────

/** Returns true if the user has already dismissed the current release's tour. */
function _lsIsDismissed(): boolean {
  try {
    return localStorage.getItem(LS_RELEASE_KEY) === TOUR_RELEASE;
  } catch {
    return false;
  }
}

function _lsPersistDismiss(): void {
  try {
    localStorage.setItem(LS_RELEASE_KEY, TOUR_RELEASE);
  } catch { /* non-critical */ }
}

// ── Module-level shared store ─────────────────────────────────────────────────

/**
 * True if the user has dismissed the tour for the current TOUR_RELEASE.
 * Pre-populated synchronously from localStorage so there's no flash before the
 * server prefs fetch resolves.
 */
let _dismissed:    boolean       = _lsIsDismissed();
let _isReady:      boolean       = _dismissed; // ready immediately if already dismissed
let _tourActive:   boolean       = false;
let _fetchPromise: Promise<void> | null = null;

/** Full live set of seen step titles — updated by markStepSeen, persisted to localStorage. */
let _seenStepKeys: Set<string> = _loadSeenSteps();

/**
 * Snapshot of seenStepKeys taken when the tour opens.
 * HomebaseTour uses this for filtering so the step list is stable for the
 * whole session — markStepSeen does NOT notify subscribers (no re-renders).
 */
let _seenStepKeysAtOpen: Set<string> = new Set();

const _subscribers = new Set<() => void>();

function _notify() { _subscribers.forEach(fn => fn()); }

function _setDismissed(v: boolean) { _dismissed  = v; _notify(); }
function _setTourActive(v: boolean) { _tourActive = v; _notify(); }
function _markReady()               { _isReady    = true; _notify(); }

function _ensureLoaded(): void {
  if (_isReady || _fetchPromise) return;
  _fetchPromise = fetch(PREFS_URL, { credentials: "include" })
    .then(r => (r.ok ? r.json() : { prefs: {} }))
    .then((data: unknown) => {
      const prefs = (data as { prefs?: Record<string, unknown> }).prefs ?? {};
      // Dismissed if the stored release string matches the current release.
      if (prefs[PREF_RELEASE_KEY] === TOUR_RELEASE) {
        _setDismissed(true);
        _lsPersistDismiss(); // keep LS in sync
      }
      _markReady();
    })
    .catch(() => { _markReady(); });
}

/**
 * Record that a step (identified by its title) has been shown.
 * Persists to localStorage but does NOT notify subscribers — the step list
 * in HomebaseTour is derived from the at-open snapshot and must not shift
 * mid-session.
 */
function _markStepSeen(title: string): void {
  if (_seenStepKeys.has(title)) return;
  _seenStepKeys = new Set([..._seenStepKeys, title]);
  _persistSeenSteps(_seenStepKeys);
  // Intentionally no _notify() — avoids recomputing step list mid-tour.
}

// ── Public hook ───────────────────────────────────────────────────────────────

export interface HomebaseTourResult {
  /** True once the prefs fetch has resolved (or LS fast-path resolved it). */
  isReady:              boolean;
  /** True when the tour overlay should be visible. */
  tourActive:           boolean;
  /** True when the user hasn't dismissed the tour for the current release. */
  shouldAutoStart:      boolean;
  /**
   * Snapshot of the seen-step set taken when the tour last opened.
   * Stable for the duration of the session — use this (not a live set) to
   * decide which shared steps to skip.
   */
  seenStepKeysAtOpen:   Set<string>;
  /**
   * Open the tour overlay.
   * Snapshots the current seen set so the step list is stable for the session.
   */
  startTour:            () => void;
  /**
   * Open the tour in "show all" mode — clears the seen set first so every
   * step, including previously-seen shared steps, is shown.
   */
  showAllSteps:         () => void;
  /** Persist a step as seen (silent — no re-render). */
  markStepSeen:         (title: string) => void;
  /**
   * Dismiss the tour for the current release.
   * Called both when the user skips (X / scrim) and when they reach the last
   * step.  Either action suppresses auto-start until TOUR_RELEASE next changes.
   */
  completeTour:         () => void;
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
    // Snapshot the current seen set before opening — step list is stable from here.
    _seenStepKeysAtOpen = new Set(_seenStepKeys);
    _setTourActive(true);
  }, []);

  const showAllSteps = useCallback(() => {
    // Snapshot an empty set so every step shows this session.
    // The persistent _seenStepKeys is intentionally left intact so that a
    // future replay via startTour() will still auto-skip already-seen steps.
    _seenStepKeysAtOpen = new Set();
    _setTourActive(true);
  }, []);

  const markStepSeen = useCallback((title: string) => {
    _markStepSeen(title);
  }, []);

  const completeTour = useCallback(() => {
    _setTourActive(false);

    // Persist dismiss to localStorage immediately — this is the reliable
    // fast-path that works even when the server PATCH fails.
    _lsPersistDismiss();

    if (_dismissed) return; // already recorded for this release
    _setDismissed(true);

    // Best-effort server persist for cross-device suppression.
    fetch(PREFS_URL, {
      method:      "PATCH",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ prefs: { [PREF_RELEASE_KEY]: TOUR_RELEASE } }),
    }).catch(() => { /* non-critical — LS fallback already saved dismiss */ });
  }, []);

  return {
    isReady:            _isReady,
    tourActive:         _tourActive,
    shouldAutoStart:    _isReady && !_dismissed && !_tourActive,
    seenStepKeysAtOpen: _seenStepKeysAtOpen,
    startTour,
    showAllSteps,
    markStepSeen,
    completeTour,
  };
}
