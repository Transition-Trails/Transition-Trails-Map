import { useAppContext } from '@/context/AppContext';
import type { ResolvePhase } from '@/data/resolvePhases';
import { ArrowRight } from 'lucide-react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

// ── Prototype phase health data · future: Salesforce MCP ─────────────────────
const PHASE_HEALTH: Record<string, {
  status: 'active' | 'needs-review' | 'planning';
  owner: string;
  activePrograms: string[];
  initiatives: number;
  commChannels: string[];
  demandNote?: string;
}> = {
  recognize: { status: 'active',       owner: 'Program Lead',          activePrograms: ["Explorer's Trail", 'Foundations Trail', 'Digital Compass'], initiatives: 2, commChannels: ['#case-intake'] },
  evaluate:  { status: 'active',       owner: 'Program Lead',          activePrograms: ["Explorer's Trail", 'Foundations Trail', 'Digital Compass'], initiatives: 1, commChannels: ['#org-assessment'] },
  solve:     { status: 'active',       owner: 'Curriculum Lead',       activePrograms: ['Foundations Trail', 'Guided Trail', 'Digital Compass'],     initiatives: 2, commChannels: ['#program-design'], demandNote: 'Trail of Mastery design active' },
  organize:  { status: 'active',       owner: 'Operations',            activePrograms: ['Guided Trail', 'Digital Compass'],                          initiatives: 3, commChannels: ['#project-delivery'] },
  leverage:  { status: 'active',       owner: 'Facilitation',          activePrograms: ['Guided Trail', 'Digital Compass'],                          initiatives: 4, commChannels: ['#trail-talks-cohort-{N}', '#coach-alerts'], demandNote: '2 cohorts active' },
  verify:    { status: 'active',       owner: 'Outcomes Lead',         activePrograms: ['Guided Trail', 'Trail of Mastery'],                         initiatives: 1, commChannels: ['#outcomes-reports', '#trail-wins'] },
  execute:   { status: 'needs-review', owner: 'Source mapping needed', activePrograms: ['Trail of Mastery'],                                         initiatives: 0, commChannels: [], demandNote: 'Phase distinction needs source review' },
  evolve:    { status: 'active',       owner: 'Program Lead',          activePrograms: ['Guided Trail', 'Trail of Mastery'],                         initiatives: 1, commChannels: ['#program-updates'] },
};

// ── Operational mappings ──────────────────────────────────────────────────────
const OP_MAPPINGS = [
  {
    id: 'map-1', phase: 'Recognize', phaseLetter: 'R',
    trailOs:  'Intake Coordination · Learner Assessment',
    penny:    'Discovery Assistant',
    artifact: 'Intake Record · Discovery Brief',
    description: 'New program needs and learner requests surface through Intake Coordination. Trail Guide operates in discovery mode to structure incoming signals into briefs. Output is an Intake Record and Discovery Brief that gates entry to the Evaluate phase.',
    commChannels: ['#case-intake (planned)'],
    sources: ["Explorer's Trail Blueprint", 'RESOLVE Course Canvas'],
  },
  {
    id: 'map-2', phase: 'Evaluate', phaseLetter: 'E',
    trailOs:  'Org Readiness · Strategic Analysis',
    penny:    'Insight Summary',
    artifact: 'Evaluation Brief',
    description: 'Intake records and discovery briefs are evaluated against org capacity, strategic fit, and learner readiness. Penny surfaces structured insight summaries from existing data patterns. Output is an Evaluation Brief that gates the Solve phase.',
    commChannels: ['#org-assessment (planned)'],
    sources: ['RESOLVE Course Canvas', 'Program Comparison Sheet'],
  },
  {
    id: 'map-3', phase: 'Organize', phaseLetter: 'O',
    trailOs:  'Project Delivery · Documentation',
    penny:    'Build Companion',
    artifact: 'Sprint Plan · Backlog',
    description: 'Approved designs are structured into executable delivery plans. Build Companion assists with sprint backlog creation and documentation scaffolding. Output is a Sprint Plan and Backlog ready for facilitation handoff.',
    commChannels: ['#project-delivery (planned)', '#cohort-setup (planned)'],
    sources: ['Guided Trail Sprint Cadence', 'RESOLVE Course Canvas'],
  },
  {
    id: 'map-4', phase: 'Verify', phaseLetter: 'V',
    trailOs:  'Outcomes Tracking',
    penny:    'Coach Intelligence',
    artifact: 'UAT · Feedback Summary',
    description: 'Delivery outcomes are assessed against intended results. Coach Intelligence surfaces learner progress signals, risk flags, and feedback patterns. Output is a UAT summary and Feedback Report that feeds the Evolve phase.',
    commChannels: ['#outcomes-reports (planned)', '#trail-wins (planned)'],
    sources: ['RESOLVE Course Canvas', 'Pricing Analysis'],
  },
];

