import { ScrollArea } from '@/components/ui/scroll-area';
import { TERMS } from '@/config/terminology';
import { Target, Search as SearchIcon, ArrowRight } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useLocation } from 'wouter';
import { SEARCH_INDEX } from '@/data/globalSearchData';

// ── Derived workspace counts from live search index ───────────────────────────
const IDX_COUNTS = {
  program:   SEARCH_INDEX.filter(e => e.objectTypeId === 'program').length,
  penny:     SEARCH_INDEX.filter(e => e.objectTypeId === 'penny-capability').length,
  knowledge: SEARCH_INDEX.filter(e => ['knowledge-source', 'knowledge-article', 'standard'].includes(e.objectTypeId)).length,
  people:    SEARCH_INDEX.filter(e => ['person', 'role'].includes(e.objectTypeId)).length,
};

function HealthDot({ health }: { health?: string }) {
  const cls =
    health === 'healthy'         ? 'bg-[#E6F0EA]0' :
    health === 'needs-attention' ? 'bg-[#FFF3E0]0'   :
    health === 'incomplete'      ? 'bg-[#FBEAE6]0'    : 'bg-muted-foreground/30';
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />;
}

function EmptyContextState({ label }: { label: string }) {
  const { recentContexts, setActiveContext } = useAppContext();
  const [, setLocation] = useLocation();
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-xl">
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-1">No Active Context</p>
          <p className="text-[14px] text-foreground leading-relaxed mb-3">
            Set an active context from <strong>Global Search</strong> or any object profile to see {label} here.
          </p>
          <button
            onClick={() => setLocation('/search')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[14px] font-semibold hover:bg-primary/90 transition-colors"
          >
            <SearchIcon className="w-3 h-3" />
            Open Global Search
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentContexts.length > 0 && (
          <div>
            <p className="text-[14px] font-bold  text-muted-foreground/50 mb-2">Recent Contexts</p>
            <div className="space-y-1.5">
              {recentContexts.map(ctx => (
                <button
                  key={ctx.id}
                  onClick={() => setActiveContext(ctx)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors"
                >
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border shrink-0 ${ctx.categoryBg} ${ctx.categoryColor}`}>
                    {ctx.objectTypeName}
                  </span>
                  <span className="text-[14px] font-semibold text-foreground flex-1 truncate">{ctx.name}</span>
                  <HealthDot health={ctx.health} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function OverviewTab() {
  const { activeContext, recentContexts, setActiveContext } = useAppContext();
  const [, setLocation] = useLocation();

  const WORKSPACES = [
    { id:'program',    name:'Program & Curriculum', link:'/program',             filtered: !!activeContext, count: IDX_COUNTS.program,   unit: 'programs'        },
    { id:'penny',      name:`${TERMS.aiAssistant} AI`,             link:'/penny',               filtered: !!activeContext, count: IDX_COUNTS.penny,     unit: 'capabilities'    },
    { id:'knowledge',  name:'Knowledge',            link:'/knowledge',           filtered: !!activeContext, count: IDX_COUNTS.knowledge,  unit: 'sources'         },
    { id:'people',     name:'People & Access',      link:'/admin/people-access', filtered: !!activeContext, count: IDX_COUNTS.people,    unit: 'roles & people'  },
    { id:'collab',     name:'Collaboration',        link:'/collaboration',       filtered: !!activeContext, count: null,                   unit: 'channels active' },
    { id:'twin',       name:'Digital Twin',         link:'/digital-twin',        filtered: false,           count: null,                   unit: 'objects mapped'  },
    { id:'search',     name:'Global Search',        link:'/search',              filtered: !!activeContext, count: null,                   unit: 'cross-workspace' },
    { id:'governance', name:'Governance',           link:'/governance',          filtered: false,           count: null,                   unit: 'Phase 2'        },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5 max-w-3xl">
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-[14px] font-bold  text-primary/60 mb-1">Workspace Context Engine</p>
          <p className="text-[14px] text-foreground leading-relaxed">
            Once you set an active context — a program, capability, role, or knowledge source — relevant workspaces
            filter to that object automatically. Use Global Search or any object profile to set context.
          </p>
        </div>

        {activeContext ? (
          <div className="rounded-lg border border-[#9FC3AE] bg-[#E6F0EA]/50 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-bold  text-[#2F6B3F] mb-1.5">Active Context</p>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border ${activeContext.categoryBg} ${activeContext.categoryColor}`}>
                    {activeContext.objectTypeName}
                  </span>
                  <HealthDot health={activeContext.health} />
                </div>
                <h2 className="text-[15px] font-semibold text-foreground">{activeContext.name}</h2>
                {activeContext.owner && (
                  <p className="text-[14px] text-muted-foreground mt-0.5">Owner: {activeContext.owner}</p>
                )}
              </div>
              <button
                onClick={() => setLocation(activeContext.workspaceLink)}
                className="shrink-0 text-[14px] font-bold text-primary hover:text-primary/80 transition-colors"
              >
                View Workspace →
              </button>
            </div>
            <button
              onClick={() => setActiveContext(null)}
              className="text-[14px] text-muted-foreground hover:text-[#A93F2F] font-semibold transition-colors"
            >
              Clear Context
            </button>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-border bg-background p-6 text-center">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mx-auto mb-2.5">
              <Target className="w-4.5 h-4.5 text-muted-foreground/40" />
            </div>
            <h3 className="text-[14px] font-semibold text-foreground mb-1">No active context</h3>
            <p className="text-[14px] text-muted-foreground mb-3 max-w-[280px] mx-auto leading-relaxed">
              Set a context from Global Search — any program, capability, knowledge source, or object — to filter workspaces automatically.
            </p>
            <button
              onClick={() => setLocation('/search')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[14px] font-semibold hover:bg-primary/90 transition-colors"
            >
              <SearchIcon className="w-3 h-3" />
              Set Context via Search
            </button>
          </div>
        )}

        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-2">Workspace Coverage</p>
          <div className="grid grid-cols-2 gap-2">
            {WORKSPACES.map(ws => (
              <button
                key={ws.id}
                onClick={() => setLocation(ws.link)}
                className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/40 text-left transition-colors"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ws.filtered ? 'bg-[#2F6B3F]' : 'bg-muted-foreground/20'}`} />
                  <span className="text-[14px] text-foreground font-medium flex-1 truncate">{ws.name}</span>
                  {ws.filtered && (
                    <span className="text-[14px] font-bold text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded px-1 py-0.5 shrink-0">On</span>
                  )}
                </div>
                <p className="text-[14px] text-muted-foreground pl-3.5">
                  {ws.count !== null
                    ? <><span className="font-semibold text-foreground">{ws.count}</span> {ws.unit}</>
                    : <span className="italic text-muted-foreground/60">{ws.unit}</span>
                  }
                </p>
              </button>
            ))}
          </div>
        </div>

        {recentContexts.length > 0 && (
          <div>
            <p className="text-[14px] font-bold  text-muted-foreground/50 mb-2">Recent Contexts</p>
            <div className="space-y-1.5">
              {recentContexts.map(ctx => (
                <button
                  key={ctx.id}
                  onClick={() => setActiveContext(ctx)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/40 text-left transition-colors"
                >
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border shrink-0 ${ctx.categoryBg} ${ctx.categoryColor}`}>
                    {ctx.objectTypeName}
                  </span>
                  <span className="text-[14px] font-semibold text-foreground truncate flex-1">{ctx.name}</span>
                  <HealthDot health={ctx.health} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function RelationshipsTab() {
  const { activeContext } = useAppContext();
  const [, setLocation] = useLocation();

  if (!activeContext) return <EmptyContextState label="relationship data" />;

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-2xl">
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-1">Relationships</p>
          <p className="text-[14px] font-semibold text-foreground mb-0.5">{activeContext.name}</p>
          <p className="text-[14px] text-muted-foreground">{activeContext.objectTypeName} · Relationship map</p>
        </div>

        {/* Direction from Global Search */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-[14px] text-foreground leading-relaxed">
            Full relationship exploration — including upstream governance, downstream cohorts and sprints, {TERMS.aiAssistant} capability linkages,
            and Salesforce mappings — is available in the <strong>Global Search</strong> relationship explorer.
          </p>
          <button
            onClick={() => setLocation('/search')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[14px] font-semibold hover:bg-primary/90 transition-colors"
          >
            <SearchIcon className="w-3 h-3" />
            Explore in Global Search
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Common relationship types for this object */}
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-2">Common relationship types for {activeContext.objectTypeName}</p>
          <div className="space-y-1">
            {[
              { direction: 'up',   label: 'Governance blueprint',     type: 'Governance' },
              { direction: 'up',   label: 'Knowledge sources',         type: 'Knowledge Source' },
              { direction: 'up',   label: 'Owning role / team',        type: 'Role' },
              { direction: 'down', label: 'Salesforce record mapping', type: 'SF Object' },
              { direction: 'down', label: `${TERMS.aiAssistant} capabilities`, type: `${TERMS.aiAssistant} Capability` },
              { direction: 'down', label: 'Program artifacts',         type: 'Artifact' },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                <span className={`text-[14px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                  r.direction === 'up'
                    ? 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]'
                    : 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]'
                }`}>
                  {r.direction === 'up' ? '↑ upstream' : '↓ downstream'}
                </span>
                <span className="text-[14px] text-foreground flex-1">{r.label}</span>
                <span className="text-[14px] text-muted-foreground/60 shrink-0">{r.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

function HealthTab() {
  const { activeContext } = useAppContext();
  if (!activeContext) return <EmptyContextState label="health indicators" />;

  const indicators = [
    { label: 'Object Health',        health: activeContext.health ?? 'unknown', note: activeContext.health?.replace(/-/g, ' ') ?? 'Unknown' },
    { label: 'Governance Status',    health: 'healthy' as const,           note: 'Review cycle current' },
    { label: 'Blueprint Compliance', health: 'healthy' as const,           note: 'Compliant with relevant blueprint' },
    { label: 'Salesforce Sync',      health: 'healthy' as const,           note: 'SF record up to date' },
    {
      label: `${TERMS.aiAssistant} Integration`,
      health: activeContext.objectTypeName === 'Program' ? 'healthy' as const : 'needs-attention' as const,
      note:   activeContext.objectTypeName === 'Program' ? 'Capabilities active' : `Verify ${TERMS.aiAssistant} linkage`,
    },
    { label: 'Knowledge Sources',    health: 'healthy' as const,           note: 'Trust reviews current' },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-2xl">
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-1">Health</p>
          <p className="text-[14px] font-semibold text-foreground mb-0.5">{activeContext.name}</p>
          <p className="text-[14px] text-muted-foreground">Phase 1 baseline indicators. Object health reflects live data; remaining indicators are Phase 1 governance baselines.</p>
        </div>
        <div className="rounded-lg border border-border divide-y divide-border/60">
          {indicators.map(ind => (
            <div key={ind.label} className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <HealthDot health={ind.health} />
                <span className="text-[14px] font-medium text-foreground">{ind.label}</span>
              </div>
              <span className="text-[14px] text-muted-foreground capitalize">{ind.note}</span>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

function ActivityTab() {
  const { activeContext, recentContexts } = useAppContext();

  // Only show session-derived events — no hardcoded historical dates
  const events = [
    ...(activeContext ? [{
      type: 'context',
      label: 'Context active',
      note: `"${activeContext.name}" is set as your active context`,
      time: 'Now',
    }] : [{
      type: 'info',
      label: 'No active context',
      note: 'Set a context from Global Search to see context-filtered activity',
      time: 'Now',
    }]),
    ...(recentContexts.length > 0 ? [{
      type: 'context',
      label: 'Context history',
      note: `${recentContexts.length} recent context${recentContexts.length !== 1 ? 's' : ''} this session`,
      time: 'This session',
    }] : []),
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-2xl">
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-1">Activity</p>
          <p className="text-[14px] text-muted-foreground">Session context activity. Full audit history is available in Administration.</p>
        </div>
        {events.length > 0 ? (
          <div className="space-y-1.5">
            {events.map((ev, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border bg-background">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  ev.type === 'context' ? 'bg-primary' : 'bg-muted-foreground/30'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-foreground">{ev.label}</p>
                  <p className="text-[14px] text-muted-foreground">{ev.note}</p>
                </div>
                <span className="text-[14px] text-muted-foreground/50 shrink-0 whitespace-nowrap">{ev.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-muted-foreground">No activity this session.</p>
        )}
      </div>
    </ScrollArea>
  );
}

function ImpactTab() {
  const { activeContext } = useAppContext();
  if (!activeContext) return <EmptyContextState label="impact analysis" />;

  const impacts = [
    { workspace: 'Program & Curriculum', filter: `Programs containing or related to "${activeContext.name}"`,          active: true,  link: '/program'            },
    { workspace: `${TERMS.aiAssistant} AI`,             filter: `Capabilities used in or related to "${activeContext.name}"`,         active: true,  link: '/penny'              },
    { workspace: 'Knowledge',            filter: `Sources referenced by or supporting "${activeContext.name}"`,        active: true,  link: '/knowledge'          },
    { workspace: 'People & Access',      filter: `Roles and personas associated with "${activeContext.name}"`,         active: true,  link: '/admin/people-access' },
    { workspace: 'Collaboration',        filter: `Channels and systems active for "${activeContext.name}"`,            active: true,  link: '/collaboration'       },
    { workspace: 'Global Search',        filter: `Pre-filtered results for "${activeContext.name}"`,                   active: true,  link: '/search'              },
    { workspace: 'Digital Twin',         filter: `Twin nodes related to "${activeContext.name}"`,                      active: false, link: '/digital-twin'        },
    { workspace: 'Governance',           filter: `Governance records for object type: ${activeContext.objectTypeName}`, active: false, link: '/governance'         },
  ];

  const [, setLocation] = useLocation();
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-2xl">
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-1">Impact</p>
          <p className="text-[14px] text-muted-foreground">How setting <strong className="text-foreground">{activeContext.name}</strong> as context affects each workspace.</p>
        </div>
        {impacts.map(imp => (
          <button
            key={imp.workspace}
            onClick={() => setLocation(imp.link)}
            className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/20 ${
              imp.active ? 'border-[#9FC3AE] bg-[#E6F0EA]/40' : 'border-border bg-background'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[14px] font-semibold text-foreground">{imp.workspace}</p>
              {imp.active ? (
                <span className="text-[14px] font-bold text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded px-1.5 py-0.5">Active</span>
              ) : (
                <span className="text-[14px] font-bold text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5">Phase 2</span>
              )}
            </div>
            <p className="text-[14px] text-muted-foreground">{imp.filter}</p>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

export default function ContextHub() {
  const [location] = useLocation();
  if (location.startsWith('/context/relationships')) return <RelationshipsTab />;
  if (location.startsWith('/context/health'))         return <HealthTab />;
  if (location.startsWith('/context/activity'))       return <ActivityTab />;
  if (location.startsWith('/context/impact'))         return <ImpactTab />;
  return <OverviewTab />;
}
