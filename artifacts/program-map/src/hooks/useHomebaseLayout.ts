/**
 * useHomebaseLayout
 *
 * Manages two pieces of Homebase card state, both persisted to localStorage:
 *   - cardOrder  — ordered array of card IDs (drag-to-reorder)
 *   - collapsed  — Set of card IDs currently collapsed
 *
 * Storage keys:
 *   homebase:card-order      — JSON string[]
 *   homebase:card-collapsed  — JSON string[]
 */

import { useState, useCallback } from "react";

const ORDER_KEY     = "homebase:card-order";
const COLLAPSED_KEY = "homebase:card-collapsed";

export const DEFAULT_CARD_ORDER = [
  "today-tasks",
  "today-meetings",
  "meeting-notes",
  "active-tasks",
  "cases-card",
  "my-time",
] as const;

export type CardId = typeof DEFAULT_CARD_ORDER[number];

function readOrder(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return [...DEFAULT_CARD_ORDER];
    const parsed = JSON.parse(raw) as string[];
    // Guard against stale / partial saves — must contain all default IDs.
    if (DEFAULT_CARD_ORDER.every(id => parsed.includes(id))) return parsed;
  } catch { /* ignore */ }
  return [...DEFAULT_CARD_ORDER];
}

function readCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

export function useHomebaseLayout() {
  const [cardOrder,  setCardOrderState] = useState<string[]>(() => readOrder());
  const [collapsed,  setCollapsed]      = useState<Set<string>>(() => readCollapsed());

  const setCardOrder = useCallback((ids: string[]) => {
    setCardOrderState(ids);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { cardOrder, setCardOrder, collapsed, toggleCollapse };
}
