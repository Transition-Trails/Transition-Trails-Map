/**
 * AdoptionDashboard.tsx
 *
 * /admin/adoption — User Activity & Adoption Tracking Dashboard
 *
 * Three tabs:
 *   Sessions     — per-user session data for a selected date
 *                  (calls GET /api/admin/activity-summary)
 *   Failures     — backend error events aggregated server-side
 *                  (calls GET /api/admin/failure-summary)
 *   Feature Usage — feature_use events aggregated server-side
 *                  (calls GET /api/admin/feature-usage-summary)
 *
 * All three tabs use server-side aggregation so no row limit silently
 * truncates reported counts.
 */

import { useState, useEffect, useMemo } from 'react';
import { BarChart2, AlertTriangle, Activity, Users, RefreshCw, X } from 'lucide-react';

// ── Shared types ──────────────────────────────────────────────────────────────

type Tab = 'sessions' | 'failures' | 'feature_usage';

interface SessionEntry {
  email:           string;
  audience:        string | null;
  firstSeen:       string;
  lastSeen:        string;
  durationMinutes: number;
  eventCount:      number;
  topFeatures:     string[];
}

// Matches the server-side aggregation returned by /api/admin/failure-summary
interface ServerFailureGroup {
  route:         string;
  status:        number;
  message:       string;
  count:         number;
  affectedUsers: number;
  firstAt:       string | null;
  lastAt:        string | null;
}

interface FailureSummaryStats {
  totalErrors:   number;
  topRoute:      string;
  affectedUsers: number;
}

// Matches /api/admin/feature-usage-summary
interface FeatureStat {
  feature:    string;
  totalUses:  number;
  uniqueUsers: number;
  firstUsed:  string | null;
  lastUsed:   string | null;
}

interface UserStat {
  email:        string;
  totalUses:    number;
  featureCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m}m` : `${h}h ${m.toString().padStart(2, '0')}m`;
}

function shortTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function shortDateTime(iso: string): string {
  try { return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function shortDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso.slice(0, 10); }
}

function audienceLabel(a: string | null): string {
  if (!a) return 'Staff';
  return a.charAt(0).toUpperCase() + a.slice(1);
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchSessions(date: string): Promise<SessionEntry[]> {
  const res = await fetch(`/api/admin/activity-summary?date=${encodeURIComponent(date)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { summary: SessionEntry[] };
  return data.summary ?? [];
}

async function fetchFailureSummary(
  dateFrom:    string,
  dateTo:      string,
  actorEmail?: string,
  routePrefix?: string,
): Promise<{ failures: ServerFailureGroup[]; stats: FailureSummaryStats }> {
  const p = new URLSearchParams({ dateFrom, dateTo });
  if (actorEmail) p.set('actorEmail', actorEmail);
  if (routePrefix) p.set('routePrefix', routePrefix);
  const res = await fetch(`/api/admin/failure-summary?${p}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ failures: ServerFailureGroup[]; stats: FailureSummaryStats }>;
}

async function fetchFeatureUsageSummary(
  dateFrom: string,
  dateTo:   string,
): Promise<{ features: FeatureStat[]; userBreakdown: UserStat[] }> {
  const p = new URLSearchParams({ dateFrom, dateTo });
  const res = await fetch(`/api/admin/feature-usage-summary?${p}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ features: FeatureStat[]; userBreakdown: UserStat[] }>;
}

// ── Re-usable date range toolbar ──────────────────────────────────────────────

