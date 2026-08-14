/**
 * CoachHomebase
 *
 * The daily working view for program coaches (Google-auth, audience="coach").
 * Rendered inside HomebaseShell — no Sidebar/Topbar/ContextBar.
 *
 * Layout:
 *   ─ Level header strip
 *   ─ PennyPreparedBand  (fixed, not sortable)
 *   ─ LogTimeRow         (fixed, not sortable)
 *   ─ Sortable card stack:
 *       ArtifactsCard | SquadGrid | TodayTasksCard
 *       CoachCasesCard | CoachWeekCard | LeadTeamCard
 *
 * Cards support drag-to-reorder and collapse/expand.
 * Both preferences persist in localStorage under the "coach-homebase" prefix.
 *
 * Right rail: SlimSlackPanel (wired in HomebaseShell)
 */

import { useState, useCallback } from "react";
import {
  Folder,
  Users,
  CheckSquare,
  BookOpen,
  CalendarDays,
  UserCheck,
  ClipboardCheck,
  Shield,
  MessageSquare,
  Hash,
  Plus,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { HomebaseShell }      from "@/components/layout/HomebaseShell";
import { LogTimeRow }         from "@/components/homebase/LogTimeRow";
import { PennyPreparedBand }  from "@/components/homebase/PennyPreparedBand";
import { ArtifactsCard }      from "@/components/homebase/ArtifactsCard";
import { SquadGrid }          from "@/components/homebase/SquadGrid";
import { CoachCasesCard }     from "@/components/homebase/CoachCasesCard";
import { CoachWeekCard }      from "@/components/homebase/CoachWeekCard";
import { TodayTasksCard }     from "@/components/homebase/TodayTasksCard";
import { SubmitCaseDrawer }      from "@/components/homebase/SubmitCaseDrawer";
import { SortableCard }          from "@/components/homebase/SortableCard";
import { CoachAssessmentCard }   from "@/components/homebase/CoachAssessmentCard";
import { useHomebaseLayout }     from "@/hooks/useHomebaseLayout";
import {
  useCoachPennyPrepared,
  useCoachArtifacts,
  useCoachSquad,
  useCoachLead,
  useCoachCases,
  COACH_LEVEL_LABELS,
} from "@/hooks/useHomebaseCoach";
import type { LeadState, CoachLevel } from "@/hooks/useHomebaseCoach";
import type { HomebaseAudience }      from "@/hooks/useHomebaseAuth";

// ── Coach card IDs and metadata ───────────────────────────────────────────────

export const COACH_DEFAULT_CARD_ORDER = [
  "artifacts",
  "squad",
  "today-tasks",
  "assessment-results",
  "coach-cases",
  "coach-week",
  "lead-team",
] as const;

export type CoachCardId = typeof COACH_DEFAULT_CARD_ORDER[number];

const COACH_CARD_META: Record<string, { title: string; icon: LucideIcon }> = {
  "artifacts":          { title: "Artifacts",           icon: Folder          },
  "squad":              { title: "My Squad",            icon: Users           },
  "today-tasks":        { title: "Today's Tasks",       icon: CheckSquare     },
  "assessment-results": { title: "Assessment Results",  icon: ClipboardCheck  },
  "coach-cases":        { title: "My Cases",            icon: BookOpen        },
  "coach-week":         { title: "This Week",           icon: CalendarDays    },
  "lead-team":          { title: "Your Team",           icon: UserCheck       },
};

// ── Inline lead team card ─────────────────────────────────────────────────────

function AssistantNote() {
  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-3 flex items-start gap-2.5">
      <Shield className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-[12px] text-amber-800 leading-relaxed">
        As Coach's Assistant, your draft verdicts need your lead coach's countersign before they take effect.
      </p>
    </div>
  );
}

function LeadTeamCard({
  leadState,
  coachLevel,
}: {
  leadState:  LeadState | undefined;
  coachLevel: CoachLevel;
}) {
  const lead = leadState?.lead;

  if (!lead) {
    return (
      <div className="rounded-xl border border-border bg-white p-4 flex flex-col gap-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Your Team
        </p>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Lead coach</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
              Lead contact will appear once coaching assignments are configured.
            </p>
          </div>
        </div>
        {coachLevel === "assistant" && <AssistantNote />}
      </div>
    );
  }

  const firstName      = lead.name.split(" ")[0] ?? lead.name;
  const cohortChannel  = leadState?.cohortSlackChannel ?? null;
  const slackDmUrl     = lead.slackUserId
    ? `https://slack.com/app_redirect?channel=${lead.slackUserId}`
    : null;
  const channelUrl     = cohortChannel
    ? `https://slack.com/app_redirect?channel=${cohortChannel}`
    : null;

  return (
    <div className="rounded-xl border border-border bg-white p-4 flex flex-col gap-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        Your Team
      </p>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{lead.name}</p>
          <p className="text-[12px] text-muted-foreground">Lead coach</p>
        </div>
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
            {lead.email}
          </span>
        )}
        {channelUrl && cohortChannel && (
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted/30 transition-colors"
          >
            <Hash className="w-3.5 h-3.5 text-muted-foreground" />
            #{cohortChannel.replace(/^#/, "")}
          </a>
        )}
      </div>
      {coachLevel === "assistant" && <AssistantNote />}
    </div>
  );
}

