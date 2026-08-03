import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import type { Program } from '@/data/programs';
import { ArrowRight, Calendar } from 'lucide-react';

// ── Prototype health data · future: Salesforce MCP ───────────────────────────
const HEALTH: Record<string, {
  operationalStatus: 'active' | 'in-discovery' | 'draft';
  activeCohorts: number;
  cohortLabel: string;
  learnerCount: number;
  learnerLabel: string;
  applicants?: number;
  waitlist?: number;
  nextDate: string;
  nextEvent: string;
  commChannels: string[];
  openCases?: number;
  healthNote?: string;
}> = {
  'explorers-trail': {
    operationalStatus: 'active',
    activeCohorts: 1,
    cohortLabel: 'Cohort 3',
    learnerCount: 12,
    learnerLabel: 'learners',
    nextDate: 'Oct 2025',
    nextEvent: 'Cohort 3 ends · Cohort 4 recruiting',
    commChannels: ['#trail-talks-cohort-3', '#cohort-explorers-3'],
    openCases: 0,
  },
  'foundations-trail': {
    operationalStatus: 'active',
    activeCohorts: 1,
    cohortLabel: 'Cohort 2',
    learnerCount: 8,
    learnerLabel: 'learners',
    nextDate: 'Oct 2025',
    nextEvent: 'Cohort 2 ends · Cohort 3 recruiting',
    commChannels: ['#trail-talks-cohort-2', '#cohort-foundations-2'],
    openCases: 1,
    healthNote: 'Pricing confirmation needed',
  },
  'guided-trail': {
    operationalStatus: 'active',
    activeCohorts: 1,
    cohortLabel: 'Cohort 1 · Sprint 1',
    learnerCount: 4,
    learnerLabel: 'learners',
    applicants: 6,
    nextDate: 'Nov 2025',
    nextEvent: 'Sprint 1 review',
    commChannels: ['#cohort-guided-1', '#penny-alerts', '#coach-alerts'],
    openCases: 1,
  },
  'trail-of-mastery': {
    operationalStatus: 'in-discovery',
    activeCohorts: 0,
    cohortLabel: '—',
    learnerCount: 0,
    learnerLabel: '',
    waitlist: 8,
    nextDate: 'Q3 2025',
    nextEvent: 'Proposal review · pricing TBD',
    commChannels: ['#trail-wins', '#leadership'],
    openCases: 0,
    healthNote: 'Pricing + format unconfirmed',
  },
  'digital-compass': {
    operationalStatus: 'active',
    activeCohorts: 1,
    cohortLabel: 'Org Cohort 1',
    learnerCount: 15,
    learnerLabel: 'participants',
    nextDate: 'Q4 2025',
    nextEvent: 'Next organizational cohort recruiting',
    commChannels: ['#cohort-compass-1', '#facilitators'],
    openCases: 0,
  },
};

