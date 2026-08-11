/**
 * LogTimeModal
 *
 * Slide-over modal that lets staff log time against a Salesforce record
 * (Case, Account, Task, or Opportunity) in 15-minute increments.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Search, Briefcase, Building2, CheckSquare, TrendingUp, Loader2 } from "lucide-react";

interface SfResult {
  id:       string;
  type:     "case" | "account" | "task" | "opportunity";
  name:     string;
  subtitle: string;
}

interface LogTimeModalProps {
  open:    boolean;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  case:        Briefcase,
  account:     Building2,
  task:        CheckSquare,
  opportunity: TrendingUp,
};

const TYPE_LABEL: Record<string, string> = {
  case:        "Case",
  account:     "Account",
  task:        "Task",
  opportunity: "Opportunity",
};

const TYPE_COLOR: Record<string, string> = {
  case:        "bg-blue-50 text-blue-700 border-blue-200",
  account:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  task:        "bg-violet-50 text-violet-700 border-violet-200",
  opportunity: "bg-amber-50 text-amber-700 border-amber-200",
};

// 15-min increments up to 8 hours
const DURATIONS: { label: string; minutes: number }[] = [
  { label: "0:15", minutes: 15  },
  { label: "0:30", minutes: 30  },
  { label: "0:45", minutes: 45  },
  { label: "1:00", minutes: 60  },
  { label: "1:15", minutes: 75  },
  { label: "1:30", minutes: 90  },
  { label: "1:45", minutes: 105 },
  { label: "2:00", minutes: 120 },
  { label: "2:30", minutes: 150 },
  { label: "3:00", minutes: 180 },
  { label: "3:30", minutes: 210 },
  { label: "4:00", minutes: 240 },
  { label: "5:00", minutes: 300 },
  { label: "6:00", minutes: 360 },
  { label: "7:00", minutes: 420 },
  { label: "8:00", minutes: 480 },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function LogTimeModal({ open, onClose, onSaved }: LogTimeModalProps) {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<SfResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SfResult | null>(null);
  const [minutes,  setMinutes]  = useState<number | null>(null);
  const [notes,    setNotes]    = useState("");
  const [workDate, setWorkDate] = useState(todayIso());
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setQuery(""); setResults([]); setSelected(null);
      setMinutes(null); setNotes(""); setWorkDate(todayIso());
      setError(""); setSaving(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const search = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    fetch(`/api/sf/search?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then((data: { results?: SfResult[] }) => setResults(data.results ?? []))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const handleSave = async () => {
    if (!selected) { setError("Select a Salesforce record."); return; }
    if (!minutes)  { setError("Choose a duration."); return; }
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/time-logs", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          sfObjectType: selected.type,
          sfObjectId:   selected.id,
          sfObjectName: selected.name,
          minutes,
          notes:    notes || undefined,
          workDate,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to save.");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[440px] bg-white shadow-2xl flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0, transition: { type: "spring", stiffness: 340, damping: 32 } }}
            exit={{ x: "100%", transition: { duration: 0.2 } }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Log Time</span>
              </div>
              <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              {/* Object search */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Salesforce Record
                </label>

                {selected ? (
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${TYPE_COLOR[selected.type]} cursor-pointer`}
                    onClick={() => { setSelected(null); setQuery(""); setResults([]); }}>
                    {(() => { const Icon = TYPE_ICON[selected.type]; return <Icon className="w-4 h-4 flex-shrink-0" />; })()}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{selected.name}</p>
                      <p className="text-xs opacity-70 truncate">{selected.subtitle}</p>
                    </div>
                    <span className="text-[10px] font-medium border rounded px-1.5 py-0.5 flex-shrink-0">
                      {TYPE_LABEL[selected.type]}
                    </span>
                    <X className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={e => handleQueryChange(e.target.value)}
                      placeholder="Search cases, accounts, tasks, opportunities…"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
                    )}
                  </div>
                )}

                {/* Results */}
                {!selected && results.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                    {results.map(r => {
                      const Icon = TYPE_ICON[r.type];
                      return (
                        <button
                          key={r.id}
                          onClick={() => { setSelected(r); setQuery(r.name); setResults([]); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${TYPE_COLOR[r.type]}`}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground flex-shrink-0">
                            {TYPE_LABEL[r.type]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {!selected && !searching && query.length >= 2 && results.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1">No results for "{query}"</p>
                )}
              </div>

              {/* Duration picker */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Duration
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {DURATIONS.map(d => (
                    <button
                      key={d.minutes}
                      onClick={() => setMinutes(d.minutes === minutes ? null : d.minutes)}
                      className={`py-2 text-sm font-medium rounded-lg border transition-all ${
                        minutes === d.minutes
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Work date */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Date Worked
                </label>
                <input
                  type="date"
                  value={workDate}
                  max={todayIso()}
                  onChange={e => setWorkDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Notes <span className="normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="What did you work on?"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !selected || !minutes}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Time Log
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
