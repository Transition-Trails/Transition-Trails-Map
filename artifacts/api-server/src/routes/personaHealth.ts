import { Router } from "express";
import { db } from "@workspace/db";
import { personaHealthDismissalsTable } from "@workspace/db/schema";

const router = Router();

// GET /api/admin/persona-health — return dismissed issues per persona
router.get("/admin/persona-health", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(personaHealthDismissalsTable);
    const dismissed: Record<string, string[]> = {};
    for (const row of rows) {
      try { dismissed[row.persona] = JSON.parse(row.dismissedIssues) as string[]; }
      catch { dismissed[row.persona] = []; }
    }
    res.json({ dismissed });
  } catch (err) {
    req.log.error(err, "Failed to fetch persona health dismissals");
    res.status(500).json({ error: "Failed to fetch persona health dismissals" });
  }
});

// PATCH /api/admin/persona-health/:persona — upsert dismissed issues for a persona
router.patch("/admin/persona-health/:persona", async (req, res): Promise<void> => {
  try {
    const persona = decodeURIComponent(req.params.persona);
    const { dismissedIssues } = req.body as { dismissedIssues: string[] };

    if (!Array.isArray(dismissedIssues)) {
      res.status(400).json({ error: "dismissedIssues must be a string array" });
      return;
    }

    const serialized = JSON.stringify(dismissedIssues);
    await db
      .insert(personaHealthDismissalsTable)
      .values({ persona, dismissedIssues: serialized, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: personaHealthDismissalsTable.persona,
        set: { dismissedIssues: serialized, updatedAt: new Date() },
      });

    res.json({ persona, dismissedIssues });
  } catch (err) {
    req.log.error(err, "Failed to update persona health dismissals");
    res.status(500).json({ error: "Failed to update persona health dismissals" });
  }
});

export default router;
