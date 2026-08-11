/**
 * TaskHoverCard
 *
 * Click-triggered Popover showing full task detail with inline editing:
 * - Status selector (4 states, writes to SF immediately)
 * - Due date picker (date input, saves on blur)
 * - Description editor (textarea, saves on explicit Save click)
 *
 * All shown tasks are owned by the current SF user (server enforces OwnerId),
 * so editing is always permitted. Server returns 404 if ownership ever fails.
 *
 * Drops directly below the task row (side="bottom", align="start").
 */

import { useState, useRef, useEffect, ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ExternalLink, Clock, Loader2, Check, Pencil } from "lucide-react";
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
  onTaskUpdate?:   (taskId: string, updates: { ActivityDate?: string | null; Description?: string | null }) => void;
  children: ReactNode;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUSES = [
  { value: "Not Started", active: "bg-slate-600 text-white",    idle: "bg-slate-100 text-slate-600 hover:bg-slate-200"     },
  { value: "In Progress", active: "bg-sky-600 text-white",      idle: "bg-sky-50 text-sky-700 hover:bg-sky-100"            },
  { value: "Deferred",    active: "bg-amber-500 text-white",    idle: "bg-amber-50 text-amber-700 hover:bg-amber-100"      },
  { value: "Completed",   active: "bg-emerald-600 text-white",  idle: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"},
] as const;

const PRIORITY_STYLES: Record<string, string> = {
  High:   "bg-rose-100 text-rose-700 border border-rose-200",
  Normal: "bg-slate-100 text-slate-600 border border-slate-200",
  Low:    "bg-sky-100 text-sky-700 border border-sky-200",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return "No due date";
  const d    = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d.getTime() - Date.now()) / 86_400_000);
  const abs  = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (diff === 0)  return `Today · ${abs}`;
  if (diff === 1)  return `Tomorrow · ${abs}`;
  if (diff === -1) return `Yesterday · ${abs}`;
  if (diff < 0)   return `${Math.abs(diff)}d overdue · ${abs}`;
  return `In ${diff}d · ${abs}`;
}

function formatCreated(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskHoverCard({ task, orgBaseUrl, onStatusChange, onTaskUpdate, children }: TaskHoverCardProps) {
  const { toast }  = useToast();
  const [open, setOpen] = useState(false);

  // Status
  const [currentStatus, setCurrentStatus] = useState(task.Status ?? "Not Started");
  const [savingStatus,  setSavingStatus]  = useState(false);

  // Due date
  const [dueDate,     setDueDate]     = useState(task.ActivityDate ?? "");
  const [savingDate,  setSavingDate]  = useState(false);

  // Description
  const [desc,        setDesc]        = useState(task.Description ?? "");
  const [savingDesc,  setSavingDesc]  = useState(false);
  const descDirty = desc !== (task.Description ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync when task prop changes (e.g. parent re-fetches)
  useEffect(() => {
    setCurrentStatus(task.Status       ?? "Not Started");
    setDueDate(      task.ActivityDate ?? "");
    setDesc(         task.Description  ?? "");
  }, [task.Id, task.Status, task.ActivityDate, task.Description]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
  }, [desc, open]);

  // ── Savers ──────────────────────────────────────────────────────────────────

  async function handleStatusChange(newStatus: string) {
    if (newStatus === currentStatus || savingStatus) return;
    setSavingStatus(true);
    const prev = currentStatus;
    setCurrentStatus(newStatus);
    try {
      const res = await fetch(`/api/sf/tasks/${task.Id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onStatusChange?.(task.Id, newStatus);
      if (newStatus === "Completed") setOpen(false);
    } catch {
      setCurrentStatus(prev);
      toast({ variant: "destructive", title: "Couldn't update status", description: "Try again." });
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveDueDate(value: string) {
    const prev = task.ActivityDate ?? "";
    if (value === prev) return;
    setSavingDate(true);
    try {
      const res = await fetch(`/api/sf/tasks/${task.Id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: value || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onTaskUpdate?.(task.Id, { ActivityDate: value || null });
      toast({ title: "Due date updated" });
    } catch {
      setDueDate(prev);
      toast({ variant: "destructive", title: "Couldn't update due date", description: "Try again." });
    } finally {
      setSavingDate(false);
    }
  }

  async function saveDescription() {
    if (!descDirty || savingDesc) return;
    setSavingDesc(true);
    const prev = task.Description ?? "";
    try {
      const res = await fetch(`/api/sf/tasks/${task.Id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onTaskUpdate?.(task.Id, { Description: desc || null });
      toast({ title: "Description saved" });
    } catch {
      setDesc(prev);
      toast({ variant: "destructive", title: "Couldn't save description", description: "Try again." });
    } finally {
      setSavingDesc(false);
    }
  }

  const sfLink = orgBaseUrl ? `${orgBaseUrl}/lightning/r/Task/${task.Id}/view` : null;
  const isOverdue = dueDate
    ? new Date(dueDate + "T00:00:00").getTime() < Date.now() - 86_400_000
    : false;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="p-0 w-84 shadow-2xl border-2 border-primary/25 rounded-xl overflow-hidden bg-white"
        style={{ width: "340px" }}
      >
        {/* Accent strip */}
        <div className="h-1 w-full bg-gradient-to-r from-primary to-primary/40" />

        {/* Header — subject + badges */}
        <div className="px-4 pt-3 pb-2 border-b border-border/40">
          <p className="text-sm font-semibold text-foreground leading-snug">
            {task.Subject ?? "Untitled task"}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {task.Priority && task.Priority !== "Normal" && (
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[task.Priority] ?? PRIORITY_STYLES["Normal"]}`}>
                {task.Priority}
              </span>
            )}
          </div>
        </div>

        {/* Due date editor */}
        <div className="px-4 py-2.5 border-b border-border/40">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
            Due Date
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                onBlur={e => saveDueDate(e.target.value)}
                className={`
                  w-full text-[12px] font-medium rounded-md border px-2.5 py-1.5 pr-7
                  focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors
                  ${isOverdue
                    ? "border-rose-300 text-rose-700 bg-rose-50 focus:border-rose-400"
                    : "border-border bg-muted/30 text-foreground hover:border-primary/40 focus:border-primary/50"
                  }
                `}
              />
              {savingDate && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            {!dueDate && !savingDate && (
              <span className="text-[11px] text-muted-foreground/60 italic">No date set</span>
            )}
          </div>
          {dueDate && (
            <p className={`text-[11px] mt-1 ${isOverdue ? "text-rose-600" : "text-muted-foreground/70"}`}>
              {formatDisplayDate(dueDate)}
            </p>
          )}
        </div>

        {/* Description editor */}
        <div className="px-4 py-2.5 border-b border-border/40">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Description
            </p>
            {descDirty && (
              <button
                onClick={saveDescription}
                disabled={savingDesc}
                className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {savingDesc
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Check className="w-3 h-3" />
                }
                Save
              </button>
            )}
            {!descDirty && !savingDesc && (
              <Pencil className="w-3 h-3 text-muted-foreground/30" />
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Add a description…"
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
        </div>

        {/* Status changer */}
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

        {/* Footer */}
        <div className="px-4 py-2 bg-muted/30 flex items-center justify-between">
          {task.CreatedDate && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Clock className="w-3 h-3" />
              <span>Created {formatCreated(task.CreatedDate)}</span>
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
