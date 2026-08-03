import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumReflectionPrompts, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { MessageCircle, ArrowRight } from 'lucide-react';

export default function PennyReflectionPrompts() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-5">
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/60 mb-1">Curriculum Studio — Penny Assets</p>
          <h1 className="text-3xl font-bold text-foreground">Reflection Prompts</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Post-lesson or end-of-module reflection questions that connect learning content to the learner's career story and prior experience.
            Penny delivers these after lesson completion or at milestone moments.
          </p>
        </div>
        <div className="grid gap-3">
          {curriculumReflectionPrompts.map(prompt => {
            const statusCfg = CONTENT_STATUS_CONFIG[prompt.status];
            return (
              <button
                key={prompt.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: prompt.id, data: prompt })}
                className="rounded-xl border border-border bg-white p-4 text-left hover:border-[#7FAFC6] hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#2F6F7E] shrink-0" />
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{prompt.name}</p>
                      <p className="text-[14px] text-muted-foreground">
                        Trigger: {prompt.triggerContext as string}
                        {prompt.lessonId ? ` · Lesson: ${prompt.lessonId as string}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[14px] text-muted-foreground">{prompt.purpose}</p>
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
