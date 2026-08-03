import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumLessons, curriculumSprints, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { BookOpen, ArrowRight } from 'lucide-react';

const LESSON_TYPE_COLORS: Record<string, string> = {
  Instruction: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
  Lab:         'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  Workshop:    'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
};

export default function LearningLessons() {
  const { setSelectedItem } = useAppContext();
  const [sprintFilter, setSprintFilter] = useState<string>('all');

  const filtered = sprintFilter === 'all'
    ? curriculumLessons
    : curriculumLessons.filter(l => l.sprint === `Sprint ${curriculumSprints.find(s => s.id === sprintFilter)?.sprintNumber}`);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio — Learning Assets</p>
          <h1 className="text-3xl font-bold text-foreground">Lessons</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Individual learning units inside each module. Each lesson has one objective, an instructional sequence, and linked Penny prompts. Select a lesson to see its full asset connections.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSprintFilter('all')} className={`text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${sprintFilter === 'all' ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>All</button>
          {curriculumSprints.map(s => (
            <button key={s.id} onClick={() => setSprintFilter(s.id)} className={`text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${sprintFilter === s.id ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>Sprint {s.sprintNumber as number}</button>
          ))}
        </div>
        <div className="grid gap-2">
          {filtered.map(lesson => {
            const statusCfg = CONTENT_STATUS_CONFIG[lesson.status];
            const typeCls = LESSON_TYPE_COLORS[lesson.lessonType as string] || 'bg-slate-50 text-slate-700 border-slate-200';
            return (
              <button key={lesson.id} onClick={() => setSelectedItem({ type: 'curriculumItem', id: lesson.id, data: lesson })} className="rounded-lg border border-border bg-white p-4 text-left hover:border-[#FFD08A] hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-[#CC8400] mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground/60">{lesson.lessonNumber as string}</span>
                        <p className="text-[13px] font-bold text-foreground">{lesson.name}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{lesson.moduleName as string} · {lesson.duration as string}</p>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5 italic">{lesson.learningObjective as string}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-medium border rounded-full px-1.5 py-0.5 ${typeCls}`}>{lesson.lessonType as string}</span>
                    <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
