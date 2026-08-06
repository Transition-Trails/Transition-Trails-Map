/**
 * ArtefactsCard
 *
 * Collapsible "Artefacts awaiting a verdict" card on the Coach Homebase.
 * Always rendered (never null) — coaches need to see when work is waiting.
 *
 * Level-aware labels:
 *   assistant  → heading "Artefacts to read"       CTA "Draft →"
 *   others     → heading "Artefacts awaiting a verdict"  CTA "Issue verdict →"
 *
 * States:
 *   loading   — spinner
 *   empty     — "No artefacts awaiting review…"
 *   list      — rows with learner name, type, submission age, criteria count,
 *               Penny pre-read summary, and level-appropriate CTA
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, FileCheck2, Loader2, Clock } from "lucide-react";
import type { CoachArtefact, ArtefactsState, CoachLevel } from "@/hooks/useHomebaseCoach";

// ── Age helper ─────────────────────────────────────────────────────────────────

function submissionAge(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diffMs / 60_000);
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days  = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── ArtefactRow ────────────────────────────────────────────────────────────────

function ArtefactRow({
  artefact,
  ctaLabel,
}: {
  artefact: CoachArtefact;
  ctaLabel: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted/40">
            {artefact.artefactType}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {submissionAge(artefact.submittedAt)}
          </span>
          {artefact.criteriaCount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {artefact.criteriaCount} {artefact.criteriaCount === 1 ? "criterion" : "criteria"}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground leading-snug">
          {artefact.learnerName}
        </p>
        {artefact.pennyPreRead && (
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            {artefact.pennyPreRead}
          </p>
        )}
      </div>
      {/* Verdict CTA — disabled until artefact detail page exists (task #259) */}
      <button
        disabled
        title="Artefact detail page coming soon — verdict workflow pending"
        className="flex-shrink-0 text-sm text-muted-foreground font-medium opacity-40 cursor-not-allowed mt-0.5"
      >
        {ctaLabel}
      </button>
    </div>
  );
}

// ── ArtefactsCard (exported) ───────────────────────────────────────────────────

interface ArtefactsCardProps {
  isLoading:     boolean;
  artefactsState: ArtefactsState | undefined;
  error:         Error | null;
  coachLevel:    CoachLevel;
}

export function ArtefactsCard({
  isLoading,
  artefactsState,
  error,
  coachLevel,
}: ArtefactsCardProps) {
  const [expanded, setExpanded] = useState(true);

  const items   = artefactsState?.items ?? [];
  const heading = coachLevel === "assistant" ? "Artefacts to read" : "Artefacts awaiting a verdict";
  const ctaLabel = coachLevel === "assistant" ? "Draft →" : "Issue verdict →";

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{heading}</span>
          {!isLoading && items.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold px-1.5">
              {items.length}
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
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground py-4 leading-relaxed">
              Couldn't load artefacts right now. Try refreshing the page.
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 leading-relaxed">
              No artefacts awaiting review — your squad's submitted work will appear here.
            </p>
          ) : (
            <div>
              {items.map(a => (
                <ArtefactRow key={a.id} artefact={a} ctaLabel={ctaLabel} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
