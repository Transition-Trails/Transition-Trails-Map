import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, CheckCircle2, Clock, Circle, ChevronRight, BookOpen } from 'lucide-react';
import { useSfLmsCourses, type SfLmsCourse, type SfCourseModule } from '@/hooks/useSfCurriculum';

// ── Status configs ────────────────────────────────────────────────────────────

const COURSE_STATUS: Record<string, { label: string; cls: string }> = {
  Completed:    { label: 'Completed',   cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]' },
  'In Progress': { label: 'In Progress', cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]' },
  Discovery:    { label: 'Discovery',   cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
  Planned:      { label: 'Planned',     cls: 'text-slate-500 bg-slate-50 border-slate-200' },
};

const MODULE_STATUS: Record<string, { label: string; icon: React.ReactNode; pill: string }> = {
  Completed:    {
    label: 'Completed',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F] shrink-0" />,
    pill: 'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]',
  },
  'In Progress': {
    label: 'In Progress',
    icon: <Clock className="w-3.5 h-3.5 text-[#2F6F7E] shrink-0" />,
    pill: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  },
  'Not Started': {
    label: 'Not Started',
    icon: <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />,
    pill: 'bg-slate-50 text-slate-500 border-slate-200',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function courseStats(c: SfLmsCourse) {
  const total     = c.modules.length;
  const completed = c.modules.filter(m => m.Status__c === 'Completed').length;
  const inProg    = c.modules.filter(m => m.Status__c === 'In Progress').length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, inProg, pct };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CourseListItem({
  course,
  selected,
  onClick,
}: {
  course: SfLmsCourse;
  selected: boolean;
  onClick: () => void;
}) {
  const { total, completed, pct } = courseStats(course);
  const sfSt = course.Status__c ?? 'Unknown';
  const statusCfg = COURSE_STATUS[sfSt] ?? { label: sfSt, cls: 'text-slate-500 bg-slate-50 border-slate-200' };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-border/40 transition-colors last:border-0 ${
        selected
          ? 'bg-primary/5 border-l-2 border-l-primary pl-3.5'
          : 'hover:bg-muted/30 border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className={`text-[14px] font-semibold leading-tight ${selected ? 'text-primary' : 'text-foreground'}`}>
          {course.Course_Title__c ?? course.Name}
        </p>
        <ChevronRight className={`w-3 h-3 shrink-0 mt-0.5 transition-transform ${selected ? 'text-primary rotate-90' : 'text-muted-foreground/40'}`} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[14px] font-semibold border rounded-full px-1.5 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
        {total > 0 && (
          <span className="text-[14px] text-muted-foreground">{completed}/{total}</span>
        )}
      </div>
      {total > 0 && (
        <div className="mt-1.5 h-1 bg-muted/40 rounded-full overflow-hidden">
          <div className="h-full bg-[#E6F0EA]0 rounded-full" style={{ width: `${pct}%` }} />
        </div>
      )}
    </button>
  );
}

function ModuleRow({ mod, index }: { mod: SfCourseModule; index: number }) {
  const st = MODULE_STATUS[mod.Status__c ?? 'Not Started'] ?? MODULE_STATUS['Not Started'];
  const pct = mod.PercentCompleted__c ?? 0;

  return (
    <div className="flex items-center gap-3 py-2.5 px-5 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
      {st.icon}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-foreground truncate">{mod.Name}</p>
        {pct > 0 && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="h-1 w-20 bg-muted/40 rounded-full overflow-hidden">
              <div className="h-full bg-[#E6F0EA]0 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[14px] text-muted-foreground">{pct}%</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[14px] text-muted-foreground/50">#{index + 1}</span>
        <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${st.pill}`}>{st.label}</span>
      </div>
    </div>
  );
}

function CourseDetail({ course }: { course: SfLmsCourse }) {
  const { total, completed, inProg, pct } = courseStats(course);
  const notStart = total - completed - inProg;
  const sfSt = course.Status__c ?? 'Unknown';
  const statusCfg = COURSE_STATUS[sfSt] ?? { label: sfSt, cls: 'text-slate-500 bg-slate-50 border-slate-200' };

  return (
    <div className="flex flex-col h-full">
      {/* Course header */}
      <div className="px-6 py-5 border-b border-border bg-white shrink-0">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#2F6B3F] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[17px] font-bold text-foreground leading-tight">
                {course.Course_Title__c ?? course.Name}
              </h2>
              <p className="text-[14px] text-muted-foreground mt-0.5">Salesforce Course__c · {total} modules</p>
            </div>
          </div>
          <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 shrink-0 ${statusCfg.cls}`}>
            {statusCfg.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-[14px] text-muted-foreground">
            <span>{completed} of {total} modules completed</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
            <div className="h-full bg-[#E6F0EA]0 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 flex-wrap">
          {[
            { label: 'Completed',   val: completed, cls: 'text-[#2F6B3F]' },
            { label: 'In Progress', val: inProg,    cls: 'text-[#2F6F7E]' },
            { label: 'Not Started', val: notStart,  cls: 'text-muted-foreground' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-[15px] font-bold ${s.cls}`}>{s.val}</p>
              <p className="text-[14px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
          {course.Estimated_Start_Date__c && (
            <div className="text-center">
              <p className="text-[15px] font-bold text-foreground">
                {new Date(course.Estimated_Start_Date__c).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
              <p className="text-[14px] text-muted-foreground">Start</p>
            </div>
          )}
          {course.Estimated_End_Date__c && (
            <div className="text-center">
              <p className="text-[15px] font-bold text-foreground">
                {new Date(course.Estimated_End_Date__c).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
              <p className="text-[14px] text-muted-foreground">End</p>
            </div>
          )}
        </div>
      </div>

      {/* Module list */}
      <div className="flex-1 overflow-hidden">
        {total === 0 ? (
          <div className="px-6 py-8 text-center text-[14px] text-muted-foreground">
            No modules found for this course in Salesforce.
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="py-2">
              {/* Column headers */}
              <div className="flex items-center gap-3 px-5 pb-2 border-b border-border/40">
                <span className="w-3.5" />
                <p className="flex-1 text-[14px] font-bold  text-muted-foreground/60">Module</p>
                <p className="text-[14px] font-bold  text-muted-foreground/60 shrink-0">Status</p>
              </div>
              {course.modules.map((mod, i) => (
                <ModuleRow key={mod.Id} mod={mod} index={i} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CoursesAndModules() {
  const { data, isLoading, isError } = useSfLmsCourses();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first course with modules once data loads
  useEffect(() => {
    if (data?.courses && data.courses.length > 0 && !selectedId) {
      const first = data.courses.find(c => c.modules.length > 0) ?? data.courses[0];
      setSelectedId(first.Id);
    }
  }, [data, selectedId]);

  const courses  = data?.courses ?? [];
  const selected = courses.find(c => c.Id === selectedId) ?? null;

  const totalModules  = courses.reduce((s, c) => s + c.modules.length, 0);
  const totalComplete = courses.reduce((s, c) => s + c.modules.filter(m => m.Status__c === 'Completed').length, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-border bg-white shrink-0">
        <p className="text-[14px] font-bold  text-muted-foreground/60 mb-0.5">
          Programs — Live from Salesforce
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Courses &amp; Modules</h1>
          {data && (
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-[15px] font-bold text-foreground">{courses.length}</p>
                <p className="text-[14px] text-muted-foreground">courses</p>
              </div>
              <div>
                <p className="text-[15px] font-bold text-foreground">{totalModules}</p>
                <p className="text-[14px] text-muted-foreground">modules</p>
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#2F6B3F]">{totalComplete}</p>
                <p className="text-[14px] text-muted-foreground">completed</p>
              </div>
              {data.fromCache && (
                <div className="flex items-end pb-0.5">
                  <span className="text-[14px] text-muted-foreground/50">cached</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: course list ── */}
        <div className="w-64 shrink-0 border-r border-border bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-border/50 bg-muted/20">
            <p className="text-[14px] font-bold  text-muted-foreground/60">
              {courses.length} Courses
            </p>
          </div>

          {isLoading && (
            <p className="px-4 py-4 text-[14px] text-muted-foreground">Loading from Salesforce…</p>
          )}
          {isError && (
            <p className="px-4 py-4 text-[14px] text-[#A93F2F]">Could not load courses.</p>
          )}

          <ScrollArea className="flex-1">
            {courses.map(course => (
              <CourseListItem
                key={course.Id}
                course={course}
                selected={course.Id === selectedId}
                onClick={() => setSelectedId(course.Id)}
              />
            ))}
          </ScrollArea>
        </div>

        {/* ── Right: module detail ── */}
        <div className="flex-1 overflow-hidden bg-muted/10">
          {selected ? (
            <CourseDetail course={selected} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
              <BookOpen className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-[14px]">Select a course to view its modules</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
