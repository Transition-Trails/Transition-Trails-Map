// ─────────────────────────────────────────────────────────────────────────────
// Content Items — production metadata for Content Studio items
//
// GET  /api/content-items/:id   — fetch production metadata (incl. selected_voice)
// PATCH /api/content-items/:id  — update production metadata fields
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { contentItemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

const VALID_VOICES = ["penny", "learner"] as const;
type VoiceChoice = (typeof VALID_VOICES)[number] | null;

// ── GET /content-items/:id ────────────────────────────────────────────────────
//
// Returns `rowExists: false` when no row is present so the client can
// distinguish "never saved" from "saved as null" — important for the one-time
// localStorage migration which must not overwrite a concurrent write.

router.get("/content-items/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.id, id));

    if (!rows.length) {
      res.json({ contentItem: { id, selectedVoice: null, rowExists: false } });
      return;
    }

    const row = rows[0]!;
    res.json({
      contentItem: {
        id: row.id,
        selectedVoice: row.selectedVoice ?? null,
        rowExists: true,
        updatedAt: row.updatedAt,
        updatedBy: row.updatedBy,
      },
    });
  } catch (err) {
    logger.error({ err, id }, "Failed to fetch content item");
    res.status(500).json({ error: "Failed to fetch content item" });
  }
});

// ── PATCH /content-items/:id ──────────────────────────────────────────────────
//
// ?migrateOnly=true  — INSERT ... ON CONFLICT DO NOTHING (safe one-time migration:
//   never overwrites an existing row written by another user).  Always returns the
//   authoritative DB value so the caller can detect whether migration was applied
//   or a concurrent write already owned the row.
//
// (default)          — Full upsert; represents an explicit user selection.

interface PatchBody {
  selectedVoice?: VoiceChoice;
}

router.patch("/content-items/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const body = req.body as PatchBody;

  // Validate selectedVoice when present
  if ("selectedVoice" in body) {
    const v = body.selectedVoice;
    if (v !== null && !VALID_VOICES.includes(v as (typeof VALID_VOICES)[number])) {
      res.status(400).json({
        error: `selectedVoice must be one of: ${VALID_VOICES.join(", ")}, or null`,
      });
      return;
    }
  }

  const migrateOnly = req.query["migrateOnly"] === "true";

  const updatedBy: string | null =
    (req.session as unknown as Record<string, unknown>)?.["googleEmail"] as string ?? null;

  const now = new Date();

  try {
    if (migrateOnly) {
      // Safe migration write: INSERT only if the row is absent.
      // A concurrent explicit write already present wins — we never overwrite it.
      await db
        .insert(contentItemsTable)
        .values({
          id,
          selectedVoice: body.selectedVoice ?? null,
          updatedAt: now,
          updatedBy,
        })
        .onConflictDoNothing();
    } else {
      // Explicit user selection — full upsert.
      await db
        .insert(contentItemsTable)
        .values({
          id,
          selectedVoice: body.selectedVoice ?? null,
          updatedAt: now,
          updatedBy,
        })
        .onConflictDoUpdate({
          target: contentItemsTable.id,
          set: {
            ...("selectedVoice" in body ? { selectedVoice: body.selectedVoice ?? null } : {}),
            updatedAt: now,
            updatedBy,
          },
        });
    }

    // Always return the authoritative DB value so the client can reconcile.
    const rows = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.id, id));

    if (!rows.length) {
      // migrateOnly + concurrent delete (extremely unlikely) — row still absent.
      res.json({ contentItem: { id, selectedVoice: null, rowExists: false } });
      return;
    }

    const row = rows[0]!;
    res.json({
      contentItem: {
        id: row.id,
        selectedVoice: row.selectedVoice ?? null,
        rowExists: true,
        updatedAt: row.updatedAt,
        updatedBy: row.updatedBy,
      },
    });
  } catch (err) {
    logger.error({ err, id }, "Failed to update content item");
    res.status(500).json({ error: "Failed to update content item" });
  }
});

export default router;
