import { useAppContext } from '@/context/AppContext';
import { resolvePhases } from '@/data/resolvePhases';
import { demandStages } from '@/data/demandStages';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

export default function ResolveDemand() {
  const { setSelectedItem, selectedItem } = useAppContext();

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <ResizablePanelGroup direction="vertical">
        
        {/* TOP PANEL: Demand Pipeline */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b bg-card/30 shrink-0">
              <h2 className="text-xl font-serif font-bold">Demand Pipeline</h2>
              <p className="text-sm text-muted-foreground">Track strategic requests through evaluation and delivery.</p>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="flex p-6 gap-4 min-w-max h-full">
                  {demandStages.map(stage => (
                    <div 
                      key={stage.id} 
                      className={`flex flex-col w-72 shrink-0 bg-muted/30 rounded-xl border transition-colors cursor-pointer ${
                        selectedItem?.type === 'demand' && selectedItem.id === stage.id ? 'border-primary ring-1 ring-primary/20' : 'border-border/50 hover:border-border'
                      }`}
                      onClick={() => setSelectedItem({ type: 'demand', id: stage.id, data: stage })}
                    >
                      <div className="p-3 border-b border-border/50 flex items-center justify-between bg-white/50 rounded-t-xl">
                        <span className="font-semibold text-sm">{stage.name}</span>
                        <Badge variant="secondary" className="font-mono text-xs">{stage.items.length}</Badge>
                      </div>
                      <div className="p-3 flex-1 overflow-y-auto space-y-2">
                        {stage.items.map((item, i) => (
                          <div key={i} className="bg-white p-3 rounded-lg shadow-sm border border-border/50 text-sm hover:border-primary/50 transition-colors">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* BOTTOM PANEL: RESOLVE Phases */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-muted/10">
            <div className="p-4 border-b bg-card/30 shrink-0">
              <h2 className="text-xl font-serif font-bold">RESOLVE Framework</h2>
              <p className="text-sm text-muted-foreground">The 8-phase methodology for designing and delivering programs.</p>
            </div>
            
            <div className="flex-1 overflow-hidden p-6">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4">
                  {resolvePhases.map(phase => (
                    <div 
                      key={phase.id}
                      className={`relative bg-white p-6 rounded-xl border transition-all cursor-pointer group ${
                        selectedItem?.type === 'resolve' && selectedItem.id === phase.id 
                          ? 'border-primary shadow-md ring-1 ring-primary/20 scale-[1.02]' 
                          : 'border-border hover:border-primary/50 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedItem({ type: 'resolve', id: phase.id, data: phase })}
                    >
                      <div className="absolute top-4 right-4 text-4xl font-serif font-bold text-muted/30 group-hover:text-primary/10 transition-colors">
                        {phase.letter}
                      </div>
                      <h3 className="font-bold text-lg mb-2 relative z-10">{phase.name}</h3>
                      <p className="text-sm text-muted-foreground relative z-10 line-clamp-2">
                        {phase.purpose}
                      </p>
                      <div className="mt-4 pt-4 border-t border-border/50 relative z-10">
                        <span className="text-xs font-medium text-foreground">Owner: </span>
                        <span className="text-xs text-muted-foreground">{phase.owner}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </ResizablePanel>

      </ResizablePanelGroup>
    </div>
  );
}
