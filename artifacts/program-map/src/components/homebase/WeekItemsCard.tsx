/**
 * WeekItemsCard
 *
 * "Also This Week" — collapsible list of week items for the Learner Homebase.
 * Toggle reads its own state: collapsed says "Expand ▼", expanded says "Collapse ▲".
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Calendar, Loader2, AlertCircle, Clock } from "lucide-react";
import type { WeekItem, WeekState } from "@/hooks/useHomebaseLearner";

// ── Item type icon ─────────────────────────────────────────────────────────────

function ItemIcon({ type }: { type: WeekItem["type"] }) {
  if (type === "rework")     return <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />;
  if (type === "deadline")   return <Clock       className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />;
  if (type === "buddy_test") return <Calendar    className="w-3.5 h-3.5 text-sky-500   flex-shrink-0 mt-0.5" />;
  return null;
}

// ── Due date helper ────────────────────────────────────────────────────────────

function formatDue(dueDate: string | null): string {
  if (!dueDate) return "";
  const d    = new Date(dueDate);
  const diff = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (diff < 0)  return "Overdue";
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due in ${diff}d`;
}

// ── WeekItemsCard (exported) ───────────────────────────────────────────────────

interface WeekItemsCardProps {
  isLoading: boolean;
  weekState: WeekState | undefined;
  error:     Error | null;
}

export function WeekItemsCard({ isLoading, weekState, error }: WeekItemsCardProps) {
  const [expanded, setExpanded] = useState(true);

  const items = weekState?.items ?? [];

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      {/* Header — toggle */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Also This Week</span>
          {!isLoading && items.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
              {items.length}
            </span>
          )}
        </div>
        {expanded
          ? <span className="flex items-center gap-1 text-xs text-muted-foreground">Collapse <ChevronUp   className="w-3.5 h-3.5" /></span>
          : <span className="flex items-center gap-1 text-xs text-muted-foreground">Expand   <ChevronDown className="w-3.5 h-3.5" /></span>
        }
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground py-4">
              Couldn't load this week's items.
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 leading-relaxed">
              Nothing scheduled yet for this week.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {items.map(item => (
                <li key={item.id} className="flex items-start gap-2.5">
                  <ItemIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{item.label}</p>
                    {item.dueDate && (
                      <p className="text-[12px] text-muted-foreground">{formatDue(item.dueDate)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
