/**
 * GmailActionPanel — global mail slide-over accessible from the Topbar.
 * Hybrid layout: thread list on top, collapsible reply/compose drawer at bottom.
 * Penny AI drafting via /api/penny/ask. Mounts in AppShell.
 * Triggered via gmailPanelOpen in AppContext.
 * Gmail OAuth (gmail.readonly + gmail.compose) is Phase 2 — uses mock data now.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, RefreshCw, Brain, Send, Paperclip,
  ChevronDown, ChevronUp, Star, Sparkles, AlertCircle,
  ArrowRight, Pencil, Reply, Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Thread {
  id: string;
  from: string;
  initials: string;
  avatarCls: string;
  subject: string;
  snippet: string;
  time: string;
  unread: boolean;
  starred: boolean;
  needsAction: boolean;
  replyTo: string;
}

type ComposeMode = 'hidden' | 'reply' | 'new';

// ── Mock data (Phase 2: replace with /api/gmail/threads) ────────────────────────

const MOCK_THREADS: Thread[] = [
  {
    id: '1', from: 'Sarah Chen', initials: 'SC', avatarCls: 'bg-violet-100 text-violet-700',
    replyTo: 'sarah.chen@grantpartners.org',
    subject: 'Q3 Grant Report — Action Required',
    snippet: 'We need the program outcome data from your team before we can finalize the application.',
    time: '9:42 AM', unread: true, starred: true, needsAction: true,
  },
  {
    id: '2', from: 'Marcus Thompson', initials: 'MT', avatarCls: 'bg-sky-100 text-sky-700',
    replyTo: 'm.thompson@transitiontrails.org',
    subject: 'Learner Cohort 7 — Enrollment Data',
    snippet: 'Please review and confirm the Penny intake survey links are ready before launch.',
    time: '8:15 AM', unread: true, starred: false, needsAction: true,
  },
  {
    id: '3', from: 'Keisha Williams', initials: 'KW', avatarCls: 'bg-emerald-100 text-emerald-700',
    replyTo: 'k.williams@transitiontrails.org',
    subject: 'Re: Trail OS onboarding — notes',
    snippet: 'Can we schedule a follow-up next week? The team had great questions about Penny.',
    time: 'Yesterday', unread: false, starred: false, needsAction: false,
  },
  {
    id: '4', from: 'Jordan Lee', initials: 'JL', avatarCls: 'bg-amber-100 text-amber-700',
    replyTo: 'j.lee@transitiontrails.org',
    subject: 'Curriculum review — Modules 4–6',
    snippet: 'Gap analysis attached. A few areas need instructor sign-off before finalizing.',
    time: 'Mon', unread: false, starred: true, needsAction: false,
  },
];

// ── Penny draft via API ────────────────────────────────────────────────────────

async function fetchPennyDraft(thread: Thread): Promise<string> {
  const query =
    `I need to write a professional email reply to ${thread.from} (${thread.replyTo}). ` +
    `Subject: "${thread.subject}". Their message: "${thread.snippet}". ` +
    `Write a concise, warm reply (3–5 sentences) in first person as Angela from Transition Trails. ` +
    `Start with a greeting, acknowledge their message, and give a clear next step.`;

  const resp = await fetch('/api/penny/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context: 'Gmail Action Panel', role: 'admin' }),
  });
  const data = await resp.json() as { reply?: string; error?: string };
  if (!resp.ok || data.error) throw new Error(data.error ?? 'Penny could not generate a draft.');
  return data.reply!;
}

// ── GmailActionPanel ──────────────────────────────────────────────────────────

export function GmailActionPanel() {
  const { gmailPanelOpen, setGmailPanelOpen } = useAppContext();

  const [selectedId, setSelectedId]     = useState<string | null>('1');
  const [composeMode, setComposeMode]   = useState<ComposeMode>('reply');
  const [to, setTo]                     = useState(MOCK_THREADS[0].replyTo);
  const [body, setBody]                 = useState('');
  const [generating, setGenerating]     = useState(false);
  const [pennyDone, setPennyDone]       = useState(false);
  const [pennyError, setPennyError]     = useState<string | null>(null);
  const [composeCollapsed, setComposeCollapsed] = useState(false);
  const [sentId, setSentId]             = useState<string | null>(null);

  const unreadCount = MOCK_THREADS.filter(t => t.unread).length;
  const selectedThread = MOCK_THREADS.find(t => t.id === selectedId);

  function selectThread(t: Thread) {
    setSelectedId(t.id);
    setTo(t.replyTo);
    setComposeMode('reply');
    setBody('');
    setPennyDone(false);
    setPennyError(null);
    setComposeCollapsed(false);
  }

  function startNew() {
    setSelectedId(null);
    setTo('');
    setComposeMode('new');
    setBody('');
    setPennyDone(false);
    setPennyError(null);
    setComposeCollapsed(false);
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

  function handleSend() {
    setSentId(selectedId);
    setComposeMode('hidden');
    setBody('');
    setPennyDone(false);
    setTimeout(() => setSentId(null), 3000);
  }

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
                <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-rose-600" />
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
                    Inbox · {MOCK_THREADS.length} threads · Gmail phase 2
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="flex items-center gap-1 text-[9px] text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 mr-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="font-semibold">Preview</span>
                </div>
                <button
                  onClick={startNew}
                  className="flex items-center gap-1 text-[10px] font-semibold text-primary border border-primary/30 rounded-md px-2 py-1 hover:bg-primary/5 transition-colors"
                  title="Compose new message"
                >
                  <Pencil className="w-2.5 h-2.5" /> Compose
                </button>
                <button
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setGmailPanelOpen(false)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Strip: open gmail link */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20 border-b border-border/50 flex-shrink-0">
              <span className="text-[9px] text-muted-foreground/60">Mock data · Gmail OAuth in Phase 2</span>
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Open Gmail <ArrowRight className="w-2.5 h-2.5" />
              </a>
            </div>

            {/* Thread list */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="divide-y divide-border/50">
                  {MOCK_THREADS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => selectThread(t)}
                      className={`w-full flex items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                        selectedId === t.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                      } ${sentId === t.id ? 'opacity-50' : ''}`}
                    >
                      {/* Avatar */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${t.avatarCls}`}>
                        {t.initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            {t.unread && sentId !== t.id && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            )}
                            <span className={`text-[11px] truncate ${t.unread && sentId !== t.id ? 'font-bold' : 'font-medium text-foreground/80'}`}>
                              {t.from}
                            </span>
                            {t.starred && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />}
                          </div>
                          <span className="text-[9px] text-muted-foreground shrink-0">{t.time}</span>
                        </div>

                        <p className={`text-[11px] truncate mb-0.5 ${t.unread && sentId !== t.id ? 'font-semibold' : 'text-foreground/70'}`}>
                          {t.subject}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{t.snippet}</p>

                        {t.needsAction && sentId !== t.id && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                            <AlertCircle className="w-2 h-2" /> Reply needed
                          </span>
                        )}
                        {sentId === t.id && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                            ✓ Replied
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
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
                      onClick={() => { setComposeMode('hidden'); setBody(''); setPennyDone(false); setPennyError(null); }}
                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {!composeCollapsed && (
                  <div className="p-3 space-y-2">

                    {/* To field */}
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground font-medium w-8 shrink-0">To</span>
                      <input
                        value={to}
                        onChange={e => setTo(e.target.value)}
                        className="flex-1 text-[11px] text-foreground bg-muted/30 border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40"
                      />
                    </div>

                    {/* Penny draft prompt */}
                    {!body && !generating && composeMode === 'reply' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void handlePenny()}
                          className="flex items-center gap-1.5 text-[10px] font-semibold text-primary border border-primary/30 rounded-md px-2.5 py-1.5 hover:bg-primary/5 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          Ask Penny to draft
                        </button>
                        <span className="text-[9px] text-muted-foreground">or write below</span>
                      </div>
                    )}

                    {/* Penny generating state */}
                    {generating && (
                      <div className="flex items-center gap-2 py-1">
                        <Brain className="w-3.5 h-3.5 text-primary animate-pulse" />
                        <span className="text-[10px] text-muted-foreground">Penny is drafting…</span>
                      </div>
                    )}

                    {/* Penny error */}
                    {pennyError && (
                      <div className="flex items-center gap-1.5 text-[10px] text-rose-600">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{pennyError}</span>
                      </div>
                    )}

                    {/* Body */}
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
                          <span>Penny draft</span>
                        </div>
                      )}
                    </div>

                    {/* Send + toolbar */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSend}
                        disabled={!body.trim()}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-foreground bg-primary rounded-md px-3 py-1.5 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        {composeMode === 'reply' ? 'Send Reply' : 'Send'}
                      </button>
                      <button
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                        title="Attach file"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setBody(''); setPennyDone(false); }}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors ml-auto"
                        title="Discard draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[9px] text-muted-foreground/40 text-center">
                      Phase 2 · sends via Gmail · Penny draft by Gemini 2.5 Flash · no auto-send
                    </p>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
