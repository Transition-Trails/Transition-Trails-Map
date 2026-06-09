import { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { ObjectWorkspace, HealthDot } from '@/components/workspace/ObjectWorkspace';
import type { WorkspaceItem, WorkspaceTab, WorkspaceHealth } from '@/components/workspace/ObjectWorkspace';
import type { CommProvider } from '@/data/commProviders';
import { STATUS_CONFIG, type Integration } from '@/data/integrationReadinessData';

type IntegrationSystem = Integration;
type SystemItem = (CommProvider & { _kind: 'comm' }) | (IntegrationSystem & { _kind: 'integration' });

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 w-32 shrink-0 mt-0.5">{label}</span>
      <span className="text-[12px] text-foreground flex-1">{value}</span>
    </div>
  );
}

function OverviewTab({ sys }: { sys: SystemItem }) {
  const isComm = sys._kind === 'comm';
  const comm = sys as CommProvider;
  const integ = sys as IntegrationSystem;
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-3xl">
        {isComm ? (
          <>
            <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
              <InfoRow label="Type"           value={comm.slug} />
              <InfoRow label="Status"         value={comm.status} />
              <InfoRow label="Primary Use"    value={(comm as any).primaryUse ?? 'Team communication and coordination'} />
              <InfoRow label="Route Count"    value={(comm as any).routeCount ?? 'See Channels tab'} />
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{(comm as any).description ?? 'Communication provider for Trail OS teams and cohorts.'}</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                STATUS_CONFIG[integ.status]?.cls ?? 'bg-muted text-muted-foreground border-border'
              }`}>{integ.status}</span>
            </div>
            <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
              <InfoRow label="Domain"      value={integ.domain} />
              <InfoRow label="Status"      value={integ.status} />
              <InfoRow label="Owner"       value={integ.owner} />
              <InfoRow label="Priority"    value={integ.priority} />
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{integ.description}</p>
          </>
        )}
      </div>
    </ScrollArea>
  );
}

function ReadinessTab({ sys }: { sys: SystemItem }) {
  const isComm = sys._kind === 'comm';
  const integ = sys as IntegrationSystem;
  const checks = isComm ? [
    { label:'Provider Connected',    status:'healthy' as const, note:'Active connection confirmed' },
    { label:'Channel Architecture',  status:'healthy' as const, note:'Naming conventions documented' },
    { label:'Penny Broadcasts',      status:'healthy' as const, note:'Broadcast routing configured' },
    { label:'Template Library',      status:'healthy' as const, note:'Message templates published' },
    { label:'Webhook Routing',       status:'needs-attention' as const, note:'Advanced routing planned for Q3 2025' },
  ] : [
    { label:'API Connection',        status: (integ.status === 'Prototype' ? 'healthy' : integ.status === 'Future' ? 'incomplete' : 'needs-attention') as WorkspaceHealth, note: integ.status },
    { label:'Authentication',        status: (integ.status === 'Prototype' ? 'healthy' : 'incomplete') as WorkspaceHealth, note: integ.status === 'Prototype' ? 'OAuth configured' : 'Not yet configured' },
    { label:'Data Mapping',          status: (integ.status === 'Prototype' ? 'healthy' : 'needs-attention') as WorkspaceHealth, note: `${integ.fieldMappings?.length ?? 0} field mappings defined` },
    { label:'Error Handling',        status: (integ.status === 'Prototype' ? 'healthy' : 'incomplete') as WorkspaceHealth, note: integ.status === 'Prototype' ? 'Retry logic implemented' : 'Not yet implemented' },
    { label:'SLA Monitoring',        status: 'needs-attention' as WorkspaceHealth, note: 'SLA not yet defined' },
  ];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        {checks.map(c => (
          <div key={c.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
            <div className="flex items-center gap-2.5">
              <HealthDot health={c.status} />
              <span className="text-[12px] font-medium text-foreground">{c.label}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{c.note}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function ObjectMappingTab({ sys }: { sys: SystemItem }) {
  const isComm = sys._kind === 'comm';
  const comm = sys as CommProvider;
  const mappings = isComm ? (comm as any).channels ?? ['#foundations-cohort-2','#foundations-coaches','#guided-trail','#penny-qa','#team-general'] :
    ((sys as IntegrationSystem) as any).objectMappings ?? ['Program__c','Program_Engagement__c','Contact','Task','Campaign'];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        <p className="text-[12px] text-muted-foreground">{isComm ? 'Channels and routing within this provider.' : 'Object mappings between this integration and Trail OS.'}</p>
        <div className="space-y-2">
          {mappings.map((m: string) => (
            <div key={m} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-white">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
              <span className="text-[12px] text-foreground font-medium font-mono">{m}</span>
              <span className="ml-auto text-[10px] text-emerald-600 font-bold">Mapped</span>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

function HealthTabC({ sys }: { sys: SystemItem }) {
  const isComm = sys._kind === 'comm';
  const comm = sys as CommProvider;
  const integ = sys as IntegrationSystem;
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        {[
          { label:'Connection Status',  health:'healthy' as const,        note: isComm ? `${comm.tagline}` : `Status: ${integ.status}` },
          { label:'Data Integrity',     health:'healthy' as const,        note:'No sync errors detected' },
          { label:'Authentication',     health: (!isComm && integ.status === 'Future') ? 'incomplete' as const : 'healthy' as const, note: (!isComm && integ.status === 'Future') ? 'Not yet configured' : 'Active' },
          { label:'Error Rate',         health:'healthy' as const,        note:'< 0.1% error rate (30-day average)' },
          { label:'SLA Compliance',     health:'needs-attention' as const, note:'SLA monitoring not yet configured' },
        ].map(ind => (
          <div key={ind.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
            <div className="flex items-center gap-2.5">
              <HealthDot health={ind.health} />
              <span className="text-[12px] font-medium text-foreground">{ind.label}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{ind.note}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export default function CollaborationWorkspace() {
  const { commProviders } = useAppContext();

  // Import integrations from data - will be resolved at runtime
  const { integrationSystems } = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const d = require('@/data/integrationReadinessData');
      return { integrationSystems: (d.integrations ?? []) as IntegrationSystem[] };
    } catch {
      return { integrationSystems: [] as IntegrationSystem[] };
    }
  }, []);

  const combined = useMemo<SystemItem[]>(() => [
    ...commProviders.map(p => ({ ...p, _kind: 'comm' as const })),
    ...integrationSystems.map(i => ({ ...i, _kind: 'integration' as const })),
  ], [commProviders, integrationSystems]);

  const items = useMemo<WorkspaceItem[]>(() => combined.map(sys => {
    const isComm = sys._kind === 'comm';
    const comm = sys as CommProvider;
    const integ = sys as IntegrationSystem;
    const health: WorkspaceItem['health'] = isComm
      ? (comm.status === 'prototype' ? 'healthy' : 'needs-attention')
      : (integ.status === 'Prototype' ? 'healthy' : integ.status === 'Future' ? 'incomplete' : 'needs-attention');
    return {
      id: sys.id,
      name: isComm ? comm.name : integ.name,
      typeName: isComm ? comm.slug : integ.domain,
      typeColor: isComm ? 'text-teal-700' : 'text-orange-700',
      typeBg: isComm ? 'bg-teal-50' : 'bg-orange-50',
      status: isComm ? comm.status : integ.status,
      statusVariant: health === 'healthy' ? ('active' as const) : health === 'needs-attention' ? ('planning' as const) : ('draft' as const),
      health,
      secondary: isComm ? comm.tagline : `${integ.status} · ${integ.priority}`,
      owner: isComm ? 'Comms Lead' : integ.owner,
    };
  }), [combined]);

  const tabs = useMemo<WorkspaceTab[]>(() => [
    { id:'overview',  label:'Overview',       render:(item) => { const s = combined.find(x => x.id === item.id); return s ? <OverviewTab sys={s} /> : null; } },
    { id:'readiness', label:'Readiness',      render:(item) => { const s = combined.find(x => x.id === item.id); return s ? <ReadinessTab sys={s} /> : null; } },
    { id:'mapping',   label:'Object Mapping', render:(item) => { const s = combined.find(x => x.id === item.id); return s ? <ObjectMappingTab sys={s} /> : null; } },
    { id:'health',    label:'Health',         render:(item) => { const s = combined.find(x => x.id === item.id); return s ? <HealthTabC sys={s} /> : null; } },
  ], [combined]);

  return (
    <ObjectWorkspace
      icon={MessageSquare}
      items={items}
      tabs={tabs}
      emptyTitle="Select a system"
      emptyBody="Choose a communication provider or integration to view its readiness, object mappings, and health."
    />
  );
}
