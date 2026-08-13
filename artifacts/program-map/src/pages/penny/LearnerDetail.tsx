import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, User, MessageSquare, ClipboardList, Briefcase,
  CheckCircle2, XCircle, X, Pencil, Loader2, CalendarDays, Clock, Users,
  ChevronDown, ChevronUp, ClipboardCheck, BarChart2, AlertTriangle, Brain,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LearnerProfile {
  id:                 string;
  firstName:          string;
  lastName:           string;
  email:              string;
  pennyTrail:         string | null;
  pennyTrailConfigId: string | null;
  currentPhase:       string | null;
  currentGoal:        string | null;
  currentBlockers:    string | null;
  coachingTone:       string | null;
  confidenceScore:    number | null;
  skillScore:         number | null;
  sprintWeek:         number | null;
  onboardingComplete: boolean;
}

interface TrailConfigOption {
  id:      string;
  name:    string;
  trailId: string;
}

interface Interaction {
  id:            string;
  userMessage:   string;
  pennyResponse: string;
  promptMode:    string;
  source:        string;
  createdDate:   string;
}

interface QuestSubmission {
  id:             string;
  name:           string;
  submissionText: string;
  submittedAt:    string;
}

interface CareerReview {
  id:            string;
  targetRole:    string;
  readinessLabel: string;
  reviewedAt:    string;
  reviewMode:    string;
  feedbackJson:  string;
  areaScores:    string;
}

type TabId = 'profile' | 'conversations' | 'quests' | 'career' | 'sessions' | 'assessments';

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'profile',       label: 'Profile',          icon: User },
  { id: 'conversations', label: 'Conversations',     icon: MessageSquare },
  { id: 'sessions',      label: 'Sessions',          icon: CalendarDays },
  { id: 'assessments',   label: 'Assessments',       icon: ClipboardCheck },
  { id: 'quests',        label: 'Quest Submissions', icon: ClipboardList },
  { id: 'career',        label: 'Career Reviews',    icon: Briefcase },
];

const TRAIL_OPTIONS: { value: string; label: string }[] = [
  { value: 'Guided Trail',      label: 'Guided Trail' },
  { value: 'Foundations Trail', label: 'Foundations Trail' },
  { value: 'Trail of Mastery',  label: 'Trail of Mastery' },
  { value: 'explorer-journey',  label: "Explorer's Trail" },
];

const TONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Warm',          label: 'Warm' },
  { value: 'Professional',  label: 'Professional' },
  { value: 'Challenging.',  label: 'Challenging' },
];

function trailValueToId(trail: string): string {
  return trail.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days   = Math.floor(diffMs / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ScoreBar({ value, max = 10, color }: { value: number | null; max?: number; color: string }) {
  if (value === null) return <span className="text-[14px] text-muted-foreground">—</span>;
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[14px] font-medium text-foreground w-10 shrink-0">{value}/{max}</span>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-2 border-b border-border/50 last:border-0">
      <span className="text-[14px] font-semibold text-muted-foreground ">{label}</span>
      <span className="text-[14px] text-foreground">{value ?? '—'}</span>
    </div>
  );
}

function SkeletonBlock({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-muted rounded" style={{ width: `${65 + (i % 3) * 12}%` }} />
      ))}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] p-4 text-center">
      <p className="text-[14px] text-[#A93F2F] font-medium">{message}</p>
      <p className="text-[14px] text-[#A93F2F]/70 mt-1">Check Salesforce authentication in Admin → Integrations.</p>
    </div>
  );
}

// ── Profile panel ──────────────────────────────────────────────────────────────

