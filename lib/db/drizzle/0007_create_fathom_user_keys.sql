CREATE TABLE IF NOT EXISTS "fathom_user_keys" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_email" text NOT NULL,
  "api_key" text NOT NULL,
  "connected_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "fathom_user_keys_user_email_unique" UNIQUE("user_email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fathom_user_keys_user_email_idx" ON "fathom_user_keys" ("user_email");
