import { useAppContext } from '@/context/AppContext';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import type { Program } from '@/data/programs';
import { ArrowRight } from 'lucide-react';

export default function ProgramMap() {
  const { activeLens, setSelectedItem, selectedItem, programs } = useAppContext();

  const isSelected = (id: string) => selectedItem?.type === 'program' && selectedItem?.id === id;

  const handleProgramClick = (program: Program) => {
    setSelectedItem({ type: 'program', id: program.id, data: program });
  };

  const explorers   = programs.find(p => p.id === 'explorers-trail')!;
  const foundations = programs.find(p => p.id === 'foundations-trail')!;
  const guided      = programs.find(p => p.id === 'guided-trail')!;
  const mastery     = programs.find(p => p.id === 'trail-of-mastery')!;
  const compass     = programs.find(p => p.id === 'digital-compass')!;

  const lensNote: Record<string, string> = {
    executive:   'Highlighting strategic roles, core outcomes, and confidence status across programs.',
    program:     'Emphasising audience, prerequisites, and expected learning outcomes.',
    operations:  'Surfacing delivery format and duration for operational planning.',
    architect:   'Mapping cross-program dependencies and technology layer connections.',
  };

  return (
    <div className="h-full w-full flex flex-col p-4 overflow-hidden">
      <div className="mb-3 flex-shrink-0">
        <h1 className="text-2xl font-serif font-bold text-foreground leading-tight">Program Ecosystem</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Navigate the learning trails and their interconnected dependencies.
        </p>
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-border/60 bg-white/60 shadow-sm flex flex-col p-4 overflow-hidden">

        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center mb-4 flex-shrink-0">
          — The Transition Trail —
        </p>

        {/* ── Two-row map area ── */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ gap: '36px' }}>

          {/* Row 1: The four main trail programs */}
          <div className="flex items-start gap-0 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <ProgramNode
                program={explorers}
                isSelected={isSelected(explorers.id)}
                onClick={() => handleProgramClick(explorers)}
                lens={activeLens}
              />
            </div>

            <TrailConnector />

            <div className="flex-1 min-w-0">
              <ProgramNode
                program={foundations}
                isSelected={isSelected(foundations.id)}
                onClick={() => handleProgramClick(foundations)}
                lens={activeLens}
              />
            </div>

            <TrailConnector />

            {/* Guided Trail with dashed connector below */}
            <div className="flex-1 min-w-0 relative">
              <ProgramNode
                program={guided}
                isSelected={isSelected(guided.id)}
                onClick={() => handleProgramClick(guided)}
                lens={activeLens}
              />
              <div className="absolute left-1/2 -translate-x-1/2 top-full flex flex-col items-center" style={{ zIndex: 10 }}>
                <div className="w-px h-3 border-l-2 border-dashed border-amber-400/80 mt-1" />
                <span className="text-[9px] text-muted-foreground bg-white/90 px-1.5 py-0.5 rounded-full border border-border/50 whitespace-nowrap my-0.5">
                  Nonprofit Client Program
                </span>
                <div className="w-px h-2 border-l-2 border-dashed border-amber-400/80" />
              </div>
            </div>

            <TrailConnector />

            <div className="flex-1 min-w-0">
              <ProgramNode
                program={mastery}
                isSelected={isSelected(mastery.id)}
                onClick={() => handleProgramClick(mastery)}
                lens={activeLens}
              />
            </div>
          </div>

          {/* Row 2: Digital Compass aligned under Guided Trail */}
          <div className="flex items-start gap-0 flex-shrink-0">
            <div className="flex-1 min-w-0" />
            <div className="w-7 flex-shrink-0" />
            <div className="flex-1 min-w-0" />
            <div className="w-7 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <ProgramNode
                program={compass}
                isSelected={isSelected(compass.id)}
                onClick={() => handleProgramClick(compass)}
                lens={activeLens}
              />
            </div>
            <div className="w-7 flex-shrink-0" />
            <div className="flex-1 min-w-0" />
          </div>

        </div>

        {/* ── Lens note ── */}
        <div className="flex-shrink-0 mt-3 pt-3 border-t border-border/40">
          <div className="inline-flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/40 max-w-sm">
            <div className="w-1 rounded-full flex-shrink-0 self-stretch bg-primary/30" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                {activeLens.charAt(0).toUpperCase() + activeLens.slice(1)} Lens
              </p>
              <p className="text-xs text-muted-foreground leading-snug">{lensNote[activeLens]}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function TrailConnector() {
  return (
    <div className="w-7 flex-shrink-0 flex items-center justify-center pt-6">
      <ArrowRight className="w-4 h-4 text-primary/40" strokeWidth={1.5} />
    </div>
  );
}

function ProgramNode({
  program,
  isSelected,
  onClick,
  lens,
}: {
  program: Program;
  isSelected: boolean;
  onClick: () => void;
  lens: string;
}) {
  const colorMap: Record<string, string> = {
    'sky-blue':   'bg-[hsl(205,65%,52%)] text-white',
    'deep-teal':  'bg-[hsl(188,55%,28%)] text-white',
    'trail-green':'bg-[hsl(145,40%,32%)] text-white',
    'charcoal':   'bg-[hsl(220,15%,22%)] text-white',
    'sun-amber':  'bg-[hsl(38,85%,52%)] text-[hsl(220,15%,22%)]',
  };

  const borderMap: Record<string, string> = {
    'sky-blue':   'border-[hsl(205,65%,40%)]',
    'deep-teal':  'border-[hsl(188,55%,20%)]',
    'trail-green':'border-[hsl(145,40%,24%)]',
    'charcoal':   'border-[hsl(220,15%,14%)]',
    'sun-amber':  'border-[hsl(38,85%,40%)]',
  };

  const bgClass     = colorMap[program.color] ?? 'bg-primary text-primary-foreground';
  const borderClass = borderMap[program.color] ?? 'border-primary';

  const showDuration     = lens === 'operations' || lens === 'executive';
  const showAudience     = lens === 'program'    || lens === 'executive';
  const showDependencies = lens === 'architect';

  return (
    <button
      onClick={onClick}
      data-testid={`program-card-${program.id}`}
      className={`w-full flex flex-col rounded-xl border-2 transition-all duration-200 text-left overflow-hidden ${
        isSelected
          ? `scale-[1.02] shadow-lg ${borderClass} ring-2 ring-offset-1 ring-offset-background ring-primary/25`
          : `border-transparent hover:border-border hover:shadow-md`
      }`}
    >
      {/* ── Colored header ── */}
      <div className={`${bgClass} px-3 pt-2 pb-2 flex-shrink-0`}>
        <div className="flex items-start gap-1.5 min-w-0">
          <div className="flex-1 min-w-0">
            {/* 2-line clamp so "Trail of Mastery" wraps instead of truncating mid-word */}
            <p className="font-serif font-bold text-[15px] leading-tight line-clamp-2">
              {program.name}
            </p>
            {/* 1-line for role — keeps header height predictable across all cards */}
            <p className="text-[11px] opacity-80 italic leading-none line-clamp-1 mt-0.5">
              {program.strategicRole}
            </p>
          </div>
          {program.confidence === 'draft' && (
            <span className="flex-shrink-0 mt-0.5 text-[8px] font-bold uppercase tracking-wider bg-white/25 px-1.5 py-0.5 rounded whitespace-nowrap">
              Draft
            </span>
          )}
        </div>
      </div>

      {/* ── White body ── */}
      <div className="px-3 py-1.5 bg-white flex flex-col gap-1.5 border-x border-b border-border/40 rounded-b-xl overflow-hidden min-w-0">

        <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 min-w-0">
          {program.coreOutcome}
        </p>

        {showAudience && (
          <p className="text-[11px] text-muted-foreground leading-snug truncate min-w-0">
            <span className="font-semibold text-foreground/80">For: </span>
            {program.audience.split(';')[0].trim()}
          </p>
        )}

        {showDependencies && (
          <p className="text-[11px] text-muted-foreground leading-snug truncate min-w-0">
            <span className="font-semibold text-foreground/80">Requires: </span>
            {program.dependencies}
          </p>
        )}

        {/* ── Footer: badge on its own, duration below ── */}
        <div className="pt-1.5 border-t border-border/40 space-y-0.5 min-w-0 overflow-hidden">
          <div className="flex-shrink-0">
            <ConfidenceBadge status={program.confidence ?? 'needs-review'} />
          </div>
          {showDuration && program.duration && (
            <p className="text-[10px] text-muted-foreground truncate">
              {program.duration}
              {program.format ? ` · ${program.format.split(',')[0].trim()}` : ''}
            </p>
          )}
        </div>

      </div>
    </button>
  );
}
