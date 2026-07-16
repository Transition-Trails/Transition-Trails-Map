/**
 * AskPennyPanel — global slide-over chat panel accessible from any page.
 * Mounts in AppShell; triggered via askPennyOpen in AppContext.
 * Injects current route as page context into every Gemini request.
 */
import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Brain, Zap, AlertCircle, Sparkles, RotateCcw, BookOpen, ChevronDown, ChevronUp, FileText, Database, GraduationCap } from 'lucide-react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';

// ── Page label lookup (compact; matches Topbar PAGE_INFO) ────────────────────

const PAGE_LABELS: Record<string, string> = {
  '/':                           'Trail OS Home',
  '/trail-os-overview':          'Trail OS Overview',
  '/digital-twin':               'Digital Twin',
  '/operations':                 'Operations · Executive Overview',
  '/operations/health':          'Operations · Health Indicators',
  '/operations/scorecards':      'Operations · Scorecards',
  '/operations/trends':          'Operations · Trends',
  '/operations/demand':          'Operations · Demand',
  '/program':                    'Programs',
  '/program/standards':          'Programs · Standards',
  '/program/blueprint':          'Programs · Blueprint',
  '/penny':                      'Penny Command Center',
  '/penny/learners':             'Penny · Learners',
  '/penny/intelligence':         'Penny · Intelligence',
  '/penny/prompts':              'Penny · Prompt Studio',
  '/penny/logs':                 'Penny · Logs',
  '/knowledge':                  'Knowledge · Overview',
  '/knowledge/sources':          'Knowledge · Sources',
  '/knowledge/library':          'Knowledge · Library',
  '/knowledge/relationships':    'Knowledge · Relationships',
  '/knowledge/memory':           'Knowledge · Org Memory',
  '/collaboration':              'Collaboration · Overview',
  '/collaboration/slack':        'Collaboration · Slack',
  '/collaboration/drive':        'Collaboration · Google Drive',
  '/collaboration/calendar':     'Collaboration · Google Calendar',
  '/collaboration/channels':     'Collaboration · Channels',
  '/admin/setup':                'Administration · Setup',
  '/admin/people-access':        'Administration · People & Access',
  '/admin/phase1-readiness':     'Administration · Phase 1 Readiness',
  '/admin/phase1-audit':         'Administration · Phase 1 Audit',
  '/search':                     'Global Search',
};