// ── Active work items ─────────────────────────────────────────────────────────
const ACTIVE_WORK = [
  { id: 'work-1', name: 'Guided Trail Cohort 1',      phase: 'Leverage',  program: 'Guided Trail',      status: 'active',       owner: 'Facilitation Team', nextDate: 'Nov 2025', commChannels: ['#cohort-guided-1', '#penny-alerts'] },
  { id: 'work-2', name: 'Foundations Trail Cohort 2', phase: 'Organize',  program: 'Foundations Trail', status: 'active',       owner: 'Operations',        nextDate: 'Oct 2025', commChannels: ['#cohort-foundations-2'] },
  { id: 'work-3', name: 'Trail of Mastery Design',    phase: 'Solve',     program: 'Trail of Mastery',  status: 'in-discovery', owner: 'Curriculum Lead',   nextDate: 'Q3 2025',  commChannels: ['#program-design'] },
  { id: 'work-4', name: 'Digital Compass Org Cohort', phase: 'Leverage',  program: 'Digital Compass',   status: 'active',       owner: 'Client Services',   nextDate: 'Q4 2025',  commChannels: ['#cohort-compass-1'] },
  { id: 'work-5', name: 'Salesforce Case Intake',     phase: 'Recognize', program: 'Operations',        status: 'planning',     owner: 'Operations',        nextDate: 'Q3 2025',  commChannels: ['#case-intake'] },
  { id: 'work-6', name: 'Knowledge Base Build',       phase: 'Evolve',    program: 'Platform',          status: 'in-progress',  owner: 'Documentation',     nextDate: 'Ongoing',  commChannels: ['#program-updates'] },
];

// ── Demand signal metrics ─────────────────────────────────────────────────────
const DEMAND_METRICS = [
  { id: 'dem-1', label: 'New Requests',  count: 3,  note: 'Incoming pipeline',   dotCls: 'bg-sky-400',             description: 'Requests received but not yet assessed for strategic fit or org capacity.' },
  { id: 'dem-2', label: 'In Assessment', count: 2,  note: 'Evaluating fit',      dotCls: 'bg-amber-400',           description: 'Active evaluation against strategic fit, learner readiness, and org capacity.' },
  { id: 'dem-3', label: 'Approved',      count: 4,  note: 'Ready to start',      dotCls: 'bg-emerald-400',         description: 'Approved for delivery, awaiting sprint organization and facilitator assignment.' },
  { id: 'dem-4', label: 'In Progress',   count: 6,  note: 'Active delivery',     dotCls: 'bg-primary',             description: 'Currently in active delivery across Leverage and Organize phases of RESOLVE.' },
  { id: 'dem-5', label: 'Blocked',       count: 1,  note: 'Needs resolution',    dotCls: 'bg-red-400',             description: 'Blocked by a dependency, pricing gap, or awaiting external input or approval.' },
  { id: 'dem-6', label: 'Completed',     count: 12, note: 'Outcomes logged',     dotCls: 'bg-muted-foreground/40', description: 'Delivered and verified. Outputs are feeding the Evolve phase for reflection and improvement.' },
];

