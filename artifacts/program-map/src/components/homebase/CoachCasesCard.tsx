/**
 * CoachCasesCard
 *
 * Collapsible "Your Cases" card for the Coach Homebase.
 * Mirrors the pattern of LearnerCasesCard but calls the coach endpoint.
 *
 * States:
 *   loading        — spinner
 *   sfUnavailable  — "Salesforce connection unavailable"
 *   error          — "Couldn't load cases right now"
 *   not-linked     — "Cases will appear here once your account setup is complete"
 *   all-closed     — compact green-tick row
 *   list           — open cases with subject, status badge, case number, age
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Loader2, Briefcase } from "lucide-react";
import type { CoachCasesState, CoachCase } from "@/hooks/useHomebaseCoach";

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  "New":         "bg-amber-50   text-amber-700   border-amber-200",
  "In Progress": "bg-sky-50     text-sky-700     border-sky-200",
  "Escalated":   "bg-rose-50    text-rose-700    border-rose-200",
  "On Hold":     "bg-muted      text-muted-foreground border-border",
  "Resolved":    "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function StatusBadge({ status }: { status: string | null }) {
  const label = status ?? "Unknown";
  const cls   = STATUS_STYLES[label] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ── Age helper ─────────────────────────────────────────────────────────────────

function caseAge(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diffMs / 60_000);
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days  = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Case row ───────────────────────────────────────────────────────────────────

function CaseRow({ c }: { c: CoachCase }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <StatusBadge status={c.Status} />
          {c.CaseNumber && (
            <span className="text-[11px] text-muted-foreground font-mono">#{c.CaseNumber}</span>
          )}
        </div>
        <p className="text-sm text-foreground font-medium leading-snug truncate">
          {c.Subject ?? "Untitled case"}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Updated {caseAge(c.LastModifiedDate)} · Assigned to you
        </p>
      </div>
    </div>
  );
}

// ── CoachCasesCard (exported) ──────────────────────────────────────────────────

interface CoachCasesCardProps {
  isLoading:  boolean;
  casesState: CoachCasesState | undefined;
  error:      Error | null;
}

export function CoachCasesCard({ isLoading, casesState, error }: CoachCasesCardProps) {
  const [expanded, setExpanded] = useState(true);

  const linked        = casesState?.linked;
  const sfUnavailable = casesState?.sfUnavailable;
  const cases         = casesState?.cases ?? [];
  const totalOpen     = casesState?.totalOpen ?? 0;
  const allClosed     = linked === true && cases.length === 0 && !isLoading && !error;

  if (allClosed) {
    return (
      <div className="rounded-xl border border-border bg-white">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-medium text-foreground">
            All closed
            <span className="text-muted-foreground font-normal"> — 0 open cases</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Your Cases</span>
          {!isLoading && linked === true && totalOpen > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              {totalOpen}
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
          ) : sfUnavailable ? (
            <p className="text-sm text-muted-foreground py-4 leading-relaxed">
              Salesforce connection unavailable — cases will appear when it's back online.
            </p>
          ) : error ? (
            <p className="text-sm text-muted-foreground py-4 leading-relaxed">
              Couldn't load cases right now. Try refreshing the page.
            </p>
          ) : linked === false ? (
            <p className="text-sm text-muted-foreground py-4 leading-relaxed">
              Cases will appear here once your account setup is complete.
            </p>
          ) : cases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No open cases right now.
            </p>
          ) : (
            <div>
              {cases.map(c => <CaseRow key={c.Id} c={c} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
