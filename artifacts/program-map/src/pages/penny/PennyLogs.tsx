import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TERMS } from '@/config/terminology';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Clock, Zap, Brain, CalendarDays } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PennyLogRow {
  id: number;
  sessionId: string | null;
  userTier: string | null;
  userEmail: string | null;
  userMessage: string;
  pennyResponse: string;
  promptMode: string;
  model: string | null;
  durationMs: number | null;
  contextRoute: string | null;
  sfContactId: string | null;
  learnerName: string | null;
  trailId: string | null;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function tierColor(tier: string | null): string {
  switch (tier) {
    case 'superadmin': return 'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]';
    case 'admin':      return 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]';
    case 'poweruser':  return 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]';
    case 'everyday':   return 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]';
    default:           return 'bg-muted text-muted-foreground border-border';
  }
}

function tierLabel(tier: string | null): string {
  switch (tier) {
    case 'superadmin': return 'Super Admin';
    case 'admin':      return 'Admin';
    case 'poweruser':  return 'Power User';
    case 'everyday':   return 'Everyday';
    default:           return 'Unknown';
  }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-pulse space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-14 h-3 bg-muted rounded" />
        <div className="w-16 h-3 bg-muted rounded" />
        <div className="w-20 h-3 bg-muted rounded" />
      </div>
      <div className="w-3/4 h-3 bg-muted rounded" />
      <div className="w-1/2 h-3 bg-muted rounded" />
    </div>
  );
}

// ── Log entry row ─────────────────────────────────────────────────────────────

function LogRow({ log }: { log: PennyLogRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card hover:bg-muted/10 transition-colors">
      <button
        className="w-full text-left p-3.5"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start gap-3">
          {/* Time */}
          <div className="shrink-0 text-right w-[72px] pt-0.5">
            <p className="text-[11px] font-mono text-muted-foreground">{formatTime(log.createdAt)}</p>
          </div>

          {/* Spark dot */}
          <Sparkles className="w-3.5 h-3.5 text-primary/60 shrink-0 mt-0.5" />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {log.learnerName && (
                <span className="text-[12px] font-semibold text-foreground">{log.learnerName}</span>
              )}
              {log.userTier && (
                <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${tierColor(log.userTier)}`}>
                  {tierLabel(log.userTier)}
                </span>
              )}
              {log.durationMs !== null && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Zap className="w-2.5 h-2.5" />{log.durationMs}ms
                </span>
              )}
              {log.model && (
                <span className="text-[10px] text-muted-foreground font-mono truncate">
                  {log.model.replace('models/', '')}
                </span>
              )}
            </div>
            <p className="text-[12px] text-foreground font-medium leading-snug line-clamp-2">
              {log.userMessage}
            </p>
          </div>

          {/* Expand toggle */}
          <div className="shrink-0 text-muted-foreground/50 mt-0.5">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-4 py-3 space-y-3 bg-muted/20">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1">Query</p>
            <p className="text-[12px] text-foreground leading-relaxed">{log.userMessage}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1">
              {TERMS.aiAssistant} Response
            </p>
            <p className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{log.pennyResponse}</p>
          </div>
          {(log.sfContactId || log.trailId || log.contextRoute) && (
            <div className="flex flex-wrap gap-3 pt-1 border-t border-border/30">
              {log.sfContactId && (
                <div>
                  <p className="text-[9px] font-bold uppercase text-muted-foreground/50">SF Contact</p>
                  <p className="text-[11px] font-mono text-muted-foreground">{log.sfContactId}</p>
                </div>
              )}
              {log.trailId && (
                <div>
                  <p className="text-[9px] font-bold uppercase text-muted-foreground/50">Trail</p>
                  <p className="text-[11px] text-muted-foreground">{log.trailId}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PennyLogs() {
  const [, navigate] = useLocation();
  const [logs, setLogs]         = useState<PennyLogRow[]>([]);
  const [total, setTotal]       = useState<number>(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/penny/logs?limit=100');
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json() as { logs: PennyLogRow[]; total: number };
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollArea className="h-full">
      <div className="p-5 max-w-4xl space-y-4">

        {/* ── Header row ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Brain className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">{TERMS.aiAssistant} Interaction Log</h2>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <CalendarDays className="w-3 h-3" />
              <span>{today}</span>
              {!loading && (
                <span className="text-muted-foreground/50">·</span>
              )}
              {!loading && (
                <span>{logs.length} today · {total} all time</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-md px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E6F0EA]0" />
              Live · DB
            </span>
            <button
              onClick={() => void fetchLogs(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-[11px] border border-border rounded-md px-2.5 py-1.5 hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── States ──────────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-2">
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] p-4 text-center space-y-1">
            <p className="text-[12px] text-[#A93F2F] font-medium">{error}</p>
            <p className="text-[11px] text-[#A93F2F]/70">
              Check the API server — logs are stored in the platform database.
            </p>
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center space-y-2">
            <Sparkles className="w-6 h-6 text-muted-foreground/30 mx-auto" />
            <p className="text-[12px] font-medium text-muted-foreground">No interactions logged today yet.</p>
            <p className="text-[11px] text-muted-foreground/60">
              Every query sent to {TERMS.aiAssistant} will appear here automatically.
            </p>
            <button
              onClick={() => navigate('/penny')}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
            >
              <Sparkles className="w-3 h-3" /> Ask {TERMS.aiAssistant} something →
            </button>
          </div>
        )}

        {!loading && !error && logs.length > 0 && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Today',
                  value: logs.length,
                  sub: 'interactions',
                  icon: Clock,
                  color: 'text-foreground',
                },
                {
                  label: 'Avg response',
                  value: logs.filter(l => l.durationMs !== null).length > 0
                    ? `${Math.round(logs.filter(l => l.durationMs !== null).reduce((s, l) => s + (l.durationMs ?? 0), 0) / logs.filter(l => l.durationMs !== null).length)}ms`
                    : '—',
                  sub: 'latency',
                  icon: Zap,
                  color: 'text-[#2F6F7E]',
                },
                {
                  label: 'All time',
                  value: total,
                  sub: 'total queries',
                  icon: Brain,
                  color: 'text-primary',
                },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                  <s.icon className={`w-4 h-4 shrink-0 ${s.color}`} />
                  <div>
                    <p className={`text-base font-semibold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Log rows — newest first */}
            <div className="space-y-2">
              {logs.map(log => <LogRow key={log.id} log={log} />)}
            </div>

            {logs.length >= 100 && (
              <p className="text-center text-[11px] text-muted-foreground/60 pb-2">
                Showing 100 most recent today. All-time total: {total}.
              </p>
            )}
          </>
        )}

      </div>
    </ScrollArea>
  );
}
