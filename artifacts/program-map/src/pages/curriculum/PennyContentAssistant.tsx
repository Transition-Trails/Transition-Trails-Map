import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  curriculumPrograms, curriculumSprints, curriculumModules,
  curriculumLessons, curriculumAssessments, curriculumKnowledgeArticles,
  curriculumCoachingPrompts,
  CONTENT_STATUS_CONFIG, type CurriculumItem,
} from '@/data/curriculumData';
import {
  pennyContentActions, ACTIONS_BY_OBJECT_TYPE, ACTION_CATEGORY_CONFIG,
  type PennyContentAction,
} from '@/data/pennyContentActions';
import { Sparkles, ArrowRight, Layers, BookOpen, CheckCircle2, MessageCircle, Star, Info } from 'lucide-react';

type ObjectTypeSel = 'program' | 'sprint' | 'module' | 'lesson' | 'assessment' | 'knowledgeArticle' | 'coachingPrompt';

const TYPE_CONFIG: { id: ObjectTypeSel; label: string; icon: React.ElementType; data: CurriculumItem[] }[] = [
  { id: 'program',          label: 'Program',          icon: Star,         data: curriculumPrograms },
  { id: 'sprint',           label: 'Sprint',           icon: Layers,       data: curriculumSprints },
  { id: 'module',           label: 'Module',           icon: BookOpen,     data: curriculumModules },
  { id: 'lesson',           label: 'Lesson',           icon: BookOpen,     data: curriculumLessons },
  { id: 'assessment',       label: 'Assessment',       icon: CheckCircle2, data: curriculumAssessments },
  { id: 'knowledgeArticle', label: 'KB Article',       icon: BookOpen,     data: curriculumKnowledgeArticles },
  { id: 'coachingPrompt',   label: 'Coaching Prompt',  icon: MessageCircle,data: curriculumCoachingPrompts },
];

