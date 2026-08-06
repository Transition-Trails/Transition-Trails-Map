/**
 * LearnerPeoplePanel
 *
 * Right-side People panel content for the Learner Homebase.
 *
 * When no coach is assigned: shows "Penny — your companion until a coach is assigned"
 * with an "Ask Penny" CTA.
 *
 * When a coach is assigned: shows coach name, next session time, Slack DM link,
 * and cohort channel.
 */

import { Sparkles, MessageSquare, Hash, Users, CalendarClock } from "lucide-react";
import type { CoachState } from "@/hooks/useHomebaseLearner";

// ── No-coach fallback ──────────────────────────────────────────────────────────

function PennyCompanion() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Header */}
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        Your Team
      </p>

      {/* Penny card */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Penny</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
            Your AI companion until a coach is assigned
          </p>
        </div>
      </div>

      {/* Ask Penny link — focus the PennyBar by dispatching a custom event */}
      <button
        onClick={() => {
          const bar = document.querySelector<HTMLInputElement>('[placeholder*="Ask Penny"]');
          bar?.focus();
        }}
        className="flex items-center gap-2 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/30 transition-colors"
      >
        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
        Ask Penny
      </button>

      <div className="border-t border-border pt-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          A coach will be matched once your program begins. You'll see their details here.
        </p>
      </div>
    </div>
  );
}

// ── Coach card ─────────────────────────────────────────────────────────────────

function CoachCard({ coach, cohortSlackChannel }: { coach: NonNullable<CoachState["coach"]>; cohortSlackChannel: string | null }) {
  const firstName = coach.name.split(" ")[0] ?? coach.name;

  const slackDmUrl = coach.slackUserId
    ? `https://slack.com/app_redirect?channel=${coach.slackUserId}`
    : null;

  const channelUrl = cohortSlackChannel
    ? `https://slack.com/app_redirect?channel=${cohortSlackChannel}`
    : null;

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Header */}
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        Your Team
      </p>

      {/* Coach identity */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{coach.name}</p>
          <p className="text-[12px] text-muted-foreground">Your coach</p>
        </div>
      </div>

      {/* Next session */}
      {coach.nextSession && (
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 bg-muted/20">
          <CalendarClock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Next session</p>
            <p className="text-sm text-foreground font-medium">
              {new Date(coach.nextSession).toLocaleDateString("en-US", {
                weekday: "short",
                month:   "short",
                day:     "numeric",
                hour:    "numeric",
                minute:  "2-digit",
              })}
            </p>
          </div>
        </div>
      )}

      {/* Slack DM */}
      {slackDmUrl ? (
        <a
          href={slackDmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/30 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
          Message {firstName} on Slack
        </a>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
          <MessageSquare className="w-3.5 h-3.5" />
          {coach.email}
        </div>
      )}

      {/* Cohort channel */}
      {channelUrl && cohortSlackChannel && (
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/30 transition-colors"
        >
          <Hash className="w-3.5 h-3.5 text-muted-foreground" />
          #{cohortSlackChannel.replace(/^#/, "")}
        </a>
      )}
    </div>
  );
}

// ── LearnerPeoplePanel (exported) ─────────────────────────────────────────────

interface LearnerPeoplePanelProps {
  coachState: CoachState | undefined;
}

export function LearnerPeoplePanel({ coachState }: LearnerPeoplePanelProps) {
  if (!coachState || !coachState.coach) {
    return <PennyCompanion />;
  }

  return (
    <CoachCard
      coach={coachState.coach}
      cohortSlackChannel={coachState.cohortSlackChannel}
    />
  );
}
