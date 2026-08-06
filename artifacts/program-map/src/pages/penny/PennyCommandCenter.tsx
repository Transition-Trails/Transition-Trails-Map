import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain, Users, Map, Sparkles, CheckCircle2, AlertTriangle,
  MessageSquare, Database, RefreshCw, Zap, BookOpen,
  Activity, Clock, Shield, Circle, ArrowRight,
  GraduationCap, Building2, UserCheck, Globe, User,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PennyStats {
  today: {
    total: number;
    byAudience: Record<string, number>;
    byTrail: Record<string, number>;
  };
  lifetime: {
    total: number;
    byAudience: Record<string, number>;
  };
  recentInteractions: RecentInteraction[];
  lastInteractionAt: string | null;
}

interface RecentInteraction {
  id: number;
  audience: string | null;
  trailId: string | null;
  learnerName: string | null;
  userEmail: string | null;
  promptMode: string;
  model: string | null;
  durationMs: number | null;
  createdAt: string;
}

interface TrailConfig {
  trailId?: string;
  isActive?: boolean;
  name?: string;
  Trail_ID__c?: string;
  Is_Active__c?: boolean;
  Penny_Role__c?: string;
  [key: string]: unknown;
}

interface LearnerEntry {
  id?: string;
  firstName?: string;
  pennyTrail?: string;
  onboardingComplete?: boolean;
  confidenceScore?: number;
  lastInteraction?: string | null;
  [key: string]: unknown;
}

interface WriteHealthData {
  lastFailure:   { object: string; reason: string; timestamp: string } | null;
  lastSuccess:   string | null;
  totalAttempts: number;
  failedWrites:  number;
  healthyWrites: number;
  /** Deliberate skips (not failures) — e.g. staff sessions where Learner__c is required */
  staffSkips:    number;
  lastStaffSkip: { reason: string; timestamp: string } | null;
}

// ── Identity config ────────────────────────────────────────────────────────────

const IDENTITY_CONFIG: Record<string, {
  label: string;
  role: string;
  icon: typeof GraduationCap;
  color: string;
  bg: string;
  border: string;
  ring: string;
  implemented: boolean;
}> = {
  learner: {
    label: 'Learner',
    role: 'Coaching companion',
    icon: GraduationCap,
    color: 'text-[#2F6B3F]',
    bg: 'bg-[#E6F0EA]',
    border: 'border-[#9FC3AE]',
    ring: 'ring-[#9FC3AE]',
    implemented: true,
  },
  internal: {
    label: 'Internal Staff',
    role: 'Operations assistant',
    icon: Building2,
    color: 'text-[#2F6F7E]',
    bg: 'bg-[#EDF5F8]',
    border: 'border-[#7FAFC6]',
    ring: 'ring-[#7FAFC6]',
    implemented: true,
  },
  coach: {
    label: 'Coach',
    role: 'Coaching support',
    icon: UserCheck,
    color: 'text-[#CC8400]',
    bg: 'bg-[#FFF3E0]',
    border: 'border-[#FFD08A]',
    ring: 'ring-[#FFD08A]',
    implemented: false,
  },
  client: {
    label: 'Client',
    role: 'Executive layer',
    icon: User,
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    ring: 'ring-slate-200',
    implemented: false,
  },
  public: {
    label: 'Public',
    role: 'External facing',
    icon: Globe,
    color: 'text-slate-400',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    ring: 'ring-slate-200',
    implemented: false,
  },
};

const IDENTITY_ORDER = ['learner', 'internal', 'coach', 'client', 'public'];

// ── Prompt layer config ────────────────────────────────────────────────────────

