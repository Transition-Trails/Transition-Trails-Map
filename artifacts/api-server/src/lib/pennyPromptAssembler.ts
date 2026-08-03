/**
 * pennyPromptAssembler.ts
 *
 * Single module responsible for building the complete Penny system prompt.
 * The prompt is composed of up to seven layers; each layer is an independently
 * testable exported function.  Every layer is optional: a layer with no data
 * returns null and contributes nothing to the final prompt.  The Gemini call
 * receives only the finished string and has no knowledge of how it was built.
 *
 * Layer order:
 *  1. identity        — who Penny is, voice, guardrails, operational rules
 *  2. trail-context   — trail persona, phase, tone (Penny_Trail_Config__c)
 *  3. learner-context — current focus, blockers, confidence, week (Contact)
 *  4. knowledge       — retrieved sources passed in by the caller
 *  5. active-quest    — current quest state (Penny_Quest_Submission__c — empty)
 *  6. career-review   — most recent career review (Penny_Career_Review__c — empty)
 *  7. memory-window   — recent conversation summary (no persistence yet — empty)
 *
 * Adding a future layer or filling an empty one:
 *  • Add/extend the layer's function signature and body.
 *  • Add its input to AssemblerInput if needed.
 *  • Pass it in the candidates array in assemblePrompt().
 *  • The Gemini call needs no change.
 */

import type { LearnerContext, TrailConfig } from "../types/salesforce.js";

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * The five audiences Penny serves.
 * Only 'internal' is implemented today; the other four fall back to the
 * internal identity until their content is written in follow-up tasks.
 */
export type PennyAudience = 'internal' | 'learner' | 'coach' | 'client' | 'public';

/**
 * Canonical names for the seven layers.
 * Returned in AssemblerResult.layersPresent so callers can see exactly what
 * was assembled — useful for the session info panel and debugging.
 */
export type LayerName =
  | 'identity'
  | 'trail-context'
  | 'learner-context'
  | 'knowledge'
  | 'active-quest'
  | 'career-review'
  | 'memory-window';

/** A single retrieved knowledge chunk passed in by the caller. */
export interface RetrievedChunk {
  name:       string;
  category:   string;
  sourceType: string;
  snippet:    string;
  relevance:  number;
}

/**
 * Everything the assembler needs to build the prompt.
 * Every field is optional — callers pass what they have; absent fields cause
 * the corresponding layer to be silently skipped.
 */
export interface AssemblerInput {
  /** Which audience is asking. Default: 'internal'. */
  audience?:        PennyAudience;
  /** Platform tier / role for the internal audience (superadmin/admin/poweruser/everyday). */
  role?:            string;
  /** Trail configuration record — layer 2 source. */
  trailConfig?:     TrailConfig | null;
  /** Learner contact context — layer 3 source. */
  learnerContext?:  LearnerContext | null;
  /** Retrieved knowledge chunks — layer 4 source. */
  retrievedChunks?: RetrievedChunk[];
}

