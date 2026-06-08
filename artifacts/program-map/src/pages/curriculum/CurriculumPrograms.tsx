import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumPrograms, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { GraduationCap, ArrowRight } from 'lucide-react';

export default function CurriculumPrograms() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio — Program Structure</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Programs</h1>
          <p className="text-[13px] text-muted-foreground mt-1">The top-level learning programs at Transition Trails. Each program contains cohorts, sprints, and modules. Select a program to view its full structure in the Knowledge Brief.</p>
        </div>

        <div className="grid gap-4">
          {curriculumPrograms.map(prog => {
            const statusCfg = CONTENT_STATUS_CONFIG[prog.status];
            return (
              <button
                key={prog.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: prog.id, data: prog })}
                className="rounded-xl border border-border bg-white p-5 text-left hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-[15px] font-bold text-foreground">{prog.name}</p>
                      <p className="text-[11px] text-muted-foreground">{prog.audience as string || 'All learners'} · {prog.duration as string || 'Ongoing'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground mb-3">{prog.purpose}</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: 'Sprints', value: prog.sprintCount as number },
                    { label: 'Modules', value: prog.moduleCount as number },
                    { label: 'Lessons', value: prog.lessonCount as number },
                    { label: 'Assessments', value: prog.assessmentCount as number },
                    { label: 'Cohorts', value: prog.cohortCount as number },
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <p className="text-[14px] font-bold text-foreground">{stat.value ?? '—'}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
                {prog.notes && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-2">{prog.notes}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
