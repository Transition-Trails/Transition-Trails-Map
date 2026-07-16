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
  notes?: string;
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
  Triaged:     { cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  'In Review': { cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  Approved:    { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Backlog:     { cls: 'bg-muted text-muted-foreground border-border' },
  Completed:   { cls: 'bg-primary/10 text-primary border-primary/20' },
};

const RISK_CFG: Record<RiskLevel, { badge: string; cls: string } | null> = {
  high:     { badge: 'At Risk',  cls: 'text-rose-700 bg-rose-50 border-rose-200' },
  elevated: { badge: 'Elevated', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  normal:   null,
};

const TYPE_DOT: Record<RequestType, string> = {
  'New Feature':    'bg-violet-400',
  'Bug / Issue':    'bg-rose-400',
  'Content Update': 'bg-sky-400',
  'Change Request': 'bg-amber-400',
  'Admin':          'bg-slate-400',
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
    pillCls:    'bg-rose-50 text-rose-700 border-rose-200',
    accentCls:  'border-l-rose-400',
    headingCls: 'text-rose-700',
    filter: r => r.risk === 'high' && r.status !== 'Completed',
  },
  {
    key: 'elevated', label: 'Elevated Priority', priority: 'P2',
    pillCls:    'bg-amber-50 text-amber-700 border-amber-200',
    accentCls:  'border-l-amber-400',
    headingCls: 'text-amber-700',
    filter: r => r.risk === 'elevated' && r.status !== 'Completed',
  },
  {
    key: 'active', label: 'In Progress', priority: 'P3',
    pillCls:    'bg-sky-50 text-sky-700 border-sky-200',
    accentCls:  'border-l-sky-300',
    headingCls: 'text-sky-700',
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
    pillCls:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentCls:  'border-l-emerald-300',
    headingCls: 'text-emerald-700',
    filter: r => r.status === 'Completed',
  },
];

// Sort within a group: by age descending (oldest = highest urgency)
function sortGroup(items: DemandRequest[]) {
  return [...items].sort((a, b) => parseInt(b.age) - parseInt(a.age));
}

// ── Live Salesforce Cases Strip (unchanged) ───────────────────────────────────

const CASE_PRIORITY_CFG: Record<string, { cls: string; label: string }> = {
  High:   { cls: 'text-rose-700 bg-rose-50 border-rose-200',    label: 'High'   },
  Medium: { cls: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Medium' },
  Low:    { cls: 'text-slate-600 bg-slate-50 border-slate-200', label: 'Low'    },
};

function SfCasesStrip() {
  const { data, isLoading, isError, refetch, isFetching } = useSfOpsCases();
  const { setAskPennyOpen, setCalendarPanelOpen, setPendingPennyQuery } = useAppContext();
  const [focusedCaseId, setFocusedCaseId] = useState<string | null>(null);
  const [sfOpen, setSfOpen] = useState(true);

  const n = (v: number | null | undefined) => v == null ? '—' : v.toLocaleString();
  const syncLabel = data ? formatSyncAge(data.lastUpdated) : null;
  const isStale   = data && data.cacheAge > 5 * 60;

  const focusedCase = focusedCaseId && data
    ? data.cases.find(c => c.Id === focusedCaseId) ?? null
    : null;

  function handleFocusCase(c: SfCase, contactName: string | null) {
    const age   = caseAge(c.CreatedDate);
    const query =
      `SF Case ${c.CaseNumber ?? c.Id}: "${c.Subject ?? 'No subject'}"\n` +
      `Priority: ${c.Priority ?? '—'} · Status: ${c.Status ?? '—'} · Contact: ${contactName ?? '—'} · Age: ${age}\n\n` +
      `Summarise the key risks for this case, recommend the most important next actions for the Transition Trails team, and flag any connections to current program delivery or open demand items.`;
    setFocusedCaseId(c.Id);
    setCalendarPanelOpen(false);
    setAskPennyOpen(true);
    setPendingPennyQuery(query);
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-white overflow-hidden">

      {/* Header bar — div with two click zones to avoid nested <button> */}
      <div className="px-3 py-2 border-b border-emerald-200/80 bg-emerald-50/60 flex items-center justify-between">
        <button
          onClick={() => setSfOpen(v => !v)}
          className="flex items-center gap-1.5 flex-wrap text-left flex-1 min-w-0"
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isLoading || isFetching ? 'bg-amber-400 animate-pulse'
            : isError  ? 'bg-rose-500'
            : isStale  ? 'bg-amber-400'
            : 'bg-emerald-500'
          }`} />
          <Database className="w-2.5 h-2.5 text-emerald-700/60" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800">
            Live · Salesforce Cases
          </span>
          {data && (
            <span className={`text-[9px] ${isStale ? 'text-amber-600' : 'text-emerald-600/70'}`}>
              · {isStale ? 'stale · ' : ''}{syncLabel}
            </span>
          )}
          {data && (
            <span className="text-[9px] text-emerald-700/60">
              · {n(data.totalOpen)} open · {n(data.highPriority)} high priority
            </span>
          )}
          <ChevronDown className={`w-3 h-3 text-emerald-700/50 transition-transform ml-1 ${sfOpen ? '' : '-rotate-90'}`} />
        </button>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-[9px] text-emerald-700/60 hover:text-emerald-800 flex items-center gap-0.5 disabled:opacity-40 ml-2 shrink-0"
          aria-label="Refresh cases"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {sfOpen && (
        <>
          {isError ? (
            <div className="px-4 py-3 flex items-center gap-2">
              <WifiOff className="w-3 h-3 text-rose-500 shrink-0" />
              <span className="text-[10px] text-rose-600 flex-1">Salesforce unreachable — cases unavailable.</span>
              <button onClick={() => refetch()} className="text-[10px] font-semibold text-rose-700 hover:underline flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" /> Retry
              </button>
            </div>
          ) : isLoading ? (
            <div className="p-3 space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-7 rounded bg-muted/40 animate-pulse" />)}
            </div>
          ) : data && data.cases.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-[11px] text-muted-foreground">No open cases in Salesforce.</p>
            </div>
          ) : data ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap w-[80px]">Priority</th>
                      <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap w-[90px]">Case #</th>
                      <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">Subject</th>
                      <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap w-[100px]">Status</th>
                      <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap w-[140px] hidden md:table-cell">Contact</th>
                      <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap w-[52px] text-right">Age</th>
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
                          onClick={() => handleFocusCase(c, contactName)}
                          className={`cursor-pointer transition-colors group border-l-2 ${
                            isFocused
                              ? 'bg-primary/5 border-l-primary'
                              : 'hover:bg-muted/20 border-l-transparent'
                          }`}
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`text-[8px] font-bold border rounded-full px-1.5 py-0.5 leading-none ${priCfg.cls}`}>
                              {priCfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {sfUrl ? (
                              <a href={sfUrl} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-[10px] font-mono font-semibold text-primary hover:underline">
                                {c.CaseNumber ?? c.Id.slice(0, 8)}
                              </a>
                            ) : (
                              <span className="text-[10px] font-mono text-muted-foreground/60">
                                {c.CaseNumber ?? '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 max-w-0">
                            <p className="text-[11px] font-medium text-foreground truncate leading-snug">
                              {c.Subject ?? '(No subject)'}
                            </p>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="text-[10px] text-muted-foreground">{c.Status ?? '—'}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">
                            <span className="text-[10px] text-muted-foreground/70">{contactName ?? '—'}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <span className="text-[10px] text-muted-foreground/50">{caseAge(c.CreatedDate)}</span>
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
                  <p className="text-[10px] text-primary flex-1 truncate">
                    <span className="font-semibold">Focused:</span> {focusedCase.CaseNumber} · {focusedCase.Subject ?? 'No subject'}
                    <span className="text-primary/60 ml-1">— {TERMS.aiAssistant} insights loading in right panel</span>
                  </p>
                  <button onClick={() => setFocusedCaseId(null)} className="text-primary/50 hover:text-primary transition-colors shrink-0" aria-label="Clear focus">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="px-3 py-1.5 border-t border-border/40">
                  <p className="text-[9px] text-muted-foreground/40">Click any row to get {TERMS.aiAssistant} insights about that case</p>
                </div>
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

// ── RequestRow ────────────────────────────────────────────────────────────────

function RequestRow({
  req, accentCls, expanded, onToggle, onUpdateStatus, onUpdateRisk, onAskPenny,
}: {
  req: DemandRequest;
  accentCls: string;
  expanded: boolean;
  onToggle: () => void;
  onUpdateStatus: (s: RequestStatus) => void;
  onUpdateRisk:   (r: RiskLevel)     => void;
  onAskPenny:     () => void;
}) {
  const risk = RISK_CFG[req.risk];
  const dot  = TYPE_DOT[req.type];

  type Action = { label: string; icon: React.ElementType; action: () => void; cls: string };
  const actions: Action[] = [];

  if (req.status === 'Triaged' || req.status === 'Backlog') {
    actions.push(
      { label: 'Move to Review', icon: ArrowRight,   action: () => onUpdateStatus('In Review'),  cls: 'text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100' },
      { label: 'Approve',        icon: Check,         action: () => onUpdateStatus('Approved'),   cls: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
    );
  } else if (req.status === 'In Review') {
    actions.push(
      { label: 'Approve',  icon: Check,         action: () => onUpdateStatus('Approved'),  cls: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
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
      actions.push({ label: 'Escalate', icon: AlertTriangle, action: () => onUpdateRisk('high'),   cls: 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100' });
    } else {
      actions.push({ label: 'De-escalate', icon: TrendingDown, action: () => onUpdateRisk('normal'), cls: 'text-muted-foreground bg-muted hover:bg-muted/80 border-border' });
    }
  }

  return (
    <div className={`rounded-lg border bg-white overflow-hidden border-l-[3px] ${accentCls} ${
      expanded ? 'border-primary/30 shadow-sm' : 'border-border hover:border-primary/20'
    } transition-colors`}>

      {/* Main row */}
      <div className="flex items-start group">
        <button onClick={onToggle} className="flex-1 text-left px-3 py-2.5 flex items-start gap-2.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="text-[9px] font-mono text-muted-foreground/60">{req.id}</span>
              <span className="text-[9px] text-muted-foreground">{req.type}</span>
              {risk && (
                <span className={`text-[8px] font-bold border rounded-full px-1 py-0.5 leading-none ${risk.cls}`}>
                  {risk.badge}
                </span>
              )}
            </div>
            <p className="text-[12px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">
              {req.subject}
            </p>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground">{req.program}</span>
              <span className="text-muted-foreground/30 text-[9px]">·</span>
              <span className="text-[10px] text-muted-foreground">{req.submitter}</span>
              <span className="text-muted-foreground/30 text-[9px]">·</span>
              <span className="text-[10px] text-muted-foreground">{req.age} ago</span>
            </div>
          </div>
        </button>

        {/* Right controls */}
        <div className="flex items-center gap-1 pr-2 pt-2.5 shrink-0">
          <select
            value={req.status}
            onChange={e => onUpdateStatus(e.target.value as RequestStatus)}
            onClick={e => e.stopPropagation()}
            className={`text-[9px] font-semibold border rounded-full px-1.5 py-0.5 bg-transparent cursor-pointer focus:outline-none ${STATUS_CFG[req.status].cls}`}
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
          <button onClick={onToggle}>
            <ChevronDown className={`w-3 h-3 text-muted-foreground/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-border/40 bg-muted/10">
          {req.notes && (
            <div className="px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Notes</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{req.notes}</p>
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap px-3 pb-2.5 pt-1 border-t border-border/30">
            {actions.map(a => (
              <button
                key={a.label}
                onClick={e => { e.stopPropagation(); a.action(); }}
                className={`flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-1 transition-colors ${a.cls}`}
              >
                <a.icon className="w-2.5 h-2.5" />
                {a.label}
              </button>
            ))}
            <button
              onClick={e => { e.stopPropagation(); onAskPenny(); }}
              className="flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-1 text-primary bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors ml-auto"
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
  onUpdateStatus, onUpdateRisk, onAskPenny,
}: {
  group:           Group;
  items:           DemandRequest[];
  collapsed:       boolean;
  onToggleCollapse:() => void;
  expandedId:      string | null;
  onToggleExpand:  (id: string) => void;
  onUpdateStatus:  (id: string, s: RequestStatus) => void;
  onUpdateRisk:    (id: string, r: RiskLevel)     => void;
  onAskPenny:      (req: DemandRequest) => void;
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
          <span className={`text-[8px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 ${group.pillCls}`}>
            {group.priority}
          </span>
        )}
        <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${group.headingCls}`}>
          {group.label}
        </span>
        <div className="flex-1 h-px bg-border" />
        <span className="text-[9px] text-muted-foreground/50 shrink-0">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground/40 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="space-y-1.5 mb-4">
          {items.map(req => (
            <RequestRow
              key={req.id}
              req={req}
              accentCls={group.accentCls}
              expanded={expandedId === req.id}
              onToggle={() => onToggleExpand(req.id)}
              onUpdateStatus={s => onUpdateStatus(req.id, s)}
              onUpdateRisk={r => onUpdateRisk(req.id, r)}
              onAskPenny={() => onAskPenny(req)}
            />
          ))}
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
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Priority Breakdown</p>
        </div>
        <div className="p-3 space-y-2">
          {[
            { label: 'P1 · Critical',  count: p1.length,             cls: 'bg-rose-500',           text: 'text-rose-700' },
            { label: 'P2 · Elevated',  count: p2.length,             cls: 'bg-amber-400',           text: 'text-amber-700' },
            { label: 'P3 · Normal',    count: open.length - p1.length - p2.length, cls: 'bg-primary/40', text: 'text-muted-foreground' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-2">
              <span className={`text-[10px] font-medium text-muted-foreground flex-1 truncate`}>{row.label}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.cls}`}
                    style={{ width: totalOpen > 0 ? `${(row.count / totalOpen) * 100}%` : '0%' }}
                  />
                </div>
                <span className={`text-[11px] font-bold w-4 text-right ${row.text}`}>{row.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By type */}
      {byType.length > 0 && (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50 bg-muted/20">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">By Type</p>
          </div>
          <div className="p-3 space-y-1.5">
            {byType.map(t => (
              <div key={t.type} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.dot}`} />
                <span className="text-[10px] text-muted-foreground flex-1 truncate">{t.type}</span>
                <span className="text-[11px] font-bold text-foreground">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By program */}
      {programs.length > 0 && (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50 bg-muted/20">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">By Program</p>
          </div>
          <div className="p-3 space-y-1.5">
            {programs.map(prog => {
              const count = open.filter(r => r.program === prog).length;
              return (
                <div key={prog} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground flex-1 truncate">{prog}</span>
                  <span className="text-[11px] font-bold text-foreground">{count}</span>
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
            <p className="text-[11px] font-semibold text-primary">Analyze with {TERMS.aiAssistant}</p>
            <p className="text-[9px] text-primary/60">Prioritize and flag risks across all open requests</p>
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

export default function Intake() {
  const { openActionPanel, setAskPennyOpen, setCalendarPanelOpen, setPendingPennyQuery } = useAppContext();
  const { isEveryday } = useTierFlags();

  const [requests, setRequests] = useState<DemandRequest[]>([...SEED_REQUESTS]);
  const [filter,      setFilter     ] = useState<FilterKey>('all');
  const [expandedId,  setExpandedId ] = useState<string | null>(null);
  const [collapsed,   setCollapsed  ] = useState<Set<string>>(new Set(['done']));

  // ── Derived ──
  const open      = requests.filter(r => r.status !== 'Completed');
  const p1        = requests.filter(r => r.risk === 'high' && r.status !== 'Completed');
  const p2        = requests.filter(r => r.risk === 'elevated' && r.status !== 'Completed');
  const inReview  = requests.filter(r => r.status === 'In Review' || r.status === 'Approved');
  const closed30d = requests.filter(r => r.status === 'Completed').length;

  // ── Group items (sort each group oldest→newest for urgency) ──
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

  // ── Handlers ──
  function updateStatus(id: string, status: RequestStatus) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (expandedId === id) setExpandedId(null);
  }

  function updateRisk(id: string, risk: RiskLevel) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, risk } : r));
  }

  function toggleCollapse(key: string) {
    setCollapsed(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

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

  function handleNewRequest() {
    openActionPanel({
      title: 'New Request',
      objectType: 'Demand Request',
      subtitle: 'Submit a work request, change proposal, or feature idea.',
      fields: [
        {
          id: 'type', label: 'Request Type', type: 'select', required: true,
          options: ['New Feature', 'Bug / Issue', 'Content Update', 'Change Request', 'Admin'],
        },
        { id: 'subject', label: 'Subject', type: 'text', required: true, placeholder: 'Brief description of the request…' },
        {
          id: 'program', label: 'Program', type: 'select', required: true,
          options: ["Explorer's Trail", 'Foundations Trail', 'Guided Trail', 'Trail of Mastery', 'Digital Compass', 'All Programs'],
        },
        { id: 'detail', label: 'Detail', type: 'textarea', placeholder: 'What needs to happen and why?', rows: 3 },
        { id: 'priority', label: 'Priority', type: 'select', options: ['Normal', 'Elevated', 'Critical'] },
      ],
    });
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5 flex items-center gap-1.5">
              <GitBranch className="w-2.5 h-2.5" />
              Operations · Demand
            </p>
            <h1 className="text-[15px] font-semibold text-foreground leading-snug">Demand Queue</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed max-w-sm">
              Triage, prioritize, and move work forward. Click any item to take action.
            </p>
          </div>
          {!isEveryday && (
            <button
              onClick={handleNewRequest}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[11px] font-bold hover:opacity-85 transition-opacity shrink-0 mt-1"
            >
              <Plus className="w-3 h-3" />
              New Request
            </button>
          )}
        </div>

        {/* ── Metric chips ──────────────────────────────────────────────── */}
        <div className="flex items-stretch gap-2 flex-wrap">
          {[
            { label: 'Open',        value: open.length,      cls: 'border-border bg-white',          numCls: 'text-foreground'  },
            { label: 'P1 Critical', value: p1.length,        cls: 'border-rose-200 bg-rose-50',       numCls: 'text-rose-700'    },
            { label: 'P2 Elevated', value: p2.length,        cls: 'border-amber-200 bg-amber-50',     numCls: 'text-amber-700'   },
            { label: 'In Review',   value: inReview.length,  cls: 'border-sky-200 bg-sky-50',         numCls: 'text-sky-800'     },
            { label: 'Closed 30d',  value: closed30d,        cls: 'border-emerald-200 bg-emerald-50', numCls: 'text-emerald-800' },
          ].map(m => (
            <div key={m.label} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${m.cls}`}>
              <span className={`text-[20px] font-bold leading-none ${m.numCls}`}>{m.value}</span>
              <span className="text-[9px] font-medium text-muted-foreground leading-tight max-w-[52px]">{m.label}</span>
            </div>
          ))}
        </div>

        {/* ── Two-column layout ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Left: queue ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* SF Cases */}
            <SfCasesStrip />

            {/* Filter tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              {FILTER_OPTS.map(f => {
                const count = filterCount(f.key);
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors border ${
                      filter === f.key
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    }`}
                  >
                    {f.label}
                    <span className={`text-[9px] rounded-full px-1 leading-none ${filter === f.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
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
                  <p className="text-[12px] font-semibold text-foreground mb-1">No items in this view</p>
                  <p className="text-[11px] text-muted-foreground">
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
                    onUpdateStatus={updateStatus}
                    onUpdateRisk={updateRisk}
                    onAskPenny={handleAskPennyAbout}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Right: triage summary ──────────────────────────────────── */}
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
