/**
 * PennyPreparedBand
 *
 * Collapsible band at the top of the Coach Homebase main area.
 * Shows draft items Penny has staged for coach review:
 *   - Draft verdicts
 *   - Date-change proposals
 *   - Countersign requests
 *   - Nudges
 *
 * States:
 *   loading   — spinner
 *   empty     — "Nothing waiting from Penny…"
 *   populated — list of draft cards, first approve button is the amber CTA
 *
 * CTA rule: the FIRST approve button is amber.  Subsequent approves are emerald.
 * This ensures at most one amber CTA is visible on the Coach Homebase at a time.
 */

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Sparkles, Loader2, CheckCircle2, Edit2, X } from "lucide-react";
import type { PennyPreparedState, PennyPreparedItem } from "@/hooks/useHomebaseCoach";

// ── Kind labels ────────────────────────────────────────────────────────────────

const KIND_LABELS: Record<string, string> = {
  verdict:     "Draft verdict",
  date_change: "Date change",
  countersign: "Countersign",
  nudge:       "Nudge",
};

function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

// ── DraftCard ──────────────────────────────────────────────────────────────────

interface DraftCardProps {
  item:      PennyPreparedItem;
  isFirst:   boolean;
  onApprove: (id: string) => void;
  onEdit:    (id: string) => void;
  onDiscard: (id: string) => void;
}

function DraftCard({ item, isFirst, onApprove, onEdit, onDiscard }: DraftCardProps) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 flex flex-col gap-3">
      {/* Kind label */}
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        {kindLabel(item.kind)}
      </p>

      {/* Title — Poppins 17px per spec */}
      <p className="font-serif text-[17px] font-semibold text-foreground leading-snug">
        {item.title}
      </p>

      {/* Body */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {item.body}
      </p>

      {/* Actions — verdict workflow pending (task #259); disabled with coming-soon messaging */}
      <div className="flex items-center gap-2 flex-wrap mt-1">
        {/* Approve — amber (#D97706) for first card, emerald for subsequent */}
        <button
          disabled
          title="Verdict workflow coming soon — wires to SF once coaching fields are provisioned"
          className={[
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold",
            "opacity-40 cursor-not-allowed",
            isFirst
              ? "bg-[#D97706] text-white"
              : "bg-emerald-600 text-white",
          ].join(" ")}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approve
        </button>

        {/* Edit first */}
        <button
          disabled
          title="Verdict workflow coming soon"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground opacity-40 cursor-not-allowed"
        >
          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
          Edit first
        </button>

        {/* Discard */}
        <button
          disabled
          title="Verdict workflow coming soon"
          className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground opacity-40 cursor-not-allowed"
        >
          <X className="w-3.5 h-3.5" />
          Discard
        </button>

        <span className="text-[11px] text-muted-foreground italic">
          Verdict workflow coming soon
        </span>
      </div>
    </div>
  );
}

// ── PennyPreparedBand (exported) ───────────────────────────────────────────────

interface PennyPreparedBandProps {
  isLoading:    boolean;
  preparedState: PennyPreparedState | undefined;
  error:        Error | null;
  onApprove?:   (id: string) => void;
  onEdit?:      (id: string) => void;
  onDiscard?:   (id: string) => void;
}

export function PennyPreparedBand({
  isLoading,
  preparedState,
  error,
  onApprove = () => undefined,
  onEdit    = () => undefined,
  onDiscard = () => undefined,
}: PennyPreparedBandProps) {
  const items = preparedState?.items ?? [];
  const count = items.length;

  // Start collapsed; expand automatically when items first arrive.
  // Track whether the user has deliberately collapsed so we don't re-open
  // after they close (deliberateCollapse ref stays true for the session).
  const [expanded, setExpanded] = useState(false);
  const deliberateCollapse = useRef(false);

  // When query data loads and items are present, open the band — unless the
  // user has already explicitly closed it.
  useEffect(() => {
    if (!isLoading && count > 0 && !deliberateCollapse.current) {
      setExpanded(true);
    }
  }, [isLoading, count]);

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    // Record a deliberate collapse so the useEffect won't re-open
    if (!next) deliberateCollapse.current = true;
  }

  return (
    <div className="rounded-xl border border-border bg-[hsl(40_25%_96%)] overflow-hidden">
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Penny has prepared</span>
          {!isLoading && count > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5">
              {count}
            </span>
          )}
          {!isLoading && count === 0 && !error && (
            <span className="text-[12px] text-muted-foreground">Nothing waiting</span>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground py-4 leading-relaxed">
              Couldn't reach Penny right now — try refreshing the page.
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 leading-relaxed">
              Nothing waiting from Penny — check back after your squad has submitted work.
            </p>
          ) : (
            items.map((item, idx) => (
              <DraftCard
                key={item.id}
                item={item}
                isFirst={idx === 0}
                onApprove={onApprove}
                onEdit={onEdit}
                onDiscard={onDiscard}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
