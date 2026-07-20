import { Router } from "express";
import { db } from "@workspace/db";
import { platformRoleOwnersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/admin/role-owners — return owner assignments for all role IDs
router.get("/admin/role-owners", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(platformRoleOwnersTable);
    const map: Record<string, { owner: string; ownerEmail: string }> = {};
    for (const row of rows) {
      map[row.id] = { owner: row.owner, ownerEmail: row.ownerEmail };
    }
    res.json({ owners: map });
  } catch (err) {
    req.log.error(err, "Failed to fetch role owners");
    res.status(500).json({ error: "Failed to fetch role owners" });
  }
});

// PATCH /api/admin/role-owners/:id — upsert owner for a single role
router.patch("/admin/role-owners/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { owner, ownerEmail } = req.body as { owner: string; ownerEmail: string };

    if (typeof owner !== "string" || typeof ownerEmail !== "string") {
      res.status(400).json({ error: "owner and ownerEmail strings are required" });
      return;
    }

    await db
      .insert(platformRoleOwnersTable)
      .values({ id, owner, ownerEmail, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: platformRoleOwnersTable.id,
        set: { owner, ownerEmail, updatedAt: new Date() },
      });

    res.json({ id, owner, ownerEmail });
  } catch (err) {
    req.log.error(err, "Failed to update role owner");
    res.status(500).json({ error: "Failed to update role owner" });
  }
});

export default router;
