/**
 * ProgramConfiguration — Admin wizard for configuring a Salesforce Program
 * and its related records (Cohorts, Course, Modules) with Penny as AI guide.
 *
 * Layout: 60% wizard | 40% Penny guidance panel
 * Steps: 1 Program → 2 Cohorts → 3 Course → 4 Modules → Review
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Brain, Sparkles, Send, ChevronRight, Plus, Check,
         AlertCircle, Loader2, RotateCcw, Zap, BookOpen,
         Layers, Users, GraduationCap, ClipboardList,
         Pencil, Eye, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';

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
interface PennyMessage { role: 'penny' | 'user'; content: string; time: string; }

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

function StepIndicator({ current }: { current: WizardStep }) {
  const done = current === 'review';
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEP_META.map((s, i) => {
        const isActive  = current === s.stepNum;
        const isDone    = done || (typeof current === 'number' && current > s.stepNum);
        const Icon = s.icon;
        return (
          <div key={s.stepNum} className="flex items-center">
            <div className={`flex flex-col items-center ${i > 0 ? '' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                isDone  ? 'bg-primary border-primary text-primary-foreground'
                : isActive ? 'bg-primary/10 border-primary text-primary'
                : 'bg-muted border-border text-muted-foreground'
              }`}>
                {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
            {i < STEP_META.length - 1 && (
              <div className={`h-0.5 w-12 mx-1 mb-4 rounded-full transition-colors ${
                (done || (typeof current === 'number' && current > s.stepNum)) ? 'bg-primary' : 'bg-border'
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

function PennyGuidancePanel({
  step, program, messages, onSend, loading,
  onInvokeAgentforce, agentforceLoading,
}: {
  step: WizardStep;
  program: SfProgram | null;
  messages: PennyMessage[];
  onSend: (text: string) => void;
  loading: boolean;
  onInvokeAgentforce?: () => void;
  agentforceLoading: boolean;
}) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function handleSend() {
    const t = input.trim();
    if (!t || loading) return;
    setInput('');
    onSend(t);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card border-l border-border">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">{TERMS.aiAssistant} Guide</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">Live · Gemini 2.5 Flash</span>
            </div>
          </div>
        </div>
        {/* Step context banner */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5">
          <p className="text-[11px] text-foreground/80 leading-relaxed">{STEP_CONTEXT[step]}</p>
        </div>
      </div>

      {/* Message thread */}
      <ScrollArea className="flex-1 min-h-0 px-4 py-3">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'penny' && (
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Brain className="w-2.5 h-2.5 text-primary" />
                </div>
              )}
              <div className={`rounded-2xl px-3 py-2 max-w-[85%] ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted/60 border border-border/60 text-foreground rounded-bl-sm'
              }`}>
                <p className="text-[12px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                <p className={`text-[9px] mt-0.5 ${m.role === 'user' ? 'text-primary-foreground/50 text-right' : 'text-muted-foreground'}`}>
                  {m.time}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Brain className="w-2.5 h-2.5 text-primary animate-pulse" />
              </div>
              <div className="bg-muted/60 border border-border/60 rounded-2xl rounded-bl-sm px-3 py-2">
                <div className="flex gap-1 items-center h-3.5">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Agentforce quick action (review step only) */}
      {step === 'review' && onInvokeAgentforce && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-border/50">
          <button
            onClick={onInvokeAgentforce}
            disabled={!program || agentforceLoading}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-[12px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {agentforceLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Zap className="w-3.5 h-3.5" />
            }
            Invoke Agentforce
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={loading}
            placeholder={`Ask ${TERMS.aiAssistant}…`}
            className="flex-1 text-[12px] border border-border rounded-full px-3.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 placeholder:text-muted-foreground/50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground/40 mt-1 px-1">
          Context: {program ? program.Name : 'No program selected'} · Step {typeof step === 'number' ? step : 'Review'}/4
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProgramConfiguration() {
  const { userTier } = useAppContext();
  const { toast } = useToast();

  // ── Wizard state ────────────────────────────────────────────────────────────
  const [step, setStep]                     = useState<WizardStep>(1);
  const [programs, setPrograms]             = useState<SfProgram[]>([]);
  const [progSearch, setProgSearch]         = useState('');
  const [showArchived, setShowArchived]     = useState(false);
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

  const [modules, setModules]               = useState<SfModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [showModuleForm, setShowModuleForm] = useState(false);

  const [saving, setSaving]                 = useState(false);
  const [agentforceLoading, setAgentforceLoading] = useState(false);

  // ── Penny state ─────────────────────────────────────────────────────────────
  const [pennyMessages, setPennyMessages] = useState<PennyMessage[]>([]);
  const [pennyLoading, setPennyLoading]   = useState(false);

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

  const fetchProgramDetail = useCallback(async (id: string) => {
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
        Program_Goals__c:        String(p['Program_Goals__c'] ?? ''),
        Problem_Statement__c:    String(p['Problem_Statement__c'] ?? ''),
        Program_Manager__c:      String(p['Program_Manager__c'] ?? ''),
      });
    } catch {
      // silently ignore — cards already show the summary
    } finally {
      setProgramDetailLoading(false);
    }
  }, []);

  useEffect(() => { void loadPrograms(); }, [loadPrograms]);

  useEffect(() => {
    if (!programDetailLoading && programDetail && detailPanelRef.current) {
      detailPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [programDetailLoading, programDetail]);

  // ── Penny ask ────────────────────────────────────────────────────────────────
  async function askPenny(userText: string) {
    setPennyMessages(prev => [...prev, { role: 'user', content: userText, time: ts() }]);
    setPennyLoading(true);
    try {
      const resp = await fetch('/api/penny/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userText,
          role: userTier,
          context: `Program Configuration Wizard — Step ${typeof step === 'number' ? step : 'Review'}. ` +
            `Current program: ${selectedProgram?.Name ?? 'none'}. ` +
            `You are Penny, the Transition Trails AI guide. The admin is configuring a Salesforce Program ` +
            `and its related LMS records. Help them think through program design decisions.`,
        }),
      });
      const data = await resp.json() as { reply?: string; error?: string };
      setPennyMessages(prev => [
        ...prev,
        { role: 'penny', content: data.reply ?? data.error ?? 'Something went wrong.', time: ts() },
      ]);
    } catch {
      setPennyMessages(prev => [
        ...prev,
        { role: 'penny', content: "Couldn't reach Penny — check your connection.", time: ts() },
      ]);
    } finally {
      setPennyLoading(false);
    }
  }

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

  function handleSelectProgram(p: SfProgram) {
    setSelectedProgram(p);
    setEditingProgram(false);
    setProgramDetail(null);
    setCourseForm(prev => ({ ...prev, Program__c: p.Name }));
    void fetchProgramDetail(p.Id);
  }

  function handleAdvanceToStep2() {
    if (!selectedProgram) { toast({ title: 'Select a program first', variant: 'destructive' }); return; }
    void loadCohorts(selectedProgram.Id);
    setStep(2);
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
      setSelectedCourse(newCourse);
      setShowCourseForm(false);
    } catch (e) {
      toast({ title: 'Failed to create course', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function handleAdvanceToStep4() {
    if (!selectedCourse) { toast({ title: 'Select or create a course first', variant: 'destructive' }); return; }
    void loadModules(selectedCourse.Id);
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
    setPennyMessages(prev => [...prev, {
      role: 'penny',
      content: `Invoking Agentforce for "${selectedProgram.Name}"…`,
      time: ts(),
    }]);
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
      setPennyMessages(prev => [...prev, {
        role: 'penny',
        content: data.reply ?? data.error ?? 'No response from Agentforce.',
        time: ts(),
      }]);
      if (!resp.ok) throw new Error(data.error);
    } catch (e) {
      toast({ title: 'Agentforce error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setAgentforceLoading(false);
    }
  }

  // ── Filtered programs ─────────────────────────────────────────────────────────
  const ARCHIVED_STATUSES = ['Canceled', 'Completed'];
  const filteredPrograms = programs.filter(p => {
    if (!showArchived && ARCHIVED_STATUSES.includes(p.pmdm__Status__c ?? '')) return false;
    if (progSearch.trim()) return p.Name.toLowerCase().includes(progSearch.toLowerCase());
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Page header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
              Administration
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
              <StepIndicator current={step} />

              {/* ── Step 1: Program ───────────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">Select or Create a Program</h2>
                    <button
                      onClick={() => setShowProgramForm(v => !v)}
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
                        <textarea rows={3} className={TEXTAREA_CLS} value={progForm.Program_Goals__c} onChange={e => setProgForm(p => ({...p, Program_Goals__c: e.target.value}))} placeholder="What outcomes does this program aim to achieve?" />
                      </Field>
                      <Field label="Problem Statement">
                        <textarea rows={2} className={TEXTAREA_CLS} value={progForm.Problem_Statement__c} onChange={e => setProgForm(p => ({...p, Problem_Statement__c: e.target.value}))} placeholder="What problem is this program solving?" />
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
                      <button
                        onClick={() => setShowArchived(v => !v)}
                        className={`ml-auto flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                          showArchived
                            ? 'bg-amber-500/10 border-amber-400/40 text-amber-700 dark:text-amber-400'
                            : 'border-border text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        {showArchived ? 'Hide Canceled / Completed' : 'Show Canceled / Completed'}
                      </button>
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
                                          { label: 'Manager',           val: sfStr(programDetail['Program_Manager__c']) },
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
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                              {rows.map(({ label, val }) => (
                                                <div key={label}>
                                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-0.5">{label}</p>
                                                  <p className="text-[12px] text-foreground">
                                                    {val ?? <span className="text-muted-foreground/40 italic">—</span>}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                            {textRows.map(({ label, key }) => {
                                              const val = sfStr(programDetail[key]);
                                              if (!val) return null;
                                              return (
                                                <div key={key}>
                                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1">{label}</p>
                                                  <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">{val}</p>
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
                                        <textarea rows={3} className={TEXTAREA_CLS} value={progForm.Program_Goals__c} onChange={e => setProgForm(prev => ({...prev, Program_Goals__c: e.target.value}))} />
                                      </Field>
                                      <Field label="Problem Statement">
                                        <textarea rows={2} className={TEXTAREA_CLS} value={progForm.Problem_Statement__c} onChange={e => setProgForm(prev => ({...prev, Problem_Statement__c: e.target.value}))} />
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

                                  {/* Next step button */}
                                  <div className="flex justify-end px-4 py-3 border-t border-border/50">
                                    <button onClick={handleAdvanceToStep2}
                                      className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors">
                                      Next: Configure Cohorts <ChevronRight className="w-4 h-4" />
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
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Link or Create Course</h2>
                      <p className="text-[11px] text-muted-foreground mt-0.5">for {selectedProgram?.Name}</p>
                    </div>
                    <button onClick={() => setShowCourseForm(v => !v)}
                      className="flex items-center gap-1.5 text-[11px] bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:bg-primary/90 transition-colors">
                      <Plus className="w-3 h-3" /> Create New Course
                    </button>
                  </div>

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
                        <button key={c.Id} onClick={() => setSelectedCourse(c)}
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
                    <button onClick={() => setStep(2)} className="text-[12px] text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">← Back</button>
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
              {step === 'review' && (
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-foreground">Review Your Configuration</h2>

                  {/* Summary card */}
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Program</p>
                        <p className="text-[14px] font-semibold text-foreground">{selectedProgram?.Name}</p>
                      </div>
                      <StatusBadge status={selectedProgram?.pmdm__Status__c ?? null} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/60">
                      <div className="text-center">
                        <p className="text-xl font-bold text-foreground">{cohorts.length}</p>
                        <p className="text-[10px] text-muted-foreground">Cohort{cohorts.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-center border-x border-border/60">
                        <p className="text-[13px] font-semibold text-foreground leading-tight">{selectedCourse?.Course_Title__c ?? selectedCourse?.Name ?? '—'}</p>
                        {selectedCourse && <StatusBadge status={selectedCourse.Status__c} />}
                        <p className="text-[10px] text-muted-foreground mt-0.5">Course</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-foreground">{modules.length}</p>
                        <p className="text-[10px] text-muted-foreground">Module{modules.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Cohort summary */}
                  {cohorts.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider mb-2">Cohorts</p>
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

                  {/* Module summary */}
                  {modules.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider mb-2">Modules</p>
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
                    <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> All records saved to Salesforce as you went
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ── RIGHT: Penny guidance ─────────────────────────────────────────── */}
        <div className="flex flex-col w-[40%] overflow-hidden">
          <PennyGuidancePanel
            step={step}
            program={selectedProgram}
            messages={pennyMessages}
            onSend={text => void askPenny(text)}
            loading={pennyLoading}
            onInvokeAgentforce={step === 'review' ? () => void handleInvokeAgentforce() : undefined}
            agentforceLoading={agentforceLoading}
          />
        </div>
      </div>
    </div>
  );
}
