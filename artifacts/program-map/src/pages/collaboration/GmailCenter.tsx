/**
 * GmailCenter — full-page Gmail integration under Collaboration.
 * Real inbox data from GET /api/gmail/threads.
 * Penny Label Intelligence config is in-memory (persists per session).
 * Send via POST /api/gmail/send. Penny drafts via /api/penny/ask.
 */
import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TERMS } from '@/config/terminology';
import { Button } from '@/components/ui/button';
import {
  Search, Sparkles, ChevronRight, CheckCircle2, Circle,
  Inbox, Bell, BellOff, Zap, Clock, MoreHorizontal,
  Reply, Archive, X, RefreshCw, AlertCircle, Send,
} from 'lucide-react';
import { STATUS_CLASSES } from '@/config/statusColors';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Thread {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  starred: boolean;
  important: boolean;
  needsAction: boolean;
}

interface LabelDef {
  id: string;
  name: string;
  color: string;
  hex: string;
}

interface LabelCfg {
  watched: boolean;
  action: string;
}

interface PennyAction {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LABELS: LabelDef[] = [
  { id: 'penny',    name: TERMS.aiAssistant, color: 'violet',  hex: '#8b5cf6' },
  { id: 'insights', name: 'Insights', color: 'sky',     hex: '#0ea5e9' },
  { id: 'programs', name: 'Programs', color: 'emerald', hex: '#10b981' },
  { id: 'urgent',   name: 'Urgent',   color: 'red',     hex: '#ef4444' },
  { id: 'learners', name: 'Learners', color: 'amber',   hex: '#f59e0b' },
];

const PENNY_ACTIONS: PennyAction[] = [
  { id: 'follow-up', label: 'Auto follow-up', desc: `${TERMS.aiAssistant} drafts a reply if no response in 48h`,  icon: Clock },
  { id: 'digest',    label: 'Add to digest',  desc: 'Summarized in the Trail Signals weekly brief',               icon: Zap   },
  { id: 'alert',     label: 'Immediate alert',desc: `${TERMS.aiAssistant} surfaces this in Trail Signals now`,     icon: Bell  },
];

const LABEL_BG: Record<string, string> = {
  violet:  STATUS_CLASSES.information.badge,
  sky:     STATUS_CLASSES.information.badge,
  emerald: STATUS_CLASSES.success.badge,
  red:     STATUS_CLASSES.critical.badge,
  amber:   STATUS_CLASSES.attention.badge,
};

const DEFAULT_CFG: Record<string, LabelCfg> = {
  penny:    { watched: true,  action: 'follow-up' },
  insights: { watched: true,  action: 'digest'    },
  programs: { watched: false, action: 'none'      },
  urgent:   { watched: false, action: 'none'      },
  learners: { watched: false, action: 'none'      },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d       = new Date(iso);
  const now     = new Date();
  const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay  = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';
}

const AVATAR_COLORS = [
  'bg-[#E6F0EA] text-[#245531]',
  'bg-[#EDF5F8] text-[#2F6F7E]',
  'bg-[#FFF3E0] text-[#CC8400]',
  'bg-[#FBEAE6] text-[#A93F2F]',
  'bg-[#E2E4E1] text-[#4A4F4D]',
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── Penny label badge — shown for important / needsAction threads ──────────────

function pennyBadgeLabel(thread: Thread, cfg: Record<string, LabelCfg>): string | null {
  if (!thread.important && !thread.needsAction) return null;
  const pennyCfg = cfg['penny'];
  if (!pennyCfg?.watched) return null;
  const action = PENNY_ACTIONS.find(a => a.id === pennyCfg.action);
  return action?.label ?? 'watching';
}

// ── Thread Row ────────────────────────────────────────────────────────────────

function ThreadRow({
  thread,
  selected,
  labelCfg,
  onClick,
}: {
  thread: Thread;
  selected: boolean;
  labelCfg: Record<string, LabelCfg>;
  onClick: () => void;
}) {
  const badge = pennyBadgeLabel(thread, labelCfg);
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 border-b border-border/50 cursor-pointer transition-all ${
        selected
          ? 'bg-[#EDF5F8] border-l-2 border-l-[#7FAFC6]'
          : 'hover:bg-muted/40'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(thread.from)}`}>
          {initials(thread.from)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={`text-[11px] truncate ${thread.unread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              {thread.from}
            </span>
            <span className="text-[9px] text-muted-foreground shrink-0 ml-auto">{formatDate(thread.date)}</span>
          </div>
          <p className={`text-[11px] truncate ${thread.unread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            {thread.subject}
          </p>
        </div>
      </div>
      {badge && (
        <div className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border mt-1 bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]">
          <Sparkles className="w-2 h-2" />
          {TERMS.aiAssistant} · {badge}
        </div>
      )}
      {thread.needsAction && !badge && (
        <div className="inline-flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full mt-1 bg-[#FFF3E0] text-[#CC8400] border border-[#FFD08A]">
          Needs action
        </div>
      )}
    </div>
  );
}

// ── Thread Preview ─────────────────────────────────────────────────────────────

function ThreadPreview({
  thread,
  labelCfg,
}: {
  thread: Thread;
  labelCfg: Record<string, LabelCfg>;
}) {
  const [replyBody, setReplyBody]       = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError]     = useState<string | null>(null);
  const [sendLoading, setSendLoading]   = useState(false);
  const [sendDone, setSendDone]         = useState(false);
  const [sendError, setSendError]       = useState<string | null>(null);

  const badge = pennyBadgeLabel(thread, labelCfg);
  const pennyAction = badge
    ? PENNY_ACTIONS.find(a => a.id === labelCfg['penny']?.action)
    : null;

  async function draftWithPenny() {
    setDraftLoading(true);
    setDraftError(null);
    try {
      const resp = await fetch('/api/penny/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Draft a brief, professional reply to this email thread:\n\nFrom: ${thread.from}\nSubject: ${thread.subject}\n\n${thread.snippet}\n\nKeep it concise — 2–3 sentences max, warm but to the point.`,
          context: 'Gmail Center',
          role: 'admin',
        }),
      });
      const data = await resp.json() as { reply?: string; error?: string };
      if (!resp.ok || data.error) throw new Error(data.error ?? `${TERMS.aiAssistant} could not draft a reply.`);
      setReplyBody(data.reply ?? '');
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : `${TERMS.aiAssistant} could not draft a reply.`);
    } finally {
      setDraftLoading(false);
    }
  }

  async function sendReply() {
    if (!replyBody.trim()) return;
    setSendLoading(true);
    setSendError(null);
    try {
      const resp = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: thread.fromEmail,
          subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
          body: replyBody,
          threadId: thread.threadId,
        }),
      });
      const data = await resp.json() as { success?: boolean; error?: string };
      if (!resp.ok || !data.success) throw new Error(data.error ?? 'Failed to send');
      setSendDone(true);
      setReplyBody('');
      setTimeout(() => setSendDone(false), 3000);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSendLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-3.5 border-b border-border flex items-start justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-1">{thread.subject}</h2>
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] text-muted-foreground">{thread.fromEmail}</span>
            {thread.important && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FFF3E0] text-[#CC8400] border border-[#FFD08A] font-medium">Important</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button className="p-1.5 rounded hover:bg-muted transition-colors"><Reply className="w-3.5 h-3.5 text-muted-foreground" /></button>
          <button className="p-1.5 rounded hover:bg-muted transition-colors"><Archive className="w-3.5 h-3.5 text-muted-foreground" /></button>
          <button className="p-1.5 rounded hover:bg-muted transition-colors"><MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" /></button>
        </div>
      </div>

      {/* Penny context bar */}
      {badge && pennyAction && (
        <div className="px-6 py-2 bg-[#EDF5F8] border-b border-[#C5DDE6] flex items-center gap-2 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-[#2F6F7E] shrink-0" />
          <p className="text-[11px] text-[#2F6F7E] flex-1">
            <strong>{TERMS.aiAssistant}</strong> · {pennyAction.desc}
          </p>
          <button className="text-[10px] font-semibold text-[#2F6F7E] hover:underline flex items-center gap-0.5 shrink-0">
            Adjust <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${avatarColor(thread.from)}`}>
              {initials(thread.from)}
            </div>
            <div>
              <p className="text-[12px] font-semibold text-foreground">{thread.from}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(thread.date)}</p>
            </div>
          </div>
          <p className="text-[13px] text-foreground leading-relaxed">{thread.snippet}</p>

          {/* Reply box */}
          <div className="mt-5 rounded-xl border border-border p-4">
            <div className="text-[10px] text-muted-foreground mb-2">Reply to {thread.from}</div>
            <textarea
              className="w-full outline-none resize-none text-[12px] text-foreground placeholder:text-muted-foreground min-h-16 bg-transparent"
              placeholder="Write a reply…"
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
            />
            {draftError && (
              <p className="text-[10px] text-[#A93F2F] mb-2">{draftError}</p>
            )}
            {sendError && (
              <p className="text-[10px] text-[#A93F2F] mb-2">{sendError}</p>
            )}
            {sendDone && (
              <p className="text-[10px] text-[#2F6B3F] mb-2">Sent!</p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                onClick={draftWithPenny}
                disabled={draftLoading}
                className="flex items-center gap-1.5 text-[10px] text-[#2F6F7E] font-medium hover:underline disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3" />
                {draftLoading ? 'Drafting…' : `Draft with ${TERMS.aiAssistant}`}
              </button>
              <Button
                size="sm"
                onClick={sendReply}
                disabled={sendLoading || !replyBody.trim()}
                className="h-7 px-3 text-[11px] bg-[#A93F2F] hover:bg-[#8B3527] text-white border-0"
              >
                <Send className="w-3 h-3 mr-1" />
                {sendLoading ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Penny Label Config Panel ───────────────────────────────────────────────────

function PennyConfigPanel({
  labelCfg,
  onToggle,
  onSetAction,
  onClose,
}: {
  labelCfg: Record<string, LabelCfg>;
  onToggle: (id: string) => void;
  onSetAction: (id: string, action: string) => void;
  onClose: () => void;
}) {
  const watchedCount = Object.values(labelCfg).filter(c => c.watched).length;
  return (
    <div className="bg-[#EDF5F8] border-b border-[#C5DDE6] px-6 py-4 shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-[#2F6F7E]" />
        <h3 className="text-[13px] font-semibold text-[#2F6F7E]">{TERMS.aiAssistant} Label Intelligence</h3>
        <span className="text-[10px] text-[#2F6F7E] bg-[#EDF5F8] px-2 py-0.5 rounded-full">{watchedCount} active</span>
        <button onClick={onClose} className="ml-auto text-[#7FAFC6] hover:text-[#2F6F7E] transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[11px] text-[#2F6F7E] mb-3 leading-snug max-w-2xl">
        Choose which Gmail labels Penny monitors for insights, alerts, and automated follow-ups. Threads tagged with a watched label are surfaced in Trail Signals.
      </p>
      <div className="grid grid-cols-5 gap-2">
        {LABELS.map(l => {
          const cfg = labelCfg[l.id];
          return (
            <div
              key={l.id}
              className={`rounded-xl border-2 p-3 transition-all bg-white ${
                cfg.watched ? 'border-[#7FAFC6] shadow-sm shadow-[#EDF5F8]' : 'border-border opacity-60 hover:opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l.hex }} />
                  <span className="text-[11px] font-semibold text-foreground">{l.name}</span>
                </div>
                <button onClick={() => onToggle(l.id)} className="shrink-0">
                  {cfg.watched
                    ? <CheckCircle2 className="w-4 h-4 text-[#2F6F7E]" />
                    : <Circle className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
              {cfg.watched ? (
                <div>
                  <div className="text-[9px] text-[#2F6F7E] font-semibold uppercase tracking-wide mb-1.5">{TERMS.aiAssistant} action</div>
                  <div className="space-y-1">
                    {PENNY_ACTIONS.map(action => (
                      <button
                        key={action.id}
                        onClick={() => onSetAction(l.id, action.id)}
                        className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] transition-colors ${
                          cfg.action === action.id
                            ? 'bg-[#EDF5F8] text-[#2F6F7E] font-semibold'
                            : 'text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        <action.icon className="w-2.5 h-2.5 shrink-0" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">Click ✓ to enable</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GmailCenter() {
  const [threads, setThreads]       = useState<Thread[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [selected, setSelected]     = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [labelCfg, setLabelCfg]     = useState<Record<string, LabelCfg>>(DEFAULT_CFG);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/gmail/threads');
      const data = await resp.json() as { threads?: Thread[]; error?: string };
      if (!resp.ok || data.error) throw new Error(data.error ?? 'Failed to load inbox');
      setThreads(data.threads ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchThreads(); }, [fetchThreads]);

  const toggleLabel  = (id: string) =>
    setLabelCfg(prev => ({ ...prev, [id]: { ...prev[id], watched: !prev[id].watched } }));
  const setAction    = (id: string, action: string) =>
    setLabelCfg(prev => ({ ...prev, [id]: { ...prev[id], action } }));

  const watchedCount  = Object.values(labelCfg).filter(c => c.watched).length;
  const filtered      = threads.filter(t =>
    !search || t.subject.toLowerCase().includes(search.toLowerCase()) || t.from.toLowerCase().includes(search.toLowerCase())
  );
  const unreadCount   = threads.filter(t => t.unread).length;
  const selectedThread = threads.find(t => t.id === selected);

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-background border-b border-border px-4 py-1.5 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-5 h-5 rounded bg-[#A93F2F] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </div>
          <span className="text-[12px] font-semibold text-foreground">Gmail</span>
        </div>

        <div className="flex-1 max-w-lg">
          <div className="flex items-center gap-2 bg-muted rounded-md px-2.5 py-1">
            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
            <input
              className="flex-1 bg-transparent outline-none text-[11px] text-foreground placeholder:text-muted-foreground"
              placeholder="Search mail…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            onClick={() => void fetchThreads()}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setConfigOpen(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-colors ${
              configOpen
                ? 'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E]'
                : 'bg-background border-border text-muted-foreground hover:border-muted-foreground'
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            {TERMS.aiAssistant} Labels
            <span className="text-[9px] bg-[#EDF5F8]0 text-white rounded-full px-1 ml-0.5">{watchedCount}</span>
          </button>
        </div>
      </div>

      {/* ── Penny Config Panel ── */}
      {configOpen && (
        <PennyConfigPanel
          labelCfg={labelCfg}
          onToggle={toggleLabel}
          onSetAction={setAction}
          onClose={() => setConfigOpen(false)}
        />
      )}

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Thread list */}
        <div className={`border-r border-border bg-background flex flex-col shrink-0 ${selected ? 'w-72' : 'flex-1'}`}>
          <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2 shrink-0">
            <Inbox className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground">Inbox</span>
            {unreadCount > 0 && (
              <span className="ml-auto text-[9px] text-muted-foreground">{unreadCount} unread</span>
            )}
          </div>

          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <AlertCircle className="w-5 h-5 text-[#A93F2F]" />
              <p className="text-[11px] text-muted-foreground">{error}</p>
              <button
                onClick={() => void fetchThreads()}
                className="text-[10px] font-semibold text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <ScrollArea className="flex-1">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Inbox className="w-6 h-6 text-muted-foreground/40" />
                  <p className="text-[11px] text-muted-foreground">
                    {search ? 'No threads match your search.' : 'Inbox is empty.'}
                  </p>
                </div>
              ) : (
                filtered.map(t => (
                  <ThreadRow
                    key={t.id}
                    thread={t}
                    selected={selected === t.id}
                    labelCfg={labelCfg}
                    onClick={() => setSelected(t.id === selected ? null : t.id)}
                  />
                ))
              )}
            </ScrollArea>
          )}
        </div>

        {/* Thread preview */}
        {selectedThread && (
          <ThreadPreview thread={selectedThread} labelCfg={labelCfg} />
        )}

        {/* Empty state when nothing selected */}
        {!selectedThread && !loading && !error && filtered.length > 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="w-10 h-10 rounded-xl bg-[#FBEAE6] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-rose-400">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </div>
            <p className="text-[12px] font-medium text-foreground">Select a thread to read</p>
            <p className="text-[11px] text-muted-foreground">Click any message on the left</p>
          </div>
        )}
      </div>
    </div>
  );
}
