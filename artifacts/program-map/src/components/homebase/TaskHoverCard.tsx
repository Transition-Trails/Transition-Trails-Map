/**
 * TaskHoverCard
 *
 * Click-triggered Popover showing full task detail + inline status changer.
 * Drops directly below the task row (side="bottom", align="start") so it stays
 * visible regardless of which column the task card lives in.
 *
 * Usage:
 *   <TaskHoverCard task={task} orgBaseUrl={orgBaseUrl} onStatusChange={fn}>
 *     <div>...trigger...</div>
 *   </TaskHoverCard>
 */

import { useState, ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ExternalLink, Calendar, AlertCircle, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SfTask {
  Id: string;
  Subject: string | null;
  Description: string | null;
  ActivityDate: string | null;
  Priority: string | null;
  Status: string | null;
  CreatedDate: string | null;
}

interface TaskHoverCardProps {
  task: SfTask;
  orgBaseUrl: string;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  children: ReactNode;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUSES = [
  { value: "Not Started", label: "Not Started", active: "bg-slate-600 text-white",   idle: "bg-slate-100 text-slate-600 hover:bg-slate-200"  },
  { value: "In Progress", label: "In Progress", active: "bg-sky-600 text-white",     idle: "bg-sky-50 text-sky-700 hover:bg-sky-100"          },
  { value: "Deferred",    label: "Deferred",    active: "bg-amber-500 text-white",   idle: "bg-amber-50 text-amber-700 hover:bg-amber-100"    },
  { value: "Completed",   label: "Completed",   active: "bg-emerald-600 text-white", idle: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null, includeTime = false): string {
  if (!dateStr) return "—";
  const d = includeTime ? new Date(dateStr) : new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function relativeDate(dateStr: string | null): { label: string; overdue: boolean } {
  if (!dateStr) return { label: "No due date", overdue: false };
  const d    = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (diff === 0)  return { label: "Due today",         overdue: false };
  if (diff === 1)  return { label: "Due tomorrow",      overdue: false };
  if (diff === -1) return { label: "Was due yesterday", overdue: true  };
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, overdue: true };
  return { label: `Due in ${diff}d`, overdue: false };
}

const PRIORITY_STYLES: Record<string, string> = {
  High:   "bg-rose-100 text-rose-700 border border-rose-200",
  Normal: "bg-slate-100 text-slate-600 border border-slate-200",
  Low:    "bg-sky-100 text-sky-700 border border-sky-200",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskHoverCard({ task, orgBaseUrl, onStatusChange, children }: TaskHoverCardProps) {
  const { toast } = useToast();
  const [open,          setOpen]          = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task.Status ?? "Not Started");
  const [saving,        setSaving]        = useState(false);

  const { label: dueLabel, overdue } = relativeDate(task.ActivityDate);
  const sfLink = orgBaseUrl ? `${orgBaseUrl}/lightning/r/Task/${task.Id}/view` : null;

  async function handleStatusChange(newStatus: string) {
    if (newStatus === currentStatus || saving) return;
    setSaving(true);
    const prev = currentStatus;
    setCurrentStatus(newStatus);           // optimistic

    try {
      const res = await fetch(`/api/sf/tasks/${task.Id}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onStatusChange?.(task.Id, newStatus);
      if (newStatus === "Completed") setOpen(false);
    } catch {
      setCurrentStatus(prev);              // roll back
      toast({ variant: "destructive", title: "Couldn't update status", description: "Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="p-0 w-80 shadow-2xl border-2 border-primary/25 rounded-xl overflow-hidden bg-white"
      >
        {/* Accent strip */}
        <div className="h-1 w-full bg-gradient-to-r from-primary to-primary/40" />

        {/* Header */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-sm font-semibold text-foreground leading-snug">
            {task.Subject ?? "Untitled task"}
          </p>

          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {task.Priority && (
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[task.Priority] ?? PRIORITY_STYLES["Normal"]}`}>
                {task.Priority}
              </span>
            )}
            <div className={`flex items-center gap-1 text-[11px] font-medium ${overdue ? "text-rose-600" : "text-muted-foreground"}`}>
              {overdue
                ? <AlertCircle className="w-3 h-3" />
                : <Calendar    className="w-3 h-3" />
              }
              {dueLabel}
              {task.ActivityDate && (
                <span className="text-muted-foreground/60 font-normal">
                  · {formatDate(task.ActivityDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 pb-3">
          {task.Description ? (
            <p className="text-[12px] text-foreground/75 leading-relaxed max-h-20 overflow-y-auto bg-muted/40 rounded-md px-2.5 py-2">
              {task.Description}
            </p>
          ) : (
            <p className="text-[12px] text-muted-foreground/40 italic">No description</p>
          )}
        </div>

        {/* Status changer */}
        <div className="px-4 pb-3">
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
                  disabled={saving}
                  className={`
                    flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-semibold
                    transition-all disabled:opacity-60
                    ${isActive ? s.active + " ring-2 ring-offset-1 ring-current/30" : s.idle}
                  `}
                >
                  {saving && isActive && <Loader2 className="w-3 h-3 animate-spin" />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border/50 bg-muted/30 flex items-center justify-between">
          {task.CreatedDate && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Clock className="w-3 h-3" />
              <span>Created {formatDate(task.CreatedDate, true)}</span>
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
