/**
 * CaseHoverCard
 *
 * Click-triggered Popover showing Salesforce Case detail with inline actions:
 * - Status selector (New / Working / Escalated / Closed)
 * - Follow-up date picker (saves on blur; hidden when SF org lacks FollowUpDate)
 * - Comment textarea (POSTs a new CaseComment on Save)
 * - Assigned To — read-only display of Owner.Name
 *
 * Drops below the row: side="bottom", align="start", 340 px wide.
 * Visual treatment matches TaskHoverCard exactly.
 */

import { useState, useRef, useEffect, ReactNode } from "react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ExternalLink, Clock, Loader2, Check, User, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SfCase {
  Id:           string;
  CaseNumber:   string | null;
  Subject:      string | null;
  Priority:     string | null;
  Status:       string | null;
  CreatedDate:  string | null;
  FollowUpDate: string | null;
  OwnerName:    string | null;
  ContactName:  string | null;
  AccountName:  string | null;
}

interface CaseHoverCardProps {
  case_:               SfCase;
  orgBaseUrl:          string;
  followUpDateSupported: boolean;
  onStatusChange?: (caseId: string, newStatus: string) => void;
  onCaseUpdate?:   (caseId: string, updates: { FollowUpDate?: string | null }) => void;
  children: ReactNode;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUSES = [
  { value: "New",       active: "bg-slate-600 text-white",    idle: "bg-slate-100 text-slate-600 hover:bg-slate-200"     },
  { value: "Working",   active: "bg-sky-600 text-white",      idle: "bg-sky-50 text-sky-700 hover:bg-sky-100"            },
  { value: "Escalated", active: "bg-rose-600 text-white",     idle: "bg-rose-50 text-rose-700 hover:bg-rose-100"         },
  { value: "Closed",    active: "bg-emerald-600 text-white",  idle: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"},
] as const;

const PRIORITY_STYLES: Record<string, string> = {
  High:   "bg-rose-100 text-rose-700 border border-rose-200",
  Medium: "bg-amber-100 text-amber-700 border border-amber-200",
  Low:    "bg-sky-100 text-sky-700 border border-sky-200",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null, withRelative = false): string {
  if (!dateStr) return withRelative ? "No date set" : "";
  const d    = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  const abs  = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (!withRelative) return abs;
  const diff = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (diff === 0)  return `Today · ${abs}`;
  if (diff === 1)  return `Tomorrow · ${abs}`;
  if (diff === -1) return `Yesterday · ${abs}`;
  if (diff < 0)   return `${Math.abs(diff)}d overdue · ${abs}`;
  return `In ${diff}d · ${abs}`;
}

function isDateOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr + "T00:00:00").getTime() < Date.now() - 86_400_000;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CaseHoverCard({
  case_: c,
  orgBaseUrl,
  followUpDateSupported,
  onStatusChange,
  onCaseUpdate,
  children,
}: CaseHoverCardProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Status
  const [currentStatus, setCurrentStatus] = useState(c.Status ?? "New");
  const [savingStatus,  setSavingStatus]  = useState(false);

  // Follow-up date
  const [followUpDate, setFollowUpDate] = useState(c.FollowUpDate ?? "");
  const [savingDate,   setSavingDate]   = useState(false);

  // Comment
  const [comment,      setComment]      = useState("");
  const [savingComment,setSavingComment]= useState(false);
  const [commentSaved, setCommentSaved] = useState(false);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync when case prop changes
  useEffect(() => {
    setCurrentStatus(c.Status       ?? "New");
    setFollowUpDate( c.FollowUpDate ?? "");
  }, [c.Id, c.Status, c.FollowUpDate]);

  // Reset comment on open
  useEffect(() => {
    if (open) { setComment(""); setCommentSaved(false); }
  }, [open]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
  }, [comment, open]);

  // ── Savers ──────────────────────────────────────────────────────────────────

