import { useAppContext } from '@/context/AppContext';
import { curriculumPrograms, CURRICULUM_OBJECT_CONFIG, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { GraduationCap, ArrowRight } from 'lucide-react';

export default function CurriculumPrograms() {
  const { setSelectedItem } = useAppContext();

  return (
    <div className="h-full w-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Programs</h1>
          <p className="text-muted-foreground mt-2">All Transition Trails programs modeled as curriculum objects. Foundations Trail is the primary prototype example with full content data.</p>
        </div>

        <div className="space-y-4">
          {curriculumPrograms.map(prog => {
            const statusCfg = CONTENT_STATUS_CONFIG[prog.status];
            const isFT     = prog.id === 'prog-foundations';
            return (
              <button
                key={prog.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: prog.id, data: prog })}
                className={`w-full text-left rounded-xl border bg-white transition-all p-5 group shadow-sm ${
                  isFT
                    ? 'border-primary/30 hover:border-primary/60 hover:bg-primary/5'
                    : 'border-border hover:border-primary/30 hover:bg-muted/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <GraduationCap className={`w-4 h-4 flex-shrink-0 ${isFT ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="text-[15px] font-bold text-foreground">{prog.name as string}</p>
                      <span className={`inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                      {isFT && <span className={`inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5 ${CURRICULUM_OBJECT_CONFIG.program.chip}`}>Primary Example</span>}
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">{prog.purpose as string}</p>
                    <div className="flex items-center gap-1 flex-wrap text-[11px] text-muted-foreground">
                      <span>{prog.duration as string}</span>
                      <span className="text-border">·</span>
                      <span>Owner: {prog.owner as string}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="grid grid-cols-4 gap-3 text-center min-w-[260px]">
                      {[
                        { l: 'Sprints',    v: prog.sprintCount },
                        { l: 'Modules',    v: prog.moduleCount },
                        { l: 'Lessons',    v: prog.lessonCount },
                        { l: 'Templates',  v: prog.pennyTemplateCount },
                      ].map(s => (
                        <div key={s.l}>
                          <p className={`text-xl font-bold font-serif ${isFT ? 'text-primary' : 'text-foreground'}`}>{s.v as number}</p>
                          <p className="text-[10px] text-muted-foreground">{s.l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{prog.assessmentCount as number} assessments</span>
                    <span>·</span>
                    <span>{prog.knowledgeArticleCount as number} knowledge articles</span>
                    <span>·</span>
                    <span>{prog.cohortCount as number} active cohorts</span>
                  </div>
                  <span className="text-[11px] text-primary font-medium group-hover:underline flex items-center gap-1">
                    Open Knowledge Brief <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Future state —</strong> New program requests will be submitted through Demand Management (Submit Change Request). This list will be auto-populated from the Salesforce Program object when Trail OS connects to Salesforce in Q3–Q4 2025.
          </p>
        </div>

      </div>
    </div>
  );
}