const PROMPT_LAYERS: {
  id: string;
  label: string;
  desc: string;
  status: 'live' | 'partial' | 'placeholder';
  audiences: string[];
}[] = [
  { id: 'identity',        label: 'Identity',         desc: 'Who Penny is, voice & guardrails',        status: 'live',        audiences: ['learner', 'internal'] },
  { id: 'trail-context',   label: 'Trail Context',    desc: 'Trail persona, phase, tone',               status: 'live',        audiences: ['learner'] },
  { id: 'learner-context', label: 'Learner Context',  desc: 'Focus, blockers, confidence, week',        status: 'live',        audiences: ['learner'] },
  { id: 'knowledge',       label: 'Knowledge',        desc: 'Retrieved sources from knowledge layer',   status: 'live',        audiences: ['learner', 'internal'] },
  { id: 'active-quest',    label: 'Active Quest',     desc: 'Current quest state',                      status: 'placeholder', audiences: ['learner'] },
  { id: 'career-review',   label: 'Career Review',    desc: 'Most recent career review',                status: 'placeholder', audiences: ['learner'] },
  { id: 'memory-window',   label: 'Memory Window',    desc: 'Conversation summary',                     status: 'placeholder', audiences: ['learner', 'internal'] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatIdentityLabel(audience: string | null): string {
  if (!audience) return 'Unknown';
  return IDENTITY_CONFIG[audience]?.label ?? audience;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted/50 ${className ?? ''}`} />;
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, colorCls, bgCls,
}: {
  label: string; value: string | number; sub: string;
  icon: typeof Activity; colorCls: string; bgCls: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 flex flex-col gap-1">
      <div className={`w-7 h-7 rounded-lg ${bgCls} flex items-center justify-center mb-1`}>
        <Icon className={`w-3.5 h-3.5 ${colorCls}`} />
      </div>
      <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-[13px] font-semibold text-foreground/80">{label}</p>
      <p className="text-[12px] text-muted-foreground">{sub}</p>
    </div>
  );
}

// ── IdentityRow ───────────────────────────────────────────────────────────────

function IdentityRow({
  audienceKey, todayCount, lifetimeCount,
}: {
  audienceKey: string; todayCount: number; lifetimeCount: number;
}) {
  const cfg = IDENTITY_CONFIG[audienceKey] ?? IDENTITY_CONFIG['internal'];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-lg border p-3 flex items-center gap-3 ${
      cfg.implemented
        ? `${cfg.border} bg-background`
        : 'border-border bg-muted/20 opacity-60'
    }`}>
      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold text-foreground">{cfg.label}</p>
          {!cfg.implemented && (
            <span className="text-[10px] font-bold text-muted-foreground/50 border border-border rounded-full px-1.5">Phase 2</span>
          )}
        </div>
        <p className="text-[12px] text-muted-foreground">{cfg.role}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-[16px] font-bold ${todayCount > 0 ? cfg.color : 'text-muted-foreground/40'}`}>
          {todayCount > 0 ? todayCount : '—'}
        </p>
        <p className="text-[11px] text-muted-foreground/60">today</p>
      </div>
      <div className="text-right shrink-0 w-12">
        <p className="text-[13px] font-semibold text-muted-foreground">{lifetimeCount > 0 ? lifetimeCount : '—'}</p>
        <p className="text-[11px] text-muted-foreground/60">total</p>
      </div>
    </div>
  );
}

// ── InteractionRow ─────────────────────────────────────────────────────────────

function InteractionRow({ interaction }: { interaction: RecentInteraction }) {
  const audience = interaction.audience ?? 'internal';
  const cfg = IDENTITY_CONFIG[audience] ?? IDENTITY_CONFIG['internal'];
  const Icon = cfg.icon;

  const who = interaction.learnerName
    ? interaction.learnerName
    : interaction.userEmail
      ? interaction.userEmail.split('@')[0]
      : cfg.label;

  const layers = interaction.promptMode
    ? interaction.promptMode.split('+').filter(l => l !== 'ask').length
    : 0;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-0">
      <div className={`w-6 h-6 rounded-md ${cfg.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-3 h-3 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground truncate">{who}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {interaction.trailId && (
            <span className="text-[11px] text-muted-foreground/70 font-medium">{interaction.trailId}</span>
          )}
          {layers > 0 && (
            <span className="text-[11px] text-muted-foreground/50">{layers} layer{layers !== 1 ? 's' : ''}</span>
          )}
          {interaction.durationMs && (
            <span className="text-[11px] text-muted-foreground/50">{(interaction.durationMs / 1000).toFixed(1)}s</span>
          )}
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground/50 shrink-0">{relativeTime(interaction.createdAt)}</span>
    </div>
  );
}

// ── LayerRow ──────────────────────────────────────────────────────────────────

