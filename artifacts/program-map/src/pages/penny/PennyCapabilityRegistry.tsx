import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  CheckCircle2, AlertTriangle, Lock, Sparkles, Settings, ChevronRight,
  Send, Search, Plus, X, Loader2, RefreshCw, Zap, ArrowRight,
} from 'lucide-react';
import {
  pennyCapabilities as ALL_CAPABILITIES,
  type PennyCapability,
  type CapabilityDomain,
  CAPABILITY_DOMAIN_CONFIG,
  CAPABILITY_READINESS_CONFIG,
} from '@/data/pennyCapabilityData';
import { getRequirements, type CapabilityRequirement } from '@/data/capabilityRequirements';
import { useCapabilityPreflight, type RequirementCheckResult } from '@/hooks/useCapabilityPreflight';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';

// ── Types ─────────────────────────────────────────────────────────────────────

type SetupState = 'active' | 'in-setup' | 'not-started';
type SetupStep  = 'preflight' | 'configure' | 'test' | 'activate';

const STEP_ORDER: SetupStep[] = ['preflight', 'configure', 'test', 'activate'];
const STEP_LABELS: Record<SetupStep, string> = {
  preflight: 'Pre-flight', configure: 'Configure', test: 'Test', activate: 'Activate',
};

// ── Storage helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY_STATES = 'trailos:capabilitySetupStates';
const STORAGE_KEY_STEPS  = 'trailos:capabilitySetupSteps';

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

function persist(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ── Default states ────────────────────────────────────────────────────────────
// Two capabilities shown as already active (demo progress), one in setup.

const SEED_STATES: Record<string, SetupState> = {
  'cap-learner-coaching':   'active',
  'cap-reflection-prompts': 'active',
  'cap-resume-review':      'in-setup',
};

function getInitialStates(): Record<string, SetupState> {
  return loadStored<Record<string, SetupState>>(STORAGE_KEY_STATES, SEED_STATES);
}

function getInitialSteps(): Record<string, SetupStep> {
  return loadStored<Record<string, SetupStep>>(STORAGE_KEY_STEPS, {});
}

// A capability is locked when it has a 'config' dependency that isn't active.
function computeIsLocked(capId: string, setupStates: Record<string, SetupState>): boolean {
  return getRequirements(capId)
    .filter(r => r.kind === 'config' && r.capabilityDep)
    .some(r => (setupStates[r.capabilityDep!] ?? 'not-started') !== 'active');
}

// ── Domain badge ──────────────────────────────────────────────────────────────

function DomainBadge({ domain }: { domain: CapabilityDomain }) {
  const cfg = CAPABILITY_DOMAIN_CONFIG[domain];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${cfg.cls}`}>
      {domain === 'Communications' ? 'Comms' : domain}
    </span>
  );
}

// ── Compact active card ───────────────────────────────────────────────────────

function ActiveCard({
  capability,
  onConfigure,
  onAskPenny,
}: {
  capability: PennyCapability;
  onConfigure: () => void;
  onAskPenny: () => void;
}) {
  const matCfg = CAPABILITY_READINESS_CONFIG[capability.maturity];
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col relative p-4 pl-5">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#9FC3AE]" />
      <div className="flex items-center justify-between mb-2.5">
        <DomainBadge domain={capability.domain} />
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E6F0EA] text-[#2F6B3F]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#2F6B3F]" />
          Active
        </div>
      </div>
      <h3 className="text-[15px] font-semibold text-gray-900 mb-0.5 leading-snug">{capability.name}</h3>
      <p className="text-[13px] text-gray-500 mb-4 leading-snug line-clamp-2">{capability.shortDescription}</p>
      <div className="flex items-center justify-between mt-auto">
        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${matCfg.cls}`}>
          {matCfg.label}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onConfigure}
            className="px-2 py-1.5 rounded text-[12px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> Configure
          </button>
          <button
            onClick={onAskPenny}
            className="px-2 py-1.5 rounded text-[12px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Ask Penny
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Not-started card ──────────────────────────────────────────────────────────

