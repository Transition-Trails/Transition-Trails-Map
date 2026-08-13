-- Migration 0012: Skill Assessment tables for v1.7 Skill Assessment feature

CREATE TABLE IF NOT EXISTS "skill_assessment_sessions" (
  "id"            serial PRIMARY KEY NOT NULL,
  "learner_email" text NOT NULL,
  "instance"      text NOT NULL DEFAULT 'now',
  "status"        text NOT NULL DEFAULT 'active',
  "started_at"    timestamp NOT NULL DEFAULT now(),
  "completed_at"  timestamp
);

CREATE INDEX IF NOT EXISTS "idx_sas_learner_instance"
  ON "skill_assessment_sessions" ("learner_email", "instance");

CREATE TABLE IF NOT EXISTS "assessment_items" (
  "id"             serial PRIMARY KEY NOT NULL,
  "domain"         text NOT NULL,
  "domain_label"   text NOT NULL,
  "domain_weight"  numeric(4,3) NOT NULL,
  "item_type"      text NOT NULL DEFAULT 'mc',
  "question"       text NOT NULL,
  "options"        jsonb,
  "correct_option" text,
  "rubric"         jsonb,
  "explanation"    text,
  "weight"         numeric(4,2) NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "idx_ai_domain" ON "assessment_items" ("domain");

CREATE TABLE IF NOT EXISTS "assessment_responses" (
  "id"               serial PRIMARY KEY NOT NULL,
  "session_id"       integer NOT NULL REFERENCES "skill_assessment_sessions"("id") ON DELETE CASCADE,
  "item_id"          integer NOT NULL REFERENCES "assessment_items"("id"),
  "answer"           text,
  "confidence"       text,
  "score"            numeric(4,3),
  "is_correct"       boolean,
  "keystroke_count"  integer,
  "paste_count"      integer,
  "focus_time_ms"    integer,
  "responded_at"     timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ar_session"
  ON "assessment_responses" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_ar_session_item"
  ON "assessment_responses" ("session_id", "item_id");
