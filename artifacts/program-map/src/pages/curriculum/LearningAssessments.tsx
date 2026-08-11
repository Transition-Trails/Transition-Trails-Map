import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumAssessments, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function LearningAssessments() {
  const { setSelectedItem } = useAppContext();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[14px] font-semibold text-foreground">Assessments</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-foreground">{curriculumAssessments.length}</span> Assessments
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-3">
          {curriculumAssessments.map(asmnt => {
            const statusCfg = CONTENT_STATUS_CONFIG[asmnt.status];
            return (
              <button key={asmnt.id} onClick={() => setSelectedItem({ type: 'curriculumItem', id: asmnt.id, data: asmnt })} className="w-full rounded-xl border border-border bg-white p-4 text-left hover:border-[#E8B9B4] hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#A93F2F] shrink-0" />
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{asmnt.name}</p>
                      <p className="text-[14px] text-muted-foreground">{asmnt.moduleName as string} · {asmnt.assessmentType as string}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div><p className="text-[14px] font-bold text-foreground">{asmnt.questionCount as number}</p><p className="text-[14px] text-muted-foreground">Questions</p></div>
                  <div><p className="text-[14px] font-bold text-foreground">{asmnt.passingScore as number}%</p><p className="text-[14px] text-muted-foreground">Passing Score</p></div>
                  <div><p className="text-[14px] font-bold text-foreground">{asmnt.duration as string}</p><p className="text-[14px] text-muted-foreground">Duration</p></div>
                  {!!(asmnt.avgScore) && <div><p className="text-[14px] font-bold text-[#2F6B3F]">{asmnt.avgScore as string}</p><p className="text-[14px] text-muted-foreground">Avg Score</p></div>}
                  {!!(asmnt.attempts) && <div><p className="text-[14px] font-bold text-foreground">{asmnt.attempts as number}</p><p className="text-[14px] text-muted-foreground">Attempts</p></div>}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
