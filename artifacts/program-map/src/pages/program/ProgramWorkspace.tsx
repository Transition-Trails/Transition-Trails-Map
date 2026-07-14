import { useMemo } from 'react';
import { GraduationCap, RefreshCw, WifiOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import { useSfPrograms } from '@/hooks/useSfPrograms';
import { ObjectWorkspace, HealthDot, StatusBadge } from '@/components/workspace/ObjectWorkspace';
import type { WorkspaceItem, WorkspaceTab } from '@/components/workspace/ObjectWorkspace';
import type { Program } from '@/data/programs';

// ── Shared utilities ───────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 w-28 shrink-0 mt-0.5">{label}</span>
      <span className="text-[12px] text-foreground flex-1">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{title}</p>
      {children}
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items?.length) return <p className="text-[11px] text-muted-foreground">—</p>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(item => (
        <span key={item} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-muted border border-border text-foreground">
          {item}
        </span>
      ))}
    </div>
  );
}

// ── Tab components ─────────────────────────────────────────────────────────────
function OverviewTab({ p }: { p: Program }) {
  const { isEveryday } = useTierFlags();
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5 max-w-3xl">
        {p.executiveSummary && (
          <p className="text-[13px] text-muted-foreground italic leading-relaxed border-l-4 border-primary/20 pl-4">{p.executiveSummary}</p>
        )}
        <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
          <InfoRow label="Audience"     value={p.audience} />
          <InfoRow label="Format"       value={p.format} />
          <InfoRow label="Duration"     value={p.duration} />
          <InfoRow label="Prerequisite" value={p.prerequisite || '—'} />
          <InfoRow label="Core Outcome" value={p.coreOutcome} />
          {!isEveryday && <InfoRow label="Source of Truth" value={p.sourceDoc} />}
          <InfoRow label="Strategic Role" value={p.strategicRole} />
        </div>
        {p.whyItMatters && (
          <Section title="Why It Matters">
            <p className="text-[12px] text-foreground leading-relaxed">{p.whyItMatters}</p>
          </Section>
        )}
        {p.keyFacts?.length > 0 && (
          <Section title="Key Facts">
            <ul className="space-y-1">
              {p.keyFacts.map((f, i) => <li key={i} className="text-[12px] text-muted-foreground flex items-start gap-2"><span className="text-primary mt-0.5">·</span>{f}</li>)}
            </ul>
          </Section>
        )}
        {p.outcomes?.length > 0 && (
          <Section title="Outcomes">
            <ul className="space-y-1">
              {p.outcomes.map((o, i) => <li key={i} className="text-[12px] text-foreground flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span>{o}</li>)}
            </ul>
          </Section>
        )}
        {!isEveryday && p.whatBreaksIfMissing && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-[10px] font-bold text-rose-700 uppercase mb-1">What Breaks if Missing</p>
            <p className="text-[12px] text-rose-800 leading-relaxed">{p.whatBreaksIfMissing}</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function BlueprintTab({ p }: { p: Program }) {
  const isCompliant = p.confidence === 'confirmed';
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5 max-w-3xl">
        <div className={`rounded-lg border px-4 py-3 ${isCompliant ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isCompliant ? 'text-emerald-700' : 'text-amber-700'}`}>
            Blueprint Compliance — {isCompliant ? 'Confirmed' : 'Needs Review'}
          </p>
          <p className={`text-[12px] leading-relaxed ${isCompliant ? 'text-emerald-800' : 'text-amber-800'}`}>
            {isCompliant
              ? `${p.name} is confirmed compliant with Program Blueprint v2.`
              : `${p.name} has been flagged for blueprint review. Sprint structure migration may be pending.`}
          </p>
        </div>
        <Section title="Governing Blueprints">
          <ChipList items={['Program Blueprint v2', 'Module Blueprint', 'Penny Blueprint']} />
        </Section>
        <Section title="RESOLVE Phases">
          <ChipList items={p.resolvePhases ?? []} />
        </Section>
        <Section title="Trail OS Capabilities">
          <ChipList items={p.trailOsCapabilities ?? []} />
        </Section>
        {p.dependencies && (
          <Section title="Dependencies">
            <p className="text-[12px] text-muted-foreground leading-relaxed">{p.dependencies}</p>
          </Section>
        )}
        <Section title="Source Documents">
          <ChipList items={p.docs ?? []} />
        </Section>
      </div>
    </ScrollArea>
  );
}

function PennyTab({ p }: { p: Program }) {
  const { isEveryday } = useTierFlags();
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-3xl">
        <p className="text-[12px] text-muted-foreground">
          {isEveryday
            ? 'Penny features available in this program to help you with coaching, feedback, and learning activities.'
            : 'Penny AI capabilities that are activated or planned for this program.'}
        </p>
        <Section title={isEveryday ? 'Available Penny Features' : 'Active Penny Features'}>
          {p.pennyFeatures?.length > 0 ? (
            <div className="space-y-2">
              {p.pennyFeatures.map(f => (
                <div key={f} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-[12px] text-foreground font-medium">{f}</span>
                  <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">Active</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">No Penny features mapped yet.</p>
          )}
        </Section>
        {!isEveryday && (
          <Section title="Related Concepts">
            {p.relatedConcepts?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {p.relatedConcepts.map((rc, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-muted border border-border text-foreground">
                    {rc.label}
                    <span className="ml-1 text-muted-foreground/60">{rc.type}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">No related concepts mapped.</p>
            )}
          </Section>
        )}
      </div>
    </ScrollArea>
  );
}

function SystemsTab({ p }: { p: Program }) {
  const systems = [
    { name:'Salesforce',     status:'Connected', detail:'Program records, cohort data, learner enrollment', cls:'border-emerald-200 bg-emerald-50', badge:'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name:'Google Drive',   status:'Connected', detail:`${p.name} curriculum folder and sprint resources`, cls:'border-emerald-200 bg-emerald-50', badge:'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name:'Slack',          status:'Active',    detail:'Cohort and coach channels', cls:'border-emerald-200 bg-emerald-50', badge:'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name:'Penny AI',       status:'Active',    detail:(p.pennyFeatures ?? []).join(', ') || 'No features activated', cls:'border-primary/20 bg-primary/5', badge:'bg-primary/10 text-primary border-primary/20' },
    { name:'Google Calendar',status:'Active',    detail:'Sprint schedule and cohort events', cls:'border-emerald-200 bg-emerald-50', badge:'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name:'PMM (Salesforce)',status:'Planned',  detail:'Marketing Cloud integration planned for Q3 2025', cls:'border-muted bg-muted/30', badge:'bg-muted text-muted-foreground border-border' },
    { name:'LMS',            status:'Planned',   detail:'Learner progress and content delivery — Q4 2025', cls:'border-muted bg-muted/30', badge:'bg-muted text-muted-foreground border-border' },
  ];
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        {systems.map(s => (
          <div key={s.name} className={`rounded-lg border p-3 ${s.cls}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-bold text-foreground">{s.name}</span>
              <span className={`text-[9px] font-bold border rounded px-1.5 py-0.5 ${s.badge}`}>{s.status}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{s.detail}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function HealthTab({ p }: { p: Program }) {
  const isHealthy = p.confidence === 'confirmed';
  const indicators = [
    { label:'Blueprint Compliance',   status: p.confidence === 'confirmed' ? 'healthy' : 'needs-attention', note: p.confidence === 'confirmed' ? 'Fully compliant with Program Blueprint v2' : 'Review required' },
    { label:'Salesforce Data Quality',status:'healthy',         note:'94% field completion across program records' },
    { label:'Penny Integration',      status: (p.pennyFeatures?.length ?? 0) > 0 ? 'healthy' : 'needs-attention', note: (p.pennyFeatures?.length ?? 0) > 0 ? `${p.pennyFeatures.length} features active` : 'No Penny features activated' },
    { label:'Knowledge Sources',      status:'healthy',         note:'Knowledge registry linkage confirmed' },
    { label:'Coach Assignment',       status:'healthy',         note:'All active cohorts have assigned coaches' },
    { label:'Org Memory',             status:isHealthy ? 'healthy' : 'incomplete', note: isHealthy ? 'Decisions documented' : 'Missing decision records from last retrospective' },
  ] as const;
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        {indicators.map(ind => (
          <div key={ind.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
            <div className="flex items-center gap-2.5">
              <HealthDot health={ind.status} />
              <span className="text-[12px] font-medium text-foreground">{ind.label}</span>
            </div>
            <span className="text-[11px] text-muted-foreground text-right max-w-xs">{ind.note}</span>
          </div>
        ))}
        <div className="rounded-lg border border-muted p-3 mt-2">
          <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-1">Source of Truth</p>
          <p className="text-[12px] text-foreground">{p.sourceDoc}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Authoritative record: Salesforce</p>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── ProgramWorkspace ──────────────────────────────────────────────────────────
export default function ProgramWorkspace() {
  const { programs } = useAppContext();
  const { isEveryday, isPowerOrAbove, isAdminOrAbove } = useTierFlags();
  const { isLoading, isError, refetch, isFetching } = useSfPrograms();

  const items = useMemo<WorkspaceItem[]>(() => programs.map(p => ({
    id: p.id,
    name: p.name,
    typeName: 'Program',
    typeColor: 'text-emerald-700',
    typeBg: 'bg-emerald-50',
    status: p.status ?? (p.confidence === 'confirmed' ? 'Active' : p.confidence === 'needs-review' ? 'Review' : p.confidence),
    statusVariant: (p.status === 'Active' || p.confidence === 'confirmed') ? ('active' as const) : ('planning' as const),
    health: (p.status === 'Active' || p.confidence === 'confirmed') ? ('healthy' as const) : ('needs-attention' as const),
    secondary: p.status
      ? `${p.status}${p.startDate ? ` · From ${p.startDate}` : ''}`
      : `${p.format} · ${p.duration}`,
    owner: !isEveryday ? (p.programManager ?? 'Program Director') : undefined,
    confidence: !isEveryday ? (p.confidence === 'confirmed' ? 91 : 72) : undefined,
  })), [programs, isEveryday]);

  const tabs = useMemo<WorkspaceTab[]>(() => [
    { id:'overview',   label:'Overview',    render:(item) => { const p = programs.find(x => x.id === item.id); return p ? <OverviewTab p={p} /> : null; } },
    ...(isPowerOrAbove ? [
      { id:'blueprint',  label:'Blueprint',   render:(item: WorkspaceItem) => { const p = programs.find(x => x.id === item.id); return p ? <BlueprintTab p={p} /> : null; } },
    ] : []),
    { id:'curriculum', label:'Curriculum',  render:() => (
      <ScrollArea className="h-full">
        <div className="p-5 max-w-2xl">
          <p className="text-[11px] text-muted-foreground mb-3">Curriculum content is managed in the Standards Studio. Navigate to the full Standards or Curriculum pages for detailed module and lesson editing.</p>
          <div className="space-y-2">
            {['Sprint 1 — Job Search Foundations','Sprint 2 — LinkedIn & Digital Presence','Sprint 3 — Resume Writing','Sprint 4 — Interview Preparation'].map((s, i) => (
              <div key={s} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-white">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                <span className="text-[12px] text-foreground font-medium">{s}</span>
                <span className="ml-auto text-[10px] text-emerald-600 font-bold">Active</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    )},
    { id:'penny', label: isEveryday ? 'Penny Help' : 'Penny', render:(item) => { const p = programs.find(x => x.id === item.id); return p ? <PennyTab p={p} /> : null; } },
    ...(isPowerOrAbove ? [
      { id:'systems', label:'Systems', render:(item: WorkspaceItem) => { const p = programs.find(x => x.id === item.id); return p ? <SystemsTab p={p} /> : null; } },
    ] : []),
    ...(isAdminOrAbove ? [
      { id:'health', label:'Health', render:(item: WorkspaceItem) => { const p = programs.find(x => x.id === item.id); return p ? <HealthTab p={p} /> : null; } },
    ] : []),
  ], [programs, isEveryday, isPowerOrAbove, isAdminOrAbove]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
          <WifiOff className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground mb-1">Could not load programs</p>
          <p className="text-[11px] text-muted-foreground">Salesforce is unreachable. Check your connection and try again.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-[11px] font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <RefreshCw className="w-5 h-5 text-primary/40 animate-spin" />
        <p className="text-[11px] text-muted-foreground">Loading programs from Salesforce…</p>
      </div>
    );
  }

  return (
    <ObjectWorkspace
      icon={GraduationCap}
      items={items}
      tabs={tabs}
      emptyTitle="Select a program"
      emptyBody={
        isEveryday
          ? 'Choose a program to see its schedule, your cohort, upcoming sessions, and Penny support.'
          : 'Choose a program from the list to explore its blueprint alignment, curriculum, Penny features, systems, and health.'
      }
    />
  );
}
