/**
 * useHomebaseLayout
 *
 * Manages two pieces of Homebase card state, both persisted to localStorage:
 *   - cardOrder  — ordered array of card IDs (drag-to-reorder)
 *   - collapsed  — Set of card IDs currently collapsed
 *
 * Storage keys (default prefix "homebase"):
 *   homebase:card-order      — JSON string[]
 *   homebase:card-collapsed  — JSON string[]
 *
 * Pass `storagePrefix` to namespace a separate layout (e.g. "coach-homebase").
 * Pass `defaultOrder` to define the baseline card order for that layout.
 */

import { useState, useCallback } from "react";

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

export function useHomebaseLayout(options?: UseHomebaseLayoutOptions) {
  const prefix       = options?.storagePrefix ?? "homebase";
  const defaults     = options?.defaultOrder  ?? [...DEFAULT_CARD_ORDER];
  const ORDER_KEY     = `${prefix}:card-order`;
  const COLLAPSED_KEY = `${prefix}:card-collapsed`;

  const [cardOrder, setCardOrderState] = useState<string[]>(() => readOrder(ORDER_KEY, defaults));
  const [collapsed, setCollapsed]      = useState<Set<string>>(() => readCollapsed(COLLAPSED_KEY));

  const setCardOrder = useCallback((ids: string[]) => {
    setCardOrderState(ids);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  }, [ORDER_KEY]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, [COLLAPSED_KEY]);

  const resetLayout = useCallback(() => {
    const defaultOrder = [...DEFAULT_CARD_ORDER];
    setCardOrderState(defaultOrder);
    setCollapsed(new Set());
    try {
      localStorage.removeItem(ORDER_KEY);
      localStorage.removeItem(COLLAPSED_KEY);
    } catch { /* ignore */ }
  }, []);

  return { cardOrder, setCardOrder, collapsed, toggleCollapse, resetLayout };
}
