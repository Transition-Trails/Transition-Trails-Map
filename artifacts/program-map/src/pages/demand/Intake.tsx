import { useState } from 'react';
import { TERMS } from '@/config/terminology';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import { useSfOpsCases, caseAge, type SfCase } from '@/hooks/useSfOpsCases';
import { formatSyncAge } from '@/hooks/useSfOpsSummary';
import {
  AlertTriangle, ChevronRight, ChevronDown, Plus, GitBranch,
  Database, RefreshCw, WifiOff, Sparkles, X, Check, CheckCheck,
  RotateCcw, ArrowRight, ChevronsDown, TrendingDown,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type RequestType   = 'New Feature' | 'Bug / Issue' | 'Content Update' | 'Change Request' | 'Admin';
type RequestStatus = 'Triaged' | 'In Review' | 'Approved' | 'Backlog' | 'Completed';
type RiskLevel     = 'high' | 'elevated' | 'normal';

interface DemandRequest {
  id: string;
  type: RequestType;
  subject: string;
  submitter: string;
  age: string;
  status: RequestStatus;
  risk: RiskLevel;
  program: string;
  description?: string; // SF required short text (255)
  notes?: string;       // rich-text internal context
  sfSynced?: boolean;   // true = exists in Salesforce; false/undefined = local draft only
}

// ── Seed data (prototype — owners/dates are placeholders) ─────────────────────

const SEED_REQUESTS: DemandRequest[] = [
  {
    id: 'REQ-031', type: 'New Feature',    status: 'Triaged',   risk: 'normal',   age: '2d',
    submitter: 'L. Torres',
    subject: "Add quiz checkpoints to Explorer's Trail",
    program: "Explorer's Trail",
    notes: 'Requested as part of Q3 engagement improvements. Needs product review before scoping.',
  },
  {
    id: 'REQ-030', type: 'Bug / Issue',    status: 'In Review', risk: 'high',     age: '4d',
    submitter: 'M. Reyes',
    subject: `${TERMS.aiAssistant} not responding to RESOLVE questions`,
    program: 'RESOLVE',
    notes: 'Reported in #penny-support. No owner assigned. 4 days without triage — elevated risk to RESOLVE cohort delivery.',
  },
  {
    id: 'REQ-029', type: 'Content Update', status: 'Approved',  risk: 'normal',   age: '5d',
    submitter: 'K. Brooks',
    subject: 'Update Guided Trail module 4 pacing guide',
    program: 'Guided Trail',
    notes: 'Approved by L. Torres. In progress — Drive doc revision underway.',
  },
  {
    id: 'REQ-028', type: 'New Feature',    status: 'Backlog',   risk: 'elevated', age: '7d',
    submitter: 'T. Nguyen',
    subject: 'Automated reminder emails for Trail Quests',
    program: 'All Programs',
    notes: `7 days in backlog with no action. Requires ${TERMS.aiAssistant} delivery pipeline. Recommend triage or deferral decision.`,
  },
  {
    id: 'REQ-027', type: 'Admin',          status: 'Completed', risk: 'normal',   age: '9d',
    submitter: 'A. Johnson',
    subject: 'Add new program cohort dates for Q4',
    program: 'Foundations Trail',
    notes: 'Completed. Salesforce cohort records updated for Q4 schedule.',
  },
  {
    id: 'REQ-026', type: 'Change Request', status: 'In Review', risk: 'elevated', age: '12d',
    submitter: 'L. Torres',
    subject: 'Revise Sprint 2 learner assessment rubric',
    program: 'Guided Trail',
    notes: '12 days open. Review with program lead needed before Sprint 2 closes.',
  },
  {
    id: 'REQ-025', type: 'New Feature',    status: 'Backlog',   risk: 'normal',   age: '14d',
    submitter: 'M. Reyes',
    subject: `${TERMS.aiAssistant} confidence threshold for coaching outputs`,
    program: 'All Programs',
    notes: `${TERMS.aiAssistant} capability improvement. Deferred to Phase 2 capability sprint.`,
  },
];

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: RequestStatus[] = ['Triaged', 'In Review', 'Approved', 'Backlog', 'Completed'];

const STATUS_CFG: Record<RequestStatus, { cls: string }> = {
  Triaged:     { cls: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]' },
  'In Review': { cls: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]' },
  Approved:    { cls: 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]' },
  Backlog:     { cls: 'bg-muted text-muted-foreground border-border' },
  Completed:   { cls: 'bg-primary/10 text-primary border-primary/20' },
};

const RISK_CFG: Record<RiskLevel, { badge: string; cls: string } | null> = {
  high:     { badge: 'At Risk',  cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' },
  elevated: { badge: 'Elevated', cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
  normal:   null,
};

const TYPE_DOT: Record<RequestType, string> = {
  'New Feature':    'bg-[#2F6F7E]',
  'Bug / Issue':    'bg-[#A93F2F]',
  'Content Update': 'bg-[#2F6F7E]',
  'Change Request': 'bg-[#CC8400]',
  'Admin':          'bg-[#C8CBC6]',
};

// ── Group definitions ─────────────────────────────────────────────────────────

interface Group {
  key:         string;
  label:       string;
  priority:    string | null;
  pillCls:     string;
  accentCls:   string;
  headingCls:  string;
  filter:      (r: DemandRequest) => boolean;
}

const GROUPS: Group[] = [
  {
    key: 'critical', label: 'Needs Immediate Action', priority: 'P1',
    pillCls:    'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]',
    accentCls:  'border-l-[#A93F2F]',
    headingCls: 'text-[#A93F2F]',
    filter: r => r.risk === 'high' && r.status !== 'Completed',
  },
  {
    key: 'elevated', label: 'Elevated Priority', priority: 'P2',
    pillCls:    'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
    accentCls:  'border-l-amber-400',
    headingCls: 'text-[#CC8400]',
    filter: r => r.risk === 'elevated' && r.status !== 'Completed',
  },
  {
    key: 'active', label: 'In Progress', priority: 'P3',
    pillCls:    'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
    accentCls:  'border-l-[#7FAFC6]',
    headingCls: 'text-[#2F6F7E]',
    filter: r => (r.status === 'In Review' || r.status === 'Approved') && r.risk === 'normal',
  },
  {
    key: 'queued', label: 'Queued', priority: null,
    pillCls:    'bg-muted/60 text-muted-foreground border-border',
    accentCls:  'border-l-muted-foreground/20',
    headingCls: 'text-muted-foreground',
    filter: r => (r.status === 'Triaged' || r.status === 'Backlog') && r.risk === 'normal',
  },
  {
    key: 'done', label: 'Completed', priority: null,
    pillCls:    'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]',
    accentCls:  'border-l-[#9FC3AE]',
    headingCls: 'text-[#2F6B3F]',
    filter: r => r.status === 'Completed',
  },
];

// Sort within a group: by age descending (oldest = highest urgency)
function sortGroup(items: DemandRequest[]) {
  return [...items].sort((a, b) => parseInt(b.age) - parseInt(a.age));
}

// ── Live Salesforce Cases Strip (unchanged) ───────────────────────────────────

const CASE_PRIORITY_CFG: Record<string, { cls: string; label: string }> = {
  High:   { cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',    label: 'High'   },
  Medium: { cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]', label: 'Medium' },
  Low:    { cls: 'text-slate-600 bg-slate-50 border-slate-200', label: 'Low'    },
};

function SfCasesStrip() {
  const { data, isLoading, isError, refetch, isFetching } = useSfOpsCases();
  const { setSelectedItem } = useAppContext();
  const [focusedCaseId, setFocusedCaseId] = useState<string | null>(null);
  const [sfOpen, setSfOpen] = useState(true);

  const n = (v: number | null | undefined) => v == null ? '—' : v.toLocaleString();
  const syncLabel = data ? formatSyncAge(data.lastUpdated) : null;
  const isStale   = data && data.cacheAge > 5 * 60;

  const focusedCase = focusedCaseId && data
    ? data.cases.find(c => c.Id === focusedCaseId) ?? null
    : null;

  function handleSelectCase(c: SfCase, contactName: string | null) {
    const age   = caseAge(c.CreatedDate);
    const sfUrl = data?.orgBaseUrl ? `${data.orgBaseUrl}/lightning/r/Case/${c.Id}/view` : null;
    setFocusedCaseId(c.Id);
    setSelectedItem({
      type: 'sfCase',
      id: c.Id,
      data: { ...c, contactName, sfUrl, age },
    });
  }

  return (
    <div className="rounded-lg border border-[#9FC3AE] bg-white overflow-hidden">

      {/* Header bar — div with two click zones to avoid nested <button> */}
      <div className="px-3 py-2 border-b border-[#9FC3AE]/80 bg-[#E6F0EA]/60 flex items-center justify-between">
        <button
          onClick={() => setSfOpen(v => !v)}
          className="flex items-center gap-1.5 flex-wrap text-left flex-1 min-w-0"
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isLoading || isFetching ? 'bg-[#CC8400] animate-pulse'
            : isError  ? 'bg-[#FBEAE6]0'
            : isStale  ? 'bg-[#CC8400]'
            : 'bg-[#E6F0EA]0'
          }`} />
          <Database className="w-2.5 h-2.5 text-[#2F6B3F]/60" />
          <span className="text-[14px] font-bold  text-[#245531]">
            Live · Salesforce Cases
          </span>
          {data && (
            <span className={`text-[14px] ${isStale ? 'text-[#CC8400]' : 'text-[#2F6B3F]/70'}`}>
              · {isStale ? 'stale · ' : ''}{syncLabel}
            </span>
          )}
          {data && (
            <span className="text-[14px] text-[#2F6B3F]/60">
              · {n(data.totalOpen)} open · {n(data.highPriority)} high priority
            </span>
          )}
          <ChevronDown className={`w-3 h-3 text-[#2F6B3F]/50 transition-transform ml-1 ${sfOpen ? '' : '-rotate-90'}`} />
        </button>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-[14px] text-[#2F6B3F]/60 hover:text-[#245531] flex items-center gap-0.5 disabled:opacity-40 ml-2 shrink-0"
          aria-label="Refresh cases"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {sfOpen && (
        <>
          {isError ? (
            <div className="px-4 py-3 flex items-center gap-2">
              <WifiOff className="w-3 h-3 text-[#A93F2F] shrink-0" />
              <span className="text-[14px] text-[#A93F2F] flex-1">Salesforce unreachable — cases unavailable.</span>
              <button onClick={() => refetch()} className="text-[14px] font-semibold text-[#A93F2F] hover:underline flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" /> Retry
              </button>
            </div>
          ) : isLoading ? (
            <div className="p-3 space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-7 rounded bg-muted/40 animate-pulse" />)}
            </div>
          ) : data && data.cases.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-[14px] text-muted-foreground">No open cases in Salesforce.</p>
            </div>
          ) : data ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-[14px] font-bold  text-muted-foreground/60 whitespace-nowrap w-[80px]">Priority</th>
                      <th className="px-3 py-2 text-[14px] font-bold  text-muted-foreground/60 whitespace-nowrap w-[90px]">Case #</th>
                      <th className="px-3 py-2 text-[14px] font-bold  text-muted-foreground/60">Subject</th>
                      <th className="px-3 py-2 text-[14px] font-bold  text-muted-foreground/60 whitespace-nowrap w-[100px]">Status</th>
                      <th className="px-3 py-2 text-[14px] font-bold  text-muted-foreground/60 whitespace-nowrap w-[140px] hidden md:table-cell">Contact</th>
                      <th className="px-3 py-2 text-[14px] font-bold  text-muted-foreground/60 whitespace-nowrap w-[52px] text-right">Age</th>
                      <th className="px-2 py-2 w-[32px]" title={`Click any row to get ${TERMS.aiAssistant} insights`}>
                        <Sparkles className="w-3 h-3 text-muted-foreground/30 mx-auto" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data.cases.map(c => {
                      const priCfg      = CASE_PRIORITY_CFG[c.Priority ?? 'Low'] ?? CASE_PRIORITY_CFG['Low'];
                      const contactName = c.Contact?.Name ?? c.Account?.Name ?? null;
                      const sfUrl       = data.orgBaseUrl
                        ? `${data.orgBaseUrl}/lightning/r/Case/${c.Id}/view`
                        : null;
                      const isFocused = focusedCaseId === c.Id;
                      return (
                        <tr
                          key={c.Id}
                          onClick={() => handleSelectCase(c, contactName)}
                          className={`cursor-pointer transition-colors group border-l-2 ${
                            isFocused
                              ? 'bg-primary/5 border-l-primary'
                              : 'hover:bg-muted/20 border-l-transparent'
                          }`}
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 leading-none ${priCfg.cls}`}>
                              {priCfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {sfUrl ? (
                              <a href={sfUrl} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-[14px] font-mono font-semibold text-primary hover:underline">
                                {c.CaseNumber ?? c.Id.slice(0, 8)}
                              </a>
                            ) : (
                              <span className="text-[14px] font-mono text-muted-foreground/60">
                                {c.CaseNumber ?? '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 max-w-0">
                            <p className="text-[14px] font-medium text-foreground truncate leading-snug">
                              {c.Subject ?? '(No subject)'}
                            </p>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="text-[14px] text-muted-foreground">{c.Status ?? '—'}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">
                            <span className="text-[14px] text-muted-foreground/70">{contactName ?? '—'}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <span className="text-[14px] text-muted-foreground/50">{caseAge(c.CreatedDate)}</span>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-center">
                            <Sparkles className={`w-3 h-3 mx-auto transition-colors ${
                              isFocused ? 'text-primary' : 'text-transparent group-hover:text-primary/40'
                            }`} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {focusedCase ? (
                <div className="flex items-center gap-2 px-3 py-2 border-t border-primary/20 bg-primary/5">
                  <Sparkles className="w-3 h-3 text-primary shrink-0" />
                  <p className="text-[14px] text-primary flex-1 truncate">
                    <span className="font-semibold">Selected:</span> {focusedCase.CaseNumber} · {focusedCase.Subject ?? 'No subject'}
                    <span className="text-primary/60 ml-1">— brief open in right panel</span>
                  </p>
                  <button onClick={() => setFocusedCaseId(null)} className="text-primary/50 hover:text-primary transition-colors shrink-0" aria-label="Clear focus">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="px-3 py-1.5 border-t border-border/40">
                  <p className="text-[14px] text-muted-foreground/40">Click any row to open the case brief in the right panel</p>
                </div>
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

// ── Inline Edit Form ──────────────────────────────────────────────────────────

const EDIT_PROGRAMS = ["Explorer's Trail", 'Foundations Trail', 'Guided Trail', 'Trail of Mastery', 'Digital Compass', 'All Programs'];
const EDIT_TYPES: RequestType[] = ['New Feature', 'Bug / Issue', 'Content Update', 'Change Request', 'Admin'];
const EDIT_RISKS: { value: RiskLevel; label: string }[] = [
  { value: 'normal',   label: 'Normal'   },
  { value: 'elevated', label: 'Elevated' },
  { value: 'high',     label: 'High / At Risk' },
];

// ── RichTextArea ──────────────────────────────────────────────────────────────
// Lightweight markdown-style rich toolbar over a plain textarea.
// Stores markdown strings so the value stays a plain string.

type RichAction = 'bold' | 'italic' | 'ul' | 'ol';

function wrapSelection(
  ta: HTMLTextAreaElement,
  action: RichAction,
  setValue: (v: string) => void,
) {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const sel   = value.slice(s, e);
  const before = value.slice(0, s);
  const after  = value.slice(e);

  let inserted = '';
  let cursorOffset = 0;

  if (action === 'bold') {
    inserted = sel ? `**${sel}**` : '**bold**';
    cursorOffset = sel ? inserted.length : 2;
  } else if (action === 'italic') {
    inserted = sel ? `_${sel}_` : '_italic_';
    cursorOffset = sel ? inserted.length : 1;
  } else if (action === 'ul') {
    const lines = (sel || 'item').split('\n').map(l => `- ${l}`).join('\n');
    inserted = lines;
    cursorOffset = inserted.length;
  } else if (action === 'ol') {
    const lines = (sel || 'item').split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n');
    inserted = lines;
    cursorOffset = inserted.length;
  }

  const next = before + inserted + after;
  setValue(next);
  // Restore cursor after React re-render
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(s + cursorOffset, s + cursorOffset);
  });
}

function RichTextArea({
  value, onChange, placeholder, rows = 6, autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
}) {
  const taRef = { current: null as HTMLTextAreaElement | null };
  const TOOLS: { action: RichAction; label: string; title: string }[] = [
    { action: 'bold',   label: 'B',  title: 'Bold (**text**)' },
    { action: 'italic', label: 'I',  title: 'Italic (_text_)' },
    { action: 'ul',     label: '•—', title: 'Bullet list' },
    { action: 'ol',     label: '1—', title: 'Numbered list' },
  ];
  return (
    <div className="rounded-md border border-border overflow-hidden focus-within:ring focus-within:ring-primary/15">
      {/* Toolbar */}
      <div className="flex items-center gap-px px-2 py-1 border-b border-border bg-muted/20">
        {TOOLS.map(t => (
          <button
            key={t.action}
            type="button"
            title={t.title}
            onMouseDown={ev => {
              ev.preventDefault(); // keep textarea focus
              if (taRef.current) wrapSelection(taRef.current, t.action, onChange);
            }}
            className={`px-2 py-0.5 rounded text-[13px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors select-none ${
              t.action === 'italic' ? 'italic' : ''
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-2 text-[12px] text-muted-foreground/40 font-normal">Markdown</span>
      </div>
      <textarea
        ref={el => { taRef.current = el; }}
        autoFocus={autoFocus}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full text-[14px] px-3 py-2 bg-white focus:outline-none resize-none font-mono leading-relaxed"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function InlineEditForm({
  req, draft, onChange, onSave, onCancel, onSendToSF, isSending, isSent,
}: {
  req:        DemandRequest;
  draft:      Partial<DemandRequest>;
  onChange:   (field: keyof DemandRequest, value: string) => void;
  onSave:     () => void;
  onCancel:   () => void;
  onSendToSF: () => void;
  isSending:  boolean;
  isSent:     boolean;
}) {
  const accentCls = draft.risk === 'high' ? 'border-l-[#A93F2F]' : draft.risk === 'elevated' ? 'border-l-amber-400' : 'border-l-primary/40';
  return (
    <div className={`rounded-lg border border-primary/30 ring-1 ring-primary/15 bg-white overflow-hidden border-l-[3px] ${accentCls} shadow-sm`}>
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border/40 bg-muted/10 flex items-center gap-2">
        <span className="text-[14px] font-mono text-muted-foreground/60">{req.id}</span>
        <span className="text-[14px] text-muted-foreground/40">·</span>
        <span className="text-[14px] font-semibold text-foreground">Editing</span>
        {req.sfSynced && (
          <span className="ml-1 text-[14px] font-semibold border rounded-full px-1.5 py-0.5 border-[#9FC3AE] text-[#245531] bg-[#E6F0EA]">
            Salesforce
          </span>
        )}
        <button onClick={onCancel} className="ml-auto text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Subject */}
        <div>
          <label className="text-[14px] font-semibold text-muted-foreground/60 block mb-1">Subject</label>
          <input
            autoFocus
            value={draft.subject ?? ''}
            onChange={e => onChange('subject', e.target.value)}
            className="w-full text-[14px] border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring focus:ring-primary/15 bg-white"
            placeholder="Brief description…"
          />
        </div>

        {/* Type · Program · Status · Risk */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { label: 'Type',    field: 'type'    as const, options: EDIT_TYPES.map(t => ({ value: t, label: t })) },
            { label: 'Program', field: 'program' as const, options: EDIT_PROGRAMS.map(p => ({ value: p, label: p })) },
            { label: 'Status',  field: 'status'  as const, options: STATUS_OPTIONS.map(s => ({ value: s, label: s })) },
            { label: 'Risk',    field: 'risk'    as const, options: EDIT_RISKS },
          ] as { label: string; field: keyof DemandRequest; options: { value: string; label: string }[] }[]).map(sel => (
            <div key={sel.label}>
              <label className="text-[14px] font-semibold text-muted-foreground/60 block mb-1">{sel.label}</label>
              <select
                value={(draft[sel.field] as string) ?? ''}
                onChange={e => onChange(sel.field, e.target.value)}
                className="w-full text-[14px] border border-border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring focus:ring-primary/15"
              >
                {sel.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Description (SF required, 255) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[14px] font-semibold text-muted-foreground/60">
              Description <span className="text-[#A93F2F]">*</span>
              <span className="ml-1.5 text-[12px] font-normal text-muted-foreground/40">Salesforce · 255 chars max</span>
            </label>
            <span className={`text-[12px] tabular-nums ${(draft.description ?? '').length > 240 ? 'text-[#A93F2F] font-semibold' : 'text-muted-foreground/40'}`}>
              {(draft.description ?? '').length}/255
            </span>
          </div>
          <input
            value={draft.description ?? ''}
            onChange={e => onChange('description', e.target.value.slice(0, 255))}
            maxLength={255}
            className="w-full text-[14px] border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring focus:ring-primary/15 bg-white"
            placeholder="One-sentence summary visible in Salesforce…"
          />
        </div>

        {/* Notes (rich text) */}
        <div>
          <label className="text-[14px] font-semibold text-muted-foreground/60 block mb-1">
            Notes
            <span className="ml-1.5 text-[12px] font-normal text-muted-foreground/40">internal context · supports markdown</span>
          </label>
          <RichTextArea
            value={draft.notes ?? ''}
            onChange={v => onChange('notes', v)}
            rows={6}
            placeholder="Context, dependencies, or next actions…"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[14px] font-semibold hover:opacity-85 transition-opacity"
          >
            <Check className="w-3 h-3" /> Save
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-full text-[14px] font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Cancel
          </button>
          <div className="flex-1" />
          {isSent ? (
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[#2F6B3F]">
              <CheckCheck className="w-3.5 h-3.5" /> Sent to Salesforce
            </span>
          ) : (
            <button
              onClick={onSendToSF}
              disabled={isSending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] font-semibold border border-[#9FC3AE] bg-[#E6F0EA] text-[#245531] hover:bg-[#D0E5D8] transition-colors disabled:opacity-50"
            >
              {isSending
                ? <><RefreshCw className="w-3 h-3 animate-spin" /> Sending…</>
                : <><Database className="w-3 h-3" /> Send to Salesforce</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Demand Inline Form ─────────────────────────────────────────────────────

function NewDemandForm({
  draft, onChange, onSave, onSendToSF, onCancel, isSending,
}: {
  draft:      Partial<DemandRequest>;
  onChange:   (field: keyof DemandRequest, value: string) => void;
  onSave:     () => void;
  onSendToSF: () => void;
  onCancel:   () => void;
  isSending:  boolean;
}) {
  const isValid = (draft.subject ?? '').trim().length > 0;
  return (
    <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/3 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-primary/20 bg-primary/5 flex items-center gap-2">
        <Plus className="w-3.5 h-3.5 text-primary" />
        <span className="text-[14px] font-semibold text-primary">New Demand Request</span>
        <span className="text-[14px] text-primary/40">— local draft until sent to Salesforce</span>
        <button onClick={onCancel} className="ml-auto text-primary/40 hover:text-primary transition-colors p-1 rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="text-[14px] font-semibold text-muted-foreground/60 block mb-1">
            Subject <span className="text-[#A93F2F]">*</span>
          </label>
          <input
            autoFocus
            value={draft.subject ?? ''}
            onChange={e => onChange('subject', e.target.value)}
            className="w-full text-[14px] border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring focus:ring-primary/15 bg-white"
            placeholder="Brief description of the request…"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {([
            { label: 'Type',     field: 'type'    as const, options: EDIT_TYPES.map(t => ({ value: t, label: t })) },
            { label: 'Program',  field: 'program' as const, options: EDIT_PROGRAMS.map(p => ({ value: p, label: p })) },
            { label: 'Priority', field: 'risk'    as const, options: EDIT_RISKS },
          ] as { label: string; field: keyof DemandRequest; options: { value: string; label: string }[] }[]).map(sel => (
            <div key={sel.label}>
              <label className="text-[14px] font-semibold text-muted-foreground/60 block mb-1">{sel.label}</label>
              <select
                value={(draft[sel.field] as string) ?? ''}
                onChange={e => onChange(sel.field, e.target.value)}
                className="w-full text-[14px] border border-border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring focus:ring-primary/15"
              >
                {sel.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Description (SF required, 255) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[14px] font-semibold text-muted-foreground/60">
              Description <span className="text-[#A93F2F]">*</span>
              <span className="ml-1.5 text-[12px] font-normal text-muted-foreground/40">Salesforce · 255 chars max</span>
            </label>
            <span className={`text-[12px] tabular-nums ${(draft.description ?? '').length > 240 ? 'text-[#A93F2F] font-semibold' : 'text-muted-foreground/40'}`}>
              {(draft.description ?? '').length}/255
            </span>
          </div>
          <input
            value={draft.description ?? ''}
            onChange={e => onChange('description', e.target.value.slice(0, 255))}
            maxLength={255}
            className="w-full text-[14px] border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring focus:ring-primary/15 bg-white"
            placeholder="One-sentence summary visible in Salesforce…"
          />
        </div>

        {/* Notes (rich text) */}
        <div>
          <label className="text-[14px] font-semibold text-muted-foreground/60 block mb-1">
            Notes
            <span className="ml-1.5 text-[12px] font-normal text-muted-foreground/40">internal context · supports markdown</span>
          </label>
          <RichTextArea
            value={draft.notes ?? ''}
            onChange={v => onChange('notes', v)}
            rows={6}
            placeholder="What needs to happen and why? Any dependencies or urgency…"
          />
        </div>

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <button
            onClick={onSave}
            disabled={!isValid}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[14px] font-semibold hover:opacity-85 transition-opacity disabled:opacity-40"
          >
            <Check className="w-3 h-3" /> Save locally
          </button>
          <button
            onClick={onSendToSF}
            disabled={!isValid || isSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] font-semibold border border-[#9FC3AE] bg-[#E6F0EA] text-[#245531] hover:bg-[#D0E5D8] transition-colors disabled:opacity-40"
          >
            {isSending
              ? <><RefreshCw className="w-3 h-3 animate-spin" /> Sending…</>
              : <><Database className="w-3 h-3" /> Save &amp; Send to Salesforce</>}
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-full text-[14px] font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RequestRow ────────────────────────────────────────────────────────────────

function RequestRow({
  req, accentCls, expanded, selected, onSelect, onToggle, onUpdateStatus, onUpdateRisk, onAskPenny, onDoubleClick,
}: {
  req: DemandRequest;
  accentCls: string;
  expanded: boolean;
  selected: boolean;
  onSelect:       () => void;
  onToggle:       () => void;
  onUpdateStatus: (s: RequestStatus) => void;
  onUpdateRisk:   (r: RiskLevel)     => void;
  onAskPenny:     () => void;
  onDoubleClick:  () => void;
}) {
  const risk = RISK_CFG[req.risk];
  const dot  = TYPE_DOT[req.type];

  type Action = { label: string; icon: React.ElementType; action: () => void; cls: string };
  const actions: Action[] = [];

  if (req.status === 'Triaged' || req.status === 'Backlog') {
    actions.push(
      { label: 'Move to Review', icon: ArrowRight,   action: () => onUpdateStatus('In Review'),  cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6] hover:bg-[#EDF5F8]' },
      { label: 'Approve',        icon: Check,         action: () => onUpdateStatus('Approved'),   cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE] hover:bg-[#E6F0EA]' },
    );
  } else if (req.status === 'In Review') {
    actions.push(
      { label: 'Approve',  icon: Check,         action: () => onUpdateStatus('Approved'),  cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE] hover:bg-[#E6F0EA]' },
      { label: 'Complete', icon: CheckCheck,     action: () => onUpdateStatus('Completed'), cls: 'text-primary/80 bg-primary/5 border-primary/20 hover:bg-primary/10' },
      { label: 'Defer',    icon: ChevronsDown,   action: () => onUpdateStatus('Backlog'),   cls: 'text-muted-foreground bg-muted hover:bg-muted/80 border-border' },
    );
  } else if (req.status === 'Approved') {
    actions.push(
      { label: 'Mark Complete', icon: CheckCheck,   action: () => onUpdateStatus('Completed'), cls: 'text-primary/80 bg-primary/5 border-primary/20 hover:bg-primary/10' },
      { label: 'Defer',         icon: ChevronsDown, action: () => onUpdateStatus('Backlog'),   cls: 'text-muted-foreground bg-muted hover:bg-muted/80 border-border' },
    );
  } else if (req.status === 'Completed') {
    actions.push(
      { label: 'Reopen', icon: RotateCcw, action: () => onUpdateStatus('In Review'), cls: 'text-muted-foreground bg-muted hover:bg-muted/80 border-border' },
    );
  }

  if (req.status !== 'Completed') {
    if (req.risk !== 'high') {
      actions.push({ label: 'Escalate', icon: AlertTriangle, action: () => onUpdateRisk('high'),   cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4] hover:bg-[#FBEAE6]' });
    } else {
      actions.push({ label: 'De-escalate', icon: TrendingDown, action: () => onUpdateRisk('normal'), cls: 'text-muted-foreground bg-muted hover:bg-muted/80 border-border' });
    }
  }

  return (
    <div className={`rounded-lg border bg-white overflow-hidden border-l-[3px] ${accentCls} ${
      selected ? 'border-primary/50 ring-1 ring-primary/20 shadow-sm' :
      expanded  ? 'border-primary/30 shadow-sm' : 'border-border hover:border-primary/20'
    } transition-colors`}>

      {/* Main row */}
      <div className="flex items-start group">
        <button
          onClick={onSelect}
          onDoubleClick={e => { e.preventDefault(); onDoubleClick(); }}
          title="Double-click to edit"
          className="flex-1 text-left px-3 py-2.5 flex items-start gap-2.5 min-w-0"
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="text-[14px] font-mono text-muted-foreground/60">{req.id}</span>
              <span className="text-[14px] text-muted-foreground">{req.type}</span>
              {risk && (
                <span className={`text-[14px] font-bold border rounded-full px-1 py-0.5 leading-none ${risk.cls}`}>
                  {risk.badge}
                </span>
              )}
              {req.sfSynced && (
                <span className="text-[14px] border rounded-full px-1 py-0.5 leading-none border-[#9FC3AE] text-[#245531] bg-[#E6F0EA]">
                  SF
                </span>
              )}
            </div>
            <p className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">
              {req.subject}
            </p>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <span className="text-[14px] text-muted-foreground">{req.program}</span>
              <span className="text-muted-foreground/30 text-[14px]">·</span>
              <span className="text-[14px] text-muted-foreground">{req.submitter}</span>
              <span className="text-muted-foreground/30 text-[14px]">·</span>
              <span className="text-[14px] text-muted-foreground">{req.age} ago</span>
              <span className="text-muted-foreground/30 text-[14px]">·</span>
              <span className="text-[14px] text-muted-foreground/30 group-hover:text-primary/40 transition-colors">double-click to edit</span>
            </div>
          </div>
        </button>

        {/* Right controls */}
        <div className="flex items-center gap-1 pr-2 pt-2.5 shrink-0">
          <select
            value={req.status}
            onChange={e => onUpdateStatus(e.target.value as RequestStatus)}
            onClick={e => e.stopPropagation()}
            className={`text-[14px] font-semibold border rounded-full px-1.5 py-0.5 bg-transparent cursor-pointer focus:outline-none ${STATUS_CFG[req.status].cls}`}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={e => { e.stopPropagation(); onAskPenny(); }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
            title={`Ask ${TERMS.aiAssistant}`}
          >
            <Sparkles className="w-3 h-3 text-primary/60" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            title="Expand actions"
            className="p-1 rounded hover:bg-muted/60 transition-colors"
          >
            <ChevronDown className={`w-3 h-3 text-muted-foreground/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-border/40 bg-muted/10">
          {req.notes && (
            <div className="px-3 py-2.5">
              <p className="text-[14px] font-bold  text-muted-foreground/50 mb-1">Notes</p>
              <p className="text-[14px] text-muted-foreground leading-relaxed">{req.notes}</p>
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap px-3 pb-2.5 pt-1 border-t border-border/30">
            {actions.map(a => (
              <button
                key={a.label}
                onClick={e => { e.stopPropagation(); a.action(); }}
                className={`flex items-center gap-1 text-[14px] font-semibold border rounded-full px-2 py-1 transition-colors ${a.cls}`}
              >
                <a.icon className="w-2.5 h-2.5" />
                {a.label}
              </button>
            ))}
            <button
              onClick={e => { e.stopPropagation(); onAskPenny(); }}
              className="flex items-center gap-1 text-[14px] font-semibold border rounded-full px-2 py-1 text-primary bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors ml-auto"
            >
              <Sparkles className="w-2.5 h-2.5" />
              Ask {TERMS.aiAssistant}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GroupSection ──────────────────────────────────────────────────────────────

function GroupSection({
  group, items, collapsed, onToggleCollapse, expandedId, onToggleExpand,
  onSelectItem, selectedId,
  onUpdateStatus, onUpdateRisk, onAskPenny,
  editingId, editDraft, onEditChange, onStartEdit, onSaveEdit, onCancelEdit, onSendEditToSF,
  sfSending, sfSent,
}: {
  group:           Group;
  items:           DemandRequest[];
  collapsed:       boolean;
  onToggleCollapse:() => void;
  expandedId:      string | null;
  onToggleExpand:  (id: string) => void;
  onSelectItem:    (req: DemandRequest) => void;
  selectedId:      string | null;
  onUpdateStatus:  (id: string, s: RequestStatus) => void;
  onUpdateRisk:    (id: string, r: RiskLevel)     => void;
  onAskPenny:      (req: DemandRequest) => void;
  // Inline edit
  editingId:       string | null;
  editDraft:       Partial<DemandRequest>;
  onEditChange:    (field: keyof DemandRequest, value: string) => void;
  onStartEdit:     (req: DemandRequest) => void;
  onSaveEdit:      () => void;
  onCancelEdit:    () => void;
  onSendEditToSF:  () => void;
  sfSending:       string | null;
  sfSent:          Set<string>;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      {/* Group header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center gap-2 mb-2 group"
      >
        {group.priority && (
          <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 ${group.pillCls}`}>
            {group.priority}
          </span>
        )}
        <span className={`text-[14px] font-bold  shrink-0 ${group.headingCls}`}>
          {group.label}
        </span>
        <div className="flex-1 h-px bg-border" />
        <span className="text-[14px] text-muted-foreground/50 shrink-0">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground/40 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="space-y-1.5 mb-4">
          {items.map(req =>
            editingId === req.id ? (
              <InlineEditForm
                key={req.id}
                req={req}
                draft={editDraft}
                onChange={onEditChange}
                onSave={onSaveEdit}
                onCancel={onCancelEdit}
                onSendToSF={onSendEditToSF}
                isSending={sfSending === req.id}
                isSent={sfSent.has(req.id)}
              />
            ) : (
              <RequestRow
                key={req.id}
                req={req}
                accentCls={group.accentCls}
                expanded={expandedId === req.id}
                selected={selectedId === req.id}
                onSelect={() => onSelectItem(req)}
                onToggle={() => onToggleExpand(req.id)}
                onUpdateStatus={s => onUpdateStatus(req.id, s)}
                onUpdateRisk={r => onUpdateRisk(req.id, r)}
                onAskPenny={() => onAskPenny(req)}
                onDoubleClick={() => onStartEdit(req)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Triage Summary panel ──────────────────────────────────────────────────────

function TriageSummary({
  requests,
  onAskPennyQueue,
}: {
  requests: DemandRequest[];
  onAskPennyQueue: () => void;
}) {
  const open    = requests.filter(r => r.status !== 'Completed');
  const p1      = requests.filter(r => r.risk === 'high' && r.status !== 'Completed');
  const p2      = requests.filter(r => r.risk === 'elevated' && r.status !== 'Completed');
  const byType  = (['New Feature', 'Bug / Issue', 'Change Request', 'Content Update', 'Admin'] as RequestType[])
    .map(t => ({ type: t, count: open.filter(r => r.type === t).length, dot: TYPE_DOT[t] }))
    .filter(t => t.count > 0);

  const programs = Array.from(new Set(open.map(r => r.program)));

  const totalOpen = open.length;

  return (
    <div className="space-y-3">

      {/* Priority breakdown */}
      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <div className="px-3 py-2 border-b border-border/50 bg-muted/20">
          <p className="text-[14px] font-bold  text-muted-foreground/60">Priority Breakdown</p>
        </div>
        <div className="p-3 space-y-2">
          {[
            { label: 'P1 · Critical',  count: p1.length,             cls: 'bg-[#FBEAE6]0',           text: 'text-[#A93F2F]' },
            { label: 'P2 · Elevated',  count: p2.length,             cls: 'bg-[#CC8400]',           text: 'text-[#CC8400]' },
            { label: 'P3 · Normal',    count: open.length - p1.length - p2.length, cls: 'bg-primary/40', text: 'text-muted-foreground' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-2">
              <span className={`text-[14px] font-medium text-muted-foreground flex-1 truncate`}>{row.label}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.cls}`}
                    style={{ width: totalOpen > 0 ? `${(row.count / totalOpen) * 100}%` : '0%' }}
                  />
                </div>
                <span className={`text-[14px] font-bold w-4 text-right ${row.text}`}>{row.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By type */}
      {byType.length > 0 && (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50 bg-muted/20">
            <p className="text-[14px] font-bold  text-muted-foreground/60">By Type</p>
          </div>
          <div className="p-3 space-y-1.5">
            {byType.map(t => (
              <div key={t.type} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.dot}`} />
                <span className="text-[14px] text-muted-foreground flex-1 truncate">{t.type}</span>
                <span className="text-[14px] font-bold text-foreground">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By program */}
      {programs.length > 0 && (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50 bg-muted/20">
            <p className="text-[14px] font-bold  text-muted-foreground/60">By Program</p>
          </div>
          <div className="p-3 space-y-1.5">
            {programs.map(prog => {
              const count = open.filter(r => r.program === prog).length;
              return (
                <div key={prog} className="flex items-center gap-2">
                  <span className="text-[14px] text-muted-foreground flex-1 truncate">{prog}</span>
                  <span className="text-[14px] font-bold text-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ask Penny: full queue */}
      <button
        onClick={onAskPennyQueue}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 hover:bg-primary/10 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <div className="text-left">
            <p className="text-[14px] font-semibold text-primary">Analyze with {TERMS.aiAssistant}</p>
            <p className="text-[14px] text-primary/60">Prioritize and flag risks across all open requests</p>
          </div>
        </div>
        <ChevronRight className="w-3 h-3 text-primary/40 group-hover:text-primary transition-colors shrink-0" />
      </button>
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'action' | 'active' | 'backlog';

const FILTER_OPTS: { key: FilterKey; label: string }[] = [
  { key: 'all',     label: 'All'           },
  { key: 'action',  label: 'Needs Action'  },
  { key: 'active',  label: 'Active'        },
  { key: 'backlog', label: 'Backlog'       },
];

// ── Main ──────────────────────────────────────────────────────────────────────

const BLANK_NEW: Partial<DemandRequest> = {
  type: 'New Feature', program: "Explorer's Trail", status: 'Triaged', risk: 'normal', subject: '', notes: '',
};

let nextReqNum = 32; // increments for local drafts

export default function Intake() {
  const { setAskPennyOpen, setCalendarPanelOpen, setPendingPennyQuery, setSelectedItem, selectedItem } = useAppContext();
  const { isEveryday } = useTierFlags();

  // Start empty — SEED_REQUESTS is kept above for local development reference only.
  // In production this list is populated via the "New Request" form and SF sync.
  const [requests,    setRequests   ] = useState<DemandRequest[]>([]);
  const [filter,      setFilter     ] = useState<FilterKey>('all');
  const [expandedId,  setExpandedId ] = useState<string | null>(null);
  const [collapsed,   setCollapsed  ] = useState<Set<string>>(new Set(['done']));

  // ── Inline edit state ──
  const [editingId,   setEditingId  ] = useState<string | null>(null);
  const [editDraft,   setEditDraft  ] = useState<Partial<DemandRequest>>({});
  const [sfSending,   setSfSending  ] = useState<string | null>(null); // id being sent
  const [sfSent,      setSfSent     ] = useState<Set<string>>(new Set());

  // ── New demand form state ──
  const [showNewForm, setShowNewForm] = useState(false);
  const [newDraft,    setNewDraft   ] = useState<Partial<DemandRequest>>({ ...BLANK_NEW });
  const [newSfSending,setNewSfSending] = useState(false);

  // ── Derived ──
  const open      = requests.filter(r => r.status !== 'Completed');
  const p1        = requests.filter(r => r.risk === 'high' && r.status !== 'Completed');
  const p2        = requests.filter(r => r.risk === 'elevated' && r.status !== 'Completed');
  const inReview  = requests.filter(r => r.status === 'In Review' || r.status === 'Approved');
  const closed30d = requests.filter(r => r.status === 'Completed').length;

  const groups = GROUPS.map(g => ({ ...g, items: sortGroup(requests.filter(g.filter)) }));
  const filteredGroups = filter === 'all'     ? groups :
    filter === 'action'  ? groups.filter(g => g.key === 'critical' || g.key === 'elevated') :
    filter === 'active'  ? groups.filter(g => g.key === 'active')  :
    filter === 'backlog' ? groups.filter(g => g.key === 'queued')  :
    groups;

  const filterCount = (f: FilterKey) => {
    if (f === 'all')     return requests.length;
    if (f === 'action')  return p1.length + p2.length;
    if (f === 'active')  return inReview.length;
    if (f === 'backlog') return requests.filter(r => (r.status === 'Triaged' || r.status === 'Backlog') && r.risk === 'normal').length;
    return 0;
  };

  // ── Status / risk handlers ──
  function updateStatus(id: string, status: RequestStatus) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (expandedId === id) setExpandedId(null);
  }
  function updateRisk(id: string, risk: RiskLevel) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, risk } : r));
  }
  function toggleCollapse(key: string) {
    setCollapsed(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  // ── Inline edit handlers ──
  function handleStartEdit(req: DemandRequest) {
    setEditingId(req.id);
    setEditDraft({ ...req });
    setExpandedId(null);
  }
  function handleEditChange(field: keyof DemandRequest, value: string) {
    setEditDraft(prev => ({ ...prev, [field]: value }));
  }
  function handleSaveEdit() {
    if (!editingId) return;
    setRequests(prev => prev.map(r => r.id === editingId ? { ...r, ...editDraft } : r));
    setEditingId(null);
    setEditDraft({});
  }
  function handleCancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }
  function handleSendEditToSF() {
    if (!editingId) return;
    const id = editingId;
    setSfSending(id);
    // Simulate SF submission — mark as synced after 1.5s
    setTimeout(() => {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, ...editDraft, sfSynced: true } : r));
      setSfSending(null);
      setSfSent(prev => new Set([...prev, id]));
      setEditingId(null);
      setEditDraft({});
    }, 1500);
  }

  // ── New demand form handlers ──
  function handleNewFormChange(field: keyof DemandRequest, value: string) {
    setNewDraft(prev => ({ ...prev, [field]: value }));
  }
  function buildNewRequest(sfSynced: boolean): DemandRequest {
    const id = `REQ-${String(nextReqNum++).padStart(3, '0')}`;
    return {
      id,
      type:      (newDraft.type      ?? 'New Feature') as RequestType,
      subject:   newDraft.subject    ?? '',
      submitter: 'Me',
      age:       '0d',
      status:    'Triaged',
      risk:      (newDraft.risk      ?? 'normal') as RiskLevel,
      program:   newDraft.program    ?? "Explorer's Trail",
      notes:     newDraft.notes,
      sfSynced,
    };
  }
  function handleSaveNewLocally() {
    setRequests(prev => [buildNewRequest(false), ...prev]);
    setShowNewForm(false);
    setNewDraft({ ...BLANK_NEW });
  }
  function handleSendNewToSF() {
    setNewSfSending(true);
    setTimeout(() => {
      setRequests(prev => [buildNewRequest(true), ...prev]);
      setNewSfSending(false);
      setShowNewForm(false);
      setNewDraft({ ...BLANK_NEW });
    }, 1500);
  }
  function handleCancelNew() {
    setShowNewForm(false);
    setNewDraft({ ...BLANK_NEW });
  }

  // ── Penny handlers ──
  function handleAskPennyAbout(req: DemandRequest) {
    const query =
      `Internal Demand Request ${req.id}: "${req.subject}"\n` +
      `Type: ${req.type} · Status: ${req.status} · Risk: ${req.risk} · Age: ${req.age} ago\n` +
      `Program: ${req.program} · Submitted by: ${req.submitter}\n` +
      (req.notes ? `\nContext: ${req.notes}\n` : '') +
      `\nHelp me assess the priority of this request, recommend the most important next actions, and flag any dependencies or risks that need attention.`;
    setCalendarPanelOpen(false);
    setAskPennyOpen(true);
    setPendingPennyQuery(query);
  }
  function handleSelectItem(req: DemandRequest) {
    setSelectedItem({ type: 'demandRequest', id: req.id, data: req });
  }
  function handleAskPennyQueue() {
    const summary = open
      .map(r => `• ${r.id} [${r.risk === 'high' ? 'P1' : r.risk === 'elevated' ? 'P2' : 'P3'}] "${r.subject}" — ${r.status}, ${r.age} ago (${r.program})`)
      .join('\n');
    const query =
      `Current open demand queue (${open.length} items):\n\n${summary}\n\n` +
      `Please: (1) rank these by priority and urgency, (2) flag any items that are overdue for action, (3) identify any that could be batched or consolidated, and (4) recommend the single most important thing to act on today.`;
    setCalendarPanelOpen(false);
    setAskPennyOpen(true);
    setPendingPennyQuery(query);
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-[14px] font-semibold text-foreground">Demand Queue</span>
            <span className="text-[14px] text-muted-foreground/40">·</span>
            <span className="text-[14px] text-muted-foreground/60">{open.length} open</span>
          </div>
          {!isEveryday && (
            <button
              onClick={() => { setShowNewForm(true); setEditingId(null); }}
              disabled={showNewForm}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[14px] font-bold hover:opacity-85 transition-opacity shrink-0 disabled:opacity-40"
            >
              <Plus className="w-3 h-3" /> New Request
            </button>
          )}
        </div>

        {/* ── Metric chips ── */}
        <div className="flex items-stretch gap-2 flex-wrap">
          {[
            { label: 'Open',        value: open.length,      cls: 'border-border bg-white',        numCls: 'text-foreground'  },
            { label: 'P1 Critical', value: p1.length,        cls: 'border-[#E8B9B4] bg-[#FBEAE6]', numCls: 'text-[#A93F2F]'   },
            { label: 'P2 Elevated', value: p2.length,        cls: 'border-[#FFD08A] bg-[#FFF3E0]', numCls: 'text-[#CC8400]'   },
            { label: 'In Review',   value: inReview.length,  cls: 'border-[#7FAFC6] bg-[#EDF5F8]', numCls: 'text-[#2F6F7E]'   },
            { label: 'Closed 30d',  value: closed30d,        cls: 'border-[#9FC3AE] bg-[#E6F0EA]', numCls: 'text-[#245531]'   },
          ].map(m => (
            <div key={m.label} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${m.cls}`}>
              <span className={`text-[20px] font-bold leading-none ${m.numCls}`}>{m.value}</span>
              <span className="text-[14px] font-medium text-muted-foreground leading-tight max-w-[52px]">{m.label}</span>
            </div>
          ))}
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left: queue */}
          <div className="lg:col-span-2 space-y-4">

            <SfCasesStrip />

            {/* Inline new demand form — shown at top of queue */}
            {showNewForm && (
              <NewDemandForm
                draft={newDraft}
                onChange={handleNewFormChange}
                onSave={handleSaveNewLocally}
                onSendToSF={handleSendNewToSF}
                onCancel={handleCancelNew}
                isSending={newSfSending}
              />
            )}

            {/* Filter tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              {FILTER_OPTS.map(f => {
                const count = filterCount(f.key);
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[14px] font-semibold transition-colors border ${
                      filter === f.key
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    }`}
                  >
                    {f.label}
                    <span className={`text-[14px] rounded-full px-1 leading-none ${filter === f.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Priority groups */}
            <div>
              {filteredGroups.every(g => g.items.length === 0) ? (
                <div className="rounded-lg border border-border bg-white/60 px-4 py-8 text-center">
                  <p className="text-[14px] font-semibold text-foreground mb-1">No items in this view</p>
                  <p className="text-[14px] text-muted-foreground">
                    {filter === 'action' ? 'No requests currently flagged as at-risk or elevated.' :
                     filter === 'active' ? 'No items currently in review or approved.' :
                     filter === 'backlog' ? 'The backlog is clear.' :
                     'No demand requests found.'}
                  </p>
                </div>
              ) : (
                filteredGroups.map(g => (
                  <GroupSection
                    key={g.key}
                    group={g}
                    items={g.items}
                    collapsed={collapsed.has(g.key)}
                    onToggleCollapse={() => toggleCollapse(g.key)}
                    expandedId={expandedId}
                    onToggleExpand={toggleExpand}
                    onSelectItem={handleSelectItem}
                    selectedId={selectedItem?.type === 'demandRequest' ? selectedItem.id : null}
                    onUpdateStatus={updateStatus}
                    onUpdateRisk={updateRisk}
                    onAskPenny={handleAskPennyAbout}
                    editingId={editingId}
                    editDraft={editDraft}
                    onEditChange={handleEditChange}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onSendEditToSF={handleSendEditToSF}
                    sfSending={sfSending}
                    sfSent={sfSent}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: triage summary */}
          <div className="lg:col-span-1">
            <TriageSummary
              requests={requests}
              onAskPennyQueue={handleAskPennyQueue}
            />
          </div>

        </div>
      </div>
    </ScrollArea>
  );
}
