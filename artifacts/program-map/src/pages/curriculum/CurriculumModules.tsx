import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumModules, curriculumSprints, curriculumHealthIssues, CONTENT_STATUS_CONFIG, type CurriculumItem } from '@/data/curriculumData';
import { CheckCircle2, AlertTriangle, ArrowRight, Star, Zap, BookOpen } from 'lucide-react';
import { useSfLmsCourses, type SfCourseModule, type SfLmsCourse } from '@/hooks/useSfCurriculum';

// ── Prototype view helpers ────────────────────────────────────────────────────

function getRelHealth(m: CurriculumItem) {
  return [
    { label: 'Lessons',    count: ((m.lessonIds as string[]) || []).length,    ok: ((m.lessonIds as string[]) || []).length > 0 },
    { label: 'Assessment', count: ((m.assessmentIds as string[]) || []).length, ok: ((m.assessmentIds as string[]) || []).length > 0 },
    { label: 'KB Articles',count: ((m.knowledgeArticleIds as string[]) || []).length, ok: ((m.knowledgeArticleIds as string[]) || []).length > 0 },
    { label: 'Coaching',   count: ((m.coachingPromptIds as string[]) || []).length,   ok: ((m.coachingPromptIds as string[]) || []).length > 0 },
    { label: 'Reflection', count: ((m.reflectionPromptIds as string[]) || []).length, ok: ((m.reflectionPromptIds as string[]) || []).length > 0 },
    { label: 'Delivery',   count: ((m.slackActivityIds as string[]) || []).length + ((m.calendarEventIds as string[]) || []).length, ok: ((m.slackActivityIds as string[]) || []).length + ((m.calendarEventIds as string[]) || []).length > 0 },
  ];
}

// ── Live SF view helpers ──────────────────────────────────────────────────────

const SF_MODULE_STATUS: Record<string, { label: string; dot: string; pill: string }> = {
  Completed:    { label: 'Completed',   dot: 'bg-[#E6F0EA]0', pill: 'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]' },
  'In Progress': { label: 'In Progress', dot: 'bg-[#EDF5F8]0',    pill: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]' },
  'Not Started': { label: 'Not Started', dot: 'bg-slate-300',   pill: 'bg-slate-50 text-slate-600 border-slate-200' },
};

