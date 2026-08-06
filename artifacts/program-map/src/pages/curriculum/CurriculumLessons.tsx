import { useState } from 'react';
import { TERMS } from '@/config/terminology';
import { useAppContext } from '@/context/AppContext';
import { curriculumLessons, curriculumModules, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  'Video + Discussion':       'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  'Reading + Lab':            'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  'Video + Workshop':         'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  'Reading + Discussion':     'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
  'Workshop':                 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
  'Workshop + Live Session':  'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]',
  'Video + Lab':              'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  'Hands-On Lab':             'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]',
  'Workshop + Lab':           'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
  'Live Session':             'bg-primary/10 text-primary border-primary/20',
};

export default function CurriculumLessons() {
  const { setSelectedItem } = useAppContext();
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const filtered = moduleFilter === 'all'
    ? curriculumLessons
    : curriculumLessons.filter(l => l.moduleId === moduleFilter);

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
        {/* Row 2: module filter as underline tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto">
          <button
            onClick={() => setModuleFilter('all')}
            className={`text-[12px] font-semibold px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              moduleFilter === 'all' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            All Modules
          </button>
          {curriculumModules.map(m => (
            <button
              key={m.id}
              onClick={() => setModuleFilter(m.id)}
              className={`text-[12px] font-semibold px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                moduleFilter === m.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {m.moduleNumber as string}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-5 max-w-5xl mx-auto space-y-4">
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-[80px_1fr_130px_60px_70px_60px] gap-x-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
              {['#', 'Lesson', 'Type', 'Duration', 'Objective', TERMS.aiAssistant].map(h => (
                <p key={h} className="text-[14px] font-bold text-muted-foreground/60">{h}</p>
              ))}
            </div>
            {filtered.map((lesson, i) => {
              const statusCfg = CONTENT_STATUS_CONFIG[lesson.status];
              const typeCls   = TYPE_COLORS[lesson.lessonType as string] ?? 'bg-muted text-muted-foreground border-border';
              return (
                <button
                  key={lesson.id}
                  onClick={() => setSelectedItem({ type: 'curriculumItem', id: lesson.id, data: lesson })}
                  className={`w-full text-left grid grid-cols-[80px_1fr_130px_60px_70px_60px] gap-x-3 items-center px-4 py-3 group hover:bg-[#FFF3E0]/50 transition-colors ${i < filtered.length - 1 ? 'border-b border-border/30' : ''}`}
                >
                  <p className="text-[14px] font-mono text-muted-foreground">{lesson.lessonNumber as string}</p>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-foreground group-hover:text-primary truncate">{lesson.name as string}</p>
                    <p className="text-[14px] text-muted-foreground truncate">{lesson.module as string}</p>
                  </div>
                  <span className={`inline-flex text-[14px] font-medium border rounded-full px-2 py-0.5 w-fit ${typeCls}`}>{lesson.lessonType as string}</span>
                  <p className="text-[14px] text-muted-foreground">{lesson.duration as string}</p>
                  <span className={`inline-flex text-[14px] font-semibold border rounded-full px-2 py-0.5 w-fit ${statusCfg.cls}`}>{statusCfg.label}</span>
                  <div className="flex items-center">
                    {lesson.hasPennyPrompt as boolean
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                      : <AlertTriangle className="w-3.5 h-3.5 text-[#CC8400]" />}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[14px] text-muted-foreground text-center">
            Showing {filtered.length} of 36 total lessons (prototype sample).
          </p>
        </div>
      </div>
    </div>
  );
}
