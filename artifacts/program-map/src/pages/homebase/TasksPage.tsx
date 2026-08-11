/**
 * TasksPage
 *
 * Full task list rendered as a sortable, filterable table.
 * Columns: Task (subject + description) · Status · Due Date · Priority
 * Secondary filters: Priority chip-set · Overdue-only toggle
 * Primary tabs: Active | All | Completed  (with count badges from /api/sf/tasks/counts)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Square, Loader2, Plus, RefreshCw,
  CheckCircle2, ChevronsUpDown, ChevronUp, ChevronDown,
} from "lucide-react";
import { useToast }           from "@/hooks/use-toast";
import { CreateTaskDrawer }   from "@/components/homebase/CreateTaskDrawer";
import { TaskHoverCard }      from "@/components/homebase/TaskHoverCard";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SfTask {
  Id: string;
  Subject:      string | null;
  Description:  string | null;
  ActivityDate: string | null;
  Priority:     string | null;
  Status:       string | null;
  CreatedDate:  string | null;
}

type FilterTab      = "active" | "all" | "completed";
type SortField      = "Subject" | "Status" | "ActivityDate" | "Priority";
type SortDir        = "asc" | "desc";
type PriorityFilter = "All" | "High" | "Normal" | "Low";

// ── Constants ──────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { High: 0, Normal: 1, Low: 2 };
const STATUS_ORDER:   Record<string, number>  = {
  "Not Started": 0, "In Progress": 1, "Deferred": 2, "Completed": 3,
};

const STATUS_BADGE: Record<string, string> = {
  "Not Started": "bg-slate-100 text-slate-600",
  "In Progress": "bg-sky-50 text-sky-700",
  "Deferred":    "bg-amber-50 text-amber-700",
  "Completed":   "bg-emerald-50 text-emerald-700",
};

const PRIORITY_BADGE: Record<string, string> = {
  High:   "bg-rose-50 text-rose-700 border border-rose-200",
  Normal: "bg-muted text-muted-foreground border border-border",
  Low:    "bg-sky-50 text-sky-700 border border-sky-200",
};

const PRIORITY_CHIPS: Record<PriorityFilter, string> = {
  All:    "bg-primary text-primary-foreground",
  High:   "bg-rose-100 text-rose-700 ring-1 ring-rose-300",
  Normal: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
  Low:    "bg-sky-100 text-sky-700 ring-1 ring-sky-300",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr + "T00:00:00").getTime() < Date.now() - 86_400_000;
}

function dueDateLabel(dateStr: string | null): { label: string; overdue: boolean } {
  if (!dateStr) return { label: "—", overdue: false };
  const d    = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d.getTime() - Date.now()) / 86_400_000);
  const abs  = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (diff === 0)  return { label: `Today · ${abs}`,                      overdue: false };
  if (diff === 1)  return { label: `Tomorrow · ${abs}`,                   overdue: false };
  if (diff === -1) return { label: `Yesterday · ${abs}`,                  overdue: true  };
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue · ${abs}`, overdue: true  };
  return               { label: `In ${diff}d · ${abs}`,                  overdue: false };
}

// ── Sort icon ──────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />;
  return dir === "asc"
    ? <ChevronUp   className="w-3.5 h-3.5 text-primary" />
    : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
}

// ── TasksPage ──────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { toast } = useToast();

  // Remote state
  const [tasks,         setTasks]         = useState<SfTask[]>([]);
  const [orgBaseUrl,    setOrgBaseUrl]    = useState("");
  const [loading,       setLoading]       = useState(true);
  const [sfUnavailable, setSfUnavailable] = useState(false);
  const [counts, setCounts] = useState<{ active: number | null; all: number | null; completed: number | null }>({
    active: null, all: null, completed: null,
  });

  // Optimistic completion
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [completed,  setCompleted]  = useState<Set<string>>(new Set());

  // UI state
  const [filter,         setFilter]         = useState<FilterTab>("active");
  const [sortField,      setSortField]      = useState<SortField>("ActivityDate");
  const [sortDir,        setSortDir]        = useState<SortDir>("asc");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All");
  const [overdueOnly,    setOverdueOnly]    = useState(false);
  const [drawerOpen,     setDrawerOpen]     = useState(false);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const load = useCallback(async (tab: FilterTab) => {
    setLoading(true);
    setSfUnavailable(false);
    const statusParam = tab === "active" ? "active" : tab === "completed" ? "completed" : "all";
    try {
      const res  = await fetch(`/api/sf/tasks?status=${statusParam}`);
      if (res.status === 401) { setSfUnavailable(true); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { tasks: SfTask[]; orgBaseUrl?: string };
      setTasks(data.tasks ?? []);
      if (data.orgBaseUrl) setOrgBaseUrl(data.orgBaseUrl);
      setCompleted(new Set());
    } catch {
      setSfUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(filter); }, [filter, load]);

  // Count badges — non-blocking, best-effort
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/sf/tasks/counts");
        if (!res.ok) return;
        const data = await res.json() as { active: number; all: number; completed: number };
        setCounts({ active: data.active, all: data.all, completed: data.completed });
      } catch { /* silent */ }
    })();
  }, []);

  // ── Derived list (sort + filter) ─────────────────────────────────────────────

  const visibleTasks = useMemo(() => {
    let list = [...tasks];

    if (priorityFilter !== "All") {
      list = list.filter(t => (t.Priority ?? "Normal") === priorityFilter);
    }
    if (overdueOnly) {
      list = list.filter(t => isOverdue(t.ActivityDate));
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "ActivityDate": {
          const da = a.ActivityDate ?? "9999-99-99";
          const db = b.ActivityDate ?? "9999-99-99";
          cmp = da.localeCompare(db);
          break;
        }
        case "Priority":
          cmp = (PRIORITY_ORDER[a.Priority ?? "Normal"] ?? 1)
              - (PRIORITY_ORDER[b.Priority ?? "Normal"] ?? 1);
          break;
        case "Status":
          cmp = (STATUS_ORDER[a.Status ?? "Not Started"] ?? 0)
              - (STATUS_ORDER[b.Status ?? "Not Started"] ?? 0);
          break;
        default:
          cmp = (a.Subject ?? "").localeCompare(b.Subject ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [tasks, priorityFilter, overdueOnly, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleComplete(task: SfTask) {
    setCompleted(prev  => new Set([...prev, task.Id]));
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

  function handleStatusChange(id: string, status: string) {
    if (status === "Completed") {
      setCompleted(prev => new Set([...prev, id]));
    } else {
      setTasks(prev => prev.map(t => t.Id === id ? { ...t, Status: status } : t));
    }
  }

  function handleTaskUpdate(id: string, updates: { ActivityDate?: string | null; Description?: string | null }) {
    setTasks(prev => prev.map(t => t.Id === id ? { ...t, ...updates } : t));
  }

  // ── Column header ─────────────────────────────────────────────────────────────

  function ColHeader({ field, label, className = "" }: { field: SortField; label: string; className?: string }) {
    const active = sortField === field;
    return (
      <th
        onClick={() => toggleSort(field)}
        className={`px-3 py-2.5 text-left cursor-pointer select-none group ${className}`}
      >
        <div className="flex items-center gap-1">
          <span className={`text-[11px] font-semibold uppercase tracking-wide transition-colors ${
            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          }`}>
            {label}
          </span>
          <SortIcon active={active} dir={sortDir} />
        </div>
      </th>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const TABS: { id: FilterTab; label: string }[] = [
    { id: "active",    label: "Active"    },
    { id: "all",       label: "All"       },
    { id: "completed", label: "Completed" },
  ];

  const PRIORITIES: PriorityFilter[] = ["All", "High", "Normal", "Low"];
  const overdueCount = tasks.filter(t => isOverdue(t.ActivityDate) && !completed.has(t.Id)).length;
  const filtersActive = priorityFilter !== "All" || overdueOnly;

  return (
    <>
      <div className="px-4 py-8 space-y-4">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              Tasks
            </p>
            <h1 className="text-xl font-semibold text-foreground">
              My Tasks
              {!loading && !sfUnavailable && tasks.length > 0 && filtersActive && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {visibleTasks.length} of {tasks.length}
                </span>
              )}
            </h1>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>

        {/* Tabs with count badges */}
        <div className="flex gap-0.5 border-b border-border">
          {TABS.map(tab => {
            const count    = counts[tab.id];
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums ${
                  tab.id === "active" && count !== null && count > 0
                    ? isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {count === null ? "—" : count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary filter bar — only shown when tasks are loaded */}
        {!loading && !sfUnavailable && tasks.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Priority chips */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground font-medium mr-0.5">Priority:</span>
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    priorityFilter === p
                      ? PRIORITY_CHIPS[p]
                      : "bg-muted text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Overdue toggle — only if there are overdue tasks */}
            {overdueCount > 0 && (
              <button
                onClick={() => setOverdueOnly(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  overdueOnly
                    ? "bg-rose-100 text-rose-700 ring-1 ring-rose-300"
                    : "bg-muted text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                }`}
              >
                {overdueOnly ? "Overdue only ✕" : `${overdueCount} overdue`}
              </button>
            )}

            {/* Clear all filters */}
            {filtersActive && (
              <button
                onClick={() => { setPriorityFilter("All"); setOverdueOnly(false); }}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Main content */}
        <div className="rounded-xl border border-border bg-white overflow-hidden">
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
                  : "No tasks found."}
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

          ) : visibleTasks.length === 0 ? (
            <div className="px-6 py-8 text-center space-y-2">
              <p className="text-sm text-muted-foreground">No tasks match the current filters.</p>
              <button
                onClick={() => { setPriorityFilter("All"); setOverdueOnly(false); }}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Clear filters
              </button>
            </div>

          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {/* Checkbox spacer */}
                  <th className="w-10 pl-4 pr-1 py-2.5" />
                  <ColHeader field="Subject"      label="Task"     className="min-w-0" />
                  <ColHeader field="Status"       label="Status"   className="w-36" />
                  <ColHeader field="ActivityDate" label="Due Date" className="w-48" />
                  <ColHeader field="Priority"     label="Priority" className="w-24 pr-4" />
                </tr>
              </thead>
              <tbody>
                {visibleTasks.map(task => {
                  const isComp    = completed.has(task.Id) || task.Status === "Completed";
                  const isComping = completing.has(task.Id);
                  const { label: dueLabel, overdue } = dueDateLabel(task.ActivityDate);
                  const statusCls = STATUS_BADGE[task.Status ?? ""] ?? "bg-slate-100 text-slate-600";
                  const priCls    = PRIORITY_BADGE[task.Priority ?? "Normal"] ?? PRIORITY_BADGE["Normal"];

                  return (
                    <tr
                      key={task.Id}
                      className={`border-b border-border/50 last:border-0 transition-colors hover:bg-muted/10 ${
                        isComp ? "opacity-60" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="pl-4 pr-1 py-3.5 w-10 align-top">
                        <button
                          onClick={() => { if (!isComp) void handleComplete(task); }}
                          disabled={isComping || isComp}
                          className={`mt-0.5 transition-colors ${
                            isComp
                              ? "text-emerald-500 cursor-default"
                              : "text-muted-foreground hover:text-primary disabled:opacity-50"
                          }`}
                          aria-label={isComp ? "Completed" : `Complete: ${task.Subject}`}
                        >
                          {isComping
                            ? <Loader2      className="w-4 h-4 animate-spin" />
                            : isComp
                            ? <CheckCircle2 className="w-4 h-4" />
                            : <Square       className="w-4 h-4" />
                          }
                        </button>
                      </td>

                      {/* Task — click opens hover card */}
                      <td className="px-3 py-3.5 align-top">
                        <TaskHoverCard
                          task={task}
                          orgBaseUrl={orgBaseUrl}
                          onStatusChange={handleStatusChange}
                          onTaskUpdate={handleTaskUpdate}
                        >
                          <div className="cursor-pointer select-none min-w-0">
                            <p className={`text-sm font-medium leading-snug ${
                              isComp ? "line-through text-muted-foreground" : "text-foreground"
                            }`}>
                              {task.Subject ?? "Untitled task"}
                            </p>
                            {task.Description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">
                                {task.Description}
                              </p>
                            )}
                          </div>
                        </TaskHoverCard>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 w-36 align-top">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold ${statusCls}`}>
                          {task.Status ?? "Not Started"}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className={`px-3 py-3.5 w-48 align-top text-[12px] font-medium whitespace-nowrap ${
                        overdue ? "text-rose-600" : "text-muted-foreground"
                      }`}>
                        {dueLabel}
                      </td>

                      {/* Priority */}
                      <td className="px-3 pr-4 py-3.5 w-24 align-top">
                        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${priCls}`}>
                          {task.Priority ?? "Normal"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
