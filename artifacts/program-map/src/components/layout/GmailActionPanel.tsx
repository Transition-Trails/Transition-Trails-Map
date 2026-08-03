/**
 * GmailActionPanel — global mail slide-over accessible from the Topbar.
 * Hybrid layout: thread list on top, collapsible reply/compose drawer at bottom.
 * Real data from GET /api/gmail/threads. Penny AI drafting via /api/penny/ask.
 * Send via POST /api/gmail/send. Mounts in AppShell.
 * Triggered via gmailPanelOpen in AppContext.
 */
import { useState, useEffect, useCallback } from 'react';
import { TERMS } from '@/config/terminology';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, RefreshCw, Brain, Send, Paperclip,
  ChevronDown, ChevronUp, Star, Sparkles, AlertCircle,
  ArrowRight, Pencil, Reply, Trash2, CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';

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

type ComposeMode = 'hidden' | 'reply' | 'new';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d     = new Date(iso);
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86_400_000);

  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const AVATAR_COLORS = [
  'bg-[#EDF5F8] text-[#2F6F7E]',
  'bg-[#EDF5F8] text-[#2F6F7E]',
  'bg-[#E6F0EA] text-[#2F6B3F]',
  'bg-[#FFF3E0] text-[#CC8400]',
  'bg-[#FBEAE6] text-[#A93F2F]',
  'bg-[#EDF5F8] text-[#2F6F7E]',
  'bg-[#E6F0EA] text-[#2F6B3F]',
];

function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

function avatarColor(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

// ── Penny draft ────────────────────────────────────────────────────────────────

async function fetchPennyDraft(thread: Thread): Promise<string> {
  const query =
    `I need to write a professional email reply to ${thread.from} (${thread.fromEmail}). ` +
    `Subject: "${thread.subject}". Their message preview: "${thread.snippet}". ` +
    `Write a concise, warm reply (3–5 sentences) in first person as Angela from Transition Trails. ` +
    `Start with a greeting, acknowledge their message specifically, and provide a clear next step.`;

  const resp = await fetch('/api/penny/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context: 'Gmail Action Panel', role: 'admin' }),
  });
  const data = await resp.json() as { reply?: string; error?: string };
  if (!resp.ok || data.error) throw new Error(data.error ?? `${TERMS.aiAssistant} could not generate a draft.`);
  return data.reply!;
}

// ── GmailActionPanel ──────────────────────────────────────────────────────────

