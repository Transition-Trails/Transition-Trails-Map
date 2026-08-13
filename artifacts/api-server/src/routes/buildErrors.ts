/**
 * buildErrors.ts
 *
 * GET /api/build-errors — returns the last 10 auto-created build-error cases
 * for display on the Admin → Phase 1 Readiness page.
 *
 * Access: requireAdmin (trailosadmin group or superadmin).
 */

import { Router } from 'express';
import { desc }   from 'drizzle-orm';
import { db }                  from '@workspace/db';
import { buildErrorLogsTable } from '@workspace/db/schema';
import { requireAdmin }        from '../middlewares/requireAuth.js';

const router = Router();

router.get('/build-errors', requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(buildErrorLogsTable)
      .orderBy(desc(buildErrorLogsTable.createdAt))
      .limit(10);

    res.json({ buildErrors: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch build error logs.' });
    return;
  }
});

export default router;
