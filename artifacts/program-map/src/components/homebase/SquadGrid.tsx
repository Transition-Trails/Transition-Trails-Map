/**
 * SquadGrid
 *
 * Collapsible grid of squad learner cards for the Coach Homebase.
 *
 * Each card shows:
 *   - Learner name (bold)
 *   - Buddy pair name (if set)
 *   - Current activity + phase
 *   - Passed / rework counts
 *   - Amber "Stuck" badge when improvement curve is flat (isStuck)
 *
 * Advanced coaches see both squads (identified by squadLabel).
 * Phase 1: no SF data yet → honest empty state.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Users, Loader2, AlertTriangle } from "lucide-react";
import type { SquadLearner, SquadState, CoachLevel } from "@/hooks/useHomebaseCoach";

// ── LearnerCard ────────────────────────────────────────────────────────────────

function LearnerCard({ learner }: { learner: SquadLearner }) {
  return (
    <div
      className={[
        "rounded-xl border bg-white p-4 flex flex-col gap-2 transition-colors",
        learner.isStuck
          ? "border-l-2 border-l-amber-400 border-t-border border-r-border border-b-border"
          : "border-border",
      ].join(" ")}
    >
      {/* Name + stuck badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug truncate">
            {learner.name}
          </p>
          {learner.buddy && (
            <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
              Buddy: {learner.buddy}
            </p>
          )}
        </div>
        {learner.isStuck && (
          <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 flex-shrink-0">
            <AlertTriangle className="w-3 h-3" />
            Stuck
          </span>
        )}
      </div>

      {/* Activity + phase */}
      {(learner.activity || learner.phase) && (
        <div className="flex flex-col gap-0.5">
          {learner.activity && (
            <p className="text-[12px] text-foreground font-medium leading-snug truncate">
              {learner.activity}
            </p>
          )}
          {learner.phase && (
            <p className="text-[11px] text-muted-foreground truncate">
              Phase: {learner.phase}
            </p>
          )}
        </div>
      )}

      {/* Passed / rework counts */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground">Passed</span>
          <span className="text-[12px] font-semibold text-emerald-700">{learner.passedCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground">Rework</span>
          <span className="text-[12px] font-semibold text-amber-600">{learner.reworkCount}</span>
        </div>
      </div>
    </div>
  );
}

// ── SquadGrid (exported) ───────────────────────────────────────────────────────

interface SquadGridProps {
  isLoading:  boolean;
  squadState: SquadState | undefined;
  error:      Error | null;
  coachLevel: CoachLevel;
}

export function SquadGrid({ isLoading, squadState, error, coachLevel }: SquadGridProps) {
  const [expanded, setExpanded] = useState(true);

  const learners = squadState?.squads ?? [];

  // Advanced coaches can see both squads — group by squadLabel if present
  const hasMultipleSquads = coachLevel === "advanced" &&
    learners.some(l => l.squadLabel);

  const stuckCount = learners.filter(l => l.isStuck).length;

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            {hasMultipleSquads ? "Your Squads" : "Your Squad"}
          </span>
          {!isLoading && learners.length > 0 && (
            <span className="text-[12px] text-muted-foreground">
              {learners.length} {learners.length === 1 ? "learner" : "learners"}
            </span>
          )}
          {!isLoading && stuckCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              <AlertTriangle className="w-3 h-3" />
              {stuckCount} stuck
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp   className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground py-4 leading-relaxed">
              Couldn't load your squad right now. Try refreshing.
            </p>
          ) : learners.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 leading-relaxed">
              Your squad will appear here once coaching assignments are configured.
            </p>
          ) : hasMultipleSquads ? (
            // Advanced coaches — render each squadLabel as a labelled group
            (() => {
              const groups = new Map<string, SquadLearner[]>();
              for (const l of learners) {
                const label = l.squadLabel ?? "Squad";
                const existing = groups.get(label);
                if (existing) existing.push(l);
                else groups.set(label, [l]);
              }
              return (
                <div className="flex flex-col gap-5 pt-1">
                  {[...groups.entries()].map(([label, members]) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {label}
                      </p>
                      <div
                        className="grid gap-3"
                        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
                      >
                        {members.map(l => <LearnerCard key={l.id} learner={l} />)}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : (
            <div className="grid gap-3 pt-1"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
            >
              {learners.map(l => <LearnerCard key={l.id} learner={l} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
