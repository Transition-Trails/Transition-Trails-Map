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
  ChevronDown, ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";
import { useCollapsible } from "@/hooks/useCollapsible";
import { CaseHoverCard }  from "./CaseHoverCard";
import type { SfCase }    from "./CaseHoverCard";

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
  const [followUpDateSupported, setFollowUpDateSupported] = useState(true);
  const [loading,               setLoading]               = useState(true);
  const [sfUnavailable,         setSfUnavailable]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSfUnavailable(false);
    try {
      const res  = await fetch("/api/sf/cases?status=open");
      if (res.status === 401) { setSfUnavailable(true); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as {
        cases: SfCase[];
        orgBaseUrl?: string;
        followUpDateSupported?: boolean;
      };
      // Cap at 5 for the dashboard widget; full list lives on /cases.
      setCases((data.cases ?? []).slice(0, 5));
      if (data.orgBaseUrl) setOrgBaseUrl(data.orgBaseUrl);
      if (typeof data.followUpDateSupported === "boolean") {
        setFollowUpDateSupported(data.followUpDateSupported);
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
    // Closing a case removes it from the open list immediately.
    if (status === "Closed") {
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
                <a
                  href="/api/auth/salesforce/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reconnect Salesforce
                </a>
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
                          </div>

                          {/* Badges */}
                          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
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
