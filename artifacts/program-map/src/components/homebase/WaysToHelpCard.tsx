/**
 * WaysToHelpCard
 *
 * Collapsible "Ways to help" card for the Volunteer Homebase.
 * Shows unassigned cases from the queue, specialty-matched first.
 *
 * Features:
 *   - Info strip: open count vs volunteer's case limit
 *   - Specialty-matched cases: green-left-border
 *   - Non-matching cases: below a "See the whole queue" divider
 *   - Each row: case number, subject, client, estimated size, days-waiting badge
 *   - "Assign to me" button: disabled (SF assignment is a follow-on task)
 *
 * Empty state: "No cases in the queue right now — check back soon."
 * Phase-1 stub state: same empty state (no SF queue data yet).
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Users, Loader2, Clock, AlertCircle } from "lucide-react";
import type { QueueCase, QueueState } from "@/hooks/useHomebaseVolunteer";

// ── Size badge ─────────────────────────────────────────────────────────────────

const SIZE_LABELS: Record<string, string> = {
  small:  "Small",
  medium: "Medium",
  large:  "Large",
};

function SizeBadge({ size }: { size: QueueCase["estimatedSize"] }) {
  if (!size) return null;
  return (
    <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
      {SIZE_LABELS[size] ?? size}
    </span>
  );
}

// ── Queue row ──────────────────────────────────────────────────────────────────

function QueueRow({ item }: { item: QueueCase }) {
  return (
    <div
      className={[
        "flex items-start gap-3 py-3 border-b border-border last:border-0",
        item.matchesSpecialty
          ? "border-l-2 border-l-emerald-400 pl-2"
          : "pl-0",
      ].join(" ")}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          {item.caseNumber && (
            <span className="text-[11px] text-muted-foreground font-mono">#{item.caseNumber}</span>
          )}
          <SizeBadge size={item.estimatedSize} />
          {item.daysWaiting !== null && item.daysWaiting > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
              <Clock className="w-3 h-3" />
              {item.daysWaiting}d waiting
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-foreground leading-snug truncate">
          {item.subject ?? "Untitled case"}
        </p>
        {item.clientName && (
          <p className="text-[12px] text-muted-foreground mt-0.5">{item.clientName}</p>
        )}
      </div>

      {/* Assign to me — disabled until SF assignment is wired (follow-on task) */}
      <button
        disabled
        title="Case assignment coming soon — will write to Salesforce when wired"
        className="flex-shrink-0 text-sm font-medium text-primary opacity-40 cursor-not-allowed mt-0.5"
      >
        Assign to me
      </button>
    </div>
  );
}

// ── WaysToHelpCard (exported) ──────────────────────────────────────────────────

interface WaysToHelpCardProps {
  isLoading:  boolean;
  queueState: QueueState | undefined;
  error:      Error | null;
}

export function WaysToHelpCard({ isLoading, queueState, error }: WaysToHelpCardProps) {
  const [expanded, setExpanded] = useState(true);

  const items     = queueState?.items ?? [];
  const openCount = queueState?.openCount ?? 0;
  const caseLimit = queueState?.caseLimit ?? 3;

  const matched   = items.filter(i => i.matchesSpecialty);
  const unmatched = items.filter(i => !i.matchesSpecialty);

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Ways to help</span>
          {!isLoading && items.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold px-1.5">
              {items.length}
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp   className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 flex flex-col gap-3">
          {/* Intro paragraph */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Unassigned cases from the queue, matched to your specialty first.
          </p>

          {/* Count / limit info strip */}
          {!isLoading && !error && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <p className="text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground">{openCount}</span> open in queue
                {" · "}
                limit of <span className="font-semibold text-foreground">{caseLimit}</span> cases
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground py-2 leading-relaxed">
              Couldn't load the queue right now. Try refreshing.
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 leading-relaxed">
              No cases in the queue right now — check back soon.
            </p>
          ) : (
            <div>
              {/* Specialty-matched first */}
              {matched.map(item => <QueueRow key={item.id} item={item} />)}

              {/* Divider for unmatched */}
              {matched.length > 0 && unmatched.length > 0 && (
                <div className="py-2">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                    See the whole queue
                  </p>
                </div>
              )}

              {unmatched.map(item => <QueueRow key={item.id} item={item} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
