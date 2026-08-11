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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-0">
        {/* Row 1: title + count */}
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <h1 className="text-[14px] font-semibold text-foreground">Lessons</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-foreground">{filtered.length}</span> of {curriculumLessons.length}
          </span>
        </div>
        {/* Row 2: sprint filter as underline tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto">
          <button
            onClick={() => setSprintFilter('all')}
            className={`text-[12px] font-semibold px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              sprintFilter === 'all' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            All
          </button>
          {curriculumSprints.map(s => (
            <button
              key={s.id}
              onClick={() => setSprintFilter(s.id)}
              className={`text-[12px] font-semibold px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                sprintFilter === s.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Sprint {s.sprintNumber as number}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-2">
          {filtered.map(lesson => {
            const statusCfg = CONTENT_STATUS_CONFIG[lesson.status];
            const typeCls = LESSON_TYPE_COLORS[lesson.lessonType as string] || 'bg-slate-50 text-slate-700 border-slate-200';
            return (
              <button key={lesson.id} onClick={() => setSelectedItem({ type: 'curriculumItem', id: lesson.id, data: lesson })} className="w-full rounded-lg border border-border bg-white p-4 text-left hover:border-[#FFD08A] hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-[#CC8400] mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px] font-bold text-muted-foreground/60">{lesson.lessonNumber as string}</span>
                        <p className="text-[14px] font-bold text-foreground">{lesson.name}</p>
                      </div>
                      <p className="text-[14px] text-muted-foreground">{lesson.moduleName as string} · {lesson.duration as string}</p>
                      <p className="text-[14px] text-muted-foreground/80 mt-0.5 italic">{lesson.learningObjective as string}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[14px] font-medium border rounded-full px-1.5 py-0.5 ${typeCls}`}>{lesson.lessonType as string}</span>
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
