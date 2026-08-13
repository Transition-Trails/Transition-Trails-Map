#!/bin/bash
# apply-migrations.sh
#
# Applies pending SQL migrations from lib/db/drizzle/ to the database.
#
# HOW IT WORKS
# ------------
# A tracking table (_trail_migrations) records every successfully applied file.
# On each run the script skips files already in the ledger and applies the rest.
# Every migration file uses CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
# CREATE INDEX IF NOT EXISTS / INSERT … ON CONFLICT DO NOTHING throughout, so
# re-running a file on a database that already has its objects is always a no-op.
#
# This means the same script works correctly in all three environments:
#
#   Fresh database (new contributor clone, CI):
#     Ledger is empty; all migrations run and create every table, column,
#     index, and seed row in order.
#
#   Existing database (current dev, staging set up via drizzle-kit push):
#     Ledger is empty on first run; every migration file is executed — but
#     because all files use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
#     ON CONFLICT DO NOTHING throughout, each statement is a harmless no-op
#     for objects that already exist.  After the run all files are in the
#     ledger, so subsequent runs skip them immediately.
#
#   Partially-migrated database (any schema subset that already exists):
#     Files whose objects are all present execute as no-ops and are ledgered.
#     Files with missing objects create only the absent pieces (IF NOT EXISTS
#     adds nothing that exists; ADD COLUMN IF NOT EXISTS adds only missing
#     columns).  After the run the database is complete.
#
# Each file is applied inside a BEGIN/COMMIT transaction with ON_ERROR_STOP=1.
# A failure stops the script immediately, rolls back the partial migration, and
# leaves the ledger row unwritten so the file is retried on the next run.
#
# USAGE
# -----
#   bash scripts/apply-migrations.sh
#   (DATABASE_URL is inherited from the environment automatically in Replit)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="$(cd "$SCRIPT_DIR/../lib/db/drizzle" && pwd)"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Cannot apply migrations." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Step 1: ensure the migration ledger table exists
# ---------------------------------------------------------------------------
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "
CREATE TABLE IF NOT EXISTS _trail_migrations (
  filename   TEXT      PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);"

# ---------------------------------------------------------------------------
# Step 2: apply any migration file not yet recorded in the ledger
# ---------------------------------------------------------------------------
shopt -s nullglob
SQL_FILES=("$MIGRATIONS_DIR"/[0-9]*.sql)
shopt -u nullglob

applied=0
skipped=0

for SQL_FILE in "${SQL_FILES[@]}"; do
  BASENAME="$(basename "$SQL_FILE")"

  IN_LEDGER=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -tAq \
    -c "SELECT COUNT(*) FROM _trail_migrations WHERE filename = '${BASENAME}';")

  if [ "$IN_LEDGER" -gt 0 ]; then
    skipped=$((skipped + 1))
    continue
  fi

  echo "[apply-migrations] Applying $BASENAME..."

  # Run inside a transaction so that a failure rolls back the partial migration
  # AND leaves the ledger row unwritten, making the file retriable next run.
  TMP=$(mktemp /tmp/trail-migration-XXXXXX.sql)
  # shellcheck disable=SC2064
  trap "rm -f '$TMP'" EXIT

  {
    printf 'BEGIN;\n'
    cat "$SQL_FILE"
    printf '\n'
    printf "INSERT INTO _trail_migrations (filename) VALUES ('%s');\n" "$BASENAME"
    printf 'COMMIT;\n'
  } > "$TMP"

  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$TMP"
  rm -f "$TMP"
  trap - EXIT

  applied=$((applied + 1))
  echo "[apply-migrations]   Applied $BASENAME"
done

echo "[apply-migrations] Done. $applied applied, $skipped skipped."
