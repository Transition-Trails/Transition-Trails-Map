import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import { useSfLmsCourses, type SfLmsCourse, type SfCourseModule } from '@/hooks/useSfCurriculum';
import { curriculumPrograms } from '@/data/curriculumData';
import { contentStandards } from '@/data/standardsData';
import StandardsStudio from '@/pages/curriculum/StandardsStudio';
import {
  Hammer, ShieldCheck, ChevronRight, ChevronDown, BookOpen,
  Target, Brain, Zap, Sparkles, CheckCircle2, AlertCircle,
  Circle, Save, Send, Eye, BarChart2, FileCheck,
  GraduationCap, X, RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

type HubMode = 'builder' | 'governance';
type GovernanceTab = 'scorecard' | 'skills' | 'compliance' | 'standards';
type NodeStatus = 'draft' | 'published' | 'review';

type SelectedNode =
  | { kind: 'course'; id: string; name: string; title: string | null; status: string | null }
  | { kind: 'module'; id: string; name: string; courseId: string; courseName: string };

interface ContentSection {
  key: string;
  label: string;
  placeholder: string;
  requiredBy: string;
  minLength: number;
}

// ── Seed data for governance views ───────────────────────────────────────────

const SCORECARD_STANDARDS = [
  { id: 'std-program-blueprint', short: 'Blueprint' },
  { id: 'std-module',            short: 'Modules'   },
  { id: 'std-lesson',            short: 'Lessons'   },
  { id: 'std-assessment',        short: 'Assessments' },
  { id: 'std-knowledge-article', short: 'KB Articles' },
  { id: 'std-reflection-prompt', short: 'Reflections' },
];

type CellGrade = 'pass' | 'partial' | 'fail' | 'na';

const SCORECARD_SEED: Record<string, Record<string, CellGrade>> = {
  'prog-foundations': {
    'std-program-blueprint': 'pass',    'std-module': 'pass',
    'std-lesson': 'partial',            'std-assessment': 'pass',
    'std-knowledge-article': 'partial', 'std-reflection-prompt': 'pass',
  },
  'prog-guided': {
    'std-program-blueprint': 'partial', 'std-module': 'pass',
    'std-lesson': 'partial',            'std-assessment': 'partial',
    'std-knowledge-article': 'fail',    'std-reflection-prompt': 'partial',
  },
  'prog-explorers': {
    'std-program-blueprint': 'partial', 'std-module': 'partial',
    'std-lesson': 'fail',              'std-assessment': 'fail',
    'std-knowledge-article': 'fail',   'std-reflection-prompt': 'fail',
  },
  'prog-compass': {
    'std-program-blueprint': 'fail',   'std-module': 'partial',
    'std-lesson': 'na',               'std-assessment': 'na',
    'std-knowledge-article': 'na',    'std-reflection-prompt': 'fail',
  },
  'prog-mastery': {
    'std-program-blueprint': 'na',     'std-module': 'na',
    'std-lesson': 'na',               'std-assessment': 'na',
    'std-knowledge-article': 'na',    'std-reflection-prompt': 'na',
  },
};

const SKILLS = [
  'Salesforce Navigation',  'Data Modeling',         'Automation & Flows',
  'Reports & Dashboards',   'Security & Access',      'Penny Coaching Design',
  'Reflection Facilitation','Assessment Design',      'Career Positioning',
  'Knowledge Management',
];

type CourseName = string;
const SKILLS_SEED: Record<string, Record<CourseName, boolean>> = {
  'Salesforce Navigation':   { 'Foundations Trail': true,  'Guided Trail': true,  "Explorer's Trail": true,  'Digital Compass': false, 'Trail of Mastery': false },
  'Data Modeling':           { 'Foundations Trail': true,  'Guided Trail': true,  "Explorer's Trail": false, 'Digital Compass': false, 'Trail of Mastery': true  },
  'Automation & Flows':      { 'Foundations Trail': true,  'Guided Trail': false, "Explorer's Trail": false, 'Digital Compass': false, 'Trail of Mastery': true  },
  'Reports & Dashboards':    { 'Foundations Trail': true,  'Guided Trail': true,  "Explorer's Trail": false, 'Digital Compass': true,  'Trail of Mastery': true  },
  'Security & Access':       { 'Foundations Trail': true,  'Guided Trail': false, "Explorer's Trail": false, 'Digital Compass': false, 'Trail of Mastery': true  },
  'Penny Coaching Design':   { 'Foundations Trail': true,  'Guided Trail': true,  "Explorer's Trail": true,  'Digital Compass': true,  'Trail of Mastery': false },
  'Reflection Facilitation': { 'Foundations Trail': true,  'Guided Trail': true,  "Explorer's Trail": true,  'Digital Compass': false, 'Trail of Mastery': false },
  'Assessment Design':       { 'Foundations Trail': true,  'Guided Trail': true,  "Explorer's Trail": false, 'Digital Compass': false, 'Trail of Mastery': true  },
  'Career Positioning':      { 'Foundations Trail': true,  'Guided Trail': true,  "Explorer's Trail": false, 'Digital Compass': true,  'Trail of Mastery': false },
  'Knowledge Management':    { 'Foundations Trail': false, 'Guided Trail': false, "Explorer's Trail": false, 'Digital Compass': false, 'Trail of Mastery': false },
};

const COMPLIANCE_DIMS: { key: string; label: string }[] = [
  { key: 'cohorts',    label: 'Cohort Coverage'   },
  { key: 'sprints',    label: 'Sprint Structure'   },
  { key: 'modules',    label: 'Module Types'       },
  { key: 'penny',      label: 'Penny Capability'   },
  { key: 'salesforce', label: 'Salesforce Mapping' },
  { key: 'drive',      label: 'Drive Assets'       },
];

type TrafficLight = 'green' | 'amber' | 'red';
const COMPLIANCE_SEED: Record<string, Record<string, TrafficLight>> = {
  'prog-foundations': { cohorts: 'green', sprints: 'green', modules: 'green',  penny: 'green', salesforce: 'green', drive: 'amber' },
  'prog-guided':      { cohorts: 'green', sprints: 'green', modules: 'amber',  penny: 'amber', salesforce: 'amber', drive: 'red'   },
  'prog-explorers':   { cohorts: 'amber', sprints: 'amber', modules: 'red',    penny: 'red',   salesforce: 'amber', drive: 'red'   },
  'prog-compass':     { cohorts: 'amber', sprints: 'red',   modules: 'red',    penny: 'red',   salesforce: 'red',   drive: 'red'   },
  'prog-mastery':     { cohorts: 'red',   sprints: 'red',   modules: 'red',    penny: 'red',   salesforce: 'red',   drive: 'red'   },
};

// ── Content sections for the builder editor ───────────────────────────────────

const BUILDER_SECTIONS: ContentSection[] = [
  {
    key: 'overview',
    label: 'Overview',
    placeholder: 'What is this course / module about? Write 1–2 sentences describing what learners will accomplish...',
    requiredBy: 'Program Blueprint',
    minLength: 40,
  },
  {
    key: 'objectives',
    label: 'Learning Objectives',
    placeholder: 'List 2–3 measurable objectives using action verbs (e.g. "Configure a custom Salesforce object with 3 required fields")...',
    requiredBy: 'Module Standard',
    minLength: 60,
  },
  {
    key: 'concepts',
    label: 'Key Concepts',
    placeholder: 'What are the core concepts or topics covered? Include any Salesforce-specific terminology learners should know...',
    requiredBy: 'Lesson Standard',
    minLength: 50,
  },
  {
    key: 'activities',
    label: 'Activities & Exercises',
    placeholder: 'Describe the active learning tasks learners must complete. Each activity should require learners to do something — not just read...',
    requiredBy: 'Lesson Standard',
    minLength: 50,
  },
  {
    key: 'assessments',
    label: 'Assessment Prompts',
    placeholder: 'What questions or tasks will assess whether learners achieved the objectives? Include the passing threshold...',
    requiredBy: 'Assessment Standard',
    minLength: 50,
  },
  {
    key: 'penny',
    label: `${TERMS.aiAssistant} Reflection Prompts`,
    placeholder: `Write an open-ended reflection question ${TERMS.aiAssistant} will deliver after this content. It should reference the module theme and cannot be answered yes/no...`,
    requiredBy: 'Penny Assets Standard',
    minLength: 60,
  },
];

// ── localStorage keys ─────────────────────────────────────────────────────────

const LS_CONTENT  = 'trailos:programBuilderContent';
const LS_STATUSES = 'trailos:programBuilderStatuses';
const LS_MODE     = 'trailos:programsHubMode';

function lsRead<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}
function lsWrite(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sectionStatus(value: string, minLength: number): 'pass' | 'review' | 'missing' {
  if (!value.trim()) return 'missing';
  if (value.trim().length < minLength) return 'review';
  return 'pass';
}

function statusBadge(s: 'pass' | 'review' | 'missing') {
  if (s === 'pass')   return <span className="flex items-center gap-1 text-[11px] font-semibold text-[#245531] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2 py-0.5"><CheckCircle2 className="w-3 h-3" />Meets standard</span>;
  if (s === 'review') return <span className="flex items-center gap-1 text-[11px] font-semibold text-[#CC8400] bg-[#FFF3E0] border border-[#FFD08A] rounded-full px-2 py-0.5"><AlertCircle className="w-3 h-3" />Review needed</span>;
  return <span className="flex items-center gap-1 text-[11px] font-semibold text-[#A93F2F] bg-[#FBEAE6] border border-[#E8B9B4] rounded-full px-2 py-0.5"><Circle className="w-3 h-3" />Missing</span>;
}

function nodeStatusBadge(s: NodeStatus) {
  if (s === 'published') return <span className="text-[11px] font-bold text-[#245531] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2 py-0.5">Published</span>;
  if (s === 'review')    return <span className="text-[11px] font-bold text-[#2F6F7E] bg-[#EDF5F8] border border-[#7FAFC6] rounded-full px-2 py-0.5">In review</span>;
  return <span className="text-[11px] font-bold text-[#CC8400] bg-[#FFF3E0] border border-[#FFD08A] rounded-full px-2 py-0.5">Draft</span>;
}

function cellGradeStyle(g: CellGrade): string {
  if (g === 'pass')    return 'bg-[#E6F0EA] text-[#245531]';
  if (g === 'partial') return 'bg-[#FFF3E0] text-[#CC8400]';
  if (g === 'fail')    return 'bg-[#FBEAE6] text-[#A93F2F]';
  return 'bg-slate-50 text-slate-400';
}
function cellGradeLabel(g: CellGrade): string {
  if (g === 'pass')    return '✓';
  if (g === 'partial') return '~';
  if (g === 'fail')    return '✗';
  return '–';
}
function lightStyle(l: TrafficLight): string {
  if (l === 'green') return 'bg-[#2F6B3F]';
  if (l === 'amber') return 'bg-[#CC8400]';
  return 'bg-[#A93F2F]';
}
function complianceScore(dims: Record<string, TrafficLight>): number {
  const vals = Object.values(dims);
  const pass = vals.filter(v => v === 'green').length;
  return Math.round((pass / vals.length) * 100);
}
function programScore(programId: string): number {
  const cells = SCORECARD_SEED[programId] ?? {};
  const vals   = Object.values(cells);
  const pass   = vals.filter(v => v === 'pass').length;
  const partial = vals.filter(v => v === 'partial').length;
  if (!vals.length) return 0;
  return Math.round(((pass + partial * 0.5) / vals.length) * 100);
}

// ── Mode switcher ─────────────────────────────────────────────────────────────

function ModeSwitcher({ mode, setMode }: { mode: HubMode; setMode: (m: HubMode) => void }) {
  return (
    <div className="shrink-0 px-5 pt-4 pb-3 border-b border-border bg-background">
      <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-2.5">Programs</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setMode('builder')}
          className={`rounded-xl border-2 p-3.5 text-left transition-all ${
            mode === 'builder'
              ? 'border-amber-400 bg-amber-50'
              : 'border-border bg-white hover:border-amber-200 hover:bg-amber-50/40'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${mode === 'builder' ? 'bg-amber-400' : 'bg-amber-100'}`}>
              <Hammer className={`w-3.5 h-3.5 ${mode === 'builder' ? 'text-white' : 'text-amber-600'}`} />
            </div>
            <p className={`text-[13px] font-bold ${mode === 'builder' ? 'text-amber-800' : 'text-foreground'}`}>Builder</p>
            {mode === 'builder' && <span className="ml-auto w-2 h-2 rounded-full bg-amber-500" />}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Create &amp; edit curriculum with {TERMS.aiAssistant} as your co-author
          </p>
        </button>

        <button
          onClick={() => setMode('governance')}
          className={`rounded-xl border-2 p-3.5 text-left transition-all ${
            mode === 'governance'
              ? 'border-sky-400 bg-sky-50'
              : 'border-border bg-white hover:border-sky-200 hover:bg-sky-50/40'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${mode === 'governance' ? 'bg-sky-500' : 'bg-sky-100'}`}>
              <ShieldCheck className={`w-3.5 h-3.5 ${mode === 'governance' ? 'text-white' : 'text-sky-600'}`} />
            </div>
            <p className={`text-[13px] font-bold ${mode === 'governance' ? 'text-sky-800' : 'text-foreground'}`}>Governance</p>
            {mode === 'governance' && <span className="ml-auto w-2 h-2 rounded-full bg-sky-500" />}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Audit quality, skills coverage &amp; blueprint compliance
          </p>
        </button>
      </div>
    </div>
  );
}

// ── Builder: tree panel ───────────────────────────────────────────────────────

function BuilderTree({
  courses,
  isLoading,
  isError,
  selected,
  onSelect,
}: {
  courses: SfLmsCourse[];
  isLoading: boolean;
  isError: boolean;
  selected: SelectedNode | null;
  onSelect: (n: SelectedNode) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (courses.length > 0 && expanded.size === 0) {
      setExpanded(new Set([courses[0]!.Id]));
    }
  }, [courses]);

  function toggleExpand(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const isCourseSelected = (c: SfLmsCourse) => selected?.kind === 'course' && selected.id === c.Id;
  const isModuleSelected = (m: SfCourseModule) => selected?.kind === 'module' && selected.id === m.Id;

  return (
    <div className="w-[240px] shrink-0 border-r border-border bg-white flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border/50 bg-muted/20 shrink-0">
        <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide">Courses &amp; Modules</p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 px-4 py-4 text-[13px] text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Loading from Salesforce…
        </div>
      )}
      {isError && <p className="px-4 py-3 text-[13px] text-[#A93F2F]">Could not load courses.</p>}

      <ScrollArea className="flex-1">
        {courses.map(course => {
          const isOpen = expanded.has(course.Id);
          const isSel  = isCourseSelected(course);
          const title  = course.Course_Title__c ?? course.Name;

          return (
            <div key={course.Id}>
              <button
                onClick={() => {
                  toggleExpand(course.Id);
                  onSelect({ kind: 'course', id: course.Id, name: course.Name, title: course.Course_Title__c, status: course.Status__c });
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left border-b border-border/30 transition-colors ${
                  isSel ? 'bg-amber-50 border-l-2 border-l-amber-400' : 'hover:bg-muted/20 border-l-2 border-l-transparent'
                }`}
              >
                {isOpen
                  ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
                  : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold truncate ${isSel ? 'text-amber-800' : 'text-foreground'}`}>{title}</p>
                  <p className="text-[11px] text-muted-foreground">{course.modules.length} module{course.modules.length !== 1 ? 's' : ''}</p>
                </div>
                {course.Status__c && (
                  <span className={`text-[10px] font-semibold border rounded-full px-1.5 py-0.5 shrink-0 ${
                    course.Status__c === 'Completed' ? 'text-[#245531] bg-[#E6F0EA] border-[#9FC3AE]' :
                    course.Status__c === 'In Progress' ? 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]' :
                    'text-slate-500 bg-slate-50 border-slate-200'
                  }`}>
                    {course.Status__c === 'In Progress' ? 'Active' : course.Status__c}
                  </span>
                )}
              </button>

              {isOpen && course.modules.map(mod => {
                const mSel = isModuleSelected(mod);
                return (
                  <button
                    key={mod.Id}
                    onClick={() => onSelect({ kind: 'module', id: mod.Id, name: mod.Name, courseId: course.Id, courseName: title })}
                    className={`w-full flex items-center gap-2 pl-8 pr-3 py-2 text-left border-b border-border/20 transition-colors ${
                      mSel ? 'bg-amber-50 border-l-2 border-l-amber-300' : 'hover:bg-muted/20 border-l-2 border-l-transparent'
                    }`}
                  >
                    <BookOpen className={`w-3 h-3 shrink-0 ${mSel ? 'text-amber-600' : 'text-muted-foreground/40'}`} />
                    <p className={`text-[12px] truncate flex-1 ${mSel ? 'font-semibold text-amber-800' : 'text-muted-foreground'}`}>
                      {mod.Name}
                    </p>
                    {mod.Status__c && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        mod.Status__c === 'Completed' ? 'bg-[#2F6B3F]' :
                        mod.Status__c === 'In Progress' ? 'bg-[#2F6F7E]' :
                        'bg-slate-300'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {!isLoading && !isError && courses.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
            No courses found in Salesforce.
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ── Builder: content studio ───────────────────────────────────────────────────

function ContentStudio({
  selected,
  sectionValues,
  nodeStatus,
  onChange,
  onSave,
  onPublish,
  onRequestReview,
}: {
  selected: SelectedNode | null;
  sectionValues: Record<string, string>;
  nodeStatus: NodeStatus;
  onChange: (key: string, val: string) => void;
  onSave: () => void;
  onPublish: () => void;
  onRequestReview: () => void;
}) {
  if (!selected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 bg-muted/10 p-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
          <GraduationCap className="w-7 h-7 text-amber-600" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-foreground mb-1">Select a course or module</p>
          <p className="text-[13px] text-muted-foreground max-w-[240px]">
            Pick an item from the tree on the left to open the content studio
          </p>
        </div>
      </div>
    );
  }

  const nodeTitle  = selected.kind === 'course' ? (selected.title ?? selected.name) : selected.name;
  const breadcrumb = selected.kind === 'module' ? selected.courseName : null;
  const passCount  = BUILDER_SECTIONS.filter(s => sectionStatus(sectionValues[s.key] ?? '', s.minLength) === 'pass').length;
  const totalCount = BUILDER_SECTIONS.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Studio header */}
      <div className="px-5 py-3.5 border-b border-border shrink-0">
        {breadcrumb && (
          <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <BookOpen className="w-3 h-3" />{breadcrumb}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-[16px] font-bold text-foreground truncate">{nodeTitle}</h2>
            {nodeStatusBadge(nodeStatus)}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[12px] text-muted-foreground">{passCount}/{totalCount}</span>
            <div className="h-1.5 w-20 bg-muted/40 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(passCount / totalCount) * 100}%` }} />
            </div>
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-primary border border-primary/20 bg-primary/5 rounded-full px-3 py-1 hover:bg-primary/10 transition-colors"
            >
              <Save className="w-3 h-3" />Save
            </button>
          </div>
        </div>
      </div>

      {/* Sections */}
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4">
          {BUILDER_SECTIONS.map(section => {
            const val    = sectionValues[section.key] ?? '';
            const status = sectionStatus(val, section.minLength);
            return (
              <div key={section.key} className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/50 bg-muted/10">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-foreground">{section.label}</p>
                    <span className="text-[11px] text-muted-foreground/50">· required by {section.requiredBy}</span>
                  </div>
                  {statusBadge(status)}
                </div>
                <div className="p-3">
                  <textarea
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-amber-300 resize-none placeholder:text-muted-foreground/40 leading-relaxed"
                    rows={3}
                    value={val}
                    onChange={e => onChange(section.key, e.target.value)}
                    placeholder={status === 'missing' ? `⚠ This section is required by the ${section.requiredBy}. ${section.placeholder}` : section.placeholder}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Action bar */}
      <div className="shrink-0 border-t border-border bg-white px-5 py-3 flex items-center gap-2">
        <button onClick={onSave} className="flex items-center gap-1.5 text-[12px] font-semibold bg-amber-500 text-white rounded-full px-3.5 py-1.5 hover:bg-amber-600 transition-colors">
          <Save className="w-3.5 h-3.5" />Save draft
        </button>
        <button
          onClick={onPublish}
          disabled={nodeStatus === 'published'}
          className="flex items-center gap-1.5 text-[12px] font-semibold border border-[#9FC3AE] text-[#245531] bg-[#E6F0EA] rounded-full px-3.5 py-1.5 hover:bg-[#d6e8dc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eye className="w-3.5 h-3.5" />
          {nodeStatus === 'published' ? 'Published' : 'Publish'}
        </button>
        <button
          onClick={onRequestReview}
          disabled={nodeStatus === 'review'}
          className="flex items-center gap-1.5 text-[12px] font-semibold border border-border text-muted-foreground rounded-full px-3.5 py-1.5 hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          {nodeStatus === 'review' ? 'In review' : 'Request review'}
        </button>
        <span className="ml-auto text-[11px] text-muted-foreground/40">Saved to this browser</span>
      </div>
    </div>
  );
}

// ── Builder: Penny co-author rail ─────────────────────────────────────────────

function PennyRail({ selected, sectionValues }: { selected: SelectedNode | null; sectionValues: Record<string, string> }) {
  const { setAskPennyOpen, setPendingPennyQuery } = useAppContext();

  function firePenny(query: string) { setPendingPennyQuery(query); setAskPennyOpen(true); }

  const nodeTitle    = selected ? (selected.kind === 'course' ? (selected.title ?? selected.name) : selected.name) : null;
  const missingCount = selected ? BUILDER_SECTIONS.filter(s => sectionStatus(sectionValues[s.key] ?? '', s.minLength) === 'missing').length : 0;

  const actions = selected ? [
    {
      label: 'Write learning objectives',
      query: `I'm authoring "${nodeTitle}". Please write 3 strong, measurable learning objectives using action verbs appropriate for a ${selected.kind === 'course' ? 'course' : 'module'} about this topic. Each objective should start with an action verb and describe a concrete learner outcome.`,
      icon: Target, color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    },
    {
      label: 'Suggest an activity',
      query: `I'm building an activity for "${nodeTitle}". Suggest an active learning exercise (not just reading) that a Salesforce learner can complete in 15–20 minutes. Be specific about what they'll do, in which tool, and what they'll have built at the end.`,
      icon: Zap, color: 'text-[#2F6F7E]', bg: 'bg-[#EDF5F8] hover:bg-[#dbeaf1] border-[#7FAFC6]',
    },
    {
      label: `Draft a ${TERMS.aiAssistant} prompt`,
      query: `Write a ${TERMS.aiAssistant} reflection prompt for "${nodeTitle}". It must be open-ended (cannot be answered yes/no), reference the module theme specifically, and include a follow-up question for when the learner gives a surface-level answer.`,
      icon: Brain, color: 'text-secondary', bg: 'bg-secondary/5 hover:bg-secondary/10 border-secondary/20',
    },
    {
      label: 'Check against blueprint',
      query: `Review "${nodeTitle}" against the Program Blueprint standard. I have ${missingCount} missing sections out of ${BUILDER_SECTIONS.length}. Tell me which sections are most critical to complete first, and give me a concrete first draft for the most important missing one.`,
      icon: ShieldCheck, color: 'text-[#245531]', bg: 'bg-[#E6F0EA] hover:bg-[#d6e8dc] border-[#9FC3AE]',
    },
  ] : [];

  return (
    <div className="w-[272px] shrink-0 border-l border-border bg-white flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0 bg-muted/10">
        <div className="flex items-center gap-2 mb-0.5">
          <Sparkles className="w-3.5 h-3.5 text-secondary" />
          <p className="text-[13px] font-bold text-foreground">{TERMS.aiAssistant} Co-Author</p>
        </div>
        <p className="text-[11px] text-muted-foreground">Context-aware assistance</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {!selected ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <Sparkles className="w-5 h-5 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">Select a course or module to get context-aware suggestions</p>
            </div>
          ) : (
            <>
              {missingCount > 0 && (
                <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] p-3">
                  <p className="text-[12px] font-semibold text-[#CC8400] mb-0.5">{missingCount} section{missingCount !== 1 ? 's' : ''} missing</p>
                  <p className="text-[11px] text-[#8A5800]">{TERMS.aiAssistant} can help fill the gaps for <strong>{nodeTitle}</strong>.</p>
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-2">Quick actions</p>
                <div className="space-y-1.5">
                  {actions.map(action => {
                    const Icon = action.icon;
                    return (
                      <button key={action.label} onClick={() => firePenny(action.query)}
                        className={`w-full text-left flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[12px] font-semibold transition-colors ${action.bg}`}>
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${action.color}`} />
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-2">Blueprint requirement</p>
                <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
                  {selected.kind === 'module' ? (
                    <>
                      <p className="text-[12px] font-semibold text-foreground">Module Standard</p>
                      <ul className="space-y-1">
                        {['Learning objectives (min. 2)', 'Linked assessment', 'Reflection prompt', 'Knowledge article refs', 'Delivery activity'].map(req => (
                          <li key={req} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/30" />{req}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className="text-[12px] font-semibold text-foreground">Program Blueprint</p>
                      <ul className="space-y-1">
                        {['Course description', 'Learning objectives (min. 3)', 'Sprint & module structure', 'Penny asset set', 'Salesforce mapping'].map(req => (
                          <li key={req} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/30" />{req}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Governance: Quality Scorecard ─────────────────────────────────────────────

function QualityScorecard({ onViewInBuilder }: { onViewInBuilder: (progId: string, stdId: string) => void }) {
  const [activeCell, setActiveCell] = useState<{ progId: string; stdId: string } | null>(null);
  const programs = curriculumPrograms.filter(p => SCORECARD_SEED[p.id]);

  const activeProg  = activeCell ? curriculumPrograms.find(p => p.id === activeCell.progId) : null;
  const activeStd   = activeCell ? contentStandards.find(s => s.id === activeCell.stdId) : null;
  const activeGrade: CellGrade = activeCell ? (SCORECARD_SEED[activeCell.progId]?.[activeCell.stdId] ?? 'na') : 'na';

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-auto p-5">
        <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-3">Programs × Standards Quality Matrix</p>

        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground/60 w-40">Program</th>
                {SCORECARD_STANDARDS.map(s => (
                  <th key={s.id} className="px-3 py-3 text-[11px] font-bold text-muted-foreground/60 text-center">{s.short}</th>
                ))}
                <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground/60 text-center">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {programs.map(prog => {
                const score = programScore(prog.id);
                return (
                  <tr key={prog.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground text-[12px]">{prog.name}</td>
                    {SCORECARD_STANDARDS.map(std => {
                      const grade    = SCORECARD_SEED[prog.id]?.[std.id] ?? 'na';
                      const isActive = activeCell?.progId === prog.id && activeCell?.stdId === std.id;
                      return (
                        <td key={std.id} className="px-3 py-2 text-center">
                          <button
                            onClick={() => setActiveCell(isActive ? null : { progId: prog.id, stdId: std.id })}
                            className={`w-8 h-8 rounded-lg font-bold text-[13px] mx-auto flex items-center justify-center transition-all ${cellGradeStyle(grade)} ${
                              isActive ? 'ring-2 ring-foreground/30' : 'hover:opacity-80'
                            }`}
                          >
                            {cellGradeLabel(grade)}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${
                        score >= 80 ? 'text-[#245531] bg-[#E6F0EA]' :
                        score >= 50 ? 'text-[#CC8400] bg-[#FFF3E0]' :
                        'text-[#A93F2F] bg-[#FBEAE6]'
                      }`}>{score}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/20">
                <td className="px-4 py-2 text-[11px] font-bold text-muted-foreground/50">Column coverage</td>
                {SCORECARD_STANDARDS.map(std => {
                  const cells = programs.map(p => SCORECARD_SEED[p.id]?.[std.id] ?? 'na').filter(g => g !== 'na');
                  const pass  = cells.filter(g => g === 'pass').length;
                  const pct   = cells.length ? Math.round((pass / cells.length) * 100) : 0;
                  return <td key={std.id} className="px-3 py-2 text-center text-[11px] font-bold text-muted-foreground/60">{pct}%</td>;
                })}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex items-center gap-4 mt-3">
          {([['pass','✓','Passes standard'],['partial','~','Partially meets'],['fail','✗','Fails standard'],['na','–','Not applicable']] as [CellGrade, string, string][]).map(([g, sym, lbl]) => (
            <div key={g} className="flex items-center gap-1.5">
              <span className={`w-6 h-6 rounded text-[11px] font-bold flex items-center justify-center ${cellGradeStyle(g)}`}>{sym}</span>
              <span className="text-[11px] text-muted-foreground">{lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {activeCell && activeProg && activeStd && (
        <div className="w-[300px] shrink-0 border-l border-border bg-white flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-[13px] font-bold text-foreground">{activeStd.name}</p>
            <button onClick={() => setActiveCell(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-1">Program</p>
                <p className="text-[13px] font-semibold text-foreground">{activeProg.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-1">Result</p>
                <span className={`text-[12px] font-bold border rounded-full px-2 py-0.5 ${
                  activeGrade === 'pass'    ? 'text-[#245531] bg-[#E6F0EA] border-[#9FC3AE]' :
                  activeGrade === 'partial' ? 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' :
                  activeGrade === 'fail'    ? 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' :
                  'text-slate-500 bg-slate-50 border-slate-200'
                }`}>
                  {activeGrade === 'pass' ? 'Passes' : activeGrade === 'partial' ? 'Partially meets' : activeGrade === 'fail' ? 'Fails' : 'N/A'}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-1">Standard purpose</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{activeStd.purpose.slice(0, 200)}…</p>
              </div>
              {(activeGrade === 'fail' || activeGrade === 'partial') && (
                <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] p-3">
                  <p className="text-[11px] font-bold text-[#CC8400] mb-1">Required fields to address</p>
                  <ul className="space-y-1">
                    {activeStd.requiredFields.filter(f => f.required).slice(0, 4).map(f => (
                      <li key={f.field} className="text-[11px] text-[#8A5800] flex items-start gap-1.5">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-[#CC8400]" />{f.field}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={() => { onViewInBuilder(activeCell.progId, activeCell.stdId); setActiveCell(null); }}
                className="w-full text-[12px] font-semibold text-primary border border-primary/20 bg-primary/5 rounded-lg py-2 hover:bg-primary/10 transition-colors"
              >
                View in Builder →
              </button>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// ── Governance: Skills Coverage ───────────────────────────────────────────────

function SkillsCoverage() {
  const { setAskPennyOpen, setPendingPennyQuery } = useAppContext();
  const programs = curriculumPrograms.slice(0, 5);

  function firePennyGaps() {
    setPendingPennyQuery('Looking at the skills coverage matrix across all Transition Trails programs, which skills are most underrepresented? For each gap, give me a concrete recommendation on which program should cover it and why.');
    setAskPennyOpen(true);
  }

  return (
    <div className="p-5 overflow-auto h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide">Skills × Programs Coverage Heatmap</p>
        <button onClick={firePennyGaps} className="flex items-center gap-1.5 text-[12px] font-semibold text-secondary border border-secondary/20 bg-secondary/5 rounded-full px-3 py-1 hover:bg-secondary/10 transition-colors">
          <Sparkles className="w-3.5 h-3.5" />Ask {TERMS.aiAssistant} about gaps
        </button>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground/60 w-48">Skill / Competency</th>
              {programs.map(p => (
                <th key={p.id} className="px-3 py-3 text-[11px] font-bold text-muted-foreground/60 text-center">
                  <span className="block truncate w-20" title={p.name}>{p.name.replace('Trail', '').replace("Explorer's", 'Explorers').trim()}</span>
                </th>
              ))}
              <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground/60 text-center">Coverage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {SKILLS.map(skill => {
              const covered = programs.filter(p => SKILLS_SEED[skill]?.[p.name]).length;
              const pct     = Math.round((covered / programs.length) * 100);
              const isGap   = pct < 40;
              return (
                <tr key={skill} className={`hover:bg-muted/10 transition-colors ${isGap ? 'bg-[#FBEAE6]/20' : ''}`}>
                  <td className="px-4 py-2.5 font-medium text-foreground text-[12px]">
                    {skill}
                    {isGap && <span className="ml-2 text-[10px] font-bold text-[#A93F2F] bg-[#FBEAE6] border border-[#E8B9B4] rounded-full px-1.5">Gap</span>}
                  </td>
                  {programs.map(p => {
                    const covers = SKILLS_SEED[skill]?.[p.name] ?? false;
                    return (
                      <td key={p.id} className="px-3 py-2 text-center">
                        <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center ${covers ? 'bg-[#2F6B3F]' : 'bg-muted/30 border border-border'}`}>
                          {covers && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <div className="w-12 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 60 ? 'bg-[#2F6B3F]' : pct >= 40 ? 'bg-[#CC8400]' : 'bg-[#A93F2F]'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-muted-foreground/70">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground/50 mt-2">Gap = skill covered by fewer than 40% of programs.</p>
    </div>
  );
}

// ── Governance: Blueprint Compliance ─────────────────────────────────────────

function BlueprintCompliance() {
  const [expanded, setExpanded] = useState<string | null>('prog-foundations');

  return (
    <div className="p-5">
      <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-3">Blueprint Compliance — Per Program</p>
      <div className="space-y-2">
        {curriculumPrograms.map(prog => {
          const dims  = COMPLIANCE_SEED[prog.id];
          if (!dims) return null;
          const score = complianceScore(dims);
          const isOpen = expanded === prog.id;

          return (
            <div key={prog.id} className="rounded-xl border border-border bg-white overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : prog.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${score >= 80 ? 'bg-[#2F6B3F]' : score >= 50 ? 'bg-[#CC8400]' : 'bg-[#A93F2F]'}`} />
                  <p className="text-[13px] font-semibold text-foreground truncate">{prog.name}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {COMPLIANCE_DIMS.map(d => (
                    <div key={d.key} className={`w-2.5 h-2.5 rounded-full ${lightStyle(dims[d.key] as TrafficLight)}`} title={d.label} />
                  ))}
                </div>
                <span className={`text-[12px] font-bold shrink-0 px-2 py-0.5 rounded-full ${
                  score >= 80 ? 'text-[#245531] bg-[#E6F0EA]' :
                  score >= 50 ? 'text-[#CC8400] bg-[#FFF3E0]' :
                  'text-[#A93F2F] bg-[#FBEAE6]'
                }`}>{score}%</span>
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              </button>

              {isOpen && (
                <div className="border-t border-border px-4 py-3">
                  {prog.purpose && <p className="text-[12px] text-muted-foreground mb-3 leading-snug">{prog.purpose}</p>}
                  <div className="grid grid-cols-3 gap-2">
                    {COMPLIANCE_DIMS.map(d => {
                      const light = dims[d.key] as TrafficLight;
                      return (
                        <div key={d.key} className={`rounded-lg border px-3 py-2 ${
                          light === 'green' ? 'border-[#9FC3AE] bg-[#E6F0EA]' :
                          light === 'amber' ? 'border-[#FFD08A] bg-[#FFF3E0]' :
                          'border-[#E8B9B4] bg-[#FBEAE6]'
                        }`}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <div className={`w-2 h-2 rounded-full ${lightStyle(light)}`} />
                            <p className={`text-[11px] font-bold ${
                              light === 'green' ? 'text-[#245531]' :
                              light === 'amber' ? 'text-[#CC8400]' :
                              'text-[#A93F2F]'
                            }`}>{d.label}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {light === 'green' ? 'Compliant' : light === 'amber' ? 'Partially met' : 'Not met'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Governance: right rail ────────────────────────────────────────────────────

function GovernanceRail({ tab }: { tab: GovernanceTab }) {
  const { setAskPennyOpen, setPendingPennyQuery } = useAppContext();
  const [selectedProgramId, setSelectedProgramId] = useState('prog-foundations');

  const dims  = COMPLIANCE_SEED[selectedProgramId] ?? {};
  const compliance = complianceScore(dims);
  const score = programScore(selectedProgramId);

  const totalCourses  = curriculumPrograms.filter(p => COMPLIANCE_SEED[p.id]).length;
  const avgScore      = Math.round(
    curriculumPrograms.filter(p => SCORECARD_SEED[p.id]).reduce((s, p) => s + programScore(p.id), 0) /
    curriculumPrograms.filter(p => SCORECARD_SEED[p.id]).length
  );
  const skillsCovered = SKILLS.filter(sk => Object.values(SKILLS_SEED[sk] ?? {}).some(Boolean)).length;

  function fireGapSummary() {
    setPendingPennyQuery('Summarize the biggest content gaps across all Transition Trails programs. Consider standards compliance, skills coverage, and blueprint adherence. Give me a prioritized list of the top 5 gaps and a concrete first step for each.');
    setAskPennyOpen(true);
  }

  return (
    <div className="w-[272px] shrink-0 border-l border-border bg-white flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0 bg-muted/10">
        <p className="text-[13px] font-bold text-foreground mb-0.5 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />Governance Summary
        </p>
        <p className="text-[11px] text-muted-foreground">Cross-program quality overview</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-1.5">Focus Program</p>
            <select
              value={selectedProgramId}
              onChange={e => setSelectedProgramId(e.target.value)}
              className="w-full h-8 rounded-lg border border-input bg-background px-2 text-[13px] font-semibold focus:outline-none focus:ring-1 focus:ring-sky-300"
            >
              {curriculumPrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide">Program Scores</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Standards', value: `${score}%`,     color: score >= 80 ? 'text-[#245531]' : score >= 50 ? 'text-[#CC8400]' : 'text-[#A93F2F]' },
                { label: 'Blueprint', value: `${compliance}%`, color: compliance >= 80 ? 'text-[#245531]' : compliance >= 50 ? 'text-[#CC8400]' : 'text-[#A93F2F]' },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-border p-2.5 text-center">
                  <p className={`text-[18px] font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide">All Programs</p>
            <div className="space-y-1.5">
              {[
                { label: 'Total programs',   value: totalCourses },
                { label: 'Avg quality score',value: `${avgScore}%` },
                { label: 'Skills covered',   value: `${skillsCovered}/${SKILLS.length}` },
                { label: 'Last audit',       value: 'Aug 2026' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-semibold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={fireGapSummary} className="w-full flex items-center justify-center gap-2 text-[12px] font-semibold text-secondary border-2 border-secondary/20 bg-secondary/5 rounded-xl py-3 hover:bg-secondary/10 transition-colors">
            <Sparkles className="w-4 h-4" />Ask {TERMS.aiAssistant} about gaps
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main hub ──────────────────────────────────────────────────────────────────

const GOV_TABS: { id: GovernanceTab; label: string; icon: React.ElementType }[] = [
  { id: 'scorecard',  label: 'Quality Scorecard',    icon: BarChart2    },
  { id: 'skills',     label: 'Skills Coverage',       icon: Target       },
  { id: 'compliance', label: 'Blueprint Compliance',  icon: FileCheck    },
  { id: 'standards',  label: 'Standards Studio',      icon: ShieldCheck  },
];

export default function ProgramHub() {
  const [location] = useLocation();
  const { toast }  = useToast();

  // Mode — persisted in localStorage
  const [mode, setModeRaw] = useState<HubMode>(() => {
    if (location.startsWith('/program/governance')) return 'governance';
    return lsRead<HubMode>(LS_MODE, 'builder');
  });

  function setMode(m: HubMode) { setModeRaw(m); lsWrite(LS_MODE, m); }

  const [govTab, setGovTab] = useState<GovernanceTab>('scorecard');

  // SF LMS data for builder tree
  const { data, isLoading, isError } = useSfLmsCourses();
  const courses = data?.courses ?? [];

  // Builder selection
  const [selected, setSelected] = useState<SelectedNode | null>(null);

  // Per-node content — persisted in localStorage, never reset on node switch
  const [allSectionValues, setAllSectionValues] = useState<Record<string, Record<string, string>>>(
    () => lsRead<Record<string, Record<string, string>>>(LS_CONTENT, {})
  );

  // Per-node status — persisted in localStorage
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>(
    () => lsRead<Record<string, NodeStatus>>(LS_STATUSES, {})
  );

  // Auto-select first course in builder on load
  useEffect(() => {
    if (courses.length > 0 && !selected && mode === 'builder') {
      const first = courses[0]!;
      setSelected({ kind: 'course', id: first.Id, name: first.Name, title: first.Course_Title__c, status: first.Status__c });
    }
  }, [courses, mode]);

  // Force governance mode when navigating to /program/governance
  useEffect(() => {
    if (location.startsWith('/program/governance')) setMode('governance');
  }, [location]);

  // Content change handler — writes per-node to localStorage
  function handleSectionChange(key: string, val: string) {
    if (!selected) return;
    const nodeId = selected.id;
    setAllSectionValues(prev => {
      const next = { ...prev, [nodeId]: { ...(prev[nodeId] ?? {}), [key]: val } };
      lsWrite(LS_CONTENT, next);
      return next;
    });
  }

  function setNodeStatus(nodeId: string, status: NodeStatus) {
    setNodeStatuses(prev => {
      const next = { ...prev, [nodeId]: status };
      lsWrite(LS_STATUSES, next);
      return next;
    });
  }

  const currentSectionValues = selected ? (allSectionValues[selected.id] ?? {}) : {};
  const currentNodeStatus    = selected ? (nodeStatuses[selected.id] ?? 'draft') : 'draft';

  function handleSave() {
    // Values already written on each keystroke; this is an explicit "save" gesture
    if (selected) lsWrite(LS_CONTENT, allSectionValues);
    toast({ title: 'Draft saved', description: 'Content saved to this browser. Changes persist across page refreshes.' });
  }

  function handlePublish() {
    if (!selected) return;
    setNodeStatus(selected.id, 'published');
    toast({ title: 'Marked as published', description: 'Status updated locally. Connect a backend to sync to Salesforce.' });
  }

  function handleRequestReview() {
    if (!selected) return;
    setNodeStatus(selected.id, 'review');
    toast({ title: 'Review requested', description: 'Status set to "In review" and saved locally.' });
  }

  // View in Builder — switches to builder and selects the best-matching course for the program
  function handleViewInBuilder(progId: string, _stdId: string) {
    setMode('builder');
    if (courses.length === 0) return;

    const prog = curriculumPrograms.find(p => p.id === progId);
    if (!prog) {
      const first = courses[0]!;
      setSelected({ kind: 'course', id: first.Id, name: first.Name, title: first.Course_Title__c, status: first.Status__c });
      return;
    }

    // Match by looking for a course whose title/name shares keywords with the program name
    const progWords = prog.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const match = courses.find(c => {
      const t = (c.Course_Title__c ?? c.Name).toLowerCase();
      return progWords.some(w => t.includes(w));
    }) ?? courses[0]!;

    setSelected({ kind: 'course', id: match.Id, name: match.Name, title: match.Course_Title__c, status: match.Status__c });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ModeSwitcher mode={mode} setMode={setMode} />

      {/* ── BUILDER MODE ── */}
      {mode === 'builder' && (
        <div className="flex flex-1 overflow-hidden">
          <BuilderTree
            courses={courses}
            isLoading={isLoading}
            isError={isError}
            selected={selected}
            onSelect={setSelected}
          />
          <ContentStudio
            selected={selected}
            sectionValues={currentSectionValues}
            nodeStatus={currentNodeStatus}
            onChange={handleSectionChange}
            onSave={handleSave}
            onPublish={handlePublish}
            onRequestReview={handleRequestReview}
          />
          <PennyRail selected={selected} sectionValues={currentSectionValues} />
        </div>
      )}

      {/* ── GOVERNANCE MODE ── */}
      {mode === 'governance' && (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="shrink-0 border-b border-border bg-background px-5 flex items-center gap-0.5">
              {GOV_TABS.map(t => {
                const Icon     = t.icon;
                const isActive = govTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setGovTab(t.id)}
                    className={`flex items-center gap-1.5 text-[12px] font-semibold px-3 py-3 border-b-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-sky-500 text-sky-700'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />{t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-hidden">
              {govTab === 'scorecard'  && <QualityScorecard onViewInBuilder={handleViewInBuilder} />}
              {govTab === 'skills'     && <SkillsCoverage />}
              {govTab === 'compliance' && <ScrollArea className="h-full"><BlueprintCompliance /></ScrollArea>}
              {govTab === 'standards'  && <StandardsStudio />}
            </div>
          </div>

          {govTab !== 'standards' && <GovernanceRail tab={govTab} />}
        </div>
      )}
    </div>
  );
}
