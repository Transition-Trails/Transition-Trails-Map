import { useState } from "react";
import {
  X, Mail, RefreshCw, Brain, Send, Paperclip,
  ChevronDown, ChevronUp, Star, Sparkles, AlertCircle,
  ArrowRight, Clock, Pencil, Reply, Trash2, CornerDownLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
}

const THREADS: Thread[] = [
  {
    id: "1", from: "Sarah Chen", initials: "SC", avatarCls: "bg-violet-100 text-violet-700",
    subject: "Q3 Grant Report — Action Required",
    snippet: "We need the program outcome data from your team before we can finalize the application.",
    time: "9:42 AM", unread: true, starred: true, needsAction: true,
  },
  {
    id: "2", from: "Marcus Thompson", initials: "MT", avatarCls: "bg-sky-100 text-sky-700",
    subject: "Learner Cohort 7 — Enrollment Data",
    snippet: "Please review and confirm the Penny intake survey links are ready before launch.",
    time: "8:15 AM", unread: true, starred: false, needsAction: true,
  },
  {
    id: "3", from: "Keisha Williams", initials: "KW", avatarCls: "bg-emerald-100 text-emerald-700",
    subject: "Re: Trail OS onboarding — notes",
    snippet: "Can we schedule a follow-up next week? The team had great questions about Penny.",
    time: "Yesterday", unread: false, starred: false, needsAction: false,
  },
  {
    id: "4", from: "Jordan Lee", initials: "JL", avatarCls: "bg-amber-100 text-amber-700",
    subject: "Curriculum review — Modules 4–6",
    snippet: "Gap analysis attached. A few areas need instructor sign-off before finalizing.",
    time: "Mon", unread: false, starred: true, needsAction: false,
  },
];

const PENNY_DRAFT =
  "Hi Sarah,\n\nThank you for the heads up on the updated deadline. I'll coordinate with our programs team to compile the Q3 outcome data — learner completions, cohort demographics, and milestone progress — and get it to you by Thursday EOD.\n\nLet me know if you need it in a specific format for the grant application.\n\nBest,\nAngela";

type ComposeMode = "hidden" | "reply" | "new";

export function InboxHybrid() {
  const [selectedId, setSelectedId] = useState<string | null>("1");
  const [composeMode, setComposeMode] = useState<ComposeMode>("reply");
  const [to, setTo] = useState("sarah.chen@grantpartners.org");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pennyDone, setPennyDone] = useState(false);
  const [composeCollapsed, setComposeCollapsed] = useState(false);

  const unreadCount = THREADS.filter(t => t.unread).length;
  const selectedThread = THREADS.find(t => t.id === selectedId);

  function selectThread(t: Thread) {
    setSelectedId(t.id);
    setTo(t.id === "1" ? "sarah.chen@grantpartners.org" : t.id === "2" ? "m.thompson@transittrails.org" : "k.williams@transittrails.org");
    setComposeMode("reply");
    setBody("");
    setPennyDone(false);
    setComposeCollapsed(false);
  }

  function startNew() {
    setSelectedId(null);
    setTo("");
    setComposeMode("new");
    setBody("");
    setPennyDone(false);
    setComposeCollapsed(false);
  }

  function handlePenny() {
    setGenerating(true);
    setTimeout(() => {
      setBody(PENNY_DRAFT);
      setGenerating(false);
      setPennyDone(true);
    }, 1300);
  }

  return (
    <div className="min-h-screen bg-muted/20 flex items-start justify-end">
      <div className="w-[400px] min-h-screen flex flex-col bg-card border-l border-border shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-shrink-0">
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
              <p className="text-[9px] text-muted-foreground mt-0.5">Inbox · 4 threads</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 text-[9px] text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="font-semibold">Live</span>
            </div>
            <button onClick={startNew} className="flex items-center gap-1 text-[10px] font-semibold text-primary border border-primary/30 rounded-md px-2 py-1 hover:bg-primary/5 transition-colors">
              <Pencil className="w-2.5 h-2.5" /> Compose
            </button>
            <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors">
              <RefreshCw className="w-3 h-3" />
            </button>
            <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Thread list — takes remaining space above compose */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border/50">
              {THREADS.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectThread(t)}
                  className={`w-full flex items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                    selectedId === t.id ? "bg-primary/5 border-l-2 border-primary" : ""
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${t.avatarCls}`}>
                    {t.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1 min-w-0">
                        {t.unread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        <span className={`text-[11px] truncate ${t.unread ? "font-bold" : "font-medium text-foreground/80"}`}>{t.from}</span>
                        {t.starred && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[9px] text-muted-foreground shrink-0">{t.time}</span>
                    </div>
                    <p className={`text-[11px] truncate mb-0.5 ${t.unread ? "font-semibold" : "text-foreground/70"}`}>{t.subject}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{t.snippet}</p>
                    {t.needsAction && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                        <AlertCircle className="w-2 h-2" /> Reply needed
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Compose / Reply panel — bottom drawer */}
        {composeMode !== "hidden" && (
          <div className="border-t border-border bg-card flex-shrink-0">

            {/* Compose header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
              <div className="flex items-center gap-1.5">
                {composeMode === "reply"
                  ? <Reply className="w-3 h-3 text-primary" />
                  : <Pencil className="w-3 h-3 text-primary" />
                }
                <span className="text-[11px] font-semibold text-foreground">
                  {composeMode === "reply" && selectedThread ? `Reply to ${selectedThread.from.split(" ")[0]}` : "New Message"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setComposeCollapsed(c => !c)}
                  className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted/60"
                >
                  {composeCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => setComposeMode("hidden")}
                  className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted/60"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {!composeCollapsed && (
              <div className="p-3 space-y-2">

                {/* To */}
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground font-medium w-8 shrink-0">To</span>
                  <input
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    className="flex-1 text-[11px] bg-muted/30 border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                {/* Penny draft / textarea */}
                {!body && !generating && composeMode === "reply" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePenny}
                      className="flex items-center gap-1.5 text-[10px] font-semibold text-primary border border-primary/30 rounded-md px-2.5 py-1.5 hover:bg-primary/5 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Ask Penny to draft
                    </button>
                    <span className="text-[9px] text-muted-foreground">or write below</span>
                  </div>
                )}

                {generating && (
                  <div className="flex items-center gap-2 py-1">
                    <Brain className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-[10px] text-muted-foreground">Penny is drafting…</span>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder={composeMode === "reply" ? "Write a reply…" : "Write your message…"}
                    rows={5}
                    className="w-full text-[11px] bg-muted/30 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none leading-relaxed"
                  />
                  {pennyDone && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] text-primary">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Penny draft</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    disabled={!body.trim()}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-foreground bg-primary rounded-md px-3 py-1.5 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    {composeMode === "reply" ? "Send Reply" : "Send"}
                  </button>
                  <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors" title="Attach">
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                  <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors ml-auto" title="Discard">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[9px] text-muted-foreground/40 text-center">
                  Sends via Gmail · Penny by Gemini 2.5 Flash
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
