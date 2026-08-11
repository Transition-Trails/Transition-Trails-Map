/**
 * TaskHoverCard
 *
 * Wraps any task row trigger with a HoverCard popover showing full task detail:
 * subject, description, due date, priority, status, and a direct Salesforce link.
 * Keeps users on the homebase "single pane of glass" rather than navigating to SF
 * just to read a task's description.
 *
 * Usage:
 *   <TaskHoverCard task={task} orgBaseUrl={orgBaseUrl}>
 *     <div>...trigger content...</div>
 *   </TaskHoverCard>
 */

import { ReactNode } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ExternalLink, Calendar, AlertCircle, Clock } from "lucide-react";

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
  children: ReactNode;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null, includeTime = false): string {
  if (!dateStr) return "—";
  const d = includeTime
    ? new Date(dateStr)
    : new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function relativeDate(dateStr: string | null): { label: string; overdue: boolean } {
  if (!dateStr) return { label: "No due date", overdue: false };
  const d    = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d.getTime() - Date.now()) / 86_400_000);
  const overdue = diff < 0;
  if (diff === 0)  return { label: "Due today",        overdue: false };
  if (diff === 1)  return { label: "Due tomorrow",     overdue: false };
  if (diff === -1) return { label: "Was due yesterday", overdue: true };
  if (overdue)     return { label: `${Math.abs(diff)}d overdue`, overdue: true };
  return { label: `Due in ${diff}d`, overdue: false };
}

const PRIORITY_STYLES: Record<string, string> = {
  High:   "bg-rose-50 text-rose-700 border-rose-200",
  Normal: "bg-muted text-muted-foreground border-border",
  Low:    "bg-sky-50 text-sky-700 border-sky-200",
};

const STATUS_STYLES: Record<string, string> = {
  "Not Started": "bg-muted text-muted-foreground",
  "In Progress": "bg-sky-50 text-sky-700",
  "Deferred":    "bg-amber-50 text-amber-700",
  "Completed":   "bg-emerald-50 text-emerald-700",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskHoverCard({ task, orgBaseUrl, children }: TaskHoverCardProps) {
  const { label: dueLabel, overdue } = relativeDate(task.ActivityDate);
  const priorityCls = PRIORITY_STYLES[task.Priority ?? ""] ?? PRIORITY_STYLES["Normal"];
  const statusCls   = STATUS_STYLES[task.Status ?? ""] ?? "bg-muted text-muted-foreground";
  const sfLink      = orgBaseUrl
    ? `${orgBaseUrl}/lightning/r/Task/${task.Id}/view`
    : null;

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>

      <HoverCardContent
        side="right"
        align="start"
        sideOffset={12}
        className="w-72 p-0 shadow-lg border border-border/80 rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
          <p className="text-sm font-semibold text-foreground leading-snug">
            {task.Subject ?? "Untitled task"}
          </p>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {task.Priority && (
              <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${priorityCls}`}>
                {task.Priority}
              </span>
            )}
            {task.Status && (
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${statusCls}`}>
                {task.Status}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* Due date */}
          <div className={`flex items-center gap-1.5 text-[12px] ${overdue ? "text-rose-600" : "text-muted-foreground"}`}>
            {overdue
              ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              : <Calendar    className="w-3.5 h-3.5 flex-shrink-0" />
            }
            <span className="font-medium">{dueLabel}</span>
            {task.ActivityDate && (
              <span className="text-muted-foreground/60">
                · {formatDate(task.ActivityDate)}
              </span>
            )}
          </div>

          {/* Description */}
          {task.Description ? (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Notes
              </p>
              <p className="text-[12px] text-foreground/80 leading-relaxed max-h-24 overflow-y-auto">
                {task.Description}
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground/50 italic">No description</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between">
          {task.CreatedDate && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
              <Clock className="w-3 h-3" />
              <span>Created {formatDate(task.CreatedDate, true)}</span>
            </div>
          )}
          {sfLink && (
            <a
              href={sfLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors font-medium ml-auto"
            >
              Open in Salesforce
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
