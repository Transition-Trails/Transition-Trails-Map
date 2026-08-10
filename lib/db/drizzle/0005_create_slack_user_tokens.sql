CREATE TABLE "slack_user_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_email" text NOT NULL,
  "access_token" text NOT NULL,
  "slack_user_id" text NOT NULL,
  "team_id" text NOT NULL,
  "team_name" text,
  "scopes" text,
  "connected_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "slack_user_tokens_user_email_unique" UNIQUE("user_email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slack_user_tokens_user_email_idx" ON "slack_user_tokens" ("user_email");
