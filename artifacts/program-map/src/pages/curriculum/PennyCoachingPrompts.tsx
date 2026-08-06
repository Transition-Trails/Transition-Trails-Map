import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumCoachingPrompts, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function PennyCoachingPrompts() {
  const { setSelectedItem } = useAppContext();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[14px] font-semibold text-foreground">Coaching Prompts</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-foreground">{curriculumCoachingPrompts.length}</span> Prompts
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-5xl space-y-3">
          {curriculumCoachingPrompts.map(prompt => {
            const statusCfg = CONTENT_STATUS_CONFIG[prompt.status];
            return (
              <button
                key={prompt.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: prompt.id, data: prompt })}
                className="w-full rounded-xl border border-border bg-white p-4 text-left hover:border-secondary/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-secondary shrink-0" />
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{prompt.name}</p>
                      <p className="text-[14px] text-muted-foreground">
                        Trigger: {prompt.triggerContext as string} · Audience: {prompt.targetAudience as string}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[14px] text-muted-foreground mb-2">{prompt.purpose}</p>
                {!!(prompt.tone) && (
                  <p className="text-[14px] font-medium text-secondary/80">Tone: {prompt.tone as string}</p>
                )}
                {!!(prompt.sampleOutput) && (
                  <div className="mt-2 rounded bg-secondary/5 border border-secondary/10 px-3 py-2">
                    <p className="text-[14px] font-bold text-secondary/60 mb-0.5">SAMPLE OUTPUT</p>
                    <p className="text-[14px] text-foreground/80 italic">"{prompt.sampleOutput as string}"</p>
                  </div>
                )}
                {prompt.notes && (
                  <p className="text-[14px] text-[#CC8400] mt-2">{prompt.notes}</p>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
