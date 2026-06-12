import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, GitBranch, Activity, Clock, Zap, Search as SearchIcon } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useLocation } from 'wouter';

function HealthDot({ health }: { health?: string }) {
  const cls =
    health === 'healthy'         ? 'bg-emerald-500' :
    health === 'needs-attention' ? 'bg-amber-500'   :
    health === 'incomplete'      ? 'bg-rose-500'    : 'bg-gray-300';
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />;
}

function EmptyContextState({ label }: { label: string }) {
  const { recentContexts, setActiveContext } = useAppContext();
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4 max-w-xl">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] font-bold text-amber-700 uppercase mb-1">No Active Context</p>
          <p className="text-[12px] text-amber-800 leading-relaxed">
            Set an active context from <strong>Global Search</strong> or any Universal Object Profile to see {label} here.
            The Workspace Context Engine will automatically filter and surface relevant information across all workspaces.
          </p>
        </div>
        {recentContexts.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-2">Recent Contexts — Click to Restore</p>
            <div className="space-y-2">
              {recentContexts.map(ctx => (
                <button
                  key={ctx.id}
                  onClick={() => setActiveContext(ctx)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-white hover:bg-muted/40 transition-colors"
                >
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold border shrink-0 ${ctx.categoryBg} ${ctx.categoryColor}`}>
                    {ctx.objectTypeName}
                  </span>
                  <span className="text-[12px] font-semibold text-foreground flex-1 truncate">{ctx.name}</span>
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
    { id:'program',    name:'Program & Curriculum', link:'/program',             filtered: !!activeContext, count: 5,  unit: 'programs'        },
    { id:'penny',      name:'Penny AI',             link:'/penny',               filtered: !!activeContext, count: 17, unit: 'capabilities'    },
    { id:'knowledge',  name:'Knowledge',            link:'/knowledge',           filtered: !!activeContext, count: 12, unit: 'sources'         },
    { id:'people',     name:'People & Access',      link:'/admin/people-access', filtered: !!activeContext, count: 4,  unit: 'roles defined'   },
    { id:'collab',     name:'Collaboration',        link:'/collaboration',       filtered: !!activeContext, count: 3,  unit: 'channels active' },
    { id:'twin',       name:'Digital Twin',         link:'/digital-twin',        filtered: false,           count: 40, unit: 'objects mapped'  },
    { id:'search',     name:'Global Search',        link:'/search',              filtered: !!activeContext, count: null, unit: 'cross-workspace' },
    { id:'governance', name:'Governance',           link:'/governance',          filtered: false,           count: null, unit: 'Phase 2'        },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-5 max-w-3xl">
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-[11px] font-bold text-primary uppercase mb-1">Workspace Context Engine</p>
          <p className="text-[12px] text-foreground leading-relaxed">
            The Context Engine creates a persistent, cross-workspace view of any Trail OS object. Once you set an active context —
            a program, capability, role, knowledge source, or any UOM object — relevant workspaces filter to that object automatically.
            Use Global Search or any Universal Object Profile to set context.
          </p>
        </div>

        {activeContext ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Active Context</p>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold border ${activeContext.categoryBg} ${activeContext.categoryColor}`}>
                    {activeContext.objectTypeName}
                  </span>
                </div>
                <h2 className="text-[15px] font-semibold text-foreground">{activeContext.name}</h2>
              </div>
              <div className="text-right shrink-0">
                <HealthDot health={activeContext.health} />
                <p className="text-[10px] text-muted-foreground mt-1">Owner: {activeContext.owner}</p>
                <button
                  onClick={() => setLocation(activeContext.workspaceLink)}
                  className="mt-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  View Workspace →
                </button>
              </div>
            </div>
            <button
              onClick={() => setActiveContext(null)}
              className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold transition-colors"
            >
              Clear Context
            </button>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-border bg-background p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Target className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <h3 className="text-[13px] font-semibold text-foreground mb-1">No active context</h3>
            <p className="text-[11px] text-muted-foreground mb-4 max-w-[280px] mx-auto leading-relaxed">
              Set a context from Global Search — any program, capability, knowledge source, or object — to filter workspaces automatically.
            </p>
            <button
              onClick={() => setLocation('/search')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors"
            >
              <SearchIcon className="w-3 h-3" />
              Set Context via Search
            </button>
          </div>
        )}

        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-2">Workspace Coverage</p>
          <div className="grid grid-cols-2 gap-2">
            {WORKSPACES.map(ws => (
              <button
                key={ws.id}
                onClick={() => setLocation(ws.link)}
                className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border border-border bg-white hover:bg-muted/40 text-left transition-colors"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ws.filtered ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                  <span className="text-[12px] text-foreground font-medium flex-1 truncate">{ws.name}</span>
                  {ws.filtered && (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5 shrink-0">Context</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground pl-3.5">
                  {ws.count !== null
                    ? <><span className="font-semibold text-foreground">{ws.count}</span> {ws.unit}</>
                    : <span className="italic">{ws.unit}</span>
                  }
                </p>
              </button>
            ))}
          </div>
        </div>

        {recentContexts.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-2">Recent Contexts</p>
            <div className="space-y-1.5">
              {recentContexts.map(ctx => (
                <button
                  key={ctx.id}
                  onClick={() => setActiveContext(ctx)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-white hover:bg-muted/40 text-left transition-colors"
                >
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold border shrink-0 ${ctx.categoryBg} ${ctx.categoryColor}`}>
                    {ctx.objectTypeName}
                  </span>
                  <span className="text-[12px] font-semibold text-foreground truncate flex-1">{ctx.name}</span>
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
  if (!activeContext) return <EmptyContextState label="relationship data" />;
  const MOCK_RELATIONSHIPS = [
    { name:'Program Blueprint v2',    direction:'upstream', type:'Governance', relation:'governed by' },
    { name:'Cohort 2',                direction:'downstream', type:'Cohort', relation:'contains' },
    { name:'Sprint 3 — Resume',       direction:'downstream', type:'Sprint', relation:'has sprint' },
    { name:'Resume Review (Penny)',   direction:'downstream', type:'Penny Capability', relation:'activates' },
    { name:'Salesforce Program Record', direction:'downstream', type:'SF Object', relation:'maps to' },
    { name:'Resume Writing Guide',    direction:'upstream', type:'Knowledge Source', relation:'sources from' },
    { name:'Program Director',        direction:'upstream', type:'Role', relation:'owned by' },
  ];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-2xl">
        <p className="text-[12px] text-muted-foreground">Object relationships for <strong>{activeContext.name}</strong> ({activeContext.objectTypeName}).</p>
        <div className="space-y-2">
          {MOCK_RELATIONSHIPS.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-white">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                r.direction === 'upstream' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {r.direction === 'upstream' ? '↑ upstream' : '↓ downstream'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground truncate">{r.name}</p>
                <p className="text-[10px] text-muted-foreground">{r.relation}</p>
              </div>
              <span className="text-[9px] font-bold bg-muted border border-border rounded px-1.5 py-0.5 text-muted-foreground shrink-0">{r.type}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/60">Navigate to Global Search for the full relationship explorer.</p>
      </div>
    </ScrollArea>
  );
}

function HealthTab() {
  const { activeContext } = useAppContext();
  if (!activeContext) return <EmptyContextState label="health indicators" />;
  const indicators = [
    { label:'Object Health',       health: activeContext.health ?? 'unknown', note: activeContext.health?.replace('-',' ') ?? 'Unknown' },
    { label:'Governance Status',   health:'healthy' as const,           note:'Review cycle current' },
    { label:'Blueprint Compliance',health:'healthy' as const,           note:'Compliant with relevant blueprint' },
    { label:'Salesforce Sync',     health:'healthy' as const,           note:'SF record up to date' },
    { label:'Penny Integration',   health: activeContext.objectTypeName === 'Program' ? 'healthy' as const : 'needs-attention' as const, note: activeContext.objectTypeName === 'Program' ? 'Capabilities active' : 'Verify Penny linkage' },
    { label:'Knowledge Sources',   health:'healthy' as const,           note:'Trust reviews current' },
  ];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-2xl">
        <p className="text-[12px] text-muted-foreground">Health indicators for <strong>{activeContext.name}</strong>.</p>
        {indicators.map(ind => (
          <div key={ind.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
            <div className="flex items-center gap-2.5">
              <HealthDot health={ind.health} />
              <span className="text-[12px] font-medium text-foreground">{ind.label}</span>
            </div>
            <span className="text-[11px] text-muted-foreground capitalize">{ind.note}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function ActivityTab() {
  const { activeContext, recentContexts } = useAppContext();
  const events = [
    { time:'Just now',    type:'context', label:'Context set', note: activeContext ? `"${activeContext.name}" set as active context` : 'No active context' },
    ...(recentContexts.length > 0 ? [{ time:'This session', type:'context', label:'Context history', note:`${recentContexts.length} recent context${recentContexts.length !== 1 ? 's' : ''}` }] : []),
    { time:'Jun 2025',    type:'governance', label:'Review completed', note:'Q2 governance review completed for all object types' },
    { time:'Jun 2025',    type:'penny',      label:'Capability activated', note:'Resume Review capability promoted to Operational' },
    { time:'May 2025',    type:'program',    label:'Cohort started',  note:'Foundations Trail Cohort 2 Week 1 delivered' },
    { time:'May 2025',    type:'knowledge',  label:'Source updated',  note:'Salesforce Foundations Trail KB refreshed' },
  ];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-2 max-w-2xl">
        <p className="text-[12px] text-muted-foreground">Context-related events and activity for the current session and recent history.</p>
        {events.map((ev, i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border bg-white">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
              ev.type === 'context' ? 'bg-primary' : ev.type === 'governance' ? 'bg-orange-400' :
              ev.type === 'penny' ? 'bg-pink-400' : 'bg-emerald-400'
            }`} />
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-foreground">{ev.label}</p>
              <p className="text-[11px] text-muted-foreground">{ev.note}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/60 shrink-0">{ev.time}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function ImpactTab() {
  const { activeContext } = useAppContext();
  if (!activeContext) return <EmptyContextState label="impact analysis" />;
  const impacts = [
    { workspace:'Program & Curriculum', filter:`Programs containing or related to "${activeContext.name}"`,         active:true,  link:'/program'       },
    { workspace:'Penny AI',             filter:`Capabilities used in or related to "${activeContext.name}"`,        active:true,  link:'/penny'         },
    { workspace:'Knowledge',            filter:`Sources referenced by or supporting "${activeContext.name}"`,       active:true,  link:'/knowledge'     },
    { workspace:'People & Access',      filter:`Roles and personas associated with "${activeContext.name}"`,        active:true,  link:'/admin/people-access' },
    { workspace:'Collaboration',        filter:`Channels and systems active for "${activeContext.name}"`,           active:true,  link:'/collaboration' },
    { workspace:'Global Search',        filter:`Pre-filtered results for "${activeContext.name}"`,                  active:true,  link:'/search'        },
    { workspace:'Digital Twin',         filter:`Twin nodes related to "${activeContext.name}"`,                     active:false, link:'/digital-twin'  },
    { workspace:'Governance',           filter:`Governance records for object type: ${activeContext.objectTypeName}`, active:false, link:'/governance'  },
  ];
  const [, setLocation] = useLocation();
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-2xl">
        <p className="text-[12px] text-muted-foreground">How setting <strong>{activeContext.name}</strong> as context affects each workspace.</p>
        {impacts.map(imp => (
          <button
            key={imp.workspace}
            onClick={() => setLocation(imp.link)}
            className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/20 ${imp.active ? 'border-emerald-200 bg-emerald-50/50' : 'border-border bg-white'}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[12px] font-bold text-foreground">{imp.workspace}</p>
              {imp.active ? (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">Context Active</span>
              ) : (
                <span className="text-[9px] font-bold text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5">Planned</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{imp.filter}</p>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

export default function ContextHub() {
  return (
    <HubShell
      title="Workspace Context Engine"
      icon={Target}
      description="Set an active context from any UOM object and the Context Engine surfaces relevant relationships, health, activity, and workspace impact across all of Trail OS."
      badge="Phase 1"
      tabs={[
        { id:'overview',       label:'Overview',      path:'/context',              icon:Target,    content:<OverviewTab /> },
        { id:'relationships',  label:'Relationships', path:'/context/relationships',icon:GitBranch, content:<RelationshipsTab /> },
        { id:'health',         label:'Health',        path:'/context/health',       icon:Activity,  content:<HealthTab /> },
        { id:'activity',       label:'Activity',      path:'/context/activity',     icon:Clock,     content:<ActivityTab /> },
        { id:'impact',         label:'Impact',        path:'/context/impact',       icon:Zap,       content:<ImpactTab /> },
      ]}
    />
  );
}
