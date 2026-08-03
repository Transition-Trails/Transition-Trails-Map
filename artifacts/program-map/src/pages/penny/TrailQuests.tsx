import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumTrailQuests, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { useAppContext } from '@/context/AppContext';
import {
  Star, CheckCircle2, Clock, Users, Slack, Brain,
  ChevronRight, Send, Trophy, Zap, BookOpen,
} from 'lucide-react';

// ── Learner delivery data (cross-referenced from Learners page) ───────────────

interface LearnerDelivery {
  learner: string;
  program: string;
  questId: string;
  assignedDate: string;
  status: 'In Progress' | 'Completed' | 'Pending Acceptance';
  completedCriteria: number;
  totalCriteria: number;
  slackHandle: string;
}

const QUEST_DELIVERIES: LearnerDelivery[] = [
  { learner: 'Jordan M.',  program: "Explorer's Trail",  questId: 'tq-schema-designer', assignedDate: '2026-06-02', status: 'In Progress',          completedCriteria: 2, totalCriteria: 3, slackHandle: '@jordan.m' },
  { learner: 'Riley P.',   program: 'Foundations Trail', questId: 'tq-admin-challenge',  assignedDate: '2026-06-01', status: 'In Progress',          completedCriteria: 1, totalCriteria: 3, slackHandle: '@riley.p' },
  { learner: 'Alex F.',    program: 'Guided Trail',      questId: 'tq-schema-designer', assignedDate: '2026-05-20', status: 'Completed',             completedCriteria: 3, totalCriteria: 3, slackHandle: '@alex.f' },
  { learner: 'Avery K.',   program: 'Guided Trail',      questId: 'tq-admin-challenge',  assignedDate: '2026-06-05', status: 'Pending Acceptance',   completedCriteria: 0, totalCriteria: 3, slackHandle: '@avery.k' },
  { learner: 'Drew H.',    program: "Explorer's Trail",  questId: 'tq-schema-designer', assignedDate: '2026-06-08', status: 'In Progress',          completedCriteria: 1, totalCriteria: 3, slackHandle: '@drew.h' },
];

