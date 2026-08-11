/**
 * CreateTaskDrawer
 *
 * Shared slide-over for creating a new Salesforce Task.
 * Used by both TodayTasksCard (on Homebase) and TasksPage.
 *
 * On submit: POSTs to /api/sf/tasks and calls onCreated() so callers refresh.
 */

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreateTaskDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PRIORITIES = ["High", "Normal", "Low"] as const;
type Priority = (typeof PRIORITIES)[number];

export function CreateTaskDrawer({ open, onClose, onCreated }: CreateTaskDrawerProps) {
  const { toast } = useToast();
  const [subject, setSubject]       = useState("");
  const [description, setDesc]      = useState("");
  const [dueDate, setDueDate]       = useState(todayIso());
  const [priority, setPriority]     = useState<Priority>("Normal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function reset() {
    setSubject("");
    setDesc("");
    setDueDate(todayIso());
    setPriority("Normal");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) { setError("Subject is required."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/sf/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), description: description.trim() || undefined, dueDate: dueDate || undefined, priority }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
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
            <select
              id="task-priority"
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {PRIORITIES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
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
