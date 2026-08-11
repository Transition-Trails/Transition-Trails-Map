import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import { trailOsCapabilities } from '@/data/trailOsCapabilities';
import { TERMS } from '@/config/terminology';
import {
  Database, Layers, BarChart2, Workflow, Monitor,
  ChevronRight, AlertTriangle,
} from 'lucide-react';

type ActiveTab = 'capabilities' | 'delivery' | 'analytics';

const DELIVERY_STEPS: Array<{ step: string; detail: string }> = [
  { step: 'Intake',              detail: 'Applications reviewed, screened, and placed into cohorts via structured intake flows.' },
  { step: 'Orientation',         detail: `Learners onboarded to platform expectations, tools, cohort norms, and ${TERMS.aiAssistant}.` },
  { step: 'Learning Sprints',    detail: 'Curriculum delivered in timed sprints with materials, coaching, and peer sessions.' },
  { step: 'Project Work',        detail: 'Applied projects, resume work, and skills demonstrations tied to program outcomes.' },
  { step: 'Review & Assessment', detail: `Learner progress reviewed against outcomes framework with ${TERMS.aiAssistant} insights.` },
  { step: 'Outcomes Capture',    detail: 'Placement, completion, and learner outcome data captured for reporting.' },
  { step: 'Alumni Engagement',   detail: 'Continued coaching support and alumni network pathways post-program.' },
];

const ANALYTICS_STATS = [
  { label: 'Active Learners',          value: '48',  note: 'current cohorts',  cls: 'text-primary' },
  { label: 'Programs Running',         value: '3',   note: 'active delivery',  cls: 'text-foreground' },
  { label: 'Placement Rate (90-day)',  value: '67%', note: 'rolling average',  cls: 'text-[#2F6B3F]' },
  { label: 'Avg Cohort Completion',    value: '82%', note: 'per cohort',       cls: 'text-foreground' },
  { label: 'Coach-to-Learner Ratio',   value: '1:8', note: 'across programs',  cls: 'text-muted-foreground' },
  { label: 'Source Documents Active',  value: '14',  note: 'knowledge base',   cls: 'text-foreground' },
];

const PLATFORM_AREAS = [
  { id: 'intake',    label: 'Intake Coordination', description: 'Structured intake flows for program applications, screening, and cohort placement.',           ring: 'border-[#7FAFC6]',    bg: 'bg-[#EDF5F8]/60',    tag: 'text-[#2F6F7E]'    },
  { id: 'delivery',  label: 'Project Delivery',    description: 'Sprint-based delivery infrastructure — curriculum, coaching sessions, milestone tracking.',     ring: 'border-[#9FC3AE]', bg: 'bg-[#E6F0EA]/60', tag: 'text-[#2F6B3F]' },
  { id: 'readiness', label: 'Org Readiness',        description: 'Org capability mapping, readiness scoring, and platform health monitoring.',                  ring: 'border-[#FFD08A]',  bg: 'bg-[#FFF3E0]/60',  tag: 'text-[#CC8400]'  },
  { id: 'coaching',  label: 'Coach Visibility',     description: 'Coach dashboards, learner health signals, and session support across all programs.',          ring: 'border-[#7FAFC6]', bg: 'bg-[#EDF5F8]/60', tag: 'text-[#2F6F7E]' },
  { id: 'analytics', label: 'Analytics',            description: `Cross-program metrics, placement rates, ${TERMS.aiAssistant} AI performance, and cohort health indicators.`, ring: 'border-[#7FAFC6]', bg: 'bg-[#EDF5F8]/60', tag: 'text-[#2F6F7E]' },
  { id: 'loops',     label: 'Delivery Loops',       description: 'Closed feedback loops from intake through alumni engagement for continuous improvement.',     ring: 'border-[#E8B9B4]',   bg: 'bg-[#FBEAE6]/60',   tag: 'text-[#A93F2F]'   },
];

