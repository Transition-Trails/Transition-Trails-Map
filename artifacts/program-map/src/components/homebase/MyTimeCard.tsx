/**
 * MyTimeCard
 *
 * Shows the current user's recent time log entries with the ability to delete
 * individual records. Refreshes when `refreshKey` changes.
 */

import { useState, useEffect } from "react";
import { Clock, Trash2, Briefcase, Building2, CheckSquare, TrendingUp, Loader2 } from "lucide-react";

interface TimeEntry {
  id:           number;
  sfObjectType: string | null;
  sfObjectId:   string | null;
  sfObjectName: string | null;
  hours:        string;
  workDate:     string | null;
  notes:        string | null;
  loggedAt:     string;
}

interface MyTimeCardProps {
  refreshKey: number;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  case:        Briefcase,
  account:     Building2,
  task:        CheckSquare,
  opportunity: TrendingUp,
};

const TYPE_COLOR: Record<string, string> = {
  case:        "bg-blue-50 text-blue-600",
  account:     "bg-emerald-50 text-emerald-600",
  task:        "bg-violet-50 text-violet-600",
  opportunity: "bg-amber-50 text-amber-600",
};

function fmtMinutes(hours: string) {
  const total = Math.round(parseFloat(hours) * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MyTimeCard({ refreshKey }: MyTimeCardProps) {
  const [entries,  setEntries]  = useState<TimeEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/time-logs")
      .then(r => r.ok ? r.json() : { entries: [] })
      .then((d: { entries?: TimeEntry[] }) => setEntries(
        (d.entries ?? []).filter(e => e.sfObjectType != null)
      ))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await fetch(`/api/time-logs/${id}`, { method: "DELETE" });
      setEntries(prev => prev.filter(e => e.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">My Time Logs</span>
        </div>
        {entries.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {fmtMinutes(entries.reduce((s, e) => s + parseFloat(e.hours), 0).toFixed(2))} total
          </span>
        )}
      </div>

      {/* Body */}
      <div className="divide-y divide-border/40">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center space-y-1">
            <Clock className="w-6 h-6 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">No time logged yet.</p>
            <p className="text-xs text-muted-foreground/70">Use "Log Time" to start tracking.</p>
          </div>
        ) : (
          entries.map(entry => {
            const Icon  = TYPE_ICON[entry.sfObjectType ?? "case"] ?? Briefcase;
            const color = TYPE_COLOR[entry.sfObjectType ?? "case"] ?? TYPE_COLOR["case"];
            return (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-3 group hover:bg-muted/20 transition-colors">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {entry.sfObjectName ?? "—"}
                  </p>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.notes}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {fmtDate(entry.workDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[12px] font-semibold text-foreground">
                    {fmtMinutes(entry.hours)}
                  </span>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleting === entry.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground"
                  >
                    {deleting === entry.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
