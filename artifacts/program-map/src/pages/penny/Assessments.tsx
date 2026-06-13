import { useState } from 'react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumAssessments, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { useAppContext } from '@/context/AppContext';
import {
  ClipboardCheck, Sparkles, AlertTriangle, CheckCircle2,
  ChevronRight, Brain, BarChart2, Users, BookOpen,
  TrendingUp, Zap,
} from 'lucide-react';

// ── Per-learner assessment results (cross-referenced data) ────────────────────

interface LearnerResult {
  learner: string;
  program: string;
  assessmentId: string;
  score: number;
  passed: boolean;
  attempts: number;
  date: string;
  pennyCoached: boolean;
}

const LEARNER_RESULTS: LearnerResult[] = [
  { learner: 'Jordan M.',  program: "Explorer's Trail",  assessmentId: 'asmnt-1-1', score: 87, passed: true,  attempts: 1, date: '2026-05-15', pennyCoached: true  },
  { learner: 'Riley P.',   program: 'Foundations Trail', assessmentId: 'asmnt-2-1', score: 92, passed: true,  attempts: 1, date: '2026-06-01', pennyCoached: true  },
  { learner: 'Avery K.',   program: 'Guided Trail',      assessmentId: 'asmnt-1-2', score: 74, passed: false, attempts: 2, date: '2026-06-03', pennyCoached: true  },
  { learner: 'Taylor R.',  program: 'Foundations Trail', assessmentId: 'asmnt-1-1', score: 81, passed: true,  attempts: 1, date: '2026-05-18', pennyCoached: false },
  { learner: 'Drew H.',    program: "Explorer's Trail",  assessmentId: 'asmnt-1-3', score: 68, passed: false, attempts: 1, date: '2026-06-08', pennyCoached: false },
  { learner: 'Alex F.',    program: 'Guided Trail',      assessmentId: 'asmnt-3-3', score: 95, passed: true,  attempts: 1, date: '2026-05-30', pennyCoached: true  },
  { learner: 'Casey L.',   program: "Explorer's Trail",  assessmentId: 'asmnt-1-1', score: 60, passed: false, attempts: 3, date: '2026-05-22', pennyCoached: true  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Assessments() {
  const { setAskPennyOpen, setPendingPennyQuery } = useAppContext();
  const [, setLocation] = useLocation();
  const [filterStatus, setFilterStatus] = useState<'all' | 'needs-coaching' | 'failed'>('all');

  const totalPassed   = LEARNER_RESULTS.filter(r => r.passed).length;
  const needsCoaching = LEARNER_RESULTS.filter(r => !r.pennyCoached && !r.passed).length;
  const avgScore      = Math.round(LEARNER_RESULTS.reduce((s, r) => s + r.score, 0) / LEARNER_RESULTS.length);

  const filtered = LEARNER_RESULTS.filter(r => {
    if (filterStatus === 'needs-coaching') return !r.pennyCoached && !r.passed;
    if (filterStatus === 'failed')         return !r.passed;
    return true;
  });

  function askPennyAbout(learner: string, assessmentId: string, score: number, passed: boolean) {
    const asmnt = curriculumAssessments.find(a => a.id === assessmentId);
    const query = passed
      ? `${learner} passed the "${asmnt?.name ?? assessmentId}" assessment with a score of ${score}%. What personalised next step should Penny suggest to extend their learning momentum?`
      : `${learner} scored ${score}% on the "${asmnt?.name ?? assessmentId}" assessment (passing score: ${asmnt?.passingScore ?? 75}%). They haven't passed yet. What coaching approach should Penny use to help them prepare for a retake?`;
    setPendingPennyQuery(query);
    setAskPennyOpen(true);
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-5xl">

        {/* Header */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Penny Command Center
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground">Assessments</h1>
                <p className="text-[11px] text-muted-foreground">
                  Competency assessments administered by Penny — results stored in Salesforce, coaching delivered in-platform.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="font-semibold">POC Confirmed</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Assessments',    value: curriculumAssessments.length, color: 'text-foreground',  icon: ClipboardCheck },
            { label: 'Pass Rate',      value: `${Math.round((totalPassed / LEARNER_RESULTS.length) * 100)}%`, color: 'text-emerald-600', icon: TrendingUp },
            { label: 'Avg Score',      value: `${avgScore}%`,               color: 'text-sky-600',     icon: BarChart2 },
            { label: 'Needs Coaching', value: needsCoaching,                color: 'text-amber-600',   icon: Brain },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-1.5`} />
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Learner results */}
        <div>
          <div className="flex items-center justify-between mb-2.5 gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Learner Results
            </p>
            <div className="flex items-center gap-1.5">
              {(['all', 'failed', 'needs-coaching'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                    filterStatus === f
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'failed' ? 'Failed' : 'Needs Coaching'}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_180px_70px_70px_80px_80px] gap-x-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
              {['Learner', 'Assessment', 'Score', 'Passed', 'Attempts', 'Penny'].map(h => (
                <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{h}</p>
              ))}
            </div>
            <div className="bg-card divide-y divide-border">
              {filtered.map(r => {
                const asmnt    = curriculumAssessments.find(a => a.id === r.assessmentId);
                const scoreClr = r.score >= 85 ? 'text-emerald-700' : r.score >= 75 ? 'text-sky-700' : 'text-rose-700';
                return (
                  <div
                    key={`${r.learner}-${r.assessmentId}`}
                    className="grid grid-cols-[1fr_180px_70px_70px_80px_80px] gap-x-3 items-center px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">{r.learner}</p>
                      <p className="text-[10px] text-muted-foreground">{r.program}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-foreground truncate">{asmnt?.name ?? r.assessmentId}</p>
                      <p className="text-[10px] text-muted-foreground">{r.date}</p>
                    </div>
                    <p className={`text-[12px] font-bold ${scoreClr}`}>{r.score}%</p>
                    <div>
                      {r.passed
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <AlertTriangle className="w-4 h-4 text-rose-500" />
                      }
                    </div>
                    <p className="text-[11px] text-muted-foreground">{r.attempts}×</p>
                    <div className="flex items-center gap-1">
                      {r.pennyCoached
                        ? <Sparkles className="w-3.5 h-3.5 text-violet-500" aria-label="Penny coaching active" />
                        : null
                      }
                      <button
                        onClick={() => askPennyAbout(r.learner, r.assessmentId, r.score, r.passed)}
                        className="flex items-center gap-1 text-[10px] text-primary border border-primary/20 rounded-md px-1.5 py-0.5 hover:bg-primary/5 transition-colors"
                        title="Get Penny coaching advice"
                      >
                        <Brain className="w-2.5 h-2.5" />
                        <span>{r.passed ? 'Next' : 'Coach'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                  No results match this filter.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assessment catalogue summary */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Assessment Catalogue · Foundations Trail
            </p>
            <button
              onClick={() => setLocation('/program/curriculum')}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              Edit in Curriculum Studio <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_130px_60px_70px_60px] gap-x-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
              {['Assessment', 'Type', 'Qs', 'Pass %', 'Avg'].map(h => (
                <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{h}</p>
              ))}
            </div>
            <div className="bg-card divide-y divide-border">
              {curriculumAssessments.map((a, i) => {
                const statusCfg = CONTENT_STATUS_CONFIG[a.status];
                return (
                  <div
                    key={a.id}
                    className={`grid grid-cols-[1fr_130px_60px_70px_60px] gap-x-3 items-center px-4 py-2.5 ${
                      i < curriculumAssessments.length - 1 ? 'border-b border-border/20' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[11px] font-medium text-foreground truncate">{a.name as string}</p>
                        <span className={`text-[9px] font-semibold border rounded-full px-1.5 py-0.5 ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{a.moduleName as string}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{a.assessmentType as string}</p>
                    <p className="text-[11px] text-foreground">{a.questionCount as number}</p>
                    <p className="text-[11px] text-foreground">{a.passingScore as number}%</p>
                    <p className="text-[11px] text-foreground font-medium">{(a.avgScore as string) ?? '—'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Integration note */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3.5 flex items-start gap-2">
            <ClipboardCheck className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-medium text-foreground mb-0.5">Salesforce integration</p>
              <p className="text-[10px] text-muted-foreground leading-snug">
                Pass/fail results and scores write to <span className="font-mono text-[9px]">Assessment__c</span> in Salesforce.
                Retake rules are enforced via Service Delivery records.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3.5 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-medium text-foreground mb-0.5">Penny coaching</p>
              <p className="text-[10px] text-muted-foreground leading-snug">
                Penny provides personalised feedback on failure and suggests remediation resources.
                Use the Coach button per learner to generate coaching advice.
              </p>
            </div>
          </div>
        </div>

        {/* Missing assessment alert */}
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-medium text-rose-800">
              Missing: Module 4.3 has no linked assessment
            </p>
            <p className="text-[10px] text-rose-700 mt-0.5 leading-snug">
              Portfolio &amp; Career Launch module is missing a knowledge check. Use Penny Content Assistant to generate one.
            </p>
            <button
              onClick={() => {
                setPendingPennyQuery('Generate an assessment for Module 4.3: Portfolio & Career Launch. It should cover portfolio presentation skills, job search strategy, and interview preparation. Suggest 12–15 questions with a 75% pass threshold.');
                setAskPennyOpen(true);
              }}
              className="flex items-center gap-1 mt-1.5 text-[10px] text-rose-700 border border-rose-200 rounded-md px-2 py-1 hover:bg-rose-100 transition-colors"
            >
              <Zap className="w-2.5 h-2.5" /> Generate with Penny
            </button>
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