// ── Portfolio Pulse data per lens ─────────────────────────────────────────────
const PULSE: Record<string, Array<{ title: string; rows: string[] }>> = {
  executive: [
    {
      title: 'Portfolio Health',
      rows: ['3 of 5 programs active', '3 cohorts running', '24 learners · 15 clients', '1 program in discovery'],
    },
    {
      title: 'Demand Signals',
      rows: ['6 applied — Guided Trail', '8 waitlisted — Mastery', '2 active demand pipelines', 'ToM exploring Q3 launch'],
    },
    {
      title: 'Source Quality',
      rows: ['3 confirmed blueprints', '1 draft (Trail of Mastery)', '2 pricing gaps flagged', '→ Future: Salesforce MCP'],
    },
    {
      title: 'Integration Readiness',
      rows: ['Salesforce: planned', 'Slack: Q3 2025 (planned)', 'Agentforce: Q4 2025', 'Google Chat: Q4 2025+'],
    },
  ],
  program: [
    {
      title: 'Learning Sequence',
      rows: ['Explorer → Foundations', '→ Guided → [Mastery]', 'Parallel: Digital Compass', '4 prerequisite links'],
    },
    {
      title: 'Cohort Cadence',
      rows: ['Oct 2025: Explorer C4', 'Oct 2025: Foundations C3', 'Nov 2025: Guided Cohort 2', 'Q4 2025: Compass Org 2'],
    },
    {
      title: 'Prerequisites',
      rows: ['Foundations: Explorer Trail', 'Guided: Foundations Trail', 'Mastery: Guided + portfolio', 'Compass: None (parallel)'],
    },
    {
      title: 'Audience Ranges',
      rows: ['Explorer: 12–15 / cohort', 'Foundations: 8–12 / cohort', 'Guided: 4–8 / cohort', 'Compass: 15+ participants'],
    },
  ],
  operations: [
    {
      title: 'Upcoming Starts',
      rows: ['Oct 2025: Explorer C4', 'Oct 2025: Foundations C3', 'Nov 2025: Guided Cohort 2', 'Q4 2025: Compass Org 2'],
    },
    {
      title: 'Open Cases',
      rows: ['2 open cases total', '1 escalated — Guided Trail', '0 critical flags', '→ Future: Salesforce live'],
    },
    {
      title: 'Comm Reminders',
      rows: ['3 Trail Talk (Mon 8am)', '1 Facilitator (24h pre-session)', '1 Cohort announcement', '(Planned Slack · Q3 2025)'],
    },
    {
      title: 'Health Flags',
      rows: ['⚠ Foundations: pricing TBD', '⚠ Trail of Mastery: pricing', '⚠ Guided: 1 case escalated', '3 items need attention'],
    },
  ],
  architect: [
    {
      title: 'Trail OS Capabilities',
      rows: ['8 capabilities used', '5 programs mapped', 'Intake · Delivery · Coach Vis', 'Outcomes · Org Readiness'],
    },
    {
      title: `${TERMS.aiAssistant} Capabilities`,
      rows: ['5 capabilities active', 'Trail Guide: all 5 programs', 'Quest Master: Guided only', 'Coach Intelligence: future'],
    },
    {
      title: 'Integrations',
      rows: ['Salesforce: planned', 'Slack: Q3 2025 (planned)', 'Agentforce: Q4 2025', 'Source docs: 12 total'],
    },
    {
      title: 'Dependencies & Gaps',
      rows: ['2 pricing gaps (unconfirmed)', '1 proposal needs validation', 'ToM: format undefined', '→ Future: Knowledge MCP'],
    },
  ],
};

const HEADER_COLOR: Record<string, string> = {
  'sky-blue':    'bg-[hsl(205,65%,52%)] text-white',
  'deep-teal':   'bg-[hsl(188,55%,28%)] text-white',
  'trail-green': 'bg-[hsl(145,40%,32%)] text-white',
  'charcoal':    'bg-[hsl(220,15%,22%)] text-white',
  'sun-amber':   'bg-[#9FC3AE] text-[hsl(220,15%,22%)]',
};

const BORDER_COLOR: Record<string, string> = {
  'sky-blue':    'border-[hsl(205,65%,40%)]',
  'deep-teal':   'border-[hsl(188,55%,20%)]',
  'trail-green': 'border-[hsl(145,40%,24%)]',
  'charcoal':    'border-[hsl(220,15%,14%)]',
  'sun-amber':   'border-[#2F6B3F]',
};

const STATUS_DOT: Record<string, string> = {
  'active':       'bg-emerald-500',
  'in-discovery': 'bg-sky-400',
  'draft':        'bg-muted-foreground/50',
};

