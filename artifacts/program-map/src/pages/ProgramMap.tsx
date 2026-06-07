import { useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { programs } from '@/data/programs';
import { Badge } from '@/components/ui/badge';

export default function ProgramMap() {
  const { activeLens, setSelectedItem, selectedItem } = useAppContext();

  // Helper to determine if a program is selected
  const isSelected = (id: string) => selectedItem?.type === 'program' && selectedItem?.id === id;

  const handleProgramClick = (program: any) => {
    setSelectedItem({ type: 'program', id: program.id, data: program });
  };

  // Map nodes
  const explorers = programs.find(p => p.id === 'explorers-trail');
  const foundations = programs.find(p => p.id === 'foundations-trail');
  const guided = programs.find(p => p.id === 'guided-trail');
  const mastery = programs.find(p => p.id === 'trail-of-mastery');
  const compass = programs.find(p => p.id === 'digital-compass');

  return (
    <div className="h-full w-full flex flex-col p-6 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Program Ecosystem</h1>
        <p className="text-muted-foreground">Navigate the learning trails and their interconnected dependencies.</p>
      </div>

      <div className="flex-1 min-h-[400px] relative rounded-xl border border-border/50 bg-white/50 shadow-sm p-8 overflow-hidden">
        {/* Connection Lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" opacity="0.4" />
            </marker>
          </defs>
          {/* Main Trail Path */}
          <path d="M 150 200 L 350 200 L 550 200 L 750 200" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" opacity="0.4" markerEnd="url(#arrowhead)" />
          <path d="M 350 200 L 550 200" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" opacity="0.4" markerEnd="url(#arrowhead)" />
          <path d="M 550 200 L 750 200" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" opacity="0.4" markerEnd="url(#arrowhead)" />
          
          {/* Compass to Guided connection */}
          <path d="M 550 350 L 550 260" stroke="hsl(var(--accent))" strokeWidth="2" strokeDasharray="6,6" fill="none" opacity="0.6" markerEnd="url(#arrowhead)" />
        </svg>

        {/* Nodes */}
        <div className="relative w-full h-full z-10">
          
          {/* Explorer's */}
          <div className="absolute top-[160px] left-[50px]">
            <ProgramNode program={explorers} isSelected={isSelected(explorers?.id || '')} onClick={() => handleProgramClick(explorers)} lens={activeLens} />
          </div>

          {/* Foundations */}
          <div className="absolute top-[160px] left-[250px]">
            <ProgramNode program={foundations} isSelected={isSelected(foundations?.id || '')} onClick={() => handleProgramClick(foundations)} lens={activeLens} />
          </div>

          {/* Guided */}
          <div className="absolute top-[160px] left-[450px]">
            <ProgramNode program={guided} isSelected={isSelected(guided?.id || '')} onClick={() => handleProgramClick(guided)} lens={activeLens} />
          </div>

          {/* Mastery */}
          <div className="absolute top-[160px] left-[650px]">
            <ProgramNode program={mastery} isSelected={isSelected(mastery?.id || '')} onClick={() => handleProgramClick(mastery)} lens={activeLens} />
          </div>

          {/* Digital Compass */}
          <div className="absolute top-[350px] left-[450px]">
            <ProgramNode program={compass} isSelected={isSelected(compass?.id || '')} onClick={() => handleProgramClick(compass)} lens={activeLens} />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap bg-white/80 px-2 rounded-full border border-border/50">
              Nonprofit Client Program
            </div>
          </div>

        </div>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 p-4 rounded-lg border border-border bg-white/90 backdrop-blur shadow-sm max-w-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-foreground">Active Lens Insights</h4>
          <p className="text-sm text-muted-foreground">
            {activeLens === 'executive' && "Highlighting pricing models and subsidized vs paid status for portfolio balancing."}
            {activeLens === 'program' && "Emphasizing audience targets and expected learning outcomes."}
            {activeLens === 'operations' && "Surfacing delivery format and duration metrics."}
            {activeLens === 'architect' && "Mapping cross-program dependencies and technology requirements."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgramNode({ program, isSelected, onClick, lens }: { program: any; isSelected: boolean; onClick: () => void; lens: string }) {
  if (!program) return null;

  const colorMap: Record<string, string> = {
    'sky-blue': 'bg-[hsl(205,65%,52%)] text-white border-[hsl(205,65%,42%)]',
    'deep-teal': 'bg-[hsl(188,55%,28%)] text-white border-[hsl(188,55%,18%)]',
    'trail-green': 'bg-[hsl(145,40%,32%)] text-white border-[hsl(145,40%,22%)]',
    'charcoal': 'bg-[hsl(220,15%,22%)] text-white border-[hsl(220,15%,12%)]',
    'sun-amber': 'bg-[hsl(38,85%,52%)] text-[hsl(220,15%,22%)] border-[hsl(38,85%,42%)]',
  };

  const bgClass = colorMap[program.color] || 'bg-primary text-primary-foreground';

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col w-[160px] rounded-xl border-2 transition-all duration-200 text-left ${
        isSelected ? 'scale-105 shadow-md border-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background' : 'hover:scale-105 hover:shadow-sm border-transparent'
      }`}
    >
      <div className={`p-4 rounded-t-lg ${bgClass}`}>
        <h3 className="font-semibold text-sm leading-tight">{program.name}</h3>
      </div>
      
      <div className="p-3 bg-white rounded-b-lg border-t-0 border-x border-b border-border/50 h-[80px] flex flex-col justify-between">
        
        {/* Dynamic content based on lens */}
        <div className="text-xs text-muted-foreground line-clamp-2">
          {lens === 'executive' && <span className="font-medium text-foreground">{program.pricing}</span>}
          {lens === 'program' && <span>{program.audience}</span>}
          {lens === 'operations' && <span>{program.format}</span>}
          {lens === 'architect' && <span>Deps: {program.dependencies}</span>}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <Badge variant={program.status === 'Paid' ? 'secondary' : 'outline'} className="text-[9px] px-1.5 py-0 h-4">
            {program.status}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{program.duration}</span>
        </div>
      </div>
    </button>
  );
}
