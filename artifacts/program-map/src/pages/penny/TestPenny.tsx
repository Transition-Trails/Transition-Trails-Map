import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Brain, Zap, AlertCircle, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'penny';
  content: string;
  time: string;
  durationMs?: number;
  error?: boolean;
  system?: boolean;
}

interface LearnerSummary {
  id: string;
  firstName: string;
  lastName: string;
  pennyTrail: string | null;
}

interface ContextMeta {
  contactId: string | null;
  learnerName: string | null;
  trailId: string | null;
  trailConfigId: string | null;
  currentPhase: string | null;
  currentGoal: string | null;
  coachingTone: string | null;
  confidenceScore: number | null;
  promptPath: 'salesforce' | 'fallback';
  interactionLogged: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SEED: Message[] = [
  {
    role: 'penny',
    content: "Hello! I'm Penny, your Transition Trails AI guide. I can help with programs, the RESOLVE framework, learner journeys, Salesforce data, operations, and more. What can I help you with today?",
    time: '—',
  },
];

const STARTERS = [
  "What programs are available?",
  "Explain the RESOLVE framework",
  "How is Salesforce connected to Trail OS?",
  "What's the status of Phase 1?",
  "How do Trail Quests work?",
  "What can Penny do right now?",
];

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin:      'Admin',
  poweruser:  'Power User',
  everyday:   'Everyday User',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildHistory(messages: Message[]): Array<{ role: 'user' | 'model'; text: string }> {
  return messages
    .filter(m => m.time !== '—' && !m.error && !m.system)
    .map(m => ({ role: m.role === 'user' ? ('user' as const) : ('model' as const), text: m.content }));
}

function trailBadgeClass(trail: string | null): string {
  if (!trail) return 'bg-muted/60 text-muted-foreground border-border';
  const t = trail.toLowerCase();
  if (t.includes('guided'))                              return 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]';
  if (t.includes('explorer'))                            return 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]';
  if (t.includes('mastery'))                             return 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]';
  if (t.includes('community') || t.includes('alumni'))  return 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]';
  return 'bg-muted/60 text-muted-foreground border-border';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TestPenny() {
  const { userTier } = useAppContext();

  // Chat state
  const [messages, setMessages] = useState<Message[]>(SEED);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [lastMs, setLastMs]     = useState<number | null>(null);

  // Learner selector state
  const [learners, setLearners]                 = useState<LearnerSummary[]>([]);
  const [learnersLoading, setLearnersLoading]   = useState(true);
  const [learnersError, setLearnersError]       = useState(false);
  const [selectedLearner, setSelectedLearner]   = useState<LearnerSummary | null>(null);

  // Live context state
  const [contextMeta, setContextMeta] = useState<ContextMeta | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch learners on mount
  useEffect(() => {
    fetch('/api/penny/data/learners/directory')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<LearnerSummary[]>;
      })
      .then(data => {
        setLearners(data);
        setLearnersLoading(false);
      })
      .catch(() => {
        setLearnersLoading(false);
        setLearnersError(true);
      });
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle learner selection change
  const handleLearnerChange = useCallback((id: string) => {
    if (!id) {
      setSelectedLearner(null);
      setContextMeta(null);
      setMessages(SEED);
      return;
    }
    const learner = learners.find(l => l.id === id) ?? null;
    setSelectedLearner(learner);
    setContextMeta(null);
    if (learner) {
      setMessages([{
        role:    'penny',
        content: `Now testing as ${learner.firstName} ${learner.lastName} on ${learner.pennyTrail ?? 'No trail assigned'}. Conversation cleared.`,
        time:    now(),
        system:  true,
      }]);
    } else {
      setMessages(SEED);
    }
  }, [learners]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text, time: now() };
    const history = buildHistory(messages);

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        query:   text,
        context: 'Test Penny',
        role:    userTier,
        history,
      };
      if (selectedLearner) {
        body['contactId'] = selectedLearner.id;
      }

      const resp = await fetch('/api/penny/ask', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      const data = await resp.json() as {
        reply?: string;
        error?: string;
        durationMs?: number;
        contextMeta?: ContextMeta;
      };

      if (!resp.ok || data.error) {
        setMessages(prev => [...prev, {
          role:    'penny',
          content: data.error ?? 'Something went wrong. Please try again.',
          time:    now(),
          error:   true,
        }]);
      } else {
        setLastMs(data.durationMs ?? null);
        if (data.contextMeta) setContextMeta(data.contextMeta);
        setMessages(prev => [...prev, {
          role:      'penny',
          content:   data.reply!,
          time:      now(),
          durationMs: data.durationMs,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role:    'penny',
        content: "Couldn't reach Penny right now — check your connection and try again.",
        time:    now(),
        error:   true,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  }

  const msgCount      = messages.filter(m => m.role === 'user').length;
  const hasSentMessage = msgCount > 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Penny Command Center</span>
              <Badge variant="outline" className="text-[10px] bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE] flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> Live · Gemini 2.5 Flash
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Test Penny</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Live AI — powered by Gemini 2.5 Flash · role-aware · multi-turn</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] bg-primary/5 border border-primary/20 rounded-full px-3 py-1">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-primary">Penny</span>
              <span className="text-muted-foreground">— {ROLE_LABELS[userTier] ?? userTier}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Messages */}
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-4 max-w-2xl">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'penny' && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      m.error ? 'bg-[#FBEAE6]' : m.system ? 'bg-[#FFF3E0]' : 'bg-primary/10'
                    }`}>
                      {m.error
                        ? <AlertCircle className="w-3.5 h-3.5 text-[#A93F2F]" />
                        : <Brain className={`w-3.5 h-3.5 ${m.system ? 'text-[#CC8400]' : 'text-primary'}`} />}
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : m.error
                        ? 'bg-[#FBEAE6] border border-[#E8B9B4] text-[#A93F2F] rounded-bl-sm'
                        : m.system
                          ? 'bg-[#FFF3E0] border border-[#FFD08A] text-[#CC8400] rounded-bl-sm'
                          : 'bg-card border border-border text-foreground rounded-bl-sm'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    {m.time !== '—' && (
                      <p className={`text-[10px] mt-1 flex items-center gap-1.5 ${
                        m.role === 'user' ? 'text-primary-foreground/60 justify-end' : 'text-muted-foreground'
                      }`}>
                        {m.time}
                        {m.durationMs !== undefined && (
                          <span className="text-muted-foreground/60">· {(m.durationMs / 1000).toFixed(1)}s</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Brain className="w-3.5 h-3.5 text-primary animate-pulse" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1 items-center h-5">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="flex-shrink-0 px-6 py-4 border-t bg-card space-y-3">

            {/* Learner selector */}
            <div className="flex items-center gap-2 max-w-2xl">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap flex-shrink-0">
                Test as
              </span>
              {learnersLoading ? (
                <span className="text-[12px] text-muted-foreground">Loading learners…</span>
              ) : learnersError ? (
                <span className="text-[12px] text-[#A93F2F]">Unable to load learners</span>
              ) : (
                <div className="relative flex-1">
                  <select
                    value={selectedLearner?.id ?? ''}
                    onChange={e => handleLearnerChange(e.target.value)}
                    className="w-full text-[12px] border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 appearance-none pr-7"
                  >
                    <option value="">Your Salesforce Session (default)</option>
                    {learners.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.firstName} {l.lastName} — {l.pennyTrail ?? 'No trail'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </div>

            {/* Message input + send */}
            <div className="flex gap-2 max-w-2xl">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
                placeholder="Ask Penny anything about Trail OS, programs, or your learning journey…"
                className="flex-1 text-sm border border-border rounded-full px-4 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
              <Button
                size="icon"
                onClick={() => { void send(); }}
                disabled={!input.trim() || loading}
                className="rounded-full h-9 w-9"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Sidebar — Live Context Panel ── */}
        <div className="w-80 flex-shrink-0 border-l border-gray-700 bg-gray-900 p-4 overflow-y-auto space-y-4">

          {/* SECTION 1 — Testing As */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Testing As</p>
            {selectedLearner ? (
              <div className="space-y-1.5">
                <p className="text-[13px] font-semibold text-foreground leading-tight">
                  {selectedLearner.firstName} {selectedLearner.lastName}
                </p>
                <span className={`inline-flex text-[10px] font-medium border rounded-full px-2 py-0.5 ${trailBadgeClass(selectedLearner.pennyTrail)}`}>
                  {selectedLearner.pennyTrail ?? 'No trail'}
                </span>
                {contextMeta?.currentPhase && (
                  <p className="text-[11px] text-muted-foreground">Phase: {contextMeta.currentPhase}</p>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">Your Salesforce Session</p>
            )}
          </div>

          {/* SECTION 2 — Live Context */}
          <div className="pt-3 border-t border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Live Context</p>
            {!hasSentMessage ? (
              <p className="text-[11px] text-muted-foreground/60 italic leading-relaxed">
                Send a message to load live context.
              </p>
            ) : (
              <div className="space-y-2.5 text-[12px]">

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Prompt Path</span>
                  {contextMeta ? (
                    contextMeta.promptPath === 'salesforce' ? (
                      <span className="flex items-center gap-1 text-[#2F6B3F] font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Salesforce
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#CC8400] font-medium">
                        <AlertTriangle className="w-3 h-3" /> Fallback
                      </span>
                    )
                  ) : <span className="text-muted-foreground">—</span>}
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Current Goal</span>
                  <span className={`leading-snug ${contextMeta?.currentGoal ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {contextMeta?.currentGoal ?? '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Current Phase</span>
                  <span className="text-muted-foreground">{contextMeta?.currentPhase ?? '—'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Coaching Tone</span>
                  <span className="text-muted-foreground">{contextMeta?.coachingTone ?? '—'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Confidence Score</span>
                  <span className="text-muted-foreground">
                    {contextMeta?.confidenceScore != null ? `${contextMeta.confidenceScore}/10` : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Trail</span>
                  <span className="text-muted-foreground">{contextMeta?.trailId ?? '—'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Interaction Logged</span>
                  {contextMeta ? (
                    contextMeta.promptPath === 'salesforce' ? (
                      <span className="flex items-center gap-1 text-[#2F6B3F] font-medium text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> Yes
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">No (fallback)</span>
                    )
                  ) : <span className="text-muted-foreground">—</span>}
                </div>

              </div>
            )}
          </div>

          {/* SECTION 3 — Session */}
          <div className="pt-3 border-t border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Session</p>
            <div className="space-y-2 text-[12px]">
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Model</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Zap className="w-3 h-3" /> Gemini 2.5 Flash
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Messages</span>
                <span className="text-muted-foreground">{msgCount} sent</span>
              </div>
              {lastMs !== null && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Last Response</span>
                  <span className="text-muted-foreground">{(lastMs / 1000).toFixed(1)}s</span>
                </div>
              )}
            </div>
          </div>

          {/* Starter prompts */}
          <div className="pt-3 border-t border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Try asking</p>
            <div className="space-y-1.5">
              {STARTERS.map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  disabled={loading}
                  className="w-full text-left text-[11px] text-muted-foreground bg-muted hover:bg-primary/10 hover:text-primary rounded-md px-2 py-1.5 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
