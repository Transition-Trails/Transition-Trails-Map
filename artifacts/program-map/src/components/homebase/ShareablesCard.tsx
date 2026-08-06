/**
 * ShareablesCard
 *
 * "Worth sharing" bottom-left card for the Volunteer Homebase.
 * Shows two types of shareable content:
 *   - A Transition Trails post to engage with → opens LinkedIn
 *   - A draft post about the volunteer's own work → opens LinkedIn compose
 *
 * Phase 1: static placeholder items (no LinkedIn API).
 * Share buttons open linkedin.com — no OAuth integration required.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Share2, ExternalLink, Loader2 } from "lucide-react";
import type { ShareableItem, ShareablesState } from "@/hooks/useHomebaseVolunteer";

// ── Shareable row ──────────────────────────────────────────────────────────────

function ShareableRow({ item }: { item: ShareableItem }) {
  const href = item.url ?? "https://www.linkedin.com/company/transition-trails/";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
          {item.kind === "post" ? "Engage" : "Your work"}
        </p>
        <p className="text-sm font-medium text-foreground leading-snug">
          {item.title}
        </p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-0.5"
      >
        {item.label}
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

// ── ShareablesCard (exported) ──────────────────────────────────────────────────

interface ShareablesCardProps {
  isLoading:       boolean;
  shareablesState: ShareablesState | undefined;
  error:           Error | null;
}

export function ShareablesCard({ isLoading, shareablesState, error }: ShareablesCardProps) {
  const [expanded, setExpanded] = useState(true);
  const items = shareablesState?.items ?? [];

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Worth sharing</span>
        </div>
        {expanded
          ? <ChevronUp   className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
            <p className="text-sm text-muted-foreground py-2 leading-relaxed">
              Couldn't load shareable content right now.
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 leading-relaxed">
              Nothing to share right now — check back after your next session.
            </p>
          ) : (
            <div>
              {items.map(i => <ShareableRow key={i.id} item={i} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