function LayerRow({ layer }: { layer: typeof PROMPT_LAYERS[0] }) {
  const statusDot =
    layer.status === 'live'
      ? 'bg-[#2F6B3F]'
      : layer.status === 'partial'
        ? 'bg-[#CC8400]'
        : 'bg-muted-foreground/25';

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${statusDot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-[12px] font-semibold ${layer.status === 'placeholder' ? 'text-muted-foreground/50' : 'text-foreground'}`}>
            {layer.label}
          </p>
          {layer.status === 'placeholder' && (
            <span className="text-[10px] text-muted-foreground/40 font-medium">empty</span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground/60 leading-tight">{layer.desc}</p>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PennyCommandCenter() {
  const [, navigate] = useLocation();
  const { setAskPennyOpen, setRightPanelOpen } = useAppContext();

  // Data states
  const [stats,          setStats]          = useState<PennyStats | null>(null);
  const [statsLoading,   setStatsLoading]   = useState(true);
  const [learners,       setLearners]       = useState<LearnerEntry[]>([]);
  const [trails,         setTrails]         = useState<TrailConfig[]>([]);
  const [writeHealth,    setWriteHealth]    = useState<WriteHealthData | null>(null);
  const [sfAuthenticated, setSfAuthenticated] = useState<boolean | null>(null);
  const [statsError,     setStatsError]     = useState(false);

  const writeHealthRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1 — SF auth status
  useEffect(() => {
    fetch('/api/auth/salesforce/status')
      .then(r => r.ok ? r.json() as Promise<{ authenticated: boolean }> : Promise.reject())
      .then(d => setSfAuthenticated(d.authenticated))
      .catch(() => setSfAuthenticated(false));
  }, []);

  // 2 — Stats + learners + trails in parallel
  useEffect(() => {
    Promise.all([
      fetch('/api/penny/stats').then(r => r.ok ? r.json() as Promise<PennyStats> : null),
      fetch('/api/penny/data/learners/directory').then(r => r.ok ? r.json() as Promise<LearnerEntry[]> : []),
      fetch('/api/penny/data/trail-configs').then(r => r.ok ? r.json() as Promise<TrailConfig[]> : []),
    ]).then(([statsData, learnersData, trailsData]) => {
      if (statsData) setStats(statsData);
      else setStatsError(true);
      if (Array.isArray(learnersData)) setLearners(learnersData);
      if (Array.isArray(trailsData)) setTrails(trailsData);
    }).catch(() => setStatsError(true))
      .finally(() => setStatsLoading(false));
  }, []);

  // 3 — Poll write health every 10 s
  useEffect(() => {
    function fetchHealth() {
      fetch('/api/penny/write-health')
        .then(r => r.ok ? r.json() as Promise<WriteHealthData> : null)
        .then(d => { if (d) setWriteHealth(d); })
        .catch(() => undefined);
    }
    fetchHealth();
    writeHealthRef.current = setInterval(fetchHealth, 10_000);
    return () => { if (writeHealthRef.current) clearInterval(writeHealthRef.current); };
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────────

  const activeTrailCount = trails.filter(t => t.isActive === true || t.Is_Active__c === true).length;
  const onboardedCount   = learners.filter(l => l.onboardingComplete === true).length;
  const lastActive       = stats?.lastInteractionAt ? relativeTime(stats.lastInteractionAt) : null;

  // Per-trail learner counts
  const learnersByTrail: Record<string, number> = {};
  for (const l of learners) {
    if (l.pennyTrail) {
      learnersByTrail[l.pennyTrail] = (learnersByTrail[l.pennyTrail] ?? 0) + 1;
    }
  }

  // Engagement breakdown by trail (merge learner count + interaction count)
  const trailKeys = Array.from(new Set([
    ...Object.keys(learnersByTrail),
    ...Object.keys(stats?.today.byTrail ?? {}),
  ]));

  const sfStatus = sfAuthenticated === null ? '—'
    : sfAuthenticated ? 'Connected' : 'Auth required';
  const sfStatusColor = sfAuthenticated ? 'text-[#2F6B3F]' : 'text-[#CC8400]';

  function handleAskPenny() {
    setRightPanelOpen(true);
    setAskPennyOpen(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
    <ScrollArea className="flex-1">
      <div className="p-5 space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-[15px] font-semibold text-foreground">{TERMS.aiAssistant}</h1>
              {lastActive && (
                <span className="text-[12px] text-muted-foreground/60 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> last active {lastActive}
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground">
              AI coaching companion — engagement overview across all identities
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {[
              { label: 'Gemini', value: 'Live',    color: 'text-[#2F6B3F]', bg: 'bg-[#E6F0EA] border-[#9FC3AE]' },
              { label: 'Slack',  value: 'Live',    color: 'text-[#2F6B3F]', bg: 'bg-[#E6F0EA] border-[#9FC3AE]' },
              { label: 'Salesforce', value: sfStatus, color: sfStatusColor, bg: sfAuthenticated ? 'bg-[#E6F0EA] border-[#9FC3AE]' : 'bg-[#FFF3E0] border-[#FFD08A]' },
            ].map(p => (
              <div key={p.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-medium ${p.bg}`}>
                <span className="text-muted-foreground/60">{p.label}</span>
                <span className={p.color}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Engagement ──────────────────────────────────────────────────────── */}
        <div className="space-y-5">

            {/* Engagement pulse — 4 stat cards */}
            {statsLoading ? (
              <div className="grid grid-cols-4 gap-3">
                {[0,1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                <StatCard
                  label="Today"
                  value={statsError ? '—' : (stats?.today.total ?? 0)}
                  sub="conversations"
                  icon={Activity}
                  colorCls="text-[#2F6B3F]"
                  bgCls="bg-[#E6F0EA]"
                />
                <StatCard
                  label="All Time"
                  value={statsError ? '—' : (stats?.lifetime.total ?? 0)}
                  sub="total interactions"
                  icon={Brain}
                  colorCls="text-[#2F6F7E]"
                  bgCls="bg-[#EDF5F8]"
                />
                <StatCard
                  label="Learners"
                  value={learners.length > 0 ? learners.length : '—'}
                  sub={`${onboardedCount} onboarded`}
                  icon={Users}
                  colorCls="text-[#2F6B3F]"
                  bgCls="bg-[#E6F0EA]"
                />
                <StatCard
                  label="Active Trails"
                  value={activeTrailCount > 0 ? activeTrailCount : trails.length > 0 ? trails.length : '—'}
                  sub="of 4 configured"
                  icon={Map}
                  colorCls="text-secondary"
                  bgCls="bg-secondary/10"
                />
              </div>
            )}

            {/* Identity breakdown */}
            <div>
              <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-2">
                Identity Breakdown
              </p>
              <div className="space-y-1.5">
                {IDENTITY_ORDER.map(key => (
                  <IdentityRow
                    key={key}
                    audienceKey={key}
                    todayCount={stats?.today.byAudience[key] ?? 0}
                    lifetimeCount={stats?.lifetime.byAudience[key] ?? 0}
                  />
                ))}
              </div>
            </div>

            {/* Trail activity */}
            {trailKeys.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-2">
                  Trail Activity
                </p>
                <div className="rounded-lg border border-border bg-background overflow-hidden">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-3 py-2 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide">Trail</th>
                        <th className="text-right px-3 py-2 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide">Learners</th>
                        <th className="text-right px-3 py-2 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide">Today</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trailKeys.map(trailKey => (
                        <tr key={trailKey} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-[#2F6B3F]" />
                              <span className="font-medium text-foreground">{trailKey}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground font-medium">
                            {learnersByTrail[trailKey] ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {stats?.today.byTrail[trailKey] ? (
                              <span className="text-[#2F6B3F] font-semibold">{stats.today.byTrail[trailKey]}</span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent interactions feed */}
            <div>
              <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-2">
                Recent Interactions
              </p>
              <div className="rounded-lg border border-border bg-background overflow-hidden">
                {statsLoading ? (
                  <div className="p-4 space-y-2">
                    {[0,1,2].map(i => <Skeleton key={i} className="h-9" />)}
                  </div>
                ) : !stats || stats.recentInteractions.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <Sparkles className="w-5 h-5 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-[13px] text-muted-foreground/50">No interactions yet — ask {TERMS.aiAssistant} a question to start.</p>
                  </div>
                ) : (
                  <div>
                    {stats.recentInteractions.map(interaction => (
                      <InteractionRow key={interaction.id} interaction={interaction} />
                    ))}
                    <button
                      onClick={() => navigate('/penny/session-log')}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[12px] text-muted-foreground/60 hover:text-primary hover:bg-muted/20 transition-colors border-t border-border/50"
                    >
                      View full session log <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

        </div>

        {/* All-clear when everything healthy */}
        {sfAuthenticated && !writeHealth?.lastFailure && !statsError && !statsLoading && (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground/50">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F]" />
            All systems nominal
          </div>
        )}

      </div>
    </ScrollArea>

    {/* ── Rail: engine health ─────────────────────────────────────────────── */}
    <div className="w-[272px] shrink-0 border-l border-border bg-muted/10 overflow-y-auto">
      <div className="p-4 space-y-4">

        {/* Prompt engine layers */}
        <div className="rounded-lg border border-border bg-white p-3">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[12px] font-bold text-foreground">Prompt Engine</p>
            <span className="ml-auto text-[11px] text-muted-foreground/50">7 layers</span>
          </div>
          <div className="divide-y divide-border/50">
            {PROMPT_LAYERS.map(layer => (
              <LayerRow key={layer.id} layer={layer} />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2F6B3F]" />
              <span className="text-[11px] text-muted-foreground/60">Live</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/25" />
              <span className="text-[11px] text-muted-foreground/60">Placeholder</span>
            </div>
          </div>
        </div>

        {/* SF Write health */}
        <div className={`rounded-lg border p-3 ${
          writeHealth?.lastFailure
            ? 'border-[#FFD08A] bg-[#FFF8EC]'
            : writeHealth && writeHealth.healthyWrites > 0
              ? 'border-[#9FC3AE] bg-[#F2F9F4]'
              : 'border-border bg-white'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Database className={`w-3.5 h-3.5 ${writeHealth?.lastFailure ? 'text-[#CC8400]' : 'text-[#2F6B3F]'}`} />
            <p className="text-[12px] font-bold text-foreground">SF Write Log</p>
            <span className="ml-auto text-[11px] text-muted-foreground/50">live</span>
          </div>
          <div className="grid grid-cols-4 gap-1 text-center">
            {[
              { label: 'Attempts', value: writeHealth?.totalAttempts ?? 0, cls: 'text-foreground' },
              { label: 'Success',  value: writeHealth?.healthyWrites  ?? 0, cls: 'text-[#2F6B3F]' },
              { label: 'Failed',   value: writeHealth?.failedWrites   ?? 0, cls: writeHealth?.failedWrites ? 'text-[#CC8400]' : 'text-muted-foreground/40' },
              { label: 'Skipped',  value: writeHealth?.staffSkips     ?? 0, cls: 'text-muted-foreground' },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-[14px] font-bold ${s.cls}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground/60">{s.label}</p>
              </div>
            ))}
          </div>
          {writeHealth?.lastFailure && (
            <div className="mt-2 bg-white/70 rounded p-2">
              <p className="text-[11px] text-[#CC8400] font-medium">{writeHealth.lastFailure.object}</p>
              <p className="text-[11px] text-[#CC8400]/80 break-words mt-0.5 line-clamp-2">{writeHealth.lastFailure.reason}</p>
            </div>
          )}
          {writeHealth?.lastStaffSkip && !writeHealth.lastFailure && (writeHealth.staffSkips ?? 0) > 0 && (
            <div className="mt-2 flex items-start gap-1.5">
              <span className="text-[10px] bg-muted/60 border border-border/60 rounded px-1.5 py-0.5 text-muted-foreground shrink-0">skip</span>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                Staff writes deferred — {writeHealth.staffSkips} session{writeHealth.staffSkips !== 1 ? 's' : ''} skipped.
              </p>
            </div>
          )}
          {writeHealth?.lastSuccess && !writeHealth.lastFailure && (
            <p className="text-[10px] text-[#2F6B3F] mt-2">Last write: {relativeTime(writeHealth.lastSuccess)}</p>
          )}
          {writeHealth?.totalAttempts === 0 && !writeHealth?.staffSkips && (
            <p className="text-[10px] text-muted-foreground/50 mt-2">No writes yet.</p>
          )}
        </div>

        {/* Needs attention */}
        {(sfAuthenticated === false || writeHealth?.lastFailure || statsError) && (
          <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] p-3 space-y-1.5">
            <p className="text-[11px] font-bold text-[#CC8400] uppercase tracking-wide">Needs Attention</p>
            {sfAuthenticated === false && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#CC8400] shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#7A4F00]">Salesforce authentication required</p>
              </div>
            )}
            {writeHealth?.lastFailure && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#CC8400] shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#7A4F00]">SF write failed — {writeHealth.lastFailure.object}</p>
              </div>
            )}
            {statsError && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#CC8400] shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#7A4F00]">Could not load engagement stats</p>
              </div>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="rounded-lg border border-border bg-white p-3 space-y-1.5">
          <p className="text-[12px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-2">Quick Actions</p>
          <button
            onClick={handleAskPenny}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask {TERMS.aiAssistant}
          </button>
          <button
            onClick={() => navigate('/penny/prompts')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[12px] font-medium hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
          >
            <MessageSquare className="w-3 h-3 text-muted-foreground" />
            Prompt Studio
          </button>
          <button
            onClick={() => navigate('/penny/learners')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[12px] font-medium hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
          >
            <Users className="w-3 h-3 text-muted-foreground" />
            View Learners
          </button>
          <button
            onClick={() => navigate('/penny/configs')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[12px] font-medium hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
          >
            <Shield className="w-3 h-3 text-muted-foreground" />
            Trail Configs
          </button>
          <button
            onClick={() => navigate('/penny/capabilities')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[12px] font-medium hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
          >
            <BookOpen className="w-3 h-3 text-muted-foreground" />
            Capabilities
          </button>
        </div>

      </div>
    </div>
    </div>
  );
}
