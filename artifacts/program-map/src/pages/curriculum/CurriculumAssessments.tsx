import { useAppContext } from '@/context/AppContext';
import { curriculumAssessments, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

export default function CurriculumAssessments() {
  const { setSelectedItem } = useAppContext();

  return (
    <div className="h-full w-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/60 mb-1">Curriculum Studio</p>
          <h1 className="text-3xl font-bold text-foreground">Assessments</h1>
          <p className="text-muted-foreground mt-2">11 assessments — one per module in Foundations Trail (Module 4.3 is missing its assessment — flagged in Content Health). Click any assessment to open its Knowledge Brief.</p>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total',        value: curriculumAssessments.length, color: 'text-foreground' },
            { label: 'Published',    value: curriculumAssessments.filter(a => a.status === 'published').length,      color: 'text-[#2F6B3F]' },
            { label: 'Needs Review', value: curriculumAssessments.filter(a => a.status === 'needs-review').length,  color: 'text-[#CC8400]' },
            { label: 'Penny Coached',value: curriculumAssessments.filter(a => a.hasPennyCoach as boolean).length,   color: 'text-secondary' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-white p-4 text-center shadow-sm">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[14px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_70px_70px_70px] gap-x-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
            {['Assessment', 'Type', 'Qs', 'Pass %', 'Penny'].map(h => (
              <p key={h} className="text-[14px] font-bold  text-muted-foreground/60">{h}</p>
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
            <strong>Missing assessment:</strong> Module 4.3 (Portfolio & Career Launch) has no assessment. This is a high-severity Content Health issue.
            Use Penny Content Assistant → Create Assessment to generate a portfolio review assessment.
          </p>
        </div>

      </div>
    </div>
  );
}
