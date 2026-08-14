/**
 * CoachAssessmentCard
 *
 * Compact view of squad skill-assessment aggregate stats for the Coach Homebase.
 * Data: GET /api/assessments/coach/overview
 *
 * Only non-identifying aggregate counts are shown.  Per-learner session data
 * is not exposed until a server-side coach→learner squad-assignment model exists.
 *
 * States: loading · error · empty · summary strip
 */

import { useQuery }       from "@tanstack/react-query";
import { AlertTriangle, Loader2, ClipboardCheck } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CoachOverview {
  stats: {
    total:         number;
    passed:        number;
    passRate:      number;
    avgScore:      number;
    needsCoaching: number;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchCoachOverview(): Promise<CoachOverview> {
  const r = await fetch("/api/assessments/coach/overview");
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<CoachOverview>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CoachAssessmentCard() {
  const { data, isLoading, error } = useQuery<CoachOverview>({
    queryKey: ["coach-assessment-overview"],
    queryFn:  fetchCoachOverview,
    staleTime: 60_000,
  });

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-1 py-4 text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-[12px]">Loading results…</span>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="flex items-center gap-2 px-1 py-3">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="text-[12px] text-muted-foreground">
          Couldn't load assessment results right now.
        </span>
      </div>
    );
  }

  const stats = data?.stats;

  // Empty
  if (!stats || stats.total === 0) {
    return (
      <div className="flex items-start gap-3 px-1 py-3">
        <ClipboardCheck className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-medium text-foreground">
            No completed assessments yet
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
            Results appear here once learners complete their Penny skill assessment.
          </p>
        </div>
      </div>
    );
  }

  // Summary strip — aggregate counts only, no learner identifiers
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {([
          { label: "Completed",      value: String(stats.total),        cls: "text-foreground"  },
          { label: "Pass Rate",      value: `${stats.passRate}%`,       cls: "text-emerald-700" },
          { label: "Avg Score",      value: `${stats.avgScore}%`,       cls: "text-sky-700"     },
        ] as const).map(s => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-white px-3 py-2 text-center"
          >
            <p className={`text-sm font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {stats.needsCoaching > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-[12px] text-amber-800">
            {stats.needsCoaching} learner{stats.needsCoaching !== 1 ? "s" : ""} below passing threshold — check Penny → Assessments for details.
          </p>
        </div>
      )}
    </div>
  );
}