export function GmailActionPanel() {
  const { gmailPanelOpen, setGmailPanelOpen } = useAppContext();

  // Thread state
  const [threads,    setThreads]    = useState<Thread[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedAt,  setFetchedAt]  = useState<string | null>(null);

  // Compose state
  const [selectedId,       setSelectedId]       = useState<string | null>(null);
  const [composeMode,      setComposeMode]       = useState<ComposeMode>('hidden');
  const [to,               setTo]               = useState('');
  const [body,             setBody]             = useState('');
  const [generating,       setGenerating]       = useState(false);
  const [pennyDone,        setPennyDone]        = useState(false);
  const [pennyError,       setPennyError]       = useState<string | null>(null);
  const [composeCollapsed, setComposeCollapsed] = useState(false);

  // Send state
  const [sending,  setSending]  = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentIds,  setSentIds]  = useState<Set<string>>(new Set());

  // ── Fetch threads ─────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const resp = await fetch('/api/gmail/threads');
      const data = await resp.json() as { threads?: Thread[]; error?: string; fetchedAt?: string };
      if (!resp.ok || data.error) throw new Error(data.error ?? `HTTP ${resp.status}`);
      setThreads(data.threads ?? []);
      setFetchedAt(data.fetchedAt ?? null);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Could not load inbox.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (gmailPanelOpen) void load();
  }, [gmailPanelOpen, load]);

  // ── Compose helpers ───────────────────────────────────────────────────────

  const selectedThread = threads.find(t => t.id === selectedId) ?? null;

  function selectThread(t: Thread) {
    setSelectedId(t.id);
    setTo(t.fromEmail);
    setComposeMode('reply');
    setBody('');
    setPennyDone(false);
    setPennyError(null);
    setSendError(null);
    setComposeCollapsed(false);
  }

  function startNew() {
    setSelectedId(null);
    setTo('');
    setComposeMode('new');
    setBody('');
    setPennyDone(false);
    setPennyError(null);
    setSendError(null);
    setComposeCollapsed(false);
  }

  function closeCompose() {
    setComposeMode('hidden');
    setBody('');
    setPennyDone(false);
    setPennyError(null);
    setSendError(null);
  }

  async function handlePenny() {
    if (!selectedThread) return;
    setGenerating(true);
    setPennyError(null);
    try {
      const draft = await fetchPennyDraft(selectedThread);
      setBody(draft);
      setPennyDone(true);
    } catch (e) {
      setPennyError(e instanceof Error ? e.message : 'Penny could not generate a draft.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!body.trim() || !to.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const subject = composeMode === 'reply' && selectedThread
        ? (selectedThread.subject.startsWith('Re:') ? selectedThread.subject : `Re: ${selectedThread.subject}`)
        : '(no subject)';

      const payload: Record<string, string> = { to, subject, body };
      if (composeMode === 'reply' && selectedThread) {
        payload['threadId'] = selectedThread.threadId;
      }

      const resp = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json() as { ok?: boolean; error?: string };
      if (!resp.ok || data.error) throw new Error(data.error ?? `Send failed: HTTP ${resp.status}`);

      if (selectedId) setSentIds(prev => new Set([...prev, selectedId]));
      closeCompose();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const unreadCount  = threads.filter(t => t.unread && !sentIds.has(t.id)).length;
  const actionNeeded = threads.filter(t => t.needsAction && !sentIds.has(t.id));
  const isLive       = !fetchError && threads.length > 0;

  return (
    <AnimatePresence>
      {gmailPanelOpen && (
        <>
          {/* Scrim */}
          <motion.div
            key="gmail-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/10"
            onClick={() => setGmailPanelOpen(false)}
          />

          {/* Panel */}
          <motion.div
            key="gmail-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[400px] bg-card border-l border-border shadow-2xl"
          >

            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-shrink-0 bg-card">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#FBEAE6] flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-[#A93F2F]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-semibold text-foreground leading-none">Mail</p>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="h-4 text-[9px] px-1.5 bg-primary/10 text-primary border-0">
                        {unreadCount} unread
                      </Badge>
                    )}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {loading
                      ? 'Loading…'
                      : fetchError
                        ? 'Could not load inbox'
                        : `Inbox · ${threads.length} thread${threads.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Live / error badge */}
                {!loading && (
                  <div className={`flex items-center gap-1 text-[9px] rounded-full px-2 py-0.5 mr-0.5 border ${
                    fetchError
                      ? 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]'
                      : 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${fetchError ? 'bg-[#FFF3E0]0' : 'bg-[#FBEAE6]0'}`} />
                    <span className="font-semibold">{fetchError ? 'Error' : 'Live'}</span>
                  </div>
                )}

                <button
                  onClick={startNew}
                  className="flex items-center gap-1 text-[10px] font-semibold text-primary border border-primary/30 rounded-md px-2 py-1 hover:bg-primary/5 transition-colors"
                  title="Compose new message"
                >
                  <Pencil className="w-2.5 h-2.5" /> Compose
                </button>
                <button
                  onClick={() => void load()}
                  disabled={loading}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
                  title="Refresh inbox"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setGmailPanelOpen(false)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Updated strip */}
            {fetchedAt && !loading && !fetchError && (
              <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20 border-b border-border/50 flex-shrink-0">
                <span className="text-[9px] text-muted-foreground/60">
                  Updated {new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Open Gmail <ArrowRight className="w-2.5 h-2.5" />
                </a>
              </div>
            )}

            {/* Thread list */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">

                {/* Loading skeleton */}
                {loading && (
                  <div className="p-3 space-y-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex items-start gap-2.5 p-3 animate-pulse">
                        <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2.5 bg-muted rounded w-1/3" />
                          <div className="h-2 bg-muted rounded w-2/3" />
                          <div className="h-2 bg-muted rounded w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Error */}
                {!loading && fetchError && (
                  <div className="p-4">
                    {fetchError.includes('insufficient authentication scopes') ? (
                      <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-[#CC8400] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[12px] font-semibold text-[#CC8400]">Inbox reading requires app verification</p>
                            <p className="text-[11px] text-[#CC8400] mt-0.5 leading-snug">
                              Reading Gmail inbox requires <code className="font-mono bg-[#FFF3E0] px-1 rounded">gmail.readonly</code> — a Google "restricted" scope that needs a formal security review before it works in production. <strong>Compose and send still work</strong> via the button below.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-[#A93F2F] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[12px] font-semibold text-[#A93F2F]">Could not load inbox</p>
                            <p className="text-[11px] text-[#A93F2F] mt-0.5">{fetchError}</p>
                            {fetchError.includes('GOOGLE_GMAIL_REFRESH_TOKEN') && (
                              <p className="text-[10px] text-[#A93F2F] mt-1">
                                Store your Gmail refresh token as <code className="font-mono bg-[#FBEAE6] px-1 rounded">GOOGLE_GMAIL_REFRESH_TOKEN</code> in Replit Secrets and restart the API server.
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => void load()}
                          className="text-[11px] text-[#A93F2F] border border-[#E8B9B4] rounded-md px-2.5 py-1 hover:bg-[#FBEAE6] transition-colors"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Needs action section */}
                {!loading && !fetchError && actionNeeded.length > 0 && (
                  <div className="px-4 pt-3 pb-1">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertCircle className="w-3 h-3 text-[#CC8400]" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#CC8400]">
                        Needs Response ({actionNeeded.length})
                      </p>
                    </div>
                  </div>
                )}

                {/* Thread rows */}
                {!loading && !fetchError && threads.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectThread(t)}
                    className={`w-full flex items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/40 border-b border-border/30 ${
                      selectedId === t.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                    } ${sentIds.has(t.id) ? 'opacity-50' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${avatarColor(t.fromEmail)}`}>
                      {initials(t.from)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          {t.unread && !sentIds.has(t.id) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          )}
                          <span className={`text-[11px] truncate ${t.unread && !sentIds.has(t.id) ? 'font-bold' : 'font-medium text-foreground/80'}`}>
                            {t.from}
                          </span>
                          {t.starred && <Star className="w-2.5 h-2.5 text-[#CC8400] fill-[#CC8400] shrink-0" />}
                        </div>
                        <span className="text-[9px] text-muted-foreground shrink-0">{formatDate(t.date)}</span>
                      </div>

                      <p className={`text-[11px] truncate mb-0.5 ${t.unread && !sentIds.has(t.id) ? 'font-semibold' : 'text-foreground/70'}`}>
                        {t.subject}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{t.snippet}</p>

                      {t.needsAction && !sentIds.has(t.id) && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-semibold text-[#CC8400] bg-[#FFF3E0] border border-[#FFD08A] rounded-full px-1.5 py-0.5">
                          <AlertCircle className="w-2 h-2" /> Reply needed
                        </span>
                      )}
                      {sentIds.has(t.id) && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-semibold text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-1.5 py-0.5">
                          <CheckCircle2 className="w-2 h-2" /> Replied
                        </span>
                      )}
                    </div>
                  </button>
                ))}

                {/* Zero state */}
                {!loading && !fetchError && threads.length === 0 && (
                  <div className="p-6 text-center">
                    <CheckCircle2 className="w-7 h-7 text-[#2F6B3F] mx-auto mb-2" />
                    <p className="text-[13px] font-semibold text-foreground mb-1">Inbox zero</p>
                    <p className="text-[11px] text-muted-foreground">No messages in your inbox.</p>
                  </div>
                )}

              </ScrollArea>
            </div>

            {/* Compose / Reply drawer */}
            {composeMode !== 'hidden' && (
              <div className="border-t border-border bg-card flex-shrink-0">

                {/* Drawer header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
                  <div className="flex items-center gap-1.5">
                    {composeMode === 'reply'
                      ? <Reply className="w-3 h-3 text-primary" />
                      : <Pencil className="w-3 h-3 text-primary" />
                    }
                    <span className="text-[11px] font-semibold text-foreground">
                      {composeMode === 'reply' && selectedThread
                        ? `Reply to ${selectedThread.from.split(' ')[0]}`
                        : 'New Message'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setComposeCollapsed(c => !c)}
                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                    >
                      {composeCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={closeCompose}
                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {!composeCollapsed && (
                  <div className="p-3 space-y-2">

                    {/* To field */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-medium w-8 shrink-0">To</span>
                      <input
                        value={to}
                        onChange={e => setTo(e.target.value)}
                        placeholder="recipient@example.com"
                        className="flex-1 text-[11px] text-foreground bg-muted/30 border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40"
                      />
                    </div>

                    {/* Penny prompt — only for replies before body is written */}
                    {!body && !generating && composeMode === 'reply' && selectedThread && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void handlePenny()}
                          className="flex items-center gap-1.5 text-[10px] font-semibold text-primary border border-primary/30 rounded-md px-2.5 py-1.5 hover:bg-primary/5 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          Ask {TERMS.aiAssistant} to draft
                        </button>
                        <span className="text-[9px] text-muted-foreground">or write below</span>
                      </div>
                    )}

                    {/* Penny generating */}
                    {generating && (
                      <div className="flex items-center gap-2 py-0.5">
                        <Brain className="w-3.5 h-3.5 text-primary animate-pulse" />
                        <span className="text-[10px] text-muted-foreground">{TERMS.aiAssistant} is drafting…</span>
                      </div>
                    )}

                    {/* Penny error */}
                    {pennyError && (
                      <div className="flex items-center gap-1.5 text-[10px] text-[#A93F2F]">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{pennyError}</span>
                      </div>
                    )}

                    {/* Body textarea */}
                    <div className="relative">
                      <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder={composeMode === 'reply' ? 'Write a reply…' : 'Write your message…'}
                        rows={5}
                        className="w-full text-[11px] text-foreground bg-muted/30 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none leading-relaxed"
                      />
                      {pennyDone && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] text-primary opacity-70">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{TERMS.aiAssistant} draft</span>
                        </div>
                      )}
                    </div>

                    {/* Send error */}
                    {sendError && (
                      <div className="flex items-center gap-1.5 text-[10px] text-[#A93F2F]">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{sendError}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void handleSend()}
                        disabled={!body.trim() || !to.trim() || sending}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-foreground bg-primary rounded-md px-3 py-1.5 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className={`w-3 h-3 ${sending ? 'animate-pulse' : ''}`} />
                        {sending ? 'Sending…' : composeMode === 'reply' ? 'Send Reply' : 'Send'}
                      </button>
                      <button
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                        title="Attach file (coming soon)"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setBody(''); setPennyDone(false); }}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors ml-auto"
                        title="Clear draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[9px] text-muted-foreground/40 text-center">
                      Sends via Gmail · {TERMS.aiAssistant} draft by Gemini 2.5 Flash · no auto-send
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Compose button — always available when token is present, even if inbox reading is blocked */}
            {!loading && composeMode === 'hidden' && (
              <div className="px-4 py-2 border-t border-border flex-shrink-0 bg-muted/20 flex items-center justify-between gap-2">
                <p className="text-[9px] text-muted-foreground/50">
                  {fetchError?.includes('insufficient') ? 'Send-only mode · inbox reading requires app verification' : `gmail.send · ${TERMS.aiAssistant} draft by Gemini 2.5 Flash`}
                </p>
                <button
                  onClick={() => setComposeMode('new')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity shrink-0"
                >
                  <Pencil className="w-3 h-3" /> Compose
                </button>
              </div>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
