/**
 * assessmentScoring.ts
 *
 * Penny rubric-scoring service for scenario assessment items.
 *
 * Called fire-and-forget from the POST /assessments/sessions/:id/respond route
 * after the response is already inserted.  Errors are logged but never propagate
 * to the learner — the shell advances to the next item regardless.
 *
 * Rubric format (stored in assessment_items.rubric JSONB):
 *   {
 *     "criteria": [
 *       { "id": "accuracy",     "label": "Technical Accuracy", "description": "..." },
 *       { "id": "reasoning",    "label": "Clear Reasoning",    "description": "..." },
 *       { "id": "completeness", "label": "Completeness",       "description": "..." }
 *     ]
 *   }
 *
 * Score shape written to assessment_responses.rubric_scores JSONB:
 *   [
 *     { "id": "accuracy",     "pass": true,  "rationale": "One sentence." },
 *     { "id": "reasoning",    "pass": false, "rationale": "One sentence." },
 *     { "id": "completeness", "pass": true,  "rationale": "One sentence." }
 *   ]
 */

import { db } from "@workspace/db";
import { assessmentResponsesTable } from "@workspace/db/schema";
import { eq }                        from "drizzle-orm";
import { callLLM }                   from "./llm/index.js";
import { logger }                    from "./logger.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RubricCriterion {
  id:          string;
  label:       string;
  description: string;
}

export interface CriterionScore {
  id:        string;
  pass:      boolean;
  rationale: string;
}

// ── Rubric parsing ─────────────────────────────────────────────────────────────

function isRubricCriterion(v: unknown): v is RubricCriterion {
  return (
    typeof v === "object" && v !== null &&
    typeof (v as RubricCriterion).id          === "string" &&
    typeof (v as RubricCriterion).label       === "string" &&
    typeof (v as RubricCriterion).description === "string"
  );
}

export function parseRubricCriteria(raw: unknown): RubricCriterion[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as { criteria?: unknown };
  if (!Array.isArray(r.criteria)) return [];
  return r.criteria.filter(isRubricCriterion);
}

// ── Scoring prompt ─────────────────────────────────────────────────────────────

const SCORING_SYSTEM_PROMPT = `You are an objective rubric scorer for a Salesforce Administrator certification practice assessment.

You will receive:
  1. A scenario question.
  2. A learner's free-text response.
  3. A list of rubric criteria, each with an id, label, and description.

Evaluate the response against EACH criterion and return ONLY a valid JSON object — no markdown fences, no prose outside the JSON.

Required format:
{
  "scores": [
    { "id": "<criterion id>", "pass": true, "rationale": "One concise sentence explaining the verdict." },
    ...
  ]
}

Scoring guidelines:
- Mark pass: true if the response meaningfully addresses the criterion, even if imperfect.
- Mark pass: false if the criterion is absent, vague, or factually incorrect.
- Rationale must be one sentence, max 120 characters.
- Never penalise for missing details that were not implied by the question.
- Be strict on factual accuracy for Salesforce-specific concepts.`;

// ── JSON extraction helper ─────────────────────────────────────────────────────
//
// Gemini occasionally wraps JSON in markdown fences even when told not to.
// This strips them before parsing.

function extractJson(text: string): string {
  const stripped = text.trim();
  // Remove ```json ... ``` or ``` ... ``` fences
  const match = stripped.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1]!.trim() : stripped;
}

// ── Score validator ────────────────────────────────────────────────────────────

function isCriterionScore(v: unknown): v is CriterionScore {
  return (
    typeof v === "object" && v !== null &&
    typeof (v as CriterionScore).id        === "string" &&
    typeof (v as CriterionScore).pass      === "boolean" &&
    typeof (v as CriterionScore).rationale === "string"
  );
}

// ── Main scoring function ──────────────────────────────────────────────────────

/**
 * Score a scenario response against its rubric criteria using Gemini.
 *
 * Updates `assessment_responses.rubric_scores` in place.
 * Designed to be called fire-and-forget — all errors are caught and logged.
 */
export async function scoreScenarioResponse(
  responseId: number,
  question:   string,
  answer:     string,
  rubricRaw:  unknown,
): Promise<void> {
  const criteria = parseRubricCriteria(rubricRaw);
  if (criteria.length === 0) {
    logger.warn({ responseId }, "assessmentScoring: no parseable rubric criteria — skipping Penny scoring");
    return;
  }

  const criteriaBlock = criteria
    .map((c, i) => `${i + 1}. [${c.id}] ${c.label}: ${c.description}`)
    .join("\n");

  const userMessage = `Question: ${question}

Learner's response:
"""
${answer.slice(0, 2000)}
"""

Rubric criteria:
${criteriaBlock}

Return JSON only.`;

  let rawText: string;
  try {
    const llmResp = await callLLM("gemini", {
      systemPrompt:    SCORING_SYSTEM_PROMPT,
      history:         [],
      userMessage,
      maxOutputTokens: 512,
      temperature:     0.1,
    });
    rawText = llmResp.text;
  } catch (llmErr) {
    logger.warn({ llmErr, responseId }, "assessmentScoring: LLM call failed — rubric scores not recorded");
    return;
  }

  let scores: CriterionScore[];
  try {
    const jsonStr = extractJson(rawText);
    const parsed  = JSON.parse(jsonStr) as { scores?: unknown };
    if (!Array.isArray(parsed.scores)) throw new Error("scores is not an array");
    scores = parsed.scores.filter(isCriterionScore);
    if (scores.length === 0) throw new Error("no valid score objects in response");
  } catch (parseErr) {
    logger.warn(
      { parseErr, responseId, rawText: rawText.slice(0, 400) },
      "assessmentScoring: could not parse Penny score JSON — rubric scores not recorded",
    );
    return;
  }

  try {
    await db
      .update(assessmentResponsesTable)
      .set({ rubricScores: scores })
      .where(eq(assessmentResponsesTable.id, responseId));

    logger.info(
      { responseId, scoredCriteria: scores.length },
      "assessmentScoring: rubric scores persisted",
    );
  } catch (dbErr) {
    logger.warn({ dbErr, responseId }, "assessmentScoring: DB update failed — rubric scores lost");
  }
}
