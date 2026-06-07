import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { MapPin, Box, Database, Compass, BookOpen, Layers } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';

export function ContextPanel() {
  const { selectedItem, setSelectedItem } = useAppContext();
  const [, setLocation] = useLocation();

  const handleChipClick = (type: string, id: string, route?: string) => {
    // In a real app, we'd lookup the actual data here based on type/id
    // For now we just clear it, or we could set it to mock data
    if (route) {
      setLocation(route);
    }
  };

  const renderContent = () => {
    if (!selectedItem) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-primary/40" />
          </div>
          <p className="text-sm">Select any program, phase, capability, or document to explore its context.</p>
        </div>
      );
    }

    const { type, data } = selectedItem;

    return (
      <ScrollArea className="h-full">
        <div className="p-5 space-y-6">
          <div className="space-y-2">
            <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px]">
              {type === 'program' && 'Program'}
              {type === 'penny' && 'Penny AI'}
              {type === 'trailOs' && 'Trail OS'}
              {type === 'resolve' && 'RESOLVE Phase'}
              {type === 'demand' && 'Demand Stage'}
              {type === 'document' && 'Document'}
            </Badge>
            <h2 className="text-xl font-serif font-bold text-foreground">
              {type === 'resolve' ? `${data.letter} — ${data.name}` : data.name}
            </h2>
          </div>

          {type === 'program' && (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-muted-foreground mb-1 text-xs">Format</span>
                    <span className="font-medium">{data.format}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground mb-1 text-xs">Duration</span>
                    <span className="font-medium">{data.duration}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-muted-foreground mb-1 text-xs">Audience</span>
                    <span className="font-medium">{data.audience}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-muted-foreground mb-1 text-xs">Pricing</span>
                    <span className="font-medium text-primary">{data.pricing}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Top Outcomes</span>
                  <ul className="list-disc pl-4 space-y-1 text-sm">
                    {data.outcomes?.slice(0, 3).map((out: string, i: number) => (
                      <li key={i}>{out}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Box className="w-3 h-3" /> Related Penny AI
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {data.pennyFeatures?.map((p: string) => (
                      <Badge key={p} variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => handleChipClick('penny', p, '/trail-os-penny')}>
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Compass className="w-3 h-3" /> RESOLVE Phases
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {data.resolvePhases?.map((r: string) => (
                      <Badge key={r} variant="outline" className="bg-white border-primary/20 cursor-pointer hover:bg-primary/5" onClick={() => handleChipClick('resolve', r, '/resolve-demand')}>
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Source Documents
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {data.docs?.map((d: string) => (
                      <Badge key={d} variant="outline" className="bg-muted cursor-pointer hover:bg-muted/80" onClick={() => handleChipClick('document', d, '/source-docs')}>
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {type === 'penny' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{data.purpose}</p>
              
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Supported Programs</span>
                <div className="flex flex-wrap gap-1">
                  {data.programs?.map((p: string) => (
                    <Badge key={p} variant="secondary">{p}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Trail OS Connections</span>
                <div className="flex flex-wrap gap-1">
                  {data.trailOsCapabilities?.map((t: string) => (
                    <Badge key={t} variant="outline" className="bg-white border-primary/20">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {type === 'trailOs' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{data.description}</p>
              
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Active in Programs</span>
                <div className="flex flex-wrap gap-1">
                  {data.programs?.map((p: string) => (
                    <Badge key={p} variant="secondary">{p}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Penny Integrations</span>
                <div className="flex flex-wrap gap-1">
                  {data.penny?.map((p: string) => (
                    <Badge key={p} variant="outline" className="bg-white border-primary/20">{p}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {type === 'resolve' && (
            <div className="space-y-4">
              <p className="text-sm text-foreground">{data.purpose}</p>
              
              <div className="space-y-3 mt-4 border-t pt-4">
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Inputs</span>
                  <span className="text-sm">{data.inputs}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Outputs</span>
                  <span className="text-sm">{data.outputs}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Owner</span>
                  <span className="text-sm font-medium">{data.owner}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Implications</span>
                  <span className="text-sm text-muted-foreground">{data.implications}</span>
                </div>
              </div>
            </div>
          )}

          {type === 'demand' && (
            <div className="space-y-4">
              <p className="text-sm text-foreground">{data.purpose}</p>
              
              <div className="space-y-3 mt-4 border-t pt-4">
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Current Items</span>
                  <ul className="list-disc pl-4 space-y-1 text-sm">
                    {data.items?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Inputs</span>
                    <span className="text-sm">{data.inputs}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Outputs</span>
                    <span className="text-sm">{data.outputs}</span>
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Owner</span>
                  <span className="text-sm font-medium">{data.owner}</span>
                </div>
              </div>
            </div>
          )}

          {type === 'document' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Category</span>
                  <Badge variant="outline">{data.category}</Badge>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Status</span>
                  <Badge variant={data.status === 'Active' ? 'default' : 'secondary'}>{data.status}</Badge>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Owner</span>
                  <span className="text-sm font-medium">{data.owner}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Last Updated</span>
                  <span className="text-sm">{data.lastUpdated}</span>
                </div>
              </div>

              <div className="space-y-2 mt-4 border-t pt-4">
                <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Programs Affected</span>
                <div className="flex flex-wrap gap-1">
                  {data.programs?.map((p: string) => (
                    <Badge key={p} variant="secondary">{p}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="w-[280px] h-full bg-card border-l border-border flex flex-col">
      <div className="px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm z-10 flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Follow the Trail</h3>
      </div>
      <div className="flex-1 relative overflow-hidden bg-white/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedItem ? `${selectedItem.type}-${selectedItem.id}` : 'empty'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
