/**
 * CasesPage
 *
 * Full case list rendered as a sortable, filterable table.
 * Columns: Case # · Subject · Status · Assigned To · Priority · Age
 * Secondary filters: Status chip-set · Priority chip-set
 * Primary tabs: Open | All | Closed
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2, RefreshCw, Briefcase, Clock,
  ChevronsUpDown, ChevronUp, ChevronDown, Plus,
  AlertCircle, CheckCircle2, RotateCw,
} from "lucide-react";
import { useToast }        from "@/hooks/use-toast";
import { openSfAuthPopup } from "@/utils/openSfAuthPopup";
import { useAppContext }   from "@/context/AppContext";
import { CaseHoverCard }   from "@/components/homebase/CaseHoverCard";
import type { SfCase }     from "@/components/homebase/CaseHoverCard";
import { SubmitCaseDrawer } from "@/components/homebase/SubmitCaseDrawer";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SubmittedCase {
  id:             number;
  subject:        string;
  description:    string | null;
  priority:       string | null;
  status:         string | null;
  recordTypeName: string | null;
  ownerName:      string | null;
  contactName:    string | null;
  accountName:    string | null;
  sfCaseId:       string | null;
  sfCaseNumber:   string | null;
  syncStatus:     string;  // "pending" | "synced" | "failed"
  syncError:      string | null;
  createdAt:      string;
}

type FilterTab      = "open" | "all" | "closed";
type SortField      = "CaseNumber" | "Subject" | "Status" | "OwnerName" | "Priority" | "CreatedDate" | "LastModifiedDate";
type SortDir        = "asc" | "desc";
type StatusFilter   = "All" | "New" | "Working" | "Escalated" | "Closed";
type PriorityFilter = "All" | "High" | "Medium" | "Low";

// ── Constants ──────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
const STATUS_ORDER:   Record<string, number>  = {
  New: 0, Working: 1, Escalated: 2, Closed: 3,
};

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

const STATUS_CHIPS: Record<StatusFilter, string> = {
  All:       "bg-primary text-primary-foreground",
  New:       "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
  Working:   "bg-sky-100 text-sky-700 ring-1 ring-sky-300",
  Escalated: "bg-rose-100 text-rose-700 ring-1 ring-rose-300",
  Closed:    "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300",
};

const PRIORITY_CHIPS: Record<PriorityFilter, string> = {
  All:    "bg-primary text-primary-foreground",
  High:   "bg-rose-100 text-rose-700 ring-1 ring-rose-300",
  Medium: "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
  Low:    "bg-sky-100 text-sky-700 ring-1 ring-sky-300",
};

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
function ageLabel(dateStr: string | null): string {
  if (!dateStr) return "—";
  const ms   = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 30)  return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}yr ago`;
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

// ── Sort icon ──────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />;
  return dir === "asc"
    ? <ChevronUp   className="w-3.5 h-3.5 text-primary" />
    : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
}

// ── CasesPage ──────────────────────────────────────────────────────────────────

export default function CasesPage() {
  const { toast } = useToast();
  const { openLogTime } = useAppContext();

  // Remote state
  const [cases,              setCases]              = useState<SfCase[]>([]);
  const [orgBaseUrl,         setOrgBaseUrl]         = useState("");
  const [followUpDateSupported, setFollowUpDateSupported] = useState(false);
  const [loading,            setLoading]            = useState(true);
  const [sfUnavailable,      setSfUnavailable]      = useState(false);
  const [timeSummary,        setTimeSummary]        = useState<Record<string, number>>({});

  // Submitted cases (local-first: pending / failed / synced)
  const [submittedCases,     setSubmittedCases]     = useState<SubmittedCase[]>([]);
  const [submittedLoading,   setSubmittedLoading]   = useState(true);
  const [retryingIds,        setRetryingIds]        = useState<Set<number>>(new Set());
  const [submittedExpanded,  setSubmittedExpanded]  = useState(true);

  // UI state
  const [filter,         setFilter]         = useState<FilterTab>("open");
  const [showSubmit,     setShowSubmit]     = useState(false);
  const [sortField,      setSortField]      = useState<SortField>("CreatedDate");
  const [sortDir,        setSortDir]        = useState<SortDir>("desc");
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>("All");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All");

  // ── Data loading ─────────────────────────────────────────────────────────────

  const load = useCallback(async (tab: FilterTab) => {
    setLoading(true);
    setSfUnavailable(false);
    try {
      const res  = await fetch(`/api/sf/cases?status=${tab}`);
      if (res.status === 401) { setSfUnavailable(true); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as {
        cases: SfCase[];
        orgBaseUrl?: string;
        followUpDateSupported?: boolean;
      };
      const loaded = data.cases ?? [];
      setCases(loaded);
      if (data.orgBaseUrl) setOrgBaseUrl(data.orgBaseUrl);
      if (typeof data.followUpDateSupported === "boolean") {
        setFollowUpDateSupported(data.followUpDateSupported);
      }
      // Batch-fetch time totals for all loaded cases
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

  useEffect(() => { void load(filter); }, [filter, load]);

  // ── Submitted cases (local-first) ─────────────────────────────────────────

  const loadSubmitted = useCallback(async () => {
    setSubmittedLoading(true);
    try {
      const res = await fetch("/api/cases/submitted");
      if (!res.ok) return;
      const data = await res.json() as { cases: SubmittedCase[] };
      setSubmittedCases(data.cases ?? []);
    } finally {
      setSubmittedLoading(false);
    }
  }, []);

  useEffect(() => { void loadSubmitted(); }, [loadSubmitted]);

  const handleRetry = useCallback(async (localId: number) => {
    setRetryingIds(prev => new Set(prev).add(localId));
    try {
      const res  = await fetch(`/api/cases/${localId}/retry`, { method: "POST" });
      const data = await res.json() as {
        synced?: boolean; sfCaseNumber?: string; sfCaseId?: string;
        case?: SubmittedCase; error?: string;
      };
      if (data.synced) {
        toast({ title: "Sync successful", description: data.sfCaseNumber ? `Case #${data.sfCaseNumber} created in Salesforce` : "Case synced to Salesforce" });
        setSubmittedCases(prev => prev.map(c =>
          c.id === localId
            ? { ...c, syncStatus: "synced", sfCaseId: data.sfCaseId ?? c.sfCaseId, sfCaseNumber: data.sfCaseNumber ?? c.sfCaseNumber, syncError: null }
            : c
        ));
      } else if (res.status === 401) {
        toast({ title: "Connect Salesforce first", description: data.error ?? "Sign in to Salesforce then retry.", variant: "destructive" });
        openSfAuthPopup();
      } else {
        toast({ title: "Sync failed", description: data.error ?? "Salesforce returned an error. Try again later.", variant: "destructive" });
        setSubmittedCases(prev => prev.map(c =>
          c.id === localId ? { ...c, syncStatus: "failed", syncError: data.error ?? c.syncError } : c
        ));
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server. Try again.", variant: "destructive" });
    } finally {
      setRetryingIds(prev => { const s = new Set(prev); s.delete(localId); return s; });
    }
  }, [toast]);

  // Pending/failed cases that need attention
  const actionableSubmitted = useMemo(
    () => submittedCases.filter(c => c.syncStatus === "pending" || c.syncStatus === "failed"),
    [submittedCases]
  );

  // ── Derived list ─────────────────────────────────────────────────────────────

  const visibleCases = useMemo(() => {
    let list = [...cases];

    if (statusFilter   !== "All") list = list.filter(c => c.Status   === statusFilter);
    if (priorityFilter !== "All") list = list.filter(c => c.Priority === priorityFilter);

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "CreatedDate":
          cmp = (a.CreatedDate ?? "").localeCompare(b.CreatedDate ?? "");
          break;
        case "Priority":
          cmp = (PRIORITY_ORDER[a.Priority ?? ""] ?? 99)
              - (PRIORITY_ORDER[b.Priority ?? ""] ?? 99);
          break;
        case "Status":
          cmp = (STATUS_ORDER[a.Status ?? ""] ?? 0)
              - (STATUS_ORDER[b.Status ?? ""] ?? 0);
          break;
        case "LastModifiedDate":
          cmp = (a.LastModifiedDate ?? "")
              .localeCompare(b.LastModifiedDate ?? "");
          break;
        case "CaseNumber":
          cmp = (a.CaseNumber ?? "").localeCompare(b.CaseNumber ?? "");
          break;
        case "OwnerName":
          cmp = (a.OwnerName ?? "").localeCompare(b.OwnerName ?? "");
          break;
        default:
          cmp = (a.Subject ?? "").localeCompare(b.Subject ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [cases, statusFilter, priorityFilter, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir(field === "CreatedDate" ? "desc" : "asc"); }
  }

  // ── Optimistic handlers ───────────────────────────────────────────────────────

  function handleStatusChange(id: string, status: string) {
    setCases(prev => {
      // When viewing a filtered tab (Open / Closed), a case whose new status
      // no longer matches the tab should be removed immediately so the list
      // doesn't show stale data until the next refresh.
      const shouldRemove =
        (filter === "open"   && status === "Closed") ||
        (filter === "closed" && status !== "Closed");
      if (shouldRemove) return prev.filter(c => c.Id !== id);
      return prev.map(c => c.Id === id ? { ...c, Status: status } : c);
    });
  }

  function handleCaseUpdate(id: string, updates: { FollowUpDate?: string | null }) {
    setCases(prev => prev.map(c => c.Id === id ? { ...c, ...updates } : c));
  }

  // ── Column header ─────────────────────────────────────────────────────────────

  function ColHeader({ field, label, className = "" }: { field: SortField; label: string; className?: string }) {
    const active = sortField === field;
    return (
      <th
        onClick={() => toggleSort(field)}
        className={`px-3 py-2.5 text-left cursor-pointer select-none group ${className}`}
      >
        <div className="flex items-center gap-1">
          <span className={`text-[11px] font-semibold uppercase tracking-wide transition-colors ${
            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          }`}>
            {label}
          </span>
          <SortIcon active={active} dir={sortDir} />
        </div>
      </th>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const TABS: { id: FilterTab; label: string }[] = [
    { id: "open",   label: "Open"   },
    { id: "all",    label: "All"    },
    { id: "closed", label: "Closed" },
  ];

  const STATUS_CHIP_VALUES:   StatusFilter[]   = ["All", "New", "Working", "Escalated", "Closed"];
  const PRIORITY_CHIP_VALUES: PriorityFilter[] = ["All", "High", "Medium", "Low"];

  const filtersActive = statusFilter !== "All" || priorityFilter !== "All";

  return (
    <div className="px-4 py-8 space-y-4">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
            Cases
          </p>
          <h1 className="text-xl font-semibold text-foreground">
            My Cases
            {!loading && !sfUnavailable && cases.length > 0 && filtersActive && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {visibleCases.length} of {cases.length}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load(filter)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowSubmit(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Submit a Case
          </button>
        </div>
      </div>

      {/* ── My Submitted Cases (pending / failed) ──────────────────────────── */}
      {(submittedLoading || submittedCases.length > 0) && (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          {/* Section header */}
          <button
            type="button"
            onClick={() => setSubmittedExpanded(e => !e)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                My Submitted Cases
              </span>
              {actionableSubmitted.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5 gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {actionableSubmitted.length} need{actionableSubmitted.length === 1 ? "s" : ""} attention
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${submittedExpanded ? "rotate-180" : ""}`} />
          </button>

          {submittedExpanded && (
            <>
              {submittedLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : submittedCases.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-[12px] text-muted-foreground">No cases submitted yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50 border-t border-border/50">
                  {submittedCases.map(c => {
                    const isFailed        = c.syncStatus === "failed";
                    const isPending       = c.syncStatus === "pending";
                    const isSynced        = c.syncStatus === "synced";
                    const isRetryingStatus = c.syncStatus === "retrying";
                    const isRetrying      = retryingIds.has(c.id);

                    return (
                      <div key={c.id} className={`flex items-start gap-3 px-4 py-3 ${isFailed ? "bg-rose-50/40" : isPending ? "bg-amber-50/40" : ""}`}>
                        {/* Status icon */}
                        <div className="mt-0.5 shrink-0">
                          {isSynced    && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {isFailed    && <AlertCircle  className="w-4 h-4 text-rose-500" />}
                          {(isPending || isRetryingStatus) && <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <p className="text-[13px] font-medium text-foreground truncate">
                              {c.subject}
                            </p>
                            {c.sfCaseNumber && (
                              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                                #{c.sfCaseNumber}
                              </span>
                            )}
                            {c.priority && (
                              <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 shrink-0 ${
                                c.priority === "High"   ? "bg-rose-50 text-rose-700"
                                : c.priority === "Medium" ? "bg-amber-50 text-amber-700"
                                : "bg-sky-50 text-sky-700"
                              }`}>
                                {c.priority}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-[11px] font-medium ${
                              isSynced        ? "text-emerald-600"
                              : isFailed        ? "text-rose-600"
                              : isRetryingStatus ? "text-sky-600"
                              : "text-amber-600"
                            }`}>
                              {isSynced        ? "Synced to Salesforce"
                               : isFailed        ? "Sync failed"
                               : isRetryingStatus ? "Retrying…"
                               : "Pending sync"}
                            </span>
                            {isFailed && c.syncError && (
                              <span className="text-[11px] text-muted-foreground truncate max-w-[260px]" title={c.syncError}>
                                — {c.syncError.slice(0, 80)}{c.syncError.length > 80 ? "…" : ""}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground/60">
                              {ageLabel(c.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Retry button — only for failed/pending; hidden while a retry is in-flight */}
                        {(isFailed || isPending) && !isRetryingStatus && (
                          <button
                            type="button"
                            disabled={isRetrying}
                            onClick={() => void handleRetry(c.id)}
                            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50"
                          >
                            {isRetrying
                              ? <><Loader2 className="w-3 h-3 animate-spin" /> Retrying…</>
                              : <><RotateCw className="w-3 h-3" /> Retry sync</>
                            }
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      {!loading && !sfUnavailable && cases.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          {/* Status chips */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground font-medium mr-0.5">Status:</span>
            {STATUS_CHIP_VALUES.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  statusFilter === s ? STATUS_CHIPS[s] : "bg-muted text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Priority chips */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground font-medium mr-0.5">Priority:</span>
            {PRIORITY_CHIP_VALUES.map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  priorityFilter === p ? PRIORITY_CHIPS[p] : "bg-muted text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Clear */}
          {filtersActive && (
            <button
              onClick={() => { setStatusFilter("All"); setPriorityFilter("All"); }}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>

        ) : sfUnavailable ? (
          <div className="px-6 py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Salesforce account to view cases.
            </p>
            <button
              onClick={openSfAuthPopup}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reconnect Salesforce
            </button>
          </div>

        ) : cases.length === 0 ? (
          <div className="px-6 py-10 text-center space-y-2">
            <Briefcase className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {filter === "open"   ? "No open cases assigned to you."
               : filter === "closed" ? "No closed cases found."
               : "No cases found."}
            </p>
          </div>

        ) : visibleCases.length === 0 ? (
          <div className="px-6 py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">No cases match the current filters.</p>
            <button
              onClick={() => { setStatusFilter("All"); setPriorityFilter("All"); }}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Clear filters
            </button>
          </div>

        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <ColHeader field="CaseNumber"      label="Case #"        className="w-28 pl-4" />
                <ColHeader field="Subject"         label="Subject"       className="min-w-0" />
                <ColHeader field="Status"          label="Status"        className="w-32" />
                <ColHeader field="OwnerName"       label="Assigned To"   className="w-36" />
                <ColHeader field="Priority"        label="Priority"      className="w-24" />
                <ColHeader field="LastModifiedDate" label="Last Modified" className="w-40" />
                <ColHeader field="CreatedDate"     label="Age"           className="w-24" />
                <th className="w-12 pr-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {visibleCases.map(c => {
                const statusCls = STATUS_BADGE[c.Status ?? ""]   ?? "bg-slate-100 text-slate-600";
                const priCls    = PRIORITY_BADGE[c.Priority ?? ""] ?? "bg-muted text-muted-foreground border border-border";

                return (
                  <tr
                    key={c.Id}
                    className="group/row border-b border-border/50 last:border-0 transition-colors hover:bg-muted/10"
                  >
                    {/* Case # */}
                    <td className="pl-4 px-3 py-3.5 w-28 align-top">
                      <span className="text-[12px] font-mono text-muted-foreground font-medium">
                        #{c.CaseNumber ?? "—"}
                      </span>
                    </td>

                    {/* Subject — click opens hover card */}
                    <td className="px-3 py-3.5 align-top">
                      <CaseHoverCard
                        case_={c}
                        orgBaseUrl={orgBaseUrl}
                        followUpDateSupported={followUpDateSupported}
                        onStatusChange={handleStatusChange}
                        onCaseUpdate={handleCaseUpdate}
                      >
                        <div className="cursor-pointer select-none min-w-0">
                          <p className="text-sm font-medium text-foreground leading-snug">
                            {c.Subject ?? "Untitled case"}
                          </p>
                          {(c.ContactName ?? c.AccountName) && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {c.ContactName ?? c.AccountName}
                            </p>
                          )}
                        </div>
                      </CaseHoverCard>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5 w-32 align-top">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold ${statusCls}`}>
                        {c.Status ?? "—"}
                      </span>
                    </td>

                    {/* Assigned To */}
                    <td className="px-3 py-3.5 w-36 align-top text-[12px] text-muted-foreground">
                      {c.OwnerName ?? "—"}
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-3.5 w-24 align-top">
                      {c.Priority ? (
                        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${priCls}`}>
                          {c.Priority}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-[12px]">—</span>
                      )}
                    </td>

                    {/* Last Activity + time badge */}
                    <td className="px-3 py-3.5 w-40 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                          {activityLabel(c.LastModifiedDate)}
                        </span>
                        {timeSummary[c.Id] > 0 && (
                          <span className={`inline-flex items-center gap-0.5 self-start rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            timeSummary[c.Id] >= 60
                              ? "bg-slate-100 text-slate-600"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            <Clock className="w-2.5 h-2.5" />
                            {formatMinutes(timeSummary[c.Id])}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Age */}
                    <td className="px-3 py-3.5 w-24 align-top text-[12px] text-muted-foreground whitespace-nowrap">
                      {ageLabel(c.CreatedDate)}
                    </td>

                    {/* Log Time */}
                    <td className="pr-4 py-3.5 w-12 align-top text-right">
                      <button
                        onClick={() => openLogTime({ sfObjectType: "case", sfObjectId: c.Id, sfObjectName: c.Subject ?? `Case #${c.CaseNumber ?? c.Id}` })}
                        title="Log time against this case"
                        className="opacity-0 group-hover/row:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <SubmitCaseDrawer
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        onSubmitted={() => { void load(filter); void loadSubmitted(); }}
      />
    </div>
  );
}
