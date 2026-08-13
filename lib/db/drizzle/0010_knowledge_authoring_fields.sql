ALTER TABLE "knowledge_articles"
  ADD COLUMN IF NOT EXISTS "data_category_group" text,
  ADD COLUMN IF NOT EXISTS "data_category" text,
  ADD COLUMN IF NOT EXISTS "sf_review_case_id" text,
  ADD COLUMN IF NOT EXISTS "sf_review_case_number" text,
  ADD COLUMN IF NOT EXISTS "reviewer_email" text,
  ADD COLUMN IF NOT EXISTS "recording_url" text,
  ADD COLUMN IF NOT EXISTS "submitted_at" timestamp;
