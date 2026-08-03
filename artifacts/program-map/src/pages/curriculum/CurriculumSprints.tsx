import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumSprints, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Layers, ArrowRight } from 'lucide-react';

const RESOLVE_COLORS: Record<string, string> = {
  Recognize: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  Explore:   'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  Select:    'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
  Outline:   'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  Launch:    'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]',
  Verify:    'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]',
  Evolve:    'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
};

export default function CurriculumSprints() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-6">
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/60 mb-1">Curriculum Studio — Program Structure</p>
          <h1 className="text-3xl font-bold text-foreground">Sprints</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Each sprint is a 3-week themed learning arc containing 3 modules. Sprints align to the RESOLVE framework phases. Select a sprint to view its module sequence in the Knowledge Brief.</p>
        </div>

        <div className="grid gap-3">
          {curriculumSprints.map(sprint => {
            const statusCfg = CONTENT_STATUS_CONFIG[sprint.status];
            const resolveCls = RESOLVE_COLORS[sprint.resolvePhase as string] || 'bg-slate-50 text-slate-800 border-slate-200';
            return (
              <button
                key={sprint.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: sprint.id, data: sprint })}
                className="rounded-xl border border-border bg-white p-5 text-left hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[14px] font-bold shrink-0">
                      {sprint.sprintNumber as number}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{sprint.name}</p>
                      <p className="text-[14px] text-muted-foreground">{sprint.duration as string} · {sprint.moduleCount as number} modules · {sprint.program}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!!(sprint.resolvePhase) && (
                      <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${resolveCls}`}>{sprint.resolvePhase as string}</span>
                    )}
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[14px] text-muted-foreground">{sprint.purpose}</p>
                {!!(sprint.theme) && (
                  <p className="text-[14px] text-primary/70 mt-1 font-medium">Theme: {sprint.theme as string}</p>
                )}
                {sprint.notes && (
                  <p className="text-[14px] text-[#CC8400] bg-[#FFF3E0] border border-[#FFF3E0] rounded px-2 py-1 mt-2">{sprint.notes}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
