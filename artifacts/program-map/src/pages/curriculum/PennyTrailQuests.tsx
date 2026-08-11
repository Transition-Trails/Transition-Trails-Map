import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumTrailQuests, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Star, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function PennyTrailQuests() {
  const { setSelectedItem } = useAppContext();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[14px] font-semibold text-foreground">Trail Quests</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-foreground">{curriculumTrailQuests.length}</span> Quests
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4">
          {curriculumTrailQuests.map(quest => {
            const statusCfg = CONTENT_STATUS_CONFIG[quest.status];
            return (
              <button
                key={quest.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: quest.id, data: quest })}
                className="w-full rounded-xl border border-border bg-white p-5 text-left hover:border-[#9FC3AE] hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#2F6B3F] shrink-0" />
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{quest.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[14px] font-medium text-[#2F6B3F] border border-[#9FC3AE] bg-[#E6F0EA] rounded-full px-1.5 py-0.5">{quest.questType as string}</span>
                        <span className="text-[14px] font-medium text-slate-600">{quest.difficulty as string} · {quest.estimatedTime as string}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[14px] text-muted-foreground mb-3">{quest.purpose}</p>
                {((quest.criteria as string[]) || []).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[14px] font-bold text-muted-foreground/60">Completion Criteria</p>
                    {(quest.criteria as string[]).map((criterion, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-[#2F6B3F] shrink-0" />
                        <p className="text-[14px] text-foreground/80">{criterion}</p>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
