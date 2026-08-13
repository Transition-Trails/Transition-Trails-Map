/**
 * useHomebaseLayout
 *
 * Manages two pieces of Homebase card state, persisted in two layers:
 *   1. localStorage  — instant, synchronous; survives page refreshes on this device.
 *   2. Server prefs  — synced to the user's DB row via GET/PATCH /api/user/prefs;
 *                      roams across browsers and devices for the same user.
 *
 * On first render the hook reads from localStorage immediately (no flash).
 * A background fetch then pulls the server value; if the server has an
 * opinion that differs from localStorage, the server wins and localStorage is
 * updated to match.
 *
 * Each field (cardOrder, collapsed) has its own independent race guard so
 * that acting on one field does not prevent the server value of the other
 * field from being applied.
 *
 * Any change is written to localStorage synchronously and the per-field
 * user-intent guard is set immediately (before any debounce) so a
 * concurrently resolving GET cannot overwrite the user's action.  A 500 ms
 * debounce then sends the PATCH to avoid flooding the API during a drag gesture.
 *
 * Pass `storagePrefix` to namespace a separate layout (e.g. "coach-homebase").
 * Pass `defaultOrder` to define the baseline card order for that layout.
 *
 * Storage keys (shared between localStorage and server prefs):
 *   ${prefix}:card-order      — JSON string[]
 *   ${prefix}:card-collapsed  — JSON string[]
 */

import { useState, useEffect, useRef, useCallback } from "react";

const SERVER_PREFS_URL = "/api/user/prefs";

// Module-level in-flight guard so all instances share a single GET request.
let serverFetchPromise: Promise<Record<string, unknown>> | null = null;

export const DEFAULT_CARD_ORDER = [
  "today-tasks",
  "today-meetings",
  "meeting-notes",
  "active-tasks",
  "cases-card",
  "my-time",
] as const;

export type CardId = typeof DEFAULT_CARD_ORDER[number];

