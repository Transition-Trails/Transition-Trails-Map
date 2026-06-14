import { useState } from "react";
import {
  X, Mail, RefreshCw, AlertCircle, Star, Brain, ArrowRight,
  Paperclip, Clock, ChevronRight, CheckCircle2, Inbox,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Thread {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  time: string;
  unread: boolean;
  hasAttachment: boolean;
  starred: boolean;
  needsAction: boolean;
  actionLabel?: string;
  label?: string;
  labelColor?: string;
}

const THREADS: Thread[] = [
  {
    id: "1",
    from: "Sarah Chen",
    fromEmail: "s.chen@grantpartners.org",
    subject: "Q3 Grant Report — Action Required",
    snippet: "Hi Angela, following up on the Q3 grant report submission. The deadline has been moved to Friday — we need the program outcome data from your team before we can finalize the application.",
    time: "9:42 AM",
    unread: true,
    hasAttachment: false,
    starred: true,
    needsAction: true,
    actionLabel: "Reply needed",
    label: "Grants",
    labelColor: "text-violet-700 bg-violet-50 border-violet-200",
  },
  {
    id: "2",
    from: "Marcus Thompson",
    fromEmail: "m.thompson@transittrails.org",
    subject: "Learner Cohort 7 — Enrollment Data",
    snippet: "Attached is the updated enrollment spreadsheet for Cohort 7. We have 23 confirmed learners across 3 program tracks. Please review and confirm the Penny intake survey links are ready.",
    time: "8:15 AM",
    unread: true,
    hasAttachment: true,
    starred: false,
    needsAction: true,
    actionLabel: "Review attachment",
    label: "Programs",
    labelColor: "text-sky-700 bg-sky-50 border-sky-200",
  },
  {
    id: "3",
    from: "Google Workspace",
    fromEmail: "noreply@google.com",
    subject: "Storage usage update for your organization",
    snippet: "Your organization is using 67% of its available storage. Consider archiving older files or upgrading your storage plan to ensure continued access.",
    time: "Yesterday",
    unread: false,
    hasAttachment: false,
    starred: false,
    needsAction: false,
    label: "Admin",
    labelColor: "text-gray-600 bg-gray-100 border-gray-200",
  },
  {
    id: "4",
    from: "Keisha Williams",
    fromEmail: "k.williams@transittrails.org",
    subject: "Re: Trail OS onboarding session — notes",
    snippet: "Thanks for the demo yesterday! The team loved the Penny feature. A few questions came up around the learner dashboard. Can we schedule a follow-up next week?",
    time: "Yesterday",
    unread: false,
    hasAttachment: false,
    starred: false,
    needsAction: false,
    label: "Team",
    labelColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    id: "5",
    from: "Jordan Lee",
    fromEmail: "j.lee@transittrails.org",
    subject: "Curriculum review — Modules 4–6",
    snippet: "Hi, I've completed the curriculum review for Modules 4–6. The gap analysis is attached. A few areas need instructor sign-off before we can finalize.",
    time: "Mon",
    unread: false,
    hasAttachment: true,
    starred: true,
    needsAction: false,
    label: "Curriculum",
    labelColor: "text-amber-700 bg-amber-50 border-amber-200",
  },
];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

function ThreadCard({ t, idx }: { t: Thread; idx: number }) {
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  function handleDraft() {
    setDrafting(true);
    setTimeout(() => {
      setDraft(
        `Hi ${t.from.split(" ")[0]}, thanks for your message about "${t.subject.slice(0, 40)}…". I'll review this and get back to you shortly with the information you need.`
      );
      setDrafting(false);
    }, 1200);
  }

  return (
    <div className={`rounded-lg border bg-card overflow-hidden transition-colors hover:border-primary/30 cursor-pointer ${
      t.needsAction ? "border-amber-200" : t.unread ? "border-primary/20" : "border-border"
    }`}>
      {t.needsAction && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border-b border-amber-200">
          <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700">{t.actionLabel}</span>
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start gap-2.5">
          {/* Avatar */}
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
            {initials(t.from)}
          </div>

          <div className="flex-1 min-w-0">
            {/* Row 1: name + time + unread dot */}
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {t.unread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                <span className={`text-[11px] truncate ${t.unread ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                  {t.from}
                </span>
                {t.starred && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {t.hasAttachment && <Paperclip className="w-2.5 h-2.5 text-muted-foreground" />}
                <span className="text-[9px] text-muted-foreground">{t.time}</span>
              </div>
            </div>

            {/* Subject */}
            <p className={`text-[11px] truncate mb-0.5 ${t.unread ? "font-semibold text-foreground" : "text-foreground/70"}`}>
              {t.subject}
            </p>

            {/* Snippet */}
            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
              {t.snippet}
            </p>

            {/* Label + Penny draft */}
            <div className="flex items-center justify-between mt-1.5">
              {t.label && (
                <span className={`text-[9px] font-semibold border rounded-full px-1.5 py-0.5 ${t.labelColor}`}>
                  {t.label}
                </span>
              )}

              {t.needsAction && !draft && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDraft(); }}
                  className="flex items-center gap-1 text-[10px] text-primary border border-primary/20 rounded-md px-1.5 py-0.5 hover:bg-primary/5 transition-colors ml-auto"
                >
                  <Brain className="w-2.5 h-2.5" />
                  {drafting ? "Drafting…" : "Penny draft"}
                </button>
              )}
            </div>

            {draft && (
              <div className="mt-1.5 rounded-md border border-primary/20 bg-primary/5 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Brain className="w-2.5 h-2.5 text-primary" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary">Penny Draft</span>
                </div>
                <p className="text-[10px] text-foreground leading-relaxed">{draft}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <button className="text-[9px] font-semibold text-primary hover:underline">Use draft</button>
                  <button className="text-[9px] text-muted-foreground hover:text-foreground" onClick={() => setDraft(null)}>Dismiss</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function InboxSummary() {
  const unreadCount = THREADS.filter(t => t.unread).length;
  const actionNeeded = THREADS.filter(t => t.needsAction);
  const rest = THREADS.filter(t => !t.needsAction);

  return (
    <div className="min-h-screen bg-muted/20 flex items-start justify-end">
      <div className="w-[400px] min-h-screen flex flex-col bg-card border-l border-border shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
              <Mail className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold text-foreground leading-none">Mail</p>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="h-4 text-[9px] px-1.5 bg-primary/10 text-primary border-0">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {THREADS.length} threads · inbox
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="flex items-center gap-1 text-[9px] text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="font-semibold">Live</span>
            </div>
            <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Updated strip */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20 border-b border-border/50 flex-shrink-0">
          <span className="text-[9px] text-muted-foreground/60">
            <Clock className="w-2.5 h-2.5 inline mr-1" />Updated 9:45 AM
          </span>
          <button className="flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground transition-colors">
            Open Gmail <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">

            {/* Action needed */}
            {actionNeeded.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Needs Response ({actionNeeded.length})
                  </p>
                </div>
                <div className="space-y-2">
                  {actionNeeded.map((t, i) => <ThreadCard key={t.id} t={t} idx={i} />)}
                </div>
              </div>
            )}

            {/* Recent threads */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Inbox className="w-3 h-3 text-muted-foreground" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Recent
                </p>
              </div>
              <div className="space-y-2">
                {rest.map((t, i) => <ThreadCard key={t.id} t={t} idx={i + actionNeeded.length} />)}
              </div>
            </div>

          </div>
        </ScrollArea>

        {/* Compose button + footer */}
        <div className="px-4 py-3 border-t border-border flex-shrink-0 bg-card space-y-2.5">
          <button className="w-full flex items-center justify-center gap-2 text-[12px] font-semibold text-primary-foreground bg-primary rounded-lg px-4 py-2.5 hover:bg-primary/90 transition-colors">
            <Mail className="w-3.5 h-3.5" />
            Compose New Message
          </button>
          <p className="text-[9px] text-muted-foreground/50 text-center">
            Read-only · Penny draft assist by Gemini 2.5 Flash · gmail.readonly + gmail.compose
          </p>
        </div>

      </div>
    </div>
  );
}
