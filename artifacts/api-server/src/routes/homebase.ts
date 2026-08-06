/**
 * homebase.ts
 *
 * Routes for the Trail OS Homebase — the external-facing surface for Learners,
 * Coaches, and Volunteers. These routes are distinct from the internal admin
 * surface and use homebase-specific auth middleware.
 *
 * Public (no auth):
 *   GET  /auth/homebase/status   — returns audience + sign-in state from session
 *
 * Homebase-auth-gated:
 *   POST /homebase/log-time      — record a time entry for the current user
 *   GET  /homebase/log-time      — fetch the current user's time entries for this month
 */

import { Router } from "express";
import { db } from "@workspace/db";
import { timeLogsTable } from "@workspace/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import { requireHomebaseAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router = Router();

// ── /auth/homebase/status ─────────────────────────────────────────────────────
//
// Returns the homebase session state.  Safe to call when not signed in
// (returns { isSignedIn: false }) — used by the HomebaseRoute guard on the
// frontend to decide which shell to render.

router.get("/auth/homebase/status", (req, res) => {
  const email    = req.session.googleEmail;
  const audience = req.session.googleAudience ?? null;

  if (!email) {
    // No session — unauthenticated
    res.json({ isSignedIn: false, audience: null });
    return;
  }

  // Authenticated — could be staff (audience:null) or homebase (audience set)
  res.json({
    isSignedIn:  true,
    audience,
    email,
    displayName: req.session.googleName ?? email,
  });
});

// ── POST /homebase/log-time ───────────────────────────────────────────────────

router.post("/homebase/log-time", requireHomebaseAuth, async (req, res) => {
  const email    = req.session.googleEmail!;
  const audience = req.session.googleAudience!;

  const { activityLabel, hours } = req.body as {
    activityLabel?: unknown;
    hours?:         unknown;
  };

  if (typeof activityLabel !== "string" || !activityLabel.trim()) {
    res.status(400).json({ error: "activityLabel is required" });
    return;
  }

  const parsedHours = Number(hours);
  if (!Number.isFinite(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
    res.status(400).json({ error: "hours must be a positive number (max 24)" });
    return;
  }

  try {
    const [row] = await db
      .insert(timeLogsTable)
      .values({
        userEmail:     email,
        audience,
        activityLabel: activityLabel.trim(),
        hours:         parsedHours.toFixed(2),
      })
      .returning();

    logger.info({ email, audience, hours: parsedHours }, "homebase: time logged");
    res.status(201).json({ ok: true, entry: row });
  } catch (err) {
    logger.error({ err }, "homebase: error inserting time log");
    res.status(500).json({ error: "Failed to save time entry" });
  }
});

// ── GET /homebase/log-time ────────────────────────────────────────────────────

router.get("/homebase/log-time", requireHomebaseAuth, async (req, res) => {
  const email = req.session.googleEmail!;

  // Start of current calendar month
  const now       = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const rows = await db
      .select()
      .from(timeLogsTable)
      .where(eq(timeLogsTable.userEmail, email))
      .orderBy(desc(timeLogsTable.loggedAt));

    // Filter in JS for current month (avoids timezone edge cases in SQL)
    const thisMonth = rows.filter(r => new Date(r.loggedAt) >= monthStart);

    const totalHours = thisMonth.reduce((sum, r) => sum + Number(r.hours), 0);

    res.json({ entries: thisMonth, totalHours: Math.round(totalHours * 100) / 100 });
  } catch (err) {
    logger.error({ err }, "homebase: error fetching time logs");
    res.status(500).json({ error: "Failed to load time entries" });
  }
});

export default router;
