import { Router } from "express";
import { db } from "@workspace/db";
import { promptTemplatesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAuth";

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

// POST /api/penny/prompt-templates — create one template (admin only)
// Approving a template is what makes it reachable by learners, so write
// access is restricted to admins at the route level rather than in the UI.
router.post("/penny/prompt-templates", requireAdmin, async (req, res): Promise<void> => {
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
router.post("/penny/prompt-templates/seed", requireAdmin, async (req, res): Promise<void> => {
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

// PATCH /api/penny/prompt-templates/:id — update one template (admin only)
//
// Self-approval rule: an admin who submitted a template for review cannot be
// the same admin who approves it.  reviewRequestedBy on the stored template
// holds the submitter's email.  This is enforced here, server-side, so the
// rule survives direct API calls regardless of what the UI renders.
router.patch("/penny/prompt-templates/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id      = String(req.params['id']);
    const updates = req.body as Record<string, unknown>;

    const [existing] = await db
      .select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    const existingData      = existing.data as Record<string, unknown>;
    const reviewRequestedBy = existingData["reviewRequestedBy"] as string | undefined;
    const isApproval        = updates["status"] === "Approved";

    if (isApproval && reviewRequestedBy && req.session?.sfEmail === reviewRequestedBy) {
      res.status(403).json({
        error: "Self-approval is not permitted — a different admin must approve templates you submitted for review.",
      });
      return;
    }

    const merged = { ...existingData, ...updates, id };
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
