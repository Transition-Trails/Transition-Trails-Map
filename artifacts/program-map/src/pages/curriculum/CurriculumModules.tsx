import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { curriculumModules, curriculumSprints, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function CurriculumModules() {
  const { setSelectedItem } = useAppContext();
  const [sprintFilter, setSprintFilter] = useState<string>('all');

  const filtered = sprintFilter === 'all'
    ? curriculumModules
    : curriculumModules.filter(m => m.sprintId === sprintFilter);

  return (
    <div className="h-full w-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Modules</h1>
          <p className="text-muted-foreground mt-2">12 modules across 4 sprints — Foundations Trail prototype. Each module has 3 lessons, 2 assignments, and 1 assessment. Click any module to open its Knowledge Brief.</p>
        </div>

        {/* Sprint filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-medium">Sprint:</span>
          <button
            onClick={() => setSprintFilter('all')}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              sprintFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            All Sprints
          </button>
          {curriculumSprints.map(s => (
            <button
              key={s.id}
              onClick={() => setSprintFilter(s.id)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                sprintFilter === s.id ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-border text-muted-foreground hover:border-violet-300'
              }`}
            >
              Sprint {s.sprintNumber as number}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map(mod => {
            const statusCfg   = CONTENT_STATUS_CONFIG[mod.status];
            const hasPenny    = mod.hasPennyTemplate as boolean;
            const hasArticle  = mod.hasKnowledgeArticle as boolean;
            const objectives  = mod.learningObjectives as string[];
            const hasIssue    = !hasPenny || !hasArticle || mod.status === 'needs-review';
            return (
              <button
                key={mod.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: mod.id, data: mod })}
                className="w-full text-left rounded-xl border border-border bg-white hover:border-sky-300 hover:bg-sky-50/30 transition-all p-4 group shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-sky-800">{mod.moduleNumber as string}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-[13px] font-bold text-foreground">{mod.name as string}</p>
                      <span className={`inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                      {hasIssue && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2 line-clamp-1">{mod.sprint as string}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">{mod.lessonCount as number} lessons</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{mod.assignmentCount as number} assignments</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{objectives.length} objectives</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className={`text-[11px] flex items-center gap-1 ${hasPenny ? 'text-secondary' : 'text-orange-500'}`}>
                        {hasPenny ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        Penny {hasPenny ? 'template' : 'missing'}
                      </span>
                      <span className={`text-[11px] flex items-center gap-1 ${hasArticle ? 'text-indigo-700' : 'text-orange-500'}`}>
                        {hasArticle ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        Article {hasArticle ? 'linked' : 'missing'}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary flex-shrink-0 mt-0.5" />
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
