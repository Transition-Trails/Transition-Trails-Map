import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { Layers } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

export function ContextPanel() {
  const { selectedItem, setSelectedItem } = useAppContext();
  const [, setLocation] = useLocation();

  const handleChipClick = (type: string, id: string, route?: string) => {
    if (route) {
      setLocation(route);
    }
  };

  const renderContent = () => {
    if (!selectedItem) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-primary/40" />
          </div>
          <p className="text-sm">Select any item to open its knowledge brief.</p>
        </div>
      );
    }

    const { type, data } = selectedItem;

    if (type === 'document') {
      return (
        <ScrollArea className="h-full">
          <div className="p-5 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px]">
                  Document
                </Badge>
                <ConfidenceBadge status={data.confidence || 'needs-review'} />
                <Badge variant={data.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">
                  {data.status}
                </Badge>
              </div>
              <h2 className="text-xl font-serif font-bold text-foreground">
                {data.name}
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground italic leading-relaxed">{data.summary}</p>
              
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1">Purpose</span>
                <p className="text-sm text-muted-foreground">{data.purpose}</p>
              </div>

              {data.quickTake && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-md p-3">
                  <span className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Quick Take</span>
                  <p className="text-sm text-emerald-900 leading-tight">{data.quickTake}</p>
                </div>
              )}

              {data.sourceOfTruthFor && data.sourceOfTruthFor.length > 0 && (
                <div className="space-y-1">
                  <span className="block text-xs font-semibold text-foreground uppercase mb-1">Source of Truth For</span>
                  <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                    {data.sourceOfTruthFor.map((item: string, i: number) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {data.notSourceOfTruthFor && data.notSourceOfTruthFor.length > 0 && (
                <div className="space-y-1">
                  <span className="block text-xs font-semibold text-foreground uppercase mb-1">Not Source of Truth For</span>
                  <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                    {data.notSourceOfTruthFor.map((item: string, i: number) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {data.keyDecisionsInfluenced && data.keyDecisionsInfluenced.length > 0 && (
                <div className="space-y-1">
                  <span className="block text-xs font-semibold text-foreground uppercase mb-1">Key Decisions Influenced</span>
                  <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                    {data.keyDecisionsInfluenced.map((item: string, i: number) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {data.programs && data.programs.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-foreground uppercase">Programs Affected</span>
                  <div className="flex flex-wrap gap-1">
                    {data.programs.map((p: string) => <Badge key={p} variant="secondary">{p}</Badge>)}
                  </div>
                </div>
              )}

              {data.relatedDocuments && data.relatedDocuments.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-foreground uppercase">Related Documents</span>
                  <div className="flex flex-wrap gap-1">
                    {data.relatedDocuments.map((d: string) => <Badge key={d} variant="outline" className="bg-muted text-muted-foreground">{d}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      );
    }

    // Default rich panel for Program, Penny, Trail OS, Resolve, Demand
    return (
      <ScrollArea className="h-full">
        <div className="p-5 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px]">
                {type === 'program' && 'Program'}
                {type === 'penny' && 'Penny AI Capability'}
                {type === 'trailOs' && 'Trail OS Capability'}
                {type === 'resolve' && 'RESOLVE Phase'}
                {type === 'demand' && 'Demand Stage'}
              </Badge>
              <ConfidenceBadge status={data.confidence || 'needs-review'} />
            </div>
            <h2 className="text-xl font-serif font-bold text-foreground">
              {type === 'resolve' ? `${data.letter} — ${data.name}` : data.name}
            </h2>
          </div>

          <div className="space-y-6">
            {data.executiveSummary && (
              <p className="text-sm text-muted-foreground italic leading-relaxed">{data.executiveSummary}</p>
            )}

            {data.whyItMatters && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1">Why It Matters</span>
                <p className="text-sm text-foreground">{data.whyItMatters}</p>
              </div>
            )}

            {data.keyFacts && data.keyFacts.length > 0 && (
              <div className="space-y-1">
                <span className="block text-xs font-semibold text-foreground uppercase mb-1">Key Facts</span>
                <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                  {data.keyFacts.map((fact: string, i: number) => <li key={i}>{fact}</li>)}
                </ul>
              </div>
            )}

            {(type !== 'program') && data.programs && data.programs.length > 0 && (
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-foreground uppercase">Programs Impacted</span>
                <div className="flex flex-wrap gap-1">
                  {data.programs.map((p: string) => <Badge key={p} variant="secondary">{p}</Badge>)}
                </div>
              </div>
            )}

            {data.relatedConcepts && data.relatedConcepts.length > 0 && (
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-foreground uppercase">Related Concepts</span>
                <div className="flex flex-wrap gap-1">
                  {data.relatedConcepts.map((c: any, i: number) => (
                    <Badge key={i} variant="outline" className="bg-white border-primary/20 text-xs">
                      {c.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {type === 'program' && (
              <>
                {data.pricing && (
                  <div>
                    <span className="block text-xs font-semibold text-foreground uppercase mb-1">Pricing Model</span>
                    <p className="text-sm text-muted-foreground">{data.pricing}</p>
                  </div>
                )}
                {data.docs && data.docs.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-foreground uppercase">Source Documents</span>
                    <div className="flex flex-wrap gap-1">
                      {data.docs.map((d: string) => (
                        <Badge key={d} variant="outline" className="bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80" onClick={() => handleChipClick('document', d, '/source-docs')}>
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {data.whatBreaksIfMissing && (
              <div className="bg-amber-50 border border-amber-100 rounded-md p-3">
                <span className="block text-[10px] font-bold text-amber-800 uppercase mb-1">What Breaks If Missing</span>
                <p className="text-sm text-amber-900 leading-tight">{data.whatBreaksIfMissing}</p>
              </div>
            )}

            {data.confidence === 'needs-review' && (
              <div className="bg-amber-100/50 border border-amber-200 rounded-md p-3">
                <span className="block text-[10px] font-bold text-amber-800 uppercase mb-1">Source Mapping Note</span>
                <p className="text-xs text-amber-900 leading-tight">Some details in this brief require source mapping. Treat operational specifics as preliminary.</p>
              </div>
            )}

          </div>
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="w-[300px] h-full bg-card border-l border-border flex flex-col shrink-0">
      <div className="px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm z-10 flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Knowledge Brief</h3>
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
