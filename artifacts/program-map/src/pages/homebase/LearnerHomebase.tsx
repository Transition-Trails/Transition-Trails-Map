/**
 * LearnerHomebase
 *
 * The daily working view for program participants (Google-auth learners).
 * Rendered inside HomebaseShell — no Sidebar/Topbar/ContextBar.
 *
 * Layout:
 *   ─ CairnBand        (Today's Trail Quest — collapsible, full width)
 *   ─ LogTimeRow       (always visible; secondary style when stone not yet set)
 *   ─ 2-col grid:
 *       Left:  LearnerCasesCard · DecisionLogCard
 *       Right: WeekItemsCard    · RecordDemoCard
 *   ─ TeamCard         (coach contact / Penny fallback — full width, bottom)
 *
 * Right rail: SlimSlackPanel (wired in HomebaseShell)
 */

import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, Video, Sparkles, MessageSquare, Users, CalendarClock, Hash, Plus } from "lucide-react";
import { HomebaseShell }       from "@/components/layout/HomebaseShell";
import { SubmitCaseDrawer }    from "@/components/homebase/SubmitCaseDrawer";
import { LogTimeRow }          from "@/components/homebase/LogTimeRow";
import { CairnBand }           from "@/components/homebase/CairnBand";
import { LearnerCasesCard }    from "@/components/homebase/LearnerCasesCard";
import { WeekItemsCard }       from "@/components/homebase/WeekItemsCard";
import {
  useHomebaseLearnerQuest,
  useHomebaseLearnerCases,
  useHomebaseLearnerWeek,
  useHomebaseLearnerCoach,
} from "@/hooks/useHomebaseLearner";
import type { CoachState }      from "@/hooks/useHomebaseLearner";
import type { HomebaseAudience } from "@/hooks/useHomebaseAuth";

// ── Bottom link cards ──────────────────────────────────────────────────────────

function DecisionLogCard() {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">Decision Log</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">Track your key decisions</p>
        </div>
      </div>
      <Link
        href="/knowledge"
        className="mt-3 flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted/30 transition-colors"
      >
        New entry
      </Link>
    </div>
  );
}

function RecordDemoCard() {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
          <Video className="w-4 h-4 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">Record Your Demo</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">Capture a step-by-step walk-through</p>
        </div>
      </div>
      <Link
        href="/knowledge"
        className="mt-3 flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted/30 transition-colors"
      >
        Start recording
      </Link>
    </div>
  );
}

// ── Inline team card (replaces right People panel) ────────────────────────────

function TeamCard({ coachState }: { coachState: CoachState | undefined }) {
  const coach             = coachState?.coach;
  const cohortSlackChannel = coachState?.cohortSlackChannel ?? null;

  if (!coach) {
    return (
      <div className="rounded-xl border border-border bg-white p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Penny — your companion</p>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
            A coach will be matched once your program begins. Ask Penny anything in the bar above.
          </p>
        </div>
      </div>
    );
  }

  const firstName  = coach.name.split(" ")[0] ?? coach.name;
  const slackDmUrl = coach.slackUserId
    ? `https://slack.com/app_redirect?channel=${coach.slackUserId}`
    : null;
  const channelUrl = cohortSlackChannel
    ? `https://slack.com/app_redirect?channel=${cohortSlackChannel}`
    : null;

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Your Team
      </p>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{coach.name}</p>
          <p className="text-[12px] text-muted-foreground">Your coach</p>
        </div>
        {coach.nextSession && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground bg-muted/20 flex-shrink-0">
            <CalendarClock className="w-3 h-3" />
            {new Date(coach.nextSession).toLocaleDateString("en-US", {
              weekday: "short", month: "short", day: "numeric",
            })}
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {slackDmUrl ? (
          <a
            href={slackDmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted/30 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            Message {firstName}
          </a>
        ) : (
          <span className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5" />
            {coach.email}
          </span>
        )}
        {channelUrl && cohortSlackChannel && (
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted/30 transition-colors"
          >
            <Hash className="w-3.5 h-3.5 text-muted-foreground" />
            #{cohortSlackChannel.replace(/^#/, "")}
          </a>
        )}
      </div>
    </div>
  );
}

// ── LearnerHomebase (exported) ────────────────────────────────────────────────

interface LearnerHomebaseProps {
  audience:    HomebaseAudience;
  displayName: string;
}

export default function LearnerHomebase({ audience, displayName }: LearnerHomebaseProps) {
  const [showSubmitCase, setShowSubmitCase] = useState(false);
  const questResult = useHomebaseLearnerQuest();
  const casesResult = useHomebaseLearnerCases();
  const weekResult  = useHomebaseLearnerWeek();
  const coachResult = useHomebaseLearnerCoach();

  const stoneSet = questResult.data?.stoneSet ?? false;

  return (
    <HomebaseShell
      audience={audience}
      displayName={displayName}
    >
      <div className="flex flex-col gap-4 px-5 py-5">
        {/* 0 — Header strip */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground font-medium">
            {displayName ? `${displayName.split(" ")[0]}'s homebase` : "Your homebase"}
          </p>
          <button
            type="button"
            onClick={() => setShowSubmitCase(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Submit a Case
          </button>
        </div>

        {/* 1 — Today's Trail Quest */}
        <CairnBand
          isLoading={questResult.isLoading}
          questState={questResult.data}
          error={questResult.error}
        />

        {/* 2 — Log Time */}
        <LogTimeRow
          audience={audience}
          buttonVariant={stoneSet ? "primary" : "secondary"}
        />

        {/* 3 — Two-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <LearnerCasesCard
              isLoading={casesResult.isLoading}
              casesState={casesResult.data}
              error={casesResult.error}
            />
            <DecisionLogCard />
          </div>
          <div className="flex flex-col gap-4">
            <WeekItemsCard
              isLoading={weekResult.isLoading}
              weekState={weekResult.data}
              error={weekResult.error}
            />
            <RecordDemoCard />
          </div>
        </div>

        {/* 4 — Team card (coach or Penny fallback) */}
        <TeamCard coachState={coachResult.data} />
      </div>

      <SubmitCaseDrawer
        open={showSubmitCase}
        onClose={() => setShowSubmitCase(false)}
      />
    </HomebaseShell>
  );
}
