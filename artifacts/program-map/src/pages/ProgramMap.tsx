import { useAppContext } from '@/context/AppContext';
import { programs } from '@/data/programs';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

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

      <div className="flex-1 min-h-[500px] relative rounded-xl border border-border/50 bg-white/50 shadow-sm p-8 overflow-hidden">
        {/* Connection Lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" opacity="0.4" />
            </marker>
          </defs>
          {/* Main Trail Path */}
          <path d="M 220 220 L 380 220 L 640 220 L 900 220" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" opacity="0.4" markerEnd="url(#arrowhead)" />
          <path d="M 380 220 L 640 220" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" opacity="0.4" markerEnd="url(#arrowhead)" />
          <path d="M 640 220 L 900 220" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" opacity="0.4" markerEnd="url(#arrowhead)" />
          
          {/* Compass to Guided connection */}
          <path d="M 640 400 L 640 300" stroke="hsl(var(--accent))" strokeWidth="2" strokeDasharray="6,6" fill="none" opacity="0.6" markerEnd="url(#arrowhead)" />
        </svg>

        {/* Nodes */}
        <div className="relative w-full h-full z-10">
          
          {/* Explorer's */}
          <div className="absolute top-[140px] left-[20px]">
            <ProgramNode program={explorers} isSelected={isSelected(explorers?.id || '')} onClick={() => handleProgramClick(explorers)} lens={activeLens} />
          </div>

          {/* Foundations */}
          <div className="absolute top-[140px] left-[280px]">
            <ProgramNode program={foundations} isSelected={isSelected(foundations?.id || '')} onClick={() => handleProgramClick(foundations)} lens={activeLens} />
          </div>

          {/* Guided */}
          <div className="absolute top-[140px] left-[540px]">
            <ProgramNode program={guided} isSelected={isSelected(guided?.id || '')} onClick={() => handleProgramClick(guided)} lens={activeLens} />
          </div>

          {/* Mastery */}
          <div className="absolute top-[140px] left-[800px]">
            <ProgramNode program={mastery} isSelected={isSelected(mastery?.id || '')} onClick={() => handleProgramClick(mastery)} lens={activeLens} />
          </div>

          {/* Digital Compass */}
          <div className="absolute top-[400px] left-[540px]">
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
            {activeLens === 'executive' && "Highlighting strategic roles and outcomes for portfolio balancing."}
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
      className={`group relative flex flex-col w-[220px] rounded-xl border-2 transition-all duration-200 text-left ${
        isSelected ? 'scale-105 shadow-md border-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background' : 'hover:scale-[1.02] hover:shadow-sm border-transparent'
      }`}
    >
      <div className={`p-4 rounded-t-lg ${bgClass} relative`}>
        <h3 className="font-serif font-bold text-lg leading-tight mb-1">{program.name}</h3>
        <p className="text-xs opacity-90 italic leading-snug line-clamp-2">{program.strategicRole}</p>
        {program.confidence === 'draft' && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/20 uppercase tracking-wider backdrop-blur-sm">
            Draft
          </div>
        )}
      </div>
      
      <div className="p-4 bg-white rounded-b-lg border-t-0 border-x border-b border-border/50 min-h-[120px] flex flex-col gap-3">
        
        <div className="text-sm font-medium text-foreground leading-tight line-clamp-2">
          {program.coreOutcome}
        </div>

        <div className="text-xs text-muted-foreground mt-auto">
          <span className="font-semibold text-foreground mr-1">For:</span>
          <span className="line-clamp-1">{program.audience.split(';')[0]}</span>
        </div>

        <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border/50">
          <ConfidenceBadge status={program.confidence || 'needs-review'} />
          <span className="text-[10px] text-muted-foreground ml-auto">{program.duration} • {program.format.split(',')[0]}</span>
        </div>
      </div>
    </button>
  );
}
