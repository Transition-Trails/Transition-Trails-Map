/**
 * TodayTasksCard
 *
 * Shows tasks due today for the current staff member. Renders in TeamHomebase's
 * middle grid. Each task has a checkbox to mark complete; completing optimistically
 * updates the UI then PATCHes the SF record, rolling back on failure.
 *
 * States: loading | sf-unavailable | empty | list
 */

import { useState, useEffect, useCallback } from "react";
import { CheckSquare, Square, Loader2, Plus, ArrowRight, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateTaskDrawer } from "./CreateTaskDrawer";
import { useLocation } from "wouter";

interface SfTask {
  Id: string;
  Subject: string | null;
  Description: string | null;
  ActivityDate: string | null;
  Priority: string | null;
  Status: string | null;
  CreatedDate: string | null;
}

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

export function TodayTasksCard() {
  const { toast }   = useToast();
  const [, nav]     = useLocation();
  const [tasks, setTasks]           = useState<SfTask[]>([]);
  const [loading, setLoading]       = useState(true);
  const [sfUnavailable, setSfUnavailable] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // optimistically completed IDs
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [completed, setCompleted]   = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setSfUnavailable(false);
    try {
      const res = await fetch("/api/sf/tasks?status=active&date=today");
      if (res.status === 401) { setSfUnavailable(true); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { tasks: SfTask[] };
      setTasks(data.tasks ?? []);
    } catch {
      setSfUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleComplete(task: SfTask) {
    // Optimistic
    setCompleted(prev => new Set([...prev, task.Id]));
    setCompleting(prev => new Set([...prev, task.Id]));
    try {
      const res = await fetch(`/api/sf/tasks/${task.Id}/complete`, { method: "PATCH" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // Roll back
      setCompleted(prev => { const n = new Set(prev); n.delete(task.Id); return n; });
      toast({ variant: "destructive", title: "Couldn't complete task", description: "Try again or refresh." });
    } finally {
      setCompleting(prev => { const n = new Set(prev); n.delete(task.Id); return n; });
    }
  }

  const visibleTasks = tasks.filter(t => !completed.has(t.Id));
  const pendingCount = visibleTasks.length;

  return (
    <>
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Today's Tasks</span>
            {!loading && !sfUnavailable && pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
              title="New task"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
            <button
              onClick={() => nav("/tasks")}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
              title="View all tasks"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-5">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : sfUnavailable ? (
            <div className="py-4 space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect to Salesforce to see your tasks.
              </p>
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
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">No tasks due today.</p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="mt-2 text-[12px] text-primary hover:text-primary/80 transition-colors"
              >
                + Add one
              </button>
            </div>
          ) : (
            <ul className="space-y-1">
              {visibleTasks.slice(0, 5).map(task => {
                const isCompleting = completing.has(task.Id);
                return (
                  <li key={task.Id} className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-0">
                    <button
                      onClick={() => handleComplete(task)}
                      disabled={isCompleting}
                      className="mt-0.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 flex-shrink-0"
                      aria-label={`Complete: ${task.Subject}`}
                    >
                      {isCompleting
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Square  className="w-4 h-4" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-foreground leading-snug truncate">
                          {task.Subject ?? "Untitled task"}
                        </p>
                        <PriorityBadge priority={task.Priority} />
                      </div>
                      {task.Description && (
                        <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                          {task.Description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
              {visibleTasks.length > 5 && (
                <li className="pt-2">
                  <button
                    onClick={() => nav("/tasks")}
                    className="text-[12px] text-primary hover:text-primary/80 transition-colors"
                  >
                    +{visibleTasks.length - 5} more — View all
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <CreateTaskDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={load}
      />
    </>
  );
}
