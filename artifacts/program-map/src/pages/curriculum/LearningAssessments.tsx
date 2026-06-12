import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumAssessments, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function LearningAssessments() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio — Learning Assets</p>
          <h1 className="text-3xl font-bold text-foreground">Assessments</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Knowledge checks and practice exams linked to modules. Every module in the Foundations Trail standard requires at least one assessment. Select an assessment to view its alignment in the Knowledge Brief.</p>
        </div>
        <div className="grid gap-3">
          {curriculumAssessments.map(asmnt => {
            const statusCfg = CONTENT_STATUS_CONFIG[asmnt.status];
            return (
              <button key={asmnt.id} onClick={() => setSelectedItem({ type: 'curriculumItem', id: asmnt.id, data: asmnt })} className="rounded-xl border border-border bg-white p-4 text-left hover:border-rose-200 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{asmnt.name}</p>
                      <p className="text-[11px] text-muted-foreground">{asmnt.moduleName as string} · {asmnt.assessmentType as string}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div><p className="text-[13px] font-bold text-foreground">{asmnt.questionCount as number}</p><p className="text-[10px] text-muted-foreground">Questions</p></div>
                  <div><p className="text-[13px] font-bold text-foreground">{asmnt.passingScore as number}%</p><p className="text-[10px] text-muted-foreground">Passing Score</p></div>
                  <div><p className="text-[13px] font-bold text-foreground">{asmnt.duration as string}</p><p className="text-[10px] text-muted-foreground">Duration</p></div>
                  {!!(asmnt.avgScore) && <div><p className="text-[13px] font-bold text-green-700">{asmnt.avgScore as string}</p><p className="text-[10px] text-muted-foreground">Avg Score</p></div>}
                  {!!(asmnt.attempts) && <div><p className="text-[13px] font-bold text-foreground">{asmnt.attempts as number}</p><p className="text-[10px] text-muted-foreground">Attempts</p></div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
