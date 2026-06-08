import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumCoachingPrompts, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function PennyCoachingPrompts() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio — Penny Assets</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Coaching Prompts</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Penny-delivered coaching messages triggered by learner context — module opens, stuck signals, or at-risk flags.
            Each prompt is linked to a specific module or lesson. Select a prompt to see its trigger context, tone, and sample output.
          </p>
        </div>
        <div className="grid gap-3">
          {curriculumCoachingPrompts.map(prompt => {
            const statusCfg = CONTENT_STATUS_CONFIG[prompt.status];
            return (
              <button
                key={prompt.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: prompt.id, data: prompt })}
                className="rounded-xl border border-border bg-white p-4 text-left hover:border-secondary/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-secondary shrink-0" />
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{prompt.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Trigger: {prompt.triggerContext as string} · Audience: {prompt.targetAudience as string}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground mb-2">{prompt.purpose}</p>
                {!!(prompt.tone) && (
                  <p className="text-[10px] font-medium text-secondary/80">Tone: {prompt.tone as string}</p>
                )}
                {!!(prompt.sampleOutput) && (
                  <div className="mt-2 rounded bg-secondary/5 border border-secondary/10 px-3 py-2">
                    <p className="text-[10px] font-bold text-secondary/60 mb-0.5">SAMPLE OUTPUT</p>
                    <p className="text-[11px] text-foreground/80 italic">"{prompt.sampleOutput as string}"</p>
                  </div>
                )}
                {prompt.notes && (
                  <p className="text-[10px] text-amber-700 mt-2">{prompt.notes}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
