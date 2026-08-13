CREATE TABLE IF NOT EXISTS "user_preferences" (
  "user_email" text PRIMARY KEY NOT NULL,
  "prefs"      jsonb NOT NULL DEFAULT '{}',
  "updated_at" timestamp NOT NULL DEFAULT now()
);
