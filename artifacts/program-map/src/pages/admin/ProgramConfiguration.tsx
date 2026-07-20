/**
 * ProgramConfiguration — Admin wizard for configuring a Salesforce Program
 * and its related records (Cohorts, Course, Modules) with Penny as AI guide.
 *
 * Layout: 60% wizard | 40% Penny guidance panel
 * Steps: 1 Program → 2 Cohorts → 3 Course → 4 Modules → Review
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Sparkles, ChevronRight, Plus, Check,
         AlertCircle, Loader2, RotateCcw, Zap, BookOpen,
         Layers, Users, GraduationCap, ClipboardList,
         Pencil, Eye, ExternalLink, ArrowLeft, Link2, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import { useProgramPennyConfig } from '@/hooks/useProgramPennyConfig';
import type { PennyStatus } from '@/hooks/useProgramPennyConfig';

// ── Penny status row (self-contained, mounts own hook) ────────────────────────
const PENNY_OPTS: { value: PennyStatus; dot: string; badge: string }[] = [
  { value: 'Active',      dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'Planned',     dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'Not Planned', dot: 'bg-muted-foreground/30', badge: 'bg-muted text-muted-foreground border-border' },
];
function PennyStatusRow({ programId }: { programId: string }) {
  const { status, setStatus, isSaving } = useProgramPennyConfig(programId);
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40 bg-muted/10">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3 h-3 text-primary/60" />
        <span className="text-[11px] font-semibold text-foreground">{TERMS.aiAssistant} Intelligence</span>
        {isSaving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>
      <div className="flex gap-1">
        {PENNY_OPTS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            disabled={isSaving}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-colors focus:outline-none disabled:opacity-50 ${
              status === opt.value
                ? opt.badge + ' shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:border-primary/30'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
            {opt.value}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SfProgram {
  Id: string; Name: string; pmdm__Status__c: string | null;
  pmdm__StartDate__c: string | null; pmdm__EndDate__c: string | null;
  pmdm__ShortSummary__c?: string | null;
}
interface SfCohort {
  Id: string; Name: string; pmdm__Status__c: string | null;
  pmdm__StartDate__c: string | null; pmdm__EndDate__c: string | null;
  Cohort_Capacity__c: number | null; pmdm__Description__c: string | null;
}
interface SfCourse {
  Id: string; Name: string; Course_Title__c: string | null;
  Status__c: string | null; Program__c: string | null;
  Overview__c: string | null; Learning_Goals__c: string | null;
  Estimated_Start_Date__c: string | null; Estimated_End_Date__c: string | null;
}
interface SfModule {
  Id: string; Name: string; Mission_Brief__c: string | null;
  Core_Concepts__c: string | null; Trail_Tools__c: string | null;
  Reflection_Prompt__c: string | null; Trail_Talk_Prompts__c: string | null;
  Order__c: number | null; Status__c: string | null;
}

type WizardStep = 1 | 2 | 3 | 4 | 'review';

// ── Constants ─────────────────────────────────────────────────────────────────

const PROGRAM_STATUSES   = ['In Discovery','Planned','Active','Completed','Canceled'];
const COHORT_STATUSES    = ['Planned','Active','Completed','Canceled'];
const COURSE_STATUSES    = ['Not Started','Discovery','In Progress','In Review','Completed','On Hold','Cancelled'];
const MODULE_STATUSES    = ['Not Started','In Progress','Completed','On Hold','Cancelled'];
const PROGRAM_PICKLIST   = [
  'The Guided Trail','Trail of Mastery',"The Explorers Trail",
  'The Nonprofit Digital Compass','The Business Digital Compass',
];

const STEP_CONTEXT: Record<WizardStep, string> = {
  1: `Let's start by selecting or setting up your Program. Tell me what this program is designed to accomplish, and I'll help you fill in the key fields.`,
  2: `Great! Now let's think through your cohort structure. How many cohorts are you planning to run? Consider capacity limits and timing.`,
  3: `Time to link your LMS course. This is the curriculum that will be delivered through this program. What's the learning goal?`,
  4: `Now let's build out your modules. Think of each module as one trail segment — a focused learning block. What concepts need to be covered?`,
  review: `Here's your full configuration. Review everything carefully — when you're ready I'll save it all to Salesforce. You can also invoke Agentforce to orchestrate more complex setup tasks.`,
};

const STEP_META: { label: string; icon: React.ElementType; stepNum: 1 | 2 | 3 | 4 }[] = [
  { stepNum: 1, label: 'Program',  icon: GraduationCap },
  { stepNum: 2, label: 'Cohorts',  icon: Users },
  { stepNum: 3, label: 'Course',   icon: BookOpen },
  { stepNum: 4, label: 'Modules',  icon: Layers },
];

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  'Active':       'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Planned':      'bg-blue-50 text-blue-700 border-blue-200',
  'In Discovery': 'bg-amber-50 text-amber-700 border-amber-200',
  'Completed':    'bg-gray-100 text-gray-600 border-gray-200',
  'Canceled':     'bg-rose-50 text-rose-700 border-rose-200',
  'Cancelled':    'bg-rose-50 text-rose-700 border-rose-200',
  'In Progress':  'bg-sky-50 text-sky-700 border-sky-200',
  'In Review':    'bg-violet-50 text-violet-700 border-violet-200',
  'Not Started':  'bg-gray-50 text-gray-500 border-gray-200',
  'On Hold':      'bg-orange-50 text-orange-700 border-orange-200',
  'Discovery':    'bg-amber-50 text-amber-700 border-amber-200',
};

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? 'Unknown';
  const cls = STATUS_COLORS[s] ?? 'bg-gray-50 text-gray-500 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {s}
    </span>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current, skipCohorts = false, onStepClick }: {
  current: WizardStep;
  skipCohorts?: boolean;
  onStepClick?: (step: 1 | 2 | 3 | 4) => void;
}) {
  const done = current === 'review';
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEP_META.map((s, i) => {
        const isSkipped  = skipCohorts && s.stepNum === 2;
        const isActive   = !isSkipped && current === s.stepNum;
        const isDone     = !isSkipped && (done || (typeof current === 'number' && current > s.stepNum));
        const isClickable = !isSkipped && !!onStepClick;
        const Icon = s.icon;
        return (
          <div key={s.stepNum} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={() => isClickable && onStepClick(s.stepNum)}
                onKeyDown={e => isClickable && (e.key === 'Enter' || e.key === ' ') && onStepClick(s.stepNum)}
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  isClickable ? 'cursor-pointer hover:opacity-75' : ''
                } ${
                  isSkipped ? 'bg-muted border-dashed border-border/50 text-muted-foreground/40'
                  : isDone   ? 'bg-primary border-primary text-primary-foreground'
                  : isActive ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-muted border-border text-muted-foreground'
                }`}
              >
                {isSkipped ? <span className="text-[10px] font-bold">—</span>
                  : isDone ? <Check className="w-3.5 h-3.5" />
                  : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${
                isSkipped  ? 'text-muted-foreground/40 line-through'
                : isActive ? 'text-primary'
                : isDone   ? 'text-foreground'
                : 'text-muted-foreground'
              }`}>
                {s.label}
              </span>
            </div>
            {i < STEP_META.length - 1 && (
              <div className={`h-0.5 w-12 mx-1 mb-4 rounded-full transition-colors ${
                isSkipped ? 'bg-border/30'
                : (done || (typeof current === 'number' && current > s.stepNum)) ? 'bg-primary' : 'bg-border'
              }`} />
            )}
          </div>
        );
      })}
      <div className={`flex items-center ml-0`}>
        <div className={`h-0.5 w-12 mx-1 mb-4 rounded-full transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
            done ? 'bg-primary border-primary text-primary-foreground'
            : 'bg-muted border-border text-muted-foreground'
          }`}>
            {done ? <Check className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
          </div>
          <span className={`text-[10px] mt-1 font-medium ${done ? 'text-primary' : 'text-muted-foreground'}`}>Review</span>
        </div>
      </div>
    </div>
  );
}

// ── Shared form field ─────────────────────────────────────────────────────────

function Field({
  label, required, children, hint,
}: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-foreground/80">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const INPUT_CLS = "w-full text-[13px] border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50";
const SELECT_CLS = "w-full text-[13px] border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30";
const TEXTAREA_CLS = "w-full text-[13px] border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50 resize-none";

function sfStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

// ── Program card ──────────────────────────────────────────────────────────────

function ProgramCard({
  p, selected, onClick,
}: {
  p: SfProgram; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-3 transition-all ${
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold text-foreground leading-tight">{p.Name}</p>
        <StatusBadge status={p.pmdm__Status__c} />
      </div>
      {p.pmdm__ShortSummary__c && (
        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.pmdm__ShortSummary__c}</p>
      )}
      <div className="flex gap-3 mt-1.5">
        {p.pmdm__StartDate__c && (
          <span className="text-[10px] text-muted-foreground">Start: {p.pmdm__StartDate__c}</span>
        )}
        {p.pmdm__EndDate__c && (
          <span className="text-[10px] text-muted-foreground">End: {p.pmdm__EndDate__c}</span>
        )}
      </div>
      {selected && (
        <div className="flex items-center gap-1 mt-1.5 text-primary">
          <Check className="w-3 h-3" />
          <span className="text-[10px] font-semibold">Selected</span>
        </div>
      )}
    </button>
  );
}

// ── Penny guidance panel ──────────────────────────────────────────────────────

const STEP_BRIEF: Record<WizardStep, { title: string; bullets: string[] }> = {
  1: {
    title: 'Select a Program to configure',
    bullets: [
      'Browse active Salesforce programs or create a new one',
      'Penny will analyze the program and surface recommendations',
      'Required fields, audience, goals, and structure are pre-loaded',
    ],
  },
  2: {
    title: 'Configure Cohorts',
    bullets: [
      'Set capacity limits, dates, and status for each cohort',
      'Penny can suggest cohort sizing based on program goals',
      'Ongoing programs can skip this step entirely',
    ],
  },
  3: {
    title: 'Link or Create a Course',
    bullets: [
      'Connect this program to its LMS curriculum',
      'Create a new course record directly in Salesforce',
      'Penny will help align learning goals to the program',
    ],
  },
  4: {
    title: 'Build out Modules',
    bullets: [
      'Each module is one focused learning block (trail segment)',
      'Order, mission brief, and core concepts are configurable',
      'Penny can recommend a module sequence based on outcomes',
    ],
  },
  review: {
    title: 'Review & Validate',
    bullets: [
      'All required sections must be ✅ before the config is complete',
      'Records are already saved to Salesforce as you went',
      'Invoke Agentforce for complex orchestration tasks',
    ],
  },
};

function PennyGuidancePanel({
  step, program, programDetail, onFocusWithPenny,
  onInvokeAgentforce, agentforceLoading,
}: {
  step: WizardStep;
  program: SfProgram | null;
  programDetail: Record<string, unknown> | null;
  onFocusWithPenny: () => void;
  onInvokeAgentforce?: () => void;
  agentforceLoading: boolean;
}) {
  const brief = STEP_BRIEF[step];
  const hasProgram = !!program;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card border-l border-border">
      {/* Mode accent line */}
      <div className="h-[3px] w-full bg-border/60 flex-shrink-0" />

      {/* Header — matches ContextPanel Trail Insights header */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b border-border flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary shrink-0" />
        <h3 className="font-semibold text-sm truncate flex-1">{TERMS.knowledgeBrief}</h3>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {hasProgram ? (
            <>
              {/* Program identity — badges → title → summary */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border border-border bg-background uppercase tracking-wider">
                    Program
                  </span>
                  {program.pmdm__Status__c && <StatusBadge status={program.pmdm__Status__c} />}
                </div>
                <h2 className="text-[15px] font-semibold text-foreground leading-snug">{program.Name}</h2>
                {program.pmdm__ShortSummary__c && (
                  <p className="text-xs text-muted-foreground italic leading-snug">{program.pmdm__ShortSummary__c}</p>
                )}
              </div>

              {/* Focus with Penny — subtle outline, right after title */}
              <button
                onClick={onFocusWithPenny}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Focus with {TERMS.aiAssistant}
              </button>

              {/* Labeled data sections from programDetail */}
              {(() => {
                const fields = programDetail ? [
                  { label: 'Manager',           val: sfStr(programDetail['Program_Manager_Name']) ?? sfStr(programDetail['Program_Manager__c']) },
                  { label: 'Start Date',        val: sfStr(programDetail['pmdm__StartDate__c']) ?? sfStr(program.pmdm__StartDate__c) },
                  { label: 'End Date',          val: sfStr(programDetail['pmdm__EndDate__c']) ?? sfStr(program.pmdm__EndDate__c) },
                  { label: 'Target Population', val: sfStr(programDetail['pmdm__TargetPopulation__c']) },
                  { label: 'Requires Payment',  val: sfStr(programDetail['Requires_Payment__c']) },
                ].filter(f => f.val) : [
                  { label: 'Start Date', val: sfStr(program.pmdm__StartDate__c) },
                  { label: 'End Date',   val: sfStr(program.pmdm__EndDate__c) },
                ].filter(f => f.val);

                if (!fields.length) return null;
                return (
                  <div className="space-y-3">
                    {fields.map(f => (
                      <div key={f.label}>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">{f.label}</p>
                        <p className="text-[12px] text-foreground leading-snug">{f.val}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Divider before step guidance */}
              <div className="border-t border-border/60" />

              {/* Step guidance — compact, secondary */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">In this step</p>
                <ul className="space-y-1.5">
                  {brief.bullets.map(b => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-primary/40 mt-1.5 flex-shrink-0" />
                      <span className="text-[11px] text-muted-foreground leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Agentforce — review step only */}
              {step === 'review' && onInvokeAgentforce && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Agentforce</p>
                  <button
                    onClick={onInvokeAgentforce}
                    disabled={agentforceLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-[12px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {agentforceLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Zap className="w-3.5 h-3.5" />}
                    Invoke Agentforce
                  </button>
                  <p className="text-[10px] text-muted-foreground/50 mt-1.5 leading-snug">
                    Orchestrate complex setup tasks across the full configuration.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* No program selected — show step guidance prominently */}
              <div className="rounded-lg bg-muted/40 border border-border/60 p-3">
                <p className="text-[11px] text-foreground/80 leading-relaxed">{STEP_CONTEXT[step]}</p>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">In this step</p>
                <ul className="space-y-1.5">
                  {brief.bullets.map(b => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span className="text-[11px] text-muted-foreground leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={onFocusWithPenny}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Focus with {TERMS.aiAssistant}
              </button>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── HTML → plain text (for edit form fields that contain SF rich-text) ────────
function stripHtmlToText(v: unknown): string {
  if (!v) return '';
  const raw = String(v);
  if (!raw || raw === 'null' || raw === 'undefined') return '';
  // Preserve list items and paragraphs as line breaks before stripping tags
  const withBreaks = raw
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ');
  // Use a temporary div to decode HTML entities and strip remaining tags
  const div = document.createElement('div');
  div.innerHTML = withBreaks;
  return (div.textContent ?? div.innerText ?? '').replace(/\n{3,}/g, '\n\n').trim();
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProgramConfiguration({ preSelectSfId }: { preSelectSfId?: string | null } = {}) {
  const { userTier, setAskPennyOpen, setPendingPennyQuery } = useAppContext();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // ── Wizard state ────────────────────────────────────────────────────────────
  const [step, setStep]                     = useState<WizardStep>(1);
  const [isCohortBased, setIsCohortBased]   = useState(true);
  const [programs, setPrograms]             = useState<SfProgram[]>([]);
  const [progSearch, setProgSearch]         = useState('');
  const [statusFilter, setStatusFilter]     = useState<'all' | 'discovery' | 'active' | 'archived'>('all');
  const [programsLoading, setProgramsLoading] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<SfProgram | null>(null);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [programDetail, setProgramDetail]     = useState<Record<string, unknown> | null>(null);
  const [programDetailLoading, setProgramDetailLoading] = useState(false);
  const [editingProgram, setEditingProgram]   = useState(false);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const [cohorts, setCohorts]               = useState<SfCohort[]>([]);
  const [cohortsLoading, setCohortsLoading] = useState(false);
  const [showCohortForm, setShowCohortForm] = useState(false);

  const [courses, setCourses]               = useState<SfCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<SfCourse | null>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showLinkForm, setShowLinkForm]     = useState(false);
  const [allLmsCourses, setAllLmsCourses]   = useState<SfCourse[]>([]);
  const [allLmsLoading, setAllLmsLoading]   = useState(false);
  const [linkSearch, setLinkSearch]         = useState('');

  const [modules, setModules]               = useState<SfModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [showModuleForm, setShowModuleForm] = useState(false);

  const [saving, setSaving]                 = useState(false);
  const [agentforceLoading, setAgentforceLoading] = useState(false);

  const pendingPennyPrompt = useRef<string | null>(null);
  const autoSelectDoneRef  = useRef(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [progForm, setProgForm] = useState({
    Name: '', pmdm__Status__c: 'In Discovery', pmdm__ShortSummary__c: '',
    pmdm__Description__c: '', pmdm__StartDate__c: '', pmdm__EndDate__c: '',
    pmdm__TargetPopulation__c: '', Program_Goals__c: '', Problem_Statement__c: '',
    Program_Manager__c: '',
  });
  const [cohortForm, setCohortForm] = useState({
    Name: '', pmdm__Status__c: 'Planned', pmdm__StartDate__c: '',
    pmdm__EndDate__c: '', Cohort_Capacity__c: '', pmdm__Description__c: '',
  });
  const [courseForm, setCourseForm] = useState({
    Name: '', Course_Title__c: '', Status__c: 'Not Started', Program__c: '',
    Overview__c: '', Learning_Goals__c: '', Estimated_Start_Date__c: '', Estimated_End_Date__c: '',
  });
  const [moduleForm, setModuleForm] = useState({
    Name: '', Status__c: 'Not Started', Mission_Brief__c: '', Core_Concepts__c: '',
    Trail_Tools__c: '', Reflection_Prompt__c: '', Trail_Talk_Prompts__c: '', Order__c: '',
  });

  function ts() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  // ── Data loading ─────────────────────────────────────────────────────────────
  const loadPrograms = useCallback(async () => {
    setProgramsLoading(true);
    try {
      const resp = await fetch('/api/programs');
      if (!resp.ok) throw new Error('Failed to load programs');
      const data = await resp.json() as { programs: SfProgram[] };
      setPrograms(data.programs ?? []);
    } catch {
      toast({ title: 'Could not load programs', description: 'Check your Salesforce connection.', variant: 'destructive' });
    } finally {
      setProgramsLoading(false);
    }
  }, [toast]);

  const loadCohorts = useCallback(async (programId: string) => {
    setCohortsLoading(true);
    try {
      const resp = await fetch(`/api/programs/${programId}/cohorts`);
      if (!resp.ok) throw new Error('Failed to load cohorts');
      const data = await resp.json() as { cohorts: SfCohort[] };
      setCohorts(data.cohorts ?? []);
    } catch {
      toast({ title: 'Could not load cohorts', variant: 'destructive' });
    } finally {
      setCohortsLoading(false);
    }
  }, [toast]);

  const loadCourses = useCallback(async (programId: string) => {
    setCoursesLoading(true);
    try {
      const resp = await fetch(`/api/programs/${programId}/courses`);
      if (!resp.ok) throw new Error('Failed to load courses');
      const data = await resp.json() as { courses: SfCourse[] };
      setCourses(data.courses ?? []);
    } catch {
      toast({ title: 'Could not load courses', variant: 'destructive' });
    } finally {
      setCoursesLoading(false);
    }
  }, [toast]);

  const loadModules = useCallback(async (courseId: string) => {
    setModulesLoading(true);
    try {
      const resp = await fetch(`/api/courses/${courseId}/modules`);
      if (!resp.ok) throw new Error('Failed to load modules');
      const data = await resp.json() as { modules: SfModule[] };
      setModules(data.modules ?? []);
    } catch {
      toast({ title: 'Could not load modules', variant: 'destructive' });
    } finally {
      setModulesLoading(false);
    }
  }, [toast]);

  const fetchProgramDetail = useCallback(async (id: string): Promise<Record<string, unknown> | null> => {
    setProgramDetailLoading(true);
    try {
      const resp = await fetch(`/api/programs/${id}`);
      if (!resp.ok) throw new Error('Failed to load details');
      const data = await resp.json() as { program: Record<string, unknown> };
      const p = data.program;
      setProgramDetail(p);
      setProgForm({
        Name:                    String(p['Name'] ?? ''),
        pmdm__Status__c:         String(p['pmdm__Status__c'] ?? 'In Discovery'),
        pmdm__ShortSummary__c:   String(p['pmdm__ShortSummary__c'] ?? ''),
        pmdm__Description__c:    String(p['pmdm__Description__c'] ?? ''),
        pmdm__StartDate__c:      String(p['pmdm__StartDate__c'] ?? ''),
        pmdm__EndDate__c:        String(p['pmdm__EndDate__c'] ?? ''),
        pmdm__TargetPopulation__c: String(p['pmdm__TargetPopulation__c'] ?? ''),
        Program_Goals__c:        stripHtmlToText(p['Program_Goals__c']),
        Problem_Statement__c:    stripHtmlToText(p['Problem_Statement__c']),
        Program_Manager__c:      String(p['Program_Manager__c'] ?? ''),
      });
      return p;
    } catch {
      return null;
    } finally {
      setProgramDetailLoading(false);
    }
  }, []);

  useEffect(() => { void loadPrograms(); }, [loadPrograms]);

  // Auto-select a program when navigated here from Overview with a pre-selected SF ID
  useEffect(() => {
    if (!preSelectSfId || programs.length === 0 || autoSelectDoneRef.current) return;
    const match = programs.find(p => p.Id === preSelectSfId);
    if (match) {
      autoSelectDoneRef.current = true;
      void handleSelectProgram(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programs, preSelectSfId]);

  useEffect(() => {
    if (!programDetailLoading && programDetail && detailPanelRef.current) {
      detailPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [programDetailLoading, programDetail]);

  // ── Step 1 actions ────────────────────────────────────────────────────────────
  async function handleCreateProgram() {
    if (!progForm.Name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(progForm).filter(([, v]) => v !== '')
      );
      const resp = await fetch('/api/programs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json() as { id?: string; error?: string };
      if (!resp.ok || !data.id) throw new Error(data.error ?? 'Create failed');
      toast({ title: '✓ Program created in Salesforce' });
      const newProg: SfProgram = {
        Id: data.id, Name: progForm.Name,
        pmdm__Status__c: progForm.pmdm__Status__c,
        pmdm__StartDate__c: progForm.pmdm__StartDate__c || null,
        pmdm__EndDate__c: progForm.pmdm__EndDate__c || null,
        pmdm__ShortSummary__c: progForm.pmdm__ShortSummary__c || null,
      };
      setPrograms(prev => [newProg, ...prev]);
      setSelectedProgram(newProg);
      setShowProgramForm(false);
    } catch (e) {
      toast({ title: 'Failed to create program', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateProgram() {
    if (!selectedProgram) return;
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(progForm)
          .filter(([k, v]) => k !== 'Name' && v !== '' && v !== 'null' && v !== 'undefined')
      );
      const resp = await fetch(`/api/programs/${selectedProgram.Id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const d = await resp.json() as { error?: string };
        throw new Error(d.error ?? 'Update failed');
      }
      toast({ title: '✓ Program updated in Salesforce' });
      const updated: SfProgram = {
        ...selectedProgram,
        pmdm__Status__c:       progForm.pmdm__Status__c,
        pmdm__StartDate__c:    progForm.pmdm__StartDate__c || null,
        pmdm__EndDate__c:      progForm.pmdm__EndDate__c || null,
        pmdm__ShortSummary__c: progForm.pmdm__ShortSummary__c || null,
      };
      setPrograms(prev => prev.map(p => p.Id === selectedProgram.Id ? updated : p));
      setSelectedProgram(updated);
      setProgramDetail(prev => prev ? { ...prev, ...payload } : prev);
      setEditingProgram(false);
    } catch (e) {
      toast({ title: 'Failed to update program', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSelectProgram(p: SfProgram) {
    setSelectedProgram(p);
    setEditingProgram(false);
    setProgramDetail(null);
    pendingPennyPrompt.current = null;
    setCourseForm(prev => ({ ...prev, Program__c: p.Name }));

    const detail = await fetchProgramDetail(p.Id);
    if (!detail) return;

    // Build prompt and store for when user clicks "Focus with Penny"
    const stripHtml = (v: unknown) =>
      v ? String(v).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';

    const sf = (key: string, maxChars = 300) => {
      const v = detail[key];
      if (!v || String(v) === 'null') return '';
      const s = stripHtml(v);
      return s.length > maxChars ? s.slice(0, maxChars) + '…' : s;
    };

    const lines: string[] = [
      `Program: ${String(detail['Name'] ?? p.Name)}`,
      sf('pmdm__Status__c')              && `Status: ${sf('pmdm__Status__c')}`,
      sf('pmdm__TargetPopulation__c')    && `Target Population: ${sf('pmdm__TargetPopulation__c')}`,
      sf('pmdm__ShortSummary__c')        && `Summary: ${sf('pmdm__ShortSummary__c')}`,
      sf('pmdm__Description__c')         && `Description: ${sf('pmdm__Description__c')}`,
      sf('Problem_Statement__c')         && `Problem Statement: ${sf('Problem_Statement__c')}`,
      sf('Program_Goals__c')             && `Program Goals: ${sf('Program_Goals__c')}`,
      sf('Program_Expected_Outcomes__c') && `Expected Outcomes: ${sf('Program_Expected_Outcomes__c')}`,
      sf('Program_Target_Audience__c')   && `Target Audience: ${sf('Program_Target_Audience__c')}`,
      sf('Program_Structure__c')         && `Program Structure: ${sf('Program_Structure__c')}`,
    ].filter(Boolean) as string[];

    pendingPennyPrompt.current =
      `Based on the following program details, give me 3–4 specific, actionable recommendations to better serve the target audience and strengthen program outcomes. Focus on curriculum design, learner engagement, and measurable impact.\n\n${lines.join('\n')}`;
  }

  function goToStep(target: WizardStep) {
    if (!selectedProgram) { toast({ title: 'Select a program first', variant: 'destructive' }); return; }
    if (target === 2 && !isCohortBased) return; // cohorts skipped for ongoing programs
    if (target === 2) void loadCohorts(selectedProgram.Id);
    if (target === 3) void loadCourses(selectedProgram.Id);
    if (target === 4 && selectedCourse) void loadModules(selectedCourse.Id);
    setStep(target);
  }

  function handleAdvanceFromStep1() {
    if (!selectedProgram) { toast({ title: 'Select a program first', variant: 'destructive' }); return; }
    if (isCohortBased) {
      void loadCohorts(selectedProgram.Id);
      setStep(2);
    } else {
      void loadCourses(selectedProgram.Id);
      setStep(3);
    }
  }

  // ── Step 2 actions ────────────────────────────────────────────────────────────
  async function handleCreateCohort() {
    if (!cohortForm.Name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    if (!selectedProgram) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = Object.fromEntries(
        Object.entries(cohortForm).filter(([, v]) => v !== '')
      );
      if (cohortForm.Cohort_Capacity__c) payload['Cohort_Capacity__c'] = Number(cohortForm.Cohort_Capacity__c);
      const resp = await fetch(`/api/programs/${selectedProgram.Id}/cohorts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json() as { id?: string; error?: string };
      if (!resp.ok || !data.id) throw new Error(data.error ?? 'Create failed');
      toast({ title: '✓ Cohort created in Salesforce' });
      const newCohort: SfCohort = {
        Id: data.id, Name: cohortForm.Name,
        pmdm__Status__c: cohortForm.pmdm__Status__c,
        pmdm__StartDate__c: cohortForm.pmdm__StartDate__c || null,
        pmdm__EndDate__c: cohortForm.pmdm__EndDate__c || null,
        Cohort_Capacity__c: cohortForm.Cohort_Capacity__c ? Number(cohortForm.Cohort_Capacity__c) : null,
        pmdm__Description__c: cohortForm.pmdm__Description__c || null,
      };
      setCohorts(prev => [...prev, newCohort]);
      setCohortForm({ Name:'', pmdm__Status__c:'Planned', pmdm__StartDate__c:'', pmdm__EndDate__c:'', Cohort_Capacity__c:'', pmdm__Description__c:'' });
      setShowCohortForm(false);
    } catch (e) {
      toast({ title: 'Failed to create cohort', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function handleAdvanceToStep3() {
    if (!selectedProgram) return;
    void loadCourses(selectedProgram.Id);
    setStep(3);
  }

  // ── Step 3 actions ────────────────────────────────────────────────────────────
  async function handleCreateCourse() {
    if (!courseForm.Name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(courseForm).filter(([, v]) => v !== ''));
      const resp = await fetch('/api/courses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json() as { id?: string; error?: string };
      if (!resp.ok || !data.id) throw new Error(data.error ?? 'Create failed');
      toast({ title: '✓ Course created in Salesforce' });
      const newCourse: SfCourse = {
        Id: data.id, Name: courseForm.Name, Course_Title__c: courseForm.Course_Title__c || null,
        Status__c: courseForm.Status__c, Program__c: courseForm.Program__c || null,
        Overview__c: courseForm.Overview__c || null, Learning_Goals__c: courseForm.Learning_Goals__c || null,
        Estimated_Start_Date__c: courseForm.Estimated_Start_Date__c || null,
        Estimated_End_Date__c: courseForm.Estimated_End_Date__c || null,
      };
      setCourses(prev => [newCourse, ...prev]);
      selectCourse(newCourse);
      setShowCourseForm(false);
    } catch (e) {
      toast({ title: 'Failed to create course', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  /** Select a course and immediately pre-load its modules. */
  function selectCourse(course: SfCourse) {
    setSelectedCourse(course);
    void loadModules(course.Id);
  }

  async function loadAllLmsCourses() {
    setAllLmsLoading(true);
    try {
      const resp = await fetch('/api/lms/courses');
      if (!resp.ok) throw new Error('Failed to load courses');
      const data = await resp.json() as { courses: SfCourse[] };
      setAllLmsCourses(data.courses ?? []);
    } catch {
      toast({ title: 'Could not load all courses', variant: 'destructive' });
    } finally {
      setAllLmsLoading(false);
    }
  }

  async function handleLinkExistingCourse(course: SfCourse) {
    if (!selectedProgram) return;
    setSaving(true);
    try {
      const resp = await fetch(`/api/courses/${course.Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Program__c: selectedProgram.Name }),
      });
      if (!resp.ok) throw new Error('Update failed');
      const linked: SfCourse = { ...course, Program__c: selectedProgram.Name };
      setCourses(prev => [linked, ...prev.filter(c => c.Id !== course.Id)]);
      selectCourse(linked);
      setShowLinkForm(false);
      setLinkSearch('');
      toast({ title: `✓ Linked "${course.Course_Title__c ?? course.Name}" to ${selectedProgram.Name}` });
    } catch (e) {
      toast({ title: 'Failed to link course', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function handleAdvanceToStep4() {
    if (!selectedCourse) { toast({ title: 'Select or create a course first', variant: 'destructive' }); return; }
    // modules are pre-loaded by selectCourse(); only reload if nothing was fetched yet
    if (modules.length === 0) void loadModules(selectedCourse.Id);
    setStep(4);
  }

  // ── Step 4 actions ────────────────────────────────────────────────────────────
  async function handleCreateModule() {
    if (!moduleForm.Name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    if (!selectedCourse) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = Object.fromEntries(
        Object.entries(moduleForm).filter(([, v]) => v !== '')
      );
      if (moduleForm.Order__c) payload['Order__c'] = Number(moduleForm.Order__c);
      const resp = await fetch(`/api/courses/${selectedCourse.Id}/modules`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json() as { id?: string; error?: string };
      if (!resp.ok || !data.id) throw new Error(data.error ?? 'Create failed');
      toast({ title: '✓ Module created in Salesforce' });
      const newModule: SfModule = {
        Id: data.id, Name: moduleForm.Name, Status__c: moduleForm.Status__c,
        Mission_Brief__c: moduleForm.Mission_Brief__c || null,
        Core_Concepts__c: moduleForm.Core_Concepts__c || null,
        Trail_Tools__c: moduleForm.Trail_Tools__c || null,
        Reflection_Prompt__c: moduleForm.Reflection_Prompt__c || null,
        Trail_Talk_Prompts__c: moduleForm.Trail_Talk_Prompts__c || null,
        Order__c: moduleForm.Order__c ? Number(moduleForm.Order__c) : null,
      };
      setModules(prev => [...prev, newModule].sort((a, b) => (a.Order__c ?? 99) - (b.Order__c ?? 99)));
      setModuleForm({ Name:'', Status__c:'Not Started', Mission_Brief__c:'', Core_Concepts__c:'', Trail_Tools__c:'', Reflection_Prompt__c:'', Trail_Talk_Prompts__c:'', Order__c:'' });
      setShowModuleForm(false);
    } catch (e) {
      toast({ title: 'Failed to create module', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // ── Agentforce invoke ─────────────────────────────────────────────────────────
  async function handleInvokeAgentforce() {
    if (!selectedProgram) { toast({ title: 'No program selected', variant: 'destructive' }); return; }
    setAgentforceLoading(true);
    toast({ title: `Invoking Agentforce for "${selectedProgram.Name}"…` });
    try {
      const resp = await fetch(`/api/programs/${selectedProgram.Id}/agentforce`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programContext: {
            programName: selectedProgram.Name,
            status: selectedProgram.pmdm__Status__c,
            cohortCount: cohorts.length,
            courseName: selectedCourse?.Name,
            moduleCount: modules.length,
          },
        }),
      });
      const data = await resp.json() as { reply?: string; error?: string };
      const reply = data.reply ?? data.error ?? 'No response from Agentforce.';
      setPendingPennyQuery(`Agentforce response for "${selectedProgram.Name}":\n\n${reply}`);
      setAskPennyOpen(true);
      if (!resp.ok) throw new Error(data.error);
    } catch (e) {
      toast({ title: 'Agentforce error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setAgentforceLoading(false);
    }
  }

  // ── Filtered programs ─────────────────────────────────────────────────────────
  const STATUS_GROUPS = {
    discovery: ['In Discovery', 'Discovery', 'Planned', 'Not Started', 'In Review'],
    active:    ['Active', 'In Progress'],
    archived:  ['Completed', 'Canceled', 'Cancelled', 'On Hold'],
  };
  const filteredPrograms = programs.filter(p => {
    const status = p.pmdm__Status__c ?? '';
    if (statusFilter === 'discovery' && !STATUS_GROUPS.discovery.includes(status)) return false;
    if (statusFilter === 'active'    && !STATUS_GROUPS.active.includes(status))    return false;
    if (statusFilter === 'archived'  && !STATUS_GROUPS.archived.includes(status))  return false;
    if (progSearch.trim() && !p.Name.toLowerCase().includes(progSearch.toLowerCase())) return false;
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Page header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/program')}
              className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground mb-1 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Programs
            </button>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
              Programs
            </p>
            <h1 className="text-base font-semibold text-foreground">Program Configuration</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Configure Salesforce Programs, Cohorts, Courses &amp; Modules — guided by {TERMS.aiAssistant}
            </p>
          </div>
          {step !== 1 && (
            <button
              onClick={() => { setStep(1); setSelectedProgram(null); setCohorts([]); setCourses([]); setModules([]); setSelectedCourse(null); }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted/40 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Start over
            </button>
          )}
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* ── LEFT: Wizard ─────────────────────────────────────────────────── */}
        <div className="flex flex-col w-[60%] overflow-hidden border-r border-border">
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6">
              <StepIndicator
                current={step}
                skipCohorts={!isCohortBased}
                onStepClick={selectedProgram ? goToStep : undefined}
              />

              {/* ── Step 1: Program ───────────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">Select or Create a Program</h2>
                    <button
                      onClick={() => {
                        setShowProgramForm(v => {
                          if (!v) {
                            // Opening — reset to blank so we never inherit a selected program's data
                            setProgForm({
                              Name: '', pmdm__Status__c: 'In Discovery', pmdm__ShortSummary__c: '',
                              pmdm__Description__c: '', pmdm__StartDate__c: '', pmdm__EndDate__c: '',
                              pmdm__TargetPopulation__c: '', Program_Goals__c: '', Problem_Statement__c: '',
                              Program_Manager__c: '',
                            });
                          }
                          return !v;
                        });
                      }}
                      className="flex items-center gap-1.5 text-[11px] bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Create New
                    </button>
                  </div>

                  {showProgramForm && (
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                      <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">New Program</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Program Name" required>
                          <input className={INPUT_CLS} value={progForm.Name} onChange={e => setProgForm(p => ({...p, Name: e.target.value}))} placeholder="e.g. The Guided Trail 2026" />
                        </Field>
                        <Field label="Status">
                          <select className={SELECT_CLS} value={progForm.pmdm__Status__c} onChange={e => setProgForm(p => ({...p, pmdm__Status__c: e.target.value}))}>
                            {PROGRAM_STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </Field>
                        <Field label="Start Date">
                          <input type="date" className={INPUT_CLS} value={progForm.pmdm__StartDate__c} onChange={e => setProgForm(p => ({...p, pmdm__StartDate__c: e.target.value}))} />
                        </Field>
                        <Field label="End Date">
                          <input type="date" className={INPUT_CLS} value={progForm.pmdm__EndDate__c} onChange={e => setProgForm(p => ({...p, pmdm__EndDate__c: e.target.value}))} />
                        </Field>
                        <Field label="Program Manager">
                          <input className={INPUT_CLS} value={progForm.Program_Manager__c} onChange={e => setProgForm(p => ({...p, Program_Manager__c: e.target.value}))} placeholder="User name or ID" />
                        </Field>
                        <Field label="Target Population">
                          <input className={INPUT_CLS} value={progForm.pmdm__TargetPopulation__c} onChange={e => setProgForm(p => ({...p, pmdm__TargetPopulation__c: e.target.value}))} placeholder="Who does this serve?" />
                        </Field>
                      </div>
                      <Field label="Short Summary">
                        <textarea rows={2} className={TEXTAREA_CLS} value={progForm.pmdm__ShortSummary__c} onChange={e => setProgForm(p => ({...p, pmdm__ShortSummary__c: e.target.value}))} placeholder="One-line description" />
                      </Field>
                      <Field label="Program Goals">
                        <textarea rows={6} className={TEXTAREA_CLS} value={progForm.Program_Goals__c} onChange={e => setProgForm(p => ({...p, Program_Goals__c: e.target.value}))} placeholder="What outcomes does this program aim to achieve?" />
                      </Field>
                      <Field label="Problem Statement">
                        <textarea rows={4} className={TEXTAREA_CLS} value={progForm.Problem_Statement__c} onChange={e => setProgForm(p => ({...p, Problem_Statement__c: e.target.value}))} placeholder="What problem is this program solving?" />
                      </Field>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => void handleCreateProgram()} disabled={saving}
                          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-[12px] font-semibold rounded-lg px-4 py-2 hover:bg-primary/90 disabled:opacity-50 transition-colors">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Save to Salesforce
                        </button>
                        <button onClick={() => setShowProgramForm(false)} className="text-[12px] text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Program list — detail panel expands inline after selected card */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        className={INPUT_CLS + " max-w-xs"}
                        placeholder="Search programs…"
                        value={progSearch}
                        onChange={e => setProgSearch(e.target.value)}
                      />
                      <button onClick={() => void loadPrograms()} className="text-[11px] text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted/40">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <div className="ml-auto flex items-center gap-1">
                        {([
                          { key: 'all',       label: 'All' },
                          { key: 'discovery', label: 'Discovery' },
                          { key: 'active',    label: 'Active' },
                          { key: 'archived',  label: 'Completed / Cancelled' },
                        ] as const).map(f => (
                          <button
                            key={f.key}
                            onClick={() => setStatusFilter(f.key)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                              statusFilter === f.key
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:bg-muted/40'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {programsLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-[12px]">Loading from Salesforce…</span>
                      </div>
                    ) : filteredPrograms.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-border rounded-xl">
                        <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-[12px] text-muted-foreground">No programs found. Create one above or check your Salesforce connection.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {filteredPrograms.map(p => {
                          const isSelected = selectedProgram?.Id === p.Id;
                          return (
                            <div key={p.Id}>
                              <ProgramCard
                                p={p}
                                selected={isSelected}
                                onClick={() => handleSelectProgram(p)}
                              />

                              {/* ── Inline detail / edit panel ── */}
                              {isSelected && (
                                <div ref={detailPanelRef} className="mt-1 rounded-xl border-2 border-primary/30 bg-card overflow-hidden">
                                  {/* Panel header */}
                                  <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-b border-primary/20">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-primary" />
                                      <p className="text-[12px] font-semibold text-foreground">{p.Name}</p>
                                      <StatusBadge status={p.pmdm__Status__c} />
                                    </div>
                                    <button
                                      onClick={() => setEditingProgram(v => !v)}
                                      className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                                        editingProgram
                                          ? 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                                          : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                                      }`}
                                    >
                                      {editingProgram ? <><Eye className="w-3 h-3" /> View</> : <><Pencil className="w-3 h-3" /> Edit</>}
                                    </button>
                                  </div>

                                  {/* Loading */}
                                  {programDetailLoading && (
                                    <div className="flex items-center gap-2 justify-center py-5 text-muted-foreground">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span className="text-[12px]">Loading fields from Salesforce…</span>
                                    </div>
                                  )}

                                  {/* View mode */}
                                  {!programDetailLoading && !editingProgram && programDetail && (
                                    <div className="p-4 space-y-4">
                                      {(() => {
                                        function sfStr(v: unknown): string | null {
                                          if (v == null) return null;
                                          const s = String(v);
                                          return (s === '' || s === 'null' || s === 'undefined') ? null : s;
                                        }
                                        const rows: { label: string; val: string | null }[] = [
                                          { label: 'Status',            val: sfStr(programDetail['pmdm__Status__c']) },
                                          { label: 'Manager',           val: sfStr(programDetail['Program_Manager_Name']) ?? sfStr(programDetail['Program_Manager__c']) },
                                          { label: 'Start Date',        val: sfStr(programDetail['pmdm__StartDate__c']) },
                                          { label: 'End Date',          val: sfStr(programDetail['pmdm__EndDate__c']) },
                                          { label: 'Target Population', val: sfStr(programDetail['pmdm__TargetPopulation__c']) },
                                          { label: 'Requires Payment',  val: sfStr(programDetail['Requires_Payment__c']) },
                                        ];
                                        const textRows: { label: string; key: string }[] = [
                                          { label: 'Short Summary',            key: 'pmdm__ShortSummary__c' },
                                          { label: 'Description',              key: 'pmdm__Description__c' },
                                          { label: 'Program Goals',            key: 'Program_Goals__c' },
                                          { label: 'Problem Statement',        key: 'Problem_Statement__c' },
                                          { label: 'Target Audience',          key: 'Program_Target_Audience__c' },
                                          { label: 'Expected Outcomes',        key: 'Program_Expected_Outcomes__c' },
                                          { label: 'Program Structure',        key: 'Program_Structure__c' },
                                          { label: 'Implementation Plan',      key: 'Implementation_Plan__c' },
                                          { label: 'Success Metrics',          key: 'Success_Metrics_Evaluation_Plan__c' },
                                          { label: 'Risks & Assumptions',      key: 'Risks_Assumptions__c' },
                                          { label: 'Budget & Resources',       key: 'Budget_Resouces__c' },
                                          { label: 'Funding Strategy',         key: 'Funding_Strategy__c' },
                                          { label: 'Partnership Opportunities',key: 'Partnership_Opportunities__c' },
                                        ];
                                        const driveUrl = sfStr(programDetail['Google_Drive_Folder__c']);
                                        const canvaUrl = sfStr(programDetail['Canva_Folder__c']);
                                        return (
                                          <>
                                            {/* Metadata card */}
                                            <div className="rounded-lg bg-muted/30 border border-border/50 p-4 grid grid-cols-2 gap-x-6 gap-y-4">
                                              {rows.map(({ label, val }) => (
                                                <div key={label}>
                                                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">{label}</p>
                                                  {label === 'Status' ? (
                                                    <StatusBadge status={val} />
                                                  ) : (
                                                    <p className="text-[12px] text-foreground font-medium">
                                                      {val ?? <span className="text-muted-foreground/40 italic font-normal">—</span>}
                                                    </p>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                            {/* Rich-text content sections */}
                                            {textRows.map(({ label, key }) => {
                                              const val = sfStr(programDetail[key]);
                                              if (!val) return null;
                                              const isHtml = /<[a-z][\s\S]*>/i.test(val);
                                              return (
                                                <div key={key} className="pt-3 border-t border-border/40">
                                                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">{label}</p>
                                                  {isHtml ? (
                                                    <div
                                                      className="prose prose-sm max-w-none text-[12px] text-foreground [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_li]:text-[12px] [&_strong]:font-semibold [&_em]:italic [&_p]:mb-1.5 [&_p:last-child]:mb-0"
                                                      dangerouslySetInnerHTML={{ __html: val }}
                                                    />
                                                  ) : (
                                                    <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">{val}</p>
                                                  )}
                                                </div>
                                              );
                                            })}
                                            {(driveUrl ?? canvaUrl) && (
                                              <div className="flex gap-3 pt-1 border-t border-border/50">
                                                {driveUrl && (
                                                  <a href={driveUrl} target="_blank" rel="noreferrer"
                                                    className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                                                    <ExternalLink className="w-3 h-3" /> Google Drive
                                                  </a>
                                                )}
                                                {canvaUrl && (
                                                  <a href={canvaUrl} target="_blank" rel="noreferrer"
                                                    className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                                                    <ExternalLink className="w-3 h-3" /> Canva Folder
                                                  </a>
                                                )}
                                              </div>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {/* Edit mode */}
                                  {!programDetailLoading && editingProgram && (
                                    <div className="p-4 space-y-3">
                                      <div className="grid grid-cols-2 gap-3">
                                        <Field label="Status">
                                          <select className={SELECT_CLS} value={progForm.pmdm__Status__c} onChange={e => setProgForm(prev => ({...prev, pmdm__Status__c: e.target.value}))}>
                                            {PROGRAM_STATUSES.map(s => <option key={s}>{s}</option>)}
                                          </select>
                                        </Field>
                                        <Field label="Program Manager">
                                          <input className={INPUT_CLS} value={progForm.Program_Manager__c} onChange={e => setProgForm(prev => ({...prev, Program_Manager__c: e.target.value}))} placeholder="User name or ID" />
                                        </Field>
                                        <Field label="Start Date">
                                          <input type="date" className={INPUT_CLS} value={progForm.pmdm__StartDate__c} onChange={e => setProgForm(prev => ({...prev, pmdm__StartDate__c: e.target.value}))} />
                                        </Field>
                                        <Field label="End Date">
                                          <input type="date" className={INPUT_CLS} value={progForm.pmdm__EndDate__c} onChange={e => setProgForm(prev => ({...prev, pmdm__EndDate__c: e.target.value}))} />
                                        </Field>
                                        <Field label="Target Population">
                                          <input className={INPUT_CLS} value={progForm.pmdm__TargetPopulation__c} onChange={e => setProgForm(prev => ({...prev, pmdm__TargetPopulation__c: e.target.value}))} />
                                        </Field>
                                      </div>
                                      <Field label="Short Summary">
                                        <textarea rows={2} className={TEXTAREA_CLS} value={progForm.pmdm__ShortSummary__c} onChange={e => setProgForm(prev => ({...prev, pmdm__ShortSummary__c: e.target.value}))} />
                                      </Field>
                                      <Field label="Program Goals">
                                        <textarea rows={6} className={TEXTAREA_CLS} value={progForm.Program_Goals__c} onChange={e => setProgForm(prev => ({...prev, Program_Goals__c: e.target.value}))} />
                                      </Field>
                                      <Field label="Problem Statement">
                                        <textarea rows={4} className={TEXTAREA_CLS} value={progForm.Problem_Statement__c} onChange={e => setProgForm(prev => ({...prev, Problem_Statement__c: e.target.value}))} />
                                      </Field>
                                      <div className="flex gap-2 pt-1">
                                        <button onClick={() => void handleUpdateProgram()} disabled={saving}
                                          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-[12px] font-semibold rounded-lg px-4 py-2 hover:bg-primary/90 disabled:opacity-50 transition-colors">
                                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                          Save Changes to Salesforce
                                        </button>
                                        <button onClick={() => setEditingProgram(false)} className="text-[12px] text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Penny status */}
                                  <PennyStatusRow programId={p.Id} />

                                  {/* Cohort toggle + Next */}
                                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
                                    <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
                                      <button
                                        onClick={() => setIsCohortBased(true)}
                                        className={`text-[11px] font-medium px-3 py-1 rounded-md transition-all ${
                                          isCohortBased
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        Cohort-based
                                      </button>
                                      <button
                                        onClick={() => setIsCohortBased(false)}
                                        className={`text-[11px] font-medium px-3 py-1 rounded-md transition-all ${
                                          !isCohortBased
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        Ongoing
                                      </button>
                                    </div>
                                    <button onClick={handleAdvanceFromStep1}
                                      className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors">
                                      {isCohortBased ? 'Next: Configure Cohorts' : 'Next: Configure Course'}
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 2: Cohorts ───────────────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Cohorts</h2>
                      <p className="text-[11px] text-muted-foreground mt-0.5">for {selectedProgram?.Name}</p>
                    </div>
                    <button onClick={() => setShowCohortForm(v => !v)}
                      className="flex items-center gap-1.5 text-[11px] bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:bg-primary/90 transition-colors">
                      <Plus className="w-3 h-3" /> Add Cohort
                    </button>
                  </div>

                  {showCohortForm && (
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                      <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">New Cohort</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Cohort Name" required>
                          <input className={INPUT_CLS} value={cohortForm.Name} onChange={e => setCohortForm(p => ({...p, Name: e.target.value}))} placeholder="e.g. Fall 2026 Cohort" />
                        </Field>
                        <Field label="Status">
                          <select className={SELECT_CLS} value={cohortForm.pmdm__Status__c} onChange={e => setCohortForm(p => ({...p, pmdm__Status__c: e.target.value}))}>
                            {COHORT_STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </Field>
                        <Field label="Start Date">
                          <input type="date" className={INPUT_CLS} value={cohortForm.pmdm__StartDate__c} onChange={e => setCohortForm(p => ({...p, pmdm__StartDate__c: e.target.value}))} />
                        </Field>
                        <Field label="End Date">
                          <input type="date" className={INPUT_CLS} value={cohortForm.pmdm__EndDate__c} onChange={e => setCohortForm(p => ({...p, pmdm__EndDate__c: e.target.value}))} />
                        </Field>
                        <Field label="Capacity" hint="Max number of participants">
                          <input type="number" className={INPUT_CLS} value={cohortForm.Cohort_Capacity__c} onChange={e => setCohortForm(p => ({...p, Cohort_Capacity__c: e.target.value}))} placeholder="e.g. 20" min={1} />
                        </Field>
                      </div>
                      <Field label="Description">
                        <textarea rows={2} className={TEXTAREA_CLS} value={cohortForm.pmdm__Description__c} onChange={e => setCohortForm(p => ({...p, pmdm__Description__c: e.target.value}))} placeholder="Cohort description or notes" />
                      </Field>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => void handleCreateCohort()} disabled={saving}
                          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-[12px] font-semibold rounded-lg px-4 py-2 hover:bg-primary/90 disabled:opacity-50 transition-colors">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Save Cohort
                        </button>
                        <button onClick={() => setShowCohortForm(false)} className="text-[12px] text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}

                  {cohortsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-[12px]">Loading cohorts…</span>
                    </div>
                  ) : cohorts.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-border rounded-xl">
                      <p className="text-[12px] text-muted-foreground">No cohorts yet. Add one above.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cohorts.map(c => (
                        <div key={c.Id} className="rounded-lg border border-border bg-card p-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-semibold text-foreground">{c.Name}</p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <StatusBadge status={c.pmdm__Status__c} />
                              {c.pmdm__StartDate__c && <span className="text-[10px] text-muted-foreground">Start: {c.pmdm__StartDate__c}</span>}
                              {c.pmdm__EndDate__c && <span className="text-[10px] text-muted-foreground">End: {c.pmdm__EndDate__c}</span>}
                              {c.Cohort_Capacity__c !== null && <span className="text-[10px] text-muted-foreground">Cap: {c.Cohort_Capacity__c}</span>}
                            </div>
                            {c.pmdm__Description__c && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{c.pmdm__Description__c}</p>}
                          </div>
                          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-emerald-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button onClick={() => setStep(1)} className="text-[12px] text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">← Back</button>
                    <button onClick={handleAdvanceToStep3}
                      className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors">
                      Next: Link Course <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Course ────────────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Link or Create Course</h2>
                      <p className="text-[11px] text-muted-foreground mt-0.5">for {selectedProgram?.Name}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setShowLinkForm(v => !v);
                          setShowCourseForm(false);
                          if (!showLinkForm && allLmsCourses.length === 0) void loadAllLmsCourses();
                        }}
                        className="flex items-center gap-1.5 text-[11px] border border-border bg-background text-foreground rounded-lg px-3 py-1.5 hover:border-primary/40 hover:bg-primary/[0.02] transition-colors">
                        <Link2 className="w-3 h-3" /> Link Existing
                      </button>
                      <button
                        onClick={() => { setShowCourseForm(v => !v); setShowLinkForm(false); }}
                        className="flex items-center gap-1.5 text-[11px] bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:bg-primary/90 transition-colors">
                        <Plus className="w-3 h-3" /> Create New
                      </button>
                    </div>
                  </div>

                  {/* ── Link existing course picker ────────────────────────── */}
                  {showLinkForm && (
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                      <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">Link an Existing Course</p>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <input
                          className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                          placeholder="Search courses…"
                          value={linkSearch}
                          onChange={e => setLinkSearch(e.target.value)}
                        />
                      </div>
                      {allLmsLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-3 justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" /><span className="text-[12px]">Loading all courses…</span>
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-52 overflow-y-auto">
                          {(() => {
                            const linkedIds = new Set(courses.map(c => c.Id));
                            const q = linkSearch.toLowerCase();
                            const filtered = allLmsCourses.filter(c =>
                              !linkedIds.has(c.Id) &&
                              (!q || (c.Course_Title__c ?? c.Name).toLowerCase().includes(q) || c.Name.toLowerCase().includes(q))
                            );
                            if (filtered.length === 0) {
                              return (
                                <p className="text-[11px] text-muted-foreground text-center py-3">
                                  {linkSearch ? 'No matches.' : 'All courses are already linked or none available.'}
                                </p>
                              );
                            }
                            return filtered.map(c => (
                              <button
                                key={c.Id}
                                onClick={() => void handleLinkExistingCourse(c)}
                                disabled={saving}
                                className="group w-full text-left flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 hover:border-primary/50 hover:bg-primary/[0.03] transition-colors disabled:opacity-50"
                              >
                                <BookOpen className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-medium text-foreground truncate">{c.Course_Title__c ?? c.Name}</p>
                                  {c.Course_Title__c && <p className="text-[10px] text-muted-foreground truncate">{c.Name}</p>}
                                </div>
                                {c.Status__c && (
                                  <span className="text-[9px] font-semibold border rounded px-1.5 py-0.5 shrink-0 bg-muted text-muted-foreground border-border">
                                    {c.Status__c}
                                  </span>
                                )}
                                <Link2 className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                      <button onClick={() => { setShowLinkForm(false); setLinkSearch(''); }} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  )}

                  {showCourseForm && (
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                      <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">New Course</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Course Name (API)" required>
                          <input className={INPUT_CLS} value={courseForm.Name} onChange={e => setCourseForm(p => ({...p, Name: e.target.value}))} placeholder="e.g. GuidedTrail_2026_Core" />
                        </Field>
                        <Field label="Course Title">
                          <input className={INPUT_CLS} value={courseForm.Course_Title__c} onChange={e => setCourseForm(p => ({...p, Course_Title__c: e.target.value}))} placeholder="Human-readable title" />
                        </Field>
                        <Field label="Status">
                          <select className={SELECT_CLS} value={courseForm.Status__c} onChange={e => setCourseForm(p => ({...p, Status__c: e.target.value}))}>
                            {COURSE_STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </Field>
                        <Field label="Program" hint="Maps to program picklist in LMS">
                          <select className={SELECT_CLS} value={courseForm.Program__c} onChange={e => setCourseForm(p => ({...p, Program__c: e.target.value}))}>
                            <option value="">— select —</option>
                            {PROGRAM_PICKLIST.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </Field>
                        <Field label="Estimated Start Date">
                          <input type="date" className={INPUT_CLS} value={courseForm.Estimated_Start_Date__c} onChange={e => setCourseForm(p => ({...p, Estimated_Start_Date__c: e.target.value}))} />
                        </Field>
                        <Field label="Estimated End Date">
                          <input type="date" className={INPUT_CLS} value={courseForm.Estimated_End_Date__c} onChange={e => setCourseForm(p => ({...p, Estimated_End_Date__c: e.target.value}))} />
                        </Field>
                      </div>
                      <Field label="Overview">
                        <textarea rows={2} className={TEXTAREA_CLS} value={courseForm.Overview__c} onChange={e => setCourseForm(p => ({...p, Overview__c: e.target.value}))} placeholder="Course overview" />
                      </Field>
                      <Field label="Learning Goals">
                        <textarea rows={2} className={TEXTAREA_CLS} value={courseForm.Learning_Goals__c} onChange={e => setCourseForm(p => ({...p, Learning_Goals__c: e.target.value}))} placeholder="What will learners be able to do?" />
                      </Field>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => void handleCreateCourse()} disabled={saving}
                          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-[12px] font-semibold rounded-lg px-4 py-2 hover:bg-primary/90 disabled:opacity-50 transition-colors">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Save Course
                        </button>
                        <button onClick={() => setShowCourseForm(false)} className="text-[12px] text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}

                  {coursesLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-[12px]">Loading courses…</span>
                    </div>
                  ) : courses.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-border rounded-xl">
                      <p className="text-[12px] text-muted-foreground">No linked courses found. Create one above.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {courses.map(c => (
                        <button key={c.Id} onClick={() => selectCourse(c)}
                          className={`w-full text-left rounded-xl border-2 p-3 transition-all ${
                            selectedCourse?.Id === c.Id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card'
                          }`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-semibold text-foreground">{c.Course_Title__c ?? c.Name}</p>
                            <StatusBadge status={c.Status__c} />
                          </div>
                          {c.Overview__c && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{c.Overview__c}</p>}
                          {selectedCourse?.Id === c.Id && (
                            <div className="flex items-center gap-1 mt-1.5 text-primary">
                              <Check className="w-3 h-3" /><span className="text-[10px] font-semibold">Selected</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button onClick={() => goToStep(isCohortBased ? 2 : 1)} className="text-[12px] text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">← Back</button>
                    <button onClick={handleAdvanceToStep4}
                      className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors">
                      Next: Add Modules <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 4: Modules ───────────────────────────────────────── */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Modules</h2>
                      <p className="text-[11px] text-muted-foreground mt-0.5">for {selectedCourse?.Course_Title__c ?? selectedCourse?.Name}</p>
                    </div>
                    <button onClick={() => setShowModuleForm(v => !v)}
                      className="flex items-center gap-1.5 text-[11px] bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:bg-primary/90 transition-colors">
                      <Plus className="w-3 h-3" /> Add Module
                    </button>
                  </div>

                  {showModuleForm && (
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                      <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">New Module</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Module Name" required>
                          <input className={INPUT_CLS} value={moduleForm.Name} onChange={e => setModuleForm(p => ({...p, Name: e.target.value}))} placeholder="e.g. Module 1: Career Clarity" />
                        </Field>
                        <Field label="Status">
                          <select className={SELECT_CLS} value={moduleForm.Status__c} onChange={e => setModuleForm(p => ({...p, Status__c: e.target.value}))}>
                            {MODULE_STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </Field>
                        <Field label="Order" hint="Display sequence">
                          <input type="number" className={INPUT_CLS} value={moduleForm.Order__c} onChange={e => setModuleForm(p => ({...p, Order__c: e.target.value}))} placeholder="1" min={1} />
                        </Field>
                      </div>
                      <Field label="Mission Brief" hint="The module's purpose in one sentence">
                        <textarea rows={2} className={TEXTAREA_CLS} value={moduleForm.Mission_Brief__c} onChange={e => setModuleForm(p => ({...p, Mission_Brief__c: e.target.value}))} placeholder="What is this module's mission?" />
                      </Field>
                      <Field label="Core Concepts">
                        <textarea rows={2} className={TEXTAREA_CLS} value={moduleForm.Core_Concepts__c} onChange={e => setModuleForm(p => ({...p, Core_Concepts__c: e.target.value}))} placeholder="Key concepts covered in this module" />
                      </Field>
                      <Field label="Trail Tools">
                        <textarea rows={2} className={TEXTAREA_CLS} value={moduleForm.Trail_Tools__c} onChange={e => setModuleForm(p => ({...p, Trail_Tools__c: e.target.value}))} placeholder="Tools, templates, or resources used" />
                      </Field>
                      <Field label="Reflection Prompt">
                        <textarea rows={2} className={TEXTAREA_CLS} value={moduleForm.Reflection_Prompt__c} onChange={e => setModuleForm(p => ({...p, Reflection_Prompt__c: e.target.value}))} placeholder="What should learners reflect on after this module?" />
                      </Field>
                      <Field label="Trail Talk Prompts" hint="Discussion or coaching prompts">
                        <textarea rows={2} className={TEXTAREA_CLS} value={moduleForm.Trail_Talk_Prompts__c} onChange={e => setModuleForm(p => ({...p, Trail_Talk_Prompts__c: e.target.value}))} placeholder="Group discussion or coaching questions" />
                      </Field>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => void handleCreateModule()} disabled={saving}
                          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-[12px] font-semibold rounded-lg px-4 py-2 hover:bg-primary/90 disabled:opacity-50 transition-colors">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Save Module
                        </button>
                        <button onClick={() => setShowModuleForm(false)} className="text-[12px] text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}

                  {modulesLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-[12px]">Loading modules…</span>
                    </div>
                  ) : modules.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-border rounded-xl">
                      <p className="text-[12px] text-muted-foreground">No modules yet. Add your first module above.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {modules.map((m, idx) => (
                        <div key={m.Id} className="rounded-lg border border-border bg-card p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                {m.Order__c ?? idx + 1}
                              </span>
                              <p className="text-[13px] font-semibold text-foreground">{m.Name}</p>
                            </div>
                            <StatusBadge status={m.Status__c} />
                          </div>
                          {m.Mission_Brief__c && (
                            <p className="text-[11px] text-muted-foreground mt-1.5 ml-7 line-clamp-2">{m.Mission_Brief__c}</p>
                          )}
                          {m.Core_Concepts__c && (
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5 ml-7 line-clamp-1">Concepts: {m.Core_Concepts__c}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button onClick={() => setStep(3)} className="text-[12px] text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">← Back</button>
                    <button onClick={() => setStep('review')}
                      className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors">
                      Review &amp; Save <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Review ────────────────────────────────────────────────── */}
              {step === 'review' && (() => {
                const reviewChecks: { label: string; detail?: string; ok: boolean; required: boolean; step: 1|2|3|4 }[] = [
                  {
                    label: 'Program selected',
                    detail: selectedProgram?.Name,
                    ok: !!selectedProgram,
                    required: true,
                    step: 1,
                  },
                  {
                    label: isCohortBased ? 'Cohorts configured' : 'Ongoing program — no cohorts',
                    detail: isCohortBased ? `${cohorts.length} cohort${cohorts.length !== 1 ? 's' : ''}` : undefined,
                    ok: !isCohortBased || cohorts.length > 0,
                    required: isCohortBased,
                    step: 2,
                  },
                  {
                    label: 'Course linked',
                    detail: selectedCourse?.Course_Title__c ?? selectedCourse?.Name,
                    ok: !!selectedCourse,
                    required: true,
                    step: 3,
                  },
                  {
                    label: 'Modules added',
                    detail: `${modules.length} module${modules.length !== 1 ? 's' : ''}`,
                    ok: modules.length > 0,
                    required: false,
                    step: 4,
                  },
                ];
                const canSave = reviewChecks.filter(c => c.required).every(c => c.ok);
                return (
                  <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-foreground">Review Your Configuration</h2>

                    {/* Validation checklist */}
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">Configuration Checklist</p>
                      {reviewChecks.map(chk => (
                        <div key={chk.label} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${
                              chk.ok
                                ? 'bg-emerald-100 text-emerald-600'
                                : chk.required
                                  ? 'bg-rose-100 text-rose-600'
                                  : 'bg-amber-100 text-amber-600'
                            }`}>
                              {chk.ok
                                ? <Check className="w-2.5 h-2.5" />
                                : <span className="text-[9px] font-bold leading-none">!</span>}
                            </div>
                            <span className="text-[12px] font-medium text-foreground truncate">{chk.label}</span>
                            {chk.detail && (
                              <span className="text-[11px] text-muted-foreground truncate">— {chk.detail}</span>
                            )}
                          </div>
                          {!chk.ok && !(chk.step === 2 && !isCohortBased) && (
                            <button
                              onClick={() => goToStep(chk.step)}
                              className="text-[11px] text-primary hover:underline flex-shrink-0"
                            >
                              Fix →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Cohort summary */}
                    {cohorts.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">Cohorts</p>
                          <button onClick={() => goToStep(2)} className="text-[11px] text-primary hover:underline">Edit →</button>
                        </div>
                        <div className="space-y-1.5">
                          {cohorts.map(c => (
                            <div key={c.Id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2">
                              <p className="text-[12px] font-medium text-foreground">{c.Name}</p>
                              <StatusBadge status={c.pmdm__Status__c} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Course summary */}
                    {selectedCourse && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">Course</p>
                          <button onClick={() => goToStep(3)} className="text-[11px] text-primary hover:underline">Edit →</button>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-card px-3 py-2 flex items-center justify-between">
                          <p className="text-[12px] font-medium text-foreground">
                            {selectedCourse.Course_Title__c ?? selectedCourse.Name}
                          </p>
                          <StatusBadge status={selectedCourse.Status__c} />
                        </div>
                      </div>
                    )}

                    {/* Module summary */}
                    {modules.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">Modules</p>
                          <button onClick={() => goToStep(4)} className="text-[11px] text-primary hover:underline">Edit →</button>
                        </div>
                        <div className="space-y-1.5">
                          {modules.map((m, idx) => (
                            <div key={m.Id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground w-4">{m.Order__c ?? idx + 1}</span>
                                <p className="text-[12px] font-medium text-foreground">{m.Name}</p>
                              </div>
                              <StatusBadge status={m.Status__c} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                      <button onClick={() => setStep(4)} className="text-[12px] text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">← Back</button>
                      <div className="flex-1" />
                      {canSave ? (
                        <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> All records saved to Salesforce as you went
                        </p>
                      ) : (
                        <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                          <span className="w-3.5 h-3.5 rounded-full bg-rose-100 inline-flex items-center justify-center text-[9px] font-bold">!</span>
                          Fix required items above to complete
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </ScrollArea>
        </div>

        {/* ── RIGHT: Penny guidance ─────────────────────────────────────────── */}
        <div className="flex flex-col w-[40%] overflow-hidden">
          <PennyGuidancePanel
            step={step}
            program={selectedProgram}
            programDetail={programDetail}
            onFocusWithPenny={() => {
              setPendingPennyQuery(
                pendingPennyPrompt.current ??
                `I'm configuring the program "${selectedProgram?.Name ?? 'unknown'}". ${STEP_CONTEXT[step]}`
              );
              pendingPennyPrompt.current = null;
              setAskPennyOpen(true);
            }}
            onInvokeAgentforce={step === 'review' ? () => void handleInvokeAgentforce() : undefined}
            agentforceLoading={agentforceLoading}
          />
        </div>
      </div>
    </div>
  );
}
