import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { module21GeneratedOutput, pennyContentActions } from '@/data/pennyContentActions';
import { Sparkles, BookOpen, CheckCircle2, MessageCircle, Calendar, Users, ArrowRight } from 'lucide-react';

const SECTION_TABS = [
  { id: 'objectives',   label: 'Objectives',   icon: '🎯' },
  { id: 'lessons',      label: 'Lessons',       icon: '📚' },
  { id: 'assessment',   label: 'Assessment',    icon: '📝' },
  { id: 'articles',     label: 'KB Articles',   icon: '📖' },
  { id: 'coach',        label: 'Coach Notes',   icon: '👩‍🏫' },
  { id: 'reflection',   label: 'Reflection',    icon: '💭' },
  { id: 'slack',        label: 'Slack',         icon: '💬' },
  { id: 'calendar',     label: 'Calendar',      icon: '📅' },
];

export default function PennyGeneratedOutputs() {
  const { setSelectedItem } = useAppContext();
  const [activeSection, setActiveSection] = useState('objectives');
  const output = module21GeneratedOutput;

  function showAction(actionId: string) {
    const action = pennyContentActions.find(a => a.id === actionId);
    if (action) setSelectedItem({ type: 'pennyAction', id: action.id, data: action });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Compact header */}
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-0">
        {/* Row 1: title + module chip */}
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <h1 className="text-[14px] font-semibold text-foreground">Generated Outputs</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] font-medium text-primary border border-primary/20 bg-primary/5 rounded-full px-2 py-0.5">
            ★ {output.moduleName}
          </span>
        </div>
        {/* Row 2: section tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {SECTION_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`text-[12px] font-semibold px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                activeSection === tab.id
                  ? 'border-secondary text-secondary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4">
          {/* Module context */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[12px] font-bold text-primary border border-primary/20 bg-white rounded-full px-2 py-0.5">★ Standards Reference</span>
              <span className="text-[12px] text-muted-foreground">{output.generatedAt}</span>
            </div>
            <p className="text-[14px] font-bold text-foreground mb-1">{output.moduleName}</p>
            <p className="text-[12px] text-muted-foreground mb-3">{output.program} · {output.sprint}</p>
            <div className="flex flex-wrap gap-1.5">
              {output.generatedBy.map(actionId => {
                const action = pennyContentActions.find(a => a.id === actionId);
                return action ? (
                  <button
                    key={actionId}
                    onClick={() => showAction(actionId)}
                    className="text-[12px] font-medium border border-secondary/20 bg-secondary/10 text-secondary rounded-full px-2 py-0.5 hover:bg-secondary/20 transition-colors"
                  >
                    {action.shortName} →
                  </button>
                ) : null;
              })}
            </div>
          </div>

          {/* Section content */}
          <div className="rounded-xl border border-border bg-white p-5">

            {activeSection === 'objectives' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🎯</span>
                  <p className="text-[14px] font-bold text-foreground">Learning Objectives ({output.objectives.length})</p>
                  <button onClick={() => showAction('generate-module-outline')} className="ml-auto text-[14px] text-secondary font-medium hover:underline flex items-center gap-1">Generate Module Outline <ArrowRight className="w-3 h-3" /></button>
                </div>
                <p className="text-[14px] text-muted-foreground italic mb-3">All objectives are measurable and verb-first, aligned to Bloom's Taxonomy. Each maps to at least one lesson and one assessment question area.</p>
                <div className="space-y-3">
                  {output.objectives.map((obj, i) => (
                    <div key={i} className="rounded-lg border border-border bg-primary/5 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full bg-primary text-white text-[14px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="text-[14px] font-bold text-primary/60 border border-primary/20 rounded-full px-1.5 py-0.5">{obj.level}</span>
                        <span className="text-[14px] font-medium text-primary/70">Verb: {obj.verb}</span>
                      </div>
                      <p className="text-[14px] font-semibold text-foreground">{obj.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'lessons' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📚</span>
                  <p className="text-[14px] font-bold text-foreground">Lesson Structure ({output.lessonStructure.length} lessons)</p>
                  <button onClick={() => showAction('create-lesson')} className="ml-auto text-[14px] text-secondary font-medium hover:underline flex items-center gap-1">Create Lesson <ArrowRight className="w-3 h-3" /></button>
                </div>
                <div className="space-y-4">
                  {output.lessonStructure.map((lesson, i) => (
                    <div key={i} className="rounded-xl border border-[#FFD08A] bg-[#FFF3E0]/30 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px] font-bold text-[#CC8400] border border-[#FFD08A] bg-white rounded px-1.5 py-0.5">{lesson.type}</span>
                        <span className="text-[14px] text-muted-foreground">{lesson.duration}</span>
                      </div>
                      <p className="text-[14px] font-bold text-foreground mb-1">{lesson.title}</p>
                      <p className="text-[14px] text-muted-foreground mb-3"><strong>Objective:</strong> {lesson.objective}</p>
                      <div className="space-y-1">
                        <p className="text-[14px] font-bold text-muted-foreground/60">Knowledge Checks</p>
                        {lesson.knowledgeChecks.map((kc, j) => (
                          <div key={j} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-[#CC8400] mt-0.5 shrink-0" />
                            <p className="text-[14px] text-foreground/80 italic">"{kc}"</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 rounded bg-[#EDF5F8] border border-[#EDF5F8] px-3 py-2">
                        <p className="text-[14px] font-bold text-[#2F6F7E] mb-0.5">REFLECTION PROMPT</p>
                        <p className="text-[14px] text-foreground/80 italic">"{lesson.reflectionPrompt}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'assessment' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📝</span>
                  <p className="text-[14px] font-bold text-foreground">Assessment Alignment</p>
                  <button onClick={() => showAction('create-assessment-support')} className="ml-auto text-[14px] text-secondary font-medium hover:underline flex items-center gap-1">Create Assessment <ArrowRight className="w-3 h-3" /></button>
                </div>
                <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6]/30 p-4 mb-4">
                  <p className="text-[14px] font-bold text-foreground">{output.assessmentAlignment.title}</p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <div><p className="text-[14px] font-bold text-foreground">{output.assessmentAlignment.questionCount}</p><p className="text-[14px] text-muted-foreground">Questions</p></div>
                    <div><p className="text-[14px] font-bold text-foreground">{output.assessmentAlignment.passingScore}%</p><p className="text-[14px] text-muted-foreground">Passing Score</p></div>
                    <div><p className="text-[14px] font-bold text-foreground">{output.assessmentAlignment.type}</p><p className="text-[14px] text-muted-foreground">Type</p></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[14px] font-bold text-muted-foreground/60">Question Areas (mapped to objectives)</p>
                  {output.assessmentAlignment.questionAreas.map((area, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-2.5">
                      <span className="text-[14px] font-bold text-foreground w-6 text-center">{area.count}</span>
                      <div>
                        <p className="text-[14px] font-semibold text-foreground">{area.area}</p>
                        <p className="text-[14px] text-muted-foreground">{area.objectives.join('; ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 mt-3">
                  <p className="text-[14px] font-bold text-muted-foreground/60">Sample Questions</p>
                  {output.assessmentAlignment.sampleQuestions.map((q, i) => (
                    <div key={i} className="rounded-lg border border-border bg-slate-50 px-4 py-3">
                      <p className="text-[14px] text-foreground italic">"{q}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'articles' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📖</span>
                  <p className="text-[14px] font-bold text-foreground">Knowledge Article Recommendations</p>
                  <button onClick={() => showAction('create-knowledge-article')} className="ml-auto text-[14px] text-secondary font-medium hover:underline flex items-center gap-1">Create KB Article <ArrowRight className="w-3 h-3" /></button>
                </div>
                <div className="space-y-4">
                  {output.knowledgeArticles.map((article, i) => (
                    <div key={i} className="rounded-xl border border-[#7FAFC6] bg-[#EDF5F8]/30 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px] font-bold text-[#2F6F7E] border border-[#7FAFC6] bg-white rounded-full px-2 py-0.5">{article.type}</span>
                      </div>
                      <p className="text-[14px] font-bold text-foreground mb-2">{article.title}</p>
                      <p className="text-[14px] font-bold text-muted-foreground/60 mb-1">Key Topics to Cover</p>
                      <div className="flex flex-wrap gap-1">
                        {article.keyTopics.map(topic => (
                          <span key={topic} className="text-[14px] font-medium border border-[#7FAFC6] bg-white rounded-full px-2 py-0.5 text-[#2F6F7E]">{topic}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'coach' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">👩‍🏫</span>
                  <p className="text-[14px] font-bold text-foreground">Coach Notes</p>
                  <button onClick={() => showAction('create-coach-notes')} className="ml-auto text-[14px] text-secondary font-medium hover:underline flex items-center gap-1">Create Coach Notes <ArrowRight className="w-3 h-3" /></button>
                </div>
                <div className="rounded-lg border border-border bg-slate-50 p-4 mb-4">
                  <p className="text-[14px] font-bold text-muted-foreground/60 mb-1">Facilitator Intent Summary</p>
                  <p className="text-[14px] text-foreground leading-relaxed">{output.coachNotes.intentSummary}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[14px] font-bold text-muted-foreground/60">Common Misconceptions</p>
                  {output.coachNotes.commonMisconceptions.map((item, i) => (
                    <div key={i} className="rounded-lg border border-border bg-white p-3">
                      <p className="text-[14px] font-semibold text-foreground mb-1">❌ "{item.misconception}"</p>
                      <p className="text-[14px] text-muted-foreground"><strong>Coach response:</strong> {item.response}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1 mt-3">
                  <p className="text-[14px] font-bold text-muted-foreground/60">Conversation Starters</p>
                  {output.coachNotes.conversationStarters.map((q, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Users className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-[14px] text-foreground/80 italic">"{q}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'reflection' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💭</span>
                  <p className="text-[14px] font-bold text-foreground">Reflection Prompts ({output.reflectionPrompts.length})</p>
                  <button onClick={() => showAction('create-reflection-prompt')} className="ml-auto text-[14px] text-secondary font-medium hover:underline flex items-center gap-1">Create Reflection Prompt <ArrowRight className="w-3 h-3" /></button>
                </div>
                <div className="space-y-4">
                  {output.reflectionPrompts.map((rp, i) => (
                    <div key={i} className="rounded-xl border border-[#7FAFC6] bg-[#EDF5F8]/30 p-4">
                      <p className="text-[14px] font-bold text-[#2F6F7E] mb-2">After: {rp.lessonTitle}</p>
                      <p className="text-[14px] text-foreground leading-relaxed mb-3">"{rp.prompt}"</p>
                      <div className="rounded bg-[#EDF5F8] px-3 py-2">
                        <p className="text-[14px] font-bold text-[#2F6F7E] mb-0.5">JOURNAL ANCHOR</p>
                        <p className="text-[14px] text-[#2F6F7E]">{rp.journalAnchor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'slack' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💬</span>
                  <p className="text-[14px] font-bold text-foreground">Slack Activities ({output.slackActivities.length})</p>
                  <button onClick={() => showAction('create-slack-activity')} className="ml-auto text-[14px] text-secondary font-medium hover:underline flex items-center gap-1">Create Slack Activity <ArrowRight className="w-3 h-3" /></button>
                </div>
                <div className="space-y-4">
                  {output.slackActivities.map((activity, i) => (
                    <div key={i} className="rounded-xl border border-[#9FC3AE] bg-[#E6F0EA]/30 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px] font-bold text-[#2F6B3F] border border-[#9FC3AE] bg-white rounded-full px-2 py-0.5">{activity.type}</span>
                        <span className="text-[14px] text-muted-foreground">{activity.timing}</span>
                      </div>
                      <p className="text-[14px] font-bold text-foreground mb-3">{activity.title}</p>
                      <div className="rounded-lg bg-gray-900 text-white p-3 mb-3 font-mono">
                        <p className="text-[14px] text-gray-400 mb-1">#ft-cohort-1 · Penny</p>
                        <p className="text-[14px] leading-relaxed whitespace-pre-line">{activity.message}</p>
                      </div>
                      <div className="rounded bg-[#E6F0EA] px-3 py-2">
                        <p className="text-[14px] font-bold text-[#2F6B3F] mb-0.5">ENGAGEMENT PROMPT</p>
                        <p className="text-[14px] text-[#245531] whitespace-pre-line">{activity.engagementPrompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'calendar' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📅</span>
                  <p className="text-[14px] font-bold text-foreground">Calendar Events ({output.calendarEvents.length})</p>
                  <button onClick={() => showAction('create-calendar-reminder')} className="ml-auto text-[14px] text-secondary font-medium hover:underline flex items-center gap-1">Create Calendar Reminder <ArrowRight className="w-3 h-3" /></button>
                </div>
                <div className="space-y-4">
                  {output.calendarEvents.map((event, i) => (
                    <div key={i} className="rounded-xl border border-[#FFD08A] bg-[#FFF3E0]/30 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px] font-bold text-[#CC8400] border border-[#FFD08A] bg-white rounded-full px-2 py-0.5">{event.type}</span>
                        <span className="text-[14px] text-muted-foreground">{event.timing}</span>
                      </div>
                      <p className="text-[14px] font-bold text-foreground mb-2">{event.title}</p>
                      <p className="text-[14px] text-muted-foreground mb-2">{event.description}</p>
                      <p className="text-[14px] text-muted-foreground mb-3"><strong>Attendees:</strong> {event.attendees}</p>
                      <div className="rounded bg-[#FFF3E0] px-3 py-2">
                        <p className="text-[14px] font-bold text-[#CC8400] mb-0.5">PENNY REMINDER MESSAGE</p>
                        <p className="text-[14px] text-[#CC8400] italic">"{event.pennyReminder}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