interface UseHomebaseLayoutOptions {
  /** localStorage key prefix. Defaults to "homebase". */
  storagePrefix?: string;
  /** Baseline card order used when no saved order exists or the saved order is stale. */
  defaultOrder?: string[];
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function readOrder(orderKey: string, defaults: string[]): string[] {
  try {
    const raw = localStorage.getItem(orderKey);
    if (!raw) return [...defaults];
    const parsed = JSON.parse(raw) as string[];
    // Guard against stale / partial saves — must contain all default IDs.
    if (defaults.every(id => parsed.includes(id))) return parsed;
  } catch { /* ignore */ }
  return [...defaults];
}

function readCollapsed(collapsedKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(collapsedKey);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function writeOrder(orderKey: string, ids: string[]): void {
  try { localStorage.setItem(orderKey, JSON.stringify(ids)); } catch { /* ignore */ }
}

function writeCollapsed(collapsedKey: string, set: Set<string>): void {
  try { localStorage.setItem(collapsedKey, JSON.stringify([...set])); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Server prefs helpers
// ---------------------------------------------------------------------------

function fetchServerPrefs(): Promise<Record<string, unknown>> {
  if (!serverFetchPromise) {
    serverFetchPromise = fetch(SERVER_PREFS_URL, { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ prefs: Record<string, unknown> }>;
      })
      .then(data => data.prefs ?? {})
      .catch(() => ({}))
      .finally(() => {
        // Allow a fresh fetch after 30 s (prevents waterfall on same page).
        setTimeout(() => { serverFetchPromise = null; }, 30_000);
      });
  }
  return serverFetchPromise;
}

function patchServerPrefs(patch: Record<string, string>): void {
  // Fire-and-forget — failure is silently ignored; localStorage is the fallback.
  fetch(SERVER_PREFS_URL, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefs: patch }),
  }).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHomebaseLayout(options?: UseHomebaseLayoutOptions) {
  const prefix   = options?.storagePrefix ?? "homebase";
  const defaults = options?.defaultOrder  ?? [...DEFAULT_CARD_ORDER];

  const ORDER_KEY     = `${prefix}:card-order`;
  const COLLAPSED_KEY = `${prefix}:card-collapsed`;

  const [cardOrder, setCardOrderState] = useState<string[]>(() => readOrder(ORDER_KEY, defaults));
  const [collapsed, setCollapsedState] = useState<Set<string>>(() => readCollapsed(COLLAPSED_KEY));

  // Independent per-field race guards so that acting on one field does NOT
  // suppress the server value being applied to the other field.
  const orderServerApplied     = useRef(false);
  const collapsedServerApplied = useRef(false);

  // Debounce timers for server writes.
  const orderTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapsedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A ref that always mirrors the latest collapsed set so the debounce
  // callback always sends the current value, even after multiple rapid toggles.
  const latestCollapsed = useRef<Set<string>>(collapsed);
  useEffect(() => { latestCollapsed.current = collapsed; }, [collapsed]);

  // -------------------------------------------------------------------------
  // Sync from server on mount — server wins over localStorage, per field.
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    fetchServerPrefs().then(prefs => {
      if (cancelled) return;

      // Card order — only apply if the user hasn't already acted on this field.
      if (!orderServerApplied.current) {
        const rawOrder = prefs[ORDER_KEY];
        if (typeof rawOrder === "string") {
          try {
            const parsed = JSON.parse(rawOrder) as string[];
            if (Array.isArray(parsed) && defaults.every(id => parsed.includes(id))) {
              orderServerApplied.current = true;
              setCardOrderState(parsed);
              writeOrder(ORDER_KEY, parsed);
            }
          } catch { /* ignore malformed value */ }
        }
      }

      // Collapsed set — independent of the order guard above.
      if (!collapsedServerApplied.current) {
        const rawCollapsed = prefs[COLLAPSED_KEY];
        if (typeof rawCollapsed === "string") {
          try {
            const parsed = JSON.parse(rawCollapsed) as string[];
            if (Array.isArray(parsed)) {
              const set = new Set<string>(parsed);
              collapsedServerApplied.current = true;
              setCollapsedState(set);
              latestCollapsed.current = set;
              writeCollapsed(COLLAPSED_KEY, set);
            }
          } catch { /* ignore malformed value */ }
        }
      }
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ORDER_KEY, COLLAPSED_KEY]);

  // Clear pending debounce timers on unmount.
  useEffect(() => {
    return () => {
      if (orderTimer.current)     clearTimeout(orderTimer.current);
      if (collapsedTimer.current) clearTimeout(collapsedTimer.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Public actions
  // -------------------------------------------------------------------------

  const setCardOrder = useCallback((ids: string[]) => {
    // Guard SYNCHRONOUSLY — before the debounce — so a concurrently resolving
    // GET cannot overwrite this user action. Only guards the order field.
    orderServerApplied.current = true;

    setCardOrderState(ids);
    writeOrder(ORDER_KEY, ids);

    if (orderTimer.current) clearTimeout(orderTimer.current);
    orderTimer.current = setTimeout(() => {
      patchServerPrefs({ [ORDER_KEY]: JSON.stringify(ids) });
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ORDER_KEY]);

  const toggleCollapse = useCallback((id: string) => {
    // Guard SYNCHRONOUSLY and only for the collapsed field.
    collapsedServerApplied.current = true;

    setCollapsedState(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      writeCollapsed(COLLAPSED_KEY, next);
      latestCollapsed.current = next;
      return next;
    });

    if (collapsedTimer.current) clearTimeout(collapsedTimer.current);
    collapsedTimer.current = setTimeout(() => {
      patchServerPrefs({ [COLLAPSED_KEY]: JSON.stringify([...latestCollapsed.current]) });
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [COLLAPSED_KEY]);

  const resetLayout = useCallback(() => {
    const defaultOrder = [...defaults];
    orderServerApplied.current     = true;
    collapsedServerApplied.current = true;

    setCardOrderState(defaultOrder);
    setCollapsedState(new Set());
    latestCollapsed.current = new Set();

    try {
      localStorage.removeItem(ORDER_KEY);
      localStorage.removeItem(COLLAPSED_KEY);
    } catch { /* ignore */ }

    // Sync reset to server so other devices also revert to defaults.
    if (orderTimer.current)     clearTimeout(orderTimer.current);
    if (collapsedTimer.current) clearTimeout(collapsedTimer.current);
    patchServerPrefs({
      [ORDER_KEY]:     JSON.stringify(defaultOrder),
      [COLLAPSED_KEY]: JSON.stringify([]),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ORDER_KEY, COLLAPSED_KEY]);

  return { cardOrder, setCardOrder, collapsed, toggleCollapse, resetLayout };
}