/** What the assembler returns to the caller. */
export interface AssemblerResult {
  /** The finished system prompt string, ready to pass to Gemini as-is. */
  systemPrompt:  string;
  /** Names of layers that contributed content (empty/null layers are absent). */
  layersPresent: LayerName[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1 — System Identity
// ─────────────────────────────────────────────────────────────────────────────
//
// The text that defines who Penny is.  Today only the internal-staff identity
// is implemented.  The other four audiences are named placeholders: when their
// content is written, replace the null constant and remove the fallthrough.

const IDENTITY_INTERNAL = `You are Penny, AI Chief of Staff for Transition Trails Academy — a career development and professional transition training organisation. Your role is to assist the Transition Trails team with day-to-day operations inside their Trail OS platform.

Domains you support:
- Program operations: cohort scheduling, delivery status, phase tracking via the RESOLVE framework (Recognize, Explore, Select, Outline, Launch, Verify, Evolve)
- Learner journey: enrollment, coaching activity, trail quest progress, capstone milestones, assessment results
- Knowledge management: source documents, curriculum standards, blueprint updates, content relationships
- Salesforce intelligence: Account and Contact data, Program, Cohort, and Service Delivery objects (NPSP + PMM), Opportunity pipeline
- Slack coordination: channel activity, learner communication, team signals, bot alerts
- Operations: demand intake, change requests, resource allocation, health scores, program health metrics
- Administration: integration setup, secrets audit, readiness dashboards, user access

Communication rules:
- Be concise and direct. 2–4 sentences unless a longer answer is clearly needed.
- Use the team's language: programs, cohorts, trail quests, learners, capstones, blueprints, RESOLVE phases.
- If you don't have live data for a specific question, say so honestly and suggest where to find it in Trail OS.
- ALWAYS include the exact Trail OS route path when directing someone to take an action or find something. Write the route on its own line prefixed with "→" (e.g. "→ /admin/integrations" or "→ /collaboration/slack"). Users can click these paths to navigate directly. Use these routes: /admin/integrations (integration setup & secrets), /admin/integrations/google-auth (Google OAuth), /admin/integrations/secrets (secrets audit), /admin/people-access (user roles & access), /admin/phase1-readiness (readiness dashboard), /operations/health (health indicators), /operations/demand (demand & cases), /operations/scorecards (scorecards), /penny (Penny command center), /penny/prompts (prompt studio), /penny/capabilities (capability registry), /penny/learners (learner list), /penny/trail-configs (trail configs), /knowledge/sources (knowledge sources), /collaboration/slack (Slack integration), /collaboration/gmail (Gmail), /collaboration/calendar-live (Calendar), /program (program map & curriculum).
- Never fabricate data. If uncertain, say so.`;

// Named placeholders for the four unimplemented audiences.
// Each is null until the content is written.  The switch in layer1Identity
// falls through to internal when it sees null here.
const IDENTITY_LEARNER: string | null = null; // TODO: warm coaching-companion voice + coaching guardrails
const IDENTITY_COACH:   string | null = null; // TODO: coach-facilitation voice
const IDENTITY_CLIENT:  string | null = null; // TODO: client-facing executive voice
const IDENTITY_PUBLIC:  string | null = null; // TODO: public-facing guide voice

/** Role-aware addendum appended to the internal identity only. */
function internalRoleContext(role?: string): string {
  switch (role) {
    case 'superadmin':
      return '\n\nThe current user is a Super Admin — they have full platform access including secrets management, integration configuration, user role assignment, and all admin tools. Tailor responses to platform-level decisions and configuration concerns.';
    case 'admin':
      return '\n\nThe current user is an Admin — they can manage programs, knowledge sources, Penny capabilities, and team operations but cannot change integrations or user roles. Tailor responses to team operations and program management.';
    case 'poweruser':
      return '\n\nThe current user is a Penny Power User — they use advanced Penny capabilities (coaching, resume review, deep analytics) and can author watch rules. Tailor responses to learning, coaching, and career development topics.';
    case 'everyday':
      return '\n\nThe current user is an Everyday User — a learner focused on their trail, next actions, and program progress. Keep responses clear, encouraging, and jargon-free. Avoid surfacing admin details.';
    default:
      return '';
  }
}

/**
 * Layer 1: System Identity.
 *
 * Always returns a non-empty string — the identity is the minimum viable
 * prompt, so this layer is always present in layersPresent.
 *
 * Unimplemented audiences fall back to the internal identity (role context
 * still applies when the final text is the internal one).
 */
export function layer1Identity(audience: PennyAudience = 'internal', role?: string): string {
  switch (audience) {
    case 'learner':
      if (IDENTITY_LEARNER !== null) return IDENTITY_LEARNER;
      break; // fall through to internal
    case 'coach':
      if (IDENTITY_COACH !== null) return IDENTITY_COACH;
      break;
    case 'client':
      if (IDENTITY_CLIENT !== null) return IDENTITY_CLIENT;
      break;
    case 'public':
      if (IDENTITY_PUBLIC !== null) return IDENTITY_PUBLIC;
      break;
    case 'internal':
    default:
      break;
  }
  // Internal identity (also the current fallback for all unimplemented audiences)
  return IDENTITY_INTERNAL + internalRoleContext(role);
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2 — Trail Context
// ─────────────────────────────────────────────────────────────────────────────
//
// Trail-specific Penny persona, tone, focal points, and special instructions
// drawn from Penny_Trail_Config__c (4 records deployed, all accessible).
// Returns null when no trail config is available.

const TRAIL_PERSONAS: Record<string, string> = {
  'guided-trail':
    'You are TrailPenny. Your learner is actively job searching. Career readiness, stakeholder communication, and translating program experience to résumé language are your highest priorities.',
  'explorer-journey':
    'You are Explorer Penny. Your learner is building foundational Salesforce knowledge. Meet them where they are. Build confidence before complexity.',
  'trail-of-mastery':
    'You are MasteryPenny. Your learner is doing real client project work. Push them to think like a consultant, not just an admin.',
  'community-alumni':
    'You are AlumniPenny. Your learner has completed the program. Focus on job search momentum, portfolio storytelling, and interview preparation.',
};

/**
 * Layer 2: Trail Context.
 *
 * Returns a formatted block describing the active trail persona and
 * Salesforce trail configuration, or null if trailConfig is absent.
 */
export function layer2TrailContext(trailConfig?: TrailConfig | null): string | null {
  if (!trailConfig) return null;

  const lines: string[] = ['TRAIL CONTEXT:'];
  const persona = TRAIL_PERSONAS[trailConfig.trailId];
  if (persona)                          lines.push(persona);
  lines.push(`Trail: ${trailConfig.trailId}`);
  if (trailConfig.name)                 lines.push(`Config name: ${trailConfig.name}`);
  if (trailConfig.pennyRole)            lines.push(`Penny's role: ${trailConfig.pennyRole}`);
  if (trailConfig.tone)                 lines.push(`Tone: ${trailConfig.tone}`);
  if (trailConfig.focalPoints)          lines.push(`Focal points: ${trailConfig.focalPoints}`);
  if (trailConfig.specialInstructions)  lines.push(`Special instructions: ${trailConfig.specialInstructions}`);
  if (!trailConfig.isActive)            lines.push('NOTE: This trail is marked inactive — proceed with caution.');

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 3 — Learner Context
// ─────────────────────────────────────────────────────────────────────────────
//
// Live learner state from the Salesforce Contact record (28 custom fields
// accessible).  Returns null when no learner context is provided.

/**
 * Layer 3: Learner Context.
 *
 * Returns a formatted block with the learner's current focus, blockers,
 * confidence score, and other progress fields, or null if learnerContext
 * is absent.  Null field values are omitted rather than printed as "null".
 */
export function layer3LearnerContext(learnerContext?: LearnerContext | null): string | null {
  if (!learnerContext) return null;

  const lines: string[] = ['LEARNER CONTEXT:'];
  lines.push(`Name: ${learnerContext.firstName} ${learnerContext.lastName}`);
  if (learnerContext.pennyTrail !== null)      lines.push(`Trail: ${learnerContext.pennyTrail}`);
  if (learnerContext.currentPhase !== null)    lines.push(`Current phase: ${learnerContext.currentPhase}`);
  if (learnerContext.currentGoal !== null)     lines.push(`Current goal: ${learnerContext.currentGoal}`);
  if (learnerContext.currentBlockers !== null) lines.push(`Current blockers: ${learnerContext.currentBlockers}`);
  if (learnerContext.coachingTone !== null)    lines.push(`Coaching tone: ${learnerContext.coachingTone}`);
  if (learnerContext.confidenceScore !== null) lines.push(`Confidence score: ${learnerContext.confidenceScore}/10`);
  if (learnerContext.skillScore !== null)      lines.push(`Skill score: ${learnerContext.skillScore}/10`);
  if (learnerContext.sprintWeek !== null)      lines.push(`Sprint week: ${learnerContext.sprintWeek}`);
  if (!learnerContext.onboardingComplete)      lines.push('NOTE: Onboarding not yet complete — prioritise orientation over content.');

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 4 — Knowledge
// ─────────────────────────────────────────────────────────────────────────────
//
// Retrieved sources passed in by the caller.  The retrieval route handles the
// fetch; the assembler only formats them.  Returns null when no chunks.

/**
 * Layer 4: Knowledge.
 *
 * Formats retrieved knowledge chunks into a grounding section, or returns
 * null if the chunks array is empty or absent.
 */
export function layer4Knowledge(chunks?: RetrievedChunk[]): string | null {
  if (!chunks || chunks.length === 0) return null;
  const body = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.name} (${c.category} · ${c.sourceType})]\n${c.snippet}`)
    .join('\n\n');
  return `---\nRetrieved Knowledge (ground your answer in these sources where relevant):\n\n${body}\n---`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 5 — Active Quest  (empty — extension point)
// ─────────────────────────────────────────────────────────────────────────────
//
// Penny_Quest_Submission__c is deployed and accessible but currently has 0 rows.
// Returns null until quest data is wired in a follow-up.

/**
 * Layer 5: Active Quest.
 *
 * Returns null today (Penny_Quest_Submission__c is empty).
 * To fill this layer: pass a quest submission record and format it here.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function layer5ActiveQuest(_questData?: unknown): string | null {
  return null; // TODO: format active quest when Penny_Quest_Submission__c has data
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 6 — Career Review  (empty — extension point)
// ─────────────────────────────────────────────────────────────────────────────
//
// Penny_Career_Review__c is deployed and accessible but currently has 0 rows.
// Returns null until career review data is wired in a follow-up.

/**
 * Layer 6: Career Review.
 *
 * Returns null today (Penny_Career_Review__c is empty).
 * To fill this layer: pass a career review record and format it here.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function layer6CareerReview(_reviewData?: unknown): string | null {
  return null; // TODO: format latest career review when Penny_Career_Review__c has data
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 7 — Memory Window  (empty — extension point)
// ─────────────────────────────────────────────────────────────────────────────
//
// A summary of recent conversation context.  The Salesforce interaction log
// exists but is not yet used as a summarised memory window; no persistence
// is in place.  Returns null until a memory summary is available.

/**
 * Layer 7: Memory Window.
 *
 * Returns null today (no conversation persistence).
 * To fill this layer: pass a memory summary string and return it here.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function layer7MemoryWindow(_memorySummary?: unknown): string | null {
  return null; // TODO: inject recent conversation summary when persistence is available
}

// ─────────────────────────────────────────────────────────────────────────────
// Main assembler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assembles the final Penny system prompt from up to seven layers.
 *
 * Each layer is called with whatever data is available in `input`.  Layers
 * returning null are silently skipped and absent from layersPresent.  The
 * Gemini call receives only `systemPrompt` — it has no knowledge of how the
 * prompt was built.
 *
 * Current layer content status:
 *   identity       — ✅ internal identity always present; other audiences fall back
 *   trail-context  — ✅ present when trailConfig is provided
 *   learner-context — ✅ present when learnerContext is provided
 *   knowledge      — ✅ present when retrievedChunks is non-empty
 *   active-quest   — ⬜ empty (Penny_Quest_Submission__c has no data yet)
 *   career-review  — ⬜ empty (Penny_Career_Review__c has no data yet)
 *   memory-window  — ⬜ empty (no conversation persistence yet)
 */
export function assemblePrompt(input: AssemblerInput): AssemblerResult {
  const audience = input.audience ?? 'internal';

  const candidates: Array<{ name: LayerName; content: string | null }> = [
    { name: 'identity',        content: layer1Identity(audience, input.role) },
    { name: 'trail-context',   content: layer2TrailContext(input.trailConfig) },
    { name: 'learner-context', content: layer3LearnerContext(input.learnerContext) },
    { name: 'knowledge',       content: layer4Knowledge(input.retrievedChunks) },
    { name: 'active-quest',    content: layer5ActiveQuest() },
    { name: 'career-review',   content: layer6CareerReview() },
    { name: 'memory-window',   content: layer7MemoryWindow() },
  ];

  const present = candidates.filter(
    (c): c is { name: LayerName; content: string } => c.content !== null,
  );

  return {
    systemPrompt:  present.map(c => c.content).join('\n\n'),
    layersPresent: present.map(c => c.name),
  };
}
