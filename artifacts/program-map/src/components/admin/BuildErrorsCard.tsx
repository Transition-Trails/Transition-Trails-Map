/**
 * BuildErrorsCard
 *
 * Displays the last 10 auto-created build-error cases logged by the API
 * server's global error handler.  Appears on the Admin → Phase 1 Readiness
 * page and the Mission Control page.
 *
 * Data source: GET /api/build-errors  (requireAdmin)
 */

import { useEffect, useState }       from 'react';
import { AlertTriangle, ExternalLink, CheckCircle2, Clock } from 'lucide-react';
import { EmptyState }                from '@/components/workspace/EmptyState';
import { STATUS_CLASSES }            from '@/config/statusColors';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BuildErrorLog {
  id:             number;
  fingerprint:    string;
  errorName:      string;
  errorMessage:   string;
  stackTrace:     string | null;
  sfCaseId:       string | null;
  sfCaseNumber:   string | null;
  /** Salesforce org base URL stored at case-creation time (e.g. "https://myorg.my.salesforce.com"). */
  sfOrgBaseUrl:   string | null;
  resolutionPlan: string | null;
  resolvedAt:     string | null;
  createdAt:      string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days  = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Build a Salesforce Lightning deep-link for a case.
 *
 * Uses the org base URL captured at case-creation time (stored in the DB row).
 * Falls back to null when the org URL is unknown so the UI can show the case
 * number as plain text instead of a broken link.
 */
function sfLightningUrl(sfCaseId: string, sfOrgBaseUrl: string | null): string | null {
  if (!sfOrgBaseUrl) return null;
  return `${sfOrgBaseUrl}/lightning/r/Case/${sfCaseId}/view`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusDot({ resolved }: { resolved: boolean }) {
  return resolved
    ? <span className={`w-2 h-2 rounded-full inline-block ${STATUS_CLASSES.success.dot}`} title="Resolved" />
    : <span className={`w-2 h-2 rounded-full inline-block ${STATUS_CLASSES.critical.dot}`} title="Open" />;
}

function ResolutionPreview({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-muted-foreground italic text-[11px]">No plan generated</span>;
  const firstLine = plan.split('\n')[0] ?? plan;
  return (
    <span className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
      {firstLine}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface BuildErrorsCardProps {
  /** Inject pre-fetched data for tests / Storybook. When provided, fetch is skipped. */
  initialData?: BuildErrorLog[];
}

export function BuildErrorsCard({ initialData }: BuildErrorsCardProps = {}) {
  const [rows,    setRows]    = useState<BuildErrorLog[]>(initialData ?? []);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (initialData) return; // skip fetch when data injected

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/build-errors', { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ buildErrors: BuildErrorLog[] }>;
      })
      .then(data => { if (!cancelled) { setRows(data.buildErrors ?? []); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError((err as Error).message); setLoading(false); } });

    return () => { cancelled = true; };
  }, [initialData]);

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/10">
        <AlertTriangle className={`w-4 h-4 ${STATUS_CLASSES.critical.icon}`} />
        <p className="text-[13px] font-semibold text-foreground flex-1">Build Errors</p>
        <span className="text-[11px] text-muted-foreground">Auto-filed SF cases</span>
      </div>

      {/* Body */}
      {loading && (
        <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
          Loading build errors…
        </div>
      )}

      {!loading && error && (
        <div className={`px-4 py-3 text-[12px] ${STATUS_CLASSES.critical.text}`}>
          Failed to load: {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title="No build errors logged"
          body="System is clean — no build-required errors detected."
          compact
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="divide-y divide-border/40">
          {rows.map(row => (
            <div key={row.id} className="px-4 py-2.5 hover:bg-muted/10 transition-colors">
              <div className="flex items-start gap-2">
                {/* Status dot */}
                <div className="mt-1 shrink-0">
                  <StatusDot resolved={!!row.resolvedAt} />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[12px] font-semibold ${STATUS_CLASSES.critical.text} truncate max-w-[200px]`}>
                      {row.errorName}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate flex-1 min-w-0">
                      {row.errorMessage.slice(0, 80)}
                    </span>
                  </div>
                  <ResolutionPreview plan={row.resolutionPlan} />
                </div>

                {/* Right side: timestamp + SF case link */}
                <div className="shrink-0 text-right space-y-0.5 ml-2">
                  <div className="flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {timeAgo(row.createdAt)}
                    </span>
                  </div>
                  {row.sfCaseNumber && row.sfCaseId ? (() => {
                    const url = sfLightningUrl(row.sfCaseId, row.sfOrgBaseUrl);
                    return url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${STATUS_CLASSES.information.text} hover:underline`}
                      >
                        #{row.sfCaseNumber}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className={`text-[11px] font-medium ${STATUS_CLASSES.information.text}`}>
                        #{row.sfCaseNumber}
                      </span>
                    );
                  })() : row.sfCaseId ? (
                    <span className={`text-[11px] ${STATUS_CLASSES.attention.text}`}>Case created</span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Pending</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