const STATUS_LABEL: Record<string, string> = {
  'active':       'Active',
  'in-discovery': 'In Discovery',
  'draft':        'Draft',
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProgramMap() {
  const { activeLens, setSelectedItem, selectedItem, programs } = useAppContext();

  const isSelected = (id: string) => selectedItem?.type === 'program' && selectedItem?.id === id;

  const pick = (id: string) => programs.find(p => p.id === id)!;

  const handleClick = (program: Program) => {
    const h = HEALTH[program.id] ?? {};
    setSelectedItem({ type: 'program', id: program.id, data: { ...program, ...h } });
  };

  const nodeProps = (id: string) => {
    const program = pick(id);
    return { program, health: HEALTH[id], isSelected: isSelected(id), onClick: () => handleClick(program), lens: activeLens };
  };

  return (
    <div className="h-full w-full flex flex-col p-4 overflow-hidden">
      <div className="mb-3 flex-shrink-0 flex items-baseline gap-2">
        <h1 className="text-2xl font-bold text-foreground leading-tight">Program Ecosystem</h1>
        <span className="text-[14px] font-semibold text-muted-foreground/60 bg-muted/60 border border-border px-1.5 py-0.5 rounded flex-shrink-0">
          Prototype Data
        </span>
      </div>
      <p className="text-sm text-muted-foreground -mt-2 mb-3 flex-shrink-0">
        Living portfolio view — click any program to open its Knowledge Brief.
      </p>

      <div className="flex-1 min-h-0 rounded-xl border border-border/60 bg-white/60 shadow-sm flex flex-col p-4 overflow-hidden">

        <p className="text-[14px] font-semibold  text-muted-foreground text-center mb-3 flex-shrink-0">
          — The Transition Trail —
        </p>

        {/* Scrollable map area */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5">

          {/* Row 1 — Main Trail */}
          <div className="flex items-start gap-0 flex-shrink-0">
            <div className="flex-1 min-w-0"><ProgramNode {...nodeProps('explorers-trail')} /></div>
            <TrailConnector label="Prerequisite" />
            <div className="flex-1 min-w-0"><ProgramNode {...nodeProps('foundations-trail')} /></div>
            <TrailConnector label="Advancement" sublabel="Path" />
            <div className="flex-1 min-w-0"><ProgramNode {...nodeProps('guided-trail')} /></div>
            <TrailConnector label="Leadership" sublabel="Track" />
            <div className="flex-1 min-w-0"><ProgramNode {...nodeProps('trail-of-mastery')} /></div>
          </div>

          {/* Row 2 — Digital Compass as Parallel Program Track */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2 mt-1 mb-2">
              <div className="flex-1 h-px border-t-2 border-dashed border-amber-300/50" />
              <span className="text-[14px] font-bold  text-amber-700/80 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                Parallel Program · Nonprofit Client Track
              </span>
              <div className="flex-1 h-px border-t-2 border-dashed border-amber-300/50" />
            </div>

            {/* Digital Compass sits under Guided Trail (3rd slot) */}
            <div className="flex items-start gap-0">
              <div className="flex-1 min-w-0" />
              <div className="w-14 flex-shrink-0" />
              <div className="flex-1 min-w-0" />
              <div className="w-14 flex-shrink-0 flex flex-col items-center pt-1">
                <div className="w-px h-4 border-l-2 border-dashed border-amber-300/60" />
              </div>
              <div className="flex-1 min-w-0"><ProgramNode {...nodeProps('digital-compass')} /></div>
              <div className="w-14 flex-shrink-0" />
              <div className="flex-1 min-w-0" />
            </div>
          </div>

        </div>

        {/* Portfolio Pulse — persists at bottom */}
        <PortfolioPulse lens={activeLens} />

      </div>
    </div>
  );
}

// ── TrailConnector ────────────────────────────────────────────────────────────
function TrailConnector({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="w-14 flex-shrink-0 flex flex-col items-center pt-6">
      <div className="flex items-center w-full">
        <div className="flex-1 h-px bg-primary/20" />
        <ArrowRight className="w-3 h-3 text-primary/35 flex-shrink-0" strokeWidth={1.5} />
      </div>
      <p className="text-[7px] text-muted-foreground/55 text-center leading-none mt-0.5">{label}</p>
      {sublabel && <p className="text-[7px] text-muted-foreground/50 text-center leading-none mt-0.5">{sublabel}</p>}
    </div>
  );
}

// ── ProgramNode ───────────────────────────────────────────────────────────────
type Health = typeof HEALTH[string];

function ProgramNode({
  program,
  health,
  isSelected,
  onClick,
  lens,
}: {
  program: Program;
  health: Health;
  isSelected: boolean;
  onClick: () => void;
  lens: string;
}) {
  const bgClass     = HEADER_COLOR[program.color] ?? 'bg-primary text-primary-foreground';
  const borderClass = BORDER_COLOR[program.color] ?? 'border-primary';

  const opStatus  = health?.operationalStatus ?? 'draft';
  const dotCls    = STATUS_DOT[opStatus];
  const statusLbl = STATUS_LABEL[opStatus];

  const showAudience = (lens === 'program' || lens === 'executive') && !!program.audience;
  const showDeps     = lens === 'architect' && !!program.dependencies;
  const showDate     = lens === 'operations' || lens === 'executive';

  return (
    <button
      onClick={onClick}
      className={`w-full flex flex-col rounded-xl border-2 transition-all duration-200 text-left overflow-hidden ${
        isSelected
          ? `shadow-lg ${borderClass} ring-2 ring-offset-1 ring-offset-background ring-primary/25`
          : 'border-transparent hover:border-border hover:shadow-md'
      }`}
    >
      {/* Colored header */}
      <div className={`${bgClass} px-3 pt-2 pb-1.5 flex-shrink-0`}>
        <div className="flex items-start gap-1 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[14px] leading-tight line-clamp-2">{program.name}</p>
            <p className="text-[14px] opacity-75 leading-tight line-clamp-1 mt-0.5">{program.strategicRole}</p>
          </div>
          {program.confidence === 'draft' && (
            <span className="flex-shrink-0 text-[14px] font-bold  bg-white/25 px-1 py-0.5 rounded mt-0.5">
              DRAFT
            </span>
          )}
        </div>
      </div>

      {/* White body */}
      <div className="px-3 py-2 bg-white flex flex-col gap-1.5 border-x border-b border-border/40 rounded-b-xl overflow-hidden min-w-0">

        <p className="text-[14px] font-medium text-foreground leading-snug line-clamp-2 min-w-0">
          {program.coreOutcome}
        </p>

        {showAudience && (
          <p className="text-[14px] text-muted-foreground line-clamp-1 min-w-0">
            <span className="font-semibold text-foreground/80">For: </span>
            {program.audience.split(';')[0].trim()}
          </p>
        )}
        {showDeps && (
          <p className="text-[14px] text-muted-foreground line-clamp-1 min-w-0">
            <span className="font-semibold text-foreground/80">Requires: </span>
            {program.dependencies}
          </p>
        )}

        {/* Health row */}
        <div className="flex items-center gap-1 flex-wrap min-w-0 overflow-hidden">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotCls}`} />
          <span className="text-[14px] font-semibold text-muted-foreground">{statusLbl}</span>
          {health?.activeCohorts > 0 && (
            <span className="text-[14px] text-muted-foreground truncate">· {health.cohortLabel}</span>
          )}
          {health?.learnerCount > 0 && (
            <span className="text-[14px] text-muted-foreground truncate">· {health.learnerCount} {health.learnerLabel}</span>
          )}
        </div>

        {/* Demand signals */}
        {(health?.applicants || health?.waitlist) && (
          <div className="flex gap-1 flex-wrap min-w-0">
            {health.applicants ? (
              <span className="text-[14px] font-semibold bg-sky-50 border border-sky-200 text-sky-700 px-1.5 py-0.5 rounded-full">
                {health.applicants} applied
              </span>
            ) : null}
            {health.waitlist ? (
              <span className="text-[14px] font-semibold bg-violet-50 border border-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full">
                {health.waitlist} waitlist
              </span>
            ) : null}
          </div>
        )}

        {/* Footer: confidence + next date */}
        <div className="pt-1 border-t border-border/40 flex items-center justify-between gap-1 min-w-0 overflow-hidden">
          <ConfidenceBadge status={program.confidence ?? 'needs-review'} />
          {showDate && health?.nextDate && (
            <span className="text-[14px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
              <Calendar className="w-2.5 h-2.5" />
              {health.nextDate}
            </span>
          )}
        </div>

      </div>
    </button>
  );
}

// ── Portfolio Pulse ───────────────────────────────────────────────────────────
function PortfolioPulse({ lens }: { lens: string }) {
  const columns = PULSE[lens] ?? PULSE.executive;
  return (
    <div className="flex-shrink-0 mt-3 pt-3 border-t border-border/40">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-1 h-3.5 rounded-full bg-primary/30 flex-shrink-0" />
        <p className="text-[14px] font-bold  text-muted-foreground">
          Portfolio Pulse — {lens.charAt(0).toUpperCase() + lens.slice(1)} View
        </p>
        <span className="text-[14px] text-muted-foreground/40 ml-auto">Prototype data</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {columns.map((col, i) => (
          <div key={i}>
            <p className="text-[14px] font-bold  text-muted-foreground/60 mb-1">{col.title}</p>
            <div className="space-y-0.5">
              {col.rows.map((row, j) => (
                <p key={j} className="text-[14px] text-foreground/80 leading-snug">{row}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
