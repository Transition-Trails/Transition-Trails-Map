import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumCohorts, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Users, ArrowRight, AlertTriangle } from 'lucide-react';

export default function CurriculumCohorts() {
  const { setSelectedItem } = useAppContext();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[14px] font-semibold text-foreground">Cohorts</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-foreground">{curriculumCohorts.length}</span> Cohorts
          </span>
          <span className="text-muted-foreground/30 text-[12px]">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-[#2F6B3F]">{curriculumCohorts.filter(c => c.status === 'published').length}</span> Active
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-3">
          {curriculumCohorts.map(cohort => {
            const statusCfg = CONTENT_STATUS_CONFIG[cohort.status];
            const atRisk = (cohort.atRiskLearners as number) || 0;
            return (
              <button
                key={cohort.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: cohort.id, data: cohort })}
                className="w-full rounded-xl border border-border bg-white p-4 text-left hover:border-[#9FC3AE] hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2F6B3F] shrink-0" />
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
      </ScrollArea>
    </div>
  );
}
