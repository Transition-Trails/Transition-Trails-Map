/**
 * auditLog.ts
 *
 * Shared helper for writing to trail_os_audit_log.
 * Wraps the Drizzle insert with a catch-and-log so callers never have to
 * handle DB errors themselves.  The write is always fire-and-forget safe.
 */

import { db } from '@workspace/db';
import { trailOsAuditLogTable } from '@workspace/db/schema';
import type { InsertAuditLog } from '@workspace/db/schema';
import { logger } from './logger.js';

/**
 * Write a single audit log row.
 * Catches and logs any DB error — callers can safely call without error handling.
 */
export async function insertAuditEvent(row: InsertAuditLog): Promise<void> {
  try {
    await db.insert(trailOsAuditLogTable).values(row);
  } catch (err) {
    logger.error({ err }, 'auditLog: failed to write audit event');
  }
}
