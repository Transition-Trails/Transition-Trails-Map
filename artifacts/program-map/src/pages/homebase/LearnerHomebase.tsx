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
 *
 * Right People panel: LearnerPeoplePanel (coach or Penny fallback)
 */

import { Link } from "wouter";
import { BookOpen, Video } from "lucide-react";
import { HomebaseShell }       from "@/components/layout/HomebaseShell";
import { LogTimeRow }          from "@/components/homebase/LogTimeRow";
import { CairnBand }           from "@/components/homebase/CairnBand";
import { LearnerCasesCard }    from "@/components/homebase/LearnerCasesCard";
import { WeekItemsCard }       from "@/components/homebase/WeekItemsCard";
import { LearnerPeoplePanel }  from "@/components/homebase/LearnerPeoplePanel";
import {
  useHomebaseLearnerQuest,
  useHomebaseLearnerCases,
  useHomebaseLearnerWeek,
  useHomebaseLearnerCoach,
} from "@/hooks/useHomebaseLearner";
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

// ── LearnerHomebase (exported) ────────────────────────────────────────────────

interface LearnerHomebaseProps {
  audience:    HomebaseAudience;
  displayName: string;
}

export default function LearnerHomebase({ audience, displayName }: LearnerHomebaseProps) {
  const questResult = useHomebaseLearnerQuest();
  const casesResult = useHomebaseLearnerCases();
  const weekResult  = useHomebaseLearnerWeek();
  const coachResult = useHomebaseLearnerCoach();

  const stoneSet = questResult.data?.stoneSet ?? false;

  const peoplePanel = (
    <LearnerPeoplePanel coachState={coachResult.data} />
  );

  return (
    <HomebaseShell
      audience={audience}
      displayName={displayName}
      peoplePanel={peoplePanel}
    >
      <div className="flex flex-col gap-4 px-5 py-5 max-w-3xl mx-auto">
        {/* 1 — Today's Trail Quest */}
        <CairnBand
          isLoading={questResult.isLoading}
          questState={questResult.data}
          error={questResult.error}
        />

        {/* 2 — Log Time (always visible; secondary button when stone not set) */}
        <LogTimeRow
          audience={audience}
          buttonVariant={stoneSet ? "primary" : "secondary"}
        />

        {/* 3 — Two-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left column */}
          <div className="flex flex-col gap-4">
            <LearnerCasesCard
              isLoading={casesResult.isLoading}
              casesState={casesResult.data}
              error={casesResult.error}
            />
            <DecisionLogCard />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            <WeekItemsCard
              isLoading={weekResult.isLoading}
              weekState={weekResult.data}
              error={weekResult.error}
            />
            <RecordDemoCard />
          </div>
        </div>
      </div>
    </HomebaseShell>
  );
}
