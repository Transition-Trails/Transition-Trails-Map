import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumPrograms, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { GraduationCap, ArrowRight, Zap } from 'lucide-react';
import { useSfLmsCourses, type SfLmsCourse } from '@/hooks/useSfCurriculum';

const SF_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  Completed:    { label: 'Completed',   cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]' },
  'In Progress': { label: 'In Progress', cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]' },
  Discovery:    { label: 'Discovery',   cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
  Planned:      { label: 'Planned',     cls: 'text-slate-600 bg-slate-50 border-slate-200' },
};

function moduleStats(course: SfLmsCourse) {
  const mods = course.modules;
  const total     = mods.length;
  const completed = mods.filter(m => m.Status__c === 'Completed').length;
  const inProg    = mods.filter(m => m.Status__c === 'In Progress').length;
  const notStart  = total - completed - inProg;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, inProg, notStart, pct };
}

export default function CurriculumPrograms() {
  const { setSelectedItem } = useAppContext();
  const { data: lmsData, isLoading, isError } = useSfLmsCourses();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[14px] font-semibold text-foreground">Programs</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-foreground">{curriculumPrograms.length}</span> Programs
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1">
      <div className="p-5 max-w-5xl space-y-5">

        {/* ── Live from Salesforce ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-[#E6F0EA]0 animate-pulse" />
            <p className="text-[14px] font-bold  text-muted-foreground/60">Live from Salesforce · Course__c</p>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {isLoading && (
            <div className="rounded-lg border border-border bg-muted/10 px-4 py-3 text-[14px] text-muted-foreground">
              Loading LMS data from Salesforce…
            </div>
          )}
          {isError && (
            <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] px-4 py-3 text-[14px] text-[#A93F2F]">
              Could not load Salesforce LMS data.
            </div>
          )}

          {lmsData?.courses && lmsData.courses.length === 0 && (
            <div className="rounded-lg border border-border bg-muted/10 px-4 py-3 text-[14px] text-muted-foreground">
              No Course__c records found in Salesforce.
            </div>
          )}

          {lmsData?.courses && lmsData.courses.length > 0 && (
            <div className="grid gap-3">
              {lmsData.courses.map(course => {
                const sfStatus = course.Status__c ?? 'Unknown';
                const statusCfg = SF_STATUS_CFG[sfStatus] ?? { label: sfStatus, cls: 'text-slate-600 bg-slate-50 border-slate-200' };
                const { total, completed, inProg, notStart, pct } = moduleStats(course);
                return (
                  <div key={course.Id} className="rounded-xl border border-[#9FC3AE]/70 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#2F6B3F] shrink-0" />
                        <div>
                          <p className="text-[15px] font-bold text-foreground">{course.Course_Title__c ?? course.Name}</p>
                          <p className="text-[14px] text-muted-foreground">
                            Salesforce Course__c · {total} modules
                            {lmsData.fromCache && <span className="ml-1 text-muted-foreground/50">(cached)</span>}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 shrink-0 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    </div>

                    <div className="space-y-1 mb-3">
                      <div className="flex items-center justify-between text-[14px] text-muted-foreground">
                        <span>{completed} of {total} modules completed</span>
                        <span className="font-semibold">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <div className="h-full bg-[#E6F0EA]0 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="flex gap-4 flex-wrap text-center">
                      {[
                        { label: 'Total',       value: total,     cls: 'text-foreground' },
                        { label: 'Completed',   value: completed, cls: 'text-[#2F6B3F]' },
                        { label: 'In Progress', value: inProg,    cls: 'text-[#2F6F7E]' },
                        { label: 'Not Started', value: notStart,  cls: 'text-muted-foreground' },
                      ].map(s => (
                        <div key={s.label}>
                          <p className={`text-[14px] font-bold ${s.cls}`}>{s.value}</p>
                          <p className="text-[14px] text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                      {course.Estimated_Start_Date__c && (
                        <div>
                          <p className="text-[14px] font-bold text-foreground">
                            {new Date(course.Estimated_Start_Date__c).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-[14px] text-muted-foreground">Start</p>
                        </div>
                      )}
                      {course.Estimated_End_Date__c && (
                        <div>
                          <p className="text-[14px] font-bold text-foreground">
                            {new Date(course.Estimated_End_Date__c).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-[14px] text-muted-foreground">End</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Program Architecture (prototype) ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[14px] font-bold  text-muted-foreground/60">Program Architecture</p>
            <div className="flex-1 h-px bg-border/50" />
          </div>
          <div className="grid gap-4">
            {curriculumPrograms.map(prog => {
              const statusCfg = CONTENT_STATUS_CONFIG[prog.status];
              return (
                <button
                  key={prog.id}
                  onClick={() => setSelectedItem({ type: 'curriculumItem', id: prog.id, data: prog })}
                  className="rounded-xl border border-border bg-white p-5 text-left hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="text-[15px] font-bold text-foreground">{prog.name}</p>
                        <p className="text-[14px] text-muted-foreground">{prog.audience as string || 'All learners'} · {prog.duration as string || 'Ongoing'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-[14px] text-muted-foreground mb-3">{prog.purpose}</p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: 'Sprints',     value: prog.sprintCount as number },
                      { label: 'Modules',     value: prog.moduleCount as number },
                      { label: 'Lessons',     value: prog.lessonCount as number },
                      { label: 'Assessments', value: prog.assessmentCount as number },
                      { label: 'Cohorts',     value: prog.cohortCount as number },
                    ].map(stat => (
                      <div key={stat.label} className="text-center">
                        <p className="text-[14px] font-bold text-foreground">{stat.value ?? '—'}</p>
                        <p className="text-[14px] text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  {prog.notes && (
                    <p className="text-[14px] text-[#CC8400] bg-[#FFF3E0] border border-[#FFF3E0] rounded px-2 py-1 mt-2">{prog.notes}</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
      </ScrollArea>
    </div>
  );
}