function ProfilePanel({
  profile,
  loading,
  error,
  onEdit,
}: {
  profile: LearnerProfile | null;
  loading: boolean;
  error:   string | null;
  onEdit:  () => void;
}) {
  if (loading) return <SkeletonBlock lines={8} />;
  if (error)   return <ErrorBox message={error} />;
  if (!profile) return <p className="text-[14px] text-muted-foreground">Learner not found.</p>;

  const trailDisplay =
    TRAIL_OPTIONS.find(t => t.value === profile.pennyTrail)?.label ?? profile.pennyTrail;

  return (
    <div className="space-y-6">
      {/* Name + edit button row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-bold text-foreground">
            {profile.firstName} {profile.lastName}
          </p>
          <p className="text-[14px] text-muted-foreground">{profile.email}</p>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold border border-border rounded-full hover:bg-muted/40 transition-colors shrink-0"
        >
          <Pencil className="w-3 h-3" />
          Edit Learner
        </button>
      </div>

      {/* Fields */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-0">
        <FieldRow label="Trail"         value={trailDisplay} />
        <FieldRow label="Current Phase" value={profile.currentPhase} />
        <FieldRow label="Current Goal"  value={profile.currentGoal} />
        <FieldRow label="Coaching Tone" value={
          profile.coachingTone === 'Challenging.' ? 'Challenging' : profile.coachingTone
        } />
        <FieldRow label="Sprint Week"   value={profile.sprintWeek !== null ? `Week ${profile.sprintWeek}` : null} />
        <div className="grid grid-cols-[140px_1fr] gap-2 py-2 border-b border-border/50">
          <span className="text-[14px] font-semibold text-muted-foreground ">Onboarding</span>
          <span className="flex items-center gap-1.5">
            {profile.onboardingComplete
              ? <><CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F]" /><span className="text-[14px] text-[#2F6B3F]">Complete</span></>
              : <><XCircle       className="w-3.5 h-3.5 text-[#CC8400]"  /><span className="text-[14px] text-[#CC8400]">Pending</span></>
            }
          </span>
        </div>
      </div>

      {/* Scores */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <p className="text-[14px] font-bold  text-muted-foreground/50">Scores</p>
        <div>
          <p className="text-[14px] font-medium text-muted-foreground mb-1.5">Confidence</p>
          <ScoreBar value={profile.confidenceScore} color="bg-[#EDF5F8]0" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-muted-foreground mb-1.5">Skill</p>
          <ScoreBar value={profile.skillScore} color="bg-[#EDF5F8]0" />
        </div>
      </div>

      {/* Blockers */}
      {profile.currentBlockers && (
        <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] p-4">
          <p className="text-[14px] font-bold  text-[#CC8400]/70 mb-1.5">Current Blockers</p>
          <p className="text-[14px] text-[#CC8400] leading-relaxed whitespace-pre-line">{profile.currentBlockers}</p>
        </div>
      )}
    </div>
  );
}

// ── Conversations panel ────────────────────────────────────────────────────────

function ConversationsPanel({ contactId }: { contactId: string }) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/penny/data/learner/${contactId}/interactions?limit=50`)
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json() as Promise<Interaction[]>; })
      .then(data => { setInteractions(data); setLoading(false); })
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : 'Failed to load conversations'); setLoading(false); });
  }, [contactId]);

  if (loading) return <SkeletonBlock lines={6} />;
  if (error)   return <ErrorBox message={error} />;
  if (interactions.length === 0) return <p className="text-[14px] text-muted-foreground text-center py-8">No conversations yet.</p>;

  return (
    <div className="space-y-6">
      {interactions.map(ix => (
        <div key={ix.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-muted-foreground/60">{relativeTime(ix.createdDate)}</span>
            <span className="text-[14px] font-medium px-1.5 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">{ix.promptMode}</span>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[75%] bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-3 py-2">
              <p className="text-[14px] text-foreground leading-relaxed">{ix.userMessage}</p>
            </div>
          </div>
          {ix.pennyResponse && (
            <div className="flex justify-start">
              <div className="max-w-[75%] bg-card border border-border rounded-2xl rounded-tl-sm px-3 py-2">
                <p className="text-[14px] font-medium text-[#2F6F7E] mb-0.5">Penny</p>
                <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-line">{ix.pennyResponse}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Quests panel ───────────────────────────────────────────────────────────────

function QuestsPanel({ contactId }: { contactId: string }) {
  const [quests, setQuests]     = useState<QuestSubmission[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/penny/data/learner/${contactId}/quests`)
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json() as Promise<QuestSubmission[]>; })
      .then(data => { setQuests(data); setLoading(false); })
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : 'Failed to load quest submissions'); setLoading(false); });
  }, [contactId]);

  if (loading) return <SkeletonBlock lines={4} />;
  if (error)   return <ErrorBox message={error} />;
  if (quests.length === 0) return <p className="text-[14px] text-muted-foreground text-center py-8">No quest submissions yet.</p>;

  return (
    <div className="space-y-3">
      {quests.map(q => {
        const isExpanded = expanded.has(q.id);
        const truncated  = q.submissionText.length > 200 && !isExpanded;
        return (
          <div key={q.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[14px] font-semibold text-foreground">{q.name}</p>
              <span className="text-[14px] text-muted-foreground shrink-0">{formatDate(q.submittedAt)}</span>
            </div>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              {truncated ? `${q.submissionText.slice(0, 200)}…` : q.submissionText}
            </p>
            {q.submissionText.length > 200 && (
              <button
                onClick={() => setExpanded(prev => { const next = new Set(prev); isExpanded ? next.delete(q.id) : next.add(q.id); return next; })}
                className="text-[14px] text-primary hover:underline mt-1.5"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Career panel ───────────────────────────────────────────────────────────────

function CareerPanel({ contactId }: { contactId: string }) {
  const [reviews, setReviews] = useState<CareerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/penny/data/learner/${contactId}/career-reviews`)
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json() as Promise<CareerReview[]>; })
      .then(data => { setReviews(data); setLoading(false); })
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : 'Failed to load career reviews'); setLoading(false); });
  }, [contactId]);

  if (loading) return <SkeletonBlock lines={5} />;
  if (error)   return <ErrorBox message={error} />;
  if (reviews.length === 0) return <p className="text-[14px] text-muted-foreground text-center py-8">No career reviews yet.</p>;

  return (
    <div className="space-y-4">
      {reviews.map(r => {
        let feedbackParsed: Record<string, unknown> | null = null;
        try { feedbackParsed = JSON.parse(r.feedbackJson) as Record<string, unknown>; } catch { /* ok */ }
        return (
          <div key={r.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[14px] font-semibold text-foreground">{r.targetRole || '—'}</p>
                <p className="text-[14px] text-muted-foreground">{formatDate(r.reviewedAt)} · {r.reviewMode}</p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[14px] font-semibold bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E] shrink-0">{r.readinessLabel}</span>
            </div>
            {feedbackParsed !== null ? (
              <div className="space-y-1.5">
                {Object.entries(feedbackParsed).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-[14px] font-semibold text-muted-foreground  truncate">{k}</span>
                    <span className="text-[14px] text-foreground">{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-line">{r.feedbackJson}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Assessments panel ──────────────────────────────────────────────────────────

const INSTANCE_LABELS: Record<string, string> = {
  'now':    'Baseline',
  'week-6': 'Week 6',
  'end':    'Final',
};

const DOMAIN_BAR_COLORS: Record<string, string> = {
  'config-setup':           '#3B82F6',
  'object-manager-builder': '#7C3AED',
  'sales-marketing':        '#10B981',
  'service-support':        '#F97316',
  'productivity':           '#F59E0B',
  'data-analytics':         '#14B8A6',
  'workflow-automation':    '#6366F1',
  'security-access':        '#F43F5E',
};

interface AssessmentSessionRecord {
  id:            number;
  learnerEmail:  string;
  instance:      string;
  status:        string;
  completedAt:   string | null;
  startedAt:     string;
  overallScore:  number;
  passed:        boolean;
  totalAnswered: number;
  totalCorrect:  number;
  calibrated:    number;
  misconception: number;
  domainReads:   Array<{
    domain: string; domainLabel: string;
    answeredCount: number; correctCount: number;
    read: 'settled' | 'reading' | 'not_yet';
  }>;
}

function AssessmentSessionCard({ session }: { session: AssessmentSessionRecord }) {
  const [expanded, setExpanded] = useState(false);
  const inst  = INSTANCE_LABELS[session.instance] ?? session.instance;
  const score = session.overallScore;
  const scoreColor = session.passed ? '#2F6B3F' : score >= 55 ? '#CC8400' : '#A93F2F';
  const scoreBg    = session.passed ? '#E6F0EA' : score >= 55 ? '#FFF3E0' : '#FBEAE6';
  const domains    = session.domainReads.filter(d => d.answeredCount > 0);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button className="w-full text-left p-3.5" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-foreground">{inst} Assessment</span>
              <span
                className="text-[11px] font-bold border rounded-full px-1.5 py-0.5"
                style={{ background: scoreBg, color: scoreColor, borderColor: scoreColor + '50' }}
              >
                {session.passed ? 'Passed' : 'Not yet'}
              </span>
              <span className="text-[14px] font-bold" style={{ color: scoreColor }}>{score}%</span>
              {session.completedAt && (
                <span className="text-[14px] text-muted-foreground">{formatDate(session.completedAt)}</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[14px] text-muted-foreground">
              <span>{session.totalAnswered} items · {session.totalCorrect} correct</span>
              {session.misconception > 0 && (
                <span className="flex items-center gap-1 text-[#A93F2F]">
                  <AlertTriangle className="w-3 h-3" />{session.misconception} misconception{session.misconception > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="text-muted-foreground/40 shrink-0">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-4 py-3 bg-muted/10 space-y-3">
          {/* Domain scores */}
          {domains.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide">Domain Breakdown</p>
              {domains.map(d => {
                const pct  = d.answeredCount > 0 ? Math.round((d.correctCount / d.answeredCount) * 100) : 0;
                const bar  = DOMAIN_BAR_COLORS[d.domain] ?? '#6B7280';
                const settled = d.read === 'settled';
                return (
                  <div key={d.domain} className="flex items-center gap-2">
                    <p className="text-[12px] text-muted-foreground w-36 shrink-0 truncate" title={d.domainLabel}>{d.domainLabel}</p>
                    <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: bar }} />
                    </div>
                    <span className="text-[12px] font-semibold w-8 text-right shrink-0" style={{ color: bar }}>{pct}%</span>
                    <span className="text-[10px] rounded-full px-1.5 py-0.5 border shrink-0 w-14 text-center"
                      style={settled ? { background: '#E6F0EA', color: '#2F6B3F', borderColor: '#9FC3AE' } : { background: '#EDF5F8', color: '#2F6F7E', borderColor: '#7FAFC6' }}>
                      {settled ? 'Settled' : 'Reading'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Confidence calibration */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide mb-1.5">Confidence Calibration</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Calibrated',         count: session.calibrated,    color: '#2F6B3F', bg: '#E6F0EA', icon: CheckCircle2 },
                { label: 'Misconception risk',  count: session.misconception, color: '#A93F2F', bg: '#FBEAE6', icon: AlertTriangle },
              ].map(c => (
                <div key={c.label} className="rounded border px-2.5 py-2 flex items-center gap-2"
                  style={{ background: c.bg, borderColor: c.color + '40' }}>
                  <c.icon className="w-3 h-3 shrink-0" style={{ color: c.color }} />
                  <span className="text-[12px] font-bold" style={{ color: c.color }}>{c.count}</span>
                  <span className="text-[12px] text-muted-foreground">{c.label}</span>
                </div>
              ))}
            </div>
            {session.misconception > 0 && (
              <p className="text-[11px] text-[#A93F2F] mt-1.5 flex items-center gap-1">
                <Brain className="w-3 h-3 shrink-0" />
                Use the Coach button to generate a Penny debrief for these misconception areas.
              </p>
            )}
          </div>
          <p className="text-[14px] text-muted-foreground/40">Session #{session.id}</p>
        </div>
      )}
    </div>
  );
}

function AssessmentsPanel({ learnerEmail }: { learnerEmail: string | null }) {
  const [sessions, setSessions] = useState<AssessmentSessionRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!learnerEmail) { setLoading(false); return; }
    fetch(`/api/assessments/staff/sessions?learnerEmail=${encodeURIComponent(learnerEmail)}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json() as Promise<{ sessions: AssessmentSessionRecord[] }>; })
      .then(data => { setSessions(data.sessions ?? []); setLoading(false); })
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : 'Failed to load assessment sessions'); setLoading(false); });
  }, [learnerEmail]);

  if (!learnerEmail) return <p className="text-[14px] text-muted-foreground text-center py-8">No email on record — cannot look up assessments.</p>;
  if (loading)       return <SkeletonBlock lines={5} />;
  if (error)         return <ErrorBox message={error} />;
  if (sessions.length === 0) return (
    <div className="text-center py-8 space-y-2">
      <ClipboardCheck className="w-8 h-8 text-muted-foreground/30 mx-auto" />
      <p className="text-[14px] text-muted-foreground">No assessment sessions yet for this learner.</p>
      <p className="text-[14px] text-muted-foreground/60">Sessions appear here once the learner completes a Penny assessment.</p>
    </div>
  );

  const passedCount = sessions.filter(s => s.passed).length;
  const avgScore    = sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + s.overallScore, 0) / sessions.length) : 0;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Sessions',  value: sessions.length,                  icon: ClipboardCheck },
          { label: 'Passed',    value: `${passedCount}/${sessions.length}`, icon: CheckCircle2 },
          { label: 'Avg Score', value: `${avgScore}%`,                   icon: BarChart2 },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
            <s.icon className="w-3.5 h-3.5 text-muted-foreground/60 mx-auto mb-1" />
            <p className="text-base font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Session cards */}
      <div className="space-y-2">
        {sessions.map(s => <AssessmentSessionCard key={s.id} session={s} />)}
      </div>

      <p className="text-[14px] text-muted-foreground/40 text-center">
        Matched by learner email · Trail OS local DB
      </p>
    </div>
  );
}

