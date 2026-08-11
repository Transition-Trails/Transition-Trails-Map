/**
 * useMeetingFilter
 *
 * Persists the Meeting Notes card "This week / All" filter choice in two layers:
 *
 *   1. localStorage  — instant, synchronous; survives page refreshes on this device.
 *   2. Server prefs  — synced to the user's server-side session via
 *                      GET/PATCH /api/user/prefs; roams across devices.
 *
 * On first render the hook reads from localStorage immediately (no flash).
 * A background fetch then pulls the server value; if the server has an
 * opinion that differs from localStorage, the server wins and localStorage is
 * updated to match.
 *
 * On change the state updates instantly, localStorage is written synchronously,
 * and a fire-and-forget PATCH is sent to the server.  If the server is
 * unavailable the local value is kept — no error is surfaced to the user.
 *
 * Storage key : "homebase:meetings:filter"
 * Stored value: 0 = "This week", 1 = "All"
 *
 * Usage:
 *   const [showAll, setShowAll] = useMeetingFilter();
 */

import { useState, useEffect, useRef } from "react";

const PREF_KEY    = "homebase:meetings:filter";
const STORAGE_KEY = PREF_KEY;
const SERVER_URL  = "/api/user/prefs";

// Shared module-level promise so all hook instances reuse the same GET request.
let serverFetchPromise: Promise<Record<string, unknown>> | null = null;

function fetchServerPrefs(): Promise<Record<string, unknown>> {
  if (!serverFetchPromise) {
    serverFetchPromise = fetch(SERVER_URL, { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ prefs: Record<string, unknown> }>;
      })
      .then(data => data.prefs ?? {})
      .catch(() => ({}))
      .finally(() => {
        // Allow a fresh fetch after 30 s (same window as useCollapsible).
        setTimeout(() => { serverFetchPromise = null; }, 30_000);
      });
  }
  return serverFetchPromise;
}

function patchServerPref(showAll: boolean): void {
  // Fire-and-forget — failure is silently ignored; localStorage is the fallback.
  fetch(SERVER_URL, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefs: { [PREF_KEY]: showAll ? 1 : 0 } }),
  }).catch(() => undefined);
}

export function useMeetingFilter(): [boolean, (next: boolean) => void] {
  // 1. Initialise from localStorage synchronously — no layout flash.
  const [showAll, setShowAll] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) return stored === "1";
    } catch {
      // Private browsing or SSR — fall through to default.
    }
    return false; // default: "This week"
  });

  // Track whether we've applied the server value yet (to avoid overwriting a
  // change the user made while the fetch was in-flight).
  const serverApplied = useRef(false);

  // 2. Sync from server on mount.
  useEffect(() => {
    let cancelled = false;

    fetchServerPrefs().then(prefs => {
      if (cancelled || serverApplied.current) return;
      const serverVal = prefs[PREF_KEY];
      if (serverVal === 0 || serverVal === 1) {
        const serverShowAll = serverVal === 1;
        serverApplied.current = true;
        setShowAll(serverShowAll);
        try {
          localStorage.setItem(STORAGE_KEY, serverShowAll ? "1" : "0");
        } catch {
          // Ignore.
        }
      }
    });

    return () => { cancelled = true; };
  }, []);

  // 3. Write to localStorage whenever state changes.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, showAll ? "1" : "0");
    } catch {
      // Ignore write failures (private browsing quota, etc.)
    }
  }, [showAll]);

  // 4. Setter: update local state + persist everywhere.
  const setFilter = (next: boolean) => {
    serverApplied.current = true; // user intent wins over any pending fetch
    setShowAll(next);
    patchServerPref(next);
  };

  return [showAll, setFilter];
}