function NotStartedCard({
  capability,
  onEnable,
}: {
  capability: PennyCapability;
  onEnable: () => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2.5">
        <DomainBadge domain={capability.domain} />
        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
          Not started
        </span>
      </div>
      <h3 className="text-[15px] font-semibold text-gray-900 mb-1 leading-snug">{capability.name}</h3>
      <p className="text-[13px] text-gray-500 mb-4 leading-snug line-clamp-2">{capability.shortDescription}</p>
      <div className="mt-auto">
        <button
          onClick={onEnable}
          className="w-full py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[12px] font-medium transition-colors flex items-center justify-center gap-1"
        >
          Enable Penny <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Locked card ───────────────────────────────────────────────────────────────

function LockedCard({ capability }: { capability: PennyCapability }) {
  const deps = getRequirements(capability.id).filter(r => r.kind === 'config' && r.capabilityDep);
  return (
    <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-gray-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-gray-600">{capability.name}</h3>
            <span className="text-[11px] font-medium text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
              Locked
            </span>
          </div>
          <p className="text-[12px] text-gray-400 mt-0.5">{capability.shortDescription}</p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        {deps.length > 0 && (
          <p className="text-[12px] text-gray-500">
            Requires: {deps.map(d => d.label.replace(' capability active', '')).join(' + ')}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Penny co-pilot panel (inside SetupCard) ───────────────────────────────────

function PennyCopiloPanel({
  capability,
  step,
  requirements,
  isLoading,
  onWalkThrough,
  onRecheck,
}: {
  capability: PennyCapability;
  step: SetupStep;
  requirements: RequirementCheckResult[] | undefined;
  isLoading: boolean;
  onWalkThrough: (req: CapabilityRequirement) => void;
  onRecheck?: () => void;
}) {
  const missing = requirements?.filter(r => r.status === 'missing') ?? [];
  const allMet  = requirements ? requirements.every(r => r.status === 'met') : false;

  // Build Penny's message dynamically
  let pennyMessage = '';
  if (isLoading) {
    pennyMessage = `Checking what's needed for ${capability.name}…`;
  } else if (step === 'preflight') {
    if (allMet) {
      pennyMessage = `Everything looks good — ${capability.name} is ready to configure. Move to the next step when you're ready.`;
    } else if (missing.length === 0) {
      pennyMessage = `I'm still checking a couple of requirements. The items marked "Check manually" need to be verified by you — I can\'t inspect those from here.`;
    } else if (missing.length === 1) {
      pennyMessage = `${capability.name} is one step away. ${missing[0].pennyMissingNote} Click the fix link on that row and I'll be here if you need guidance.`;
    } else {
      pennyMessage = `${capability.name} needs ${missing.length} things before it can go live. The most important: ${missing[0].pennyMissingNote}`;
    }
  } else if (step === 'configure') {
    pennyMessage = `You're configuring ${capability.name}. Select which programs this should apply to — you can always update this later once you've seen how learners respond.`;
  } else if (step === 'test') {
    pennyMessage = `Running a quick test lets you see exactly what ${capability.name} will say in context before your learners do. Send a message and I'll respond as if a real learner asked it.`;
  } else if (step === 'activate') {
    pennyMessage = `${capability.name} is ready to go live. Once you activate it, I'll start using this capability for your learners in the programs you selected.`;
  }

  // Walk-through actions for missing items (pre-flight step)
  const walkThroughItems = step === 'preflight'
    ? missing.filter(r => r.pennyMissingNote && (r.fixRoute || r.kind === 'sf-field' || r.kind === 'sf-object'))
    : [];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50/60 shrink-0">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span className="text-[14px] font-semibold text-gray-900">Penny</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-600 uppercase tracking-wide">
          Co‑pilot
        </span>
      </div>

      {/* Message */}
      <div className="p-4 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 text-[13px] text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            Checking requirements…
          </div>
        ) : (
          <p className="text-[13px] text-gray-700 leading-relaxed">{pennyMessage}</p>
        )}

        {walkThroughItems.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {walkThroughItems.slice(0, 3).map(r => (
              <button
                key={r.id}
                onClick={() => onWalkThrough(r)}
                className="px-3 py-2.5 border border-gray-200 rounded-md text-[12px] font-medium text-gray-700 hover:bg-gray-50 text-left flex justify-between items-center group transition-colors shadow-sm"
              >
                <span className="line-clamp-1">
                  Walk me through: {r.label.replace(' accessible in Salesforce', '').replace(' object accessible', '')}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        )}

        {/* Re-check button — shown after fixing something in preflight */}
        {step === 'preflight' && !isLoading && onRecheck && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={onRecheck}
              className="w-full px-3 py-2 rounded-md border border-amber-200 bg-amber-50 text-[12px] font-medium text-amber-700 hover:bg-amber-100 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-check requirements
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 bg-white shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder="Ask Penny about this step…"
            className="w-full h-9 pl-3 pr-9 rounded-md border border-gray-300 text-[12px] focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 placeholder:text-gray-400"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const v = (e.currentTarget as HTMLInputElement).value.trim();
                if (v) { onWalkThrough({ id: 'freeform', label: v, kind: 'config', pennyMissingNote: v }); (e.currentTarget as HTMLInputElement).value = ''; }
              }
            }}
          />
          <button className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded text-white bg-amber-500 hover:bg-amber-600 transition-colors">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Configure step content ────────────────────────────────────────────────────

function ConfigureStepContent({
  capability,
  programs,
  selectedPrograms,
  onProgramToggle,
}: {
  capability: PennyCapability;
  programs: { id: string; name: string }[];
  selectedPrograms: Set<string>;
  onProgramToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[13px] font-semibold text-gray-800 mb-1.5">Active for programs</p>
        <p className="text-[12px] text-gray-500 mb-3">
          Select which programs {capability.name} will be available in. Leave all unselected to enable for all programs.
        </p>
        <div className="flex flex-wrap gap-2">
          {programs.length === 0 && (
            <p className="text-[12px] text-gray-400 italic">No active programs found — Penny will apply to all programs.</p>
          )}
          {programs.slice(0, 12).map(p => (
            <button
              key={p.id}
              onClick={() => onProgramToggle(p.id)}
              className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${
                selectedPrograms.has(p.id)
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {selectedPrograms.has(p.id) && <span className="mr-1">✓</span>}
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Test step content ─────────────────────────────────────────────────────────

function TestStepContent({
  capability,
  onTestQuery,
  testResponse,
  testLoading,
}: {
  capability: PennyCapability;
  onTestQuery: (q: string) => void;
  testResponse: string | null;
  testLoading: boolean;
}) {
  const [testInput, setTestInput] = useState(
    `How does ${capability.name.toLowerCase()} help me right now?`
  );
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-gray-600 leading-relaxed">
        Send a test message to see how Penny responds using the {capability.name} capability.
      </p>
      <div className="flex gap-2">
        <input
          value={testInput}
          onChange={e => setTestInput(e.target.value)}
          className="flex-1 h-9 px-3 rounded-md border border-gray-300 text-[13px] focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
        />
        <button
          onClick={() => testInput.trim() && onTestQuery(testInput.trim())}
          disabled={testLoading || !testInput.trim()}
          className="h-9 px-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors"
        >
          {testLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          Test
        </button>
      </div>
      {testResponse && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5">
          <p className="text-[11px] font-semibold text-amber-700 mb-1.5 uppercase tracking-wide">Penny replied</p>
          <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap">{testResponse}</p>
        </div>
      )}
    </div>
  );
}

// ── Expanded setup card ───────────────────────────────────────────────────────

function SetupCard({
  capability,
  step,
  activeCapabilityIds,
  programs,
  onBack,
  onStepChange,
  onActivate,
  onAskPenny,
  onNavigate,
}: {
  capability: PennyCapability;
  step: SetupStep;
  activeCapabilityIds: Set<string>;
  programs: { id: string; name: string }[];
  onBack: () => void;
  onStepChange: (s: SetupStep) => void;
  onActivate: () => void;
  onAskPenny: (query: string) => void;
  onNavigate: (route: string) => void;
}) {
  const { data: preflight, isLoading: preflightLoading, refetch } = useCapabilityPreflight(
    capability.id,
    activeCapabilityIds,
    step === 'preflight',
  );

  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const stepIndex   = STEP_ORDER.indexOf(step);
  const missingCount = preflight ? preflight.requirements.filter(r => r.status === 'missing').length : null;
  const metCount     = preflight?.metCount ?? null;
  const totalCount   = preflight?.totalCount ?? null;

  function toggleProgram(id: string) {
    setSelectedPrograms(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function runTest(query: string) {
    setTestLoading(true);
    setTestResponse(null);
    try {
      const res = await fetch('/api/penny/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context: `Admin testing ${capability.name} capability setup` }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      setTestResponse(data.reply ?? data.error ?? 'No response received.');
    } catch {
      setTestResponse('Could not reach Penny — check that the API server is running.');
    } finally {
      setTestLoading(false);
    }
  }

  function handleWalkThrough(req: CapabilityRequirement) {
    const query = req.id === 'freeform'
      ? `I'm setting up the "${capability.name}" capability. ${req.pennyMissingNote}`
      : `I'm setting up the "${capability.name}" capability in Trail OS. The requirement "${req.label}" is not yet met. ${req.pennyMissingNote} Walk me through how to resolve this step by step.`;
    onAskPenny(query);
  }

  function canAdvance(): boolean {
    if (step === 'preflight') return preflight?.allMet === true;
    return true;
  }

  function advance() {
    const next = STEP_ORDER[stepIndex + 1];
    if (next) onStepChange(next);
  }

  return (
    <div className="bg-[#FFFCF5] rounded-lg border border-[#F3E5CC] shadow-sm relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-amber-500" />

      {/* Header */}
      <div className="px-5 pt-4 pb-3 pl-6 border-b border-[#F3E5CC]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-[17px] font-semibold text-gray-900">{capability.name}</h2>
            <DomainBadge domain={capability.domain} />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF3E0] text-amber-700 border border-[#F3E5CC]">
              <Sparkles className="w-3 h-3" /> Setting up…
            </span>
          </div>
          <span className="text-[12px] text-gray-500 shrink-0">
            Step {stepIndex + 1} of {STEP_ORDER.length}: {STEP_LABELS[step]}
          </span>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0">
          {STEP_ORDER.map((s, i) => {
            const done    = i < stepIndex;
            const current = i === stepIndex;
            return (
              <div key={s} className="flex items-center">
                {i > 0 && <div className={`w-8 h-px mx-1.5 ${done ? 'bg-amber-400' : 'bg-gray-300'}`} />}
                <div
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                    current
                      ? 'bg-amber-500 text-white shadow-sm'
                      : done
                        ? 'bg-[#E6F0EA] text-[#2F6B3F]'
                        : 'border border-gray-300 text-gray-400 bg-white/60'
                  }`}
                >
                  {done && <CheckCircle2 className="w-3 h-3" />}
                  {current && step === 'preflight' && <Sparkles className="w-3 h-3" />}
                  {i + 1} {STEP_LABELS[s]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body — two columns */}
      <div className="flex pl-6 pr-5 py-5 gap-5" style={{ minHeight: '320px' }}>

        {/* LEFT: step content */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Pre-flight step */}
          {step === 'preflight' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-[14px] font-semibold text-gray-900">Setup Requirements</h3>
                  {preflightLoading && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
                  {!preflightLoading && metCount !== null && totalCount !== null && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF3E0] text-amber-700">
                      {metCount} of {totalCount} met
                    </span>
                  )}
                </div>
                {!preflightLoading && (
                  <button
                    onClick={() => refetch()}
                    className="h-7 px-2.5 rounded border border-gray-200 bg-white hover:bg-gray-50 text-[12px] font-medium text-gray-600 flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Re-check
                  </button>
                )}
              </div>

              <div className="flex flex-col mb-4">
                {preflightLoading && (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center py-2.5 border-b border-gray-100">
                      <div className="w-5 h-5 rounded-full bg-gray-100 animate-pulse mr-3 shrink-0" />
                      <div className="flex-1 h-3 bg-gray-100 animate-pulse rounded" />
                    </div>
                  ))
                )}
                {!preflightLoading && (preflight?.requirements ?? getRequirements(capability.id).map((r): RequirementCheckResult => ({ ...r, status: 'undetermined' as const, detail: 'Not checked' }))).map(r => (
                  <div key={r.id} className="flex items-center py-2.5 border-b border-gray-100 last:border-0">
                    {r.status === 'met'
                      ? <CheckCircle2 className="w-5 h-5 text-[#2F6B3F] shrink-0 mr-3" />
                      : r.status === 'missing'
                        ? <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mr-3" />
                        : <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0 mr-3" />
                    }
                    <span className={`text-[13px] flex-1 ${r.status === 'missing' ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                      {r.label}
                    </span>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                        r.status === 'met'
                          ? 'bg-[#E6F0EA] text-[#2F6B3F]'
                          : r.status === 'missing'
                            ? 'bg-[#FFF3E0] text-amber-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
                        {r.detail}
                      </span>
                      {r.status === 'missing' && r.fixRoute && (
                        <button
                          onClick={() => onNavigate(r.fixRoute!)}
                          className="text-[12px] font-medium text-amber-600 hover:underline underline-offset-2"
                        >
                          {r.fixLabel ?? 'Fix'} →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!preflightLoading && missingCount !== null && missingCount > 0 && (
                <div className="bg-[#FFF3E0] rounded-md p-3 flex items-start gap-2.5 mb-4">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-amber-700 leading-relaxed">
                    {missingCount === 1
                      ? '1 requirement needs attention before you can configure this capability.'
                      : `${missingCount} requirements need attention before you can configure this capability.`
                    } Penny can guide you through each fix.
                  </p>
                </div>
              )}

              {!preflightLoading && preflight?.allMet && (
                <div className="bg-[#E6F0EA] rounded-md p-3 flex items-center gap-2.5 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-[#2F6B3F] shrink-0" />
                  <p className="text-[12px] text-[#2F6B3F] font-medium">All requirements met — ready to configure.</p>
                </div>
              )}
            </>
          )}

          {/* Configure step */}
          {step === 'configure' && (
            <ConfigureStepContent
              capability={capability}
              programs={programs}
              selectedPrograms={selectedPrograms}
              onProgramToggle={toggleProgram}
            />
          )}

          {/* Test step */}
          {step === 'test' && (
            <TestStepContent
              capability={capability}
              onTestQuery={runTest}
              testResponse={testResponse}
              testLoading={testLoading}
            />
          )}

          {/* Activate step */}
          {step === 'activate' && (
            <div className="space-y-4">
              <div className="bg-[#E6F0EA] rounded-lg p-4 border border-[#9FC3AE]">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-[#2F6B3F]" />
                  <span className="text-[14px] font-semibold text-[#2F6B3F]">Ready to go live</span>
                </div>
                <p className="text-[13px] text-gray-700 leading-relaxed">
                  <strong>{capability.name}</strong> has passed pre-flight and is configured.
                  Once activated, Penny will use this capability for learners in
                  {selectedPrograms.size > 0 ? ` the ${selectedPrograms.size} selected program${selectedPrograms.size > 1 ? 's' : ''}` : ' all active programs'}.
                </p>
              </div>
            </div>
          )}

          {/* Action row */}
          <div className="mt-auto pt-4 flex items-center justify-between">
            <button
              onClick={stepIndex === 0 ? onBack : () => onStepChange(STEP_ORDER[stepIndex - 1])}
              className="text-[13px] font-medium text-gray-500 hover:text-gray-700"
            >
              ← {stepIndex === 0 ? 'Cancel setup' : 'Back'}
            </button>
            <div className="flex items-center gap-2">
              {step !== 'activate' && !canAdvance() && (
                <span className="text-[12px] text-gray-400">
                  {step === 'preflight' && missingCount !== null && missingCount > 0
                    ? `${missingCount} requirement${missingCount > 1 ? 's' : ''} still missing`
                    : ''}
                </span>
              )}
              {step === 'activate' ? (
                <button
                  onClick={onActivate}
                  className="px-5 py-2 bg-[#2F6B3F] hover:bg-[#245530] text-white rounded text-[13px] font-medium shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Zap className="w-4 h-4" /> Activate {capability.name}
                </button>
              ) : (
                <button
                  onClick={advance}
                  disabled={!canAdvance()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded text-[13px] font-medium shadow-sm transition-colors"
                >
                  {step === 'preflight' && missingCount !== null && missingCount > 0
                    ? `Fix missing requirements (${missingCount}) →`
                    : `Save & Continue →`
                  }
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Penny co-pilot */}
        <div className="w-[340px] shrink-0">
          <PennyCopiloPanel
            capability={capability}
            step={step}
            requirements={preflight?.requirements}
            isLoading={preflightLoading}
            onWalkThrough={handleWalkThrough}
            onRecheck={refetch}
          />
        </div>
      </div>
    </div>
  );
}

// ── Capability detail slide-over ──────────────────────────────────────────────
// Preserved from the original registry — gives admins full edit access on active capabilities.

function CapabilityDetailSlideOver({
  capability,
  onClose,
}: {
  capability: PennyCapability;
  onClose: () => void;
}) {
  const matCfg = CAPABILITY_READINESS_CONFIG[capability.maturity];
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-[520px] bg-background border-l border-border flex flex-col shadow-xl overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-border shrink-0 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-foreground">{capability.name}</h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <DomainBadge domain={capability.domain} />
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${matCfg.cls}`}>
                {matCfg.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5">
            <div>
              <p className="text-[12px] font-semibold text-muted-foreground mb-1">Description</p>
              <p className="text-[13px] text-foreground leading-relaxed">{capability.shortDescription}</p>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-muted-foreground mb-1">Purpose</p>
              <p className="text-[13px] text-foreground leading-relaxed">{capability.purpose}</p>
            </div>
            {capability.relatedSfObjects.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-muted-foreground mb-2">Salesforce objects</p>
                <div className="flex flex-wrap gap-1.5">
                  {capability.relatedSfObjects.map(o => (
                    <span key={o} className="px-2 py-0.5 rounded-full bg-muted text-[12px] font-mono">{o}</span>
                  ))}
                </div>
              </div>
            )}
            {capability.nextSteps.filter(Boolean).length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-muted-foreground mb-2">Next steps</p>
                <ol className="space-y-1.5">
                  {capability.nextSteps.filter(Boolean).map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-foreground leading-snug">
                      <span className="w-4 h-4 rounded-full bg-muted text-muted-foreground text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PennyCapabilityRegistry() {
  const { setAskPennyOpen, setPendingPennyQuery, setCalendarPanelOpen, programs } = useAppContext();
  const [, navigate] = useLocation();

  // Persist setup states
  const [setupStates, setSetupStatesRaw] = useState<Record<string, SetupState>>(getInitialStates);
  const [activeSteps,  setActiveStepsRaw] = useState<Record<string, SetupStep>>(getInitialSteps);
  const [configureId,  setConfigureId]   = useState<string | null>(null);
  const [search,       setSearch]        = useState('');
  const [domainFilter, setDomainFilter]  = useState('');

  function setSetupStates(next: Record<string, SetupState>) {
    setSetupStatesRaw(next);
    persist(STORAGE_KEY_STATES, next);
  }
  function setActiveSteps(next: Record<string, SetupStep>) {
    setActiveStepsRaw(next);
    persist(STORAGE_KEY_STEPS, next);
  }

  // The currently expanded in-setup capability
  const expandedId = useMemo(
    () => Object.entries(setupStates).find(([, v]) => v === 'in-setup')?.[0] ?? null,
    [setupStates],
  );

  // Set of active capability IDs (for preflight config dependency checks)
  const activeCapabilityIds = useMemo(
    () => new Set(Object.entries(setupStates).filter(([, v]) => v === 'active').map(([k]) => k)),
    [setupStates],
  );

  // Active programs from AppContext (SF-sourced)
  const programOptions = useMemo(
    () => programs.map(p => ({ id: p.id, name: p.name })),
    [programs],
  );

  // Domain filter options
  const DOMAIN_FILTERS: { label: string; value: string }[] = [
    { label: 'All', value: '' },
    { label: 'Coaching',  value: 'Coaching' },
    { label: 'Career',    value: 'Career' },
    { label: 'Learning',  value: 'Learning' },
    { label: 'Knowledge', value: 'Knowledge' },
    { label: 'Comms',     value: 'Communications' },
    { label: 'Questing',  value: 'Questing' },
  ];

  // Group capabilities
  const { active, inSetupList, notStarted, locked, stats } = useMemo(() => {
    const q = search.toLowerCase();
    const all = ALL_CAPABILITIES.filter(c => {
      if (q && !c.name.toLowerCase().includes(q) && !c.shortDescription.toLowerCase().includes(q)) return false;
      if (domainFilter && c.domain !== domainFilter) return false;
      return true;
    });

    const activeList     = all.filter(c => setupStates[c.id] === 'active');
    const inSetupList    = all.filter(c => setupStates[c.id] === 'in-setup');
    const notStartedList = all.filter(c => {
      const state = setupStates[c.id] ?? 'not-started';
      return state === 'not-started' && !computeIsLocked(c.id, setupStates);
    });
    const lockedList = all.filter(c => {
      const state = setupStates[c.id] ?? 'not-started';
      return state !== 'active' && state !== 'in-setup' && computeIsLocked(c.id, setupStates);
    });

    const stats = {
      active:    activeList.length,
      inSetup:   inSetupList.length,
      notStarted: notStartedList.length,
    };

    return { active: activeList, inSetupList, notStarted: notStartedList, locked: lockedList, stats };
  }, [setupStates, search, domainFilter]);

  // Enable a capability (transition not-started → in-setup)
  const handleEnable = useCallback((capId: string) => {
    // Only one in-setup at a time — revert any current in-setup to not-started
    const next = { ...setupStates };
    for (const [id, state] of Object.entries(next)) {
      if (state === 'in-setup') next[id] = 'not-started';
    }
    next[capId] = 'in-setup';
    setSetupStates(next);
    // Reset step to preflight for new capability
    if (!activeSteps[capId]) {
      setActiveSteps({ ...activeSteps, [capId]: 'preflight' });
    }
  }, [setupStates, activeSteps]);

  // Cancel setup — revert to not-started
  const handleBack = useCallback((capId: string) => {
    const next = { ...setupStates, [capId]: 'not-started' as SetupState };
    setSetupStates(next);
  }, [setupStates]);

  // Activate a capability
  const handleActivate = useCallback((capId: string) => {
    const next = { ...setupStates, [capId]: 'active' as SetupState };
    setSetupStates(next);
  }, [setupStates]);

  // Step change within setup
  const handleStepChange = useCallback((capId: string, step: SetupStep) => {
    setActiveSteps({ ...activeSteps, [capId]: step });
  }, [activeSteps]);

  // Fire Penny panel
  const handleAskPenny = useCallback((query: string) => {
    setCalendarPanelOpen(false);
    setPendingPennyQuery(query);
    setAskPennyOpen(true);
  }, [setAskPennyOpen, setPendingPennyQuery, setCalendarPanelOpen]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] relative">

      {/* Header */}
      <header className="h-[60px] bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] font-semibold text-gray-900">Penny Capabilities</h1>
          <span className="text-[13px] text-gray-500">Enable and configure what Penny can do</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search capabilities…"
              className="h-8 pl-8 pr-3 rounded border border-gray-200 text-[13px] w-44 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
          <button className="h-8 px-3 rounded border border-gray-200 flex items-center gap-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add capability
          </button>
        </div>
      </header>

      {/* Filter bar */}
      <div className="h-[44px] bg-gray-50 border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {DOMAIN_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setDomainFilter(f.value)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                domainFilter === f.value
                  ? 'bg-sky-100 text-sky-700'
                  : 'text-gray-600 hover:bg-gray-200/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="text-[12px] text-gray-500">
          {stats.active > 0 && <span className="text-gray-700 font-medium">{stats.active} active</span>}
          {stats.inSetup > 0 && <><span className="mx-1">·</span>{stats.inSetup} in setup</>}
          {stats.notStarted > 0 && <><span className="mx-1">·</span>{stats.notStarted} not started</>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto w-full space-y-5 pb-20">

          {/* Active capabilities */}
          {active.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Active</p>
              <div className="grid grid-cols-2 gap-4">
                {active.map(cap => (
                  <ActiveCard
                    key={cap.id}
                    capability={cap}
                    onConfigure={() => setConfigureId(cap.id)}
                    onAskPenny={() => handleAskPenny(`Tell me about the "${cap.name}" Penny capability and how it's being used in our programs.`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* In-setup capability */}
          {inSetupList.map(cap => (
            <SetupCard
              key={cap.id}
              capability={cap}
              step={activeSteps[cap.id] ?? 'preflight'}
              activeCapabilityIds={activeCapabilityIds}
              programs={programOptions}
              onBack={() => handleBack(cap.id)}
              onStepChange={step => handleStepChange(cap.id, step)}
              onActivate={() => handleActivate(cap.id)}
              onAskPenny={handleAskPenny}
              onNavigate={navigate}
            />
          ))}

          {/* Not-started */}
          {notStarted.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Not started</p>
              <div className="grid grid-cols-3 gap-4">
                {notStarted.map(cap => (
                  <NotStartedCard
                    key={cap.id}
                    capability={cap}
                    onEnable={() => handleEnable(cap.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Locked */}
          {locked.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Locked — enable dependencies first</p>
              <div className="flex flex-col gap-2.5">
                {locked.map(cap => (
                  <LockedCard key={cap.id} capability={cap} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {active.length === 0 && inSetupList.length === 0 && notStarted.length === 0 && locked.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-gray-300" />
              <p className="text-[14px] font-medium text-gray-500">No capabilities match</p>
              <button onClick={() => { setSearch(''); setDomainFilter(''); }} className="mt-1 text-[13px] text-primary hover:underline">Clear filters</button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom help bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[52px] bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.04)] px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-[13px] text-gray-600">Working through a requirement? Ask Penny for help</span>
        </div>
        <button
          onClick={() => handleAskPenny('I\'m configuring Penny capabilities and need help understanding what to set up next.')}
          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[13px] font-medium shadow-sm transition-colors flex items-center gap-1.5"
        >
          Ask Penny <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Capability detail slide-over */}
      {configureId && (() => {
        const cap = ALL_CAPABILITIES.find(c => c.id === configureId);
        return cap ? (
          <CapabilityDetailSlideOver capability={cap} onClose={() => setConfigureId(null)} />
        ) : null;
      })()}
    </div>
  );
}
