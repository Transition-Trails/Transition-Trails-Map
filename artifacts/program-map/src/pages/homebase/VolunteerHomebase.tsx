/**
 * VolunteerHomebase
 *
 * The daily working view for external volunteers (Google-auth, audience="volunteer").
 * Rendered inside HomebaseShell — no Sidebar/Topbar/ContextBar.
 *
 * Layout:
 *   ─ ThisMonthBand     (hours + merch progress, collapsible, full width)
 *   ─ LogTimeRow        (always visible — primary amber CTA, the one amber CTA on the page)
 *   ─ WaysToHelpCard    (unassigned queue, full width)
 *   ─ SquadGrid-like    (specialty card + record process)
 *   ─ 2-col grid:
 *       Left:  VolunteerCasesCard · ShareablesCard
 *       Right: GrowthCard
 *
 * Right People panel: VolunteerPeoplePanel (coordinator contact)
 *
 * Amber CTA rule: LogTimeRow is primary (amber). All other buttons are secondary,
 * disabled, or linked — no competing amber CTAs.
 */

import { Link } from "wouter";
import { FileText } from "lucide-react";
import { HomebaseShell }        from "@/components/layout/HomebaseShell";
import { LogTimeRow }           from "@/components/homebase/LogTimeRow";
import { ThisMonthBand }        from "@/components/homebase/ThisMonthBand";
import { VolunteerCasesCard }   from "@/components/homebase/VolunteerCasesCard";
import { WaysToHelpCard }       from "@/components/homebase/WaysToHelpCard";
import { GrowthCard }           from "@/components/homebase/GrowthCard";
import { ShareablesCard }       from "@/components/homebase/ShareablesCard";
import { VolunteerPeoplePanel } from "@/components/homebase/VolunteerPeoplePanel";
import {
  useVolunteerMonth,
  useVolunteerCases,
  useVolunteerQueue,
  useVolunteerGrowth,
  useVolunteerShareables,
  useVolunteerCoordinator,
  useAssignQueueCase,
} from "@/hooks/useHomebaseVolunteer";
import type { HomebaseAudience } from "@/hooks/useHomebaseAuth";

// ── Specialty card ─────────────────────────────────────────────────────────────

function SpecialtyCard({ specialty }: { specialty: string | null }) {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-wide mb-1">
        Your specialty
      </p>
      {specialty ? (
        <>
          <p className="text-sm font-semibold text-sky-900 leading-snug">{specialty}</p>
          <p className="text-[12px] text-sky-700 mt-2 leading-relaxed">
            Tell Kim if that's changed — it controls which queue cases appear first for you.
          </p>
        </>
      ) : (
        <p className="text-[12px] text-sky-700 leading-relaxed">
          Your specialty hasn't been set yet. Let your coordinator know what types of cases you're best at.
        </p>
      )}
    </div>
  );
}

// ── Record a process card ──────────────────────────────────────────────────────

function RecordProcessCard() {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">Record a process</p>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
            Capture a step-by-step walkthrough to share with your team.
          </p>
        </div>
      </div>
      <Link
        href="/knowledge/procedures"
        className="mt-3 flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted/30 transition-colors"
      >
        Open Procedure Builder
      </Link>
    </div>
  );
}

// ── VolunteerHomebase (exported) ──────────────────────────────────────────────

interface VolunteerHomebaseProps {
  audience:    HomebaseAudience;
  displayName: string;
}

export default function VolunteerHomebase({ audience, displayName }: VolunteerHomebaseProps) {
  const monthResult       = useVolunteerMonth();
  const casesResult       = useVolunteerCases();
  const queueResult       = useVolunteerQueue();
  const growthResult      = useVolunteerGrowth();
  const shareablesResult  = useVolunteerShareables();
  const coordinatorResult = useVolunteerCoordinator();
  const assignMutation    = useAssignQueueCase();

  // Read specialty from month endpoint (includes profile data)
  const specialty = monthResult.data?.specialty ?? null;

  // Count of cases already assigned to this volunteer (for limit enforcement)
  const currentCaseCount = casesResult.data?.cases?.length ?? 0;

  async function handleAssign(caseId: string): Promise<void> {
    await assignMutation.mutateAsync(caseId);
  }

  const peoplePanel = (
    <VolunteerPeoplePanel coordinatorState={coordinatorResult.data} />
  );

  return (
    <HomebaseShell
      audience={audience}
      displayName={displayName}
      peoplePanel={peoplePanel}
    >
      <div className="flex flex-col gap-4 px-5 py-5 max-w-3xl mx-auto">

        {/* 1 — This month band */}
        <ThisMonthBand
          isLoading={monthResult.isLoading}
          monthState={monthResult.data}
          error={monthResult.error}
        />

        {/* 2 — Log time (primary amber CTA — the only amber CTA on the page) */}
        <LogTimeRow
          audience={audience}
          defaultActivity={specialty ?? undefined}
          buttonVariant="primary"
        />

        {/* 3 — Ways to help (unassigned queue) */}
        <WaysToHelpCard
          isLoading={queueResult.isLoading}
          queueState={queueResult.data}
          error={queueResult.error}
          currentCaseCount={currentCaseCount}
          onAssign={handleAssign}
        />

        {/* 4 — Specialty card + Record a process */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SpecialtyCard specialty={specialty} />
          <RecordProcessCard />
        </div>

        {/* 5 — Two-column grid: [Cases + Shareables] | [Growth] */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <VolunteerCasesCard
              isLoading={casesResult.isLoading}
              casesState={casesResult.data}
              error={casesResult.error}
            />
            <ShareablesCard
              isLoading={shareablesResult.isLoading}
              shareablesState={shareablesResult.data}
              error={shareablesResult.error}
            />
          </div>
          <GrowthCard
            isLoading={growthResult.isLoading}
            growthState={growthResult.data}
            error={growthResult.error}
          />
        </div>
      </div>
    </HomebaseShell>
  );
}
