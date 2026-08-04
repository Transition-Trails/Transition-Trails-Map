import { Router } from "express";
import { db } from "@workspace/db";
import { promptVariablesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAuth";

const router = Router();

// GET /api/penny/prompt-variables — list all
router.get("/penny/prompt-variables", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(promptVariablesTable)
      .orderBy(promptVariablesTable.createdAt);
    res.json({ variables: rows.map(r => r.data) });
  } catch (err) {
    req.log.error(err, "Failed to list prompt variables");
    res.status(500).json({ error: "Failed to fetch variables" });
  }
});

// POST /api/penny/prompt-variables — create one
router.post("/penny/prompt-variables", async (req, res): Promise<void> => {
  try {
    const variable = req.body as Record<string, unknown>;
    if (!variable["id"] || !variable["name"]) {
      res.status(400).json({ error: "id and name are required" });
      return;
    }
    await db
      .insert(promptVariablesTable)
      .values({ id: variable["id"] as string, data: variable })
      .onConflictDoNothing();
    res.status(201).json({ variable });
  } catch (err) {
    req.log.error(err, "Failed to create prompt variable");
    res.status(500).json({ error: "Failed to create variable" });
  }
});

// POST /api/penny/prompt-variables/seed — bulk upsert (idempotent)
router.post("/penny/prompt-variables/seed", requireAdmin, async (req, res): Promise<void> => {
  try {
    const { variables } = req.body as { variables: Record<string, unknown>[] };
    if (!Array.isArray(variables)) {
      res.status(400).json({ error: "variables array required" });
      return;
    }
    let seeded = 0;
    for (const v of variables) {
      const result = await db
        .insert(promptVariablesTable)
        .values({ id: v["id"] as string, data: v })
        .onConflictDoNothing();
      if (result.rowCount && result.rowCount > 0) seeded++;
    }
    res.json({ seeded, total: variables.length });
  } catch (err) {
    req.log.error(err, "Failed to seed prompt variables");
    res.status(500).json({ error: "Failed to seed variables" });
  }
});

// PATCH /api/penny/prompt-variables/:id — partial merge update
router.patch("/penny/prompt-variables/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body as Record<string, unknown>;

    const [existing] = await db
      .select()
      .from(promptVariablesTable)
      .where(eq(promptVariablesTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Variable not found" });
      return;
    }

    const merged = { ...(existing.data as Record<string, unknown>), ...updates, id };
    await db
      .update(promptVariablesTable)
      .set({ data: merged, updatedAt: new Date() })
      .where(eq(promptVariablesTable.id, id));

    res.json({ variable: merged });
  } catch (err) {
    req.log.error(err, "Failed to update prompt variable");
    res.status(500).json({ error: "Failed to update variable" });
  }
});

export default router;
