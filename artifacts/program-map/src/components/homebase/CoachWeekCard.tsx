/**
 * CoachWeekCard
 *
 * Collapsible "This week" card for the Coach Homebase.
 * Shows:
 *   - Squad session card: day/time + "Review agenda" button
 *   - Record a walkthrough card
 *
 * Phase 1: No SF session data yet — displays static affordances with honest
 * "no sessions scheduled" copy alongside the walkthrough card.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, CalendarDays, Video, ClipboardList } from "lucide-react";

// ── Session card ───────────────────────────────────────────────────────────────

function SquadSessionCard({
  sessionTime,
  onReviewAgenda,
}: {
  sessionTime: string | null;
  onReviewAgenda?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
        <CalendarDays className="w-4 h-4 text-sky-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">Squad session</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {sessionTime
            ? new Date(sessionTime).toLocaleDateString("en-US", {
                weekday: "long",
                month:   "short",
                day:     "numeric",
                hour:    "numeric",
                minute:  "2-digit",
              })
            : "No sessions scheduled yet"}
        </p>
        {sessionTime && (
          /* Disabled until session agenda generation is implemented */
          <button
            disabled
            title="Agenda generation coming soon"
            className="mt-2 text-sm text-muted-foreground font-medium opacity-40 cursor-not-allowed"
          >
            Review agenda →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Walkthrough card ───────────────────────────────────────────────────────────

function WalkthroughCard() {
  return (
    <div className="rounded-lg border border-border bg-white p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
        <Video className="w-4 h-4 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">Record a walkthrough</p>
        <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
          Capture a step-by-step walk-through for your squad to revisit.
        </p>
        {/* Disabled until walkthrough recording is wired (Chrome extension — Phase 2) */}
        <button
          disabled
          title="Walkthrough recording coming in Phase 2"
          className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground border border-border rounded-lg px-3 py-1.5 opacity-40 cursor-not-allowed"
        >
          <Video className="w-3.5 h-3.5 text-muted-foreground" />
          Start recording
        </button>
        <p className="text-[11px] text-muted-foreground mt-1 italic">
          Available in Phase 2
        </p>
      </div>
    </div>
  );
}

// ── CoachWeekCard (exported) ───────────────────────────────────────────────────

interface CoachWeekCardProps {
  nextSessionTime?: string | null;
  onReviewAgenda?:  () => void;
}

export function CoachWeekCard({ nextSessionTime, onReviewAgenda }: CoachWeekCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">This week</span>
        </div>
        {expanded
          ? <ChevronUp   className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 flex flex-col gap-3">
          <SquadSessionCard sessionTime={nextSessionTime ?? null} onReviewAgenda={onReviewAgenda} />
          <WalkthroughCard />
        </div>
      )}
    </div>
  );
}
