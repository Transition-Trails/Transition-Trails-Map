import { useMemo } from 'react';
import { Brain } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectWorkspace, HealthDot } from '@/components/workspace/ObjectWorkspace';
import type { WorkspaceItem, WorkspaceTab } from '@/components/workspace/ObjectWorkspace';
import { pennyCapabilities as STATIC_CAPS, type PennyCapability, CAPABILITY_READINESS_CONFIG, CAPABILITY_DOMAIN_CONFIG } from '@/data/pennyCapabilityData';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 w-28 shrink-0 mt-0.5">{label}</span>
      <span className="text-[12px] text-foreground flex-1">{value}</span>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items?.length) return <p className="text-[11px] text-muted-foreground">—</p>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(item => (
        <span key={item} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-muted border border-border text-foreground">{item}</span>
      ))}
    </div>
  );
}

function OverviewTab({ cap }: { cap: PennyCapability }) {
  const readinessCfg = CAPABILITY_READINESS_CONFIG[cap.maturity];
  const domainCfg    = CAPABILITY_DOMAIN_CONFIG[cap.domain];
  const isOperational = cap.maturity === 'Operational' || cap.maturity === 'Integrated';
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-3xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${readinessCfg?.cls ?? 'bg-muted text-muted-foreground border-border'}`}>
            {cap.maturity}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${domainCfg?.cls ?? 'bg-muted text-muted-foreground border-border'}`}>
            {cap.domain}
          </span>
        </div>
        {cap.purpose && (
          <p className="text-[12px] text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-4">{cap.purpose}</p>
        )}
        <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
          <InfoRow label="Short Description" value={cap.shortDescription} />
          <InfoRow label="Readiness"         value={cap.maturity} />
          <InfoRow label="Domain"            value={cap.domain} />
          {cap.audience?.length > 0 && <InfoRow label="Audience" value={cap.audience.join(', ')} />}
        </div>
        {cap.inputs?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 mb-2">Inputs</p>
            <ChipList items={cap.inputs} />
          </div>
        )}
        {cap.outputs?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 mb-2">Outputs</p>
            <ChipList items={cap.outputs} />
          </div>
        )}
        {isOperational && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[11px] font-bold text-emerald-700">Operational</p>
            <p className="text-[12px] text-emerald-800">This capability is live and serving learners or coaches.</p>
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
      <div className="p-5 space-y-3 max-w-3xl">
        <p className="text-[12px] text-muted-foreground">Prompt templates that power this capability. Manage templates in Prompt Studio.</p>
        {prompts.length > 0 ? (
          prompts.map(prompt => (
            <div key={prompt} className="rounded-lg border border-border bg-white p-4">
              <p className="text-[12px] font-bold text-foreground">{prompt.split('—')[0].trim()}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{prompt.split('—')[1]?.trim() ?? ''}</p>
              <span className="inline-flex items-center mt-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Operational</span>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-muted bg-muted/30 p-4">
            <p className="text-[12px] text-muted-foreground">No prompt templates mapped for this capability yet.</p>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">Full prompt authoring and version history available in Prompt Studio.</p>
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
      <div className="p-5 space-y-3 max-w-3xl">
        <p className="text-[12px] text-muted-foreground">Knowledge sources this capability depends on. All sources require trust review before Penny activation.</p>
        {sources.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {['Source', 'Trust Level', 'Status'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-[9px] font-bold uppercase text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.map((s, i) => (
                  <tr key={s.name} className={`border-b border-border/40 ${i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                    <td className="px-3 py-2 font-medium text-foreground">{s.name}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${s.trust === 'Authoritative' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {s.trust}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-emerald-600 font-semibold">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">No knowledge sources mapped for this capability.</p>
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
  const scoreColor = score >= 85 ? 'text-emerald-600' : score >= 75 ? 'text-amber-600' : 'text-rose-600';

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-3xl">
        {isOperational ? (
          <>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className={`text-4xl font-bold font-serif ${scoreColor}`}>{score}</p>
                <p className="text-[10px] text-muted-foreground">/ 100</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mt-1">Quality Score</p>
              </div>
              <div className="flex-1">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${score >= 85 ? 'bg-emerald-400' : score >= 75 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width:`${score}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{score >= 80 ? 'Meets quality threshold' : 'Below threshold — review recommended'}</p>
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
            <p className="text-[12px] text-muted-foreground">Quality monitoring is active for Operational and Integrated capabilities. This capability is in <strong>{cap.maturity}</strong> state.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function HealthTab({ cap }: { cap: PennyCapability }) {
  const isOp = cap.maturity === 'Operational' || cap.maturity === 'Integrated';
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        {[
          { label:'Capability Readiness',  health: isOp ? 'healthy' as const : 'needs-attention' as const, note:cap.maturity },
          { label:'Prompt Template',       health: isOp ? 'healthy' as const : 'incomplete' as const,      note: isOp ? 'Approved and operational' : 'Pending approval' },
          { label:'Knowledge Sources',     health:'healthy' as const, note:'Trust reviews current' },
          { label:'Quality Review',        health: cap.id === 'coach-support' ? 'needs-attention' as const : 'healthy' as const, note: cap.id === 'coach-support' ? 'Quarterly review missed' : 'Last review passed (Q2 2025)' },
          { label:'Governance Compliance', health:'healthy' as const, note:'Penny Blueprint compliant' },
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

function InfoRowLocal({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 w-28 shrink-0 mt-0.5">{label}</span>
      <span className="text-[12px] text-foreground flex-1">{value}</span>
    </div>
  );
}

export default function PennyWorkspace() {
  const readinessOrder: Record<string, number> = {
    'Operational':3,'Integrated':3,'In Development':2,'Planned':1,'Defined':0,'Prototype':0,
  };

  const sorted = useMemo(() => [...STATIC_CAPS].sort((a, b) =>
    (readinessOrder[b.maturity] ?? 0) - (readinessOrder[a.maturity] ?? 0)
  ), []);

  const healthByReadiness = (r: string): WorkspaceItem['health'] =>
    r === 'Operational' || r === 'Integrated' ? 'healthy' :
    r === 'In Development' ? 'needs-attention' : 'incomplete';

  const items = useMemo<WorkspaceItem[]>(() => sorted.map(cap => ({
    id: cap.id,
    name: cap.name,
    typeName: cap.domain,
    typeColor: 'text-pink-700',
    typeBg: 'bg-pink-50',
    status: cap.maturity,
    statusVariant: (cap.maturity === 'Operational' || cap.maturity === 'Integrated') ? ('active' as const) :
                   cap.maturity === 'In Development' ? ('planning' as const) : ('draft' as const),
    health: healthByReadiness(cap.maturity),
    secondary: cap.shortDescription,
    owner: 'Penny Lead',
  })), [sorted]);

  const tabs = useMemo<WorkspaceTab[]>(() => [
    { id:'overview',  label:'Overview',         render:(item) => { const cap = STATIC_CAPS.find(c => c.id === item.id); return cap ? <OverviewTab cap={cap} /> : null; } },
    { id:'prompts',   label:'Prompts',           render:(item) => { const cap = STATIC_CAPS.find(c => c.id === item.id); return cap ? <PromptsTab cap={cap} /> : null; } },
    { id:'sources',   label:'Knowledge Sources', render:(item) => { const cap = STATIC_CAPS.find(c => c.id === item.id); return cap ? <SourcesTab cap={cap} /> : null; } },
    { id:'quality',   label:'Quality',           render:(item) => { const cap = STATIC_CAPS.find(c => c.id === item.id); return cap ? <QualityTab cap={cap} /> : null; } },
    { id:'health',    label:'Health',            render:(item) => { const cap = STATIC_CAPS.find(c => c.id === item.id); return cap ? <HealthTab cap={cap} /> : null; } },
  ], []);

  return (
    <ObjectWorkspace
      icon={Brain}
      items={items}
      tabs={tabs}
      emptyTitle="Select a capability"
      emptyBody="Choose a Penny capability from the list to view its prompts, knowledge sources, quality metrics, and health."
    />
  );
}
