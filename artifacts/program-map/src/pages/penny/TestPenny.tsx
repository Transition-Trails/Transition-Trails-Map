import { useState, useRef, useEffect } from 'react';
import { Send, Brain, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';

interface Message {
  role: 'user' | 'penny';
  content: string;
  time: string;
  durationMs?: number;
  error?: boolean;
}

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
  superadmin:  'Super Admin',
  admin:       'Admin',
  poweruser:   'Power User',
  everyday:    'Everyday User',
};

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildHistory(messages: Message[]): Array<{ role: 'user' | 'model'; text: string }> {
  return messages
    .filter(m => m.time !== '—' && !m.error)
    .map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.content }));
}

export default function TestPenny() {
  const { userTier } = useAppContext();
  const [messages, setMessages] = useState<Message[]>(SEED);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [lastMs, setLastMs]     = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text, time: now() };
    const history = buildHistory(messages);

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch('/api/penny/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:   text,
          context: 'Test Penny',
          role:    userTier,
          history,
        }),
      });

      const data = await resp.json() as { reply?: string; error?: string; durationMs?: number };

      if (!resp.ok || data.error) {
        setMessages(prev => [...prev, {
          role: 'penny',
          content: data.error ?? 'Something went wrong. Please try again.',
          time: now(),
          error: true,
        }]);
      } else {
        setLastMs(data.durationMs ?? null);
        setMessages(prev => [...prev, {
          role: 'penny',
          content: data.reply!,
          time: now(),
          durationMs: data.durationMs,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'penny',
        content: "Couldn't reach Penny right now — check your connection and try again.",
        time: now(),
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  }

  const msgCount = messages.filter(m => m.role === 'user').length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Penny Command Center</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
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
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-4 max-w-2xl">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'penny' && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${m.error ? 'bg-rose-100' : 'bg-primary/10'}`}>
                      {m.error
                        ? <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        : <Brain className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : m.error
                        ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-bl-sm'
                        : 'bg-card border border-border text-foreground rounded-bl-sm'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    {m.time !== '—' && (
                      <p className={`text-[10px] mt-1 flex items-center gap-1.5 ${m.role === 'user' ? 'text-primary-foreground/60 justify-end' : 'text-muted-foreground'}`}>
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

          {/* Input */}
          <div className="flex-shrink-0 px-6 py-4 border-t bg-card">
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

        {/* Sidebar */}
        <div className="w-[220px] flex-shrink-0 border-l bg-card p-4 overflow-y-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Session Info</p>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground block mb-0.5">Mode</span>
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <Zap className="w-3 h-3" /> Live AI
              </span>
            </div>
            <div>
              <span className="font-semibold text-foreground block mb-0.5">Model</span>
              Gemini 2.5 Flash
            </div>
            <div>
              <span className="font-semibold text-foreground block mb-0.5">Role</span>
              {ROLE_LABELS[userTier] ?? userTier}
            </div>
            <div>
              <span className="font-semibold text-foreground block mb-0.5">Messages</span>
              {msgCount} sent
            </div>
            {lastMs !== null && (
              <div>
                <span className="font-semibold text-foreground block mb-0.5">Last response</span>
                {(lastMs / 1000).toFixed(1)}s
              </div>
            )}
            <div>
              <span className="font-semibold text-foreground block mb-0.5">Context</span>
              Role · page · history (up to 10 turns)
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Try asking:</p>
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

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
              Responses grounded in Transition Trails context. Live data wiring (Salesforce, Drive) coming in Phase 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
