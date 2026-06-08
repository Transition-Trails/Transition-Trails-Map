import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { pennyContentActions, ACTION_CATEGORY_CONFIG, type PennyActionCategory } from '@/data/pennyContentActions';
import { Sparkles, ArrowRight, Clock } from 'lucide-react';
import { useState } from 'react';

const CATEGORIES: PennyActionCategory[] = ['Program Architecture', 'Learning Content', 'Penny Assets', 'Delivery Assets', 'Quality & Standards'];

export default function PennyActionLibrary() {
  const { setSelectedItem } = useAppContext();
  const [catFilter, setCatFilter] = useState<string>('all');

  const filtered = catFilter === 'all'
    ? pennyContentActions
    : pennyContentActions.filter(a => a.category === catFilter);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio — Penny Content Assistant</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Action Library</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            All 11 prototype content generation actions available in the Penny Content Assistant.
            Each action is context-aware — it generates content aligned to the selected learning object and the Trail OS architecture standards.
            Select an action to see its full specification in the Knowledge Brief.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCatFilter('all')} className={`text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${catFilter === 'all' ? 'bg-secondary text-white border-secondary' : 'border-border text-muted-foreground hover:border-secondary/40'}`}>
            All ({pennyContentActions.length})
          </button>
          {CATEGORIES.map(cat => {
            const cfg = ACTION_CATEGORY_CONFIG[cat];
            return (
              <button key={cat} onClick={() => setCatFilter(cat)} className={`text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${catFilter === cat ? cfg.chip + ' border-transparent' : 'border-border text-muted-foreground hover:border-secondary/40'}`}>
                {cat} ({pennyContentActions.filter(a => a.category === cat).length})
              </button>
            );
          })}
        </div>

        <div className="grid gap-3">
          {filtered.map((action, idx) => {
            const catCfg = ACTION_CATEGORY_CONFIG[action.category];
            return (
              <button
                key={action.id}
                onClick={() => setSelectedItem({ type: 'pennyAction', id: action.id, data: action })}
                className={`rounded-xl border-2 p-5 text-left transition-all hover:shadow-sm ${catCfg.border} ${catCfg.bg}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-secondary/20 text-secondary text-[11px] font-bold flex items-center justify-center shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-bold text-foreground">{action.name}</p>
                        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${catCfg.chip}`}>{action.category}</span>
                        <span className="text-[9px] font-bold border border-amber-200 bg-amber-50 text-amber-700 rounded-full px-1.5 py-0.5">Prototype</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Applies to: {action.applicableTo.join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />{action.estimatedTime}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>

                <p className="text-[12px] text-muted-foreground mb-3">{action.purpose}</p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Generates</p>
                    <div className="space-y-0.5">
                      {action.generates.map(g => (
                        <div key={g.label} className="flex items-center gap-1.5">
                          <Sparkles className="w-2.5 h-2.5 text-secondary shrink-0" />
                          <p className="text-[11px] text-foreground/70">{g.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Links To</p>
                    <div className="space-y-0.5">
                      {[...action.relatedLearningAssets, ...action.relatedDeliveryAssets, ...action.relatedPennyAssets].slice(0, 4).map(asset => (
                        <p key={asset} className="text-[11px] text-foreground/70">· {asset}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
