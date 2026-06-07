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
    <div className="h-full w-full flex flex-col p-5 overflow-hidden">
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-serif font-bold text-foreground leading-tight">Program Ecosystem</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Navigate the learning trails and their interconnected dependencies.
        </p>
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-border/60 bg-white/60 shadow-sm flex flex-col p-5 gap-0 overflow-hidden">

        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center mb-5 flex-shrink-0">
          — The Transition Trail —
        </p>

        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">

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

            <div className="flex-1 min-w-0 relative">
              <ProgramNode
                program={guided}
                isSelected={isSelected(guided.id)}
                onClick={() => handleProgramClick(guided)}
                lens={activeLens}
              />
              <div className="absolute left-1/2 -translate-x-1/2 top-full flex flex-col items-center" style={{ zIndex: 10 }}>
                <div className="w-px h-5 border-l-2 border-dashed border-amber-400/80 mt-1" />
                <span className="text-[9px] text-muted-foreground bg-white/90 px-1.5 py-0.5 rounded-full border border-border/50 whitespace-nowrap my-1">
                  Nonprofit Client Program
                </span>
                <div className="w-px h-4 border-l-2 border-dashed border-amber-400/80" />
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

          <div className="flex items-start gap-0 flex-shrink-0" style={{ marginTop: '2.25rem' }}>
            <div className="flex-1 min-w-0" />
            <div className="w-8 flex-shrink-0" />
            <div className="flex-1 min-w-0" />
            <div className="w-8 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <ProgramNode
                program={compass}
                isSelected={isSelected(compass.id)}
                onClick={() => handleProgramClick(compass)}
                lens={activeLens}
              />
            </div>
            <div className="w-8 flex-shrink-0" />
            <div className="flex-1 min-w-0" />
          </div>

        </div>

        <div className="flex-shrink-0 mt-4 pt-3 border-t border-border/40">
          <div className="inline-flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/40 max-w-sm">
            <div className="w-1 h-full bg-primary/30 rounded-full flex-shrink-0 self-stretch" />
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
    <div className="w-8 flex-shrink-0 flex items-center justify-center pt-8">
      <ArrowRight className="w-5 h-5 text-primary/40" strokeWidth={1.5} />
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

  const showDuration   = lens === 'operations' || lens === 'executive';
  const showAudience   = lens === 'program' || lens === 'executive';
  const showDependencies = lens === 'architect';

  return (
    <button
      onClick={onClick}
      data-testid={`program-card-${program.id}`}
      className={`w-full flex flex-col rounded-xl border-2 transition-all duration-200 text-left overflow-hidden ${
        isSelected
          ? `scale-[1.03] shadow-lg ${borderClass} ring-2 ring-offset-2 ring-offset-background ring-primary/25`
          : `border-transparent hover:border-border hover:shadow-md`
      }`}
    >
      <div className={`${bgClass} px-3 pt-3 pb-2.5 relative`}>
        {program.confidence === 'draft' && (
          <span className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider bg-white/25 px-1.5 py-0.5 rounded backdrop-blur-sm">
            Draft
          </span>
        )}
        <p className="font-serif font-bold text-base leading-tight mb-0.5">{program.name}</p>
        <p className="text-[11px] opacity-80 italic leading-snug line-clamp-2">{program.strategicRole}</p>
      </div>

      <div className="px-3 py-2.5 bg-white flex flex-col gap-2 border-x border-b border-border/40 rounded-b-xl">
        <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
          {program.coreOutcome}
        </p>

        {showAudience && (
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
            <span className="font-semibold text-foreground">For: </span>
            {program.audience.split(';')[0].trim()}
          </p>
        )}

        {showDependencies && (
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
            <span className="font-semibold text-foreground">Requires: </span>
            {program.dependencies}
          </p>
        )}

        <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
          <ConfidenceBadge status={program.confidence ?? 'needs-review'} />
          {showDuration && (
            <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
              {program.duration} · {program.format.split(',')[0]}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
