import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain, Layers, MessageSquare, Users, BarChart2,
  Activity, ChevronRight, Sparkles, Star, ClipboardCheck, Bot,
  Map, MessageCircle, Database,
} from 'lucide-react';

// ── Static config ─────────────────────────────────────────────────────────────

const STATUS_PILLS = [
  { label: 'Gemini API',  value: 'Live',          color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { label: 'Slack',       value: 'Live POC',      color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { label: 'Salesforce',  value: 'Live',          color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { label: 'Agentforce',  value: 'POC Confirmed', color: 'text-cyan-700',    bg: 'bg-cyan-50 border-cyan-200' },
];

interface NavTile {
  icon: React.ElementType;
  label: string;
  desc: string;
  path: string;
  badge?: string;
  badgeCls?: string;
}

const NAV_TILES: NavTile[] = [
  {
    icon: Layers,
    label: 'Capabilities',
    path: '/penny/capabilities',
    desc: 'Explore Penny capabilities by domain — coaching, career, learning, knowledge, and operations',
  },
  {
    icon: MessageSquare,
    label: 'Prompt Studio',
    path: '/penny/prompts',
    desc: 'Author, version, and manage Penny prompt templates with variable tokens and guardrails',
  },
  {
    icon: Users,
    label: 'Learners',
    path: '/penny/learners',
    desc: 'Learner records, program enrollment, coaching activity, and trail journey status',
  },
  {
    icon: BarChart2,
    label: 'Intelligence',
    path: '/penny/intelligence',
    desc: 'Trend analysis, cohort health signals, and weekly performance report archive',
    badge: 'Phase 2',
    badgeCls: 'bg-amber-50 border-amber-200 text-amber-600',
  },
  {
    icon: Star,
    label: 'Trail Quests',
    path: '/penny/trail-quests',
    desc: 'Earnable badges and challenges delivered by Penny via Slack — track completion and coaching',
  },
  {
    icon: ClipboardCheck,
    label: 'Assessments',
    path: '/penny/assessments',
    desc: 'Competency assessments administered by Penny — results stored in Salesforce, coaching in-platform',
  },
  {
    icon: Bot,
    label: 'Agentforce',
    path: '/penny/agentforce',
    desc: 'Salesforce-native AI coexisting with Penny — POC confirmed, restoration checklist and decision matrix',
  },
  {
    icon: Activity,
    label: 'Health',
    path: '/penny/health',
    desc: 'API uptime, model response quality metrics, and integration health indicators',
  },
];

// ── API response shapes ───────────────────────────────────────────────────────

interface LearnerEntry {
  onboardingComplete?: boolean;
  [key: string]: unknown;
}

interface TrailConfig {
  isActive?: boolean;
  [key: string]: unknown;
}

interface LogEntry {
  [key: string]: unknown;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PennyCommandCenter() {
  const [, setLocation] = useLocation();

  // Salesforce auth
  const [sfAuthenticated, setSfAuthenticated] = useState<boolean | null>(null);

  // Live metrics
  const [metricsLoading,    setMetricsLoading]    = useState(true);
  const [totalLearners,     setTotalLearners]     = useState<number | null>(null);
  const [onboardedLearners, setOnboardedLearners] = useState<number | null>(null);
  const [activeTrails,      setActiveTrails]      = useState<number | null>(null);
  const [todayInteractions, setTodayInteractions] = useState<number | null>(null);
  const [metricsError,      setMetricsError]      = useState(false);

  // 1 — Check Salesforce auth on mount
  useEffect(() => {
    fetch('/api/auth/salesforce/status')
      .then(r => r.ok ? r.json() as Promise<{ authenticated: boolean }> : Promise.reject(r.status))
      .then(data => setSfAuthenticated(data.authenticated))
      .catch(() => setSfAuthenticated(false));
  }, []);

  // 2 — Fetch live metrics once sfAuthenticated is resolved
  useEffect(() => {
    if (sfAuthenticated === null) return;

    if (!sfAuthenticated) {
      setMetricsLoading(false);
      return;
    }

    Promise.all([
      fetch('/api/penny/data/learners/directory'),
      fetch('/api/penny/data/trail-configs'),
      fetch('/api/penny/data/logs/today'),
    ]).then(async ([learnersRes, configsRes, logsRes]) => {
      if (learnersRes.ok) {
        const learners = await learnersRes.json() as LearnerEntry[];
        setTotalLearners(learners.length);
        setOnboardedLearners(learners.filter(l => l.onboardingComplete === true).length);
      }
      if (configsRes.ok) {
        const configs = await configsRes.json() as TrailConfig[];
        setActiveTrails(configs.filter(c => c.isActive === true).length);
      }
      if (logsRes.ok) {
        const logs = await logsRes.json() as LogEntry[];
        setTodayInteractions(logs.length);
      }
      setMetricsLoading(false);
    }).catch(() => {
      setMetricsError(true);
      setMetricsLoading(false);
    });
  }, [sfAuthenticated]);

  // Salesforce status pill — dynamic
  const sfPill = sfAuthenticated === null
    ? { value: 'Checking…', color: 'text-muted-foreground',  bg: 'bg-muted/30 border-border' }
    : sfAuthenticated
      ? { value: 'Connected',     color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' }
      : { value: 'Auth Required', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' };

  const statusPills = STATUS_PILLS.map(p =>
    p.label === 'Salesforce' ? { ...p, ...sfPill } : p
  );

  // ── Metric cards config ────────────────────────────────────────────────────

  const metricCards = [
    {
      icon:    Users,
      label:   'Total Learners',
      value:   totalLearners !== null ? String(totalLearners) : '—',
      sub:     `${onboardedLearners ?? '—'} onboarded`,
      iconBg:  'bg-blue-100',
      iconCls: 'text-blue-600',
    },
    {
      icon:    Map,
      label:   'Active Trails',
      value:   activeTrails !== null ? String(activeTrails) : '—',
      sub:     'of 4 configured',
      iconBg:  'bg-emerald-100',
      iconCls: 'text-emerald-600',
    },
    {
      icon:    MessageCircle,
      label:   "Today's Interactions",
      value:   todayInteractions !== null ? String(todayInteractions) : '—',
      sub:     todayInteractions === 0 ? 'No conversations yet today' : 'Penny conversations logged',
      iconBg:  'bg-violet-100',
      iconCls: 'text-violet-600',
    },
    {
      icon:    Database,
      label:   'Data Source',
      value:   sfAuthenticated ? 'Connected' : 'Not Connected',
      sub:     sfAuthenticated ? 'Live from Salesforce' : 'Authentication required',
      iconBg:  sfAuthenticated ? 'bg-emerald-100' : 'bg-amber-100',
      iconCls: sfAuthenticated ? 'text-emerald-600' : 'text-amber-600',
    },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Penny Command Center
          </p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">Penny · AI Chief of Staff</h1>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Transition Trails' AI layer — capabilities, prompts, learner coaching, and intelligence.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusPills.map(p => (
              <div
                key={p.label}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium ${p.bg}`}
              >
                <span className="text-muted-foreground/60">{p.label}</span>
                <span className={p.color}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Live metrics grid ────────────────────────────────────────────── */}
        {metricsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-xl border border-border bg-muted/30 h-24" />
            ))}
          </div>
        ) : metricsError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5">
            <p className="text-[11px] text-amber-700">
              Unable to load live metrics. Check Salesforce connection.
            </p>
          </div>
        ) : !sfAuthenticated ? (
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              Connect Salesforce to see live metrics.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {metricCards.map(card => (
              <div key={card.label} className="rounded-xl border border-border bg-card p-4">
                <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.iconCls}`} />
                </div>
                <p className="text-2xl font-bold text-foreground mt-2 leading-none">{card.value}</p>
                <p className="text-[11px] font-medium text-muted-foreground mt-1">{card.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Navigation tiles ─────────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2.5">
            Explore
          </p>
          <div className="space-y-2">
            {NAV_TILES.map(t => (
              <button
                key={t.path}
                onClick={() => setLocation(t.path)}
                className="group w-full text-left rounded-lg border border-border bg-card p-3.5 hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                      <t.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[12px] font-semibold text-foreground">{t.label}</p>
                        {t.badge && (
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${t.badgeCls}`}>
                            {t.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{t.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Phase 1 status note ──────────────────────────────────────────── */}
        <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3.5">
          <div className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-medium text-violet-800 mb-0.5">Phase 1 POC active</p>
              <p className="text-[10px] text-violet-700/70 leading-snug">
                Penny runs on Gemini API with live Salesforce + Slack data access.
                Agentforce POC confirmed — Trail Quests and Assessments restored and active.
              </p>
            </div>
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
