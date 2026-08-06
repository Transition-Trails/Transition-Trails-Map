import { useAppContext } from '@/context/AppContext';
import { curriculumAssessments, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CurriculumAssessments() {
  const { setSelectedItem } = useAppContext();

  const published  = curriculumAssessments.filter(a => a.status === 'published').length;
  const needsReview = curriculumAssessments.filter(a => a.status === 'needs-review').length;
  const pennyCoached = curriculumAssessments.filter(a => a.hasPennyCoach as boolean).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Compact header */}
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[14px] font-semibold text-foreground">Assessments</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-foreground">{curriculumAssessments.length}</span> Total
          </span>
          <span className="text-muted-foreground/30 text-[12px]">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-[#2F6B3F]">{published}</span> Published
          </span>
          {needsReview > 0 && (
            <>
              <span className="text-muted-foreground/30 text-[12px]">·</span>
              <span className="text-[12px] text-muted-foreground">
                <span className="font-bold text-[#CC8400]">{needsReview}</span> Needs Review
              </span>
            </>
          )}
          <span className="text-muted-foreground/30 text-[12px]">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-secondary">{pennyCoached}</span> Penny Coached
          </span>
        </div>
      </div>

      {/* Table content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 py-4 space-y-4">
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <div className="grid grid-cols-[1fr_140px_70px_70px_70px] gap-x-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
              {['Assessment', 'Type', 'Qs', 'Pass %', 'Penny'].map(h => (
                <p key={h} className="text-[14px] font-bold text-muted-foreground/60">{h}</p>
              ))}
            </div>
            {curriculumAssessments.map((asmnt, i) => {
              const statusCfg = CONTENT_STATUS_CONFIG[asmnt.status];
              return (
                <button
                  key={asmnt.id}
                  onClick={() => setSelectedItem({ type: 'curriculumItem', id: asmnt.id, data: asmnt })}
                  className={`w-full text-left grid grid-cols-[1fr_140px_70px_70px_70px] gap-x-3 items-center px-4 py-3 group hover:bg-[#FBEAE6]/40 transition-colors ${i < curriculumAssessments.length - 1 ? 'border-b border-border/30' : ''}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-foreground group-hover:text-primary truncate">{asmnt.name as string}</p>
                      <span className={`inline-flex flex-shrink-0 text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    </div>
                    <p className="text-[14px] text-muted-foreground truncate">{asmnt.module as string}</p>
                  </div>
                  <p className="text-[14px] text-muted-foreground">{asmnt.assessmentType as string}</p>
                  <p className="text-[14px] text-foreground font-medium">{asmnt.questionCount as number}</p>
                  <p className="text-[14px] text-foreground font-medium">{asmnt.passingScore as number}%</p>
                  <div className="flex items-center">
                    {asmnt.hasPennyCoach as boolean
                      ? <Sparkles className="w-3.5 h-3.5 text-secondary" />
                      : <AlertTriangle className="w-3.5 h-3.5 text-[#CC8400]" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-[#E8B9B4] bg-[#FBEAE6] px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-[#A93F2F] flex-shrink-0 mt-0.5" />
            <p className="text-[14px] text-[#A93F2F] leading-relaxed">
              <strong>Missing assessment:</strong> Module 4.3 (Portfolio &amp; Career Launch) has no assessment. This is a high-severity Content Health issue.
              Use Penny Content Assistant → Create Assessment to generate a portfolio review assessment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
