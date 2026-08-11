/**
 * CreateTaskDrawer
 *
 * Shared slide-over for creating a new Salesforce Task.
 * Used by both TodayTasksCard (on Homebase) and TasksPage.
 *
 * On submit: POSTs to /api/sf/tasks and calls onCreated() so callers refresh.
 */

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Search, Link2, CheckCircle2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreateTaskDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PRIORITIES = ["High", "Normal", "Low"] as const;
type Priority = (typeof PRIORITIES)[number];

type RecordType = "Account" | "Case" | "Opportunity" | "Task";

interface SearchResult {
  id: string;
  type: RecordType | string;
  label: string;
  subtitle?: string;
}

const TYPE_COLORS: Record<string, string> = {
  Account:     "bg-sky-100 text-sky-700",
  Case:        "bg-amber-100 text-amber-700",
  Opportunity: "bg-emerald-100 text-emerald-700",
  Task:        "bg-violet-100 text-violet-700",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function CreateTaskDrawer({ open, onClose, onCreated }: CreateTaskDrawerProps) {
  const { toast } = useToast();

  // Task fields
  const [subject, setSubject]       = useState("");
  const [description, setDesc]      = useState("");
  const [dueDate, setDueDate]       = useState(todayIso);
  const [priority, setPriority]     = useState<Priority>("Normal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Related record picker
  const [relatedQuery, setRelatedQuery]     = useState("");
  const [relatedResults, setRelatedResults] = useState<SearchResult[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SearchResult | null>(null);
  const [pickerOpen, setPickerOpen]         = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef   = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pickerOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (relatedQuery.length < 2) {
      setRelatedResults([]);
      setRelatedLoading(false);
      return undefined;
    }
    setRelatedLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sf/records/search?q=${encodeURIComponent(relatedQuery)}`);
        if (res.ok) {
          const data = await res.json() as { results: SearchResult[] };
          setRelatedResults(data.results ?? []);
        }
      } catch {
        // silently fail — user can retry
      } finally {
        setRelatedLoading(false);
        setPickerOpen(true);
      }
    }, 320);
    return undefined;
  }, [relatedQuery]);

  function reset() {
    setSubject("");
    setDesc("");
    setDueDate(todayIso());
    setPriority("Normal");
    setError(null);
    setRelatedQuery("");
    setRelatedResults([]);
    setSelectedRecord(null);
    setPickerOpen(false);
  }

  function selectRecord(r: SearchResult) {
    setSelectedRecord(r);
    setRelatedQuery("");
    setRelatedResults([]);
    setPickerOpen(false);
  }

  function clearRecord() {
    setSelectedRecord(null);
    setRelatedQuery("");
    setRelatedResults([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) { setError("Subject is required."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        subject:     subject.trim(),
        description: description.trim() || undefined,
        dueDate:     dueDate || undefined,
        priority,
      };
      if (selectedRecord) body["whatId"] = selectedRecord.id;

      const res = await fetch("/api/sf/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? `HTTP ${res.status}`);
      }
      toast({ title: "Task created", description: subject.trim() });
      reset();
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create task.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[420px] bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">New Task</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted/40 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground" htmlFor="task-subject">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-subject"
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="What needs to be done?"
              maxLength={255}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground" htmlFor="task-desc">
              Description
            </label>
            <textarea
              id="task-desc"
              rows={3}
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Optional details…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground" htmlFor="task-due">
              Due date
            </label>
            <input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground" htmlFor="task-priority">
              Priority
            </label>
            <div className="relative">
              <select
                id="task-priority"
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none pr-8"
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Related record */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              Related to
            </label>

            {/* Selected chip */}
            {selectedRecord ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span
                  className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${TYPE_COLORS[selectedRecord.type] ?? "bg-muted text-muted-foreground"}`}
                >
                  {selectedRecord.type}
                </span>
                <span className="text-sm text-foreground flex-1 truncate">{selectedRecord.label}</span>
                <button
                  type="button"
                  onClick={clearRecord}
                  className="ml-auto p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Remove related record"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              /* Search input + dropdown */
              <div className="relative" ref={pickerRef}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  {relatedLoading && (
                    <Loader2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
                  )}
                  <input
                    type="text"
                    value={relatedQuery}
                    onChange={e => { setRelatedQuery(e.target.value); if (e.target.value.length >= 2) setPickerOpen(true); else setPickerOpen(false); }}
                    onFocus={() => { if (relatedResults.length > 0) setPickerOpen(true); }}
                    placeholder="Search accounts, cases, opportunities…"
                    className="w-full rounded-lg border border-border bg-background pl-8 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {pickerOpen && relatedResults.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 rounded-lg border border-border bg-white shadow-lg overflow-hidden">
                    {relatedResults.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => selectRecord(r)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                      >
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${TYPE_COLORS[r.type] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {r.type}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-foreground truncate">{r.label}</span>
                          {r.subtitle && r.subtitle !== r.type && (
                            <span className="block text-[11px] text-muted-foreground">{r.subtitle}</span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {pickerOpen && !relatedLoading && relatedQuery.length >= 2 && relatedResults.length === 0 && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 rounded-lg border border-border bg-white shadow-lg px-3 py-3 text-sm text-muted-foreground text-center">
                    No records found for "{relatedQuery}"
                  </div>
                )}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              Link to an Account, Case, Opportunity, or Task in Salesforce.
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Create Task
          </button>
        </div>
      </div>
    </>
  );
}
