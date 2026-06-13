import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain, Layers, MessageSquare, Users, BarChart2,
  Activity, ChevronRight, Sparkles,
} from 'lucide-react';
import { pennyCapabilities } from '@/data/pennyCapabilities';

const STATUS_PILLS = [
  { label: 'Gemini API',  value: 'Live',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { label: 'Slack',       value: 'Live POC', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { label: 'Salesforce',  value: 'Live',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { label: 'Agentforce',  value: 'Phase 2', color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200' },
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
    icon: Activity,
    label: 'Health',
    path: '/penny/health',
    desc: 'API uptime, model response quality metrics, and integration health indicators',
  },
];

export default function PennyCommandCenter() {
  const [, setLocation] = useLocation();

  const total     = pennyCapabilities.length;
  const confirmed = pennyCapabilities.filter(c => c.confidence === 'confirmed').length;
  const inReview  = pennyCapabilities.filter(c => c.confidence === 'needs-review').length;

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
            {STATUS_PILLS.map(p => (
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

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: total,     label: 'Capabilities', color: 'text-violet-600' },
            { value: confirmed, label: 'Confirmed',     color: 'text-emerald-600' },
            { value: inReview,  label: 'In Review',     color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center px-3 py-3 rounded-lg border border-border bg-card">
              <span className={`text-xl font-semibold ${s.color}`}>{s.value}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 text-center leading-tight">{s.label}</span>
            </div>
          ))}
        </div>

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
                Agentforce upgrade and RAG knowledge retrieval are Phase 2 priorities.
              </p>
            </div>
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
