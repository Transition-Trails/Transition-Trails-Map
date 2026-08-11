/**
 * useCollapsible
 *
 * Lightweight hook that tracks open/closed state for a collapsible card.
 * State is persisted to localStorage under a namespaced key so it survives
 * page refreshes.
 *
 * Usage:
 *   const [isOpen, toggle] = useCollapsible("active-tasks", true);
 */

import { useState, useEffect } from "react";

export function useCollapsible(key: string, defaultOpen = true): [boolean, () => void] {
  const storageKey = `homebase:collapse:${key}`;

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return stored === "1";
    } catch {
      // Private browsing or SSR — fall through to default.
    }
    return defaultOpen;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, isOpen ? "1" : "0");
    } catch {
      // Ignore write failures (private browsing quota, etc.)
    }
  }, [isOpen, storageKey]);

  const toggle = () => setIsOpen(v => !v);

  return [isOpen, toggle];
}
