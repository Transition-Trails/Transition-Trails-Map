import { useState } from "react";
import {
  X, Mail, Send, Brain, ChevronDown, ChevronUp,
  Paperclip, Smile, Trash2, Minimize2, AlertCircle, Sparkles,
  CornerDownLeft,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface RecentThread {
  id: string;
  from: string;
  subject: string;
  time: string;
  unread: boolean;
}

const RECENT: RecentThread[] = [
  { id: "1", from: "Sarah Chen", subject: "Q3 Grant Report — Action Required", time: "9:42 AM", unread: true },
  { id: "2", from: "Marcus Thompson", subject: "Learner Cohort 7 — Enrollment Data", time: "8:15 AM", unread: true },
  { id: "3", from: "Keisha Williams", subject: "Re: Trail OS onboarding session — notes", time: "Yesterday", unread: false },
];

const PENNY_DRAFTS = [
  "Hi Sarah,\n\nThanks for the update on the Q3 grant report deadline. I'll coordinate with our programs team to pull together the outcome data you need by Thursday EOD.\n\nI'll include our learner completion rates, cohort demographics, and program milestone data. Let me know if there's a specific format you'd prefer for the submission.\n\nBest,\nAngela",
  "Hi Marcus,\n\nThank you for sharing the Cohort 7 enrollment data. I've reviewed the spreadsheet — the 23 confirmed learners across 3 tracks looks great.\n\nI'll ensure the Penny intake survey links are active and tested before the cohort start date. I'll send you the confirmed links by end of week.\n\nBest,\nAngela",
];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export function QuickCompose() {
  const [to, setTo] = useState("sarah.chen@grantpartners.org");
  const [subject, setSubject] = useState("Re: Q3 Grant Report — Action Required");
  const [body, setBody] = useState("");
  const [showRecent, setShowRecent] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pennyUsed, setPennyUsed] = useState(false);
  const [sent, setSent] = useState(false);

  function handlePennyDraft() {
    setGenerating(true);
    setTimeout(() => {
      setBody(PENNY_DRAFTS[0]);
      setGenerating(false);
      setPennyUsed(true);
    }, 1400);
  }

  function handleSend() {
    setSent(true);
    setTimeout(() => setSent(false), 2500);
    setBody("");
    setPennyUsed(false);
  }

  const charCount = body.length;

  return (
    <div className="min-h-screen bg-muted/20 flex items-start justify-end">
      <div className="w-[400px] min-h-screen flex flex-col bg-card border-l border-border shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
              <Mail className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground leading-none">New Message</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">via Gmail · Transition Trails</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-[9px] text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="font-semibold">Live</span>
            </div>
            <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors">
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recent threads toggle */}
        <button
          onClick={() => setShowRecent(s => !s)}
          className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border/50 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground">Recent threads</span>
            <Badge variant="secondary" className="h-4 text-[9px] px-1.5 bg-primary/10 text-primary border-0">2 unread</Badge>
          </div>
          {showRecent
            ? <ChevronUp className="w-3 h-3 text-muted-foreground" />
            : <ChevronDown className="w-3 h-3 text-muted-foreground" />
          }
        </button>

        {showRecent && (
          <div className="border-b border-border/50 bg-muted/10">
            {RECENT.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setTo(t.id === "1" ? "sarah.chen@grantpartners.org" : "m.thompson@transittrails.org");
                  setSubject("Re: " + t.subject);
                  setShowRecent(false);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left border-b border-border/30 last:border-0"
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.unread ? "bg-primary" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] truncate ${t.unread ? "font-semibold text-foreground" : "text-foreground/70"}`}>{t.from}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{t.subject}</p>
                </div>
                <span className="text-[9px] text-muted-foreground shrink-0">{t.time}</span>
              </button>
            ))}
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">

            {/* To field */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">To</label>
              <input
                value={to}
                onChange={e => setTo(e.target.value)}
                className="w-full text-[12px] text-foreground bg-muted/30 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40"
              />
            </div>

            {/* Subject field */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full text-[12px] text-foreground bg-muted/30 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40"
              />
            </div>

            {/* Penny draft area */}
            {!body && !generating && (
              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Brain className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-foreground mb-0.5">Ask Penny to draft this reply</p>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Penny will read the thread context and write a professional reply using your voice and tone.
                    </p>
                    <button
                      onClick={handlePennyDraft}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-foreground bg-primary rounded-md px-3 py-1.5 hover:bg-primary/90 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Generate draft
                    </button>
                  </div>
                </div>
              </div>
            )}

            {generating && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center gap-2.5">
                <Brain className="w-4 h-4 text-primary animate-pulse" />
                <div>
                  <p className="text-[11px] font-semibold text-foreground">Penny is drafting…</p>
                  <p className="text-[10px] text-muted-foreground">Reading thread context · matching your tone</p>
                </div>
              </div>
            )}

            {/* Body textarea */}
            <div className="space-y-1">
              {body && (
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Message</label>
                  {pennyUsed && (
                    <div className="flex items-center gap-1 text-[9px] text-primary">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Penny draft — edit freely</span>
                    </div>
                  )}
                </div>
              )}
              {(body || !generating) && (
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Write your message…"
                  rows={body ? 10 : 6}
                  className="w-full text-[12px] text-foreground bg-muted/30 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 resize-none leading-relaxed"
                />
              )}
              {body && (
                <p className="text-[9px] text-muted-foreground/50 text-right">{charCount} chars</p>
              )}
            </div>

            {/* Sent confirmation */}
            {sent && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-[12px] font-semibold text-emerald-700">Message sent!</p>
              </div>
            )}

          </div>
        </ScrollArea>

        {/* Compose toolbar + send */}
        <div className="px-4 py-3 border-t border-border flex-shrink-0 space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSend}
              disabled={!body.trim()}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-primary-foreground bg-primary rounded-lg px-4 py-2 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Send
              <kbd className="ml-1 text-[9px] opacity-60 border border-white/30 rounded px-1">⌘↵</kbd>
            </button>
            <button className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors" title="Attach file">
              <Paperclip className="w-3.5 h-3.5" />
            </button>
            <button className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors" title="Emoji">
              <Smile className="w-3.5 h-3.5" />
            </button>
            <button className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors ml-auto" title="Discard">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground/50 text-center">
            Sends via Gmail · Penny draft by Gemini 2.5 Flash · no auto-send
          </p>
        </div>

      </div>
    </div>
  );
}
