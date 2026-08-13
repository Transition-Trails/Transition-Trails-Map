-- Migration 0018: Create session_logs table
-- Records coaching and office-hours session outcomes.

CREATE TABLE IF NOT EXISTS "session_logs" (
  "id"               serial    PRIMARY KEY NOT NULL,
  "session_type"     text      NOT NULL,
  "coach_name"       text,
  "coach_email"      text,
  "learner_name"     text,
  "sf_contact_id"    text,
  "trail_id"         text,
  "program_name"     text,
  "session_date"     text      NOT NULL,
  "duration_minutes" integer,
  "notes"            text,
  "outcome"          text,
  "created_at"       timestamp NOT NULL DEFAULT now()
);
