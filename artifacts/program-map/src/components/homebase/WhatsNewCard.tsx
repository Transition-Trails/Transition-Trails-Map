/**
 * WhatsNewCard
 *
 * A compact summary of the latest Trail OS release. Shown on Mission Control
 * and Team Homebase. Displays the top entries from the most recent release
 * (major changes first, capped at 4 items) with kind badges, version/date
 * heading, an optional "New" badge when there is an unseen release, and a
 * footer link to the full release notes page.
 *
 * Clicking the footer link calls markSeen() so the sidebar dot clears.
 */

import { ArrowUpCircle, Sparkles, Wrench, ArrowRight, Tag } from "lucide-react";
import { Link } from "wouter";
import { useSeenVersion } from "@/hooks/useSeenVersion";
import { RELEASES, type ChangeKind } from "@/data/releaseData";

// ── Kind badge helpers ────────────────────────────────────────────────────────

const KIND_META: Record<ChangeKind, { label: string; icon: React.ReactNode; color: string }> = {
  major: {
    label: "Major",
    icon: <ArrowUpCircle className="w-3 h-3" />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  minor: {
    label: "Minor",
    icon: <Sparkles className="w-3 h-3" />,
    color: "bg-sky-50 text-sky-700 border-sky-200",
  },
  fix: {
    label: "Bug Fix",
    icon: <Wrench className="w-3 h-3" />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

function KindBadge({ kind }: { kind: ChangeKind }) {
  const meta = KIND_META[kind];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium shrink-0 ${meta.color}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface WhatsNewCardProps {
  /** When true, renders a slightly more compact variant (default: false). */
  compact?: boolean;
}

const KIND_ORDER: ChangeKind[] = ["major", "minor", "fix"];
const MAX_ENTRIES = 4;

export function WhatsNewCard({ compact = false }: WhatsNewCardProps) {
  const { hasUnseenRelease, markSeen } = useSeenVersion();

  const release = RELEASES[0];
  if (!release) return null;

  // Sort entries: major first, then minor, then fix — take top MAX_ENTRIES
  const sortedEntries = [...release.entries].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
  ).slice(0, MAX_ENTRIES);

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground">What's New</span>
          {hasUnseenRelease && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary border border-primary/25 shrink-0">
              New
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-foreground/80">v{release.version}</span>
          <span className="text-[11px] text-muted-foreground">· {release.date}</span>
          {release.label && (
            <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {release.label}
            </span>
          )}
        </div>
      </div>

      {/* Entry list */}
      <div className={`${compact ? "px-3 py-2" : "px-4 py-3"} space-y-2`}>
        {sortedEntries.map((entry, i) => (
          <div key={i} className="flex items-start gap-2">
            <KindBadge kind={entry.kind} />
            <p className="text-[12px] text-foreground/80 leading-relaxed flex-1 min-w-0">
              {entry.text}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border/40 px-4 py-2">
        <Link
          href="/release-notes"
          onClick={markSeen}
          className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline font-medium"
        >
          View full release notes
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