const STATUS_CONFIG: Record<LearnerDelivery['status'], { cls: string; dot: string }> = {
  'Completed':           { cls: 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]', dot: 'bg-[#E6F0EA]0' },
  'In Progress':         { cls: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',             dot: 'bg-[#EDF5F8]0'     },
  'Pending Acceptance':  { cls: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',       dot: 'bg-[#FFF3E0]0'   },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function DeliveryStatusBadge({ status }: { status: LearnerDelivery['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold border rounded-full px-2 py-0.5 ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TrailQuests() {
  const { setAskPennyOpen, setPendingPennyQuery } = useAppContext();
  const [sending, setSending] = useState<string | null>(null);
  const [sent,    setSent]    = useState<Set<string>>(new Set());

  const active    = QUEST_DELIVERIES.filter(d => d.status === 'In Progress');
  const completed = QUEST_DELIVERIES.filter(d => d.status === 'Completed');
  const pending   = QUEST_DELIVERIES.filter(d => d.status === 'Pending Acceptance');

  async function deliverViaSlack(delivery: LearnerDelivery) {
    const quest = curriculumTrailQuests.find(q => q.id === delivery.questId);
    if (!quest) return;
    setSending(delivery.learner);
    try {
      await fetch('/api/slack/validate/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'penny' }),
      });
      setSent(prev => new Set([...prev, delivery.learner]));
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
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-5xl">

        {/* Header */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Penny Command Center
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E6F0EA] flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-[#2F6B3F]" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground">Trail Quests</h1>
                <p className="text-[11px] text-muted-foreground">
                  Earnable badges and challenges delivered by Penny — tracked in Salesforce, sent via Slack.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2.5 py-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E6F0EA]0" />
              <span className="font-semibold">POC Confirmed</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Quests',   value: curriculumTrailQuests.length, color: 'text-foreground', icon: Trophy },
            { label: 'Active',         value: active.length,                color: 'text-[#2F6F7E]',     icon: Zap },
            { label: 'Completed',      value: completed.length,             color: 'text-[#2F6B3F]', icon: CheckCircle2 },
            { label: 'Awaiting',       value: pending.length,               color: 'text-[#CC8400]',   icon: Clock },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-1.5`} />
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Active Deliveries */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Active Deliveries
            </p>
            <button
              onClick={() => openPennyForQuest('Active Quest Delivery')}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <Brain className="w-3 h-3" /> Ask Penny for delivery tips
            </button>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_120px_100px_80px] gap-x-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
              {['Learner', 'Quest', 'Status', 'Progress', 'Action'].map(h => (
                <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{h}</p>
              ))}
            </div>
            <div className="bg-card divide-y divide-border">
              {QUEST_DELIVERIES.map(d => {
                const quest     = curriculumTrailQuests.find(q => q.id === d.questId);
                const isSending = sending === d.learner;
                const isSent    = sent.has(d.learner);
                return (
                  <div
                    key={d.learner}
                    className="grid grid-cols-[1fr_160px_120px_100px_80px] gap-x-3 items-center px-4 py-3"
                  >
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">{d.learner}</p>
                      <p className="text-[10px] text-muted-foreground">{d.program}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-foreground truncate">{quest?.name ?? d.questId}</p>
                      <p className="text-[10px] text-muted-foreground">{quest?.questType as string ?? ''}</p>
                    </div>
                    <DeliveryStatusBadge status={d.status} />
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="flex-1 bg-muted rounded-full h-1">
                          <div
                            className="bg-[#E6F0EA]0 h-1 rounded-full transition-all"
                            style={{ width: `${(d.completedCriteria / d.totalCriteria) * 100}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground">{d.completedCriteria}/{d.totalCriteria}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isSent ? (
                        <span className="text-[10px] text-[#2F6B3F] font-medium">Sent ✓</span>
                      ) : (
                        <button
                          onClick={() => void deliverViaSlack(d)}
                          disabled={isSending}
                          title={`Send nudge to ${d.learner} via Slack`}
                          className="flex items-center gap-1 text-[10px] text-[#4A154B] border border-[#4A154B]/20 rounded-md px-2 py-1 hover:bg-[#4A154B]/5 transition-colors disabled:opacity-40"
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
              })}
            </div>
          </div>
        </div>

        {/* Quest Catalogue */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Quest Catalogue
            </p>
            <button
              onClick={() => openPennyForQuest('New Trail Quest')}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <Star className="w-3 h-3" /> Generate new quest
            </button>
          </div>

          <div className="space-y-3">
            {curriculumTrailQuests.map(quest => {
              const statusCfg    = CONTENT_STATUS_CONFIG[quest.status];
              const deliveries   = QUEST_DELIVERIES.filter(d => d.questId === quest.id);
              const activeCount  = deliveries.filter(d => d.status === 'In Progress').length;
              const doneCount    = deliveries.filter(d => d.status === 'Completed').length;
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
                          <p className="text-[13px] font-semibold text-foreground">{quest.name as string}</p>
                          <span className={`text-[9px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-1.5 py-0.5 font-medium">
                            {quest.questType as string}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {quest.difficulty as string} · {quest.estimatedTime as string}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {activeCount > 0 && (
                        <span className="text-[9px] text-[#2F6F7E] bg-[#EDF5F8] border border-[#7FAFC6] rounded-full px-2 py-0.5 font-semibold">
                          {activeCount} active
                        </span>
                      )}
                      {doneCount > 0 && (
                        <span className="text-[9px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2 py-0.5 font-semibold">
                          {doneCount} done
                        </span>
                      )}
                      <button
                        onClick={() => openPennyForQuest(quest.name as string)}
                        className="flex items-center gap-1 text-[10px] text-primary border border-primary/20 rounded-md px-2 py-1 hover:bg-primary/5 transition-colors"
                      >
                        <Brain className="w-2.5 h-2.5" /> Penny
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{quest.purpose as string}</p>

                  {((quest.criteria as string[]) || []).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        Completion Criteria
                      </p>
                      {(quest.criteria as string[]).map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-[#2F6B3F] shrink-0" />
                          <p className="text-[11px] text-foreground/80">{c}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{quest.program as string}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
            <p className="text-[11px] font-medium text-foreground mb-0.5">Slack + Salesforce delivery</p>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Trail Quests are delivered via Slack (Penny AI channel) and completion events write to Salesforce
              <span className="font-mono">TrailQuest__c</span>. Use the Slack button per learner to send a coaching nudge,
              or ask Penny to draft a personalised delivery message.
            </p>
          </div>
        </div>

        {/* Upcoming */}
        <div className="rounded-lg border border-border bg-muted/20 p-3.5 flex items-center gap-2">
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            <span className="font-semibold text-foreground">Flow Builder Badge</span> — Draft quest in Sprint 3 module. 
            Complete Module 3.1 content health fixes before assigning to learners.
          </p>
        </div>

      </div>
    </ScrollArea>
  );
}
