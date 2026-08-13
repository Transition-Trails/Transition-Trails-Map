CREATE TABLE IF NOT EXISTS "time_logs" (
"id" serial PRIMARY KEY NOT NULL,
"user_email" text NOT NULL,
"audience" text NOT NULL,
"activity_label" text NOT NULL,
"hours" numeric(4, 2) NOT NULL,
"logged_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_time_logs_user_email_logged_at" ON "time_logs" USING btree ("user_email","logged_at");
