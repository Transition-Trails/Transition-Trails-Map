-- Migration 0013: Add rubric scoring + extended coach-signal columns to assessment_responses
--
-- rubric_scores       — Penny's per-criterion pass/fail + rationale (JSON array)
-- longest_insertion   — length of the longest single paste in the textarea (chars)
-- paste_ratio         — share of submitted text that was pasted  (0.000–1.000)
-- screen_shared       — whether the learner granted screen capture for this item

ALTER TABLE assessment_responses
  ADD COLUMN IF NOT EXISTS rubric_scores      JSONB,
  ADD COLUMN IF NOT EXISTS longest_insertion  INTEGER,
  ADD COLUMN IF NOT EXISTS paste_ratio        NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS screen_shared      BOOLEAN;
