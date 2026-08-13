/**
 * AssessmentDebrief
 *
 * Shown to the learner immediately after their session completes.
 * Renders domain score bars, a confidence calibration summary, and
 * session stats.  On mount it clears the Penny proctor lock and fires a
 * pre-loaded coaching query so Penny immediately opens the debrief conversation.
 */

import { useEffect, useState } from "react";
import { useLocation }         from "wouter";
import {
  CheckCircle, AlertTriangle, Sparkles, BarChart2,
  TrendingUp, Brain, Clock, ArrowRight, Trophy,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DomainState {
  domain:        string;
  domainLabel:   string;
  domainWeight:  number;
  read:          "settled" | "reading" | "not_yet";
  answeredCount: number;
  correctCount:  number;
}

interface DebriefSummary {
  totalAnswered:  number;
  totalCorrect:   number;
  overallScore:   number;
  passed:         boolean;
  settledDomains: number;
  totalDomains:   number;
}

interface ConfidenceCalibration {
  calibrated:   number; // confident + correct
  misconception: number; // confident + wrong  ← highest coaching risk
  insight:      number;  // unsure + correct
  needsWork:    number;  // unsure + wrong
  total:        number;
}

interface DebriefData {
  domainReads:           DomainState[];
  confidenceCalibration: ConfidenceCalibration;
  summary:               DebriefSummary;
}

interface Session {
  id:          number;
  instance:    string;
  startedAt:   string;
  completedAt?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

const INSTANCE_LABELS: Record<string, string> = {
  "now":    "Baseline Assessment",
  "week-6": "Week 6 Assessment",
  "end":    "End of Trail Assessment",
};

const DOMAIN_COLORS: Record<string, string> = {
  "config-setup":           "#3B82F6",
  "object-manager-builder": "#7C3AED",
  "sales-marketing":        "#10B981",
  "service-support":        "#F97316",
  "productivity":           "#F59E0B",
  "data-analytics":         "#14B8A6",
  "workflow-automation":    "#6366F1",
  "security-access":        "#F43F5E",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(startedAt: string, completedAt?: string | null): string {
  const end   = completedAt ? new Date(completedAt).getTime() : Date.now();
  const start = new Date(startedAt).getTime();
  const secs  = Math.round((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem  = secs % 60;
  return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
}

function domainScore(d: DomainState): number {
  return d.answeredCount > 0 ? Math.round((d.correctCount / d.answeredCount) * 100) : 0;
}

function buildPennyQuery(summary: DebriefSummary, domainReads: DomainState[], instance: string): string {
  const label    = INSTANCE_LABELS[instance] ?? "Assessment";
  const score    = summary.overallScore;
  const sorted   = [...domainReads]
    .filter(d => d.answeredCount > 0)
    .sort((a, b) => domainScore(b) - domainScore(a));
  const best     = sorted[0];
  const weakest  = sorted[sorted.length - 1];

  const lines: string[] = [
    `Let's look at your ${label} results together — here's what I see:`,
    `• Overall score: ${score}% (${summary.totalCorrect}/${summary.totalAnswered} items)${summary.passed ? " — you passed! 🎉" : ""}`,
  ];
  if (best)    lines.push(`• Strongest domain: ${best.domainLabel} (${domainScore(best)}%)`);
  if (weakest && weakest !== best) lines.push(`• Area to grow: ${weakest.domainLabel} (${domainScore(weakest)}%)`);

  lines.push("", "How are you feeling about these results? What would you like to explore first?");
  return lines.join("\n");
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBadge({ score, passed }: { score: number; passed: boolean }) {
  const color = passed ? "#2F6B3F" : score >= 55 ? "#CC8400" : "#A93F2F";
  const bg    = passed ? "#E6F0EA" : score >= 55 ? "#FFF3E0" : "#FBEAE6";
  return (
    <div
      className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 shrink-0"
      style={{ borderColor: color, background: bg }}
    >
      <span className="text-2xl font-bold" style={{ color }}>{score}%</span>
      <span className="text-[11px] font-semibold" style={{ color: `${color}aa` }}>
        {passed ? "Passed" : "Not yet"}
      </span>
    </div>
  );
}

function DomainBar({ d }: { d: DomainState }) {
  const score = domainScore(d);
  const bar   = DOMAIN_COLORS[d.domain] ?? "#6B7280";
  const settled = d.read === "settled";
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 shrink-0">
        <p className="text-[12px] font-medium text-foreground leading-tight truncate" title={d.domainLabel}>
          {d.domainLabel}
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          {d.answeredCount} item{d.answeredCount !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: bar }}
        />
      </div>
      <span className="text-[13px] font-bold w-10 text-right shrink-0" style={{ color: bar }}>
        {d.answeredCount > 0 ? `${score}%` : "—"}
      </span>
      <span
        className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 border shrink-0 w-16 text-center"
        style={settled
          ? { background: "#E6F0EA", color: "#2F6B3F", borderColor: "#9FC3AE" }
          : { background: "#EDF5F8", color: "#2F6F7E", borderColor: "#7FAFC6" }
        }
      >
        {settled ? "Settled" : d.read === "reading" ? "Reading" : "Skipped"}
      </span>
    </div>
  );
}

function CalibrationQuadrant({
  count, label, description, color, bg, border, icon: Icon, risk,
}: {
  count: number; label: string; description: string;
  color: string; bg: string; border: string;
  icon: React.ElementType; risk?: boolean;
}) {
  return (
    <div className="rounded-lg border p-3 flex items-start gap-2.5" style={{ background: bg, borderColor: border }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}20` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-[13px] font-bold" style={{ color }}>
            {count}
          </p>
          <p className="text-[12px] font-semibold text-foreground">{label}</p>
          {risk && count > 0 && (
            <span className="text-[10px] font-semibold text-[#A93F2F] bg-[#FBEAE6] border border-[#E8B9B4] rounded-full px-1.5 py-0.5">
              Review with coach
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AssessmentDebrief({
  sessionId,
  session,
  initialDomainReads,
}: {
  sessionId:          number;
  session:            Session;
  initialDomainReads: DomainState[];
}) {
  const [, navigate]    = useLocation();
  const { setAssessmentActive, setAskPennyOpen, setPendingPennyQuery } = useAppContext();

  const [debriefData, setDebriefData] = useState<DebriefData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [pennyFired, setPennyFired]   = useState(false);

  // Lift proctor lock immediately on mount
  useEffect(() => {
    setAssessmentActive(false);
  }, [setAssessmentActive]);

  // Fetch debrief data (confidence calibration)
  useEffect(() => {
    fetch(`${BASE}/api/assessments/sessions/${sessionId}/debrief`)
      .then(r => r.ok ? r.json() as Promise<DebriefData> : Promise.reject(r.status))
      .then(data => { setDebriefData(data); setLoading(false); })
      .catch(() => {
        // Fall back to initialDomainReads with zero calibration
        setDebriefData({
          domainReads: initialDomainReads,
          confidenceCalibration: { calibrated: 0, misconception: 0, insight: 0, needsWork: 0, total: 0 },
          summary: {
            totalAnswered:  initialDomainReads.reduce((acc, d) => acc + d.answeredCount, 0),
            totalCorrect:   initialDomainReads.reduce((acc, d) => acc + d.correctCount, 0),
            overallScore:   0,
            passed:         false,
            settledDomains: initialDomainReads.filter(d => d.read === "settled").length,
            totalDomains:   initialDomainReads.length,
          },
        });
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Fire Penny coaching query once debrief data is ready
  useEffect(() => {
    if (!debriefData || pennyFired) return;
    const query = buildPennyQuery(debriefData.summary, debriefData.domainReads, session.instance);
    setPendingPennyQuery(query);
    setAskPennyOpen(true);
    setPennyFired(true);
  }, [debriefData, pennyFired, session.instance, setPendingPennyQuery, setAskPennyOpen]);

  const data    = debriefData;
  const summary = data?.summary;
  const cal     = data?.confidenceCalibration;
  const domains = (data?.domainReads ?? initialDomainReads).filter(d => d.answeredCount > 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4">
          {summary ? (
            <ScoreBadge score={summary.overallScore} passed={summary.passed} />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted animate-pulse shrink-0" />
          )}
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              {summary?.passed
                ? <Trophy className="w-4 h-4 text-[#2F6B3F]" />
                : <Brain   className="w-4 h-4 text-[#2F6F7E]" />
              }
              <p className="text-base font-bold text-foreground">
                {INSTANCE_LABELS[session.instance] ?? "Assessment"} Complete
              </p>
            </div>
            <p className="text-[13px] text-muted-foreground mb-3">
              {summary?.passed
                ? "You've demonstrated solid understanding across this domain. Penny has your full results below."
                : "Good effort — every attempt builds knowledge. Penny is here to walk through your results with you."}
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{summary ? `${summary.totalAnswered} items` : "—"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{summary ? `${summary.totalCorrect} correct` : "—"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDuration(session.startedAt, session.completedAt)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <CheckCircle className="w-3.5 h-3.5 text-[#2F6B3F]" />
                <span>{summary ? `${summary.settledDomains}/${summary.totalDomains} domains settled` : "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Domain Results ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-[11px] font-bold text-muted-foreground/60 tracking-wide uppercase">
            Domain Results
          </p>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : domains.length > 0 ? (
            <div className="space-y-3">
              {domains.map(d => <DomainBar key={d.domain} d={d} />)}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground text-center py-4">No domain data available.</p>
          )}
        </div>

        {/* ── Confidence Calibration ────────────────────────────────── */}
        {!loading && cal && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground/60 tracking-wide uppercase mb-0.5">
                Confidence Calibration
              </p>
              <p className="text-[12px] text-muted-foreground">
                How well your confidence matched your performance.
                {cal.misconception > 0 && (
                  <span className="text-[#A93F2F]"> {cal.misconception} item{cal.misconception > 1 ? "s" : ""} flagged for coach review.</span>
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <CalibrationQuadrant
                count={cal.calibrated} label="Calibrated" icon={CheckCircle}
                description="Confident and correct — your strongest signal"
                color="#2F6B3F" bg="#E6F0EA" border="#9FC3AE"
              />
              <CalibrationQuadrant
                count={cal.misconception} label="Misconception risk" icon={AlertTriangle}
                description="Confident but wrong — worth reviewing with Penny" risk
                color="#A93F2F" bg="#FBEAE6" border="#E8B9B4"
              />
              <CalibrationQuadrant
                count={cal.insight} label="Learning insight" icon={Brain}
                description="Correct but unsure — you know more than you think"
                color="#2F6F7E" bg="#EDF5F8" border="#7FAFC6"
              />
              <CalibrationQuadrant
                count={cal.needsWork} label="Needs practice" icon={TrendingUp}
                description="Unsure and wrong — clear areas to build"
                color="#CC8400" bg="#FFF3E0" border="#FFD08A"
              />
            </div>
          </div>
        )}

        {/* ── Penny panel ───────────────────────────────────────────── */}
        <div
          className="rounded-xl border p-4 flex items-start gap-3"
          style={{ background: "#EDF5F8", borderColor: "#7FAFC6" }}
        >
          <div className="w-8 h-8 rounded-full bg-[#2F6F7E]/15 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-[#2F6F7E]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#2F6F7E] mb-0.5">Penny is ready to debrief</p>
            <p className="text-[12px] text-[#2F6F7E]/80 leading-snug">
              Penny has opened with your personalised results summary. She can walk you through
              what the scores mean, explain any items you missed, and suggest next steps.
            </p>
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-[14px] transition-opacity hover:opacity-90"
            style={{ background: "#2F6B3F" }}
          >
            Back to Homebase <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setAskPennyOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[14px] border border-[#7FAFC6] text-[#2F6F7E] bg-white hover:bg-[#EDF5F8] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Open Penny
          </button>
        </div>

      </div>
    </div>
  );
}
