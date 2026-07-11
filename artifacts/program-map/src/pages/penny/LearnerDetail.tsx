import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, User, MessageSquare, ClipboardList, Briefcase, CheckCircle2, XCircle } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LearnerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  pennyTrail: string | null;
  pennyTrailConfigId: string | null;
  currentPhase: string | null;
  currentGoal: string | null;
  currentBlockers: string | null;
  coachingTone: string | null;
  confidenceScore: number | null;
  skillScore: number | null;
  sprintWeek: number | null;
  onboardingComplete: boolean;
}

interface Interaction {
  id: string;
  userMessage: string;
  pennyResponse: string;
  promptMode: string;
  source: string;
  createdDate: string;
}

interface QuestSubmission {
  id: string;
  name: string;
  submissionText: string;
  submittedAt: string;
}

interface CareerReview {
  id: string;
  targetRole: string;
  readinessLabel: string;
  reviewedAt: string;
  reviewMode: string;
  feedbackJson: string;
  areaScores: string;
}

type TabId = 'profile' | 'conversations' | 'quests' | 'career';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'profile',       label: 'Profile',            icon: User },
  { id: 'conversations', label: 'Conversations',       icon: MessageSquare },
  { id: 'quests',        label: 'Quest Submissions',   icon: ClipboardList },
  { id: 'career',        label: 'Career Reviews',      icon: Briefcase },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ScoreBar({ value, max = 10, color }: { value: number | null; max?: number; color: string }) {
  if (value === null) return <span className="text-[12px] text-muted-foreground">—</span>;
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-medium text-foreground w-10 shrink-0">{value}/{max}</span>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-2 border-b border-border/50 last:border-0">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-[13px] text-foreground">{value ?? '—'}</span>
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
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
      <p className="text-[12px] text-red-700 font-medium">{message}</p>
      <p className="text-[11px] text-red-600/70 mt-1">Check Salesforce authentication in Admin → Integrations.</p>
    </div>
  );
}

// ── Tab panels ─────────────────────────────────────────────────────────────────

