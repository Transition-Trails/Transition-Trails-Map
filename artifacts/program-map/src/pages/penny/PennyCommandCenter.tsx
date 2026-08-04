import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Users, Map, Sparkles, CheckCircle2, AlertTriangle, MessageSquare, Database } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LearnerEntry {
  onboardingComplete?: boolean;
  [key: string]: unknown;
}

interface TrailConfig {
  isActive?: boolean;
  [key: string]: unknown;
}

interface SfWriteFailure {
  object:    string;
  reason:    string;
  timestamp: string; // ISO-8601
}

interface WriteHealthData {
  lastFailure:   SfWriteFailure | null;
  lastSuccess:   string | null;
  totalAttempts: number;
  failedWrites:  number;
  healthyWrites: number;
}

// ── Attention items ────────────────────────────────────────────────────────────

interface AttentionItem {
  id: string;
  label: string;
  variant: 'ok' | 'warn';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins   = Math.floor(diffMs / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PennyCommandCenter() {
  const [, navigate] = useLocation();
  const { setAskPennyOpen, setRightPanelOpen } = useAppContext();

  // Salesforce auth
  const [sfAuthenticated, setSfAuthenticated] = useState<boolean | null>(null);

  // Live metrics
  const [metricsLoading,    setMetricsLoading]    = useState(true);
  const [totalLearners,     setTotalLearners]     = useState<number | null>(null);
  const [onboardedCount,    setOnboardedCount]    = useState<number | null>(null);
  const [activeTrails,      setActiveTrails]      = useState<number | null>(null);
  const [metricsError,      setMetricsError]      = useState(false);

  // Salesforce write health
  const [writeHealth, setWriteHealth] = useState<WriteHealthData | null>(null);

  // 1 — Check SF auth
  useEffect(() => {
    fetch('/api/auth/salesforce/status')
      .then(r => r.ok ? r.json() as Promise<{ authenticated: boolean }> : Promise.reject(r.status))
      .then(d => setSfAuthenticated(d.authenticated))
      .catch(() => setSfAuthenticated(false));
  }, []);

  // 2 — Fetch metrics once auth resolved
  useEffect(() => {
    if (sfAuthenticated === null) return;
    if (!sfAuthenticated) { setMetricsLoading(false); return; }

    Promise.all([
      fetch('/api/penny/data/learners/directory'),
      fetch('/api/penny/data/trail-configs'),
    ]).then(async ([learnersRes, configsRes]) => {
      if (learnersRes.ok) {
        const learners = await learnersRes.json() as LearnerEntry[];
        setTotalLearners(learners.length);
        setOnboardedCount(learners.filter(l => l.onboardingComplete === true).length);
      }
      if (configsRes.ok) {
        const configs = await configsRes.json() as TrailConfig[];
        setActiveTrails(configs.filter(c => c.isActive === true).length);
      }
      setMetricsLoading(false);
    }).catch(() => {
      setMetricsError(true);
      setMetricsLoading(false);
    });
  }, [sfAuthenticated]);

  // 3 — Fetch write health (always — independent of auth check)
  useEffect(() => {
    fetch('/api/penny/write-health')
      .then(r => r.ok ? r.json() as Promise<WriteHealthData> : null)
      .then(d => { if (d) setWriteHealth(d); })
      .catch(() => undefined);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const sfPill = sfAuthenticated === null
    ? { value: 'Checking…', color: 'text-muted-foreground', bg: 'bg-muted/30 border-border' }
    : sfAuthenticated
      ? { value: 'Connected',     color: 'text-[#2F6B3F]', bg: 'bg-[#E6F0EA] border-[#9FC3AE]' }
      : { value: 'Auth Required', color: 'text-[#CC8400]',   bg: 'bg-[#FFF3E0] border-[#FFD08A]' };

  const STATUS_PILLS = [
    { label: 'Gemini',      value: 'Live',     color: 'text-[#2F6B3F]', bg: 'bg-[#E6F0EA] border-[#9FC3AE]' },
    { label: 'Slack',       value: 'Live',     color: 'text-[#2F6B3F]', bg: 'bg-[#E6F0EA] border-[#9FC3AE]' },
    { label: 'Salesforce',  ...sfPill },
  ];

  const onboardingRate = totalLearners && totalLearners > 0 && onboardedCount !== null
    ? Math.round((onboardedCount / totalLearners) * 100)
    : null;

  const statTiles = [
    {
      icon:    Users,
      label:   'Total Learners',
      value:   totalLearners !== null ? String(totalLearners) : '—',
      sub:     totalLearners !== null ? `${onboardedCount ?? '—'} onboarded` : 'Connect Salesforce',
      iconBg:  'bg-[#EDF5F8]',
      iconCls: 'text-[#2F6F7E]',
    },
    {
      icon:    Brain,
      label:   'Onboarding Rate',
      value:   onboardingRate !== null ? `${onboardingRate}%` : '—',
      sub:     onboardingRate !== null ? 'learners onboarded' : 'Connect Salesforce',
      iconBg:  'bg-[#EDF5F8]',
      iconCls: 'text-[#2F6F7E]',
    },
    {
      icon:    Map,
      label:   'Active Trails',
      value:   activeTrails !== null ? String(activeTrails) : '—',
      sub:     activeTrails !== null ? 'of 4 configured' : 'Connect Salesforce',
      iconBg:  'bg-[#E6F0EA]',
      iconCls: 'text-[#2F6B3F]',
    },
  ];

  // ── Attention items ────────────────────────────────────────────────────────

  const attentionItems: AttentionItem[] = [];

  if (sfAuthenticated === false) {
    attentionItems.push({ id: 'sf-auth', label: 'Salesforce authentication required', variant: 'warn' });
  }
  if (metricsError) {
    attentionItems.push({ id: 'metrics-err', label: 'Live metrics could not be loaded', variant: 'warn' });
  }
  if (writeHealth?.lastFailure) {
    const { object, reason, timestamp } = writeHealth.lastFailure;
    const shortReason = reason.length > 70 ? `${reason.slice(0, 70)}…` : reason;
    attentionItems.push({
      id:      'sf-write',
      label:   `SF write failed (${relativeTime(timestamp)}): ${object} — ${shortReason}`,
      variant: 'warn',
    });
  }
  if (attentionItems.length === 0) {
    attentionItems.push({ id: 'ok', label: 'No issues flagged', variant: 'ok' });
  }

  const visibleItems = attentionItems.slice(0, 4);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleAskPenny() {
    setRightPanelOpen(true);
    setAskPennyOpen(true);
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-2xl">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground leading-tight">Penny</h1>
            <p className="text-[14px] text-muted-foreground mt-0.5">
              AI coaching companion — Transition Trails
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
            {STATUS_PILLS.map(p => (
              <div
                key={p.label}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[14px] font-medium ${p.bg}`}
              >
                <span className="text-muted-foreground/60">{p.label}</span>
                <span className={p.color}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stat tiles ────────────────────────────────────────────────────── */}
        {metricsLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="animate-pulse rounded-xl border border-border bg-muted/30 h-[88px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {statTiles.map(tile => (
              <div key={tile.label} className="rounded-xl border border-border bg-card p-4">
                <div className={`w-7 h-7 rounded-lg ${tile.iconBg} flex items-center justify-center mb-2`}>
                  <tile.icon className={`w-3.5 h-3.5 ${tile.iconCls}`} />
                </div>
                <p className="text-xl font-bold text-foreground leading-none">{tile.value}</p>
                <p className="text-[14px] font-medium text-muted-foreground mt-1">{tile.label}</p>
                <p className="text-[14px] text-muted-foreground/70 mt-0.5">{tile.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Needs attention ───────────────────────────────────────────────── */}
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-2.5">
            Needs attention
          </p>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {visibleItems.map(item => (
              <div key={item.id} className="flex items-start gap-2.5 px-3 py-2.5">
                {item.variant === 'ok'
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F] shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-3.5 h-3.5 text-[#CC8400] shrink-0 mt-0.5" />
                }
                <p className="text-[14px] text-foreground leading-snug">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── SF write detail card (shown when there is a known failure) ─────── */}
        {writeHealth && (writeHealth.failedWrites > 0 || writeHealth.lastFailure) && (
          <div className="rounded-lg border border-[#FFD08A] bg-[#FFF8EC] p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#CC8400] shrink-0" />
              <p className="text-[14px] font-semibold text-[#7A4F00]">Salesforce write log</p>
              <span className="text-[14px] text-muted-foreground/60 ml-auto">since last restart</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-base font-bold text-foreground">{writeHealth.totalAttempts}</p>
                <p className="text-[12px] text-muted-foreground">attempts</p>
              </div>
              <div>
                <p className="text-base font-bold text-[#2F6B3F]">{writeHealth.healthyWrites}</p>
                <p className="text-[12px] text-muted-foreground">succeeded</p>
              </div>
              <div>
                <p className="text-base font-bold text-[#CC8400]">{writeHealth.failedWrites}</p>
                <p className="text-[12px] text-muted-foreground">failed</p>
              </div>
            </div>
            {writeHealth.lastFailure && (
              <div className="bg-white/70 rounded-md p-3 space-y-1">
                <p className="text-[12px] font-medium text-muted-foreground">Most recent failure</p>
                <p className="text-[14px] text-foreground font-medium">{writeHealth.lastFailure.object}</p>
                <p className="text-[13px] text-[#CC8400] break-words">{writeHealth.lastFailure.reason}</p>
                <p className="text-[12px] text-muted-foreground">{relativeTime(writeHealth.lastFailure.timestamp)}</p>
              </div>
            )}
            {writeHealth.lastSuccess && (
              <p className="text-[12px] text-[#2F6B3F]">
                Last successful write: {relativeTime(writeHealth.lastSuccess)}
              </p>
            )}
          </div>
        )}

        {/* ── Quick actions ─────────────────────────────────────────────────── */}
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-2.5">
            Quick actions
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAskPenny}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask Penny
            </button>
            <button
              onClick={() => navigate('/penny/prompts')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[14px] font-medium hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              New prompt template
            </button>
            <button
              onClick={() => navigate('/penny/learners')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[14px] font-medium hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              View learners
            </button>
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