// ── Visual config ─────────────────────────────────────────────────────────────
const PHASE_ACCENT: Record<string, { bg: string; text: string }> = {
  recognize: { bg: 'bg-sky-500',      text: 'text-white' },
  evaluate:  { bg: 'bg-teal-600',     text: 'text-white' },
  solve:     { bg: 'bg-emerald-600',  text: 'text-white' },
  organize:  { bg: 'bg-green-700',    text: 'text-white' },
  leverage:  { bg: 'bg-primary',      text: 'text-white' },
  verify:    { bg: 'bg-violet-600',   text: 'text-white' },
  execute:   { bg: 'bg-orange-500',   text: 'text-white' },
  evolve:    { bg: 'bg-amber-500',    text: 'text-[hsl(220,15%,22%)]' },
};

const WORK_STATUS: Record<string, { label: string; dot: string }> = {
  'active':       { label: 'Active',       dot: 'bg-emerald-500' },
  'in-discovery': { label: 'In Discovery', dot: 'bg-sky-400' },
  'planning':     { label: 'Planning',     dot: 'bg-amber-400' },
  'in-progress':  { label: 'In Progress',  dot: 'bg-primary' },
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ResolveDemand() {
  const { setSelectedItem, selectedItem, resolvePhases } = useAppContext();

  const isSelected = (id: string) =>
    selectedItem?.type === 'resolve' && selectedItem?.id === id;

  const selectPhase = (phase: ResolvePhase) => {
    const h = PHASE_HEALTH[phase.id] ?? {};
    setSelectedItem({ type: 'resolve', id: phase.id, data: { ...phase, kind: 'phase', ...h } });
  };

  const selectMapping = (m: typeof OP_MAPPINGS[number]) =>
    setSelectedItem({ type: 'resolve', id: m.id, data: { ...m, kind: 'mapping' } });

  const selectWork = (w: typeof ACTIVE_WORK[number]) =>
    setSelectedItem({ type: 'resolve', id: w.id, data: { ...w, kind: 'work' } });

  const selectMetric = (m: typeof DEMAND_METRICS[number]) =>
    setSelectedItem({ type: 'resolve', id: m.id, data: { ...m, kind: 'metric' } });

  return (
    <div className="h-full w-full flex flex-col p-4 gap-3 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-serif font-bold text-foreground leading-tight">
            Delivery Operating System
          </h1>
          <span className="text-[10px] font-semibold text-muted-foreground/60 bg-muted/60 border border-border px-1.5 py-0.5 rounded flex-shrink-0">
            Prototype Data
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          How Transition Trails designs and delivers outcomes — RESOLVE · Trail OS · Penny AI · Active Work
        </p>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">

        {/* ── Section 1: RESOLVE Lifecycle ── */}
        <SectionHead
          title="RESOLVE Lifecycle"
          note="8 phases · Framework confirmed via RESOLVE Course Canvas · Prototype operational data"
        />
        <div className="grid grid-cols-4 gap-2">
          {resolvePhases.map((phase, idx) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              idx={idx}
              health={PHASE_HEALTH[phase.id]}
              accent={PHASE_ACCENT[phase.id] ?? { bg: 'bg-primary', text: 'text-white' }}
              isSelected={isSelected(phase.id)}
              onClick={() => selectPhase(phase)}
            />
          ))}
        </div>

        {/* ── Section 2: Operational Mapping ── */}
        <SectionHead
          title="Operational Mapping"
          note="RESOLVE Phase → Trail OS Capability → Penny AI Function → Program Artifact · click any row for details"
        />
        <div className="rounded-xl border border-border/60 bg-white/60 shadow-sm overflow-hidden">
          <div className="grid grid-cols-4 px-4 py-2 border-b border-border/40 bg-muted/20">
            {['RESOLVE Phase', 'Trail OS Capability', 'Penny AI Function', 'Program Artifact'].map(h => (
              <p key={h} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{h}</p>
            ))}
          </div>
          {OP_MAPPINGS.map((m, i) => (
            <MappingRow
              key={m.id}
              mapping={m}
              isSelected={isSelected(m.id)}
              onClick={() => selectMapping(m)}
              isLast={i === OP_MAPPINGS.length - 1}
            />
          ))}
        </div>

        {/* ── Section 3: Active Work ── */}
        <SectionHead
          title="Active Work by Phase"
          note="Prototype initiatives mapped to RESOLVE phases · future: Salesforce Cases"
        />
        <div className="grid grid-cols-3 gap-2">
          {ACTIVE_WORK.map(w => (
            <WorkCard
              key={w.id}
              item={w}
              isSelected={isSelected(w.id)}
              onClick={() => selectWork(w)}
            />
          ))}
        </div>

        {/* ── Section 4: Demand Signal Summary ── */}
        <SectionHead
          title="Demand Signal Summary"
          note="Prototype counts · future: Salesforce Cases live sync · click any metric to open its brief"
        />
        <div className="grid grid-cols-6 gap-2 pb-4">
          {DEMAND_METRICS.map(m => (
            <DemandMetric
              key={m.id}
              metric={m}
              isSelected={isSelected(m.id)}
              onClick={() => selectMetric(m)}
            />
          ))}
        </div>

      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 flex-wrap">
      <h2 className="text-sm font-bold text-foreground flex-shrink-0">{title}</h2>
      <span className="text-[9px] text-muted-foreground/60 truncate">{note}</span>
    </div>
  );
}