export default function TrailOSOverview() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('capabilities');
  const { openSlackPanel, setSelectedItem } = useAppContext();
  const { isAdminOrAbove } = useTierFlags();

  const TABS: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'capabilities', label: 'Platform Capabilities', icon: Layers   },
    { id: 'delivery',     label: 'Delivery Loop',         icon: Workflow  },
    { id: 'analytics',    label: 'Platform Analytics',    icon: BarChart2 },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Compact header ── */}
      <div className="flex-shrink-0 flex items-start justify-between px-5 pt-3 pb-2.5 border-b bg-card">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-0.5">Platform Overview</p>
          <h1 className="text-[15px] font-semibold text-foreground leading-snug">Trail OS Overview</h1>
          <p className="text-[14px] text-muted-foreground mt-0.5 max-w-lg leading-relaxed">
            Transition Trails' operating platform — intake coordination, project delivery, org readiness, coach visibility, analytics, and delivery loops.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4 mt-0.5">
          <button
            onClick={() => openSlackPanel({ context: 'home', title: 'Trail OS Overview', subtitle: TERMS.signalSubtitle('Trail OS Overview') })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[14px] font-semibold text-muted-foreground bg-white border border-border/70 hover:text-foreground hover:border-border transition-colors"
          >
            <Monitor className="w-3 h-3" />
            {TERMS.trailSignals}
          </button>
          {isAdminOrAbove && (
            <span className="flex items-center gap-1 bg-[#FFF3E0] border border-[#FFD08A] text-[#CC8400] text-[14px] font-semibold px-2 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              Prototype
            </span>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex-shrink-0 flex items-end gap-0 px-5 border-b bg-card">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[14px] font-medium rounded-t transition-colors border-b-2 -mb-px ${
                active
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">

          {/* ── Platform Capabilities ── */}
          {activeTab === 'capabilities' && (
            <>
              <div>
                <p className="text-[14px] font-bold  text-muted-foreground/50 mb-2.5">What Trail OS Does</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {PLATFORM_AREAS.map(area => (
                    <div key={area.id} className={`p-3 rounded-lg border ${area.ring} ${area.bg}`}>
                      <p className={`text-[14px] font-bold  mb-1 ${area.tag}`}>{area.label}</p>
                      <p className="text-[14px] text-muted-foreground leading-snug">{area.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[14px] font-bold  text-muted-foreground/50 mb-2.5">
                  Capability Registry{' '}
                  <span className="font-normal normal-case tracking-normal text-muted-foreground/40">({trailOsCapabilities.length})</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {trailOsCapabilities.map(cap => (
                    <button
                      key={cap.id}
                      onClick={() => setSelectedItem({ type: 'trailOs', id: cap.id, data: cap })}
                      className="text-left p-3 rounded-lg border bg-white/80 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <Database className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-[14px] font-semibold text-foreground leading-snug">{cap.name}</p>
                      </div>
                      <p className="text-[14px] text-muted-foreground leading-snug line-clamp-2 pl-5">{cap.description}</p>
                      {cap.programs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 pl-5">
                          {cap.programs.slice(0, 2).map(p => (
                            <Badge key={p} variant="secondary" className="text-[14px] px-1.5 py-0">{p}</Badge>
                          ))}
                          {cap.programs.length > 2 && (
                            <Badge variant="secondary" className="text-[14px] px-1.5 py-0">+{cap.programs.length - 2}</Badge>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1.5 pl-5 text-[14px] text-muted-foreground/50 group-hover:text-primary transition-colors">
                        <span>Knowledge Brief</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Delivery Loop ── */}
          {activeTab === 'delivery' && (
            <>
              <div>
                <p className="text-[14px] font-bold  text-muted-foreground/50 mb-0.5">Learner Journey</p>
                <p className="text-[14px] text-muted-foreground">End-to-end delivery loop from intake to alumni engagement.</p>
              </div>

              <div className="rounded-xl border bg-white p-5 overflow-x-auto">
                <div className="flex items-center min-w-max">
                  {DELIVERY_STEPS.map(({ step }, i) => (
                    <div key={step} className="flex items-center">
                      <div className="flex flex-col items-center text-center w-24">
                        <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center mb-2 text-sm font-bold text-muted-foreground border-2 border-transparent hover:border-primary hover:text-primary hover:bg-primary/10 cursor-pointer transition-all">
                          {i + 1}
                        </div>
                        <span className="text-[14px] font-medium text-foreground leading-tight">{step}</span>
                      </div>
                      {i < DELIVERY_STEPS.length - 1 && (
                        <div className="w-6 h-px bg-border/60 mx-1 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DELIVERY_STEPS.map(({ step, detail }, i) => (
                  <div key={step} className="p-3 rounded-lg border bg-white/80 border-border/60">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[14px] font-bold bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-[14px] font-semibold text-foreground">{step}</p>
                    </div>
                    <p className="text-[14px] text-muted-foreground leading-snug pl-7">{detail}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Platform Analytics ── */}
          {activeTab === 'analytics' && (
            <>
              <div>
                <p className="text-[14px] font-bold  text-muted-foreground/50 mb-0.5">Platform Metrics</p>
                <p className="text-[14px] text-muted-foreground">Illustrative planning data — not live. Live metrics will connect in Phase 2.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {ANALYTICS_STATS.map(stat => (
                  <div key={stat.label} className="p-3 rounded-lg border bg-white/80 border-border/60">
                    <p className="text-[14px] font-medium text-muted-foreground  mb-1 leading-tight">{stat.label}</p>
                    <p className={`text-[24px] font-bold leading-none ${stat.cls}`}>{stat.value}</p>
                    <p className="text-[14px] text-muted-foreground/60 mt-1">{stat.note}</p>
                    <div className="h-1.5 w-full bg-muted/40 rounded-full mt-2.5 overflow-hidden">
                      <div className="h-full bg-primary/25 w-2/3 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </ScrollArea>
    </div>
  );
}
