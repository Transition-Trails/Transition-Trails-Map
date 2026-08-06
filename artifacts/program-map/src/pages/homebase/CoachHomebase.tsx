/**
 * CoachHomebase
 *
 * The daily working view for program coaches (Google-auth, audience="coach").
 * Rendered inside HomebaseShell — no Sidebar/Topbar/ContextBar.
 *
 * Layout:
 *   ─ Level header strip     (coach level label + name, top of main)
 *   ─ PennyPreparedBand      (draft items — collapsible, full width)
 *   ─ LogTimeRow             (always visible; secondary when Penny band has items)
 *   ─ ArtefactsCard          (always visible, full width, level-aware heading)
 *   ─ SquadGrid              (full width, collapsible)
 *   ─ 2-col grid:
 *       Left:  CoachCasesCard
 *       Right: CoachWeekCard
 *
 * Right People panel: CoachPeoplePanel (lead coach contact + protocol note)
 *
 * Coach level:
 *   Reads from session via useHomebaseAuth (coachLevel field, present once task
 *   #254 provisions SF coaching fields).  Falls back to 'associate' until then.
 */

import { HomebaseShell }      from "@/components/layout/HomebaseShell";
import { LogTimeRow }         from "@/components/homebase/LogTimeRow";
import { PennyPreparedBand }  from "@/components/homebase/PennyPreparedBand";
import { ArtefactsCard }      from "@/components/homebase/ArtefactsCard";
import { SquadGrid }          from "@/components/homebase/SquadGrid";
import { CoachCasesCard }     from "@/components/homebase/CoachCasesCard";
import { CoachWeekCard }      from "@/components/homebase/CoachWeekCard";
import { CoachPeoplePanel }   from "@/components/homebase/CoachPeoplePanel";
import {
  useCoachPennyPrepared,
  useCoachArtefacts,
  useCoachSquad,
  useCoachLead,
  useCoachCases,
  COACH_LEVEL_LABELS,
} from "@/hooks/useHomebaseCoach";
import type { CoachLevel }    from "@/hooks/useHomebaseCoach";
import type { HomebaseAudience } from "@/hooks/useHomebaseAuth";

// ── CoachHomebase (exported) ──────────────────────────────────────────────────

interface CoachHomebaseProps {
  audience:    HomebaseAudience;
  displayName: string;
  /** Falls back to 'associate' when absent (SF fields not yet provisioned). */
  coachLevel?: CoachLevel | null;
}

export default function CoachHomebase({
  audience,
  displayName,
  coachLevel: coachLevelProp,
}: CoachHomebaseProps) {
  // Default to 'associate' — the middle level — until SF fields are provisioned
  const coachLevel: CoachLevel = coachLevelProp ?? "associate";
  const levelLabel = COACH_LEVEL_LABELS[coachLevel];

  const pennyResult    = useCoachPennyPrepared();
  const artefactResult = useCoachArtefacts();
  const squadResult    = useCoachSquad();
  const leadResult     = useCoachLead();
  const casesResult    = useCoachCases();

  // Amber CTA rule: the first Penny-prepared approve button is the amber CTA.
  // When Penny band has items, LogTimeRow must be secondary (bordered outline).
  // When Penny band is empty, LogTimeRow is the primary (amber) CTA on the page.
  const pennyHasItems = (pennyResult.data?.items?.length ?? 0) > 0;

  const peoplePanel = (
    <CoachPeoplePanel
      leadState={leadResult.data}
      coachLevel={coachLevel}
    />
  );

  return (
    <HomebaseShell
      audience={audience}
      displayName={displayName}
      peoplePanel={peoplePanel}
    >
      <div className="flex flex-col gap-4 px-5 py-5 max-w-3xl mx-auto">

        {/* 1 — Level header strip */}
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground font-medium">
            {displayName
              ? `${displayName.split(" ")[0]}'s homebase`
              : "Your homebase"}
          </p>
          <span className="inline-flex items-center rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            {levelLabel}
          </span>
        </div>

        {/* 2 — Penny has prepared */}
        <PennyPreparedBand
          isLoading={pennyResult.isLoading}
          preparedState={pennyResult.data}
          error={pennyResult.error}
        />

        {/* 3 — Log time (secondary when Penny band has items; primary otherwise) */}
        <LogTimeRow
          audience={audience}
          defaultActivity="Squad coaching"
          buttonVariant={pennyHasItems ? "secondary" : "primary"}
        />

        {/* 4 — Artefacts (level-aware heading + CTA) */}
        <ArtefactsCard
          isLoading={artefactResult.isLoading}
          artefactsState={artefactResult.data}
          error={artefactResult.error}
          coachLevel={coachLevel}
        />

        {/* 5 — Squad */}
        <SquadGrid
          isLoading={squadResult.isLoading}
          squadState={squadResult.data}
          error={squadResult.error}
          coachLevel={coachLevel}
        />

        {/* 6 — Two-column grid: Cases + This week */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CoachCasesCard
            isLoading={casesResult.isLoading}
            casesState={casesResult.data}
            error={casesResult.error}
          />
          <CoachWeekCard />
        </div>
      </div>
    </HomebaseShell>
  );
}