function ProfilePanel({ contactId }: { contactId: string }) {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/penny/data/learner/${contactId}`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json() as Promise<LearnerProfile>;
      })
      .then(data => { setProfile(data); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
        setLoading(false);
      });
  }, [contactId]);

  if (loading) return <SkeletonBlock lines={8} />;
  if (error)   return <ErrorBox message={error} />;
  if (!profile) return <p className="text-[12px] text-muted-foreground">Learner not found.</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4 space-y-0">
        <FieldRow label="Email"          value={profile.email} />
        <FieldRow label="Trail"          value={profile.pennyTrail} />
        <FieldRow label="Current Phase"  value={profile.currentPhase} />
        <FieldRow label="Current Goal"   value={profile.currentGoal} />
        <FieldRow label="Coaching Tone"  value={profile.coachingTone} />
        <FieldRow label="Sprint Week"    value={profile.sprintWeek !== null ? `Week ${profile.sprintWeek}` : null} />
        <div className="grid grid-cols-[140px_1fr] gap-2 py-2 border-b border-border/50">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Onboarding</span>
          <span className="flex items-center gap-1.5">
            {profile.onboardingComplete
              ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[13px] text-emerald-700">Complete</span></>
              : <><XCircle       className="w-3.5 h-3.5 text-amber-500"  /><span className="text-[13px] text-amber-700">Pending</span></>
            }
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Scores</p>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Confidence</p>
          <ScoreBar value={profile.confidenceScore} color="bg-violet-500" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Skill</p>
          <ScoreBar value={profile.skillScore} color="bg-sky-500" />
        </div>
      </div>

      {profile.currentBlockers && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600/70 mb-1.5">Current Blockers</p>
          <p className="text-[13px] text-amber-800 leading-relaxed whitespace-pre-line">{profile.currentBlockers}</p>
        </div>
      )}
    </div>
  );
}

function ConversationsPanel({ contactId }: { contactId: string }) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/penny/data/learner/${contactId}/interactions?limit=50`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json() as Promise<Interaction[]>;
      })
      .then(data => { setInteractions(data); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
        setLoading(false);
      });
  }, [contactId]);

  if (loading) return <SkeletonBlock lines={6} />;
  if (error)   return <ErrorBox message={error} />;
  if (interactions.length === 0) {
    return <p className="text-[12px] text-muted-foreground text-center py-8">No conversations yet.</p>;
  }

  return (
    <div className="space-y-6">
      {interactions.map(ix => (
        <div key={ix.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60">{relativeTime(ix.createdDate)}</span>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
              {ix.promptMode}
            </span>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[75%] bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-3 py-2">
              <p className="text-[12px] text-foreground leading-relaxed">{ix.userMessage}</p>
            </div>
          </div>
          {ix.pennyResponse && (
            <div className="flex justify-start">
              <div className="max-w-[75%] bg-card border border-border rounded-2xl rounded-tl-sm px-3 py-2">
                <p className="text-[10px] font-medium text-violet-600 mb-0.5">Penny</p>
                <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-line">{ix.pennyResponse}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function QuestsPanel({ contactId }: { contactId: string }) {
  const [quests, setQuests]   = useState<QuestSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/penny/data/learner/${contactId}/quests`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json() as Promise<QuestSubmission[]>;
      })
      .then(data => { setQuests(data); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load quest submissions');
        setLoading(false);
      });
  }, [contactId]);

  if (loading) return <SkeletonBlock lines={4} />;
  if (error)   return <ErrorBox message={error} />;
  if (quests.length === 0) {
    return <p className="text-[12px] text-muted-foreground text-center py-8">No quest submissions yet.</p>;
  }

  return (
    <div className="space-y-3">
      {quests.map(q => {
        const isExpanded = expanded.has(q.id);
        const truncated  = q.submissionText.length > 200 && !isExpanded;
        return (
          <div key={q.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[13px] font-semibold text-foreground">{q.name}</p>
              <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(q.submittedAt)}</span>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {truncated ? `${q.submissionText.slice(0, 200)}…` : q.submissionText}
            </p>
            {q.submissionText.length > 200 && (
              <button
                onClick={() => setExpanded(prev => {
                  const next = new Set(prev);
                  isExpanded ? next.delete(q.id) : next.add(q.id);
                  return next;
                })}
                className="text-[11px] text-primary hover:underline mt-1.5"
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

function CareerPanel({ contactId }: { contactId: string }) {
  const [reviews, setReviews] = useState<CareerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/penny/data/learner/${contactId}/career-reviews`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json() as Promise<CareerReview[]>;
      })
      .then(data => { setReviews(data); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load career reviews');
        setLoading(false);
      });
  }, [contactId]);

  if (loading) return <SkeletonBlock lines={5} />;
  if (error)   return <ErrorBox message={error} />;
  if (reviews.length === 0) {
    return <p className="text-[12px] text-muted-foreground text-center py-8">No career reviews yet.</p>;
  }

  return (
    <div className="space-y-4">
      {reviews.map(r => {
        let feedbackParsed: Record<string, unknown> | null = null;
        try { feedbackParsed = JSON.parse(r.feedbackJson) as Record<string, unknown>; } catch { /* ok */ }

        return (
          <div key={r.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-foreground">{r.targetRole || '—'}</p>
                <p className="text-[11px] text-muted-foreground">{formatDate(r.reviewedAt)} · {r.reviewMode}</p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold bg-violet-50 border-violet-200 text-violet-700 shrink-0">
                {r.readinessLabel}
              </span>
            </div>
            {feedbackParsed !== null ? (
              <div className="space-y-1.5">
                {Object.entries(feedbackParsed).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate">{k}</span>
                    <span className="text-[12px] text-foreground">{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-line">{r.feedbackJson}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LearnerDetail({ params }: { params?: { contactId?: string } }) {
  const contactId = params?.contactId ?? '';
  const [, navigate]      = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const loadedTabs = useRef<Set<TabId>>(new Set(['profile']));

  function handleTabClick(id: TabId) {
    loadedTabs.current.add(id);
    setActiveTab(id);
  }

  if (!contactId) {
    return (
      <div className="p-6 text-center">
        <p className="text-[12px] text-muted-foreground">No learner ID provided.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto">

        {/* ── Back + header ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-border sticky top-0 bg-background z-10">
          <button
            onClick={() => navigate('/penny/learners')}
            className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Learners
          </button>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-[12px] text-foreground font-medium truncate">Learner Profile</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-[10px] text-muted-foreground">Live · Salesforce</span>
          </div>
        </div>

        {/* ── Tab bar ──────────────────────────────────────────────────── */}
        <div className="flex gap-1 px-6 border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-1.5 py-2.5 px-1 text-[12px] font-medium border-b-2 -mb-px transition-colors ${
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

        {/* ── Tab content ──────────────────────────────────────────────── */}
        <div className="p-6">
          {loadedTabs.current.has('profile') && (
            <div className={activeTab !== 'profile' ? 'hidden' : ''}>
              <ProfilePanel contactId={contactId} />
            </div>
          )}
          {loadedTabs.current.has('conversations') && (
            <div className={activeTab !== 'conversations' ? 'hidden' : ''}>
              <ConversationsPanel contactId={contactId} />
            </div>
          )}
          {loadedTabs.current.has('quests') && (
            <div className={activeTab !== 'quests' ? 'hidden' : ''}>
              <QuestsPanel contactId={contactId} />
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
  );
}