// ── PhaseCard ─────────────────────────────────────────────────────────────────
function PhaseCard({
  phase, idx, health, accent, isSelected, onClick,
}: {
  phase: ResolvePhase;
  idx: number;
  health: typeof PHASE_HEALTH[string];
  accent: { bg: string; text: string };
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusDot = health?.status === 'active' ? 'bg-emerald-500' : health?.status === 'needs-review' ? 'bg-amber-400' : 'bg-sky-400';
  const statusLbl = health?.status === 'active' ? 'Active' : health?.status === 'needs-review' ? 'Needs Review' : 'Planning';

  const headerCls = isSelected ? `${accent.bg} ${accent.text}` : 'bg-muted/30 text-foreground';
  const watermarkCls = isSelected ? 'text-white/15' : 'text-primary/10';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col text-left rounded-xl border-2 overflow-hidden transition-all duration-200 ${
        isSelected
          ? 'border-primary shadow-lg ring-2 ring-offset-1 ring-offset-background ring-primary/20'
          : 'border-border/50 bg-white hover:border-primary/40 hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className={`relative px-3 pt-2.5 pb-2 ${headerCls}`}>
        <span className={`absolute top-1 right-2 text-[40px] font-serif font-black leading-none select-none ${watermarkCls}`}>
          {phase.letter}
        </span>
        <p className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${isSelected ? 'opacity-70' : 'text-muted-foreground'}`}>
          Phase {idx + 1}
        </p>
        <p className={`font-serif font-bold text-[15px] leading-tight`}>
          {phase.name}
        </p>
      </div>

      {/* Body */}
      <div className="px-3 py-2 bg-white flex flex-col gap-1 flex-1">
        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{phase.purpose}</p>

        {health && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} />
            <span className="text-[9px] font-semibold text-muted-foreground">{statusLbl}</span>
            {health.initiatives > 0 && (
              <span className="text-[9px] text-muted-foreground">· {health.initiatives} active</span>
            )}
          </div>
        )}

        {health?.owner && health.owner !== 'Source mapping needed' && (
          <p className="text-[9px] text-muted-foreground leading-none truncate">
            <span className="font-semibold text-foreground/70">Owner: </span>{health.owner}
          </p>
        )}

        {/* Trail OS + Penny capability chips */}
        <div className="flex flex-wrap gap-0.5 mt-auto pt-0.5">
          {phase.trailOs.slice(0, 2).map(c => (
            <span key={c} className="text-[8px] bg-sky-50 border border-sky-200 text-sky-700 px-1 py-0.5 rounded leading-none">
              {c.split(' ').slice(0, 2).join(' ')}
            </span>
          ))}
          {phase.penny.slice(0, 1).map(p => (
            <span key={p} className="text-[8px] bg-violet-50 border border-violet-200 text-violet-700 px-1 py-0.5 rounded leading-none">
              ⚡ {p.split(' ')[0]}
            </span>
          ))}
        </div>

        {health?.activePrograms && (
          <p className="text-[9px] text-muted-foreground/55 leading-none">
            {health.activePrograms.length} program{health.activePrograms.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </button>
  );
}

// ── MappingRow ────────────────────────────────────────────────────────────────
function MappingRow({
  mapping, isSelected, onClick, isLast,
}: {
  mapping: typeof OP_MAPPINGS[number];
  isSelected: boolean;
  onClick: () => void;
  isLast: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left grid grid-cols-4 px-4 py-3 transition-all duration-150 ${
        !isLast ? 'border-b border-border/40' : ''
      } ${isSelected ? 'bg-primary/5 border-l-[3px] border-l-primary' : 'hover:bg-muted/20 border-l-[3px] border-l-transparent'}`}
    >
      <div className="pr-3 flex items-center gap-1 min-w-0">
        <span className="text-[13px] font-black font-serif text-primary/60 flex-shrink-0">{mapping.phaseLetter}</span>
        <span className="text-[11px] font-semibold text-foreground truncate">{mapping.phase}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
      </div>
      <div className="pr-3 min-w-0">
        <p className="text-[11px] text-sky-800 leading-snug line-clamp-2">{mapping.trailOs}</p>
      </div>
      <div className="pr-3 min-w-0">
        <p className="text-[11px] text-violet-700 font-medium leading-snug line-clamp-2">⚡ {mapping.penny}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{mapping.artifact}</p>
      </div>
    </button>
  );
}

