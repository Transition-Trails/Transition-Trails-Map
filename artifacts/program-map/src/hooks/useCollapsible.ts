/**
 * useCollapsible
 *
 * Lightweight hook that tracks open/closed state for a collapsible card.
 * State is persisted in two layers:
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
 * On toggle the state changes instantly, localStorage is written synchronously,
 * and a fire-and-forget PATCH is sent to the server.  If the server is
 * unavailable the local value is kept — no error is surfaced to the user.
 *
 * Usage:
 *   const [isOpen, toggle] = useCollapsible("active-tasks", true);
 */

import { useState, useEffect, useRef } from "react";

const SERVER_PREFS_URL = "/api/user/prefs";

// Module-level in-flight guard so all instances share a single GET request
// rather than each firing their own on mount.
let serverFetchPromise: Promise<Record<string, unknown>> | null = null;

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
        // Allow a fresh fetch next time (e.g. after a long session).
        // 30-second window prevents a waterfall of requests on the same page.
        setTimeout(() => { serverFetchPromise = null; }, 30_000);
      });
  }
  return serverFetchPromise;
}

function patchServerPref(key: string, value: boolean): void {
  // Fire-and-forget — failure is silently ignored; localStorage is the fallback.
  fetch(SERVER_PREFS_URL, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefs: { [key]: value ? 1 : 0 } }),
  }).catch(() => undefined);
}

export function useCollapsible(key: string, defaultOpen = true): [boolean, () => void] {
  const storageKey = `homebase:collapse:${key}`;

  // 1. Initialise from localStorage synchronously — no layout flash.
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return stored === "1";
    } catch {
      // Private browsing or SSR — fall through to default.
    }
    return defaultOpen;
  });

  // Track whether we've applied the server value yet (to avoid overwriting a
  // toggle the user made while the fetch was in-flight).
  const serverApplied = useRef(false);

  // 2. Sync from server on mount.
  useEffect(() => {
    let cancelled = false;

    fetchServerPrefs().then(prefs => {
      if (cancelled || serverApplied.current) return;
      const serverVal = prefs[storageKey];
      if (serverVal === 0 || serverVal === 1) {
        const serverOpen = serverVal === 1;
        serverApplied.current = true;
        setIsOpen(serverOpen);
        // Keep localStorage in sync with the authoritative server value.
        try {
          localStorage.setItem(storageKey, serverOpen ? "1" : "0");
        } catch {
          // Ignore.
        }
      }
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // 3. Write to localStorage whenever state changes.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, isOpen ? "1" : "0");
    } catch {
      // Ignore write failures (private browsing quota, etc.)
    }
  }, [isOpen, storageKey]);

  // 4. Toggle: update local state + persist everywhere.
  const toggle = () => {
    setIsOpen(v => {
      const next = !v;
      serverApplied.current = true; // user intent wins over any pending fetch
      patchServerPref(storageKey, next);
      return next;
    });
  };

  return [isOpen, toggle];
}
