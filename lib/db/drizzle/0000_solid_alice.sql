CREATE TABLE "prompt_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_variables" (
	"id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_penny_configs" (
	"program_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'Not Planned' NOT NULL,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_role_owners" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text DEFAULT '' NOT NULL,
	"owner_email" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "penny_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text,
	"user_tier" text,
	"user_email" text,
	"user_message" text NOT NULL,
	"penny_response" text NOT NULL,
	"prompt_mode" text DEFAULT 'ask' NOT NULL,
	"model" text,
	"duration_ms" integer,
	"context_route" text,
	"sf_contact_id" text,
	"learner_name" text,
	"trail_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
