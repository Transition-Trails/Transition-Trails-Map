import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { TERMS } from '@/config/terminology';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectWorkspace, HealthDot } from '@/components/workspace/ObjectWorkspace';
import type { WorkspaceItem, WorkspaceTab } from '@/components/workspace/ObjectWorkspace';
import { personas, roles, type Persona, type Role } from '@/data/peopleRolesData';

type PersonaOrRole = (Persona & { _kind: 'persona' }) | (Role & { _kind: 'role' });

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 w-28 shrink-0 mt-0.5">{label}</span>
      <span className="text-[12px] text-foreground flex-1">{value}</span>
    </div>
  );
}

function OverviewTab({ item }: { item: PersonaOrRole }) {
  const isPersona = item._kind === 'persona';
  const p = item as Persona;
  const r = item as Role;
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-3xl">
        {isPersona ? (
          <>
            <p className="text-[12px] text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-4">{p.purpose}</p>
            <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
              <InfoRow label="Type"        value={p.type} />
              <InfoRow label="Description" value={p.description} />
              <InfoRow label="Health"      value={<span className={`capitalize ${p.healthStatus === 'healthy' ? 'text-[#2F6B3F]' : 'text-[#CC8400]'}`}>{p.healthStatus.replace('-',' ')}</span>} />
            </div>
            {p.keyOutcomes?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-2">Key Outcomes</p>
                <ul className="space-y-1">
                  {p.keyOutcomes.map((o, i) => <li key={i} className="text-[12px] text-foreground flex items-start gap-2"><span className="text-[#2F6B3F] mt-0.5">✓</span>{o}</li>)}
                </ul>
              </div>
            )}
            {p.healthIssues?.length > 0 && (
              <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] p-3">
                <p className="text-[10px] font-bold uppercase text-[#CC8400] mb-2">Health Issues</p>
                {p.healthIssues.map((issue, i) => <p key={i} className="text-[12px] text-[#CC8400] leading-relaxed">{issue}</p>)}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-[12px] text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-4">{r.description}</p>
            <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
              <InfoRow label="Type"             value={r.type} />
              <InfoRow label="Blueprint Status" value={
                <span className={r.blueprintStatus === 'complete' ? 'text-[#2F6B3F] font-semibold' : r.blueprintStatus === 'draft' ? 'text-[#CC8400] font-semibold' : 'text-[#A93F2F] font-semibold'}>
                  {r.blueprintStatus.charAt(0).toUpperCase() + r.blueprintStatus.slice(1)}
                </span>
              } />
              <InfoRow label="Health"           value={<span className={r.healthStatus === 'healthy' ? 'text-[#2F6B3F]' : 'text-[#CC8400]'}>{r.healthStatus.replace('-',' ')}</span>} />
            </div>
            {r.healthStatus !== 'healthy' && (
              <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] p-3">
                <p className="text-[11px] text-[#CC8400]">This role has health issues. Check the Health tab for details.</p>
              </div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}

function ResponsibilitiesTab({ item }: { item: PersonaOrRole }) {
  const isPersona = item._kind === 'persona';
  const p = item as Persona;
  const r = item as Role;
  const responsibilities = isPersona ? (p.coreResponsibilities ?? []) : ((r as any).coreResponsibilities ?? (r as any).responsibilities ?? []);
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        {responsibilities.length > 0 ? (
          <ul className="space-y-2">
            {responsibilities.map((resp: string, i: number) => (
              <li key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border bg-white">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                <span className="text-[12px] text-foreground">{resp}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-muted bg-muted/30 p-4">
            <p className="text-[12px] text-muted-foreground">Responsibilities not yet documented for this persona/role.</p>
          </div>
        )}
        {isPersona && (p as Persona).setupSteps?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-2">Setup Steps</p>
            <ul className="space-y-1">
              {(p as Persona).setupSteps.map((step, i) => (
                <li key={i} className="text-[12px] text-muted-foreground flex items-start gap-2"><span className="text-primary mt-0.5">{i+1}.</span>{step}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function ProgramsTab({ item }: { item: PersonaOrRole }) {
  const isPersona = item._kind === 'persona';
  const p = item as Persona;
  const r = item as Role;
  const progs = isPersona ? (p.relatedPrograms ?? []) : ((r as any).relatedPrograms ?? ['Foundations Trail', 'Guided Trail']);
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        <p className="text-[12px] text-muted-foreground">Programs this {isPersona ? 'persona' : 'role'} participates in or is related to.</p>
        {progs.length > 0 ? (
          <div className="space-y-2">
            {progs.map((prog: string) => (
              <div key={prog} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-white">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F6B3F] shrink-0" />
                <span className="text-[12px] text-foreground font-medium">{prog}</span>
                <span className="ml-auto text-[10px] text-[#2F6B3F] font-bold">Active</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">No programs mapped yet.</p>
        )}
      </div>
    </ScrollArea>
  );
}

function PennyTabP({ item }: { item: PersonaOrRole }) {
  const isPersona = item._kind === 'persona';
  const p = item as Persona;
  const r = item as Role;
  const caps = isPersona ? (p.relatedPennyCapabilities ?? []) : ((r as any).relatedPennyCapabilities ?? []);
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        <p className="text-[12px] text-muted-foreground">{TERMS.aiAssistant} capabilities linked to this {isPersona ? 'persona' : 'role'}.</p>
        {caps.length > 0 ? (
          <div className="space-y-2">
            {caps.map((cap: string) => (
              <div key={cap} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-white">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F6F7E] shrink-0" />
                <span className="text-[12px] text-foreground font-medium">{cap}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">No Penny capabilities linked to this {isPersona ? 'persona' : 'role'} yet.</p>
        )}
      </div>
    </ScrollArea>
  );
}

function HealthTabP({ item }: { item: PersonaOrRole }) {
  const isPersona = item._kind === 'persona';
  const p = item as Persona;
  const r = item as Role;
  const health = (isPersona ? p.healthStatus : r.healthStatus) ?? 'healthy';
  const blueprintStatus = isPersona ? 'complete' : (r.blueprintStatus ?? 'missing');

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        {[
          { label:'Overall Health',      health: health === 'healthy' ? 'healthy' as const : health === 'needs-attention' ? 'needs-attention' as const : 'incomplete' as const, note: health.replace('-',' ') },
          { label:'Blueprint',           health: blueprintStatus === 'complete' ? 'healthy' as const : blueprintStatus === 'draft' ? 'needs-attention' as const : 'incomplete' as const, note: blueprintStatus.charAt(0).toUpperCase() + blueprintStatus.slice(1) },
          { label:'Program Coverage',    health:'healthy' as const, note:'All active programs have assigned personnel' },
          { label:`${TERMS.aiAssistant} Integration`,   health:'healthy' as const, note:`${TERMS.aiAssistant} support configured` },
          { label:'SF Mapping',          health:'healthy' as const, note:'Salesforce object mappings documented' },
        ].map(ind => (
          <div key={ind.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
            <div className="flex items-center gap-2.5">
              <HealthDot health={ind.health} />
              <span className="text-[12px] font-medium text-foreground">{ind.label}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{ind.note}</span>
          </div>
        ))}
        {isPersona && (p as Persona).healthIssues?.length > 0 && (
          <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase text-[#CC8400] mb-1">Open Issues</p>
            {(p as Persona).healthIssues.map((issue, i) => <p key={i} className="text-[12px] text-[#CC8400]">{issue}</p>)}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default function PeopleWorkspace() {
  const allPersonas: PersonaOrRole[] = useMemo(() => personas.map(p => ({ ...p, _kind: 'persona' as const })), []);
  const allRoles: PersonaOrRole[]    = useMemo(() => roles.map(r => ({ ...r, _kind: 'role' as const })), []);
  const combined = useMemo(() => [...allPersonas, ...allRoles], [allPersonas, allRoles]);

  const items = useMemo<WorkspaceItem[]>(() => combined.map(item => {
    const isPersona = item._kind === 'persona';
    const p = item as Persona;
    const r = item as Role;
    const health = (isPersona ? p.healthStatus : r.healthStatus) ?? 'healthy';
    return {
      id: item.id,
      name: isPersona ? p.name : r.name,
      typeName: isPersona ? p.type : r.type,
      typeColor: isPersona ? 'text-[#2F6F7E]' : 'text-[#2F6F7E]',
      typeBg: isPersona ? 'bg-[#EDF5F8]' : 'bg-[#EDF5F8]',
      status: isPersona ? 'Persona' : 'Role',
      health: health === 'healthy' ? ('healthy' as const) : health === 'needs-attention' ? ('needs-attention' as const) : ('incomplete' as const),
      secondary: isPersona ? (p as any).shortName ?? '' : r.type,
      owner: 'Program Director',
    };
  }), [combined]);

  const findItem = (id: string) => combined.find(i => i.id === id);

  const tabs = useMemo<WorkspaceTab[]>(() => [
    { id:'overview',        label:'Overview',        render:(item) => { const i = findItem(item.id); return i ? <OverviewTab item={i} /> : null; } },
    { id:'responsibilities',label:'Responsibilities',render:(item) => { const i = findItem(item.id); return i ? <ResponsibilitiesTab item={i} /> : null; } },
    { id:'programs',        label:'Programs',        render:(item) => { const i = findItem(item.id); return i ? <ProgramsTab item={i} /> : null; } },
    { id:'penny',           label:TERMS.aiAssistant, render:(item) => { const i = findItem(item.id); return i ? <PennyTabP item={i} /> : null; } },
    { id:'health',          label:'Health',          render:(item) => { const i = findItem(item.id); return i ? <HealthTabP item={i} /> : null; } },
  ], [combined]);

  return (
    <ObjectWorkspace
      icon={Users}
      items={items}
      tabs={tabs}
      emptyTitle="Select a persona or role"
      emptyBody="Choose a persona or role to view responsibilities, program participation, Penny support, and health."
    />
  );
}
