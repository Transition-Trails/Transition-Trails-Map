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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-0">
        {/* Row 1: title + count */}
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <h1 className="text-[14px] font-semibold text-foreground">Action Library</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-foreground">{filtered.length}</span> of {pennyContentActions.length} Actions
          </span>
        </div>
        {/* Row 2: category filter as underline tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto">
          <button
            onClick={() => setCatFilter('all')}
            className={`text-[12px] font-semibold px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              catFilter === 'all' ? 'border-secondary text-secondary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            All ({pennyContentActions.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`text-[12px] font-semibold px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                catFilter === cat ? 'border-secondary text-secondary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {cat} ({pennyContentActions.filter(a => a.category === cat).length})
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-5xl space-y-3">
          {filtered.map((action, idx) => {
            const catCfg = ACTION_CATEGORY_CONFIG[action.category];
            return (
              <button
                key={action.id}
                onClick={() => setSelectedItem({ type: 'pennyAction', id: action.id, data: action })}
                className={`w-full rounded-xl border-2 p-5 text-left transition-all hover:shadow-sm ${catCfg.border} ${catCfg.bg}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-secondary/20 text-secondary text-[14px] font-bold flex items-center justify-center shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-bold text-foreground">{action.name}</p>
                        <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 ${catCfg.chip}`}>{action.category}</span>
                        <span className="text-[14px] font-bold border border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400] rounded-full px-1.5 py-0.5">Prototype</span>
                      </div>
                      <p className="text-[14px] text-muted-foreground mt-0.5">Applies to: {action.applicableTo.join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-[14px] text-muted-foreground">
                      <Clock className="w-3 h-3" />{action.estimatedTime}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>

                <p className="text-[14px] text-muted-foreground mb-3">{action.purpose}</p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[14px] font-bold text-muted-foreground/60 mb-1">Generates</p>
                    <div className="space-y-0.5">
                      {action.generates.map(g => (
                        <div key={g.label} className="flex items-center gap-1.5">
                          <Sparkles className="w-2.5 h-2.5 text-secondary shrink-0" />
                          <p className="text-[14px] text-foreground/70">{g.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-muted-foreground/60 mb-1">Links To</p>
                    <div className="space-y-0.5">
                      {[...action.relatedLearningAssets, ...action.relatedDeliveryAssets, ...action.relatedPennyAssets].slice(0, 4).map(asset => (
                        <p key={asset} className="text-[14px] text-foreground/70">· {asset}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