function SfModuleRow({ mod }: { mod: SfCourseModule }) {
  const st = SF_MODULE_STATUS[mod.Status__c ?? 'Not Started'] ?? SF_MODULE_STATUS['Not Started'];
  const pct = mod.PercentCompleted__c ?? 0;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
      <span className={`shrink-0 w-2 h-2 rounded-full ${st.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-foreground truncate">{mod.Name}</p>
        {pct > 0 && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="h-1 w-16 bg-muted/40 rounded-full overflow-hidden">
              <div className="h-full bg-[#E6F0EA]0 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[14px] text-muted-foreground">{pct}%</span>
          </div>
        )}
      </div>
      <span className={`shrink-0 text-[14px] font-semibold border rounded-full px-2 py-0.5 ${st.pill}`}>{st.label}</span>
    </div>
  );
}

function SfCourseBlock({ course }: { course: SfLmsCourse }) {
  const [expanded, setExpanded] = useState(true);
  const mods      = course.modules;
  const completed = mods.filter(m => m.Status__c === 'Completed').length;
  const pct       = mods.length > 0 ? Math.round((completed / mods.length) * 100) : 0;

  return (
    <div className="rounded-xl border border-[#9FC3AE]/70 bg-white overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="w-4 h-4 text-[#2F6B3F] shrink-0" />
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-foreground truncate">{course.Course_Title__c ?? course.Name}</p>
            <p className="text-[14px] text-muted-foreground">{mods.length} modules · {pct}% complete</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-20 h-1.5 bg-muted/40 rounded-full overflow-hidden">
            <div className="h-full bg-[#E6F0EA]0 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[14px] font-semibold text-muted-foreground">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && mods.length > 0 && (
        <div className="px-5 pb-4">
          {mods.map(mod => <SfModuleRow key={mod.Id} mod={mod} />)}
        </div>
      )}
      {expanded && mods.length === 0 && (
        <p className="px-5 pb-4 text-[14px] text-muted-foreground">No modules found.</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type ViewMode = 'prototype' | 'live';

export default function CurriculumModules() {
  const { setSelectedItem } = useAppContext();
  const [sprintFilter, setSprintFilter] = useState<string>('all');
  const [viewMode, setViewMode]         = useState<ViewMode>('live');

  const { data: lmsData, isLoading, isError } = useSfLmsCourses();

  // ── Prototype stats ──
  const filteredModules = sprintFilter === 'all'
    ? curriculumModules
    : curriculumModules.filter(m => m.sprintId === sprintFilter);

  const sprintGroups = curriculumSprints.map(sprint => ({
    sprint,
    modules: filteredModules.filter(m => m.sprintId === sprint.id),
  })).filter(g => g.modules.length > 0);

  const issuesByModule = (moduleId: string) =>
    curriculumHealthIssues.filter(h => h.affectedObjectId === moduleId);

  const totalModules    = curriculumModules.length;
  const fullyConnected  = curriculumModules.filter(m => getRelHealth(m).every(r => r.ok)).length;

  // ── Live stats ──
  const liveTotal     = lmsData?.courses.reduce((s, c) => s + c.modules.length, 0) ?? 0;
  const liveCompleted = lmsData?.courses.reduce(
    (s, c) => s + c.modules.filter(m => m.Status__c === 'Completed').length, 0
  ) ?? 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/60 mb-1">Curriculum Studio — Program Structure</p>
          <h1 className="text-3xl font-bold text-foreground">Modules</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Module is the central connective node in the learning architecture. Each module links Learning Assets, Penny Assets,
            and Delivery Assets. Select a module to see its full relationship map in the Knowledge Brief.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('live')}
            className={`inline-flex items-center gap-1.5 text-[14px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${
              viewMode === 'live'
                ? 'bg-[#2F6B3F] text-white border-[#2F6B3F]'
                : 'border-border text-muted-foreground hover:border-[#2F6B3F]'
            }`}
          >
            <Zap className="w-3 h-3" /> Live from Salesforce
          </button>
          <button
            onClick={() => setViewMode('prototype')}
            className={`inline-flex items-center gap-1.5 text-[14px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${
              viewMode === 'prototype'
                ? 'bg-primary text-white border-primary'
                : 'border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            <BookOpen className="w-3 h-3" /> Architecture Model
          </button>
        </div>

        {/* ── LIVE VIEW ── */}
        {viewMode === 'live' && (
          <div className="space-y-4">
            {/* Live stats */}
            {lmsData && (
              <div className="flex gap-4 flex-wrap">
                <div className="rounded-lg border border-border bg-white px-4 py-2">
                  <span className="text-[14px] font-bold text-foreground">{liveTotal}</span>
                  <span className="text-[14px] text-muted-foreground ml-1.5">total modules</span>
                </div>
                <div className="rounded-lg border border-[#9FC3AE] bg-[#E6F0EA] px-4 py-2">
                  <span className="text-[14px] font-bold text-[#245531]">{liveCompleted}</span>
                  <span className="text-[14px] text-[#2F6B3F] ml-1.5">completed</span>
                </div>
                <div className="rounded-lg border border-border bg-white px-4 py-2">
                  <span className="text-[14px] font-bold text-foreground">{lmsData.courses.length}</span>
                  <span className="text-[14px] text-muted-foreground ml-1.5">courses in Salesforce</span>
                </div>
                {lmsData.fromCache && (
                  <div className="rounded-lg border border-border bg-muted/10 px-4 py-2 flex items-center">
                    <span className="text-[14px] text-muted-foreground">Cached · refreshes every 5 min</span>
                  </div>
                )}
              </div>
            )}

            {isLoading && (
              <div className="rounded-lg border border-border bg-muted/10 px-4 py-3 text-[14px] text-muted-foreground">
                Loading modules from Salesforce…
              </div>
            )}
            {isError && (
              <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] px-4 py-3 text-[14px] text-[#A93F2F]">
                Could not load Salesforce data. Check your Salesforce connection.
              </div>
            )}

            {lmsData?.courses.map(course => (
              <SfCourseBlock key={course.Id} course={course} />
            ))}

            {lmsData?.courses.length === 0 && (
              <div className="rounded-lg border border-border bg-muted/10 px-4 py-3 text-[14px] text-muted-foreground">
                No Course__c records found in Salesforce.
              </div>
            )}
          </div>
        )}

        {/* ── PROTOTYPE VIEW ── */}
        {viewMode === 'prototype' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="flex gap-4 flex-wrap">
              <div className="rounded-lg border border-border bg-white px-4 py-2">
                <span className="text-[14px] font-bold text-foreground">{totalModules}</span>
                <span className="text-[14px] text-muted-foreground ml-1.5">total modules</span>
              </div>
              <div className="rounded-lg border border-[#9FC3AE] bg-[#E6F0EA] px-4 py-2">
                <span className="text-[14px] font-bold text-[#245531]">{fullyConnected}</span>
                <span className="text-[14px] text-[#2F6B3F] ml-1.5">fully connected</span>
              </div>
              <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] px-4 py-2">
                <span className="text-[14px] font-bold text-[#A93F2F]">{curriculumHealthIssues.length}</span>
                <span className="text-[14px] text-[#A93F2F] ml-1.5">health issues</span>
              </div>
            </div>

            {/* Sprint filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSprintFilter('all')}
                className={`text-[14px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${sprintFilter === 'all' ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
              >
                All Sprints
              </button>
              {curriculumSprints.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSprintFilter(s.id)}
                  className={`text-[14px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${sprintFilter === s.id ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                >
                  Sprint {s.sprintNumber as number}
                </button>
              ))}
            </div>

            {/* Standards principle */}
            <div className="rounded-lg border border-[#7FAFC6] bg-[#EDF5F8]/40 px-4 py-3 text-[14px] text-[#2F6F7E]">
              <strong>Relationship Standard:</strong> A fully-connected module has all 6 asset types linked — Lessons, Assessment, Knowledge Articles, Coaching Prompts, Reflection Prompts, and Delivery Activities.
              The indicators below show coverage at a glance. <strong>Module 2.1 is the reference standard.</strong>
            </div>

            {/* Sprint groups */}
            {sprintGroups.map(({ sprint, modules }) => (
              <div key={sprint.id} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <p className="text-[14px] font-bold  text-muted-foreground/70 whitespace-nowrap">
                    {sprint.name} · {sprint.duration as string}
                  </p>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="grid gap-3">
                  {modules.map(m => {
                    const indicators = getRelHealth(m);
                    const allOk      = indicators.every(i => i.ok);
                    const issues     = issuesByModule(m.id);
                    const statusCfg  = CONTENT_STATUS_CONFIG[m.status];
                    const isFeatured = m.isFeatured as boolean;

                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedItem({ type: 'curriculumItem', id: m.id, data: m })}
                        className={`rounded-xl border-2 p-4 text-left transition-all hover:shadow-sm ${isFeatured ? 'border-primary/30 bg-primary/5' : 'border-border bg-white hover:border-primary/20'}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-bold text-muted-foreground/60 bg-border/50 rounded px-1.5 py-0.5 shrink-0">
                              {m.moduleNumber as string}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-[14px] font-bold text-foreground">{m.name}</p>
                                {isFeatured && (
                                  <span className="inline-flex items-center gap-0.5 text-[14px] font-bold text-primary border border-primary/20 bg-primary/5 rounded-full px-1.5 py-0.5">
                                    <Star className="w-2.5 h-2.5" /> STANDARD
                                  </span>
                                )}
                              </div>
                              <p className="text-[14px] text-muted-foreground">{m.program}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {indicators.map(ind => (
                            <span
                              key={ind.label}
                              className={`inline-flex items-center gap-1 text-[14px] font-medium rounded-full px-2 py-0.5 border ${
                                ind.ok
                                  ? 'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]'
                                  : 'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]'
                              }`}
                            >
                              {ind.ok
                                ? <CheckCircle2 className="w-2.5 h-2.5" />
                                : <AlertTriangle className="w-2.5 h-2.5" />
                              }
                              {ind.count > 0 ? `${ind.count} ` : ''}{ind.label}
                            </span>
                          ))}
                          {allOk && (
                            <span className="text-[14px] font-bold text-[#2F6B3F] border border-[#9FC3AE] bg-[#E6F0EA] rounded-full px-2 py-0.5">
                              ✓ Fully Connected
                            </span>
                          )}
                        </div>

                        {((m.learningObjectives as string[]) || []).length > 0 && (
                          <p className="text-[14px] text-muted-foreground">
                            {((m.learningObjectives as string[])).length} learning objective{((m.learningObjectives as string[])).length !== 1 ? 's' : ''} defined
                          </p>
                        )}

                        {issues.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {issues.map(issue => (
                              <div key={issue.id} className="flex items-center gap-1.5">
                                <AlertTriangle className={`w-3 h-3 shrink-0 ${issue.severity === 'high' ? 'text-[#A93F2F]' : issue.severity === 'medium' ? 'text-[#CC8400]' : 'text-[#CC8400]'}`} />
                                <p className="text-[14px] text-muted-foreground">{issue.name as string}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
