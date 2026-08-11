ALTER TABLE "time_logs"
  ADD COLUMN "sf_object_type" text,
  ADD COLUMN "sf_object_id"   text,
  ADD COLUMN "sf_object_name" text,
  ADD COLUMN "work_date"      date,
  ADD COLUMN "notes"          text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_time_logs_sf_object"
  ON "time_logs" ("sf_object_type", "sf_object_id");