function DateRangeToolbar({
  dateFrom, dateTo, onChangeDateFrom, onChangeDateTo,
  extraFilters, onApply, loading,
}: {
  dateFrom: string; dateTo: string;
  onChangeDateFrom: (v: string) => void;
  onChangeDateTo:   (v: string) => void;
  extraFilters?: React.ReactNode;
  onApply: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex-shrink-0 border-b border-border bg-card px-5 py-2">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-bold text-muted-foreground/60">From</span>
          <input type="date" value={dateFrom} max={dateTo}
            onChange={e => onChangeDateFrom(e.target.value)}
            className="text-[13px] rounded border border-border bg-background text-foreground px-2 py-1 outline-none focus:border-ring" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-bold text-muted-foreground/60">To</span>
          <input type="date" value={dateTo} min={dateFrom} max={todayIso()}
            onChange={e => onChangeDateTo(e.target.value)}
            className="text-[13px] rounded border border-border bg-background text-foreground px-2 py-1 outline-none focus:border-ring" />
        </div>
        {extraFilters}
        <button onClick={onApply} disabled={loading}
          className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Apply
        </button>
      </div>
    </div>
  );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────

function SessionsTab() {
  const [date,     setDate]     = useState(todayIso);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState('');

  function load() {
    setLoading(true);
    setError(null);
    fetchSessions(date)
      .then(setSessions)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(s => s.email.toLowerCase().includes(q));
  }, [sessions, search]);

  const summary = useMemo(() => {
    const totalUsers   = sessions.length;
    const avgDuration  = sessions.length > 0
      ? Math.round(sessions.reduce((s, r) => s + r.durationMinutes, 0) / sessions.length) : 0;
    const featureCount = new Map<string, number>();
    for (const s of sessions) for (const f of s.topFeatures)
      featureCount.set(f, (featureCount.get(f) ?? 0) + 1);
    const topFeature = [...featureCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    return { totalUsers, avgDuration, topFeature };
  }, [sessions]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex-shrink-0 border-b border-border bg-card px-5 py-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-muted-foreground/60">Date</span>
            <input type="date" value={date} max={todayIso()} onChange={e => setDate(e.target.value)}
              className="text-[13px] rounded border border-border bg-background text-foreground px-2 py-1 outline-none focus:border-ring" />
          </div>
          <div className="relative">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Filter by email…"
              className="pl-3 pr-2 py-1 text-[13px] rounded-md border border-border bg-background text-foreground placeholder-muted-foreground/50 outline-none focus:border-ring w-44" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-muted-foreground/50" />
              </button>
            )}
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex-shrink-0 border-b border-border bg-card px-5 py-2">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground">{summary.totalUsers}</span>
            <span className="text-[11px] text-muted-foreground">active users</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground">{formatDuration(summary.avgDuration)}</span>
            <span className="text-[11px] text-muted-foreground">avg session</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[14px] font-semibold text-foreground font-mono">{summary.topFeature}</span>
            <span className="text-[11px] text-muted-foreground">top feature</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading && <div className="flex items-center justify-center h-32 text-[13px] text-muted-foreground">Loading sessions…</div>}
        {error   && <div className="flex items-center justify-center h-32 text-[13px] text-destructive">{error}</div>}
        {!loading && !error && (
          <table className="w-full border-collapse text-[13px]">
            <thead className="bg-card border-b border-border sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-56">User</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-24">Audience</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-20">Start</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-20">End</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-20">Duration</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-16">Events</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70">Top Features</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-8 py-12 text-center text-[13px] text-muted-foreground">
                  {sessions.length === 0 ? 'No sessions recorded for this date.' : 'No users match the filter.'}
                </td></tr>
              )}
              {filtered.map((s, i) => (
                <tr key={s.email} className={`border-b border-border/60 ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                  <td className="px-4 py-2.5">
                    <span className="text-[13px] text-foreground font-mono truncate block max-w-[200px]" title={s.email}>{s.email}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[12px] px-1.5 py-0.5 rounded border bg-muted border-border text-muted-foreground">
                      {audienceLabel(s.audience)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-foreground tabular-nums">{shortTime(s.firstSeen)}</td>
                  <td className="px-4 py-2.5 text-[13px] text-foreground tabular-nums">{shortTime(s.lastSeen)}</td>
                  <td className="px-4 py-2.5 text-[13px] text-foreground tabular-nums">{formatDuration(s.durationMinutes)}</td>
                  <td className="px-4 py-2.5 text-[13px] text-foreground tabular-nums">{s.eventCount}</td>
                  <td className="px-4 py-2.5">
                    {s.topFeatures.length === 0
                      ? <span className="text-[12px] text-muted-foreground/60 italic">Login only</span>
                      : s.topFeatures.map(f => (
                          <span key={f} className="inline-block mr-1 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-[11px] font-mono font-semibold">{f}</span>
                        ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Failures Tab ──────────────────────────────────────────────────────────────

function FailuresTab() {
  const [dateFrom,    setDateFrom]    = useState(() => daysAgoIso(7));
  const [dateTo,      setDateTo]      = useState(todayIso);
  const [userFilter,  setUserFilter]  = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [failures,    setFailures]    = useState<ServerFailureGroup[]>([]);
  const [stats,       setStats]       = useState<FailureSummaryStats | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchFailureSummary(dateFrom, dateTo, userFilter.trim() || undefined, routeFilter.trim() || undefined)
      .then(data => { setFailures(data.failures); setStats(data.stats); })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <DateRangeToolbar
        dateFrom={dateFrom} dateTo={dateTo}
        onChangeDateFrom={setDateFrom} onChangeDateTo={setDateTo}
        onApply={load} loading={loading}
        extraFilters={
          <>
            <input value={routeFilter} onChange={e => setRouteFilter(e.target.value)}
              placeholder="Filter by route…"
              className="pl-2 pr-2 py-1 text-[13px] rounded-md border border-border bg-background text-foreground placeholder-muted-foreground/50 outline-none focus:border-ring w-36" />
            <input value={userFilter} onChange={e => setUserFilter(e.target.value)}
              placeholder="Filter by user…"
              className="pl-2 pr-2 py-1 text-[13px] rounded-md border border-border bg-background text-foreground placeholder-muted-foreground/50 outline-none focus:border-ring w-36" />
          </>
        }
      />

      {/* Summary strip — uses server-computed totals, not client-truncated row counts */}
      <div className="flex-shrink-0 border-b border-border bg-card px-5 py-2">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold ${(stats?.totalErrors ?? 0) > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {stats?.totalErrors ?? '—'}
            </span>
            <span className="text-[11px] text-muted-foreground">total errors</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[14px] font-semibold text-foreground font-mono truncate max-w-[200px]" title={stats?.topRoute}>
              {stats?.topRoute ?? '—'}
            </span>
            <span className="text-[11px] text-muted-foreground">top failing route</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground">{stats?.affectedUsers ?? '—'}</span>
            <span className="text-[11px] text-muted-foreground">affected users</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading && <div className="flex items-center justify-center h-32 text-[13px] text-muted-foreground">Loading failures…</div>}
        {error   && <div className="flex items-center justify-center h-32 text-[13px] text-destructive">{error}</div>}
        {!loading && !error && (
          <table className="w-full border-collapse text-[13px]">
            <thead className="bg-card border-b border-border sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-40">First Seen</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-40">Last Seen</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-44">Route</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-28">Status / Count</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70">Error</th>
              </tr>
            </thead>
            <tbody>
              {failures.length === 0 && (
                <tr><td colSpan={5} className="px-8 py-12 text-center text-[13px] text-muted-foreground">
                  No errors recorded for this period.
                </td></tr>
              )}
              {failures.map((g, i) => (
                <tr key={i}
                  className={`border-b border-border/60 border-l-2 border-l-destructive ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground tabular-nums">
                    {g.firstAt ? shortDateTime(g.firstAt) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground tabular-nums">
                    {g.lastAt ? shortDateTime(g.lastAt) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] font-mono text-foreground truncate max-w-[176px]">
                    {g.route || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[12px] px-1.5 py-0.5 rounded border bg-destructive/10 border-destructive/20 text-destructive font-mono font-semibold">
                      {g.status}
                    </span>
                    {g.count > 1 && (
                      <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-semibold">
                        ×{g.count}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground max-w-xs">
                    <span className="truncate block">{g.message || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Feature Usage Tab ─────────────────────────────────────────────────────────

type GroupBy = 'feature' | 'user';

function FeatureUsageTab() {
  const [dateFrom, setDateFrom] = useState(() => daysAgoIso(30));
  const [dateTo,   setDateTo]   = useState(todayIso);
  const [groupBy,  setGroupBy]  = useState<GroupBy>('feature');
  const [features, setFeatures] = useState<FeatureStat[]>([]);
  const [users,    setUsers]    = useState<UserStat[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchFeatureUsageSummary(dateFrom, dateTo)
      .then(data => { setFeatures(data.features); setUsers(data.userBreakdown); })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const maxUses     = features[0]?.totalUses ?? 1;
  const maxUserUses = users[0]?.totalUses    ?? 1;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <DateRangeToolbar
        dateFrom={dateFrom} dateTo={dateTo}
        onChangeDateFrom={setDateFrom} onChangeDateTo={setDateTo}
        onApply={load} loading={loading}
        extraFilters={
          <div className="flex items-center gap-1 ml-2">
            <span className="text-[12px] font-bold text-muted-foreground/60 mr-0.5">Group by</span>
            {(['feature', 'user'] as GroupBy[]).map(opt => (
              <button key={opt} onClick={() => setGroupBy(opt)}
                className={`px-2 py-0.5 rounded-full border text-[12px] font-semibold transition-all ${
                  groupBy === opt
                    ? 'bg-foreground border-foreground text-background'
                    : 'bg-card border-border text-muted-foreground hover:border-ring/50'
                }`}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        {loading && <div className="flex items-center justify-center h-32 text-[13px] text-muted-foreground">Loading usage data…</div>}
        {error   && <div className="flex items-center justify-center h-32 text-[13px] text-destructive">{error}</div>}

        {/* ── By Feature ── */}
        {!loading && !error && groupBy === 'feature' && (
          <div className="p-5 space-y-6">
            {features.length > 0 && (
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide mb-3">
                  Feature usage — {dateFrom} to {dateTo}
                </p>
                <div className="space-y-2">
                  {features.slice(0, 12).map(stat => (
                    <div key={stat.feature} className="flex items-center gap-3">
                      <span className="text-[12px] font-mono text-foreground w-32 shrink-0 truncate" title={stat.feature}>
                        {stat.feature}
                      </span>
                      <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                        <div className="h-full bg-primary/70 rounded transition-all"
                          style={{ width: `${Math.max(2, (stat.totalUses / maxUses) * 100)}%` }} />
                      </div>
                      <span className="text-[12px] font-semibold text-foreground tabular-nums w-10 text-right">
                        {stat.totalUses}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <table className="w-full border-collapse text-[13px]">
              <thead className="bg-card border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70">Feature</th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-24">Total Uses</th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-28">Unique Users</th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-36">First Used</th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-36">Last Used</th>
                </tr>
              </thead>
              <tbody>
                {features.length === 0 && (
                  <tr><td colSpan={5} className="px-8 py-12 text-center text-[13px] text-muted-foreground">
                    No feature usage events recorded for this period.
                  </td></tr>
                )}
                {features.map((stat, i) => (
                  <tr key={stat.feature} className={`border-b border-border/60 ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                    <td className="px-4 py-2.5 text-[13px] font-mono font-semibold text-primary">{stat.feature}</td>
                    <td className="px-4 py-2.5 text-[13px] text-foreground tabular-nums">{stat.totalUses}</td>
                    <td className="px-4 py-2.5 text-[13px] text-foreground tabular-nums">{stat.uniqueUsers}</td>
                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{shortDate(stat.firstUsed)}</td>
                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{shortDate(stat.lastUsed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── By User ── */}
        {!loading && !error && groupBy === 'user' && (
          <div className="p-5 space-y-6">
            {users.length > 0 && (
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide mb-3">
                  Usage by user — {dateFrom} to {dateTo}
                </p>
                <div className="space-y-2">
                  {users.slice(0, 12).map(stat => (
                    <div key={stat.email} className="flex items-center gap-3">
                      <span className="text-[12px] font-mono text-foreground w-48 shrink-0 truncate" title={stat.email}>
                        {stat.email}
                      </span>
                      <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                        <div className="h-full bg-primary/70 rounded transition-all"
                          style={{ width: `${Math.max(2, (stat.totalUses / maxUserUses) * 100)}%` }} />
                      </div>
                      <span className="text-[12px] font-semibold text-foreground tabular-nums w-10 text-right">
                        {stat.totalUses}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <table className="w-full border-collapse text-[13px]">
              <thead className="bg-card border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70">User</th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-24">Total Uses</th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-bold text-muted-foreground/70 w-28">Features Used</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={3} className="px-8 py-12 text-center text-[13px] text-muted-foreground">
                    No usage events recorded for this period.
                  </td></tr>
                )}
                {users.map((stat, i) => (
                  <tr key={stat.email} className={`border-b border-border/60 ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                    <td className="px-4 py-2.5 text-[13px] font-mono text-foreground">{stat.email}</td>
                    <td className="px-4 py-2.5 text-[13px] text-foreground tabular-nums">{stat.totalUses}</td>
                    <td className="px-4 py-2.5 text-[13px] text-foreground tabular-nums">{stat.featureCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'sessions',      label: 'Sessions',      icon: Users },
  { id: 'failures',      label: 'Failures',      icon: AlertTriangle },
  { id: 'feature_usage', label: 'Feature Usage', icon: BarChart2 },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdoptionDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('sessions');

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-card px-5 py-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Administration</span>
        </div>
        <h1 className="text-base font-semibold text-foreground mt-0.5">Adoption Dashboard</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Track how staff use Trail OS day-to-day — sessions, feature adoption, and platform failures.
        </p>
      </div>

      {/* ── Underline tabs ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-card px-5">
        <div className="flex items-center">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'sessions'      && <SessionsTab />}
        {activeTab === 'failures'      && <FailuresTab />}
        {activeTab === 'feature_usage' && <FeatureUsageTab />}
      </div>

    </div>
  );
}
