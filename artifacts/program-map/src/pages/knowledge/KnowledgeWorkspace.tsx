import { useMemo } from 'react';
import { TERMS } from '@/config/terminology';
import { BookOpen, Brain, Network, GraduationCap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectWorkspace, HealthDot } from '@/components/workspace/ObjectWorkspace';
import type { WorkspaceItem, WorkspaceTab } from '@/components/workspace/ObjectWorkspace';
import { knowledgeSources, SOURCE_TYPE_CONFIG, TRUST_LEVEL_CONFIG, HEALTH_CONFIG, type KnowledgeSource } from '@/data/knowledgeSourceData';
import { RelationshipCard, type RelatedItem } from '@/components/workspace/RelationshipCard';
import { useAppContext } from '@/context/AppContext';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 w-32 shrink-0 mt-0.5">{label}</span>
      <span className="text-[12px] text-foreground flex-1">{value}</span>
    </div>
  );
}

function OverviewTab({ src }: { src: KnowledgeSource }) {
  const typeCfg  = SOURCE_TYPE_CONFIG[src.type];
  const trustCfg = TRUST_LEVEL_CONFIG[src.trustLevel];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-3xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${typeCfg?.cls ?? 'bg-muted text-muted-foreground border-border'}`}>
            {src.type}
          </span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${trustCfg?.cls ?? 'bg-muted text-muted-foreground border-border'}`}>
            {src.trustLevel}
          </span>
        </div>
        <div className="rounded-lg border border-border bg-background divide-y divide-border/40">
          <InfoRow label="Type"         value={src.type} />
          <InfoRow label="Trust Level"  value={src.trustLevel} />
          <InfoRow label="Sync Status"  value={src.syncStatus} />
          <InfoRow label="Access"       value={src.accessStatus ?? 'Unknown'} />
        </div>
        {src.trustLevel === 'Unverified' && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-[11px] font-bold text-rose-700 mb-1">⚠ Unverified Source</p>
            <p className="text-[12px] text-rose-800">This source has not passed a trust review. It may not be activated in {TERMS.aiAssistant} without Knowledge Manager approval.</p>
          </div>
        )}
        {src.healthIssues.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1.5">
            <p className="text-[11px] font-bold text-amber-700">Open Issues</p>
            {src.healthIssues.map((issue, i) => (
              <p key={i} className="text-[11px] text-amber-800 leading-snug">· {issue}</p>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function GovernanceTab({ src }: { src: KnowledgeSource }) {
  const isActive = src.syncStatus === 'Live' || src.syncStatus === 'Manual';
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-3xl">
        <div className="space-y-2">
          {[
            { label: 'Trust Review',           status: src.trustLevel !== 'Unverified' ? 'healthy' as const : 'needs-attention' as const, note: src.trustLevel !== 'Unverified' ? 'Trust level assigned' : `Trust review required before ${TERMS.aiAssistant} activation` },
            { label: `${TERMS.aiAssistant} Activation`, status: isActive ? 'healthy' as const : 'incomplete' as const, note: isActive ? `Source active in ${TERMS.aiAssistant} registry` : `Not yet active in ${TERMS.aiAssistant}` },
            { label: 'Review Cadence',          status: 'healthy' as const, note: 'Quarterly review scheduled' },
            { label: 'Access Control',          status: 'healthy' as const, note: 'Access controls documented' },
          ].map(ind => (
            <div key={ind.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
              <div className="flex items-center gap-2.5">
                <HealthDot health={ind.status} />
                <span className="text-[12px] font-medium text-foreground">{ind.label}</span>
              </div>
              <span className="text-[11px] text-muted-foreground text-right max-w-xs">{ind.note}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase text-muted-foreground/60">Ownership</p>
          <p className="text-[12px] text-foreground">Primary: <strong>Knowledge Manager</strong></p>
          <p className="text-[12px] text-foreground">Secondary: <strong>{TERMS.aiAssistant} Lead</strong></p>
          <p className="text-[12px] text-foreground">Approval: <strong>Knowledge Manager</strong></p>
        </div>
        <div className="rounded-lg border border-muted bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-1">Governance Policy</p>
          <p className="text-[11px] text-muted-foreground">Per Source Trust Standard: all sources must pass trust review before {TERMS.aiAssistant} activation. Quarterly reviews required to maintain Active status.</p>
        </div>
      </div>
    </ScrollArea>
  );
}

function PennyAssetsTab({ src }: { src: KnowledgeSource }) {
  const capMap: Record<string, { name: string; status: string }[]> = {
    'salesforce-kb':   [{ name: 'Resume Review', status: 'Depends on' }, { name: 'Learning Coach', status: 'Depends on' }, { name: 'Coach Support', status: 'Depends on' }],
    'resume-guide':    [{ name: 'Resume Review', status: 'Primary source' }],
    'linkedin-guide':  [{ name: 'Resume Review', status: 'Supplemental' }],
  };
  const caps = capMap[(src as any).id] ?? [];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        <p className="text-[12px] text-muted-foreground">{TERMS.aiAssistant} capabilities and prompts that depend on this knowledge source.</p>
        {caps.length > 0 ? (
          <div className="space-y-2">
            {caps.map(c => (
              <div key={c.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
                <span className="text-[12px] text-foreground font-medium">{c.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{c.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-muted bg-muted/30 p-4">
            <p className="text-[12px] text-muted-foreground">No {TERMS.aiAssistant} assets currently mapped to this source. Full capability mapping is a Phase 2 feature.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function RelatedProgramsTab({ src: _src }: { src: KnowledgeSource }) {
  const programs = [
    { name: "Foundations Trail",  status: 'Referenced', dot: 'bg-emerald-400' },
    { name: "Guided Trail",       status: 'Referenced', dot: 'bg-emerald-400' },
    { name: "Explorer's Trail",   status: 'Planned',    dot: 'bg-amber-400' },
  ];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        <p className="text-[12px] text-muted-foreground">Programs that reference this knowledge source in their curriculum or {TERMS.aiAssistant} integration.</p>
        <div className="space-y-2">
          {programs.map(prog => (
            <div key={prog.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${prog.dot}`} />
              <span className="text-[12px] text-foreground font-medium">{prog.name}</span>
              <span className={`ml-auto text-[10px] font-bold ${prog.dot === 'bg-emerald-400' ? 'text-emerald-600' : 'text-amber-600'}`}>{prog.status}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/60 italic">Full per-source program mapping is a Phase 2 feature — live Salesforce integration will populate this view.</p>
      </div>
    </ScrollArea>
  );
}

function RelationshipsTabKS({ src }: { src: KnowledgeSource }) {
  const programItems: RelatedItem[] = [
    { id: 'exp',    label: "Explorer's Trail",  statusColor: 'bg-emerald-400', href: '/program' },
    { id: 'found',  label: 'Foundations Trail', statusColor: 'bg-emerald-400', href: '/program' },
    { id: 'guided', label: 'Guided Trail',      statusColor: 'bg-amber-400',   href: '/program' },
  ];
  const capMap: Record<string, RelatedItem[]> = {
    'salesforce-kb':  [{ id: 'rr', label: 'Resume Review',  statusColor: 'bg-emerald-400', href: '/penny' }, { id: 'lc', label: 'Learning Coach', statusColor: 'bg-emerald-400', href: '/penny' }, { id: 'cs', label: 'Coach Support', statusColor: 'bg-blue-400', href: '/penny' }],
    'resume-guide':   [{ id: 'rr', label: 'Resume Review',  statusColor: 'bg-emerald-400', href: '/penny' }],
    'linkedin-guide': [{ id: 'rr', label: 'Resume Review',  statusColor: 'bg-blue-400',    href: '/penny' }],
  };
  const dtItems: RelatedItem[] = [
    { id: 'dt-rel', label: 'Relationship Graph', statusColor: 'bg-violet-400', href: '/knowledge/relationships' },
    { id: 'dt-kn',  label: 'Knowledge Network',  statusColor: 'bg-blue-400',   href: '/digital-twin/knowledge'  },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        <p className="text-[12px] text-muted-foreground">Digital Twin relationships — programs, {TERMS.aiAssistant} capabilities, and graph connections for this source.</p>
        <RelationshipCard title="Programs"                      icon={GraduationCap} items={programItems}                   viewAllHref="/program"               emptyMessage="No programs linked" />
        <RelationshipCard title={`${TERMS.aiAssistant} Capabilities`} icon={Brain}  items={capMap[(src as any).id] ?? []}  viewAllHref="/penny"                 emptyMessage="No capabilities depend on this source" />
        <RelationshipCard title="Digital Twin"                  icon={Network}       items={dtItems}                        viewAllHref="/knowledge/relationships" />
      </div>
    </ScrollArea>
  );
}

function HealthTabKS({ src }: { src: KnowledgeSource }) {
  const isActive = src.syncStatus === 'Live' || src.syncStatus === 'Manual';
  const rawHealth = String((src as any).health ?? 'Healthy');
  const healthKey = (rawHealth.charAt(0).toUpperCase() + rawHealth.slice(1)) as keyof typeof HEALTH_CONFIG;
  const cfg = HEALTH_CONFIG[healthKey] ?? HEALTH_CONFIG['Healthy'];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center px-2 py-1 rounded border text-[11px] font-bold ${cfg.cls}`}>
            {(src as any).health ?? 'Healthy'}
          </span>
          <span className="text-[11px] text-muted-foreground">{(src as any).healthNote ?? 'Source health within acceptable parameters.'}</span>
        </div>
        {[
          { label: 'Trust Review',  health: src.trustLevel !== 'Unverified' ? 'healthy' as const : 'needs-attention' as const, note: src.trustLevel },
          { label: 'Sync Status',   health: isActive ? 'healthy' as const : 'needs-attention' as const, note: src.syncStatus },
          { label: 'Freshness',     health: 'healthy' as const, note: 'Last reviewed within cadence' },
          { label: 'Coverage',      health: 'healthy' as const, note: 'Source covers all required topics' },
        ].map(ind => (
          <div key={ind.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
            <div className="flex items-center gap-2.5">
              <HealthDot health={ind.health} />
              <span className="text-[12px] font-medium text-foreground">{ind.label}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{ind.note}</span>
          </div>
        ))}
        {src.healthIssues.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1.5">
            <p className="text-[11px] font-bold text-amber-700">Open Health Issues</p>
            {src.healthIssues.map((issue, i) => (
              <p key={i} className="text-[11px] text-amber-800 leading-snug">· {issue}</p>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default function KnowledgeWorkspace() {
  const { setSelectedItem, selectedItem } = useAppContext();

  const trustOrder: Record<string, number> = { 'Authoritative': 3, 'Trusted': 2, 'Curated': 1, 'Unverified': 0 };

  const sorted = useMemo(() =>
    [...knowledgeSources].sort((a, b) => (trustOrder[b.trustLevel] ?? 0) - (trustOrder[a.trustLevel] ?? 0)),
  []);

  const healthFromTrust = (src: KnowledgeSource): WorkspaceItem['health'] =>
    src.trustLevel === 'Authoritative' || src.trustLevel === 'Trusted' ? 'healthy' :
    src.trustLevel === 'Curated' ? 'needs-attention' : 'incomplete';

  const items = useMemo<WorkspaceItem[]>(() => sorted.map(src => ({
    id: (src as any).id ?? src.name,
    name: src.name,
    typeName: src.type,
    typeColor: 'text-violet-700',
    typeBg: 'bg-violet-50',
    status: src.trustLevel,
    statusVariant: (src.trustLevel === 'Authoritative' || src.trustLevel === 'Trusted') ? ('active' as const) : ('draft' as const),
    health: healthFromTrust(src),
    secondary: src.syncStatus,
    owner: 'Knowledge Manager',
  })), [sorted]);

  const tabs = useMemo<WorkspaceTab[]>(() => [
    { id: 'overview',      label: 'Overview',                  render: (item) => { const s = knowledgeSources.find(x => ((x as any).id ?? x.name) === item.id); return s ? <OverviewTab src={s} />         : null; } },
    { id: 'governance',    label: 'Governance',                render: (item) => { const s = knowledgeSources.find(x => ((x as any).id ?? x.name) === item.id); return s ? <GovernanceTab src={s} />        : null; } },
    { id: 'programs',      label: 'Programs',                  render: (item) => { const s = knowledgeSources.find(x => ((x as any).id ?? x.name) === item.id); return s ? <RelatedProgramsTab src={s} />   : null; } },
    { id: 'penny',         label: `${TERMS.aiAssistant} Assets`, render: (item) => { const s = knowledgeSources.find(x => ((x as any).id ?? x.name) === item.id); return s ? <PennyAssetsTab src={s} />      : null; } },
    { id: 'health',        label: 'Health',                    render: (item) => { const s = knowledgeSources.find(x => ((x as any).id ?? x.name) === item.id); return s ? <HealthTabKS src={s} />          : null; } },
    { id: 'relationships', label: 'Relationships',             render: (item) => { const s = knowledgeSources.find(x => ((x as any).id ?? x.name) === item.id); return s ? <RelationshipsTabKS src={s} />   : null; } },
  ], []);

  // Sync to AppContext so the Knowledge Brief panel reflects the selected source
  function handleItemSelect(item: WorkspaceItem) {
    const src = knowledgeSources.find(x => ((x as any).id ?? x.name) === item.id);
    if (src) {
      setSelectedItem({ type: 'knowledgeSource', id: (src as any).id ?? src.name, data: src });
    }
  }

  // If AppContext already has a knowledgeSource selected, pre-select it in the list
  const initialSelectedId = (selectedItem?.type === 'knowledgeSource' ? selectedItem.id : null) ?? items[0]?.id ?? null;

  return (
    <ObjectWorkspace
      icon={BookOpen}
      items={items}
      tabs={tabs}
      emptyTitle="Select a knowledge source"
      emptyBody={`Choose a knowledge source to view its trust governance, program usage, ${TERMS.aiAssistant} dependencies, and health.`}
      onItemSelect={handleItemSelect}
      initialSelectedId={initialSelectedId}
    />
  );
}
