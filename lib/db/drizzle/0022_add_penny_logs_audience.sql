-- Migration 0022: Add audience column to penny_logs
--
-- penny_logs was created in 0000 without the audience column.
-- The column was later added via drizzle-kit push but never recorded in a SQL
-- migration, causing fresh-database setups to miss it.
--
-- Null for rows written before this migration.

ALTER TABLE "penny_logs"
  ADD COLUMN IF NOT EXISTS "audience" text;
