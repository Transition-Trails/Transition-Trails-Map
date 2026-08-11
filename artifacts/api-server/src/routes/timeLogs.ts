/**
 * Time Logs API — /api/time-logs
 *
 * POST  /api/time-logs               — create a new entry
 * GET   /api/time-logs               — list current user's entries (newest first)
 * GET   /api/time-logs/summary       — total minutes per SF object (?objectId=X)
 * DELETE /api/time-logs/:id          — delete own entry
 */

import { Router } from "express";
import { db }             from "@workspace/db";
import { timeLogsTable }  from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger }         from "../lib/logger.js";

const router = Router();

// ── POST /api/time-logs ────────────────────────────────────────────────────────

router.post("/time-logs", async (req, res) => {
  const userEmail = req.session.userEmail ?? req.session.email;
  if (!userEmail) return res.status(401).json({ error: "Not authenticated." });

  const { sfObjectType, sfObjectId, sfObjectName, minutes, notes, workDate } = req.body as {
    sfObjectType?: string;
    sfObjectId?:   string;
    sfObjectName?: string;
    minutes?:      number;
    notes?:        string;
    workDate?:     string; // ISO date string YYYY-MM-DD
  };

  if (!sfObjectType || !sfObjectId || !sfObjectName) {
    return res.status(400).json({ error: "sfObjectType, sfObjectId, and sfObjectName are required." });
  }
  if (!minutes || typeof minutes !== "number" || minutes <= 0 || minutes % 15 !== 0) {
    return res.status(400).json({ error: "minutes must be a positive multiple of 15." });
  }

  const hours = (minutes / 60).toFixed(2);
  const date  = workDate ?? new Date().toISOString().slice(0, 10);

  try {
    const [row] = await db.insert(timeLogsTable).values({
      userEmail,
      audience:      "staff",
      activityLabel: sfObjectName,
      hours,
      sfObjectType,
      sfObjectId,
      sfObjectName,
      workDate:      date,
      notes:         notes ?? null,
    }).returning();

    return res.status(201).json({ entry: row });
  } catch (err) {
    logger.error({ err }, "Failed to insert time log");
    return res.status(500).json({ error: "Failed to save time log." });
  }
});

// ── GET /api/time-logs ─────────────────────────────────────────────────────────

router.get("/time-logs", async (req, res) => {
  const userEmail = req.session.userEmail ?? req.session.email;
  if (!userEmail) return res.status(401).json({ error: "Not authenticated." });

  // Optional filter: ?objectId=xxx returns entries for a specific SF record
  const objectId = req.query["objectId"] as string | undefined;

  try {
    const conditions = objectId
      ? and(eq(timeLogsTable.userEmail, userEmail), eq(timeLogsTable.sfObjectId, objectId))
      : eq(timeLogsTable.userEmail, userEmail);

    const rows = await db
      .select()
      .from(timeLogsTable)
      .where(conditions)
      .orderBy(desc(timeLogsTable.loggedAt))
      .limit(objectId ? 200 : 20);

    return res.json({ entries: rows });
  } catch (err) {
    logger.error({ err }, "Failed to fetch time logs");
    return res.status(500).json({ error: "Failed to fetch time logs." });
  }
});

// ── GET /api/time-logs/summary ─────────────────────────────────────────────────
// Returns total minutes per SF object for the current user.
// Pass ?objectIds=id1,id2,id3 to query multiple objects at once.

router.get("/time-logs/summary", async (req, res) => {
  const userEmail = req.session.userEmail ?? req.session.email;
  if (!userEmail) return res.status(401).json({ error: "Not authenticated." });

  const objectIds = ((req.query["objectIds"] as string) ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  if (objectIds.length === 0) {
    return res.json({ summary: {} });
  }

  try {
    // Sum hours per sf_object_id, all users (so the badge reflects team total)
    const rows = await db
      .select({
        sfObjectId:   timeLogsTable.sfObjectId,
        totalMinutes: sql<number>`ROUND(SUM(${timeLogsTable.hours} * 60))`.as("total_minutes"),
      })
      .from(timeLogsTable)
      .where(
        sql`${timeLogsTable.sfObjectId} = ANY(${objectIds})`
      )
      .groupBy(timeLogsTable.sfObjectId);

    const summary: Record<string, number> = {};
    for (const r of rows) {
      if (r.sfObjectId) summary[r.sfObjectId] = Number(r.totalMinutes);
    }

    return res.json({ summary });
  } catch (err) {
    logger.error({ err }, "Failed to fetch time-log summary");
    return res.status(500).json({ error: "Failed to fetch summary." });
  }
});

// ── DELETE /api/time-logs/:id ──────────────────────────────────────────────────

router.delete("/time-logs/:id", async (req, res) => {
  const userEmail = req.session.userEmail ?? req.session.email;
  if (!userEmail) return res.status(401).json({ error: "Not authenticated." });

  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id." });

  try {
    const deleted = await db
      .delete(timeLogsTable)
      .where(and(eq(timeLogsTable.id, id), eq(timeLogsTable.userEmail, userEmail)))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: "Entry not found or not yours." });
    }
    return res.json({ deleted: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete time log");
    return res.status(500).json({ error: "Failed to delete time log." });
  }
});

export default router;
