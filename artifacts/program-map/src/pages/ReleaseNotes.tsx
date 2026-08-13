import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag, Wrench, Sparkles, ArrowUpCircle, ChevronRight, MessageSquarePlus, PlayCircle, Flag } from "lucide-react";
import { useSeenVersion } from "@/hooks/useSeenVersion";
import { APP_VERSION } from "@/config/version";
import { SubmitCaseDrawer } from "@/components/homebase/SubmitCaseDrawer";
import { useHomebaseTour } from "@/hooks/useHomebaseTour";
import { useMissionControlTour } from "@/hooks/useMissionControlTour";
import { useHomebaseAuth } from "@/hooks/useHomebaseAuth";
import { useLocation } from "wouter";
import { RELEASES, type ChangeKind, type ReleaseEntry, type Release } from "@/data/releaseData";

// ── Helpers ───────────────────────────────────────────────────────────────────

const KIND_META: Record<ChangeKind, { label: string; icon: React.ReactNode; color: string }> = {
  major: {
    label: "Major",
    icon: <ArrowUpCircle className="w-3.5 h-3.5" />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  minor: {
    label: "Minor",
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: "bg-sky-50 text-sky-700 border-sky-200",
  },
  fix: {
    label: "Bug Fix",
    icon: <Wrench className="w-3.5 h-3.5" />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

// ── Report-issue pre-fill helpers ─────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Truncate `text` to `maxLen` chars at a word boundary, appending "…". */
function truncateAtWord(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const sliced = text.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced) + "…";
}

function makeReportSubject(version: string, text: string): string {
  return `Issue with v${version}: ${truncateAtWord(text, 80)}`;
}

function makeReportDescription(version: string, date: string, kind: ChangeKind, text: string): string {
  const kindLabel = KIND_META[kind].label;
  return [
    `<p><strong>Version:</strong> v${escapeHtml(version)} — ${escapeHtml(date)}</p>`,
    `<p><strong>Change kind:</strong> ${escapeHtml(kindLabel)}</p>`,
    `<p><strong>Entry:</strong> ${escapeHtml(text)}</p>`,
    `<p>&nbsp;</p>`,
    `<p>Describe the issue below:</p>`,
  ].join("");
}

function KindBadge({ kind }: { kind: ChangeKind }) {
  const meta = KIND_META[kind];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium shrink-0 ${meta.color}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

// ── Summary chips for the selector panel ─────────────────────────────────────

function ReleaseSummaryChips({ entries }: { entries: ReleaseEntry[] }) {
  const counts: Record<ChangeKind, number> = { major: 0, minor: 0, fix: 0 };
  for (const e of entries) counts[e.kind]++;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      {(["major", "minor", "fix"] as ChangeKind[]).map((k) =>
        counts[k] > 0 ? (
          <span
            key={k}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${KIND_META[k].color}`}
          >
            {counts[k]} {KIND_META[k].label}
          </span>
        ) : null
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function NewBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary border border-primary/25 shrink-0">
      New
    </span>
  );
}

// ── Version comparison ────────────────────────────────────────────────────────

/** Returns true when `a` is strictly newer than `b` (major.minor format). */
function isNewerVersion(a: string, b: string): boolean {
  const [aMaj, aMin] = a.split(".").map(Number);
  const [bMaj, bMin] = b.split(".").map(Number);
  return aMaj > bMaj || (aMaj === bMaj && aMin > bMin);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReleaseNotes() {
  const [selectedVersion,  setSelectedVersion]  = useState<string>(RELEASES[0].version);
  const [showSubmitCase,   setShowSubmitCase]   = useState(false);
  const [reportingEntry,   setReportingEntry]   = useState<{ version: string; date: string; kind: ChangeKind; text: string } | null>(null);
  const { startTour } = useHomebaseTour();
  const { startTour: startMCTour } = useMissionControlTour();
  const [, navigate] = useLocation();
  const { audience } = useHomebaseAuth();
  const isHombaseAudience = audience !== null;
  const release = RELEASES.find((r) => r.version === selectedVersion) ?? RELEASES[0];

  const { lastSeenVersion, markSeen, isReady } = useSeenVersion();

  // Latch the lastSeenVersion at page-open time *before* markSeen() updates it,
  // so badges stay visible for the whole session even after the dot is cleared.
  // undefined = not yet latched; null = user has never recorded a seen version.
  const lastSeenAtOpenRef = useRef<string | null | undefined>(undefined);
  if (isReady && lastSeenAtOpenRef.current === undefined) {
    lastSeenAtOpenRef.current = lastSeenVersion;
  }

  // Mark seen once prefs are loaded (clears the sidebar dot).
  useEffect(() => {
    if (isReady) markSeen();
  }, [isReady, markSeen]);

  // Show "New" badges on every release that is newer than the version the user
  // last acknowledged. null means the user has no recorded seen-version (first
  // visit or anonymous) — show no badges to avoid overwhelming them.
  const isReleaseNew = (releaseVersion: string): boolean => {
    const baseline = lastSeenAtOpenRef.current;
    if (!baseline) return false;
    return isNewerVersion(releaseVersion, baseline);
  };

  const showNewBadges = isReleaseNew(release.version);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                Trail OS
              </p>
            </div>
            <h1 className="text-lg font-semibold font-serif text-foreground">Release Notes</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              A history of major features, improvements, and bug fixes.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isHombaseAudience) {
                  // Homebase audience: already inside HomebaseShell which mounts
                  // HomebaseTour — call startTour() in-place, no navigation needed.
                  startTour();
                } else {
                  // Staff: call startTour() then navigate to /homebase so
                  // HomebaseShell mounts and HomebaseTour can open.
                  startTour();
                  navigate("/homebase");
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted/60 text-[12px] font-medium text-foreground transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5 text-muted-foreground" />
              Take the tour
            </button>
            <button
              type="button"
              onClick={() => setShowSubmitCase(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted/60 text-[12px] font-medium text-foreground transition-colors"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-muted-foreground" />
              Report an issue
            </button>
          </div>
        </div>
      </div>

      {/* Body: selector + content */}
      <div className="flex flex-1 min-h-0">
        {/* ── Version selector ── */}
        <aside className="w-52 shrink-0 border-r border-border flex flex-col">
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium px-2">
              Versions
            </p>
          </div>
          <ScrollArea className="flex-1">
            <nav className="px-2 pb-4 space-y-0.5">
              {RELEASES.map((r) => {
                const isActive = r.version === selectedVersion;
                return (
                  <button
                    key={r.version}
                    onClick={() => setSelectedVersion(r.version)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>
                          v{r.version}
                        </span>
                        {isReleaseNew(r.version) && !r.label && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                        {r.label && (
                          <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25">
                            {r.label}
                          </span>
                        )}
                      </div>
                      {isActive && (
                        <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 ${isActive ? "text-primary/70" : "text-muted-foreground"}`}>
                      {r.date}
                    </p>
                    <ReleaseSummaryChips entries={r.entries} />
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        {/* ── Release content ── */}
        <ScrollArea className="flex-1">
          <div className="px-8 py-6">
            {/* Version heading */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold font-serif text-foreground">
                  v{release.version}
                </h2>
                {release.label && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {release.label}
                  </span>
                )}
              </div>
              <span className="text-[12px] text-muted-foreground">{release.date}</span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <span className="text-[11px] text-muted-foreground">Key:</span>
              {(["major", "minor", "fix"] as ChangeKind[]).map((k) => (
                <KindBadge key={k} kind={k} />
              ))}
            </div>

            {/* "New since your last visit" divider — only shown for releases the user hasn't seen yet */}
            {showNewBadges && (
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-primary/20" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-primary shrink-0 px-1">
                  New since your last visit
                </span>
                <div className="h-px flex-1 bg-primary/20" />
              </div>
            )}

            {/* Entries grouped by kind */}
            <div className="space-y-6">
              {(["major", "minor", "fix"] as ChangeKind[]).map((kind) => {
                const items = release.entries.filter((e) => e.kind === kind);
                if (items.length === 0) return null;
                return (
                  <div key={kind}>
                    <div className="flex items-center gap-2 mb-3">
                      <KindBadge kind={kind} />
                      <span className="text-[11px] text-muted-foreground">
                        {items.length} change{items.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <ul className="space-y-2.5 pl-1">
                      {items.map((entry, i) => (
                        <li key={i} className="group flex items-baseline gap-2.5 text-[12px] text-foreground/80 leading-relaxed">
                          <span className="mt-2 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                          {showNewBadges && <NewBadge />}
                          <span className="flex-1 min-w-0">
                            {entry.text}
                            {entry.action && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (entry.action!.tourKey === 'missionControl') {
                                    startMCTour();
                                    navigate('/mission-control');
                                  } else {
                                    startTour();
                                    if (!isHombaseAudience) {
                                      window.history.pushState({}, '', '/homebase');
                                      window.dispatchEvent(new PopStateEvent('popstate'));
                                    }
                                  }
                                }}
                                className="ml-1.5 inline-flex items-center gap-1 text-primary hover:underline font-medium"
                              >
                                <PlayCircle className="w-3 h-3 inline" />
                                {entry.action.label}
                              </button>
                            )}
                          </span>
                          {/* Flag icon: always visible on mobile, hover-only on desktop */}
                          <button
                            type="button"
                            title="Report an issue with this change"
                            onClick={() => {
                              setReportingEntry({ version: release.version, date: release.date, kind, text: entry.text });
                              setShowSubmitCase(true);
                            }}
                            className="self-start mt-1 shrink-0 p-0.5 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground/40 hover:text-amber-500 focus-visible:opacity-100 transition-all"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Footer nav */}
            <div className="flex items-center justify-between mt-10 pt-4 border-t border-border">
              {(() => {
                const idx = RELEASES.findIndex((r) => r.version === selectedVersion);
                const prev = RELEASES[idx + 1];
                const next = RELEASES[idx - 1];
                return (
                  <>
                    <div>
                      {prev && (
                        <button
                          onClick={() => setSelectedVersion(prev.version)}
                          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          ← v{prev.version}
                          <span className="text-muted-foreground/60">{prev.date}</span>
                        </button>
                      )}
                    </div>
                    <div>
                      {next && (
                        <button
                          onClick={() => setSelectedVersion(next.version)}
                          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="text-muted-foreground/60">{next.date}</span>
                          v{next.version} →
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </ScrollArea>
      </div>

      <SubmitCaseDrawer
        open={showSubmitCase}
        onClose={() => { setShowSubmitCase(false); setReportingEntry(null); }}
        initialType="General"
        initialSubject={reportingEntry ? makeReportSubject(reportingEntry.version, reportingEntry.text) : undefined}
        initialDescription={reportingEntry ? makeReportDescription(reportingEntry.version, reportingEntry.date, reportingEntry.kind, reportingEntry.text) : undefined}
      />
    </div>
  );
}
