import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumAssessments, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { useAppContext } from '@/context/AppContext';
import {
  ClipboardCheck, Sparkles, AlertTriangle, CheckCircle2,
  ChevronRight, Brain, BarChart2, Bot, RefreshCw,
  TrendingUp, Zap, X,
} from 'lucide-react';

// ── Live session data from the DB ─────────────────────────────────────────────

interface LiveSession {
  id:            number;
  learnerEmail:  string;
  instance:      string;
  completedAt:   string | null;
  score:         number;
  passed:        boolean;
  totalAnswered: number;
  totalCorrect:  number;
}

interface OverviewStats {
  total:         number;
  passed:        number;
  passRate:      number;
  avgScore:      number;
  needsCoaching: number;
}

const INSTANCE_LABELS_SHORT: Record<string, string> = {
  'now':    'Baseline',
  'week-6': 'Week 6',
  'end':    'Final',
};

// ── Component ─────────────────────────────────────────────────────────────────

// ── Agentforce coaching panel state ──────────────────────────────────────────

interface AgentCoaching {
  key: string;
  learner: string;
  assessmentName: string;
  query: string;
  status: 'loading' | 'success' | 'error';
  response?: string;
  sessionId?: string;
  error?: string;
}

export default function Assessments() {
  const { setAskPennyOpen, setPendingPennyQuery } = useAppContext();
  const [, setLocation] = useLocation();
  const [filterStatus,   setFilterStatus]   = useState<'all' | 'needs-coaching' | 'failed'>('all');
  const [activeCoaching, setActiveCoaching] = useState<AgentCoaching | null>(null);

  // ── Live data from DB ────────────────────────────────────────────────────────
  const [sessions,  setSessions]  = useState<LiveSession[]>([]);
  const [stats,     setStats]     = useState<OverviewStats | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError,   setDataError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/assessments/staff/overview')
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json() as Promise<{ sessions: LiveSession[]; stats: OverviewStats }>; })
      .then(data => { setSessions(data.sessions ?? []); setStats(data.stats ?? null); setDataLoading(false); })
      .catch((err: unknown) => { setDataError(err instanceof Error ? err.message : 'Failed to load assessment data'); setDataLoading(false); });
  }, []);

  const filtered = sessions.filter(s => {
    if (filterStatus === 'needs-coaching') return !s.passed;
    if (filterStatus === 'failed')         return !s.passed;
    return true;
  });

  async function coachWithBothAIs(learner: string, assessmentId: string, score: number, passed: boolean) {
    const asmnt = curriculumAssessments.find(a => a.id === assessmentId);
    const assessmentName = (asmnt?.name as string) ?? assessmentId;

    const query = passed
      ? `${learner} passed the "${assessmentName}" assessment with a score of ${score}%. What personalised next step should Penny suggest to extend their learning momentum?`
      : `${learner} scored ${score}% on the "${assessmentName}" assessment. They haven't passed yet. What coaching approach should Penny use to help them prepare for a retake?`;

    // 1. Open Penny right panel immediately
    setPendingPennyQuery(query);
    setAskPennyOpen(true);

    // 2. Fire Agentforce in parallel
    const key = `${learner}-${assessmentId}`;
    setActiveCoaching({ key, learner, assessmentName, query, status: 'loading' });

    try {
      const resp = await fetch('/api/agentforce/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          learnerId: learner,   // learner name as proxy; real SF Contact ID would replace this
          programId: asmnt ? String(asmnt.program) : undefined,
        }),
      });
      const data = await resp.json() as {
        ok?: boolean;
        response?: string;
        sessionId?: string;
        detail?: string;
        error?: string;
      };
      if (data.ok && data.response) {
        setActiveCoaching(prev => prev?.key === key
          ? { ...prev, status: 'success', response: data.response, sessionId: data.sessionId }
          : prev
        );
      } else {
        setActiveCoaching(prev => prev?.key === key
          ? { ...prev, status: 'error', error: data.detail ?? data.error ?? 'Agentforce returned no response' }
          : prev
        );
      }
    } catch {
      setActiveCoaching(prev => prev?.key === key
        ? { ...prev, status: 'error', error: 'Network error — could not reach Agentforce' }
        : prev
      );
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="space-y-3">
          <p className="text-[14px] font-bold  text-muted-foreground/50">
            Penny Command Center
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FBEAE6] flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-5 h-5 text-[#A93F2F]" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground">Assessments</h1>
                <p className="text-[14px] text-muted-foreground">
                  Competency assessments administered by Penny — results stored in Salesforce, coaching delivered in-platform.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[14px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2.5 py-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E6F0EA]0" />
              <span className="font-semibold">POC Confirmed</span>
            </div>
          </div>
        </div>

        {/* Stats — live from DB */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Completed',      value: dataLoading ? '…' : String(stats?.total ?? 0),                            color: 'text-foreground',  icon: ClipboardCheck },
            { label: 'Pass Rate',      value: dataLoading ? '…' : `${stats?.passRate ?? 0}%`,                           color: 'text-[#2F6B3F]',   icon: TrendingUp },
            { label: 'Avg Score',      value: dataLoading ? '…' : `${stats?.avgScore ?? 0}%`,                           color: 'text-[#2F6F7E]',   icon: BarChart2 },
            { label: 'Needs Coaching', value: dataLoading ? '…' : String(stats?.needsCoaching ?? 0),                    color: 'text-[#CC8400]',   icon: Brain },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-1.5`} />
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-[14px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Live session results */}
        <div>
          <div className="flex items-center justify-between mb-2.5 gap-3">
            <p className="text-[14px] font-bold text-muted-foreground/60">
              Completed Sessions · Live
            </p>
            <div className="flex items-center gap-1.5">
              {(['all', 'failed', 'needs-coaching'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`text-[14px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
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

          {dataError && (
            <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] p-3 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[#A93F2F] shrink-0" />
              <p className="text-[14px] text-[#A93F2F]">{dataError}</p>
            </div>
          )}

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_140px_70px_70px_90px] gap-x-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
              {['Learner', 'Assessment', 'Score', 'Passed', 'AI Coach'].map(h => (
                <p key={h} className="text-[14px] font-bold text-muted-foreground/60">{h}</p>
              ))}
            </div>
            <div className="bg-card divide-y divide-border">
              {dataLoading && (
                <div className="px-4 py-8 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground/50" />
                  <span className="text-[14px] text-muted-foreground">Loading sessions…</span>
                </div>
              )}
              {!dataLoading && filtered.map(s => {
                const scoreClr = s.score >= 85 ? 'text-[#2F6B3F]' : s.score >= 70 ? 'text-[#2F6F7E]' : 'text-[#A93F2F]';
                const coachKey = `${s.learnerEmail}-${s.id}`;
                const instLabel = INSTANCE_LABELS_SHORT[s.instance] ?? s.instance;
                const dateStr = s.completedAt ? new Date(s.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
                return (
                  <div
                    key={s.id}
                    className="grid grid-cols-[1fr_140px_70px_70px_90px] gap-x-3 items-center px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div>
                      <p className="text-[14px] font-semibold text-foreground truncate" title={s.learnerEmail}>
                        {s.learnerEmail.split('@')[0]}
                      </p>
                      <p className="text-[14px] text-muted-foreground/60 truncate">{s.learnerEmail}</p>
                    </div>
                    <div>
                      <p className="text-[14px] text-foreground">{instLabel}</p>
                      <p className="text-[14px] text-muted-foreground">{dateStr}</p>
                    </div>
                    <p className={`text-[14px] font-bold ${scoreClr}`}>{s.score}%</p>
                    <div>
                      {s.passed
                        ? <CheckCircle2 className="w-4 h-4 text-[#2F6B3F]" />
                        : <AlertTriangle className="w-4 h-4 text-[#A93F2F]" />
                      }
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => void coachWithBothAIs(s.learnerEmail, String(s.id), s.score, s.passed)}
                        className={`flex items-center gap-0.5 text-[14px] border rounded-md px-1.5 py-0.5 transition-colors ${
                          activeCoaching?.key === coachKey && activeCoaching.status === 'loading'
                            ? 'text-cyan-700 border-cyan-300 bg-cyan-50'
                            : 'text-primary border-primary/20 hover:bg-primary/5'
                        }`}
                        title="Coach with Penny + Agentforce"
                        disabled={activeCoaching?.status === 'loading'}
                      >
                        <Brain className="w-2.5 h-2.5" />
                        <Bot className="w-2.5 h-2.5 -ml-0.5" />
                        <span className="ml-0.5">{s.passed ? 'Next' : 'Coach'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {!dataLoading && filtered.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-[14px] text-muted-foreground">
                    {sessions.length === 0
                      ? 'No completed assessment sessions yet. Sessions appear here once learners finish their first Penny assessment.'
                      : 'No results match this filter.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dual-AI coaching panel */}
        {activeCoaching && (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-cyan-200/60 bg-cyan-50">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Brain className="w-3.5 h-3.5 text-[#2F6F7E]" />
                  <Bot className="w-3.5 h-3.5 text-cyan-600" />
                </div>
                <p className="text-[14px] font-semibold text-foreground">
                  Dual-AI Coaching — {activeCoaching.learner}
                </p>
                <span className="text-[14px] text-muted-foreground">· {activeCoaching.assessmentName}</span>
              </div>
              <button
                onClick={() => setActiveCoaching(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss coaching panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-cyan-200/40">
              {/* Penny row */}
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="w-5 h-5 rounded-full bg-[#EDF5F8] flex items-center justify-center shrink-0 mt-0.5">
                  <Brain className="w-3 h-3 text-[#2F6F7E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold  text-[#2F6F7E]/70 mb-0.5">Penny</p>
                  <p className="text-[14px] text-muted-foreground">
                    Panel opened with coaching query — see the Ask Penny panel on the right.
                  </p>
                </div>
                <span className="text-[14px] font-semibold bg-[#EDF5F8] text-[#2F6F7E] rounded-full px-2 py-0.5 shrink-0">Active</span>
              </div>

              {/* Agentforce row */}
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3 h-3 text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold  text-cyan-600/70 mb-0.5">Agentforce</p>

                  {activeCoaching.status === 'loading' && (
                    <div className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
                      <RefreshCw className="w-3 h-3 animate-spin text-cyan-500" />
                      <span>Connecting to Penny – Trail OS Assistant…</span>
                    </div>
                  )}

                  {activeCoaching.status === 'success' && (
                    <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap">
                      {activeCoaching.response}
                    </p>
                  )}

                  {activeCoaching.status === 'error' && (
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-[#CC8400] shrink-0 mt-0.5" />
                      <p className="text-[14px] text-[#CC8400]">{activeCoaching.error}</p>
                    </div>
                  )}

                  {activeCoaching.sessionId && (
                    <p className="text-[14px] text-muted-foreground/50 mt-1 font-mono">
                      Session {activeCoaching.sessionId.slice(0, 16)}…
                    </p>
                  )}
                </div>
                <span className={`text-[14px] font-semibold rounded-full px-2 py-0.5 shrink-0 ${
                  activeCoaching.status === 'loading' ? 'bg-cyan-100 text-cyan-700' :
                  activeCoaching.status === 'success' ? 'bg-[#E6F0EA] text-[#2F6B3F]' :
                  'bg-[#FFF3E0] text-[#CC8400]'
                }`}>
                  {activeCoaching.status === 'loading' ? 'Connecting' :
                   activeCoaching.status === 'success' ? 'Responded' : 'Error'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Assessment catalogue summary */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[14px] font-bold  text-muted-foreground/60">
              Assessment Catalogue · Foundations Trail
            </p>
            <button
              onClick={() => setLocation('/program/curriculum')}
              className="flex items-center gap-1 text-[14px] text-primary hover:underline"
            >
              Edit in Curriculum Studio <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_130px_60px_70px_60px] gap-x-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
              {['Assessment', 'Type', 'Qs', 'Pass %', 'Avg'].map(h => (
                <p key={h} className="text-[14px] font-bold  text-muted-foreground/60">{h}</p>
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
                        <p className="text-[14px] font-medium text-foreground truncate">{a.name as string}</p>
                        <span className={`text-[14px] font-semibold border rounded-full px-1.5 py-0.5 ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-[14px] text-muted-foreground truncate">{a.moduleName as string}</p>
                    </div>
                    <p className="text-[14px] text-muted-foreground">{a.assessmentType as string}</p>
                    <p className="text-[14px] text-foreground">{a.questionCount as number}</p>
                    <p className="text-[14px] text-foreground">{a.passingScore as number}%</p>
                    <p className="text-[14px] text-foreground font-medium">{(a.avgScore as string) ?? '—'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Integration note */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#FBEAE6] bg-[#FBEAE6]/50 p-3.5 flex items-start gap-2">
            <ClipboardCheck className="w-3.5 h-3.5 text-[#A93F2F] shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-medium text-foreground mb-0.5">Salesforce integration</p>
              <p className="text-[14px] text-muted-foreground leading-snug">
                Pass/fail results and scores write to <span className="font-mono text-[14px]">Assessment__c</span> in Salesforce.
                Retake rules are enforced via Service Delivery records.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[#EDF5F8] bg-[#EDF5F8]/50 p-3.5 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#2F6F7E] shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-medium text-foreground mb-0.5">Penny coaching</p>
              <p className="text-[14px] text-muted-foreground leading-snug">
                Penny provides personalised feedback on failure and suggests remediation resources.
                Use the Coach button per learner to generate coaching advice.
              </p>
            </div>
          </div>
        </div>

        {/* Missing assessment alert */}
        <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[#A93F2F] shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-medium text-[#A93F2F]">
              Missing: Module 4.3 has no linked assessment
            </p>
            <p className="text-[14px] text-[#A93F2F] mt-0.5 leading-snug">
              Portfolio &amp; Career Launch module is missing a knowledge check. Use Penny Content Assistant to generate one.
            </p>
            <button
              onClick={() => {
                setPendingPennyQuery('Generate an assessment for Module 4.3: Portfolio & Career Launch. It should cover portfolio presentation skills, job search strategy, and interview preparation. Suggest 12–15 questions with a 75% pass threshold.');
                setAskPennyOpen(true);
              }}
              className="flex items-center gap-1 mt-1.5 text-[14px] text-[#A93F2F] border border-[#E8B9B4] rounded-md px-2 py-1 hover:bg-[#FBEAE6] transition-colors"
            >
              <Zap className="w-2.5 h-2.5" /> Generate with Penny
            </button>
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
