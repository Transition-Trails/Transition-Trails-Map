-- Migration 0017: Create persona_health_dismissals table
-- Stores per-persona dismissed health issues so admins don't see cleared alerts again.

CREATE TABLE IF NOT EXISTS "persona_health_dismissals" (
  "persona"           text      PRIMARY KEY NOT NULL,
  "dismissed_issues"  text      NOT NULL DEFAULT '[]',
  "updated_at"        timestamp NOT NULL DEFAULT now()
);
