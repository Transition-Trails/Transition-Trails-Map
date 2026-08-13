/**
 * /api/user/prefs
 *
 * Durable key-value store for per-user UI preferences, persisted in the
 * `user_preferences` DB table keyed by the user's Google email address.
 * Because the table is keyed by identity (not by session cookie), preferences
 * roam across browsers and devices for the same authenticated user.
 *
 * GET  /user/prefs   — returns { prefs: Record<string, unknown> }
 * PATCH /user/prefs  — atomically merges { prefs: Record<string, unknown> } into stored prefs
 *
 * Values must be JSON primitives (string | number | boolean | null).
 * Unknown keys are silently ignored on read; extra keys from the client are
 * stored as-is (no schema enforcement beyond primitive-value validation).
 *
 * Concurrency safety
 * ──────────────────
 * PATCH uses Postgres's JSONB `||` merge operator inside an upsert so the
 * merge is atomic — two concurrent patches from different browsers cannot
 * race and lose each other's fields.
 *
 * Identity
 * ────────
 * The effective identity (`res.locals.effectiveEmail`) is used so that a
 * superadmin impersonating a learner reads/writes the learner's row, not the
 * superadmin's own row.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { userPreferencesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

// Maximum number of preference keys we'll store per user.
const MAX_PREF_KEYS = 100;

// Allowed value types for preference entries.
function isAllowedValue(v: unknown): v is string | number | boolean | null {
  return v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

/** Resolve the authenticated user's email from the request/response pair. */
function resolveEmail(req: Request, res: Response): string | undefined {
  // Prefer the effective identity set by requireAuth middleware (handles
  // superadmin impersonation — effectiveEmail is the target user, not the admin).
  const effective = res.locals.effectiveEmail as string | undefined;
  return effective ?? req.session.googleEmail ?? req.session.sfEmail;
}

// GET /user/prefs — always reads from DB; no session cache so cross-browser
// changes are visible immediately on the next request.
router.get("/user/prefs", async (req: Request, res: Response): Promise<void> => {
  const email = resolveEmail(req, res);
  if (!email) {
    res.json({ prefs: {} });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userEmail, email))
      .limit(1);

    res.json({ prefs: (row?.prefs ?? {}) as Record<string, unknown> });
  } catch {
    // DB unavailable — return empty rather than erroring; client falls back
    // to localStorage.
    res.json({ prefs: {} });
  }
});

// PATCH /user/prefs — atomically merges incoming keys into the stored blob.
router.patch("/user/prefs", async (req: Request, res: Response): Promise<void> => {
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

  const email = resolveEmail(req, res);
  if (!email) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    // Atomic upsert: insert a new row with the incoming prefs, or merge
    // incoming keys into the existing row using Postgres's JSONB || operator.
    // This is a single SQL statement — concurrent patches from different
    // browsers cannot interleave and lose each other's keys.
    await db
      .insert(userPreferencesTable)
      .values({ userEmail: email, prefs: incoming, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userPreferencesTable.userEmail,
        set: {
          prefs: sql<Record<string, unknown>>`COALESCE(${userPreferencesTable.prefs}, '{}'::jsonb) || ${JSON.stringify(incoming)}::jsonb`,
          updatedAt: new Date(),
        },
      });

    // Read back the merged result to return in the response.
    const [updated] = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userEmail, email))
      .limit(1);

    const merged = (updated?.prefs ?? incoming) as Record<string, unknown>;

    // Soft key cap: if the merged blob exceeds MAX_PREF_KEYS, trim the oldest
    // keys (those not in the current patch) in a best-effort follow-up write.
    const keys = Object.keys(merged);
    if (keys.length > MAX_PREF_KEYS) {
      const incomingKeys = new Set(Object.keys(incoming));
      const trimmed: Record<string, unknown> = {};
      let kept = 0;
      // Keep all incoming keys first, then fill from existing up to cap.
      for (const k of keys) {
        if (incomingKeys.has(k) || kept < MAX_PREF_KEYS - incomingKeys.size) {
          trimmed[k] = merged[k];
          kept++;
        }
      }
      await db
        .update(userPreferencesTable)
        .set({ prefs: trimmed, updatedAt: new Date() })
        .where(eq(userPreferencesTable.userEmail, email));
      res.json({ prefs: trimmed });
      return;
    }

    res.json({ prefs: merged });
  } catch (err) {
    console.error("[userPrefs] DB write error:", err);
    res.status(500).json({ error: "Failed to persist preferences" });
  }
});

export default router;
