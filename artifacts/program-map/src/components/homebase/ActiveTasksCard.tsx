/**
 * ActiveTasksCard
 *
 * Inline homebase card: all active tasks sorted by due date (soonest first,
 * undated tasks at the end). Completing a task optimistically removes it from
 * the list and PATCHes the SF record. Hovering a task opens a detail card
 * with full description + a direct Salesforce link.
 */

import { useState, useEffect, useCallback } from "react";
import {
  CheckSquare, Square, Loader2, Plus, RefreshCw,
  CheckCircle2, Calendar, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { CreateTaskDrawer } from "./CreateTaskDrawer";
import { TaskHoverCard } from "./TaskHoverCard";

function applyStatusChange(tasks: SfTask[], id: string, status: string): SfTask[] {
  return tasks.map(t => t.Id === id ? { ...t, Status: status } : t);
}

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d    = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (diff === 0)  return "Today";
  if (diff === 1)  return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0)   return `${Math.abs(diff)}d overdue`;
  return `In ${diff}d`;
}

function absoluteDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr + "T00:00:00").getTime() < Date.now() - 86_400_000;
}

function sortByDueDate(tasks: SfTask[]): SfTask[] {
  return [...tasks].sort((a, b) => {
    if (!a.ActivityDate && !b.ActivityDate) return 0;
    if (!a.ActivityDate) return 1;
    if (!b.ActivityDate) return -1;
    return a.ActivityDate.localeCompare(b.ActivityDate);
  });
}

// ── Priority badge ────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  High:   "bg-rose-50 text-rose-700 border-rose-200",
  Normal: "bg-muted text-muted-foreground border-border",
  Low:    "bg-sky-50 text-sky-700 border-sky-200",
};

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority || priority === "Normal") return null;
  const cls = PRIORITY_STYLES[priority] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {priority}
    </span>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: SfTask;
  isCompleting: boolean;
  orgBaseUrl: string;
  onComplete: (task: SfTask) => void;
  onStatusChange: (id: string, status: string) => void;
  onTaskUpdate:   (id: string, updates: { ActivityDate?: string | null; Description?: string | null }) => void;
}

function TaskRow({ task, isCompleting, orgBaseUrl, onComplete, onStatusChange, onTaskUpdate }: TaskRowProps) {
  const overdue = isOverdue(task.ActivityDate);
  return (
    <li className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <button
        onClick={() => onComplete(task)}
        disabled={isCompleting}
        className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        aria-label={`Complete: ${task.Subject}`}
      >
        {isCompleting
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Square  className="w-4 h-4" />
        }
      </button>

      <TaskHoverCard task={task} orgBaseUrl={orgBaseUrl} onStatusChange={onStatusChange} onTaskUpdate={onTaskUpdate}>
        <div className="flex-1 min-w-0 cursor-pointer select-none">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground leading-snug">
              {task.Subject ?? "Untitled task"}
            </p>
            <PriorityBadge priority={task.Priority} />
          </div>
          {task.Description && (
            <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">
              {task.Description}
            </p>
          )}
        </div>
      </TaskHoverCard>

      {/* Due date — right-aligned */}
      <div className={`flex-shrink-0 flex items-center gap-1 text-[12px] ${overdue ? "text-rose-600" : "text-muted-foreground"}`}>
        {overdue
          ? <AlertCircle className="w-3 h-3" />
          : <Calendar    className="w-3 h-3" />
        }
        <span className="font-medium whitespace-nowrap">{relativeDate(task.ActivityDate)}</span>
        {task.ActivityDate && (
          <span className="text-muted-foreground/50 whitespace-nowrap hidden sm:inline">
            · {absoluteDate(task.ActivityDate)}
          </span>
        )}
      </div>
    </li>
  );
}

// ── ActiveTasksCard ───────────────────────────────────────────────────────────

interface ActiveTasksCardProps {
  /** Called after a new task is successfully created so sibling cards can refresh. */
  onCreated?: () => void;
}

export function ActiveTasksCard({ onCreated }: ActiveTasksCardProps) {
  const { toast } = useToast();
  const [, nav]   = useLocation();
  const [tasks,         setTasks]         = useState<SfTask[]>([]);
  const [orgBaseUrl,    setOrgBaseUrl]    = useState("");
  const [loading,       setLoading]       = useState(true);
  const [sfUnavailable, setSfUnavailable] = useState(false);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [completing,    setCompleting]    = useState<Set<string>>(new Set());
  const [completed,     setCompleted]     = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setSfUnavailable(false);
    try {
      const res = await fetch("/api/sf/tasks?status=active");
      if (res.status === 401) { setSfUnavailable(true); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { tasks: SfTask[]; orgBaseUrl?: string };
      setTasks(sortByDueDate(data.tasks ?? []));
      setOrgBaseUrl(data.orgBaseUrl ?? "");
      setCompleted(new Set());
    } catch {
      setSfUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleComplete(task: SfTask) {
    setCompleted(prev => new Set([...prev, task.Id]));
    setCompleting(prev => new Set([...prev, task.Id]));
    try {
      const res = await fetch(`/api/sf/tasks/${task.Id}/complete`, { method: "PATCH" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setCompleted(prev => { const n = new Set(prev); n.delete(task.Id); return n; });
      toast({ variant: "destructive", title: "Couldn't complete task", description: "Try again or refresh." });
    } finally {
      setCompleting(prev => { const n = new Set(prev); n.delete(task.Id); return n; });
    }
  }

  const visibleTasks = tasks.filter(t => !completed.has(t.Id));

  return (
    <>
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Active Tasks</span>
            {!loading && !sfUnavailable && visibleTasks.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold px-1.5">
                {visibleTasks.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              onClick={() => nav("/tasks")}
              className="px-2 py-1 rounded-md text-[12px] text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              View all →
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : sfUnavailable ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Connect to Salesforce to see your tasks.</p>
              <a
                href="/api/auth/salesforce/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                Reconnect Salesforce
              </a>
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-7 h-7 text-muted-foreground/25 mx-auto" />
              <p className="text-sm text-muted-foreground">No open tasks.</p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-[12px] text-primary hover:text-primary/80 transition-colors"
              >
                + Add one
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-transparent">
              {visibleTasks.map((task, i) => (
                <TaskRow
                  key={task.Id || i}
                  task={task}
                  isCompleting={completing.has(task.Id)}
                  orgBaseUrl={orgBaseUrl}
                  onComplete={handleComplete}
                  onStatusChange={(id, status) => {
                    if (status === "Completed") {
                      setCompleted(prev => new Set([...prev, id]));
                    } else {
                      setTasks(prev => applyStatusChange(prev, id, status));
                    }
                  }}
                  onTaskUpdate={(id, updates) => {
                    setTasks(prev => prev.map(t =>
                      t.Id === id ? { ...t, ...updates } : t
                    ));
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <CreateTaskDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => { void load(); onCreated?.(); }}
      />
    </>
  );
}
