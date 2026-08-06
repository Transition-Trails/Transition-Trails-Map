CREATE TABLE "volunteer_profiles" (
	"user_email" text PRIMARY KEY NOT NULL,
	"monthly_commitment_hours" integer,
	"case_limit" integer,
	"specialty" text,
	"coordinator_slack_id" text,
	"coordinator_name" text,
	"volunteer_slack_channel" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