// ── Sessions panel ─────────────────────────────────────────────────────────────

interface SessionRecord {
  id: string;
  sessionType: string | null;
  sessionDate: string | null;
  coachName: string | null;
  learnerName: string | null;
  program: string | null;
  durationMinutes: number | null;
  notes: string | null;
  status: string | null;
  createdDate: string;
}

function sessionStatusColor(s: string | null): string {
  switch (s?.toLowerCase()) {
    case 'completed':   return 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]';
    case 'no-show':     return 'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]';
    case 'rescheduled': return 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]';
    case 'pending':     return 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]';
    default:            return 'bg-muted text-muted-foreground border-border';
  }
}

function sessionTypeIcon(t: string | null) {
  if (t === 'Campfire Session') return Users;
  if (t === 'Private Session')  return CalendarDays;
  return Clock;
}

function SessionHistoryRow({ session }: { session: SessionRecord }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = sessionTypeIcon(session.sessionType);

  return (
    <div className="rounded-lg border border-border bg-card hover:bg-muted/10 transition-colors">
      <button className="w-full text-left p-3.5" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-center gap-3">
          <Icon className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-foreground">
                {session.sessionType ?? 'Session'}
              </span>
              {session.status && (
                <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 ${sessionStatusColor(session.status)}`}>
                  {session.status}
                </span>
              )}
              {session.sessionDate && (
                <span className="text-[14px] text-muted-foreground">{formatDate(session.sessionDate)}</span>
              )}
              {session.durationMinutes && (
                <span className="text-[14px] text-muted-foreground/70">{session.durationMinutes} min</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[14px] text-muted-foreground">
              {session.coachName && <span>Coach: {session.coachName}</span>}
              {session.coachName && session.program && <span className="text-muted-foreground/30">·</span>}
              {session.program && <span>{session.program}</span>}
            </div>
          </div>
          <div className="text-muted-foreground/40 shrink-0">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border/50 px-4 py-3 bg-muted/20 space-y-2">
          {session.notes ? (
            <div>
              <p className="text-[14px] font-bold text-muted-foreground/50 mb-1">Notes</p>
              <p className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{session.notes}</p>
            </div>
          ) : (
            <p className="text-[14px] text-muted-foreground/50 italic">No notes recorded.</p>
          )}
          <p className="text-[14px] text-muted-foreground/40">SF ID: {session.id} · Logged {formatDate(session.createdDate)}</p>
        </div>
      )}
    </div>
  );
}

function SessionsPanel({ contactId }: { contactId: string }) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sessions?learnerId=${encodeURIComponent(contactId)}&limit=100`)
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json() as Promise<{ sessions: SessionRecord[]; total: number }>; })
      .then(data => { setSessions(data.sessions ?? []); setTotal(data.total ?? 0); setLoading(false); })
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : 'Failed to load sessions'); setLoading(false); });
  }, [contactId]);

  if (loading) return <SkeletonBlock lines={4} />;
  if (error)   return <ErrorBox message={error} />;
  if (sessions.length === 0) return (
    <p className="text-[14px] text-muted-foreground text-center py-8">No sessions logged for this learner.</p>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[14px] text-muted-foreground">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          {total > sessions.length ? ` · ${total} total in Salesforce` : ''}
        </p>
        <span className="text-[14px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-md px-2 py-0.5">
          Salesforce · TT_Session_Log__c
        </span>
      </div>
      {sessions.map(s => <SessionHistoryRow key={s.id} session={s} />)}
    </div>
  );
}

