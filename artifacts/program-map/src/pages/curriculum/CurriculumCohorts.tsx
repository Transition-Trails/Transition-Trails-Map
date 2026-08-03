import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumCohorts, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Users, ArrowRight, AlertTriangle } from 'lucide-react';

export default function CurriculumCohorts() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-5">
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/60 mb-1">Curriculum Studio — Program Structure</p>
          <h1 className="text-3xl font-bold text-foreground">Cohorts</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Active and past program cohorts. Each cohort is a group of learners moving through a program together. Select a cohort to view learner progress and delivery assets in the Knowledge Brief.</p>
        </div>
        <div className="grid gap-4">
          {curriculumCohorts.map(cohort => {
            const statusCfg = CONTENT_STATUS_CONFIG[cohort.status];
            const atRisk = (cohort.atRiskLearners as number) || 0;
            return (
              <button key={cohort.id} onClick={() => setSelectedItem({ type: 'curriculumItem', id: cohort.id, data: cohort })} className="rounded-xl border border-border bg-white p-5 text-left hover:border-[#9FC3AE] hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#2F6B3F] shrink-0" />
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{cohort.name}</p>
                      <p className="text-[14px] text-muted-foreground">{cohort.program} · Starts {cohort.startDate as string}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mb-2">
                  <div><p className="text-[14px] font-bold text-foreground">{cohort.learnerCount as number}</p><p className="text-[14px] text-muted-foreground">Enrolled</p></div>
                  <div><p className="text-[14px] font-bold text-foreground">{cohort.activeLearners as number}</p><p className="text-[14px] text-muted-foreground">Active</p></div>
                  {atRisk > 0 && (
                    <div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-[#CC8400]" />
                        <p className="text-[14px] font-bold text-[#CC8400]">{atRisk}</p>
                      </div>
                      <p className="text-[14px] text-[#CC8400]">At Risk</p>
                    </div>
                  )}
                  {!!(cohort.completionRate) && (
                    <div><p className="text-[14px] font-bold text-[#2F6B3F]">{cohort.completionRate as string}</p><p className="text-[14px] text-muted-foreground">Completion</p></div>
                  )}
                </div>
                {!!(cohort.currentSprint) && (
                  <p className="text-[14px] text-primary font-medium">Currently: {cohort.currentSprint as string}</p>
                )}
                {cohort.notes && <p className="text-[14px] text-[#CC8400] bg-[#FFF3E0] border border-[#FFF3E0] rounded px-2 py-1 mt-2">{cohort.notes}</p>}
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
