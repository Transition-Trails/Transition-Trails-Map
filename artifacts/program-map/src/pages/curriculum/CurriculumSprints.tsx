import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { curriculumSprints, curriculumPrograms, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { ArrowRight, Layers } from 'lucide-react';

const RESOLVE_COLOR: Record<string, string> = {
  Recognize: 'bg-violet-50 text-violet-800 border-violet-200',
  Evaluate:  'bg-sky-50 text-sky-800 border-sky-200',
  Solve:     'bg-amber-50 text-amber-800 border-amber-200',
  Verify:    'bg-green-50 text-green-800 border-green-200',
};

export default function CurriculumSprints() {
  const { setSelectedItem } = useAppContext();
  const [program, setProgram] = useState('Foundations Trail');

  const filtered = curriculumSprints.filter(s => s.program === program);

  return (
    <div className="h-full w-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Sprints</h1>
          <p className="text-muted-foreground mt-2">Program sprints — each sprint maps to a RESOLVE phase and contains 3 modules. Click any sprint to open its Knowledge Brief.</p>
        </div>

        {/* Program filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-medium">Program:</span>
          {curriculumPrograms.map(p => (
            <button
              key={p.id}
              onClick={() => setProgram(p.program as string)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                program === p.program
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {p.name as string}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-8 text-center">
            <Layers className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No sprints yet</p>
            <p className="text-[11px] text-muted-foreground">This program doesn't have sprint content in the prototype. Foundations Trail is the primary example.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(sprint => {
              const statusCfg = CONTENT_STATUS_CONFIG[sprint.status];
              const resolveColor = RESOLVE_COLOR[sprint.resolvePhase as string] ?? 'bg-muted text-muted-foreground border-border';
              return (
                <button
                  key={sprint.id}
                  onClick={() => setSelectedItem({ type: 'curriculumItem', id: sprint.id, data: sprint })}
                  className="w-full text-left rounded-xl border border-border bg-white hover:border-violet-300 hover:bg-violet-50/30 transition-all p-4 group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-[13px] font-bold text-violet-800">{sprint.sprintNumber as number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-[13px] font-bold text-foreground">{sprint.name as string}</p>
                        <span className={`inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                        <span className={`inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5 ${resolveColor}`}>
                          RESOLVE: {sprint.resolvePhase as string}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{sprint.duration as string}</span>
                        <span>·</span>
                        <span>{sprint.moduleCount as number} modules</span>
                        <span>·</span>
                        <span>{sprint.lessonCount as number} lessons</span>
                        <span>·</span>
                        <span className="italic">{sprint.theme as string}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
