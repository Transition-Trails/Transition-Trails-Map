import { useMemo, useState } from 'react';
import { TERMS } from '@/config/terminology';
import { BookOpen, Brain, Network, GraduationCap, ChevronDown, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectWorkspace, HealthDot } from '@/components/workspace/ObjectWorkspace';
import type { WorkspaceItem, WorkspaceTab } from '@/components/workspace/ObjectWorkspace';
import { SOURCE_TYPE_CONFIG, TRUST_LEVEL_CONFIG, HEALTH_CONFIG, DOCUMENT_CATEGORY_TAXONOMY, type KnowledgeSource } from '@/data/knowledgeSourceData';
import { RelationshipCard, type RelatedItem } from '@/components/workspace/RelationshipCard';
import { useAppContext } from '@/context/AppContext';
import { useKnowledgeSources } from '@/hooks/useKnowledgeSources';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[14px] font-bold  text-muted-foreground/60 w-32 shrink-0 mt-0.5">{label}</span>
      <span className="text-[14px] text-foreground flex-1">{value}</span>
    </div>
  );
}

function OverviewTab({ src }: { src: KnowledgeSource }) {
  const typeCfg  = SOURCE_TYPE_CONFIG[src.type];
  const trustCfg = TRUST_LEVEL_CONFIG[src.trustLevel];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border ${typeCfg?.cls ?? 'bg-muted text-muted-foreground border-border'}`}>
            {src.type}
          </span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border ${trustCfg?.cls ?? 'bg-muted text-muted-foreground border-border'}`}>
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
          <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] px-4 py-3">
            <p className="text-[14px] font-bold text-[#A93F2F] mb-1">⚠ Unverified Source</p>
            <p className="text-[14px] text-[#A93F2F]">This source has not passed a trust review. It may not be activated in {TERMS.aiAssistant} without Knowledge Manager approval.</p>
          </div>
        )}
        {src.healthIssues.length > 0 && (
          <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] px-4 py-3 space-y-1.5">
            <p className="text-[14px] font-bold text-[#CC8400]">Open Issues</p>
            {src.healthIssues.map((issue, i) => (
              <p key={i} className="text-[14px] text-[#CC8400] leading-snug">· {issue}</p>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function CategoryMappingSection({ src }: { src: KnowledgeSource }) {
  const docs = src.documents ?? [];
  if (docs.length === 0) return null;

  const [docCategories, setDocCategories] = useState<Record<string, string[]>>(
    () => Object.fromEntries(docs.map(d => [d.id, d.categories]))
  );
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const mapped = Object.values(docCategories).filter(cats => cats.length > 0).length;
  const total  = docs.length;
  const pct    = total > 0 ? Math.round((mapped / total) * 100) : 0;

  function toggleCategory(docId: string, catId: string) {
    setDocCategories(prev => {
      const current = prev[docId] ?? [];
      const next = current.includes(catId)
        ? current.filter(c => c !== catId)
        : [...current, catId];
      return { ...prev, [docId]: next };
    });
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold  text-muted-foreground/60 tracking-wide">Category Mapping</p>
        <span className={`text-[14px] font-bold px-1.5 py-0.5 rounded ${mapped === total ? 'text-[#2F6B3F] bg-[#E6F0EA]' : 'text-[#CC8400] bg-[#FFF3E0]'}`}>
          {mapped} / {total} mapped
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[14px] text-muted-foreground mb-0.5">
          <span>{pct}% complete</span>
          {mapped === total && (
            <span className="flex items-center gap-1 text-[#2F6B3F] font-semibold">
              <CheckCircle2 className="w-3 h-3" /> All documents mapped
            </span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${mapped === total ? 'bg-[#E6F0EA]0' : 'bg-[#CC8400]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        {docs.map(doc => {
          const cats      = docCategories[doc.id] ?? [];
          const isExpanded = expandedDoc === doc.id;
          const isMapped   = cats.length > 0;

          return (
            <div
              key={doc.id}
              className={`rounded-md border transition-colors ${isMapped ? 'border-border bg-background' : 'border-[#FFD08A] bg-[#FFF3E0]/30'}`}
            >
              <button
                onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left"
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isMapped ? 'bg-[#E6F0EA]0' : 'bg-[#CC8400]'}`} />
                <span className="text-[14px] font-medium text-foreground flex-1 truncate">{doc.name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isMapped ? (
                    <>
                      {cats.slice(0, 2).map(catId => {
                        const cat = DOCUMENT_CATEGORY_TAXONOMY.find(c => c.id === catId);
                        return cat ? (
                          <span key={catId} className={`text-[14px] font-semibold px-1.5 py-0.5 rounded border ${cat.color}`}>
                            {cat.label}
                          </span>
                        ) : null;
                      })}
                      {cats.length > 2 && (
                        <span className="text-[14px] text-muted-foreground">+{cats.length - 2}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-[14px] font-bold text-[#CC8400]">Unassigned</span>
                  )}
                </div>
                <ChevronDown className={`w-3 h-3 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-border/40 pt-2.5 space-y-2.5">
                  <p className="text-[14px] text-muted-foreground font-medium">Assign categories:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DOCUMENT_CATEGORY_TAXONOMY.map(cat => {
                      const active = cats.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => toggleCategory(doc.id, cat.id)}
                          className={`text-[14px] font-semibold px-2 py-1 rounded-full border transition-all ${
                            active
                              ? cat.color
                              : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/50'
                          }`}
                        >
                          {active && '✓ '}{cat.label}
                        </button>
                      );
                    })}
                  </div>
                  {(doc.uploadedBy || doc.uploadDate) && (
                    <p className="text-[14px] text-muted-foreground/70">
                      {doc.uploadedBy && `Uploaded by ${doc.uploadedBy}`}
                      {doc.uploadedBy && doc.uploadDate && ' · '}
                      {doc.uploadDate}
                      {doc.owner && ` · Owner: ${doc.owner}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GovernanceTab({ src }: { src: KnowledgeSource }) {
  const isActive = src.syncStatus === 'Live' || src.syncStatus === 'Manual';
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4">
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
                <span className="text-[14px] font-medium text-foreground">{ind.label}</span>
              </div>
              <span className="text-[14px] text-muted-foreground text-right max-w-xs">{ind.note}</span>
            </div>
          ))}
        </div>
        <CategoryMappingSection src={src} />
        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <p className="text-[14px] font-bold  text-muted-foreground/60">Ownership</p>
          <p className="text-[14px] text-foreground">Primary: <strong>Knowledge Manager</strong></p>
          <p className="text-[14px] text-foreground">Secondary: <strong>{TERMS.aiAssistant} Lead</strong></p>
          <p className="text-[14px] text-foreground">Approval: <strong>Knowledge Manager</strong></p>
        </div>
        <div className="rounded-lg border border-muted bg-muted/30 p-3">
          <p className="text-[14px] font-bold  text-muted-foreground/60 mb-1">Governance Policy</p>
          <p className="text-[14px] text-muted-foreground">Per Source Trust Standard: all sources must pass trust review before {TERMS.aiAssistant} activation. Quarterly reviews required to maintain Active status.</p>
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
      <div className="p-5 space-y-3">
        <p className="text-[14px] text-muted-foreground">{TERMS.aiAssistant} capabilities and prompts that depend on this knowledge source.</p>
        {caps.length > 0 ? (
          <div className="space-y-2">
            {caps.map(c => (
              <div key={c.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F6F7E] shrink-0" />
                <span className="text-[14px] text-foreground font-medium">{c.name}</span>
                <span className="ml-auto text-[14px] text-muted-foreground">{c.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-muted bg-muted/30 p-4">
            <p className="text-[14px] text-muted-foreground">No {TERMS.aiAssistant} assets currently mapped to this source. Full capability mapping is a Phase 2 feature.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function RelatedProgramsTab({ src: _src }: { src: KnowledgeSource }) {
  const programs = [
    { name: "Foundations Trail",  status: 'Referenced', dot: 'bg-[#2F6B3F]' },
    { name: "Guided Trail",       status: 'Referenced', dot: 'bg-[#2F6B3F]' },
    { name: "Explorer's Trail",   status: 'Planned',    dot: 'bg-[#CC8400]' },
  ];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3">
        <p className="text-[14px] text-muted-foreground">Programs that reference this knowledge source in their curriculum or {TERMS.aiAssistant} integration.</p>
        <div className="space-y-2">
          {programs.map(prog => (
            <div key={prog.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${prog.dot}`} />
              <span className="text-[14px] text-foreground font-medium">{prog.name}</span>
              <span className={`ml-auto text-[14px] font-bold ${prog.dot === 'bg-[#2F6B3F]' ? 'text-[#2F6B3F]' : 'text-[#CC8400]'}`}>{prog.status}</span>
            </div>
          ))}
        </div>
        <p className="text-[14px] text-muted-foreground/60 italic">Full per-source program mapping is a Phase 2 feature — live Salesforce integration will populate this view.</p>
      </div>
    </ScrollArea>
  );
}

function RelationshipsTabKS({ src }: { src: KnowledgeSource }) {
  const programItems: RelatedItem[] = [
    { id: 'exp',    label: "Explorer's Trail",  statusColor: 'bg-[#2F6B3F]', href: '/program' },
    { id: 'found',  label: 'Foundations Trail', statusColor: 'bg-[#2F6B3F]', href: '/program' },
    { id: 'guided', label: 'Guided Trail',      statusColor: 'bg-[#CC8400]',   href: '/program' },
  ];
  const capMap: Record<string, RelatedItem[]> = {
    'salesforce-kb':  [{ id: 'rr', label: 'Resume Review',  statusColor: 'bg-[#2F6B3F]', href: '/penny' }, { id: 'lc', label: 'Learning Coach', statusColor: 'bg-[#2F6B3F]', href: '/penny' }, { id: 'cs', label: 'Coach Support', statusColor: 'bg-[#2F6F7E]', href: '/penny' }],
    'resume-guide':   [{ id: 'rr', label: 'Resume Review',  statusColor: 'bg-[#2F6B3F]', href: '/penny' }],
    'linkedin-guide': [{ id: 'rr', label: 'Resume Review',  statusColor: 'bg-[#2F6F7E]',    href: '/penny' }],
  };
  const dtItems: RelatedItem[] = [
    { id: 'dt-rel', label: 'Relationship Graph', statusColor: 'bg-[#2F6F7E]', href: '/knowledge/relationships' },
    { id: 'dt-kn',  label: 'Knowledge Network',  statusColor: 'bg-[#2F6F7E]',   href: '/digital-twin/knowledge'  },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3">
        <p className="text-[14px] text-muted-foreground">Digital Twin relationships — programs, {TERMS.aiAssistant} capabilities, and graph connections for this source.</p>
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
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center px-2 py-1 rounded border text-[14px] font-bold ${cfg.cls}`}>
            {(src as any).health ?? 'Healthy'}
          </span>
          <span className="text-[14px] text-muted-foreground">{(src as any).healthNote ?? 'Source health within acceptable parameters.'}</span>
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
              <span className="text-[14px] font-medium text-foreground">{ind.label}</span>
            </div>
            <span className="text-[14px] text-muted-foreground">{ind.note}</span>
          </div>
        ))}
        {src.healthIssues.length > 0 && (
          <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] px-4 py-3 space-y-1.5">
            <p className="text-[14px] font-bold text-[#CC8400]">Open Health Issues</p>
            {src.healthIssues.map((issue, i) => (
              <p key={i} className="text-[14px] text-[#CC8400] leading-snug">· {issue}</p>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default function KnowledgeWorkspace() {
  const { setSelectedItem, selectedItem } = useAppContext();
  const { sources } = useKnowledgeSources();

  const trustOrder: Record<string, number> = { 'Authoritative': 3, 'Trusted': 2, 'Curated': 1, 'Unverified': 0 };

  const sorted = useMemo(() =>
    [...sources].sort((a, b) => (trustOrder[b.trustLevel] ?? 0) - (trustOrder[a.trustLevel] ?? 0)),
  [sources]);

  const healthFromTrust = (src: KnowledgeSource): WorkspaceItem['health'] =>
    src.trustLevel === 'Authoritative' || src.trustLevel === 'Trusted' ? 'healthy' :
    src.trustLevel === 'Curated' ? 'needs-attention' : 'incomplete';

  const items = useMemo<WorkspaceItem[]>(() => sorted.map(src => ({
    id: (src as any).id ?? src.name,
    name: src.name,
    typeName: src.type,
    typeColor: 'text-[#2F6F7E]',
    typeBg: 'bg-[#EDF5F8]',
    status: src.trustLevel,
    statusVariant: (src.trustLevel === 'Authoritative' || src.trustLevel === 'Trusted') ? ('active' as const) : ('draft' as const),
    health: healthFromTrust(src),
    secondary: src.syncStatus,
    owner: 'Knowledge Manager',
  })), [sorted]);

  const tabs = useMemo<WorkspaceTab[]>(() => [
    { id: 'overview',      label: 'Overview',                    render: (item) => { const s = sources.find(x => ((x as any).id ?? x.name) === item.id); return s ? <OverviewTab src={s} />         : null; } },
    { id: 'governance',    label: 'Governance',                  render: (item) => { const s = sources.find(x => ((x as any).id ?? x.name) === item.id); return s ? <GovernanceTab src={s} />        : null; } },
    { id: 'programs',      label: 'Programs',                    render: (item) => { const s = sources.find(x => ((x as any).id ?? x.name) === item.id); return s ? <RelatedProgramsTab src={s} />   : null; } },
    { id: 'penny',         label: `${TERMS.aiAssistant} Assets`, render: (item) => { const s = sources.find(x => ((x as any).id ?? x.name) === item.id); return s ? <PennyAssetsTab src={s} />      : null; } },
    { id: 'health',        label: 'Health',                      render: (item) => { const s = sources.find(x => ((x as any).id ?? x.name) === item.id); return s ? <HealthTabKS src={s} />          : null; } },
    { id: 'relationships', label: 'Relationships',               render: (item) => { const s = sources.find(x => ((x as any).id ?? x.name) === item.id); return s ? <RelationshipsTabKS src={s} />   : null; } },
  ], [sources]);

  // Sync to AppContext so the Knowledge Brief panel reflects the selected source
  function handleItemSelect(item: WorkspaceItem) {
    const src = sources.find(x => ((x as any).id ?? x.name) === item.id);
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