// ── WorkCard ──────────────────────────────────────────────────────────────────
function WorkCard({
  item, isSelected, onClick,
}: {
  item: typeof ACTIVE_WORK[number];
  isSelected: boolean;
  onClick: () => void;
}) {
  const sc = WORK_STATUS[item.status] ?? { label: item.status, dot: 'bg-muted-foreground/40' };
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-3 transition-all duration-200 bg-white ${
        isSelected
          ? 'border-primary shadow-md ring-2 ring-offset-1 ring-offset-background ring-primary/20'
          : 'border-border/50 hover:border-primary/40 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 flex-1 min-w-0">{item.name}</p>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${sc.dot}`} />
      </div>
      <div className="flex items-center gap-1 flex-wrap mb-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wide text-primary/70 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
          {item.phase}
        </span>
        <span className="text-[9px] text-muted-foreground truncate">{item.program}</span>
      </div>
      <div className="flex items-center justify-between gap-1 min-w-0">
        <p className="text-[10px] text-muted-foreground truncate">{item.owner}</p>
        <p className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">{item.nextDate}</p>
      </div>
    </button>
  );
}

// ── DemandMetric ──────────────────────────────────────────────────────────────
function DemandMetric({
  metric, isSelected, onClick,
}: {
  metric: typeof DEMAND_METRICS[number];
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-3 transition-all duration-200 bg-white flex flex-col gap-1 ${
        isSelected
          ? 'border-primary shadow-md ring-2 ring-offset-1 ring-offset-background ring-primary/20'
          : 'border-border/50 hover:border-primary/40 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${metric.dotCls}`} />
        <p className="text-xl font-bold text-foreground leading-none">{metric.count}</p>
      </div>
      <p className="text-[10px] font-semibold text-foreground leading-tight">{metric.label}</p>
      <p className="text-[9px] text-muted-foreground leading-none">{metric.note}</p>
    </button>
  );
}
