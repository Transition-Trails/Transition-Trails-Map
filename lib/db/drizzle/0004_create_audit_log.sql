CREATE TABLE "trail_os_audit_log" (
"id" serial PRIMARY KEY NOT NULL,
"event_type" text NOT NULL,
"actor_email" text NOT NULL,
"target_email" text,
"audience" text,
"ip_address" text,
"metadata" jsonb,
"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trail_os_audit_log_actor_email_idx" ON "trail_os_audit_log" ("actor_email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trail_os_audit_log_event_type_idx" ON "trail_os_audit_log" ("event_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trail_os_audit_log_created_at_idx" ON "trail_os_audit_log" ("created_at" DESC);
