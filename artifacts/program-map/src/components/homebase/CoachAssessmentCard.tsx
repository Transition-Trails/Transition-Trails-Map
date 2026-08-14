/**
 * CoachAssessmentCard
 *
 * Compact view of squad skill-assessment results for the Coach Homebase.
 * Data: GET /api/assessments/coach/overview
 *
 * States: loading · error · empty · results table + summary strip
 */

import { useQuery }       from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Loader2, ClipboardCheck } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CoachSession {
  id:            number;
  learnerEmail:  string;
  instance:      string;
  completedAt:   string | null;
  score:         number;
  passed:        boolean;
  totalAnswered: number;
  totalCorrect:  number;
}

interface CoachOverview {
  sessions: CoachSession[];
  stats: {
    total:         number;
    passed:        number;
    passRate:      number;
    avgScore:      number;
    needsCoaching: number;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const INSTANCE_LABELS: Record<string, string> = {
  now:      "Baseline",
  "week-6": "Week 6",
  end:      "Final",
};

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

  const sessions = data?.sessions ?? [];
  const stats    = data?.stats;

  // Empty
  if (sessions.length === 0) {
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

  // Results
  const visible = sessions.slice(0, 8);

  return (
    <div className="flex flex-col gap-3">

      {/* Summary strip */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: "Completed",     value: String(stats.total),    cls: "text-foreground"   },
            { label: "Pass Rate",     value: `${stats.passRate}%`,   cls: "text-emerald-700"  },
            { label: "Avg Score",     value: `${stats.avgScore}%`,   cls: "text-sky-700"      },
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
      )}

      {/* Session rows */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_68px_36px_40px] items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border">
          {["Learner", "Score", "✓", "Qs"].map(h => (
            <p key={h} className="text-[10px] font-semibold text-muted-foreground/70">{h}</p>
          ))}
        </div>
        <div className="divide-y divide-border bg-white">
          {visible.map(s => {
            const scoreClr = s.score >= 85 ? "text-emerald-700"
                           : s.score >= 70 ? "text-sky-700"
                           : "text-rose-700";
            const dateStr  = s.completedAt
              ? new Date(s.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—";
            return (
              <div
                key={s.id}
                className="grid grid-cols-[1fr_68px_36px_40px] items-center gap-2 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p
                    className="text-[12px] font-medium text-foreground truncate"
                    title={s.learnerEmail}
                  >
                    {s.learnerEmail.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {INSTANCE_LABELS[s.instance] ?? s.instance} · {dateStr}
                  </p>
                </div>
                <p className={`text-[12px] font-bold text-right ${scoreClr}`}>
                  {s.score}%
                </p>
                <div className="flex justify-center">
                  {s.passed
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                </div>
                <p className="text-[10px] text-muted-foreground text-right">
                  {s.totalCorrect}/{s.totalAnswered}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {sessions.length > 8 && (
        <p className="text-[11px] text-muted-foreground text-center">
          +{sessions.length - 8} more — full view at Penny → Assessments
        </p>
      )}

    </div>
  );
}
