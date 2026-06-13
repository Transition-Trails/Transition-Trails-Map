import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import { useSfOpsCases, caseAge } from '@/hooks/useSfOpsCases';
import { formatSyncAge } from '@/hooks/useSfOpsSummary';
import {
  AlertTriangle, CheckCircle2, Clock, ChevronRight, ChevronDown, Plus, GitBranch,
  Database, RefreshCw, WifiOff,
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

// ── Data ───────────────────────────────────────────────────────────────────────

const REQUESTS: DemandRequest[] = [
  {
    id: 'REQ-031', type: 'New Feature',    status: 'Triaged',   risk: 'normal',   age: '2d',  submitter: 'L. Torres',
    subject: "Add quiz checkpoints to Explorer's Trail",
    program: "Explorer's Trail",
    notes: 'Requested as part of Q3 engagement improvements. Needs product review before scoping.',
  },
  {
    id: 'REQ-030', type: 'Bug / Issue',    status: 'In Review', risk: 'high',     age: '4d',  submitter: 'M. Reyes',
    subject: 'Penny not responding to RESOLVE questions',
    program: 'RESOLVE',
    notes: 'Reported in #penny-support. No owner assigned. 4 days without triage — elevated risk to RESOLVE cohort delivery.',
  },
  {
    id: 'REQ-029', type: 'Content Update', status: 'Approved',  risk: 'normal',   age: '5d',  submitter: 'K. Brooks',
    subject: 'Update Guided Trail module 4 pacing guide',
    program: 'Guided Trail',
    notes: 'Approved by L. Torres. In progress — Drive doc revision underway.',
  },
  {
    id: 'REQ-028', type: 'New Feature',    status: 'Backlog',   risk: 'elevated', age: '7d',  submitter: 'T. Nguyen',
    subject: 'Automated reminder emails for Trail Quests',
    program: 'All Programs',
    notes: '7 days in backlog with no action. Requires Penny delivery pipeline. Recommend triage or deferral decision.',
  },
  {
    id: 'REQ-027', type: 'Admin',          status: 'Completed', risk: 'normal',   age: '9d',  submitter: 'A. Johnson',
    subject: 'Add new program cohort dates for Q4',
    program: 'Foundations Trail',
    notes: 'Completed. Salesforce cohort records updated for Q4 schedule.',
  },
  {
    id: 'REQ-026', type: 'Change Request', status: 'In Review', risk: 'elevated', age: '12d', submitter: 'L. Torres',
    subject: 'Revise Sprint 2 learner assessment rubric',
    program: 'Guided Trail',
    notes: '12 days open. Review with program lead needed before Sprint 2 closes.',
  },
  {
    id: 'REQ-025', type: 'New Feature',    status: 'Backlog',   risk: 'normal',   age: '14d', submitter: 'M. Reyes',
    subject: 'Penny confidence threshold for coaching outputs',
    program: 'All Programs',
    notes: 'Penny capability improvement. Deferred to Phase 2 capability sprint.',
  },
];

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<RequestStatus, { cls: string }> = {
  Triaged:     { cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  'In Review': { cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  Approved:    { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Backlog:     { cls: 'bg-muted text-muted-foreground border-border' },
  Completed:   { cls: 'bg-primary/10 text-primary border-primary/20' },
};

const RISK_CFG: Record<RiskLevel, { badge: string; cls: string; dot: string } | null> = {
  high:     { badge: 'At Risk',  cls: 'text-rose-700 bg-rose-50 border-rose-200',   dot: 'bg-rose-500' },
  elevated: { badge: 'Elevated', cls: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  normal:   null,
};

const TYPE_DOT: Record<RequestType, string> = {
  'New Feature':    'bg-violet-400',
  'Bug / Issue':    'bg-rose-400',
  'Content Update': 'bg-sky-400',
  'Change Request': 'bg-amber-400',
  'Admin':          'bg-slate-400',
};

// ── Live Salesforce Cases Strip ───────────────────────────────────────────────

const CASE_PRIORITY_CFG: Record<string, { cls: string; label: string }> = {
  High:   { cls: 'text-rose-700 bg-rose-50 border-rose-200',   label: 'High' },
  Medium: { cls: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Medium' },
  Low:    { cls: 'text-slate-600 bg-slate-50 border-slate-200', label: 'Low' },
};

function SfCasesStrip() {
  const { data, isLoading, isError, refetch, isFetching } = useSfOpsCases();

  const n = (v: number | null | undefined) => v == null ? '—' : v.toLocaleString();
  const syncLabel = data ? formatSyncAge(data.lastUpdated) : null;
  const isStale   = data && data.cacheAge > 5 * 60;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 overflow-hidden">

      {/* Header */}
      <div className="px-3 py-2 border-b border-emerald-200/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isLoading || isFetching ? 'bg-amber-400 animate-pulse'
            : isError ? 'bg-rose-500'
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
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-[9px] text-emerald-700/60 hover:text-emerald-800 flex items-center gap-0.5 disabled:opacity-40"
          aria-label="Refresh cases"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Body */}
      {isError ? (
        <div className="px-3 py-2.5 flex items-center gap-2">
          <WifiOff className="w-3 h-3 text-rose-500 shrink-0" />
          <span className="text-[10px] text-rose-600 flex-1">Salesforce unreachable — cases unavailable.</span>
          <button onClick={() => refetch()} className="text-[10px] font-semibold text-rose-700 hover:underline flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5" /> Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="p-2 space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 rounded bg-emerald-100 animate-pulse" />)}
        </div>
      ) : data && data.cases.length === 0 ? (
        <div className="px-3 py-2.5">
          <p className="text-[10px] text-emerald-700/70">No open cases in Salesforce.</p>
        </div>
      ) : data ? (
        <div className="divide-y divide-emerald-100">
          {data.cases.map(c => {
            const priCfg      = CASE_PRIORITY_CFG[c.Priority ?? 'Low'] ?? CASE_PRIORITY_CFG['Low'];
            const contactName = c.Contact?.Name ?? c.Account?.Name ?? null;
            const sfUrl       = data.orgBaseUrl
              ? `${data.orgBaseUrl}/lightning/r/Case/${c.Id}/view`
              : null;
            return (
              <div key={c.Id} className="px-3 py-2 flex items-center gap-2.5">
                <span className={`text-[8px] font-bold border rounded-full px-1.5 py-0.5 leading-none shrink-0 ${priCfg.cls}`}>
                  {priCfg.label}
                </span>
                {sfUrl ? (
                  <a
                    href={sfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-mono font-semibold text-primary hover:underline shrink-0 leading-none"
                    onClick={e => e.stopPropagation()}
                  >
                    {c.CaseNumber ?? c.Id.slice(0, 8)}
                  </a>
                ) : (
                  <span className="text-[9px] font-mono text-muted-foreground/60 shrink-0">
                    {c.CaseNumber ?? '—'}
                  </span>
                )}
                <p className="text-[11px] font-semibold text-foreground flex-1 truncate leading-snug">
                  {c.Subject ?? '(No subject)'}
                </p>
                {c.Status && (
                  <span className="text-[9px] text-muted-foreground shrink-0">{c.Status}</span>
                )}
                {contactName && (
                  <span className="text-[9px] text-muted-foreground/60 shrink-0 hidden sm:block">{contactName}</span>
                )}
                <span className="text-[9px] text-muted-foreground/50 shrink-0">{caseAge(c.CreatedDate)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ── Request card ───────────────────────────────────────────────────────────────

function RequestCard({
  req, expanded, onToggle,
}: { req: DemandRequest; expanded: boolean; onToggle: () => void }) {
  const status = STATUS_CFG[req.status];
  const risk   = RISK_CFG[req.risk];
  const dot    = TYPE_DOT[req.type];

  return (
    <div className={`rounded-lg border bg-white overflow-hidden transition-colors ${expanded ? 'border-primary/30 shadow-sm' : 'border-border hover:border-primary/20'}`}>
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 group"
      >
        {/* type dot */}
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${dot}`} />

        {/* main content */}
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
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{req.program}</span>
            <span className="text-muted-foreground/30 text-[9px]">·</span>
            <span className="text-[10px] text-muted-foreground">{req.submitter}</span>
            <span className="text-muted-foreground/30 text-[9px]">·</span>
            <span className="text-[10px] text-muted-foreground">{req.age}</span>
          </div>
        </div>

        {/* status + chevron */}
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          <span className={`text-[9px] font-semibold border rounded-full px-1.5 py-0.5 whitespace-nowrap ${status.cls}`}>
            {req.status}
          </span>
          <ChevronDown className={`w-3 h-3 text-muted-foreground/40 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && req.notes && (
        <div className="px-3 pb-3 pt-0 border-t border-border/50 bg-muted/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-2 mb-1">Notes</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{req.notes}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[9px] font-medium text-muted-foreground/60">
              Submitted by {req.submitter}
            </span>
            <span className="text-muted-foreground/30 text-[9px]">·</span>
            <span className="text-[9px] font-medium text-muted-foreground/60">{req.age} ago</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type FilterKey = 'open' | 'all';

export default function Intake() {
  const { openActionPanel } = useAppContext();
  const { isEveryday, isAdminOrAbove } = useTierFlags();

  const [filter, setFilter]     = useState<FilterKey>('open');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Derived metrics
  const open      = REQUESTS.filter(r => r.status !== 'Completed');
  const atRisk    = REQUESTS.filter(r => r.risk !== 'normal');
  const newThisWk = REQUESTS.filter(r => ['2d', '3d', '4d', '5d'].includes(r.age));
  const closed30d = REQUESTS.filter(r => r.status === 'Completed').length;

  const visible = filter === 'open' ? open : REQUESTS;

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id);
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

  // By-type breakdown for right column
  const TYPE_BREAKDOWN: [RequestType, string][] = [
    ['New Feature',    'bg-violet-400'],
    ['Content Update', 'bg-sky-400'],
    ['Change Request', 'bg-amber-400'],
    ['Bug / Issue',    'bg-rose-400'],
    ['Admin',          'bg-slate-400'],
  ];

  const highRisk = REQUESTS.filter(r => r.risk !== 'normal');

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">

        {/* ── Compact header ───────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5 flex items-center gap-1.5">
              <GitBranch className="w-2.5 h-2.5" />
              Operations · Demand
            </p>
            <h1 className="text-[15px] font-semibold text-foreground leading-snug">Demand Queue</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed max-w-md">
              Work requests, change proposals, and feature submissions. Triage and track open items here.
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

        {/* ── Metric chips ─────────────────────────────────────────────── */}
        <div className="flex items-stretch gap-2 flex-wrap">
          {[
            { label: 'Open',          value: open.length,      cls: 'border-border bg-white',                               numCls: 'text-foreground' },
            { label: 'At Risk',       value: atRisk.length,    cls: 'border-rose-200 bg-rose-50',                           numCls: 'text-rose-700' },
            { label: 'Elevated',      value: REQUESTS.filter(r => r.risk === 'elevated').length, cls: 'border-amber-200 bg-amber-50', numCls: 'text-amber-700' },
            { label: 'New This Week', value: newThisWk.length, cls: 'border-sky-200 bg-sky-50',                             numCls: 'text-sky-800' },
            { label: 'Closed (30d)',  value: closed30d,        cls: 'border-emerald-200 bg-emerald-50',                     numCls: 'text-emerald-800' },
          ].map(m => (
            <div key={m.label} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${m.cls}`}>
              <span className={`text-[22px] font-bold leading-none ${m.numCls}`}>{m.value}</span>
              <span className="text-[9px] font-medium text-muted-foreground leading-tight max-w-[56px]">{m.label}</span>
            </div>
          ))}
        </div>

        {/* ── Live Salesforce Cases ─────────────────────────────────────── */}
        <SfCasesStrip />

        {/* ── Internal Requests ─────────────────────────────────────────── */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-2">
            Internal Requests
          </p>
        </div>

        {/* ── Two-column layout ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* Left: request list (2/3 width) */}
          <div className="md:col-span-2 space-y-2">

            {/* Filter row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {(['open', 'all'] as FilterKey[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors border ${
                      filter === f
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    }`}
                  >
                    {f === 'open' ? `Open (${open.length})` : `All (${REQUESTS.length})`}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground/60">{visible.length} requests</span>
            </div>

            {/* Cards */}
            <div className="space-y-1.5">
              {visible.map(req => (
                <RequestCard
                  key={req.id}
                  req={req}
                  expanded={expandedId === req.id}
                  onToggle={() => toggleExpand(req.id)}
                />
              ))}
            </div>
          </div>

          {/* Right: attention + next steps + breakdown (1/3 width) */}
          <div className="space-y-3">

            {/* Needs Attention */}
            {highRisk.length > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50/60 overflow-hidden">
                <p className="text-[9px] font-bold uppercase tracking-widest text-rose-700/70 px-3 py-2 border-b border-rose-200/80">
                  Needs Attention
                </p>
                {highRisk.map(req => (
                  <button
                    key={req.id}
                    onClick={() => { setFilter('all'); toggleExpand(req.id); }}
                    className="w-full text-left px-3 py-2 border-b border-rose-100 last:border-0 hover:bg-rose-100/60 transition-colors flex items-start gap-2 group"
                  >
                    {req.risk === 'high'
                      ? <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                      : <Clock className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                    }
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-foreground group-hover:text-primary leading-snug line-clamp-2 transition-colors">
                        {req.subject}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {req.id} · {req.age} old · {req.status}
                      </p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {/* Next Steps */}
            <div className="rounded-lg border border-border bg-white overflow-hidden">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 py-2 border-b border-border">
                Next Steps
              </p>
              {[
                { label: 'Assign REQ-030 to an owner',  hint: 'Penny bug · 4 days without owner' },
                { label: 'Triage REQ-028 from backlog', hint: 'Trail Quest reminders · 7 days idle' },
                { label: 'Resolve REQ-026 review',      hint: 'Sprint 2 rubric · 12 days open' },
              ].map((step, i) => (
                <div key={i} className="px-3 py-2 border-b border-border/60 last:border-0">
                  <p className="text-[11px] font-semibold text-foreground leading-snug">{step.label}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{step.hint}</p>
                </div>
              ))}
            </div>

            {/* By type breakdown */}
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2.5">By Type</p>
              <div className="space-y-1.5">
                {TYPE_BREAKDOWN.map(([type, dot]) => {
                  const count = REQUESTS.filter(r => r.type === type).length;
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                      <span className="text-[11px] text-muted-foreground flex-1">{type}</span>
                      <span className="text-[11px] font-bold text-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SF live notice — admin/power only */}
            {isAdminOrAbove && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-700/70 mb-1">Live</p>
                <p className="text-[10px] text-emerald-700/80 leading-snug">
                  Open Salesforce Cases appear above in real time. Internal requests below are tracked separately.
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
