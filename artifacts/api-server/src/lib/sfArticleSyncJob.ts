/**
 * sfArticleSyncJob.ts
 *
 * Background job that periodically syncs Salesforce Knowledge articles into the
 * local knowledge_articles table.  The sync interval (default 6 hours) and the
 * enabled flag are configurable from Admin → Integrations and persisted in the
 * sf_sync_settings DB table.
 *
 * Pattern mirrors errorAlertJob.ts: setTimeout-based so the interval is
 * re-read from the DB on every tick, letting admins change it without a restart.
 */

import { db } from "@workspace/db";
import { sfSyncSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SyncResult {
  total:    number;
  created:  number;
  updated:  number;
  skipped:  number;
  errors:   number;
  syncedAt: string;
}

export type SyncFn = (log: {
  warn:  (obj: object | string, msg?: string) => void;
  info:  (obj: object | string, msg?: string) => void;
  error: (obj: object | string, msg?: string) => void;
}) => Promise<SyncResult>;

// ── In-memory state ───────────────────────────────────────────────────────────

let lastSyncAt:     string | null    = null;
let lastSyncResult: SyncResult | null = null;
let isJobRunning    = false;
let timeoutHandle:  ReturnType<typeof setTimeout> | null = null;

// ── DB settings read ──────────────────────────────────────────────────────────

interface SyncSettings {
  enabled:       boolean;
  intervalHours: number;
}

const DEFAULT_SETTINGS: SyncSettings = { enabled: true, intervalHours: 6 };

async function getSyncSettings(): Promise<SyncSettings> {
  try {
    const rows = await db
      .select({ enabled: sfSyncSettingsTable.enabled, intervalHours: sfSyncSettingsTable.intervalHours })
      .from(sfSyncSettingsTable)
      .where(eq(sfSyncSettingsTable.id, "default"))
      .limit(1);

    if (rows.length > 0 && rows[0]) {
      return { enabled: rows[0].enabled, intervalHours: rows[0].intervalHours };
    }
  } catch (err) {
    logger.warn({ err }, "sfArticleSyncJob: could not read sf_sync_settings from DB — using defaults");
  }
  return DEFAULT_SETTINGS;
}

// ── Core tick ─────────────────────────────────────────────────────────────────

let syncFnRef: SyncFn | null = null;

async function tick(): Promise<void> {
  const { enabled, intervalHours } = await getSyncSettings();
  const intervalMs = intervalHours * 60 * 60 * 1000;

  if (enabled && syncFnRef) {
    logger.info("sfArticleSyncJob: running scheduled SF article sync");
    try {
      const result = await syncFnRef(logger);
      lastSyncAt     = result.syncedAt;
      lastSyncResult = result;
      logger.info(
        { total: result.total, created: result.created, updated: result.updated, skipped: result.skipped, errors: result.errors },
        "sfArticleSyncJob: sync complete",
      );
    } catch (err) {
      logger.error({ err }, "sfArticleSyncJob: sync threw unexpectedly");
    }
  }

  // Schedule next tick, re-reading interval from DB each time.
  if (isJobRunning) {
    timeoutHandle = setTimeout(() => void tick(), intervalMs);
    if (timeoutHandle.unref) timeoutHandle.unref();
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start the background SF article sync job.
 * @param syncFn  The function that performs the actual sync.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function startSfArticleSyncJob(syncFn: SyncFn): void {
  if (isJobRunning) return;
  syncFnRef    = syncFn;
  isJobRunning = true;

  // Kick off after the first interval rather than immediately (avoids a race
  // at startup when DB connections aren't fully warm yet).
  getSyncSettings()
    .then(({ enabled, intervalHours }) => {
      const intervalMs = intervalHours * 60 * 60 * 1000;
      logger.info(
        { enabled, intervalHours, nextSyncIn: `${intervalHours}h` },
        "sfArticleSyncJob: started — first run in " + intervalHours + "h",
      );
      if (isJobRunning) {
        timeoutHandle = setTimeout(() => void tick(), intervalMs);
        if (timeoutHandle.unref) timeoutHandle.unref();
      }
    })
    .catch((err) => {
      logger.warn({ err }, "sfArticleSyncJob: could not read initial settings — using 6h default");
      if (isJobRunning) {
        timeoutHandle = setTimeout(() => void tick(), 6 * 60 * 60 * 1000);
        if (timeoutHandle.unref) timeoutHandle.unref();
      }
    });
}

/**
 * Stop the background job (for tests / graceful shutdown).
 */
export function stopSfArticleSyncJob(): void {
  isJobRunning = false;
  if (timeoutHandle !== null) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
}

/**
 * Return a snapshot of the current job state.
 * Called by the GET /api/knowledge/sf-sync-status endpoint.
 */
export interface SyncJobStatus {
  lastSyncAt:     string | null;
  lastSyncResult: SyncResult | null;
  jobRunning:     boolean;
}

export function getSyncJobStatus(): SyncJobStatus {
  return { lastSyncAt, lastSyncResult, jobRunning: isJobRunning };
}

/**
 * Record a sync result from an external call (e.g. manual sync route).
 * This way the last-sync timestamp stays current even for on-demand syncs.
 */
export function recordManualSync(result: SyncResult): void {
  lastSyncAt     = result.syncedAt;
  lastSyncResult = result;
}
