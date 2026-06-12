import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumSprints, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Layers, ArrowRight } from 'lucide-react';

const RESOLVE_COLORS: Record<string, string> = {
  Recognize: 'bg-sky-50 text-sky-800 border-sky-200',
  Evaluate:  'bg-violet-50 text-violet-800 border-violet-200',
  Solve:     'bg-amber-50 text-amber-800 border-amber-200',
  Verify:    'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export default function CurriculumSprints() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio — Program Structure</p>
          <h1 className="text-3xl font-bold text-foreground">Sprints</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Each sprint is a 3-week themed learning arc containing 3 modules. Sprints align to the RESOLVE framework phases. Select a sprint to view its module sequence in the Knowledge Brief.</p>
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
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[12px] font-bold shrink-0">
                      {sprint.sprintNumber as number}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{sprint.name}</p>
                      <p className="text-[11px] text-muted-foreground">{sprint.duration as string} · {sprint.moduleCount as number} modules · {sprint.program}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!!(sprint.resolvePhase) && (
                      <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${resolveCls}`}>{sprint.resolvePhase as string}</span>
                    )}
                    <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground">{sprint.purpose}</p>
                {!!(sprint.theme) && (
                  <p className="text-[11px] text-primary/70 mt-1 font-medium">Theme: {sprint.theme as string}</p>
                )}
                {sprint.notes && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-2">{sprint.notes}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
