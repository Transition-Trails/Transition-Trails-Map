/**
 * TasksPage
 *
 * Full task list for the current staff member. Sorted by ActivityDate.
 * Filter tabs: Active (default) | All | Completed
 * Each row: subject, description preview, due date, priority badge, complete checkbox.
 * Completing a task optimistically updates the UI, PATCHes SF, rolls back on failure.
 */

import { useState, useEffect, useCallback } from "react";
import {
  CheckSquare, Square, Loader2, Plus, RefreshCw,
  CheckCircle2, Calendar, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateTaskDrawer } from "@/components/homebase/CreateTaskDrawer";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SfTask {
  Id: string;
  Subject: string | null;
  Description: string | null;
  ActivityDate: string | null;
  Priority: string | null;
  Status: string | null;
  CreatedDate: string | null;
}

type FilterTab = "active" | "all" | "completed";

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Priority badge ─────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  High:   "bg-rose-50 text-rose-700 border-rose-200",
  Normal: "bg-muted text-muted-foreground border-border",
  Low:    "bg-sky-50 text-sky-700 border-sky-200",
};

function PriorityBadge({ priority }: { priority: string | null }) {
  const label = priority ?? "Normal";
  const cls   = PRIORITY_STYLES[label] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ── Task row ───────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: SfTask;
  isCompleted: boolean;
  isCompleting: boolean;
  onComplete: (task: SfTask) => void;
}

function TaskRow({ task, isCompleted, isCompleting, onComplete }: TaskRowProps) {
  const overdue = !isCompleted && isOverdue(task.ActivityDate);
  return (
    <li className="flex items-start gap-3 py-3.5 border-b border-border last:border-0">
      {/* Checkbox */}
      <button
        onClick={() => { if (!isCompleted) onComplete(task); }}
        disabled={isCompleting || isCompleted}
        className={`mt-0.5 flex-shrink-0 transition-colors ${
          isCompleted
            ? "text-emerald-500 cursor-default"
            : "text-muted-foreground hover:text-primary disabled:opacity-50"
        }`}
        aria-label={isCompleted ? "Completed" : `Complete: ${task.Subject}`}
      >
        {isCompleting
          ? <Loader2     className="w-4 h-4 animate-spin" />
          : isCompleted
          ? <CheckCircle2 className="w-4 h-4" />
          : <Square       className="w-4 h-4" />
        }
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <p className={`text-sm font-medium leading-snug ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {task.Subject ?? "Untitled task"}
          </p>
          <PriorityBadge priority={task.Priority} />
        </div>

        {task.Description && (
          <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {task.Description}
          </p>
        )}

        {/* Due date */}
        {task.ActivityDate && (
          <div className={`flex items-center gap-1.5 mt-1.5 text-[12px] ${overdue ? "text-rose-600" : "text-muted-foreground"}`}>
            {overdue
              ? <AlertCircle className="w-3 h-3 flex-shrink-0" />
              : <Calendar    className="w-3 h-3 flex-shrink-0" />
            }
            <span className="font-medium">{relativeDate(task.ActivityDate)}</span>
            <span className="text-muted-foreground/60">· {absoluteDate(task.ActivityDate)}</span>
          </div>
        )}
      </div>
    </li>
  );
}

// ── TasksPage (exported) ───────────────────────────────────────────────────────

export default function TasksPage() {
  const { toast } = useToast();
  const [filter, setFilter]         = useState<FilterTab>("active");
  const [tasks, setTasks]           = useState<SfTask[]>([]);
  const [loading, setLoading]       = useState(true);
  const [sfUnavailable, setSfUnavailable] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [completed, setCompleted]   = useState<Set<string>>(new Set());

  const load = useCallback(async (tab: FilterTab) => {
    setLoading(true);
    setSfUnavailable(false);
    const statusParam = tab === "active" ? "active" : tab === "completed" ? "completed" : "all";
    try {
      const res = await fetch(`/api/sf/tasks?status=${statusParam}`);
      if (res.status === 401) { setSfUnavailable(true); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { tasks: SfTask[] };
      setTasks(data.tasks ?? []);
      setCompleted(new Set()); // reset local optimistic state when data refreshes
    } catch {
      setSfUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(filter); }, [filter, load]);

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

  const TABS: { id: FilterTab; label: string }[] = [
    { id: "active",    label: "Active"    },
    { id: "all",       label: "All"       },
    { id: "completed", label: "Completed" },
  ];

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              Tasks
            </p>
            <h1 className="text-xl font-semibold text-foreground">My Tasks</h1>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0.5 border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                filter === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="rounded-xl border border-border bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : sfUnavailable ? (
            <div className="px-6 py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect your Salesforce account to manage tasks.
              </p>
              <a
                href="/api/auth/salesforce/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reconnect Salesforce
              </a>
            </div>
          ) : tasks.length === 0 ? (
            <div className="px-6 py-10 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {filter === "active"
                  ? "No open tasks. Create one to get started."
                  : filter === "completed"
                  ? "No completed tasks yet."
                  : "No tasks found."
                }
              </p>
              {filter === "active" && (
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  + New Task
                </button>
              )}
            </div>
          ) : (
            <ul className="px-5 divide-y divide-transparent">
              {tasks.map(task => (
                <TaskRow
                  key={task.Id}
                  task={task}
                  isCompleted={completed.has(task.Id) || task.Status === "Completed"}
                  isCompleting={completing.has(task.Id)}
                  onComplete={handleComplete}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <CreateTaskDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => void load(filter)}
      />
    </>
  );
}
