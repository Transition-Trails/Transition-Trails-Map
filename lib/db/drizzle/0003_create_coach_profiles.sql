CREATE TABLE IF NOT EXISTS "coach_profiles" (
"user_email" text PRIMARY KEY NOT NULL,
"coach_level" text,
"updated_at" timestamp DEFAULT now() NOT NULL
);
