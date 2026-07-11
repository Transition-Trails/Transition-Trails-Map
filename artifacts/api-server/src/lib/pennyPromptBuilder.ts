import type { LearnerContext, TrailConfig, InteractionLogRecord } from "../types/salesforce.js";

// ── Trail persona routing ─────────────────────────────────────────────────────

const TRAIL_PERSONAS: Record<string, string> = {
  "guided-trail":
    "You are TrailPenny. Your learner is actively job searching. Career readiness, stakeholder communication, and translating program experience to resume language are your highest priorities.",
  "explorer-journey":
    "You are Explorer Penny. Your learner is building foundational Salesforce knowledge. Meet them where they are. Build confidence before complexity.",
  "trail-of-mastery":
    "You are MasteryPenny. Your learner is doing real client project work. Push them to think like a consultant, not just an admin.",
  "community-alumni":
    "You are AlumniPenny. Your learner has completed the program. Focus on job search momentum, portfolio storytelling, and interview preparation.",
};

function getTrailPersona(trailId: string): string {
  return TRAIL_PERSONAS[trailId] ?? "You are Penny in general guidance mode.";
}

// ── Layer assemblers ──────────────────────────────────────────────────────────

function buildIdentityLayer(): string {
  return "You are Penny, Transition Trails Academy's AI coaching companion. Your purpose is to help learners grow — not by telling them what to do, but by asking the right questions at the right time. You are warm, present, and direct. You think before you speak. You never fabricate information. If you do not know something, you say so.";
}

function buildPersonaLayer(trailConfig: TrailConfig): string {
  const lines: string[] = ["CURRENT TRAIL PERSONA:"];
  lines.push(getTrailPersona(trailConfig.trailId));

  lines.push(`Trail: ${trailConfig.trailId}`);
  if (trailConfig.pennyRole)          lines.push(`Role: ${trailConfig.pennyRole}`);
  if (trailConfig.tone)               lines.push(`Tone: ${trailConfig.tone}`);
  if (trailConfig.focalPoints)        lines.push(`Focal Points: ${trailConfig.focalPoints}`);
  if (trailConfig.specialInstructions) lines.push(`Special Instructions: ${trailConfig.specialInstructions}`);

  if (!trailConfig.isActive) {
    lines.push("NOTE: This trail configuration is marked inactive. Proceed with caution.");
  }

  return lines.join("\n");
}

function buildLearnerContextLayer(learnerContext: LearnerContext): string {
  const lines: string[] = ["LEARNER CONTEXT:"];

  lines.push(`Name: ${learnerContext.firstName} ${learnerContext.lastName}`);
  if (learnerContext.currentPhase !== null)    lines.push(`Current Phase: ${learnerContext.currentPhase}`);
  if (learnerContext.currentGoal !== null)     lines.push(`Current Goal: ${learnerContext.currentGoal}`);
  if (learnerContext.currentBlockers !== null) lines.push(`Current Blockers: ${learnerContext.currentBlockers}`);
  if (learnerContext.coachingTone !== null)    lines.push(`Coaching Tone: ${learnerContext.coachingTone}`);
  if (learnerContext.confidenceScore !== null) lines.push(`Confidence Score: ${learnerContext.confidenceScore}/10`);
  if (learnerContext.skillScore !== null)      lines.push(`Skill Score: ${learnerContext.skillScore}/10`);
  if (learnerContext.sprintWeek !== null)      lines.push(`Sprint Week: ${learnerContext.sprintWeek}`);

  lines.push(`Onboarding Complete: ${learnerContext.onboardingComplete}`);
  if (!learnerContext.onboardingComplete) {
    lines.push("NOTE: This learner has not completed onboarding. Prioritize orientation over content.");
  }

  return lines.join("\n");
}

function buildInteractionHistoryLayer(recentInteractions: InteractionLogRecord[]): string {
  if (recentInteractions.length === 0) {
    return "CONVERSATION HISTORY: No previous interactions recorded.";
  }

  // Cap at 5, show most recent last (chronological order)
  const capped = recentInteractions.slice(0, 5).reverse();
  const count  = capped.length;

  const lines: string[] = [`RECENT CONVERSATION HISTORY (last ${count} interaction${count === 1 ? "" : "s"}):`];
  for (const interaction of capped) {
    lines.push(`[Learner]: ${interaction.userMessage}`);
    lines.push(`[Penny]: ${interaction.pennyResponse}`);
    lines.push("---");
  }

  return lines.join("\n");
}

function buildGuardrailsLayer(): string {
  return `GUARDRAILS:
- Never fabricate credentials, certifications, job offers, or program outcomes
- Never make promises about employment or salary on behalf of Transition Trails
- If a learner asks about something outside your coaching role, acknowledge it briefly and redirect to their current goal
- Always ask before advising — use Socratic questioning as your default mode
- Never reproduce content from resumes or LinkedIn profiles verbatim — coach the learner to improve their own words
- If a learner appears distressed, acknowledge their feelings first before any coaching content`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildPennySystemPrompt(
  learnerContext: LearnerContext,
  trailConfig: TrailConfig,
  recentInteractions: InteractionLogRecord[]
): string {
  return [
    buildIdentityLayer(),
    buildPersonaLayer(trailConfig),
    buildLearnerContextLayer(learnerContext),
    buildInteractionHistoryLayer(recentInteractions),
    buildGuardrailsLayer(),
  ].join("\n\n");
}