  async function handleStatusChange(newStatus: string) {
    if (newStatus === currentStatus || savingStatus) return;
    setSavingStatus(true);
    const prev = currentStatus;
    setCurrentStatus(newStatus);
    try {
      const res = await fetch(`/api/sf/cases/${c.Id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onStatusChange?.(c.Id, newStatus);
      if (newStatus === "Closed") setOpen(false);
    } catch {
      setCurrentStatus(prev);
      toast({ variant: "destructive", title: "Couldn't update status", description: "Try again." });
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveFollowUpDate(value: string) {
    const prev = c.FollowUpDate ?? "";
    if (value === prev) return;
    setSavingDate(true);
    try {
      const res = await fetch(`/api/sf/cases/${c.Id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpDate: value || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { fieldUnsupported?: boolean };
      if (data.fieldUnsupported) {
        toast({ title: "Follow-up date not available", description: "This field isn't enabled in Salesforce." });
        return;
      }
      onCaseUpdate?.(c.Id, { FollowUpDate: value || null });
      toast({ title: "Follow-up date updated" });
    } catch {
      setFollowUpDate(prev);
      toast({ variant: "destructive", title: "Couldn't update date", description: "Try again." });
    } finally {
      setSavingDate(false);
    }
  }

  async function saveComment() {
    if (!comment.trim() || savingComment) return;
    setSavingComment(true);
    try {
      const res = await fetch(`/api/sf/cases/${c.Id}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: comment.trim() }),
      });
      if (res.status === 403) { setCommentsDisabled(true); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setComment("");
      setCommentSaved(true);
      toast({ title: "Comment added" });
      setTimeout(() => setCommentSaved(false), 3000);
    } catch {
      toast({ variant: "destructive", title: "Couldn't add comment", description: "Try again." });
    } finally {
      setSavingComment(false);
    }
  }

  const sfLink    = orgBaseUrl ? `${orgBaseUrl}/lightning/r/Case/${c.Id}/view` : null;
  const dateOver  = isDateOverdue(followUpDate);
  const priStyle  = PRIORITY_STYLES[c.Priority ?? ""] ?? null;
  const contactLabel = c.ContactName ?? c.AccountName ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="p-0 shadow-2xl border-2 border-primary/25 rounded-xl overflow-hidden bg-white"
        style={{ width: "340px" }}
      >
        {/* Accent strip */}
        <div className="h-1 w-full bg-gradient-to-r from-primary to-primary/40" />

        {/* Header */}
        <div className="px-4 pt-3 pb-2.5 border-b border-border/40">
          <div className="flex items-start gap-2">
            {c.CaseNumber && (
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">
                #{c.CaseNumber}
              </span>
            )}
            <p className="text-sm font-semibold text-foreground leading-snug">
              {c.Subject ?? "Untitled case"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {priStyle && (
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${priStyle}`}>
                {c.Priority}
              </span>
            )}
            {contactLabel && (
              <span className="text-[11px] text-muted-foreground">{contactLabel}</span>
            )}
          </div>
        </div>

        {/* Assigned To */}
        <div className="px-4 py-2.5 border-b border-border/40">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Assigned To
          </p>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
            <span className="text-[12px] text-foreground/80 font-medium">
              {c.OwnerName ?? "Unassigned"}
            </span>
          </div>
        </div>

        {/* Follow-up Date */}
        {followUpDateSupported && (
          <div className="px-4 py-2.5 border-b border-border/40">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
              Follow-up Date
            </p>
            <div className="relative">
              <input
                type="date"
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
                onBlur={e => saveFollowUpDate(e.target.value)}
                className={`
                  w-full text-[12px] font-medium rounded-md border px-2.5 py-1.5 pr-7
                  focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors
                  ${dateOver
                    ? "border-rose-300 text-rose-700 bg-rose-50 focus:border-rose-400"
                    : "border-border bg-muted/30 text-foreground hover:border-primary/40 focus:border-primary/50"
                  }
                `}
              />
              {savingDate && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            {followUpDate && (
              <p className={`text-[11px] mt-1 ${dateOver ? "text-rose-600" : "text-muted-foreground/70"}`}>
                {formatDate(followUpDate, true)}
              </p>
            )}
          </div>
        )}

        {/* Status selector */}
        <div className="px-4 py-2.5 border-b border-border/40">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Status
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUSES.map(s => {
              const isActive = currentStatus === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => handleStatusChange(s.value)}
                  disabled={savingStatus}
                  className={`
                    flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md
                    text-[11px] font-semibold transition-all disabled:opacity-60
                    ${isActive ? s.active + " ring-2 ring-offset-1 ring-current/30" : s.idle}
                  `}
                >
                  {savingStatus && isActive && <Loader2 className="w-3 h-3 animate-spin" />}
                  {s.value}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comment */}
        <div className="px-4 py-2.5 border-b border-border/40">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Add Comment
            </p>
            {comment.trim() && !commentsDisabled && (
              <button
                onClick={saveComment}
                disabled={savingComment}
                className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {savingComment
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Check className="w-3 h-3" />
                }
                Save
              </button>
            )}
            {commentSaved && (
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
          {commentsDisabled ? (
            <p className="text-[11px] text-muted-foreground/60 italic">
              Comments disabled — check Salesforce sharing settings.
            </p>
          ) : (
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add an internal note…"
              rows={2}
              className="
                w-full text-[12px] text-foreground/80 leading-relaxed resize-none overflow-hidden
                rounded-md border border-border bg-muted/30 px-2.5 py-1.5
                placeholder:text-muted-foreground/40
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                hover:border-primary/30 transition-colors
              "
              style={{ minHeight: "52px" }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-muted/30 flex items-center justify-between">
          {c.CreatedDate && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Clock className="w-3 h-3" />
              <span>Created {formatDate(c.CreatedDate)}</span>
            </div>
          )}
          {sfLink && (
            <a
              href={sfLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors ml-auto"
            >
              Open in Salesforce
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
