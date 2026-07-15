import { useState } from 'react';
import { TERMS } from '@/config/terminology';
import { useAppContext } from '@/context/AppContext';
import { curriculumLessons, curriculumModules, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  'Video + Discussion':       'bg-sky-50 text-sky-700 border-sky-200',
  'Reading + Lab':            'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Video + Workshop':         'bg-violet-50 text-violet-700 border-violet-200',
  'Reading + Discussion':     'bg-amber-50 text-amber-700 border-amber-200',
  'Workshop':                 'bg-orange-50 text-orange-700 border-orange-200',
  'Workshop + Live Session':  'bg-rose-50 text-rose-700 border-rose-200',
  'Video + Lab':              'bg-sky-50 text-sky-700 border-sky-200',
  'Hands-On Lab':             'bg-green-50 text-green-700 border-green-200',
  'Workshop + Lab':           'bg-amber-50 text-amber-700 border-amber-200',
  'Live Session':             'bg-primary/10 text-primary border-primary/20',
};

export default function CurriculumLessons() {
  const { setSelectedItem } = useAppContext();
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const filtered = moduleFilter === 'all'
    ? curriculumLessons
    : curriculumLessons.filter(l => l.moduleId === moduleFilter);

  return (
    <div className="h-full w-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio</p>
          <h1 className="text-3xl font-bold text-foreground">Lessons</h1>
          <p className="text-muted-foreground mt-2">Sample lessons from the Foundations Trail prototype. Each lesson has a type, duration, learning objective, and {TERMS.aiAssistant} prompt status. Click any lesson to open its Knowledge Brief.</p>
        </div>

        {/* Module filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-medium">Module:</span>
          <button
            onClick={() => setModuleFilter('all')}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              moduleFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            All Modules
          </button>
          {curriculumModules.map(m => (
            <button
              key={m.id}
              onClick={() => setModuleFilter(m.id)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                moduleFilter === m.id ? 'bg-sky-600 text-white border-sky-600' : 'bg-white border-border text-muted-foreground hover:border-sky-300'
              }`}
            >
              {m.moduleNumber as string}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[80px_1fr_130px_60px_70px_60px] gap-x-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
            {['#', 'Lesson', 'Type', 'Duration', 'Objective', TERMS.aiAssistant].map(h => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{h}</p>
            ))}
          </div>
          {filtered.map((lesson, i) => {
            const statusCfg = CONTENT_STATUS_CONFIG[lesson.status];
            const typeCls   = TYPE_COLORS[lesson.lessonType as string] ?? 'bg-muted text-muted-foreground border-border';
            return (
              <button
                key={lesson.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: lesson.id, data: lesson })}
                className={`w-full text-left grid grid-cols-[80px_1fr_130px_60px_70px_60px] gap-x-3 items-center px-4 py-3 group hover:bg-amber-50/50 transition-colors ${i < filtered.length - 1 ? 'border-b border-border/30' : ''}`}
              >
                <p className="text-[11px] font-mono text-muted-foreground">{lesson.lessonNumber as string}</p>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground group-hover:text-primary truncate">{lesson.name as string}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{lesson.module as string}</p>
                </div>
                <span className={`inline-flex text-[10px] font-medium border rounded-full px-2 py-0.5 w-fit ${typeCls}`}>{lesson.lessonType as string}</span>
                <p className="text-[11px] text-muted-foreground">{lesson.duration as string}</p>
                <span className={`inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5 w-fit ${statusCfg.cls}`}>{statusCfg.label}</span>
                <div className="flex items-center">
                  {lesson.hasPennyPrompt as boolean
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Showing {filtered.length} of 36 total lessons (prototype sample). Full lesson set will be available in the next content iteration.
        </p>

      </div>
    </div>
  );
}