// ── CoachHomebase (exported) ──────────────────────────────────────────────────

interface CoachHomebaseProps {
  audience:    HomebaseAudience;
  displayName: string;
  coachLevel?: CoachLevel | null;
}

export default function CoachHomebase({
  audience,
  displayName,
  coachLevel: coachLevelProp,
}: CoachHomebaseProps) {
  const coachLevel: CoachLevel = coachLevelProp ?? "associate";
  const [showSubmitCase, setShowSubmitCase] = useState(false);
  const levelLabel = COACH_LEVEL_LABELS[coachLevel];

  const pennyResult    = useCoachPennyPrepared();
  const artifactResult = useCoachArtifacts();
  const squadResult    = useCoachSquad();
  const leadResult     = useCoachLead();
  const casesResult    = useCoachCases();

  const pennyHasItems = (pennyResult.data?.items?.length ?? 0) > 0;

  // ── Card layout (order + collapsed), namespaced to coach ─────────────────
  const { cardOrder, setCardOrder, collapsed, toggleCollapse } = useHomebaseLayout({
    storagePrefix: "coach-homebase",
    defaultOrder:  [...COACH_DEFAULT_CARD_ORDER],
  });

  // ── DnD sensors ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = cardOrder.indexOf(active.id as string);
      const newIndex = cardOrder.indexOf(over.id  as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        setCardOrder(arrayMove(cardOrder, oldIndex, newIndex));
      }
    }
  }, [cardOrder, setCardOrder]);

  // ── Card render ───────────────────────────────────────────────────────────
  function renderCard(id: string) {
    switch (id) {
      case "artifacts":
        return (
          <ArtifactsCard
            isLoading={artifactResult.isLoading}
            artifactsState={artifactResult.data}
            error={artifactResult.error}
            coachLevel={coachLevel}
          />
        );
      case "squad":
        return (
          <SquadGrid
            isLoading={squadResult.isLoading}
            squadState={squadResult.data}
            error={squadResult.error}
            coachLevel={coachLevel}
          />
        );
      case "today-tasks":
        return <TodayTasksCard />;
      case "assessment-results":
        return <CoachAssessmentCard />;
      case "coach-cases":
        return (
          <CoachCasesCard
            isLoading={casesResult.isLoading}
            casesState={casesResult.data}
            error={casesResult.error}
          />
        );
      case "coach-week":
        return <CoachWeekCard />;
      case "lead-team":
        return <LeadTeamCard leadState={leadResult.data} coachLevel={coachLevel} />;
      default:
        return null;
    }
  }

  return (
    <HomebaseShell
      audience={audience}
      displayName={displayName}
    >
      <div className="flex flex-col gap-4 px-5 py-5">

        {/* 1 — Level header strip */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[12px] text-muted-foreground font-medium">
            {displayName
              ? `${displayName.split(" ")[0]}'s homebase`
              : "Your homebase"}
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              {levelLabel}
            </span>
            <button
              type="button"
              onClick={() => setShowSubmitCase(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Submit a Case
            </button>
          </div>
        </div>

        {/* 2 — Penny has prepared (fixed, not sortable) */}
        <PennyPreparedBand
          isLoading={pennyResult.isLoading}
          preparedState={pennyResult.data}
          error={pennyResult.error}
        />

        {/* 3 — Log time (fixed, not sortable) */}
        <LogTimeRow
          audience={audience}
          defaultActivity="Squad coaching"
          buttonVariant={pennyHasItems ? "secondary" : "primary"}
        />

        {/* 4 — Sortable card stack */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cardOrder} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {cardOrder.map(id => {
                const meta = COACH_CARD_META[id];
                if (!meta) return null;
                return (
                  <SortableCard
                    key={id}
                    id={id}
                    title={meta.title}
                    icon={meta.icon}
                    isCollapsed={collapsed.has(id)}
                    onToggleCollapse={() => toggleCollapse(id)}
                  >
                    {renderCard(id)}
                  </SortableCard>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

      </div>

      <SubmitCaseDrawer
        open={showSubmitCase}
        onClose={() => setShowSubmitCase(false)}
      />
    </HomebaseShell>
  );
}