function getPageLabel(path: string): string {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  if (path.startsWith('/admin'))        return 'Administration';
  if (path.startsWith('/operations'))   return 'Operations';
  if (path.startsWith('/penny'))        return 'Penny';
  if (path.startsWith('/knowledge'))    return 'Knowledge Library';
  if (path.startsWith('/collaboration'))return 'Collaboration';
  if (path.startsWith('/program'))      return 'Programs';
  if (path.startsWith('/digital-twin')) return 'Digital Twin';
  if (path.startsWith('/governance'))   return 'Governance';
  if (path.startsWith('/uom'))          return 'Unified Object Model';
  return 'Trail OS';
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Source {
  id: string;
  name: string;
  category: string;
  sourceType: 'drive-doc' | 'salesforce-kb' | 'curriculum' | string;
  confidence: string;
  snippet: string;
  relevance: number;
  driveUrl?: string;
}

interface Message {
  role: 'user' | 'penny';
  content: string;
  time: string;
  durationMs?: number;
  error?: boolean;
  sources?: Source[];
  retrievalMs?: number;
}

// ── Source icon by type ───────────────────────────────────────────────────────

function SourceIcon({ type }: { type: string }) {
  if (type === 'salesforce-kb') return <Database className="w-3 h-3 flex-shrink-0" />;
  if (type === 'curriculum')    return <GraduationCap className="w-3 h-3 flex-shrink-0" />;
  return <FileText className="w-3 h-3 flex-shrink-0" />;
}

function sourceTypeLabel(type: string) {
  if (type === 'salesforce-kb') return 'Salesforce KB';
  if (type === 'curriculum')    return 'Curriculum';
  return 'Drive Doc';
}

// ── Collapsible Sources section ───────────────────────────────────────────────

function SourcesSection({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2 border border-border/50 rounded-xl overflow-hidden bg-background/60">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors gap-2"
      >
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3 h-3" />
          {sources.length} {sources.length === 1 ? 'source' : 'sources'} retrieved
        </span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2.5 pt-0.5 space-y-2">
              {sources.map(s => (
                <div key={s.id} className="flex items-start gap-2">
                  <div className="mt-0.5 text-muted-foreground/60 flex-shrink-0">
                    <SourceIcon type={s.sourceType} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-medium text-foreground leading-tight">{s.name}</span>
                      <span className="text-[9px] bg-muted/60 border border-border/60 rounded-full px-1.5 py-0.5 text-muted-foreground whitespace-nowrap">
                        {sourceTypeLabel(s.sourceType)}
                      </span>
                      {s.confidence === 'draft' && (
                        <span className="text-[9px] bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 text-amber-700 whitespace-nowrap">Draft</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{s.snippet}</p>
                    {s.driveUrl && (
                      <a
                        href={s.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-primary/70 hover:text-primary mt-0.5 inline-block"
                      >
                        Open in Drive →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function makeSeed(): Message[] {
  return [{
    role: 'penny',
    content: `Hi! I'm ${TERMS.aiAssistant}, your Transition Trails AI guide. Ask me anything about programs, learners, Salesforce data, operations, or how Trail OS works.`,
    time: '—',
  }];
}

const STARTERS = [
  'What programs are active right now?',
  'Explain the RESOLVE framework',
  'What should I check in Operations today?',
  'How does Salesforce connect to Trail OS?',
  `What can ${TERMS.aiAssistant} do right now?`,
];

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin:      'Admin',
  poweruser:  'Power User',
  everyday:   'Learner',
};

function ts() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildHistory(msgs: Message[]) {
  return msgs
    .filter(m => m.time !== '—' && !m.error)
    .map(m => ({ role: m.role === 'user' ? 'user' as const : 'model' as const, text: m.content }));
}

// ── Panel ────────────────────────────────────────────────────────────────────

export function AskPennyPanel() {
  const { askPennyOpen, setAskPennyOpen, userTier, pendingPennyQuery, setPendingPennyQuery } = useAppContext();
  const [location] = useLocation();
  const pageLabel  = getPageLabel(location);

  const [messages, setMessages] = useState<Message[]>(makeSeed);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [lastMs, setLastMs]     = useState<number | null>(null);
  const bottomRef      = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const pendingFireRef = useRef(false);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when panel opens; auto-fire pending signal query
  useEffect(() => {
    if (!askPennyOpen) return undefined;
    if (pendingPennyQuery) {
      const captured = pendingPennyQuery;
      const t = setTimeout(() => {
        setPendingPennyQuery(null);
        pendingFireRef.current = true;
        setInput(captured);
      }, 350);
      return () => clearTimeout(t);
    }
    setTimeout(() => inputRef.current?.focus(), 300);
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askPennyOpen]);

  // Auto-send when pendingFireRef is set and input is populated
  useEffect(() => {
    if (pendingFireRef.current && input.trim()) {
      pendingFireRef.current = false;
      void send();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && askPennyOpen) setAskPennyOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [askPennyOpen, setAskPennyOpen]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const history = buildHistory(messages);
    const userMsg: Message = { role: 'user', content: text, time: ts() };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // ── Step 1: retrieve relevant knowledge chunks ───────────────────────
      const retrievalStart = Date.now();
      let retrievedSources: Source[] = [];
      try {
        const rResp = await fetch('/api/penny/retrieve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text, userTier, topN: 3 }),
          signal: AbortSignal.timeout(5_000),
        });
        if (rResp.ok) {
          const rData = await rResp.json() as { sources?: Source[] };
          retrievedSources = rData.sources ?? [];
        }
      } catch {
        // Retrieval failure is non-fatal — Penny still answers without RAG context
      }
      const retrievalMs = Date.now() - retrievalStart;

      // ── Step 2: call Penny with retrieved context ────────────────────────
      const resp = await fetch('/api/penny/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:           text,
          context:         pageLabel,
          role:            userTier,
          history,
          retrievedChunks: retrievedSources,
        }),
      });

      const data = await resp.json() as { reply?: string; error?: string; durationMs?: number };

      if (!resp.ok || data.error) {
        setMessages(prev => [...prev, {
          role: 'penny', content: data.error ?? 'Something went wrong. Please try again.',
          time: ts(), error: true,
        }]);
      } else {
        setLastMs(data.durationMs ?? null);
        setMessages(prev => [...prev, {
          role: 'penny',
          content: data.reply!,
          time: ts(),
          durationMs: data.durationMs,
          sources: retrievedSources.length > 0 ? retrievedSources : undefined,
          retrievalMs: retrievedSources.length > 0 ? retrievalMs : undefined,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'penny',
        content: `Couldn't reach ${TERMS.aiAssistant} — check your connection and try again.`,
        time: ts(), error: true,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  }

  function reset() {
    setMessages(makeSeed());
    setInput('');
    setLastMs(null);
  }

  const userCount = messages.filter(m => m.role === 'user').length;
  const showStarters = userCount === 0 && !loading;

  return (
    <AnimatePresence>
      {askPennyOpen && (
        <>
          {/* Backdrop — closes panel on click */}
          <motion.div
            key="penny-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setAskPennyOpen(false)}
          />

          {/* Panel */}
          <motion.div
            key="penny-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
            className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[400px] bg-card border-l border-border shadow-2xl"
          >
            {/* ── Header ── */}
            <div className="flex-shrink-0 flex flex-col border-b border-border bg-card">
              {/* Top row */}
              <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground leading-none">{TERMS.aiAssistant}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-muted-foreground">Live · Gemini 2.5 Flash</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {userCount > 0 && (
                    <button
                      onClick={reset}
                      title="New conversation"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setAskPennyOpen(false)}
                    title="Close (Esc)"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Page context chip */}
              <div className="px-4 pb-2.5 flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Viewing
                </span>
                <span className="text-[10px] text-muted-foreground bg-muted/50 border border-border/60 rounded-full px-2 py-0.5 font-medium truncate max-w-[260px]">
                  {pageLabel}
                </span>
                {userCount > 0 && (
                  <span className="text-[9px] text-muted-foreground/40 ml-auto flex-shrink-0">
                    {userCount} {userCount === 1 ? 'msg' : 'msgs'}
                    {lastMs !== null && ` · ${(lastMs / 1000).toFixed(1)}s`}
                  </span>
                )}
              </div>
            </div>

            {/* ── Messages ── */}
            <ScrollArea className="flex-1 min-h-0 px-4 py-3">
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'penny' && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        m.error ? 'bg-rose-100' : 'bg-primary/10'
                      }`}>
                        {m.error
                          ? <AlertCircle className="w-3 h-3 text-rose-600" />
                          : <Brain className="w-3 h-3 text-primary" />}
                      </div>
                    )}
                    <div className={`max-w-[84%] ${m.role === 'penny' && m.sources ? 'w-full' : ''}`}>
                      <div className={`rounded-2xl px-3.5 py-2.5 ${
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : m.error
                            ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-bl-sm'
                            : 'bg-muted/60 border border-border/60 text-foreground rounded-bl-sm'
                      }`}>
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        {m.time !== '—' && (
                          <p className={`text-[10px] mt-1 ${
                            m.role === 'user' ? 'text-primary-foreground/50 text-right' : 'text-muted-foreground'
                          }`}>
                            {m.time}
                            {m.durationMs !== undefined && (
                              <span className="ml-1.5 opacity-60">· {(m.durationMs / 1000).toFixed(1)}s</span>
                            )}
                            {m.retrievalMs !== undefined && (
                              <span className="ml-1.5 opacity-40">· {m.retrievalMs}ms retrieval</span>
                            )}
                          </p>
                        )}
                      </div>
                      {m.sources && m.sources.length > 0 && (
                        <SourcesSection sources={m.sources} />
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2.5 justify-start">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Brain className="w-3 h-3 text-primary animate-pulse" />
                    </div>
                    <div className="bg-muted/60 border border-border/60 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                      <div className="flex gap-1 items-center h-4">
                        {[0, 1, 2].map(i => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* ── Starters (shown before first message) ── */}
            {showStarters && (
              <div className="flex-shrink-0 px-4 pb-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1.5">Try asking</p>
                <div className="flex flex-wrap gap-1.5">
                  {STARTERS.slice(0, 4).map(q => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="text-[11px] text-muted-foreground bg-muted/50 hover:bg-primary/10 hover:text-primary border border-border/60 rounded-full px-2.5 py-1 transition-colors text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Input ── */}
            <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-border bg-card">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    disabled={loading}
                    placeholder={`Ask ${TERMS.aiAssistant} anything…`}
                    className="w-full text-[13px] border border-border rounded-full px-4 py-2 pr-10 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 placeholder:text-muted-foreground/50"
                  />
                </div>
                <button
                  onClick={() => { void send(); }}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-1">
                <span className="text-[9px] text-muted-foreground/40">
                  {ROLE_LABELS[userTier] ?? userTier} · Enter to send
                </span>
                <span className="text-[9px] text-muted-foreground/40 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> Gemini 2.5 Flash
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
