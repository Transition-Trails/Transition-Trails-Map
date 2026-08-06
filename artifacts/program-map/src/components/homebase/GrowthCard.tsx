/**
 * GrowthCard
 *
 * Collapsible "Widen what you can take" card for the Volunteer Homebase.
 * Shows skill suggestions from Penny based on gaps in the unmatched queue.
 *
 * Each skill card: skill name, why-this-skill paragraph, time estimate badge
 * (sky-blue pill), format note, and a "Start" button (disabled — Phase 2).
 *
 * Empty state: "No skill gaps in the queue right now."
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";
import type { GrowthSkill, GrowthState } from "@/hooks/useHomebaseVolunteer";

// ── Skill card ─────────────────────────────────────────────────────────────────

function SkillCard({ skill }: { skill: GrowthSkill }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0">
          {skill.skillName}
        </p>
        <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-700 px-2 py-0.5 text-[11px] font-medium flex-shrink-0">
          {skill.timeEstimate}
        </span>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed">
        {skill.whyThis}
      </p>
      <p className="text-[11px] text-muted-foreground italic">{skill.format}</p>

      {/* Start button — disabled until skill learning flow exists */}
      <button
        disabled
        title="Learning pathway coming in a future update"
        className="mt-1 flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground opacity-40 cursor-not-allowed"
      >
        Start
      </button>
    </div>
  );
}

// ── GrowthCard (exported) ──────────────────────────────────────────────────────

interface GrowthCardProps {
  isLoading:   boolean;
  growthState: GrowthState | undefined;
  error:       Error | null;
}

export function GrowthCard({ isLoading, growthState, error }: GrowthCardProps) {
  const [expanded, setExpanded] = useState(true);
  const skills = growthState?.skills ?? [];

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Widen what you can take</span>
        </div>
        {expanded
          ? <ChevronUp   className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Penny spotted these skills missing from the unmatched queue. Each one broadens the cases you can pick up.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground py-2 leading-relaxed">
              Couldn't load skill suggestions right now. Try refreshing.
            </p>
          ) : skills.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 leading-relaxed">
              No skill gaps in the queue right now.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {skills.map(s => <SkillCard key={s.id} skill={s} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
