import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { moduleDraftsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Validate Salesforce-style IDs (15 or 18 alphanumeric chars) ───────────────

function isSfId(id: string): boolean {
  return /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(id);
}

// ── GET /lms/drafts/:nodeId ───────────────────────────────────────────────────

router.get("/lms/drafts/:nodeId", async (req: Request, res: Response): Promise<void> => {
  const { nodeId } = req.params as { nodeId: string };
  if (!nodeId || !isSfId(nodeId)) {
    res.status(400).json({ error: "Invalid node ID" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(moduleDraftsTable)
      .where(eq(moduleDraftsTable.nodeId, nodeId));

    if (!rows.length) {
      res.json({ draft: null });
      return;
    }

    res.json({ draft: rows[0] });
  } catch (err) {
    logger.error({ err }, "Failed to fetch module draft");
    res.status(500).json({ error: "Failed to fetch draft" });
  }
});

// ── PUT /lms/drafts/:nodeId ───────────────────────────────────────────────────

interface DraftBody {
  nodeKind?: string;
  sections?: Record<string, string>;
  nodeStatus?: string;
}

const VALID_KINDS   = ["course", "module"] as const;
const VALID_STATUSES = ["draft", "review", "published"] as const;

router.put("/lms/drafts/:nodeId", async (req: Request, res: Response): Promise<void> => {
  const { nodeId } = req.params as { nodeId: string };
  if (!nodeId || !isSfId(nodeId)) {
    res.status(400).json({ error: "Invalid node ID" });
    return;
  }

  const body = req.body as DraftBody;
  const { nodeKind, sections, nodeStatus } = body;

  if (!nodeKind || !VALID_KINDS.includes(nodeKind as typeof VALID_KINDS[number])) {
    res.status(400).json({ error: `nodeKind must be one of: ${VALID_KINDS.join(", ")}` });
    return;
  }
  if (nodeStatus && !VALID_STATUSES.includes(nodeStatus as typeof VALID_STATUSES[number])) {
    res.status(400).json({ error: `nodeStatus must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }
  if (sections && typeof sections !== "object") {
    res.status(400).json({ error: "sections must be an object" });
    return;
  }

  // Identify the caller from the session (best-effort; null if not available)
  const savedBy: string | null =
    ((req.session as unknown as Record<string, unknown>)?.["userEmail"] as string | undefined) ?? null;

  const now = new Date();

  try {
    await db
      .insert(moduleDraftsTable)
      .values({
        nodeId,
        nodeKind,
        sections: sections ?? {},
        nodeStatus: nodeStatus ?? "draft",
        savedAt: now,
        savedBy,
      })
      .onConflictDoUpdate({
        target: moduleDraftsTable.nodeId,
        set: {
          sections:   sections ?? {},
          nodeStatus: nodeStatus ?? "draft",
          savedAt:    now,
          savedBy,
        },
      });

    const rows = await db
      .select()
      .from(moduleDraftsTable)
      .where(eq(moduleDraftsTable.nodeId, nodeId));

    res.json({ draft: rows[0] ?? null });
  } catch (err) {
    logger.error({ err }, "Failed to save module draft");
    res.status(500).json({ error: "Failed to save draft" });
  }
});

export default router;
