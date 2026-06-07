import { useState, useRef, useEffect } from 'react';
import { Send, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Message {
  role: 'user' | 'penny';
  content: string;
  time: string;
}

const SEED: Message[] = [
  {
    role: 'penny',
    content: "Hello! I'm Penny, your Transition Trails guide. I can help you navigate programs, understand the RESOLVE framework, answer questions about your trail, and more. What can I help you with today?",
    time: '—',
  },
];

const RESPONSES: Array<[RegExp, string]> = [
  [/program|programs|available|offer/i,
    "Transition Trails offers five programs: Explorer's Trail (8 weeks, group cohort), Foundations Trail (6 weeks, self-paced), Guided Trail (12 weeks, 1:1 coaching), Trail of Mastery (advanced, invite-only), and Digital Compass (8 weeks, hybrid). Would you like details on any of these?"],
  [/resolve|framework|methodology/i,
    "The RESOLVE framework is our seven-phase change and project methodology: Recognize, Explore, Select, Outline, Launch, Verify, Evolve. Each phase has defined inputs, outputs, and tools. Which phase would you like to explore?"],
  [/penny|you|who are you/i,
    "I'm Penny — Transition Trails' AI guide, built on Agentforce. I help learners navigate programs, answer methodology questions, support Trail Quests, and connect you to the right resources. I'm in prototype mode right now, so some answers may be simplified."],
  [/explorer/i,
    "Explorer's Trail is an 8-week cohort-based program designed for professionals beginning a career or business transition. It covers the RESOLVE framework foundations, goal-setting, and initial action planning. The current cohort (Cohort 3) has 12 of 15 spots filled."],
  [/refund|money|price|cost|pay/i,
    "Pricing and refund questions are best handled by our support team. I can connect you with a human advisor — would you like me to flag this for follow-up? (Note: in this prototype, no actual escalation will occur.)"],
  [/hello|hi|hey|greet/i,
    "Hello! Great to hear from you. I'm here to help with anything related to Transition Trails programs, the RESOLVE framework, or your learning journey. What's on your mind?"],
  [/next|what.*do/i,
    "Your next step depends on where you are in your trail. Are you currently enrolled in a program? I can help you identify the right RESOLVE phase or Trail Quest to focus on next."],
];

function getResponse(input: string): string {
  for (const [pattern, reply] of RESPONSES) {
    if (pattern.test(input)) return reply;
  }
  return "That's a great question. In the full Trail OS platform, I'd pull context from your program record, RESOLVE phase history, and knowledge library to answer precisely. For now, I'd suggest checking the Knowledge Library or asking your facilitator directly. Is there anything else I can help with?";
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TestPenny() {
  const [messages, setMessages] = useState<Message[]>(SEED);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function send() {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { role: 'user', content: text, time: now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { role: 'penny', content: getResponse(text), time: now() }]);
    }, 900 + Math.random() * 600);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Penny Command Center</span>
              <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">Prototype Mode</Badge>
            </div>
            <h1 className="text-2xl font-serif font-bold text-foreground">Test Penny</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Interactive prototype — pattern-matched responses, not live AI</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-primary/5 border border-primary/20 rounded-full px-3 py-1">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-primary">Penny</span>
              <span className="text-muted-foreground">— prototype</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-4 max-w-2xl">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'penny' && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Brain className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card border border-border text-foreground rounded-bl-sm'
                  }`}>
                    <p className="text-sm leading-relaxed">{m.content}</p>
                    {m.time !== '—' && (
                      <p className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'}`}>
                        {m.time}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Brain className="w-3.5 h-3.5 text-primary" />
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

          <div className="flex-shrink-0 px-6 py-4 border-t bg-card">
            <div className="flex gap-2 max-w-2xl">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask Penny something... (try: 'What programs are available?')"
                className="flex-1 text-sm border border-border rounded-full px-4 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button size="icon" onClick={send} disabled={!input.trim() || typing} className="rounded-full h-9 w-9">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="w-[220px] flex-shrink-0 border-l bg-card p-4 overflow-y-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Session Info</p>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div><span className="font-semibold text-foreground block mb-0.5">Mode</span>Prototype — pattern matched</div>
            <div><span className="font-semibold text-foreground block mb-0.5">Model</span>Future: Agentforce</div>
            <div><span className="font-semibold text-foreground block mb-0.5">Messages</span>{messages.length}</div>
            <div><span className="font-semibold text-foreground block mb-0.5">Context</span>All programs + RESOLVE + capabilities</div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Try asking:</p>
            <div className="space-y-1.5">
              {["What programs are available?", "Explain the RESOLVE framework", "Tell me about Explorer's Trail", "Who are you?"].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="w-full text-left text-[11px] text-muted-foreground bg-muted hover:bg-primary/10 hover:text-primary rounded-md px-2 py-1.5 transition-colors"
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
