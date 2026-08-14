import app from "./app";
import { logger } from "./lib/logger";
import { patchLoggerForBuildErrors } from "./lib/buildErrorReporter.js";
import { startErrorAlertJob } from "./lib/errorAlertJob.js";
import { startSfArticleSyncJob } from "./lib/sfArticleSyncJob.js";
import { runSfArticleSync } from "./routes/knowledge.js";
import { pool } from "@workspace/db";

// Patch logger.error BEFORE any routes or background tasks run.
// After this point, every logger.error({ err: ... }) call anywhere in the process
// automatically triggers build-error case creation for qualifying errors.
patchLoggerForBuildErrors();

/**
 * Ensure the build_error_logs table exists.
 *
 * Uses raw SQL (not drizzle-kit push) so it runs idempotently at startup
 * without requiring an interactive TTY.  ADD COLUMN IF NOT EXISTS guards
 * against columns that were added in later schema versions.
 */
async function ensureBuildErrorLogsTable(): Promise<void> {
  // Create table if it does not yet exist (idempotent across deployments).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "build_error_logs" (
      "id"              serial        PRIMARY KEY,
      "fingerprint"     text          NOT NULL,
      "dedup_key"       text          NOT NULL DEFAULT '',
      "error_name"      text          NOT NULL,
      "error_message"   text          NOT NULL,
      "stack_trace"     text,
      "sf_case_id"      text,
      "sf_case_number"  text,
      "sf_org_base_url" text,
      "resolution_plan" text,
      "resolved_at"     timestamp,
      "created_at"      timestamp     NOT NULL DEFAULT NOW()
    );
  `);
  // Belt-and-suspenders: add any column that may be missing from older deployments.
  await pool.query(`
    ALTER TABLE "build_error_logs"
      ADD COLUMN IF NOT EXISTS "dedup_key"       text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "sf_org_base_url" text,
      ADD COLUMN IF NOT EXISTS "resolution_plan"  text,
      ADD COLUMN IF NOT EXISTS "resolved_at"      timestamp;
  `);
  // Add the unique dedup constraint if not already present.
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'build_error_logs_dedup_key_unique'
      ) THEN
        ALTER TABLE "build_error_logs"
          ADD CONSTRAINT "build_error_logs_dedup_key_unique" UNIQUE ("dedup_key");
      END IF;
    END$$;
  `);
}

async function ensureSfSyncSettingsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "sf_sync_settings" (
      "id"             text        PRIMARY KEY DEFAULT 'default',
      "enabled"        boolean     NOT NULL DEFAULT true,
      "interval_hours" integer     NOT NULL DEFAULT 6,
      "updated_by"     text,
      "updated_at"     timestamp   NOT NULL DEFAULT NOW()
    );
  `);
  // Belt-and-suspenders: add columns that may be missing from older deployments.
  await pool.query(`
    ALTER TABLE "sf_sync_settings"
      ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp;
  `);
}

async function ensureSessionTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid"    varchar        NOT NULL COLLATE "default",
      "sess"   json           NOT NULL,
      "expire" timestamp(6)   NOT NULL
    );
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
      ) THEN
        ALTER TABLE "session" ADD CONSTRAINT "session_pkey"
          PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
      END IF;
    END$$;
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `);
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

Promise.all([ensureSessionTable(), ensureBuildErrorLogsTable(), ensureSfSyncSettingsTable()])
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
      startErrorAlertJob();
      startSfArticleSyncJob(runSfArticleSync);
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to ensure required tables — aborting startup");
    process.exit(1);
  });