export default function PennyContentAssistant() {
  const { setSelectedItem } = useAppContext();
  const [, setLocation] = useLocation();

  const [selectedType, setSelectedType] = useState<ObjectTypeSel>('module');
  const [selectedObjectId, setSelectedObjectId] = useState<string>('mod-2-1');

  const currentTypeCfg = TYPE_CONFIG.find(t => t.id === selectedType)!;
  const currentObjects = currentTypeCfg.data;
  const selectedObject = currentObjects.find(o => o.id === selectedObjectId) || currentObjects[0];

  const actionIds = ACTIONS_BY_OBJECT_TYPE[selectedType] || ACTIONS_BY_OBJECT_TYPE['module'];
  const applicableActions = pennyContentActions.filter(a => actionIds.includes(a.id));
  const otherActions = pennyContentActions.filter(a => !actionIds.includes(a.id));

  function handleActionClick(action: PennyContentAction) {
    setSelectedItem({ type: 'pennyAction', id: action.id, data: action });
  }

  function handleObjectSelect(obj: CurriculumItem) {
    setSelectedObjectId(obj.id);
    setSelectedItem({ type: 'curriculumItem', id: obj.id, data: obj });
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-6xl space-y-6">

        {/* Header */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio — Penny Content Assistant</p>
          <h1 className="text-3xl font-bold text-foreground">Content Workshop</h1>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl">
            Penny as <strong>curriculum architect and content co-author</strong> for Transition Trails staff.
            Select a learning object, then choose a generation action. Penny generates standards-aligned content
            ready for review and integration into the learning architecture.
          </p>
        </div>

        {/* How it works */}
        <div className="rounded-lg border border-secondary/20 bg-secondary/5 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-secondary" />
            <p className="text-[12px] font-bold text-foreground">How Penny Content Assistant works</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { step: '1', label: 'Select an Object', desc: 'Choose a Program, Sprint, Module, Lesson, or other learning object as the context for content generation.' },
              { step: '2', label: 'Choose an Action', desc: 'Pick a generation action — Penny will draft content aligned to your selected object and the learning architecture standards.' },
              { step: '3', label: 'Review & Integrate', desc: 'Penny\'s output is a starting draft — staff review, edit, and link it back into the learning architecture.' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-secondary text-white text-[10px] font-bold flex items-center justify-center shrink-0">{item.step}</span>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main workspace — 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Left: Object Selector */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">1 — Select Object Type</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_CONFIG.map(tc => (
                <button
                  key={tc.id}
                  onClick={() => { setSelectedType(tc.id); setSelectedObjectId(tc.data[0]?.id || ''); }}
                  className={`text-[11px] font-semibold rounded-full px-3 py-1 border transition-colors ${selectedType === tc.id ? 'bg-secondary text-white border-secondary' : 'border-border text-muted-foreground hover:border-secondary/40'}`}
                >
                  {tc.label}
                </button>
              ))}
            </div>

            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-3">2 — Select Object</p>
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {currentObjects.map(obj => {
                const statusCfg = CONTENT_STATUS_CONFIG[obj.status];
                const isSelected = obj.id === selectedObject?.id;
                const isMod21 = obj.id === 'mod-2-1';
                return (
                  <button
                    key={obj.id}
                    onClick={() => handleObjectSelect(obj)}
                    className={`w-full rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-secondary bg-secondary/10 shadow-sm'
                        : 'border-border bg-white hover:border-secondary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {isMod21 && <span className="text-secondary mr-1">★</span>}
                        {obj.name}
                      </p>
                      <span className={`text-[9px] font-semibold border rounded-full px-1.5 py-0.5 shrink-0 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    </div>
                    {isMod21 && <p className="text-[9px] text-secondary font-semibold mt-0.5">Standards reference example</p>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Actions Panel */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">3 — Available Actions</p>
              {selectedObject && (
                <span className="text-[10px] text-secondary font-medium border border-secondary/20 bg-secondary/5 rounded-full px-2 py-0.5">
                  for {selectedObject.name as string}
                </span>
              )}
            </div>

            {/* Primary (context-aware) actions */}
            <div className="space-y-2">
              {applicableActions.map(action => {
                const catCfg = ACTION_CATEGORY_CONFIG[action.category];
                return (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all hover:shadow-sm ${catCfg.border} ${catCfg.bg}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[13px] font-bold text-foreground">{action.name}</p>
                          <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${catCfg.chip}`}>{action.category}</span>
                          <span className="text-[9px] font-bold border border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400] rounded-full px-1.5 py-0.5">Prototype</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{action.contextSentence}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {action.generates.slice(0, 3).map(g => (
                            <span key={g.label} className="text-[9px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{g.label}</span>
                          ))}
                          {action.generates.length > 3 && (
                            <span className="text-[9px] text-muted-foreground border border-border rounded-full px-2 py-0.5">+{action.generates.length - 3} more</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">{action.estimatedTime}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Other available actions (dimmed) */}
            {otherActions.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-2">Also available (select a different object type to use)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {otherActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleActionClick(action)}
                      className="rounded-lg border border-border/50 bg-white/50 p-2.5 text-left hover:border-border transition-all opacity-70 hover:opacity-100"
                    >
                      <p className="text-[11px] font-semibold text-foreground/70">{action.shortName}</p>
                      <p className="text-[10px] text-muted-foreground/60">{action.category}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sample output callout */}
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-primary" />
                <p className="text-[14px] font-bold text-foreground">Sample Generated Output — Module 2.1: Data Modeling & Schema Design</p>
              </div>
              <p className="text-[12px] text-muted-foreground">
                This is what Penny generates when "Generate Module Outline" + 6 supporting actions are run on Module 2.1.
                Full output includes learning objectives, lesson structure, assessment alignment, knowledge articles, coach notes, Slack activities, and calendar events.
              </p>
            </div>
            <button
              onClick={() => setLocation('/curriculum/generated-outputs')}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-primary border border-primary/20 bg-white rounded-full px-3 py-1.5 hover:bg-primary/10 transition-colors whitespace-nowrap shrink-0"
            >
              View Output <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: '4 Learning Objectives', desc: 'Measurable, verb-first' },
              { label: '3 Lesson Structures', desc: 'With knowledge checks' },
              { label: 'Assessment Alignment', desc: '4 question areas mapped' },
              { label: 'Coach Notes', desc: 'Misconceptions + starters' },
            ].map(item => (
              <div key={item.label} className="rounded-lg border border-primary/20 bg-white px-3 py-2">
                <p className="text-[11px] font-semibold text-primary">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pb-4">
          {[
            { label: 'Action Library', path: '/curriculum/penny-actions', desc: 'All 11 prototype actions' },
            { label: 'Generated Outputs', path: '/curriculum/generated-outputs', desc: 'Module 2.1 full sample' },
            { label: 'Consistency Review', path: '/curriculum/consistency-review', desc: 'Gap analysis by program' },
            { label: 'Modules', path: '/curriculum/modules', desc: 'Relationship health map' },
            { label: 'Content Health', path: '/curriculum/content-health', desc: 'Issues to fix' },
            { label: 'Overview', path: '/curriculum/overview', desc: 'Architecture guide' },
          ].map(link => (
            <button key={link.path} onClick={() => setLocation(link.path)} className="rounded-lg border border-border bg-white px-4 py-3 text-left hover:border-secondary/30 hover:bg-secondary/5 transition-colors">
              <p className="text-[12px] font-semibold text-foreground">{link.label}</p>
              <p className="text-[10px] text-muted-foreground">{link.desc}</p>
            </button>
          ))}
        </div>

      </div>
    </ScrollArea>
  );
}