// ── Edit Drawer ────────────────────────────────────────────────────────────────

interface EditTrailForm {
  pennyTrail:         string;
  pennyTrailConfigId: string;
}

interface EditCoachingForm {
  Penny_Coaching_Tone__c:       string;
  Penny_Current_Phase__c:       string;
  Penny_Current_Goal__c:        string;
  Penny_Current_Blockers__c:    string;
  Penny_Confidence_Score__c:    string;
  Penny_Skill_Score__c:         string;
  Penny_Sprint_Week__c:         string;
  Penny_Onboarding_Complete__c: boolean;
}

function EditDrawer({
  open,
  onClose,
  profile,
  trailConfigs,
  contactId,
  onSaved,
}: {
  open:         boolean;
  onClose:      () => void;
  profile:      LearnerProfile;
  trailConfigs: TrailConfigOption[];
  contactId:    string;
  onSaved:      () => void;
}) {
  const [trailForm, setTrailForm]       = useState<EditTrailForm>({ pennyTrail: '', pennyTrailConfigId: '' });
  const [trailSaving, setTrailSaving]   = useState(false);
  const [trailError, setTrailError]     = useState<string | null>(null);
  const [trailSuccess, setTrailSuccess] = useState(false);

  const [coachingForm, setCoachingForm]       = useState<EditCoachingForm>({
    Penny_Coaching_Tone__c:       '',
    Penny_Current_Phase__c:       '',
    Penny_Current_Goal__c:        '',
    Penny_Current_Blockers__c:    '',
    Penny_Confidence_Score__c:    '',
    Penny_Skill_Score__c:         '',
    Penny_Sprint_Week__c:         '',
    Penny_Onboarding_Complete__c: false,
  });
  const [coachingSaving, setCoachingSaving]   = useState(false);
  const [coachingError, setCoachingError]     = useState<string | null>(null);
  const [coachingSuccess, setCoachingSuccess] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setTrailForm({
        pennyTrail:         profile.pennyTrail         ?? '',
        pennyTrailConfigId: profile.pennyTrailConfigId ?? '',
      });
      setCoachingForm({
        Penny_Coaching_Tone__c:       profile.coachingTone       ?? '',
        Penny_Current_Phase__c:       profile.currentPhase       ?? '',
        Penny_Current_Goal__c:        profile.currentGoal        ?? '',
        Penny_Current_Blockers__c:    profile.currentBlockers    ?? '',
        Penny_Confidence_Score__c:    profile.confidenceScore    !== null ? String(profile.confidenceScore) : '',
        Penny_Skill_Score__c:         profile.skillScore         !== null ? String(profile.skillScore)      : '',
        Penny_Sprint_Week__c:         profile.sprintWeek         !== null ? String(profile.sprintWeek)      : '',
        Penny_Onboarding_Complete__c: profile.onboardingComplete ?? false,
      });
      setTrailError(null);
      setCoachingError(null);
      setTrailSuccess(false);
      setCoachingSuccess(false);
    }
  }, [open, profile]);

  function handleTrailChange(val: string) {
    const matchedConfig = trailConfigs.find(c => c.trailId === trailValueToId(val));
    setTrailForm(prev => ({
      pennyTrail:         val,
      pennyTrailConfigId: matchedConfig ? matchedConfig.id : prev.pennyTrailConfigId,
    }));
  }

  async function handleSaveTrail() {
    setTrailSaving(true);
    setTrailError(null);
    try {
      const resp = await fetch(`/api/penny/data/learner/${contactId}/trail`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(trailForm),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` })) as { error?: string };
        throw new Error(data.error ?? `HTTP ${resp.status}`);
      }
      setTrailSuccess(true);
      onSaved();
      setTimeout(() => setTrailSuccess(false), 3000);
    } catch (err: unknown) {
      setTrailError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setTrailSaving(false);
    }
  }

  async function handleSaveCoaching() {
    setCoachingSaving(true);
    setCoachingError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (coachingForm.Penny_Coaching_Tone__c)    payload.Penny_Coaching_Tone__c    = coachingForm.Penny_Coaching_Tone__c;
      if (coachingForm.Penny_Current_Phase__c)     payload.Penny_Current_Phase__c    = coachingForm.Penny_Current_Phase__c;
      if (coachingForm.Penny_Current_Goal__c)      payload.Penny_Current_Goal__c     = coachingForm.Penny_Current_Goal__c;
      if (coachingForm.Penny_Current_Blockers__c)  payload.Penny_Current_Blockers__c = coachingForm.Penny_Current_Blockers__c;
      if (coachingForm.Penny_Confidence_Score__c !== '') payload.Penny_Confidence_Score__c = Number(coachingForm.Penny_Confidence_Score__c);
      if (coachingForm.Penny_Skill_Score__c     !== '') payload.Penny_Skill_Score__c      = Number(coachingForm.Penny_Skill_Score__c);
      if (coachingForm.Penny_Sprint_Week__c     !== '') payload.Penny_Sprint_Week__c      = Number(coachingForm.Penny_Sprint_Week__c);
      payload.Penny_Onboarding_Complete__c = coachingForm.Penny_Onboarding_Complete__c;

      const resp = await fetch(`/api/penny/data/learner/${contactId}/coaching`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` })) as { error?: string };
        throw new Error(data.error ?? `HTTP ${resp.status}`);
      }
      setCoachingSuccess(true);
      onSaved();
      setTimeout(() => setCoachingSuccess(false), 3000);
    } catch (err: unknown) {
      setCoachingError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setCoachingSaving(false);
    }
  }

  const inputCls    = 'w-full h-7 rounded-md border border-input bg-white px-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const textareaCls = 'w-full rounded-md border border-input bg-white px-2.5 py-1.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y';
  const labelCls    = 'block text-[14px] font-bold text-foreground mb-1';
  const noteCls     = 'text-[14px] text-muted-foreground leading-snug mb-3';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim */}
          <motion.div
            key="learner-edit-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/10"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="learner-edit-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[440px] bg-card border-l border-border shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-shrink-0 bg-card">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#EDF5F8] flex items-center justify-center shrink-0">
                  <Pencil className="w-3.5 h-3.5 text-[#2F6F7E]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-foreground leading-tight truncate">
                    Edit Learner — {profile.firstName} {profile.lastName}
                  </p>
                  <p className="text-[14px] text-muted-foreground truncate">{profile.email}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Close edit drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

              {/* ── Section 1: Trail Assignment ─────────────────────────── */}
              <div className="rounded-lg border border-border bg-background p-4 space-y-4">
                <div>
                  <p className="text-[14px] font-bold text-foreground  mb-0.5">Trail Assignment</p>
                  <p className={noteCls}>Changing the trail updates which Penny persona this learner receives.</p>
                </div>

                <div>
                  <label className={labelCls}>Trail</label>
                  <select
                    value={trailForm.pennyTrail}
                    onChange={e => handleTrailChange(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select trail…</option>
                    {TRAIL_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Trail Config</label>
                  <select
                    value={trailForm.pennyTrailConfigId}
                    onChange={e => setTrailForm(prev => ({ ...prev, pennyTrailConfigId: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select config…</option>
                    {trailConfigs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p className="text-[14px] text-muted-foreground mt-1 leading-snug">
                    Config auto-matches when you select a trail, or choose manually.
                  </p>
                </div>

                {trailError && (
                  <p className="text-[14px] text-[#A93F2F] bg-[#FBEAE6] border border-[#E8B9B4] rounded px-2.5 py-1.5">{trailError}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {trailSuccess && (
                    <span className="flex items-center gap-1 text-[14px] text-[#2F6B3F] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                  <button
                    onClick={() => void handleSaveTrail()}
                    disabled={trailSaving || !trailForm.pennyTrail || !trailForm.pennyTrailConfigId}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-bold bg-foreground text-background rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {trailSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Save Trail
                  </button>
                </div>
              </div>

              {/* ── Section 2: Coaching Context ─────────────────────────── */}
              <div className="rounded-lg border border-border bg-background p-4 space-y-4">
                <div>
                  <p className="text-[14px] font-bold text-foreground  mb-0.5">Coaching Context</p>
                  <p className={noteCls}>These fields feed directly into Penny's system prompt for this learner.</p>
                </div>

                <div>
                  <label className={labelCls}>Coaching Tone</label>
                  <select
                    value={coachingForm.Penny_Coaching_Tone__c}
                    onChange={e => setCoachingForm(prev => ({ ...prev, Penny_Coaching_Tone__c: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select tone…</option>
                    {TONE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Current Phase</label>
                  <input
                    type="text"
                    maxLength={255}
                    value={coachingForm.Penny_Current_Phase__c}
                    onChange={e => setCoachingForm(prev => ({ ...prev, Penny_Current_Phase__c: e.target.value }))}
                    placeholder="e.g. Phase 2 — Job Search"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Current Goal</label>
                  <input
                    type="text"
                    maxLength={255}
                    value={coachingForm.Penny_Current_Goal__c}
                    onChange={e => setCoachingForm(prev => ({ ...prev, Penny_Current_Goal__c: e.target.value }))}
                    placeholder="e.g. Land first Salesforce Admin role"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Current Blockers</label>
                  <textarea
                    value={coachingForm.Penny_Current_Blockers__c}
                    onChange={e => setCoachingForm(prev => ({ ...prev, Penny_Current_Blockers__c: e.target.value }))}
                    placeholder="What's getting in the way?"
                    className={`${textareaCls} min-h-[80px]`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Confidence Score</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      value={coachingForm.Penny_Confidence_Score__c}
                      onChange={e => setCoachingForm(prev => ({ ...prev, Penny_Confidence_Score__c: e.target.value }))}
                      placeholder="0–10"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Skill Score</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      value={coachingForm.Penny_Skill_Score__c}
                      onChange={e => setCoachingForm(prev => ({ ...prev, Penny_Skill_Score__c: e.target.value }))}
                      placeholder="0–10"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Sprint Week</label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    step={1}
                    value={coachingForm.Penny_Sprint_Week__c}
                    onChange={e => setCoachingForm(prev => ({ ...prev, Penny_Sprint_Week__c: e.target.value }))}
                    placeholder="1–52"
                    className={inputCls}
                  />
                </div>

                <div className="flex items-center gap-2.5">
                  <input
                    id="onboarding-complete"
                    type="checkbox"
                    checked={coachingForm.Penny_Onboarding_Complete__c}
                    onChange={e => setCoachingForm(prev => ({ ...prev, Penny_Onboarding_Complete__c: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded border-border accent-primary"
                  />
                  <label htmlFor="onboarding-complete" className="text-[14px] font-medium text-foreground cursor-pointer">
                    Onboarding Complete
                  </label>
                </div>

                {coachingError && (
                  <p className="text-[14px] text-[#A93F2F] bg-[#FBEAE6] border border-[#E8B9B4] rounded px-2.5 py-1.5">{coachingError}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {coachingSuccess && (
                    <span className="flex items-center gap-1 text-[14px] text-[#2F6B3F] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                  <button
                    onClick={() => void handleSaveCoaching()}
                    disabled={coachingSaving}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-bold bg-foreground text-background rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {coachingSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Save Coaching Context
                  </button>
                </div>
              </div>

              {/* Live notice */}
              <div className="rounded border border-[#9FC3AE] bg-[#E6F0EA]/60 px-3 py-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E6F0EA]0 shrink-0 inline-block" />
                <p className="text-[14px] text-[#245531] leading-snug">
                  <strong>Live · Salesforce.</strong> Changes write directly to the Contact record in production.
                </p>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LearnerDetail({ params }: { params?: { contactId?: string } }) {
  const contactId = params?.contactId ?? '';
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const loadedTabs = useRef<Set<TabId>>(new Set(['profile']));

  const [profile, setProfile]           = useState<LearnerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [trailConfigs, setTrailConfigs] = useState<TrailConfigOption[]>([]);

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);

  const fetchProfile = useCallback(() => {
    setProfileLoading(true);
    setProfileError(null);
    fetch(`/api/penny/data/learner/${contactId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json() as Promise<LearnerProfile>; })
      .then(data => { setProfile(data); setProfileLoading(false); })
      .catch((err: unknown) => { setProfileError(err instanceof Error ? err.message : 'Failed to load profile'); setProfileLoading(false); });
  }, [contactId]);

  useEffect(() => {
    if (!contactId) return;
    fetchProfile();
    fetch('/api/penny/data/trail-configs')
      .then(r => r.ok ? r.json() as Promise<TrailConfigOption[]> : Promise.resolve([]))
      .then(data => setTrailConfigs(data))
      .catch(() => { /* non-critical */ });
  }, [contactId, fetchProfile]);

  function handleTabClick(id: TabId) {
    loadedTabs.current.add(id);
    setActiveTab(id);
  }

  function openEdit() {
    setEditDrawerOpen(true);
  }

  if (!contactId) {
    return (
      <div className="p-6 text-center">
        <p className="text-[14px] text-muted-foreground">No learner ID provided.</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="">

          {/* ── Back + header ──────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-border sticky top-0 bg-background z-10">
            <button
              onClick={() => navigate('/penny/learners')}
              className="flex items-center gap-1.5 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Learners
            </button>
            <span className="text-muted-foreground/30">/</span>
            <span className="text-[14px] text-foreground font-medium truncate">
              {profile ? `${profile.firstName} ${profile.lastName}` : 'Learner Profile'}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E6F0EA]0 inline-block" />
              <span className="text-[14px] text-muted-foreground">Live · Salesforce</span>
            </div>
          </div>

          {/* ── Tab bar ────────────────────────────────────────────────── */}
          <div className="flex gap-1 px-6 border-b border-border">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-1.5 py-2.5 px-1 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5 shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab content ────────────────────────────────────────────── */}
          <div className="p-6">
            {loadedTabs.current.has('profile') && (
              <div className={activeTab !== 'profile' ? 'hidden' : ''}>
                <ProfilePanel
                  profile={profile}
                  loading={profileLoading}
                  error={profileError}
                  onEdit={openEdit}
                />
              </div>
            )}
            {loadedTabs.current.has('conversations') && (
              <div className={activeTab !== 'conversations' ? 'hidden' : ''}>
                <ConversationsPanel contactId={contactId} />
              </div>
            )}
            {loadedTabs.current.has('sessions') && (
              <div className={activeTab !== 'sessions' ? 'hidden' : ''}>
                <SessionsPanel contactId={contactId} />
              </div>
            )}
            {loadedTabs.current.has('quests') && (
              <div className={activeTab !== 'quests' ? 'hidden' : ''}>
                <QuestsPanel contactId={contactId} />
              </div>
            )}
            {loadedTabs.current.has('assessments') && (
              <div className={activeTab !== 'assessments' ? 'hidden' : ''}>
                <AssessmentsPanel learnerEmail={profile?.email ?? null} />
              </div>
            )}
            {loadedTabs.current.has('career') && (
              <div className={activeTab !== 'career' ? 'hidden' : ''}>
                <CareerPanel contactId={contactId} />
              </div>
            )}
          </div>

        </div>
      </ScrollArea>

      {/* ── Edit Drawer (portaled outside ScrollArea) ─────────────────── */}
      {profile && (
        <EditDrawer
          open={editDrawerOpen}
          onClose={() => setEditDrawerOpen(false)}
          profile={profile}
          trailConfigs={trailConfigs}
          contactId={contactId}
          onSaved={fetchProfile}
        />
      )}
    </>
  );
}
