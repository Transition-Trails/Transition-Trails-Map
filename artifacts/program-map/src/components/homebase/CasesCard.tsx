/**
 * CasesCard
 *
 * Homebase dashboard card showing the current user's open Salesforce cases
 * (up to 5). Each row opens a CaseHoverCard for inline status/date/comment
 * edits. Closing a case optimistically removes it from the list.
 *
 * The card header is a collapse toggle — state persists in localStorage.
 *
 * States: loading | sf-unavailable | empty | list
 */

import { useState, useEffect, useCallback } from "react";
import {
  Briefcase, Loader2, RefreshCw,
  ChevronDown, ChevronRight, Clock,
} from "lucide-react";
import { useLocation }     from "wouter";
import { useCollapsible }  from "@/hooks/useCollapsible";
import { openSfAuthPopup } from "@/utils/openSfAuthPopup";
import { CaseHoverCard }  from "./CaseHoverCard";
import type { SfCase }    from "./CaseHoverCard";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function activityLabel(dateStr: string | null): string {
  if (!dateStr) return "—";
  const ms   = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(ms / 60_000);
  const hr   = Math.floor(ms / 3_600_000);
  const days = Math.floor(ms / 86_400_000);
  if (min  < 2)   return "Just now";
  if (min  < 60)  return `${min}m ago`;
  if (hr   < 24)  return `${hr}h ago`;
  if (days < 30)  return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}yr ago`;
}

// ── Badge styles ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  New:       "bg-slate-100 text-slate-600",
  Working:   "bg-sky-50 text-sky-700",
  Escalated: "bg-rose-50 text-rose-700",
  Closed:    "bg-emerald-50 text-emerald-700",
};

const PRIORITY_BADGE: Record<string, string> = {
  High:   "bg-rose-50 text-rose-700 border border-rose-200",
  Medium: "bg-amber-50 text-amber-700 border border-amber-200",
  Low:    "bg-sky-50 text-sky-700 border border-sky-200",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function CasesCard() {
  const [, nav] = useLocation();
  const [isOpen, toggle] = useCollapsible("cases-card", true);

  const [cases,                 setCases]                 = useState<SfCase[]>([]);
  const [orgBaseUrl,            setOrgBaseUrl]            = useState("");
  const [followUpDateSupported, setFollowUpDateSupported] = useState(false);
  const [loading,               setLoading]               = useState(true);
  const [sfUnavailable,         setSfUnavailable]         = useState(false);
  const [timeSummary,           setTimeSummary]           = useState<Record<string, number>>({});
  const [caseStatuses,          setCaseStatuses]          = useState<Array<{ value: string; closed: boolean }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setSfUnavailable(false);
    // Reset on every load so a stale true from a prior call never persists
    // when the reconnect response omits the field.
    setFollowUpDateSupported(false);
    try {
      const [res, statusesRes] = await Promise.all([
        fetch("/api/sf/cases?status=open"),
        fetch("/api/sf/cases/statuses"),
      ]);
      if (res.status === 401) { setSfUnavailable(true); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as {
        cases: SfCase[];
        orgBaseUrl?: string;
        followUpDateSupported?: boolean;
      };
      // Cap at 5 for the dashboard widget; full list lives on /cases.
      const loaded = (data.cases ?? []).slice(0, 5);
      setCases(loaded);
      if (data.orgBaseUrl) setOrgBaseUrl(data.orgBaseUrl);
      if (typeof data.followUpDateSupported === "boolean") {
        setFollowUpDateSupported(data.followUpDateSupported);
      }
      if (statusesRes.ok) {
        const sd = await statusesRes.json() as { statuses?: Array<{ value: string; closed: boolean }> };
        if (sd.statuses && sd.statuses.length > 0) setCaseStatuses(sd.statuses);
      }
      // Batch-fetch time totals for all visible cases
      if (loaded.length > 0) {
        const ids = loaded.map(c => c.Id).join(",");
        fetch(`/api/time-logs/summary?objectIds=${ids}`)
          .then(r => r.ok ? r.json() : null)
          .then((d: { summary?: Record<string, number> } | null) => {
            if (d?.summary) setTimeSummary(d.summary);
          })
          .catch(() => { /* non-critical — badge just won't show */ });
      }
    } catch {
      setSfUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Optimistic handlers ────────────────────────────────────────────────────

  function handleStatusChange(id: string, status: string) {
    // Use the `closed` flag from the real SF picklist; fall back to name-match.
    const isClosed = caseStatuses.find(s => s.value === status)?.closed
      ?? status.toLowerCase() === "closed";
    if (isClosed) {
      setCases(prev => prev.filter(c => c.Id !== id));
    } else {
      setCases(prev => prev.map(c => c.Id === id ? { ...c, Status: status } : c));
    }
  }

  function handleCaseUpdate(id: string, updates: { FollowUpDate?: string | null }) {
    setCases(prev => prev.map(c => c.Id === id ? { ...c, ...updates } : c));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const Chevron = isOpen ? ChevronDown : ChevronRight;

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">

      {/* Header — doubles as collapse toggle */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
        <button
          onClick={toggle}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          aria-expanded={isOpen}
        >
          <Chevron    className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Briefcase  className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground">Open Cases</span>
          {!loading && !sfUnavailable && cases.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold px-1.5">
              {cases.length}
            </span>
          )}
        </button>

        <button
          onClick={() => nav("/cases")}
          className="px-2 py-1 rounded-md text-[12px] text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
        >
          View all →
        </button>
      </div>

      {/* Collapsible body */}
      <div
        className={`grid transition-all duration-200 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="px-5">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>

            ) : sfUnavailable ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Connect to Salesforce to see your cases.
                </p>
                <button
                  onClick={openSfAuthPopup}
                  className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reconnect Salesforce
                </button>
              </div>

            ) : cases.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Briefcase className="w-7 h-7 text-muted-foreground/25 mx-auto" />
                <p className="text-sm text-muted-foreground">No open cases.</p>
              </div>

            ) : (
              <ul>
                {cases.map(c => {
                  const statusCls = STATUS_BADGE[c.Status  ?? ""] ?? "bg-muted text-muted-foreground";
                  const priCls    = PRIORITY_BADGE[c.Priority ?? ""] ?? "";
                  return (
                    <li
                      key={c.Id}
                      className="py-3 border-b border-border/50 last:border-0"
                    >
                      <CaseHoverCard
                        case_={c}
                        orgBaseUrl={orgBaseUrl}
                        followUpDateSupported={followUpDateSupported}
                        caseStatuses={caseStatuses}
                        onStatusChange={handleStatusChange}
                        onCaseUpdate={handleCaseUpdate}
                      >
                        <div className="flex items-start gap-3 cursor-pointer select-none min-w-0">
                          {/* Subject + case number */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {c.CaseNumber && (
                                <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                                  #{c.CaseNumber}
                                </span>
                              )}
                              <p className="text-sm font-medium text-foreground leading-snug truncate">
                                {c.Subject ?? "Untitled case"}
                              </p>
                            </div>
                            {(c.ContactName ?? c.AccountName) && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                {c.ContactName ?? c.AccountName}
                              </p>
                            )}
                            {c.LastModifiedDate && (
                              <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">
                                Modified {activityLabel(c.LastModifiedDate)}
                                {c.LastModifiedByName ? ` · ${c.LastModifiedByName}` : ""}
                              </p>
                            )}
                          </div>

                          {/* Badges */}
                          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                            {timeSummary[c.Id] > 0 && (
                              <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                timeSummary[c.Id] >= 60
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                <Clock className="w-2.5 h-2.5" />
                                {formatMinutes(timeSummary[c.Id])}
                              </span>
                            )}
                            {c.Priority && priCls && (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${priCls}`}>
                                {c.Priority}
                              </span>
                            )}
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusCls}`}>
                              {c.Status ?? "—"}
                            </span>
                          </div>
                        </div>
                      </CaseHoverCard>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
