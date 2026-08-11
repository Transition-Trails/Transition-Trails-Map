import { useMemo, useRef, useState } from 'react';
import { Brain, GraduationCap, BookOpen, Puzzle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectWorkspace, HealthDot } from '@/components/workspace/ObjectWorkspace';
import type { WorkspaceItem, WorkspaceTab } from '@/components/workspace/ObjectWorkspace';
import {
  pennyCapabilities as STATIC_CAPS,
  type PennyCapability,
  CAPABILITY_READINESS_CONFIG,
  CAPABILITY_DOMAIN_CONFIG,
  type CapabilityStatus,
  CAPABILITY_STATUS_CONFIG,
} from '@/data/pennyCapabilityData';
import { RelationshipCard, type RelatedItem } from '@/components/workspace/RelationshipCard';

// Default status derived from pocStatus — 'exists' means it's already working
function defaultStatus(pocStatus: string): CapabilityStatus {
  return pocStatus === 'exists' ? 'Live' : 'Partial';
}

const STATUS_ORDER: Record<CapabilityStatus, number> = { 'Live': 2, 'Ready': 1, 'Partial': 0 };

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[14px] font-bold  text-muted-foreground/60 w-28 shrink-0 mt-0.5">{label}</span>
      <span className="text-[14px] text-foreground flex-1">{value}</span>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items?.length) return <p className="text-[14px] text-muted-foreground">—</p>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(item => (
        <span key={item} className="inline-flex items-center px-2 py-0.5 rounded text-[14px] bg-muted border border-border text-foreground">{item}</span>
      ))}
    </div>
  );
}

// ── Status Selector ───────────────────────────────────────────────────────────

