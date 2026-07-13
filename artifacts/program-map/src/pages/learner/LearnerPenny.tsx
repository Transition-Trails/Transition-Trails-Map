import { useState, useEffect, useRef } from 'react';
import { Sparkles, SendHorizontal } from 'lucide-react';
import LearnerShell from '@/layouts/LearnerShell';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'penny';
  text: string;
}

interface PennyResponse {
  reply?: string;
  error?: string;
}

// ── Penny avatar ──────────────────────────────────────────────────────────────

function PennyAvatar() {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
      style={{ background: '#2F6B3F' }}
    >
      <Sparkles className="w-4 h-4 text-white" />
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-end gap-2">
      <PennyAvatar />
      <div
        className="rounded-2xl rounded-tl-sm border px-4 py-3"
        style={{ background: 'white', borderColor: '#E2E4E1' }}
      >
        <div className="flex gap-1 items-center h-4">
          {[0,1,2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ background: '#2F6B3F', animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LearnerPenny() {
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [greeting,  setGreeting]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Initial greeting on mount
  useEffect(() => {
    setGreeting(true);
    fetch('/api/learner/penny/ask', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: 'Hello! Give me a brief, warm welcome and ask how I can help with my trail today.', history: [] }),
    })
      .then(r => r.ok ? r.json() as Promise<PennyResponse> : null)
      .then(data => {
        if (data?.reply) {
          setMessages([{ role: 'penny', text: data.reply }]);
        }
        setGreeting(false);
      })
      .catch(() => setGreeting(false));
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    const history = messages.map(m => ({ role: m.role === 'penny' ? 'model' : 'user', text: m.text }));

    try {
      const resp = await fetch('/api/learner/penny/ask', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: text, history }),
      });
      const data = await resp.json() as PennyResponse;
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'penny', text: data.reply! }]);
      } else {
        setMessages(prev => [...prev, { role: 'penny', text: "I'm having trouble connecting right now. Please try again in a moment." }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'penny', text: "I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <LearnerShell>
      <div className="flex flex-col h-full">

        {/* ── Chat area ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* Initial greeting skeleton */}
          {greeting && messages.length === 0 && <TypingDots />}

          {messages.map((msg, i) => (
            msg.role === 'penny' ? (
              <div key={i} className="flex items-end gap-2">
                <PennyAvatar />
                <div
                  className="rounded-2xl rounded-tl-sm border px-3 py-2 max-w-[85%] text-[13px]"
                  style={{ background: 'white', borderColor: '#E2E4E1', color: '#2A2E2C' }}
                >
                  {msg.text}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-end">
                <div
                  className="rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] text-[13px] text-white"
                  style={{ background: '#2F6B3F' }}
                >
                  {msg.text}
                </div>
              </div>
            )
          ))}

          {sending && <TypingDots />}
          <div ref={bottomRef} />
        </div>

        {/* ── Input area ─────────────────────────────────────────────────── */}
        <div
          className="shrink-0 border-t p-3 flex gap-2 items-end"
          style={{ background: 'white', borderColor: '#E2E4E1' }}
        >
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={sending || greeting}
            placeholder="Ask Penny anything about your trail…"
            rows={1}
            className="flex-1 resize-none rounded-xl border px-3 py-2 text-[13px] min-h-[40px] max-h-[120px] focus:outline-none focus:ring-1"
            style={{
              borderColor: '#E2E4E1',
              '--tw-ring-color': '#2F6B3F',
            } as React.CSSProperties}
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || sending || greeting}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40"
            style={{ background: '#2F6B3F' }}
          >
            <SendHorizontal className="w-4 h-4 text-white" />
          </button>
        </div>

      </div>
    </LearnerShell>
  );
}
