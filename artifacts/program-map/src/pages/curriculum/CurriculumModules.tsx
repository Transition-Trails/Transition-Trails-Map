import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumModules, curriculumSprints, curriculumHealthIssues, CONTENT_STATUS_CONFIG, type CurriculumItem } from '@/data/curriculumData';
import { CheckCircle2, AlertTriangle, ArrowRight, Star } from 'lucide-react';

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

export default function CurriculumModules() {
  const { setSelectedItem } = useAppContext();
  const [sprintFilter, setSprintFilter] = useState<string>('all');

  const filteredModules = sprintFilter === 'all'
    ? curriculumModules
    : curriculumModules.filter(m => m.sprintId === sprintFilter);

  const sprintGroups = curriculumSprints.map(sprint => ({
    sprint,
    modules: filteredModules.filter(m => m.sprintId === sprint.id),
  })).filter(g => g.modules.length > 0);

  const issuesByModule = (moduleId: string) =>
    curriculumHealthIssues.filter(h => h.affectedObjectId === moduleId);

  const totalModules = curriculumModules.length;
  const fullyConnected = curriculumModules.filter(m => getRelHealth(m).every(r => r.ok)).length;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio — Program Structure</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Modules</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Module is the central connective node in the learning architecture. Each module links Learning Assets, Penny Assets,
            and Delivery Assets. Select a module to see its full relationship map in the Knowledge Brief.
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-4 flex-wrap">
          <div className="rounded-lg border border-border bg-white px-4 py-2">
            <span className="text-[14px] font-bold text-foreground">{totalModules}</span>
            <span className="text-[11px] text-muted-foreground ml-1.5">total modules</span>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2">
            <span className="text-[14px] font-bold text-green-800">{fullyConnected}</span>
            <span className="text-[11px] text-green-700 ml-1.5">fully connected</span>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2">
            <span className="text-[14px] font-bold text-red-800">{curriculumHealthIssues.length}</span>
            <span className="text-[11px] text-red-700 ml-1.5">health issues</span>
          </div>
        </div>

        {/* Sprint filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSprintFilter('all')}
            className={`text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${sprintFilter === 'all' ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
          >
            All Sprints
          </button>
          {curriculumSprints.map(s => (
            <button
              key={s.id}
              onClick={() => setSprintFilter(s.id)}
              className={`text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${sprintFilter === s.id ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
            >
              Sprint {s.sprintNumber as number}
            </button>
          ))}
        </div>

        {/* Standards principle */}
        <div className="rounded-lg border border-sky-200 bg-sky-50/40 px-4 py-3 text-[12px] text-sky-800">
          <strong>Relationship Standard:</strong> A fully-connected module has all 6 asset types linked — Lessons, Assessment, Knowledge Articles, Coaching Prompts, Reflection Prompts, and Delivery Activities.
          The indicators below show coverage at a glance. <strong>Module 2.1 is the reference standard.</strong>
        </div>

        {/* Sprint groups */}
        {sprintGroups.map(({ sprint, modules }) => (
          <div key={sprint.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 whitespace-nowrap">
                {sprint.name} · {sprint.duration as string}
              </p>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid gap-3">
              {modules.map(m => {
                const indicators = getRelHealth(m);
                const allOk = indicators.every(i => i.ok);
                const issues = issuesByModule(m.id);
                const statusCfg = CONTENT_STATUS_CONFIG[m.status];
                const isFeatured = m.isFeatured as boolean;

                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedItem({ type: 'curriculumItem', id: m.id, data: m })}
                    className={`rounded-xl border-2 p-4 text-left transition-all hover:shadow-sm ${isFeatured ? 'border-primary/30 bg-primary/5' : 'border-border bg-white hover:border-primary/20'}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-muted-foreground/60 bg-border/50 rounded px-1.5 py-0.5 shrink-0">
                          {m.moduleNumber as string}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[14px] font-bold text-foreground">{m.name}</p>
                            {isFeatured && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary border border-primary/20 bg-primary/5 rounded-full px-1.5 py-0.5">
                                <Star className="w-2.5 h-2.5" /> STANDARD
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{m.program}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Relationship health indicators */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {indicators.map(ind => (
                        <span
                          key={ind.label}
                          className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 border ${
                            ind.ok
                              ? 'bg-green-50 text-green-800 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
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
                        <span className="text-[10px] font-bold text-green-700 border border-green-200 bg-green-50 rounded-full px-2 py-0.5">
                          ✓ Fully Connected
                        </span>
                      )}
                    </div>

                    {/* Learning objectives count */}
                    {((m.learningObjectives as string[]) || []).length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        {((m.learningObjectives as string[])).length} learning objective{((m.learningObjectives as string[])).length !== 1 ? 's' : ''} defined
                      </p>
                    )}

                    {/* Health issues */}
                    {issues.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {issues.map(issue => (
                          <div key={issue.id} className="flex items-center gap-1.5">
                            <AlertTriangle className={`w-3 h-3 shrink-0 ${issue.severity === 'high' ? 'text-red-500' : issue.severity === 'medium' ? 'text-orange-500' : 'text-amber-500'}`} />
                            <p className="text-[10px] text-muted-foreground">{issue.name as string}</p>
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
    </ScrollArea>
  );
}