function StatusSelector({ current, onChange }: { current: CapabilityStatus; onChange: (s: CapabilityStatus) => void }) {
  const statuses: CapabilityStatus[] = ['Partial', 'Ready', 'Live'];
  return (
    <div>
      <p className="text-[14px] font-bold  text-muted-foreground/60 mb-1.5">Configure Status</p>
      <div className="inline-flex rounded-md border border-border overflow-hidden">
        {statuses.map((s, i) => {
          const cfg = CAPABILITY_STATUS_CONFIG[s];
          const isActive = current === s;
          return (
            <button
              key={s}
              onClick={() => onChange(s)}
              className={`px-4 py-1.5 text-[14px] font-semibold transition-colors ${i < statuses.length - 1 ? 'border-r border-border' : ''} ${
                isActive
                  ? cfg.badgeCls + ' border-0'
                  : 'bg-white text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      <p className="text-[14px] text-muted-foreground mt-1.5">
        {current === 'Partial' && 'This capability is still being configured — not yet ready for use.'}
        {current === 'Ready'   && 'Fully configured and ready to activate, but not yet serving learners.'}
        {current === 'Live'    && 'Actively running and serving learners or coaches.'}
      </p>
    </div>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────

function OverviewTab({ cap, status, onStatusChange }: { cap: PennyCapability; status: CapabilityStatus; onStatusChange: (s: CapabilityStatus) => void }) {
  const readinessCfg  = CAPABILITY_READINESS_CONFIG[cap.maturity];
  const domainCfg     = CAPABILITY_DOMAIN_CONFIG[cap.domain];
  const statusCfg     = CAPABILITY_STATUS_CONFIG[status];
  const isOperational = cap.maturity === 'Operational' || cap.maturity === 'Integrated';
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4">
        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[14px] font-bold  border ${statusCfg.badgeCls}`}>
            {status}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[14px] font-bold  border ${domainCfg?.cls ?? 'bg-muted text-muted-foreground border-border'}`}>
            {cap.domain}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[14px] font-bold  border ${readinessCfg?.cls ?? 'bg-muted text-muted-foreground border-border'}`}>
            {cap.maturity}
          </span>
        </div>

        {/* Purpose */}
        {cap.purpose && (
          <p className="text-[14px] text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-4">{cap.purpose}</p>
        )}

        {/* Status selector */}
        <StatusSelector current={status} onChange={onStatusChange} />

        {/* Detail rows */}
        <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
          <InfoRow label="Short Description" value={cap.shortDescription} />
          <InfoRow label="Maturity"          value={cap.maturity} />
          <InfoRow label="Domain"            value={cap.domain} />
          {cap.audience?.length > 0 && <InfoRow label="Audience" value={cap.audience.join(', ')} />}
        </div>

        {cap.inputs?.length > 0 && (
          <div>
            <p className="text-[14px] font-bold  text-muted-foreground/60 mb-2">Inputs</p>
            <ChipList items={cap.inputs} />
          </div>
        )}
        {cap.outputs?.length > 0 && (
          <div>
            <p className="text-[14px] font-bold  text-muted-foreground/60 mb-2">Outputs</p>
            <ChipList items={cap.outputs} />
          </div>
        )}
        {isOperational && (
          <div className="rounded-lg border border-[#9FC3AE] bg-[#E6F0EA] px-4 py-3">
            <p className="text-[14px] font-bold text-[#2F6B3F]">Operational</p>
            <p className="text-[14px] text-[#245531]">This capability is live and serving learners or coaches.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function PromptsTab({ cap }: { cap: PennyCapability }) {
  const promptMap: Record<string, string[]> = {
    'resume-review':     ['Resume Review Prompt v2.1 — ATS-optimised rubric with impact language coaching'],
    'learning-coach':    ['Learning Coach Sprint Check-in v1.3 — Weekly milestone-driven coaching nudges'],
    'trail-quest-runner':['Trail Quest Delivery v1.0 — Quest completion + milestone tracking'],
    'weekly-brief':      ['Weekly Brief Generator v1.0 — Program Director and coach cohort brief'],
    'knowledge-retrieval':['Knowledge Retrieval Base v1.2 — Source-filtered knowledge query template'],
  };
  const prompts = promptMap[cap.id] ?? [];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3">
        <p className="text-[14px] text-muted-foreground">Prompt templates that power this capability. Manage templates in Prompt Studio.</p>
        {prompts.length > 0 ? (
          prompts.map(prompt => (
            <div key={prompt} className="rounded-lg border border-border bg-white p-4">
              <p className="text-[14px] font-bold text-foreground">{prompt.split('—')[0].trim()}</p>
              <p className="text-[14px] text-muted-foreground mt-0.5">{prompt.split('—')[1]?.trim() ?? ''}</p>
              <span className="inline-flex items-center mt-2 px-1.5 py-0.5 rounded text-[14px] font-bold bg-[#E6F0EA] text-[#2F6B3F] border border-[#9FC3AE]">Operational</span>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-muted bg-muted/30 p-4">
            <p className="text-[14px] text-muted-foreground">No prompt templates mapped for this capability yet.</p>
          </div>
        )}
        <p className="text-[14px] text-muted-foreground">Full prompt authoring and version history available in Prompt Studio.</p>
      </div>
    </ScrollArea>
  );
}

function SourcesTab({ cap }: { cap: PennyCapability }) {
  const sourceMap: Record<string, { name: string; trust: string; status: string }[]> = {
    'resume-review':     [{ name:'Resume Writing Guide',          trust:'Authoritative', status:'Active' }, { name:'ATS Optimisation Guide',       trust:'Authoritative', status:'Active' }, { name:'Salesforce Foundations Trail KB', trust:'Authoritative', status:'Active' }],
    'learning-coach':    [{ name:'Salesforce Foundations Trail KB', trust:'Authoritative', status:'Active' }, { name:'Sprint Learning Outcomes',     trust:'Trusted',       status:'Active' }],
    'trail-quest-runner':[{ name:'Trail Quest Library',           trust:'Authoritative', status:'Active' }],
    'weekly-brief':      [{ name:'Salesforce Cohort Data',        trust:'Authoritative', status:'Active' }, { name:'Sprint Calendar Events',       trust:'Trusted',       status:'Active' }],
  };
  const sources = sourceMap[cap.id] ?? [];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3">
        <p className="text-[14px] text-muted-foreground">Knowledge sources this capability depends on. All sources require trust review before Penny activation.</p>
        {sources.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-[14px]">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {['Source', 'Trust Level', 'Status'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-[14px] font-bold  text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.map((s, i) => (
                  <tr key={s.name} className={`border-b border-border/40 ${i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                    <td className="px-3 py-2 font-medium text-foreground">{s.name}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border ${s.trust === 'Authoritative' ? 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]' : 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]'}`}>
                        {s.trust}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[#2F6B3F] font-semibold">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[14px] text-muted-foreground">No knowledge sources mapped for this capability.</p>
        )}
      </div>
    </ScrollArea>
  );
}

function QualityTab({ cap }: { cap: PennyCapability }) {
  const isOperational = cap.maturity === 'Operational' || cap.maturity === 'Integrated';
  const qualityScoreMap: Record<string, number> = {
    'resume-review':87,'learning-coach':89,'trail-quest-runner':84,'coach-support':80,'weekly-brief':91,'knowledge-retrieval':85,
  };
  const score = qualityScoreMap[cap.id] ?? 75;
  const scoreColor = score >= 85 ? 'text-[#2F6B3F]' : score >= 75 ? 'text-[#CC8400]' : 'text-[#A93F2F]';

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4">
        {isOperational ? (
          <>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className={`text-4xl font-bold ${scoreColor}`}>{score}</p>
                <p className="text-[14px] text-muted-foreground">/ 100</p>
                <p className="text-[14px] font-bold  text-muted-foreground/60 mt-1">Quality Score</p>
              </div>
              <div className="flex-1">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${score >= 85 ? 'bg-[#2F6B3F]' : score >= 75 ? 'bg-[#CC8400]' : 'bg-[#A93F2F]'}`} style={{ width:`${score}%` }} />
                </div>
                <p className="text-[14px] text-muted-foreground mt-1">{score >= 80 ? 'Meets quality threshold' : 'Below threshold — review recommended'}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
              <InfoRow label="Quality Threshold" value="80 / 100 minimum" />
              <InfoRow label="Last Review"        value="Jun 2025" />
              <InfoRow label="Review Cadence"     value="Quarterly" />
              <InfoRow label="Hallucination Risk" value={score >= 85 ? 'Low' : 'Medium'} />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-muted bg-muted/30 p-4">
            <p className="text-[14px] text-muted-foreground">Quality monitoring is active for Operational and Integrated capabilities. This capability is in <strong>{cap.maturity}</strong> state.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function HealthTab({ cap, status }: { cap: PennyCapability; status: CapabilityStatus }) {
  const isOp = cap.maturity === 'Operational' || cap.maturity === 'Integrated';
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3">
        {[
          { label:'Capability Status',    health: status === 'Live' ? 'healthy' as const : status === 'Ready' ? 'healthy' as const : 'needs-attention' as const, note: status },
          { label:'Capability Readiness', health: isOp ? 'healthy' as const : 'needs-attention' as const, note:cap.maturity },
          { label:'Prompt Template',      health: isOp ? 'healthy' as const : 'incomplete' as const,      note: isOp ? 'Approved and operational' : 'Pending approval' },
          { label:'Knowledge Sources',    health:'healthy' as const, note:'Trust reviews current' },
          { label:'Quality Review',       health: cap.id === 'coach-support' ? 'needs-attention' as const : 'healthy' as const, note: cap.id === 'coach-support' ? 'Quarterly review missed' : 'Last review passed (Q2 2025)' },
          { label:'Governance Compliance',health:'healthy' as const, note:'Penny Blueprint compliant' },
        ].map(ind => (
          <div key={ind.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
            <div className="flex items-center gap-2.5">
              <HealthDot health={ind.health} />
              <span className="text-[14px] font-medium text-foreground">{ind.label}</span>
            </div>
            <span className="text-[14px] text-muted-foreground">{ind.note}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function RelationshipsTab({ cap }: { cap: PennyCapability }) {
  const programMap: Record<string, RelatedItem[]> = {
    'resume-review':     [{ id:'exp',   label:"Explorer's Trail",  statusColor:'bg-[#2F6B3F]' }, { id:'found', label:'Foundations Trail', statusColor:'bg-[#2F6B3F]' }],
    'learning-coach':    [{ id:'exp',   label:"Explorer's Trail",  statusColor:'bg-[#2F6B3F]' }, { id:'found', label:'Foundations Trail', statusColor:'bg-[#2F6B3F]' }, { id:'guided', label:'Guided Trail', statusColor:'bg-[#CC8400]' }],
    'trail-quest-runner':[{ id:'guided',label:'Guided Trail',      statusColor:'bg-[#CC8400]'   }, { id:'mastery', label:'Trail of Mastery', statusColor:'bg-[#CC8400]' }],
    'weekly-brief':      [{ id:'exp',   label:"Explorer's Trail",  statusColor:'bg-[#2F6B3F]' }, { id:'found', label:'Foundations Trail', statusColor:'bg-[#2F6B3F]' }, { id:'guided', label:'Guided Trail', statusColor:'bg-[#CC8400]' }, { id:'mastery', label:'Trail of Mastery', statusColor:'bg-[#CC8400]' }],
    'intake-triage':     [{ id:'all',   label:'All Programs',      statusColor:'bg-[#2F6F7E]'    }],
    'cohort-health':     [{ id:'exp',   label:"Explorer's Trail",  statusColor:'bg-[#2F6B3F]' }, { id:'found', label:'Foundations Trail', statusColor:'bg-[#2F6B3F]' }],
    'sf-intelligence':   [{ id:'all',   label:'All Programs',      statusColor:'bg-[#2F6F7E]'    }],
  };
  const knowledgeMap: Record<string, RelatedItem[]> = {
    'resume-review':     [{ id:'rg',  label:'Resume Writing Guide',    statusColor:'bg-[#2F6B3F]' }, { id:'ats', label:'ATS Guide', statusColor:'bg-[#2F6B3F]' }, { id:'sf-kb', label:'Salesforce KB', statusColor:'bg-[#2F6F7E]' }],
    'learning-coach':    [{ id:'sf-kb', label:'Salesforce KB',         statusColor:'bg-[#2F6F7E]'   }, { id:'slo', label:'Sprint Learning Outcomes', statusColor:'bg-[#2F6F7E]' }],
    'trail-quest-runner':[{ id:'tql',   label:'Trail Quest Library',   statusColor:'bg-[#2F6B3F]' }],
    'weekly-brief':      [{ id:'scd',   label:'Salesforce Cohort Data',statusColor:'bg-[#2F6F7E]'   }, { id:'cal', label:'Sprint Calendar', statusColor:'bg-[#CC8400]' }],
  };
  const integrationItems: RelatedItem[] = [
    { id:'prompt-studio', label:'Prompt Studio',       statusColor:'bg-[#2F6B3F]', href:'/penny/prompts' },
    { id:'cap-reg',       label:'Capability Registry', statusColor:'bg-[#2F6B3F]', href:'/penny' },
    ...((cap.id === 'weekly-brief' || cap.id === 'learning-coach') ? [{ id:'slack', label:'Slack', statusColor:'bg-[#CC8400]' as string }] : []),
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3">
        <p className="text-[14px] text-muted-foreground">Digital Twin relationships — programs, knowledge sources, and integrations connected to this capability.</p>
        <RelationshipCard title="Programs"          icon={GraduationCap} items={programMap[cap.id]  ?? []} viewAllHref="/digital-twin/penny-network" emptyMessage="No programs linked" />
        <RelationshipCard title="Knowledge Sources" icon={BookOpen}      items={knowledgeMap[cap.id] ?? []} viewAllHref="/knowledge"                 emptyMessage="No knowledge sources linked" />
        <RelationshipCard title="Integrations"      icon={Puzzle}        items={integrationItems}            viewAllHref="/penny/integration-layer"   emptyMessage="No integrations linked" />
      </div>
    </ScrollArea>
  );
}

// ── Main workspace ────────────────────────────────────────────────────────────

export default function PennyWorkspace() {
  // Status is user-configurable per capability; defaults from pocStatus
  const [statusOverrides, setStatusOverrides] = useState<Record<string, CapabilityStatus>>(
    () => Object.fromEntries(STATIC_CAPS.map(c => [c.id, defaultStatus(c.pocStatus)]))
  );

  const statusRef = useRef(statusOverrides);
  statusRef.current = statusOverrides;

  const setStatusRef = useRef(setStatusOverrides);
  setStatusRef.current = setStatusOverrides;

  const sorted = useMemo(() =>
    [...STATIC_CAPS].sort((a, b) => {
      const sa = statusRef.current[a.id] ?? 'Partial';
      const sb = statusRef.current[b.id] ?? 'Partial';
      const diff = STATUS_ORDER[sb] - STATUS_ORDER[sa];
      return diff !== 0 ? diff : a.domain.localeCompare(b.domain);
    }),
  // Re-sort when overrides change so Live items float to the top
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [statusOverrides]);

  const items = useMemo<WorkspaceItem[]>(() => sorted.map(cap => {
    const st    = statusOverrides[cap.id] ?? 'Partial';
    const stCfg = CAPABILITY_STATUS_CONFIG[st];
    return {
      id:            cap.id,
      name:          cap.name,
      typeName:      cap.domain,
      typeColor:     'text-[#A93F2F]',
      typeBg:        'bg-[#FBEAE6]',
      status:        st,
      statusVariant: stCfg.statusVariant,
      health:        st === 'Partial' ? 'needs-attention' as const : 'healthy' as const,
      secondary:     cap.shortDescription,
      owner:         cap.owner,
    };
  }), [sorted, statusOverrides]);

  // Tabs use refs so closures don't go stale when statusOverrides changes
  const tabs = useMemo<WorkspaceTab[]>(() => [
    {
      id: 'overview', label: 'Overview',
      render: (item) => {
        const cap    = STATIC_CAPS.find(c => c.id === item.id);
        const status = statusRef.current[item.id] ?? 'Partial';
        if (!cap) return null;
        return (
          <OverviewTab
            cap={cap}
            status={status}
            onStatusChange={(s) =>
              setStatusRef.current(prev => ({ ...prev, [item.id]: s }))
            }
          />
        );
      },
    },
    {
      id: 'prompts', label: 'Prompts',
      render: (item) => { const cap = STATIC_CAPS.find(c => c.id === item.id); return cap ? <PromptsTab cap={cap} /> : null; },
    },
    {
      id: 'sources', label: 'Knowledge Sources',
      render: (item) => { const cap = STATIC_CAPS.find(c => c.id === item.id); return cap ? <SourcesTab cap={cap} /> : null; },
    },
    {
      id: 'quality', label: 'Quality',
      render: (item) => { const cap = STATIC_CAPS.find(c => c.id === item.id); return cap ? <QualityTab cap={cap} /> : null; },
    },
    {
      id: 'health', label: 'Health',
      render: (item) => {
        const cap    = STATIC_CAPS.find(c => c.id === item.id);
        const status = statusRef.current[item.id] ?? 'Partial';
        return cap ? <HealthTab cap={cap} status={status} /> : null;
      },
    },
    {
      id: 'relationships', label: 'Relationships',
      render: (item) => { const cap = STATIC_CAPS.find(c => c.id === item.id); return cap ? <RelationshipsTab cap={cap} /> : null; },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <ObjectWorkspace
      icon={Brain}
      items={items}
      tabs={tabs}
      initialSelectedId={null}
      emptyTitle="Select a capability"
      emptyBody="Choose a Penny capability from the list to view its prompts, knowledge sources, quality metrics, and health."
    />
  );
}
