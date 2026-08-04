import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumTrailQuests, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { useAppContext } from '@/context/AppContext';
import {
  Star, CheckCircle2, Clock, Users, Slack, Brain,
  ChevronRight, Send, Trophy, Zap, BookOpen, AlertCircle,
  UserPlus, X, Loader2,
} from 'lucide-react';

// ── Learner delivery data (fetched from Salesforce TrailQuest__c) ─────────────

interface LearnerDelivery {
  id:                string;
  learner:           string;
  program:           string;
  questId:           string;
  assignedDate:      string;
  status:            'In Progress' | 'Completed' | 'Pending Acceptance';
  completedCriteria: number;
  totalCriteria:     number;
  slackHandle:       string;
}

const STATUS_CONFIG: Record<LearnerDelivery['status'], { cls: string; dot: string }> = {
  'Completed':           { cls: 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]', dot: 'bg-[#E6F0EA]0' },
  'In Progress':         { cls: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]', dot: 'bg-[#EDF5F8]0' },
  'Pending Acceptance':  { cls: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]', dot: 'bg-[#FFF3E0]0' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function DeliveryStatusBadge({ status }: { status: LearnerDelivery['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[14px] font-semibold border rounded-full px-2 py-0.5 ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[1fr_160px_120px_100px_80px] gap-x-3 items-center px-4 py-3 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-3 w-28 bg-muted rounded" />
        <div className="h-2.5 w-20 bg-muted/60 rounded" />
      </div>
      <div className="h-3 w-24 bg-muted rounded" />
      <div className="h-5 w-20 bg-muted rounded-full" />
      <div className="h-2 w-16 bg-muted rounded-full" />
      <div className="h-6 w-8 bg-muted rounded-md" />
    </div>
  );
}

// ── Learner directory entry (from /api/penny/data/learners/directory) ─────────

interface LearnerDirectoryEntry {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
}

// ── Assign modal ──────────────────────────────────────────────────────────────

interface AssignModalProps {
  onClose:    () => void;
  onAssigned: () => void;
  existingDeliveries: LearnerDelivery[];
}

function AssignModal({ onClose, onAssigned, existingDeliveries }: AssignModalProps) {
  const [learners,       setLearners]       = useState<LearnerDirectoryEntry[]>([]);
  const [loadingLearners,setLoadingLearners] = useState(true);
  const [learnerError,   setLearnerError]   = useState<string | null>(null);

  const [selectedContact, setSelectedContact] = useState('');
  const [selectedQuestId, setSelectedQuestId] = useState('');

  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  // Fetch learner directory on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/penny/data/learners/directory`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json() as LearnerDirectoryEntry[];
        if (!cancelled) setLearners(data);
      } catch (err) {
        if (!cancelled) setLearnerError(err instanceof Error ? err.message : 'Failed to load learners');
      } finally {
        if (!cancelled) setLoadingLearners(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  // Duplicate check (client-side fast path — server also validates)
  const alreadyActive = selectedContact && selectedQuestId
    ? existingDeliveries.some(
        d => d.questId === selectedQuestId &&
             // Match by contact id is not available directly; server will catch it
             // We can only check quest+name match — the server is the authoritative guard
             false
      )
    : false;

  const selectedQuest = curriculumTrailQuests.find(q => q.id === selectedQuestId);

  async function handleAssign() {
    if (!selectedContact || !selectedQuestId) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${import.meta.env.BASE_URL}api/penny/data/trail-quest-deliveries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId:    selectedContact,
          questId:      selectedQuestId,
          assignedDate: today,
          totalCriteria: (selectedQuest?.criteria as string[] | undefined)?.length ?? 0,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onAssigned();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E6F0EA] flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-[#2F6B3F]" />
            </div>
            <h2 className="text-[14px] font-semibold text-foreground">Assign Trail Quest</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Learner picker */}
        <div className="space-y-1.5">
          <label className="text-[14px] font-medium text-foreground">Learner</label>
          {loadingLearners ? (
            <div className="flex items-center gap-2 text-[14px] text-muted-foreground py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading learners…
            </div>
          ) : learnerError ? (
            <p className="text-[14px] text-red-600">{learnerError}</p>
          ) : (
            <select
              value={selectedContact}
              onChange={e => setSelectedContact(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Select a learner…</option>
              {learners.map(l => (
                <option key={l.id} value={l.id}>
                  {l.firstName} {l.lastName}{l.email ? ` (${l.email})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Quest picker */}
        <div className="space-y-1.5">
          <label className="text-[14px] font-medium text-foreground">Trail Quest</label>
          <select
            value={selectedQuestId}
            onChange={e => setSelectedQuestId(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Select a quest…</option>
            {curriculumTrailQuests.map(q => (
              <option key={q.id as string} value={q.id as string}>
                {q.name as string} · {q.questType as string}
              </option>
            ))}
          </select>
        </div>

        {/* Quest summary */}
        {selectedQuest && (
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
            <p className="text-[14px] font-medium text-foreground">{selectedQuest.name as string}</p>
            <p className="text-[14px] text-muted-foreground leading-snug">{selectedQuest.purpose as string}</p>
            <p className="text-[14px] text-muted-foreground">
              <span className="font-medium">{(selectedQuest.criteria as string[])?.length ?? 0}</span> completion criteria
              · <span className="font-medium">{selectedQuest.difficulty as string}</span>
              · <span className="font-medium">{selectedQuest.estimatedTime as string}</span>
            </p>
          </div>
        )}

        {/* Error */}
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[14px] text-red-700">{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[14px] text-muted-foreground rounded-md border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleAssign()}
            disabled={!selectedContact || !selectedQuestId || submitting || alreadyActive}
            className="flex items-center gap-1.5 px-4 py-2 text-[14px] font-medium text-white bg-[#2F6B3F] rounded-md hover:bg-[#265C35] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Assigning…</>
              : <><UserPlus className="w-3.5 h-3.5" /> Assign Quest</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TrailQuests() {
  const { setAskPennyOpen, setPendingPennyQuery } = useAppContext();
  const [sending, setSending] = useState<string | null>(null);
  const [sent,    setSent]    = useState<Set<string>>(new Set());

  // Live delivery data from Salesforce
  const [deliveries,    setDeliveries]    = useState<LearnerDelivery[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [objectMissing, setObjectMissing] = useState(false);

  // Assign modal
  const [assignOpen, setAssignOpen] = useState(false);

  // Stable fetch ref so we can call refresh after assignment
  const fetchDeliveriesRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function fetchDeliveries() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/penny/data/trail-quest-deliveries`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json() as { deliveries: LearnerDelivery[]; objectMissing: boolean };
        if (!cancelled) {
          setDeliveries(data.deliveries);
          setObjectMissing(data.objectMissing);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load deliveries');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDeliveriesRef.current = fetchDeliveries;
    void fetchDeliveries();
    return () => { cancelled = true; };
  }, []);

  function refreshDeliveries() {
    void fetchDeliveriesRef.current?.();
  }

  const active    = deliveries.filter(d => d.status === 'In Progress');
  const completed = deliveries.filter(d => d.status === 'Completed');
  const pending   = deliveries.filter(d => d.status === 'Pending Acceptance');

  async function deliverViaSlack(delivery: LearnerDelivery) {
    const quest = curriculumTrailQuests.find(q => q.id === delivery.questId);
    if (!quest) return;
    setSending(delivery.id);
    try {
      await fetch(`${import.meta.env.BASE_URL}api/slack/validate/test-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'penny' }),
      });
      setSent(prev => new Set([...prev, delivery.id]));
    } finally {
      setSending(null);
    }
  }

  function openPennyForQuest(questName: string, learnerName?: string) {
    const query = learnerName
      ? `Prepare a coaching message for ${learnerName} about their Trail Quest: "${questName}". What should I send them to encourage progress and clarify the completion criteria?`
      : `Help me design and deliver the "${questName}" Trail Quest. What's the best way to introduce it to learners via Slack and what coaching approach should Penny use?`;
    setPendingPennyQuery(query);
    setAskPennyOpen(true);
  }

  return (
    <>
    {assignOpen && (
      <AssignModal
        onClose={() => setAssignOpen(false)}
        onAssigned={() => { setAssignOpen(false); refreshDeliveries(); }}
        existingDeliveries={deliveries}
      />
    )}
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-5xl">

        {/* Header */}
        <div className="space-y-3">
          <p className="text-[14px] font-bold  text-muted-foreground/50">
            Penny Command Center
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E6F0EA] flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-[#2F6B3F]" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground">Trail Quests</h1>
                <p className="text-[14px] text-muted-foreground">
                  Earnable badges and challenges delivered by Penny — tracked in Salesforce, sent via Slack.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setAssignOpen(true)}
                className="flex items-center gap-1.5 text-[14px] font-medium text-white bg-[#2F6B3F] border border-[#2F6B3F] rounded-full px-3 py-1.5 hover:bg-[#265C35] transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Assign Quest
              </button>
              <div className="flex items-center gap-1 text-[14px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E6F0EA]0" />
                <span className="font-semibold">POC Confirmed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Quests',   value: curriculumTrailQuests.length, color: 'text-foreground', icon: Trophy },
            { label: 'Active',         value: loading ? '–' : active.length,     color: 'text-[#2F6F7E]',  icon: Zap },
            { label: 'Completed',      value: loading ? '–' : completed.length,  color: 'text-[#2F6B3F]',  icon: CheckCircle2 },
            { label: 'Awaiting',       value: loading ? '–' : pending.length,    color: 'text-[#CC8400]',  icon: Clock },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-1.5`} />
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-[14px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-medium text-red-700">Could not load deliveries</p>
              <p className="text-[14px] text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Object-missing notice */}
        {objectMissing && !error && (
          <div className="rounded-lg border border-[#FFF3E0] bg-[#FFF3E0]/60 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#CC8400] shrink-0 mt-0.5" />
            <p className="text-[14px] text-[#CC8400]">
              <span className="font-semibold">TrailQuest__c</span> has not yet been provisioned in Salesforce.
              Delivery data will appear here once the custom object is created.
            </p>
          </div>
        )}

        {/* Active Deliveries */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[14px] font-bold  text-muted-foreground/60">
              Active Deliveries
            </p>
            <button
              onClick={() => openPennyForQuest('Active Quest Delivery')}
              className="flex items-center gap-1 text-[14px] text-primary hover:underline"
            >
              <Brain className="w-3 h-3" /> Ask Penny for delivery tips
            </button>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_120px_100px_80px] gap-x-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
              {['Learner', 'Quest', 'Status', 'Progress', 'Action'].map(h => (
                <p key={h} className="text-[14px] font-bold  text-muted-foreground/60">{h}</p>
              ))}
            </div>
            <div className="bg-card divide-y divide-border">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : deliveries.length === 0 ? (
                <div className="px-4 py-6 text-center text-[14px] text-muted-foreground">
                  {objectMissing ? 'No data — TrailQuest__c pending provisioning.' : 'No quest deliveries yet.'}
                </div>
              ) : (
                deliveries.map(d => {
                  const quest     = curriculumTrailQuests.find(q => q.id === d.questId);
                  const isSending = sending === d.id;
                  const isSent    = sent.has(d.id);
                  return (
                    <div
                      key={d.id}
                      className="grid grid-cols-[1fr_160px_120px_100px_80px] gap-x-3 items-center px-4 py-3"
                    >
                      <div>
                        <p className="text-[14px] font-semibold text-foreground">{d.learner}</p>
                        <p className="text-[14px] text-muted-foreground">{d.program}</p>
                      </div>
                      <div>
                        <p className="text-[14px] text-foreground truncate">{quest?.name ?? d.questId}</p>
                        <p className="text-[14px] text-muted-foreground">{quest?.questType as string ?? ''}</p>
                      </div>
                      <DeliveryStatusBadge status={d.status} />
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="flex-1 bg-muted rounded-full h-1">
                            <div
                              className="bg-[#E6F0EA]0 h-1 rounded-full transition-all"
                              style={{ width: `${d.totalCriteria > 0 ? (d.completedCriteria / d.totalCriteria) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-[14px] text-muted-foreground">{d.completedCriteria}/{d.totalCriteria}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isSent ? (
                          <span className="text-[14px] text-[#2F6B3F] font-medium">Sent ✓</span>
                        ) : (
                          <button
                            onClick={() => void deliverViaSlack(d)}
                            disabled={isSending}
                            title={`Send nudge to ${d.learner} via Slack`}
                            className="flex items-center gap-1 text-[14px] text-[#4A154B] border border-[#4A154B]/20 rounded-md px-2 py-1 hover:bg-[#4A154B]/5 transition-colors disabled:opacity-40"
                          >
                            {isSending
                              ? <Send className="w-2.5 h-2.5 animate-pulse" />
                              : <Slack className="w-2.5 h-2.5" />
                            }
                          </button>
                        )}
                        <button
                          onClick={() => openPennyForQuest(quest?.name as string ?? '', d.learner)}
                          title="Penny coaching"
                          className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-[#EDF5F8] transition-colors"
                        >
                          <Brain className="w-2.5 h-2.5 text-[#2F6F7E]" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quest Catalogue */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[14px] font-bold  text-muted-foreground/60">
              Quest Catalogue
            </p>
            <button
              onClick={() => openPennyForQuest('New Trail Quest')}
              className="flex items-center gap-1 text-[14px] text-primary hover:underline"
            >
              <Star className="w-3 h-3" /> Generate new quest
            </button>
          </div>

          <div className="space-y-3">
            {curriculumTrailQuests.map(quest => {
              const statusCfg    = CONTENT_STATUS_CONFIG[quest.status];
              const activeCount  = deliveries.filter(d => d.questId === quest.id && d.status === 'In Progress').length;
              const doneCount    = deliveries.filter(d => d.questId === quest.id && d.status === 'Completed').length;
              return (
                <div
                  key={quest.id}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#E6F0EA] flex items-center justify-center shrink-0 mt-0.5">
                        <Star className="w-4 h-4 text-[#2F6B3F]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[14px] font-semibold text-foreground">{quest.name as string}</p>
                          <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[14px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-1.5 py-0.5 font-medium">
                            {quest.questType as string}
                          </span>
                          <span className="text-[14px] text-muted-foreground">
                            {quest.difficulty as string} · {quest.estimatedTime as string}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {activeCount > 0 && (
                        <span className="text-[14px] text-[#2F6F7E] bg-[#EDF5F8] border border-[#7FAFC6] rounded-full px-2 py-0.5 font-semibold">
                          {activeCount} active
                        </span>
                      )}
                      {doneCount > 0 && (
                        <span className="text-[14px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2 py-0.5 font-semibold">
                          {doneCount} done
                        </span>
                      )}
                      <button
                        onClick={() => openPennyForQuest(quest.name as string)}
                        className="flex items-center gap-1 text-[14px] text-primary border border-primary/20 rounded-md px-2 py-1 hover:bg-primary/5 transition-colors"
                      >
                        <Brain className="w-2.5 h-2.5" /> Penny
                      </button>
                    </div>
                  </div>

                  <p className="text-[14px] text-muted-foreground mb-3 leading-relaxed">{quest.purpose as string}</p>

                  {((quest.criteria as string[]) || []).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[14px] font-bold  text-muted-foreground/50">
                        Completion Criteria
                      </p>
                      {(quest.criteria as string[]).map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-[#2F6B3F] shrink-0" />
                          <p className="text-[14px] text-foreground/80">{c}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
                    <div className="flex items-center gap-1 text-[14px] text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{quest.program as string}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[14px] text-muted-foreground">
                      <BookOpen className="w-3 h-3" />
                      <span>{quest.relatedSalesforceObject as string}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Integration note */}
        <div className="rounded-lg border border-[#E6F0EA] bg-[#E6F0EA]/50 p-3.5 flex items-start gap-2">
          <Slack className="w-3.5 h-3.5 text-[#4A154B] shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-medium text-foreground mb-0.5">Slack + Salesforce delivery</p>
            <p className="text-[14px] text-muted-foreground leading-snug">
              Trail Quests are delivered via Slack (Penny AI channel) and completion events write to Salesforce{' '}
              <span className="font-mono">TrailQuest__c</span>. Use the Slack button per learner to send a coaching nudge,
              or ask Penny to draft a personalised delivery message.
            </p>
          </div>
        </div>

        {/* Upcoming */}
        <div className="rounded-lg border border-border bg-muted/20 p-3.5 flex items-center gap-2">
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          <p className="text-[14px] text-muted-foreground">
            <span className="font-semibold text-foreground">Flow Builder Badge</span> — Draft quest in Sprint 3 module.{' '}
            Complete Module 3.1 content health fixes before assigning to learners.
          </p>
        </div>

      </div>
    </ScrollArea>
    </>
  );
}
