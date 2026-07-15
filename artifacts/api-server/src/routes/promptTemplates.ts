import { Router } from "express";
import { db } from "@workspace/db";
import { promptTemplatesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/penny/prompt-templates — list all, ordered by creation date
router.get("/penny/prompt-templates", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(promptTemplatesTable)
      .orderBy(promptTemplatesTable.createdAt);
    res.json({ templates: rows.map(r => r.data) });
  } catch (err) {
    req.log.error(err, "Failed to list prompt templates");
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// POST /api/penny/prompt-templates — create one template
router.post("/penny/prompt-templates", async (req, res): Promise<void> => {
  try {
    const template = req.body as Record<string, unknown>;
    if (!template["id"] || !template["name"]) {
      res.status(400).json({ error: "id and name are required" });
      return;
    }
    await db
      .insert(promptTemplatesTable)
      .values({ id: template["id"] as string, data: template })
      .onConflictDoNothing();
    res.status(201).json({ template });
  } catch (err) {
    req.log.error(err, "Failed to create prompt template");
    res.status(500).json({ error: "Failed to create template" });
  }
});

// POST /api/penny/prompt-templates/seed — bulk upsert (idempotent, skips existing)
router.post("/penny/prompt-templates/seed", async (req, res): Promise<void> => {
  try {
    const { templates } = req.body as { templates: Record<string, unknown>[] };
    if (!Array.isArray(templates)) {
      res.status(400).json({ error: "templates array required" });
      return;
    }
    let seeded = 0;
    for (const t of templates) {
      const result = await db
        .insert(promptTemplatesTable)
        .values({ id: t["id"] as string, data: t })
        .onConflictDoNothing();
      if (result.rowCount && result.rowCount > 0) seeded++;
    }
    res.json({ seeded, total: templates.length });
  } catch (err) {
    req.log.error(err, "Failed to seed prompt templates");
    res.status(500).json({ error: "Failed to seed templates" });
  }
});

// PATCH /api/penny/prompt-templates/:id — update one template (partial merge)
router.patch("/penny/prompt-templates/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body as Record<string, unknown>;

    const [existing] = await db
      .select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    const merged = { ...(existing.data as Record<string, unknown>), ...updates, id };
    await db
      .update(promptTemplatesTable)
      .set({ data: merged, updatedAt: new Date() })
      .where(eq(promptTemplatesTable.id, id));

    res.json({ template: merged });
  } catch (err) {
    req.log.error(err, "Failed to update prompt template");
    res.status(500).json({ error: "Failed to update template" });
  }
});

export default router;
