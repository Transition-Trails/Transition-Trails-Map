/**
 * /api/user/prefs
 *
 * Tiny key-value store for per-user UI preferences persisted in the server-side
 * session.  Allows the same preference (e.g. homebase card collapse state) to
 * roam across devices without a dedicated DB table.
 *
 * GET  /user/prefs          — returns { prefs: Record<string, unknown> }
 * PATCH /user/prefs         — merges { prefs: Record<string, unknown> } into stored prefs
 *
 * Values must be JSON primitives (string | number | boolean | null).
 * Unknown keys are silently ignored on read; extra keys from the client are
 * stored as-is (no schema enforcement beyond primitive-value validation).
 */

import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

// Maximum number of preference keys we'll store per user.
// Keeps the session blob from growing unbounded.
const MAX_PREF_KEYS = 100;

// Allowed value types for preference entries.
function isAllowedValue(v: unknown): v is string | number | boolean | null {
  return v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

// GET /user/prefs
router.get("/user/prefs", (req: Request, res: Response): void => {
  const prefs = req.session.userPrefs ?? {};
  res.json({ prefs });
});

// PATCH /user/prefs
router.patch("/user/prefs", (req: Request, res: Response): void => {
  const body = req.body as Record<string, unknown> | undefined;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    res.status(400).json({ error: "Request body must be a JSON object" });
    return;
  }

  const incoming = body["prefs"] as Record<string, unknown> | undefined;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    res.status(400).json({ error: "Body must contain a 'prefs' object" });
    return;
  }

  // Validate incoming values — only primitives allowed.
  for (const [key, val] of Object.entries(incoming)) {
    if (!isAllowedValue(val)) {
      res.status(400).json({
        error: `Invalid value for key '${key}': only string, number, boolean, or null values are allowed`,
      });
      return;
    }
  }

  // Merge into existing prefs.
  const existing = req.session.userPrefs ?? {};
  const merged = { ...existing, ...incoming };

  // Enforce key cap — if over limit, drop the oldest keys (those already
  // present in `existing` that aren't in the incoming patch).
  const keys = Object.keys(merged);
  if (keys.length > MAX_PREF_KEYS) {
    const keep = new Set([
      ...Object.keys(incoming),
      ...Object.keys(existing).slice(0, MAX_PREF_KEYS - Object.keys(incoming).length),
    ]);
    for (const k of keys) {
      if (!keep.has(k)) delete merged[k];
    }
  }

  req.session.userPrefs = merged;

  // Persist the session immediately so prefs survive the next request.
  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to persist preferences" });
      return;
    }
    res.json({ prefs: req.session.userPrefs ?? {} });
  });
});

export default router;
