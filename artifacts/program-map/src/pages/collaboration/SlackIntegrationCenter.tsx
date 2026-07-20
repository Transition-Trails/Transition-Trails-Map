import { useState, useMemo, useEffect, useCallback, createContext, useContext } from 'react';
import { TERMS } from '@/config/terminology';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectWorkspace } from '@/components/workspace/ObjectWorkspace';
import { HealthDot } from '@/components/workspace/ObjectWorkspace';
import type { WorkspaceItem, WorkspaceTab } from '@/components/workspace/ObjectWorkspace';
import { useAppContext } from '@/context/AppContext';
import {
  Hash, Settings, Users, Brain, FileText, Activity, Shield, BarChart2, FlaskConical,
  CheckCircle, XCircle, AlertTriangle, ChevronRight, Key, GitMerge, Layers,
  Play, Map, Workflow, Zap, Plus,
} from 'lucide-react';
import {
  SLACK_WORKSPACE, SLACK_CHANNELS, SLACK_HEALTH_SCORES,
  getPennyEnabledChannels,
  type SlackChannel,
} from '@/data/slackIntegrationData';
import {
  VALIDATION_CHECKS, PROGRAM_CHANNEL_MAPS, ROLE_GROUPS, PENNY_DELIVERY_MAPS,
  COMM_FLOWS, SLACK_OBJECT_PROFILES, OPERATIONAL_SCENARIOS, GOVERNANCE_ISSUES, TEST_SUITES,
  POC_WORKING_ITEMS, POC_BOTS_CONFIRMED, POC_CHANNELS_RECORD, POC_RESTORE_CHECKLIST, POC_INTEGRATION_LINKS,
  getValidationSummary, getGovernanceSummary, getTestSuiteSummary, getOverallTestSummary,
  getScenarioSummary,
  type ValidationCheck, type RoleGroup, type CommFlow, type FlowNode,
  type OperationalScenario, type GovernanceIssue, type TestSuite,
} from '@/data/slackPhase2Data';

// ── Slack Validation Context (live API) ───────────────────────────────────────

interface SlackApiCheck {
  id: string;
  category: string;
  label: string;
  status: 'pass' | 'fail' | 'warning' | 'skip';
  detail: string;
  impact: string;
  fix?: string;
  meta?: Record<string, string | boolean | number>;
}

interface SlackChannelResult {
  envVar: string;
  channelId: string;
  normalizedId?: string;
  resolvedRole: 'penny' | 'admin' | 'default' | 'unknown';
  status: 'pass' | 'warning' | 'fail' | 'skip';
  name?: string;
  isPrivate?: boolean;
  isMember?: boolean;
  memberCount?: number;
  error?: string;
  scopeIssue?: boolean;
  fix?: string;
}

interface SlackValidationResponse {
  checks: SlackApiCheck[];
  channels: SlackChannelResult[];
  timestamp: string;
}

type ValidationState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; data: SlackValidationResponse }
  | { kind: 'error'; message: string };

interface SlackValidationCtxValue {
  state: ValidationState;
  runValidation: () => void;
}

const SlackValidationCtx = createContext<SlackValidationCtxValue | null>(null);

function useSlackValidation(): SlackValidationCtxValue {
  const ctx = useContext(SlackValidationCtx);
  if (!ctx) throw new Error('SlackValidationCtx not mounted');
  return ctx;
}

function SlackValidationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ValidationState>({ kind: 'idle' });

  const runValidation = useCallback(() => {
    setState({ kind: 'loading' });
    fetch('/api/slack/validate')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<SlackValidationResponse>; })
      .then(data => setState({ kind: 'done', data }))
      .catch((err: unknown) => setState({ kind: 'error', message: err instanceof Error ? err.message : 'Unknown error' }));
  }, []);

  useEffect(() => { runValidation(); }, [runValidation]);

  return (
    <SlackValidationCtx.Provider value={{ state, runValidation }}>
      {children}
    </SlackValidationCtx.Provider>
  );
}

// ── Shared utilities ──────────────────────────────────────────────────────────

function ReadinessBadge({ status }: { status: string }) {
  const cls =
    status === 'ready' || status === 'operational' || status === 'passing' || status === 'pass' || status === 'Active' || status === 'Complete' || status === 'Mapped' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    status === 'partial' || status === 'in-development' || status === 'warning' || status === 'Partial' || status === 'Configured' || status === 'Partially Ready' ? 'bg-amber-50 text-amber-700 border-amber-200' :
    status === 'not-ready' || status === 'pending' || status === 'fail' || status === 'Pending' || status === 'Missing' ? 'bg-rose-50 text-rose-700 border-rose-200' :
    status === 'blocked' || status === 'Blocked' ? 'bg-rose-50 text-rose-700 border-rose-200' :
    status === 'planned' || status === 'Planned' ? 'bg-sky-50 text-sky-700 border-sky-200' :
    'bg-muted text-muted-foreground border-border';
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${cls}`}>{status}</span>;
}

function SeverityBadge({ sev }: { sev: string }) {
  const cls =
    sev === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
    sev === 'High'     ? 'bg-orange-50 text-orange-700 border-orange-200' :
    sev === 'Medium'   ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-muted text-muted-foreground border-border';
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${cls}`}>{sev}</span>;
}

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const barCls = pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-rose-400';
  const textCls = pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-rose-600';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barCls}`} style={{ width:`${pct}%` }} />
      </div>
      <span className={`text-[11px] font-bold tabular-nums shrink-0 ${textCls}`}>{pct}%</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 w-32 shrink-0 mt-0.5">{label}</span>
      <span className="text-[12px] text-foreground flex-1">{value}</span>
    </div>
  );
}

function ValidationIcon({ status }: { status: string }) {
  if (status === 'pass')    return <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  if (status === 'fail')    return <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
  if (status === 'warning') return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  return <span className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0 inline-block" />;
}

const FLOW_NODE_COLORS: Record<FlowNode['type'], string> = {
  Program:  'bg-emerald-50 border-emerald-200 text-emerald-800',
  Channel:  'bg-teal-50 border-teal-200 text-teal-800',
  Penny:    'bg-pink-50 border-pink-200 text-pink-800',
  Template: 'bg-violet-50 border-violet-200 text-violet-800',
  Message:  'bg-blue-50 border-blue-200 text-blue-800',
  Activity: 'bg-amber-50 border-amber-200 text-amber-800',
  Signal:   'bg-orange-50 border-orange-200 text-orange-800',
};

function FlowNodeBox({ node }: { node: FlowNode }) {
  const cls = FLOW_NODE_COLORS[node.type];
  const dotCls = node.status === 'active' ? 'bg-emerald-400' : node.status === 'pending' ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className={`rounded-lg border px-3 py-2 min-w-[130px] max-w-[160px] shrink-0 ${cls}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
        <span className="text-[8px] font-bold uppercase tracking-wide opacity-60">{node.type}</span>
      </div>
      <p className="text-[11px] font-semibold leading-tight mb-0.5">{node.label}</p>
      <p className="text-[10px] opacity-60 leading-tight">{node.detail}</p>
    </div>
  );
}

// ── Tab 1: Overview ───────────────────────────────────────────────────────────

function OverviewTab() {
  const { state: valState }  = useSlackValidation();
  const govSummary      = getGovernanceSummary();
  const testSummary     = getOverallTestSummary();
  const scenSummary     = getScenarioSummary();
  const pennyEnabled    = getPennyEnabledChannels();
  const productionScore = SLACK_HEALTH_SCORES.find(s => s.dimension === 'production');

  const liveChecks = valState.kind === 'done' ? valState.data.checks : null;
  const livePass   = liveChecks ? liveChecks.filter(c => c.status === 'pass').length : null;
  const liveFail   = liveChecks ? liveChecks.filter(c => c.status === 'fail').length : null;
  const liveTotal  = liveChecks ? liveChecks.length : null;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-5 max-w-4xl">
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-[12px] text-foreground leading-relaxed">
            Program-to-channel mapping, role-to-user routing, {TERMS.aiAssistant} delivery mapping, and end-to-end flow validation are all configured.
            Workspace Validation runs live against your Replit secrets — see the Workspace Validation tab for real-time results.
          </p>
        </div>

        {/* Phase 2 stat grid */}
        <div className="grid grid-cols-4 gap-3">
          {[
            {
              label: 'Validation Checks',
              value: valState.kind === 'loading' ? '…' : liveChecks ? `${livePass}/${liveTotal}` : '—',
              sub:   valState.kind === 'loading' ? 'checking…' : liveChecks ? `passing · live` : 'run validation',
              cls:   (liveChecks && (liveFail ?? 0) > 0) ? 'border-rose-200 bg-rose-50' : liveChecks ? 'border-emerald-200 bg-emerald-50' : 'border-border bg-muted/30',
            },
            { label:'Governance Issues', value:String(govSummary.critical + govSummary.high), sub:`${govSummary.critical} critical`, cls: govSummary.critical > 0 ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50' },
            { label:'Scenarios Ready',   value:`${scenSummary.ready}/${scenSummary.total}`,   sub:`avg ${scenSummary.avgScore}% ready`,  cls:'border-amber-200 bg-amber-50' },
            { label:'Tests Passing',     value:`${testSummary.pass}/${testSummary.total}`,    sub:`${testSummary.pct}% overall`,         cls:'border-amber-200 bg-amber-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-3 ${s.cls}`}>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide mb-1">{s.label}</p>
              <p className="text-[22px] font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Critical blockers — live failures when available, else static governance */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">
            {liveChecks ? 'Live Validation Failures' : 'Critical Blockers to Go Live'}
          </p>
          <div className="space-y-2">
            {liveChecks ? (
              liveChecks.filter(c => c.status === 'fail').length === 0 ? (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <p className="text-[12px] font-medium text-emerald-700">No live failures — all required secrets and API checks passed.</p>
                </div>
              ) : (
                liveChecks.filter(c => c.status === 'fail').map(c => (
                  <div key={c.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-rose-200 bg-rose-50">
                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground">{c.label}</p>
                      <p className="text-[11px] text-muted-foreground">{c.fix ?? c.detail}</p>
                    </div>
                  </div>
                ))
              )
            ) : (
              GOVERNANCE_ISSUES.filter(i => i.severity === 'Critical').map(issue => (
                <div key={issue.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-rose-200 bg-rose-50">
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">{issue.title}</p>
                    <p className="text-[11px] text-muted-foreground">{issue.resolution}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Phase 2 readiness by area */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Integration Readiness by Area</p>
          <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
            {[
              { area:'Program-to-Channel Mapping', pct:72, note:'5 programs mapped · 8 channels · 3 missing bot access' },
              { area:'Role-to-User Mapping',        pct:60, note:'5 of 7 role groups have at least one mapped user' },
              { area:`${TERMS.aiAssistant} Delivery Mapping`,      pct:55, note:'6 capabilities mapped · 4 with configured routes' },
              { area:'Communication Flows',          pct:65, note:'5 flows defined · 2 configured · 3 planned/blocked' },
              { area:'Operational Scenarios',        pct:scenSummary.avgScore, note:`${scenSummary.partial} partially ready · ${scenSummary.blocked} blocked` },
              { area:'Governance Compliance',        pct:45, note:`${govSummary.critical + govSummary.high} critical/high issues open` },
              { area:'Production Testing',           pct:testSummary.pct, note:`${testSummary.pass} of ${testSummary.total} tests passing` },
            ].map(r => (
              <div key={r.area} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium text-foreground">{r.area}</span>
                  <span className="text-[11px] text-muted-foreground">{r.note}</span>
                </div>
                <ScoreBar score={r.pct} />
              </div>
            ))}
          </div>
        </div>

        {/* Workspace connection status */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Workspace</p>
          <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
            <InfoRow label="Workspace"       value={SLACK_WORKSPACE.displayName} />
            <InfoRow label="Domain"          value={SLACK_WORKSPACE.domain} />
            <InfoRow label="Bot User"        value={SLACK_WORKSPACE.botUser} />
            <InfoRow label="Connection"      value={<ReadinessBadge status={SLACK_WORKSPACE.oauthStatus} />} />
            <InfoRow label="Channels"        value={`${SLACK_CHANNELS.length} mapped · ${pennyEnabled.length} ${TERMS.aiAssistant}-enabled`} />
            <InfoRow label="Production Score" value={productionScore ? `${productionScore.score}/${productionScore.maxScore}` : '—'} />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab 2: Workspace Validation (live) ────────────────────────────────────────

function WorkspaceValidationTab() {
  const { state, runValidation } = useSlackValidation();
  const [selected, setSelected] = useState<SlackApiCheck | null>(null);
  const [testMsgState, setTestMsgState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [testMsgDetail, setTestMsgDetail] = useState('');

  const checks     = state.kind === 'done' ? state.data.checks   : [];
  const channels   = state.kind === 'done' ? state.data.channels : [];
  const isLoading  = state.kind === 'loading';
  const lastRun    = state.kind === 'done' ? new Date(state.data.timestamp).toLocaleTimeString() : null;
  const pass       = checks.filter(c => c.status === 'pass').length;
  const fail       = checks.filter(c => c.status === 'fail').length;
  const warning    = checks.filter(c => c.status === 'warning').length;
  const skip       = checks.filter(c => c.status === 'skip').length;
  const categories = [...new Set(checks.map(c => c.category))];

  const tokenValid    = checks.some(c => c.id === 'api-auth-test'         && c.status === 'pass');
  const hasPennyCh    = checks.some(c => c.id === 'secret-penny-channel'   && c.status === 'pass');
  const hasAdminCh    = checks.some(c => c.id === 'secret-admin-channel'   && c.status === 'pass');
  const hasChannelId  = checks.some(c => c.id === 'secret-channel-id'      && c.status === 'pass');

  type TestTarget = 'penny' | 'admin';
  const [testMsgTargets, setTestMsgTargets] = useState<Record<TestTarget, 'idle' | 'sending' | 'sent' | 'error'>>({ penny: 'idle', admin: 'idle' });
  const [testMsgDetails, setTestMsgDetails] = useState<Record<TestTarget, string>>({ penny: '', admin: '' });

  function sendTestMessage(target: TestTarget) {
    setTestMsgTargets(p => ({ ...p, [target]: 'sending' }));
    setTestMsgDetails(p => ({ ...p, [target]: '' }));
    fetch('/api/slack/validate/test-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target }),
    })
      .then(r => r.json() as Promise<{ ok: boolean; error?: string; detail?: string; messageTs?: string; targetLabel?: string }>)
      .then(data => {
        if (data.ok) {
          setTestMsgTargets(p => ({ ...p, [target]: 'sent' }));
          setTestMsgDetails(p => ({ ...p, [target]: `Sent to ${data.targetLabel ?? target} (ts: ${data.messageTs ?? '?'}).` }));
        } else {
          setTestMsgTargets(p => ({ ...p, [target]: 'error' }));
          setTestMsgDetails(p => ({ ...p, [target]: data.detail ?? data.error ?? 'Unknown error.' }));
        }
      })
      .catch(() => {
        setTestMsgTargets(p => ({ ...p, [target]: 'error' }));
        setTestMsgDetails(p => ({ ...p, [target]: 'Network error — could not reach API.' }));
      });
  }

  const canSendPenny = tokenValid && (hasPennyCh || hasChannelId);
  const canSendAdmin = tokenValid && hasAdminCh;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20 shrink-0 flex-wrap">
        <button
          onClick={runValidation}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading
            ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> Running…</>
            : <>↻ Run Validation</>
          }
        </button>

        {canSendPenny && (
          <button
            onClick={() => sendTestMessage('penny')}
            disabled={testMsgTargets.penny === 'sending'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold border transition-colors disabled:opacity-50 ${
              testMsgTargets.penny === 'sent'  ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
              testMsgTargets.penny === 'error' ? 'border-rose-300 bg-rose-50 text-rose-700' :
              'border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100'
            }`}
          >
            {testMsgTargets.penny === 'sending' ? '⌛ Sending…' :
             testMsgTargets.penny === 'sent'    ? `✓ ${TERMS.aiAssistant} Sent` :
             testMsgTargets.penny === 'error'   ? `✕ ${TERMS.aiAssistant} Failed` :
             `✉ Test → ${TERMS.aiAssistant} AI`}
          </button>
        )}

        {canSendAdmin && (
          <button
            onClick={() => sendTestMessage('admin')}
            disabled={testMsgTargets.admin === 'sending'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold border transition-colors disabled:opacity-50 ${
              testMsgTargets.admin === 'sent'  ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
              testMsgTargets.admin === 'error' ? 'border-rose-300 bg-rose-50 text-rose-700' :
              'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
            }`}
          >
            {testMsgTargets.admin === 'sending' ? '⌛ Sending…' :
             testMsgTargets.admin === 'sent'    ? '✓ Admin Sent' :
             testMsgTargets.admin === 'error'   ? '✕ Admin Failed' :
             '✉ Test → Admin'}
          </button>
        )}

        {(testMsgDetails.penny || testMsgDetails.admin) && (
          <div className="flex flex-col gap-0.5">
            {testMsgDetails.penny && <span className={`text-[11px] ${testMsgTargets.penny === 'sent' ? 'text-emerald-600' : 'text-rose-600'}`}>{testMsgDetails.penny}</span>}
            {testMsgDetails.admin && <span className={`text-[11px] ${testMsgTargets.admin === 'sent' ? 'text-emerald-600' : 'text-rose-600'}`}>{testMsgDetails.admin}</span>}
          </div>
        )}

        {lastRun && <span className="ml-auto text-[11px] text-muted-foreground">Last run {lastRun}</span>}
      </div>

      {/* Idle state */}
      {state.kind === 'idle' && (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-8">
          <Key className="w-8 h-8 text-muted-foreground/30 mb-3" />
          <p className="text-[13px] font-semibold text-foreground mb-1">Ready to validate</p>
          <p className="text-[12px] text-muted-foreground">Click Run Validation to test your Slack secrets against the live API.</p>
        </div>
      )}

      {/* Error state */}
      {state.kind === 'error' && (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-8">
          <XCircle className="w-8 h-8 text-rose-400 mb-3" />
          <p className="text-[13px] font-semibold text-foreground mb-1">Could not reach validation endpoint</p>
          <p className="text-[12px] text-muted-foreground">{state.message}</p>
        </div>
      )}

      {/* Results (loading or done) */}
      {(state.kind === 'loading' || state.kind === 'done') && (
        <div className="flex flex-1 min-h-0">
          {/* Left: check list */}
          <div className="w-80 shrink-0 border-r border-border flex flex-col">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Validation Summary</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label:'Pass', value:pass,    cls:'text-emerald-600 bg-emerald-50 border-emerald-200' },
                  { label:'Fail', value:fail,    cls:'text-rose-600 bg-rose-50 border-rose-200' },
                  { label:'Warn', value:warning, cls:'text-amber-600 bg-amber-50 border-amber-200' },
                  { label:'Skip', value:skip,    cls:'text-sky-600 bg-sky-50 border-sky-200' },
                ].map(s => (
                  <div key={s.label} className={`rounded border text-center py-1.5 ${s.cls}`}>
                    <p className="text-[16px] font-bold leading-none">{isLoading ? '…' : s.value}</p>
                    <p className="text-[9px] font-bold uppercase mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">Checking secrets and calling Slack API…</div>
              ) : (
                <>
                  {categories.map(cat => (
                    <div key={cat}>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground px-4 py-2 border-b border-border/40 bg-muted/20">{cat}</p>
                      {checks.filter(c => c.category === cat).map(check => (
                        <button
                          key={check.id}
                          onClick={() => setSelected(check)}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-muted/40 border-b border-border/20 transition-colors ${selected?.id === check.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                        >
                          <ValidationIcon status={check.status} />
                          <span className="text-[12px] text-foreground font-medium flex-1 leading-tight">{check.label}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                  {channels.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground px-4 py-2 border-b border-border/40 bg-muted/20">Channel Map</p>
                      {channels.map(ch => (
                        <div key={ch.envVar} className={`px-4 py-2.5 border-b border-border/20 ${ch.scopeIssue ? 'bg-amber-50/60' : ''}`}>
                          <div className="flex items-center gap-2.5">
                            <ValidationIcon status={ch.status} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium text-foreground truncate">
                                {ch.name ? `#${ch.name}` : ch.normalizedId ?? ch.channelId.slice(0, 12)}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">{ch.envVar}</p>
                              {ch.isMember === true  && <p className="text-[10px] text-emerald-600">✓ Bot is member · {ch.memberCount ?? '?'} members{ch.isPrivate ? ' · private' : ' · public'}</p>}
                              {ch.isMember === false && <p className="text-[10px] text-amber-600">⚠ Bot not a member — {ch.fix}</p>}
                            </div>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                              ch.resolvedRole === 'penny'   ? 'bg-pink-50 text-pink-700 border-pink-200' :
                              ch.resolvedRole === 'admin'   ? 'bg-violet-50 text-violet-700 border-violet-200' :
                              ch.resolvedRole === 'default' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                              'bg-muted text-muted-foreground border-border'
                            }`}>
                              {ch.resolvedRole === 'penny' ? `${TERMS.aiAssistant} AI` : ch.resolvedRole === 'admin' ? 'Admin' : ch.resolvedRole === 'default' ? 'Default' : 'Unknown'}
                            </span>
                          </div>
                          {ch.scopeIssue && (
                            <div className="mt-1.5 ml-6 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                              <p className="text-[10px] font-bold text-amber-800 mb-0.5">Scope required: channels:read + groups:read</p>
                              <p className="text-[10px] text-amber-700 leading-snug">{ch.fix}</p>
                            </div>
                          )}
                          {ch.error && !ch.scopeIssue && (
                            <p className="mt-1 ml-6 text-[10px] text-rose-600 leading-snug">{ch.fix ?? ch.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </ScrollArea>
          </div>

          {/* Right: detail */}
          <div className="flex-1 min-w-0">
            {selected && !isLoading ? (
              <ScrollArea className="h-full">
                <div className="p-5 space-y-4 max-w-2xl">
                  <div className="flex items-start gap-3">
                    <ValidationIcon status={selected.status} />
                    <div>
                      <h3 className="text-[14px] font-bold text-foreground">{selected.label}</h3>
                      <p className="text-[11px] text-muted-foreground">{selected.category} · <ReadinessBadge status={selected.status} /></p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
                    <InfoRow label="Detail"     value={selected.detail} />
                    <InfoRow label="Impact"     value={selected.impact} />
                    {selected.fix && <InfoRow label="Resolution" value={<span className="text-emerald-700">{selected.fix}</span>} />}
                    {selected.meta && Object.keys(selected.meta).length > 0 && (
                      <InfoRow label="Metadata" value={
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(selected.meta).map(([k, v]) => (
                            <span key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted border border-border">
                              <span className="text-muted-foreground">{k}:</span>
                              <span className="font-medium text-foreground">{String(v)}</span>
                            </span>
                          ))}
                        </div>
                      } />
                    )}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <Key className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-[13px] font-semibold text-foreground mb-1">Select a validation check</p>
                <p className="text-[12px] text-muted-foreground">View the live detail, impact, and resolution for each check.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Program → Channel Mapping ─────────────────────────────────────────

function ProgramChannelTab() {
  const [selectedProgramId, setSelectedProgramId] = useState<string>(PROGRAM_CHANNEL_MAPS[0].programId);
  const selected = PROGRAM_CHANNEL_MAPS.find(p => p.programId === selectedProgramId) ?? PROGRAM_CHANNEL_MAPS[0];

  const botCls = (s: string) => s === 'Granted' ? 'text-emerald-600' : s === 'Pending' ? 'text-amber-600' : 'text-rose-600';
  const mapCls = (s: string) => s === 'Mapped' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : s === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';
  const purpCls: Record<string, string> = {
    'Cohort':'bg-teal-50 text-teal-700 border-teal-200','Coaches':'bg-violet-50 text-violet-700 border-violet-200',
    'Announcements':'bg-blue-50 text-blue-700 border-blue-200','Admin':'bg-muted text-muted-foreground border-border',
    'Penny Delivery':'bg-pink-50 text-pink-700 border-pink-200','Executive':'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <div className="flex h-full">
      {/* Left: program list */}
      <div className="w-56 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">Programs</p>
          <p className="text-[10px] text-muted-foreground">{PROGRAM_CHANNEL_MAPS.length} programs mapped</p>
        </div>
        <ScrollArea className="flex-1">
          {PROGRAM_CHANNEL_MAPS.map(p => {
            const allMapped = p.channels.every(c => c.mappingStatus === 'Mapped');
            const hasMissing = p.channels.some(c => c.mappingStatus === 'Missing');
            const dotCls = allMapped ? 'bg-emerald-400' : hasMissing ? 'bg-rose-400' : 'bg-amber-400';
            return (
              <button
                key={p.programId}
                onClick={() => setSelectedProgramId(p.programId)}
                className={`w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-muted/40 border-b border-border/20 ${selectedProgramId === p.programId ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${dotCls}`} />
                <div>
                  <p className="text-[12px] font-semibold text-foreground leading-tight">{p.programName}</p>
                  <p className="text-[10px] text-muted-foreground">{p.channels.length} channels</p>
                  {p.cohort && <p className="text-[10px] text-muted-foreground">{p.cohort}</p>}
                </div>
              </button>
            );
          })}
        </ScrollArea>
      </div>
      {/* Right: channel detail */}
      <div className="flex-1 min-w-0">
        <ScrollArea className="h-full">
          <div className="p-5 space-y-4 max-w-3xl">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-[14px] font-bold text-foreground">{selected.programName}</h3>
                <p className="text-[11px] text-muted-foreground">{selected.cohort ?? 'Planning phase'} · <ReadinessBadge status={selected.status} /></p>
              </div>
            </div>
            <div className="space-y-2">
              {selected.channels.map(ch => (
                <div key={ch.channelId} className="rounded-lg border border-border bg-white px-4 py-3">
                  <div className="flex items-center gap-3 mb-2">
                    <Hash className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="text-[13px] font-bold text-foreground font-mono">{ch.channelName}</span>
                    <span className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${mapCls(ch.mappingStatus)}`}>{ch.mappingStatus}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${purpCls[ch.purpose] ?? 'bg-muted border-border text-muted-foreground'}`}>{ch.purpose}</span>
                    <span>Bot Access: <span className={`font-semibold ${botCls(ch.botAccess)}`}>{ch.botAccess}</span></span>
                    {ch.memberCount !== undefined && <span>{ch.memberCount} members</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-bold text-amber-700 mb-1">Bot Access Required</p>
              <p className="text-[11px] text-amber-700">After app installation, invite <code className="font-mono bg-amber-100 px-1 rounded">@trail-os-bot</code> to each channel above. Bot access is required before {TERMS.aiAssistant} can deliver messages.</p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Tab 4: Role → User Mapping ────────────────────────────────────────────────

function RoleUserTab() {
  const [selectedRoleId, setSelectedRoleId] = useState<string>('coach');
  const selected = ROLE_GROUPS.find(r => r.roleId === selectedRoleId) ?? ROLE_GROUPS[0];

  const mapCls = (s: string) => s === 'Complete' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : s === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';
  const roleColors: Record<string, string> = {
    'Coach':'bg-violet-100 text-violet-700','Learner':'bg-teal-100 text-teal-700',
    'Program Lead':'bg-emerald-100 text-emerald-700','Curriculum Designer':'bg-blue-100 text-blue-700',
    'Volunteer':'bg-amber-100 text-amber-700','Executive':'bg-orange-100 text-orange-700','Admin':'bg-muted text-muted-foreground',
  };

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">Role Groups</p>
          <p className="text-[10px] text-muted-foreground">{ROLE_GROUPS.length} roles · {ROLE_GROUPS.reduce((s,r)=>s+r.count,0)} total people</p>
        </div>
        <ScrollArea className="flex-1">
          {ROLE_GROUPS.map(r => (
            <button
              key={r.roleId}
              onClick={() => setSelectedRoleId(r.roleId)}
              className={`w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-muted/40 border-b border-border/20 ${selectedRoleId === r.roleId ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-[12px] font-semibold text-foreground">{r.roleName}</p>
                  <span className={`inline-flex px-1 rounded text-[9px] font-bold ${mapCls(r.mappingStatus)}`}>{r.mappingStatus}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{r.count} {r.count === 1 ? 'person' : 'people'}</p>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>
      <div className="flex-1 min-w-0">
        <ScrollArea className="h-full">
          <div className="p-5 space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-bold ${roleColors[selected.roleType] ?? 'bg-muted'}`}>{selected.roleType}</span>
              <h3 className="text-[14px] font-bold text-foreground">{selected.roleName}</h3>
              <ReadinessBadge status={selected.mappingStatus} />
            </div>
            <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
              <InfoRow label="People Count"    value={String(selected.count)} />
              <InfoRow label={`${TERMS.aiAssistant} Persona`}   value={selected.pennyPersona} />
              <InfoRow label="Programs"        value={selected.programs.join(', ')} />
              <InfoRow label="Delivery Channels" value={selected.deliveryChannels.length > 0 ? selected.deliveryChannels.join(', ') : '—'} />
              <InfoRow label="User Groups"     value={selected.slackUserGroups.length > 0 ? selected.slackUserGroups.join(', ') : '—'} />
            </div>
            {selected.slackUsers.length > 0 ? (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Mapped Slack Users</p>
                <div className="space-y-2">
                  {selected.slackUsers.map(u => (
                    <div key={u.slackHandle} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-white">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                        {u.displayName[0]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground">{u.displayName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{u.slackHandle} · {u.role}</p>
                      </div>
                      <ReadinessBadge status={u.pennyEnabled ? 'Active' : 'Pending'} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <p className="text-[12px] text-muted-foreground">No individual users mapped — using user group <code className="font-mono">{selected.slackUserGroups[0] ?? '@group-pending'}</code> for delivery routing.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Tab 5: Penny → Channel Delivery Mapping ───────────────────────────────────

function PennyDeliveryTab() {
  const [selectedId, setSelectedId] = useState<string>('learning-coach');
  const selected = PENNY_DELIVERY_MAPS.find(p => p.capabilityId === selectedId) ?? PENNY_DELIVERY_MAPS[0];

  const trigCls: Record<string, string> = {
    'Scheduled':'bg-blue-50 text-blue-700 border-blue-200',
    'Event-Driven':'bg-teal-50 text-teal-700 border-teal-200',
    'On-Demand':'bg-violet-50 text-violet-700 border-violet-200',
    'Escalation':'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">{TERMS.aiAssistant} Capabilities</p>
          <p className="text-[10px] text-muted-foreground">{PENNY_DELIVERY_MAPS.length} capabilities mapped</p>
        </div>
        <ScrollArea className="flex-1">
          {PENNY_DELIVERY_MAPS.map(p => (
            <button
              key={p.capabilityId}
              onClick={() => setSelectedId(p.capabilityId)}
              className={`w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-muted/40 border-b border-border/20 ${selectedId === p.capabilityId ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
            >
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-foreground leading-tight">{p.capabilityName}</p>
                <p className="text-[10px] text-muted-foreground">{p.domain} · {p.deliveries.length} routes</p>
                <ReadinessBadge status={p.overallStatus} />
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>
      <div className="flex-1 min-w-0">
        <ScrollArea className="h-full">
          <div className="p-5 space-y-4 max-w-2xl">
            <div>
              <h3 className="text-[14px] font-bold text-foreground">{selected.capabilityName}</h3>
              <p className="text-[11px] text-muted-foreground mb-1">{selected.domain} domain · <ReadinessBadge status={selected.maturity} /> <ReadinessBadge status={selected.overallStatus} /></p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{selected.description}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Delivery Routes</p>
              <div className="space-y-3">
                {selected.deliveries.map((d, i) => (
                  <div key={i} className="rounded-lg border border-border bg-white px-4 py-3">
                    <div className="flex items-start gap-3">
                      <Hash className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] font-bold font-mono text-foreground">{d.channelName}</span>
                          <ReadinessBadge status={d.deliveryStatus} />
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                          <span>Template: <span className="font-medium text-foreground">{d.templateName}</span></span>
                          <span>Audience: <span className="font-medium text-foreground">{d.audience}</span></span>
                          {d.frequency && <span>Frequency: <span className="font-medium text-foreground">{d.frequency}</span></span>}
                        </div>
                        <div className="mt-1.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${trigCls[d.triggerType] ?? 'bg-muted border-border'}`}>{d.triggerType}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Tab 6: Flow Explorer ──────────────────────────────────────────────────────

function FlowExplorerTab() {
  const [selectedId, setSelectedId] = useState<string>('weekly-reflection');
  const selected = COMM_FLOWS.find(f => f.id === selectedId) ?? COMM_FLOWS[0];

  const statusCls = (s: CommFlow['status']) =>
    s === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    s === 'Configured' ? 'bg-amber-50 text-amber-700 border-amber-200' :
    s === 'Planned' ? 'bg-sky-50 text-sky-700 border-sky-200' :
    'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <div className="flex h-full">
      {/* Left: flow list */}
      <div className="w-52 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">Communication Flows</p>
        </div>
        <ScrollArea className="flex-1">
          {COMM_FLOWS.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedId(f.id)}
              className={`w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-muted/40 border-b border-border/20 ${selectedId === f.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
            >
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-foreground leading-tight mb-1">{f.name}</p>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${statusCls(f.status)}`}>{f.status}</span>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>
      {/* Right: flow detail */}
      <div className="flex-1 min-w-0">
        <ScrollArea className="h-full">
          <div className="p-5 space-y-5">
            <div>
              <h3 className="text-[14px] font-bold text-foreground mb-1">{selected.name}</h3>
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">{selected.description}</p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>Trigger: <span className="font-medium text-foreground">{selected.trigger}</span></span>
                <span>·</span>
                <span>Cadence: <span className="font-medium text-foreground">{selected.cadence}</span></span>
                <span>·</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${statusCls(selected.status)}`}>{selected.status}</span>
              </div>
            </div>

            {/* Flow diagram */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-3">End-to-End Flow</p>
              <div className="overflow-x-auto pb-2">
                <div className="flex items-start gap-2 min-w-max">
                  {selected.nodes.map((node, i) => (
                    <div key={node.id} className="flex items-center gap-2">
                      <FlowNodeBox node={node} />
                      {i < selected.nodes.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Node detail table */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Node Detail</p>
              <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
                {selected.nodes.map(node => {
                  const dotCls = node.status === 'active' ? 'bg-emerald-400' : node.status === 'pending' ? 'bg-amber-400' : 'bg-rose-400';
                  const lblCls = node.status === 'active' ? 'text-emerald-700' : node.status === 'pending' ? 'text-amber-700' : 'text-rose-700';
                  return (
                    <div key={node.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-[9px] font-bold uppercase w-20 shrink-0 text-muted-foreground/60">{node.type}</span>
                      <span className="text-[12px] font-medium text-foreground flex-1">{node.label}</span>
                      <span className="text-[11px] text-muted-foreground flex-1">{node.detail}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
                        <span className={`text-[10px] font-semibold ${lblCls}`}>{node.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground italic px-1">
              Programs: {selected.programs.join(', ')}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Tab 7: Channel Registry (ObjectWorkspace) ─────────────────────────────────

function ChannelOverview({ ch }: { ch: SlackChannel }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-2xl">
        <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
          <InfoRow label="Purpose"      value={ch.purpose} />
          <InfoRow label="Lifecycle"    value={<ReadinessBadge status={ch.lifecycle} />} />
          <InfoRow label={TERMS.aiAssistant}        value={ch.pennyEnabled ? `Enabled · ${ch.pennyCapabilities.length} capabilities` : 'Not enabled'} />
          <InfoRow label="UOM Object"   value={ch.uomObjectId ?? '—'} />
          <InfoRow label="Governance"   value={ch.governanceStatus} />
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed">{ch.description}</p>
        {ch.pennyCapabilities.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-1.5">{TERMS.aiAssistant} Capabilities</p>
            <div className="flex flex-wrap gap-1.5">
              {ch.pennyCapabilities.map(c => <span key={c} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-pink-50 border border-pink-200 text-pink-700">{c}</span>)}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function ChannelRegistry() {
  const items = useMemo<WorkspaceItem[]>(() => SLACK_CHANNELS.map(ch => ({
    id: ch.id, name: ch.name,
    typeName: ch.purpose, typeColor:'text-teal-700', typeBg:'bg-teal-50',
    status: ch.lifecycle, statusVariant: ch.lifecycle === 'active' ? 'active' as const : 'planning' as const,
    health: ch.health,
    secondary: ch.description,
    owner: ch.owner,
  })), []);

  const tabs = useMemo<WorkspaceTab[]>(() => [
    { id:'overview', label:'Overview', render:(item) => { const ch = SLACK_CHANNELS.find(c => c.id === item.id); return ch ? <ChannelOverview ch={ch} /> : null; } },
    { id:'health', label:'Health', render:(item) => {
        const ch = SLACK_CHANNELS.find(c => c.id === item.id);
        if (!ch) return null;
        return (
          <ScrollArea className="h-full"><div className="p-5 space-y-2 max-w-xl">
            {[
              { label:'Channel Lifecycle',  health:ch.health,                                                                                                                                                                              note:ch.healthNote },
              { label:'Governance',         health:(ch.governanceStatus === 'compliant' ? 'healthy' : ch.governanceStatus === 'needs-review' ? 'needs-attention' : 'incomplete') as any, note:ch.governanceStatus },
              { label:`${TERMS.aiAssistant} Integration`,  health:(ch.pennyEnabled ? 'healthy' : 'incomplete') as any,                                                                                                                                    note:ch.pennyEnabled ? `${ch.pennyCapabilities.length} capabilities` : 'Not enabled' },
              { label:'UOM Mapping',        health:(ch.uomObjectId ? 'healthy' : 'needs-attention') as any,                                                                                                                                 note:ch.uomObjectId ?? 'No UOM object ID' },
            ].map(ind => (
              <div key={ind.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2.5"><HealthDot health={ind.health} /><span className="text-[12px] font-medium">{ind.label}</span></div>
                <span className="text-[11px] text-muted-foreground">{ind.note}</span>
              </div>
            ))}
          </div></ScrollArea>
        );
      },
    },
  ], []);

  return <ObjectWorkspace icon={Hash} items={items} tabs={tabs} emptyTitle="Select a channel" emptyBody={`Choose a Slack channel to view its configuration, ${TERMS.aiAssistant} integration, and health.`} />;
}

// ── Tab 8: Object Profiles ────────────────────────────────────────────────────

function ProfileDetail({ profile }: { profile: typeof SLACK_OBJECT_PROFILES[0] }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-2xl">
        <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
          <InfoRow label="Object Type"   value={profile.objectType} />
          <InfoRow label="Status"        value={<ReadinessBadge status={profile.status} />} />
          <InfoRow label="Owner"         value={profile.owner} />
          <InfoRow label="Governance"    value={profile.governanceStatus} />
          {profile.memberCount !== undefined && <InfoRow label="Members" value={String(profile.memberCount)} />}
          {profile.botAccess !== undefined && <InfoRow label="Bot Access" value={profile.botAccess ? 'Granted' : 'Not granted'} />}
          {profile.pennyEnabled !== undefined && <InfoRow label={`${TERMS.aiAssistant} Enabled`} value={profile.pennyEnabled ? 'Yes' : 'No'} />}
          {profile.lastActivity && <InfoRow label="Last Activity" value={profile.lastActivity} />}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-1.5">Purpose</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">{profile.purpose}</p>
        </div>
        {profile.programs.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-1.5">Programs</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.programs.map(p => <span key={p} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700">{p}</span>)}
            </div>
          </div>
        )}
        {profile.notes && (
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <p className="text-[11px] text-muted-foreground italic">{profile.notes}</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function ObjectProfilesTab() {
  const items = useMemo<WorkspaceItem[]>(() => SLACK_OBJECT_PROFILES.map(p => ({
    id: p.id, name: p.name,
    typeName: p.objectType, typeColor: p.objectType === 'channel' ? 'text-teal-700' : p.objectType === 'usergroup' ? 'text-violet-700' : 'text-blue-700',
    typeBg: p.objectType === 'channel' ? 'bg-teal-50' : p.objectType === 'usergroup' ? 'bg-violet-50' : 'bg-blue-50',
    status: p.status, statusVariant: p.health === 'healthy' ? 'active' as const : 'planning' as const,
    health: p.health, secondary: p.secondary, owner: p.owner,
  })), []);

  const tabs = useMemo<WorkspaceTab[]>(() => [
    { id:'detail', label:'Profile', render:(item) => { const p = SLACK_OBJECT_PROFILES.find(x => x.id === item.id); return p ? <ProfileDetail profile={p} /> : null; } },
    { id:'health', label:'Health', render:(item) => {
        const p = SLACK_OBJECT_PROFILES.find(x => x.id === item.id);
        if (!p) return null;
        return (
          <ScrollArea className="h-full"><div className="p-5 space-y-2 max-w-xl">
            {[
              { label:'Object Health',    health:p.health,                                                                                                                          note:p.status },
              { label:'Governance',       health:(p.governanceStatus === 'compliant' ? 'healthy' : p.governanceStatus === 'needs-review' ? 'needs-attention' : 'incomplete') as any, note:p.governanceStatus },
              { label:'Owner Assigned',   health:(p.owner && p.owner !== 'Unassigned' ? 'healthy' : 'needs-attention') as any,                                                      note:p.owner },
              { label:'Program Mapped',   health:(p.programs.length > 0 ? 'healthy' : 'needs-attention') as any,                                                                   note:p.programs.length > 0 ? p.programs.join(', ') : 'No program mapping' },
            ].map(ind => (
              <div key={ind.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2.5"><HealthDot health={ind.health} /><span className="text-[12px] font-medium">{ind.label}</span></div>
                <span className="text-[11px] text-muted-foreground">{ind.note}</span>
              </div>
            ))}
          </div></ScrollArea>
        );
      },
    },
  ], []);

  return <ObjectWorkspace icon={Layers} items={items} tabs={tabs} emptyTitle="Select an object" emptyBody="Choose a channel, user group, or template to view its Universal Object Profile." />;
}

// ── Tab 9: Operational Scenarios ──────────────────────────────────────────────

function ScenariosTab() {
  const [selectedId, setSelectedId] = useState<string>('scenario-weekly-reflection');
  const selected = OPERATIONAL_SCENARIOS.find(s => s.id === selectedId) ?? OPERATIONAL_SCENARIOS[0];
  const summary = getScenarioSummary();

  const catCls: Record<string, string> = {
    'Coaching':'bg-violet-50 text-violet-700 border-violet-200',
    'Briefing':'bg-blue-50 text-blue-700 border-blue-200',
    'Escalation':'bg-rose-50 text-rose-700 border-rose-200',
    'Announcement':'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const stepTypeCls: Record<string, string> = {
    trigger:'bg-amber-100 text-amber-800',program:'bg-emerald-100 text-emerald-800',
    channel:'bg-teal-100 text-teal-800',penny:'bg-pink-100 text-pink-800',
    template:'bg-violet-100 text-violet-800',delivery:'bg-blue-100 text-blue-800',signal:'bg-orange-100 text-orange-800',
  };

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">Scenarios</p>
          <p className="text-[10px] text-muted-foreground">{summary.partial} partial · {summary.blocked} blocked · avg {summary.avgScore}%</p>
        </div>
        <ScrollArea className="flex-1">
          {OPERATIONAL_SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-muted/40 border-b border-border/20 ${selectedId === s.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
            >
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-foreground leading-tight mb-1">{s.name}</p>
                <ReadinessBadge status={s.status} />
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>
      <div className="flex-1 min-w-0">
        <ScrollArea className="h-full">
          <div className="p-5 space-y-4 max-w-2xl">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${catCls[selected.category] ?? 'bg-muted border-border'}`}>{selected.category}</span>
                <h3 className="text-[14px] font-bold text-foreground">{selected.name}</h3>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{selected.description}</p>
            </div>

            <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
              <InfoRow label="Trigger"         value={selected.trigger} />
              <InfoRow label="Programs"        value={selected.programs.join(', ')} />
              <InfoRow label={TERMS.aiAssistant}           value={selected.pennyCapability} />
              <InfoRow label="Destination"     value={<code className="font-mono text-[11px]">{selected.destination}</code>} />
              <InfoRow label="Status"          value={<ReadinessBadge status={selected.status} />} />
              <InfoRow label="Readiness"       value={<ScoreBar score={selected.readinessScore} />} />
            </div>

            {/* Step flow */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Scenario Flow</p>
              <div className="space-y-1.5">
                {selected.flow.map(step => {
                  const dotCls = step.status === 'ready' ? 'bg-emerald-400' : step.status === 'pending' ? 'bg-amber-400' : 'bg-rose-400';
                  const rowBg = step.status === 'blocked' ? 'bg-rose-50 border-rose-200' : step.status === 'pending' ? 'bg-amber-50/50 border-amber-200/60' : 'bg-white border-border';
                  return (
                    <div key={step.step} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${rowBg}`}>
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">{step.step}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0 mt-0.5 ${stepTypeCls[step.type] ?? 'bg-muted'}`}>{step.type}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground">{step.label}</p>
                        <p className="text-[11px] text-muted-foreground">{step.detail}</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotCls}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            {selected.blockers.length > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-[11px] font-bold text-rose-700 mb-1.5">Blockers ({selected.blockers.length})</p>
                <ul className="space-y-0.5">
                  {selected.blockers.map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-[11px] text-rose-700">
                      <XCircle className="w-3 h-3 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Tab 10: Governance ────────────────────────────────────────────────────────

function GovernanceTab() {
  const [filter, setFilter] = useState<string>('All');
  const summary = getGovernanceSummary();
  const severities = ['All','Critical','High','Medium','Low'];
  const filtered = filter === 'All' ? GOVERNANCE_ISSUES : GOVERNANCE_ISSUES.filter(i => i.severity === filter);

  const catCls: Record<string, string> = {
    'Ownership':'bg-violet-50 text-violet-700 border-violet-200',
    'Missing Mapping':'bg-amber-50 text-amber-700 border-amber-200',
    'Permission':'bg-rose-50 text-rose-700 border-rose-200',
    'Orphaned':'bg-muted text-muted-foreground border-border',
    'Inactive':'bg-sky-50 text-sky-700 border-sky-200',
    'Configuration':'bg-rose-50 text-rose-700 border-rose-200',
  };

  const statusIcon = (s: GovernanceIssue['status']) =>
    s === 'Resolved' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> :
    s === 'In Progress' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> :
    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4 max-w-3xl">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label:'Critical', value:summary.critical, cls:'border-rose-200 bg-rose-50 text-rose-700' },
            { label:'High',     value:summary.high,     cls:'border-orange-200 bg-orange-50 text-orange-700' },
            { label:'Medium',   value:summary.medium,   cls:'border-amber-200 bg-amber-50 text-amber-700' },
            { label:'Low',      value:summary.low,      cls:'border-border bg-muted/30 text-muted-foreground' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border text-center py-2.5 ${s.cls}`}>
              <p className="text-[22px] font-bold leading-none">{s.value}</p>
              <p className="text-[10px] font-bold uppercase mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-1">
          {severities.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded text-[11px] font-semibold border transition-colors ${filter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-border hover:bg-muted/40'}`}
            >{s}</button>
          ))}
        </div>

        {/* Issues list */}
        <div className="space-y-2">
          {filtered.map(issue => (
            <div key={issue.id} className="rounded-lg border border-border bg-white px-4 py-3">
              <div className="flex items-start gap-3">
                {statusIcon(issue.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <SeverityBadge sev={issue.severity} />
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${catCls[issue.category] ?? 'bg-muted border-border'}`}>{issue.category}</span>
                    <span className="text-[12px] font-semibold text-foreground">{issue.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{issue.detail}</p>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground/60 shrink-0 mt-0.5">Resolution:</span>
                    <span className="text-[11px] text-emerald-700">{issue.resolution}</span>
                  </div>
                  {issue.affectedObjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {issue.affectedObjects.map(o => <span key={o} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-muted border border-border text-muted-foreground font-mono">{o}</span>)}
                    </div>
                  )}
                </div>
                <ReadinessBadge status={issue.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab 11: Test Suite ────────────────────────────────────────────────────────

function TestSuiteTab() {
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('suite-secrets');
  const selectedSuite = TEST_SUITES.find(s => s.id === selectedSuiteId) ?? TEST_SUITES[0];
  const overall = getOverallTestSummary();

  const statusIcon = (s: string) => {
    if (s === 'pass')    return <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    if (s === 'fail')    return <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
    if (s === 'warning') return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    if (s === 'blocked') return <span className="w-3.5 h-3.5 rounded bg-rose-200 flex items-center justify-center shrink-0"><span className="text-[8px] text-rose-700 font-bold">B</span></span>;
    return <span className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0 inline-block" />;
  };

  return (
    <div className="flex h-full">
      {/* Left: suite list */}
      <div className="w-52 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">Test Suites</p>
          <p className="text-[10px] text-muted-foreground">{overall.pass}/{overall.total} passing · {overall.pct}%</p>
        </div>
        <ScrollArea className="flex-1">
          {TEST_SUITES.map(suite => {
            const sum = getTestSuiteSummary(suite);
            return (
              <button
                key={suite.id}
                onClick={() => setSelectedSuiteId(suite.id)}
                className={`w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-muted/40 border-b border-border/20 ${selectedSuiteId === suite.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
              >
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-foreground leading-tight mb-1">{suite.name}</p>
                  <div className="flex items-center gap-2">
                    <ScoreBar score={sum.pct} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{sum.pass}/{sum.total} passing</p>
                </div>
              </button>
            );
          })}
        </ScrollArea>
      </div>
      {/* Right: test cases */}
      <div className="flex-1 min-w-0">
        <ScrollArea className="h-full">
          <div className="p-5 space-y-4 max-w-2xl">
            <div>
              <h3 className="text-[14px] font-bold text-foreground mb-1">{selectedSuite.name}</h3>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{selectedSuite.description}</p>
            </div>
            {/* Suite stats */}
            {(() => {
              const sum = getTestSuiteSummary(selectedSuite);
              return (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label:'Pass',    value:sum.pass,    cls:'text-emerald-600 bg-emerald-50 border-emerald-200' },
                    { label:'Fail',    value:sum.fail,    cls:'text-rose-600 bg-rose-50 border-rose-200' },
                    { label:'Blocked', value:sum.blocked, cls:'text-rose-600 bg-rose-50 border-rose-200' },
                    { label:'Warning', value:sum.warning, cls:'text-amber-600 bg-amber-50 border-amber-200' },
                  ].map(s => (
                    <div key={s.label} className={`rounded border text-center py-2 ${s.cls}`}>
                      <p className="text-[18px] font-bold leading-none">{s.value}</p>
                      <p className="text-[9px] font-bold uppercase mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Test cases */}
            <div className="space-y-2">
              {selectedSuite.tests.map(test => (
                <div key={test.id} className="rounded-lg border border-border bg-white px-4 py-3">
                  <div className="flex items-start gap-2.5 mb-1.5">
                    {statusIcon(test.status)}
                    <div className="flex-1">
                      <p className="text-[12px] font-semibold text-foreground">{test.name}</p>
                      <p className="text-[11px] text-muted-foreground">{test.description}</p>
                    </div>
                    <ReadinessBadge status={test.status} />
                  </div>
                  <div className="ml-6">
                    <p className="text-[11px] text-muted-foreground italic">{test.result}</p>
                    {test.blockedBy && (
                      <p className="text-[10px] text-rose-600 mt-0.5">Blocked by: {test.blockedBy}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Tab 12: Integration Health ────────────────────────────────────────────────

function IntegrationHealthTab() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4 max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">Health Scorecard</p>
        <div className="space-y-3">
          {SLACK_HEALTH_SCORES.map(s => (
            <div key={s.dimension} className="rounded-lg border border-border bg-white px-4 py-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[12px] font-bold text-foreground capitalize">{s.dimension}</span>
                <span className="ml-auto text-[11px] font-bold tabular-nums">{s.score}/{s.maxScore}</span>
                <ReadinessBadge status={s.status} />
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${s.status === 'ready' ? 'bg-emerald-400' : s.status === 'partial' ? 'bg-amber-400' : 'bg-rose-400'}`}
                  style={{ width:`${Math.round((s.score / s.maxScore)*100)}%` }}
                />
              </div>
              {s.items.filter(it => it.status === 'fail').length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.items.filter(it => it.status === 'fail').map(it => <span key={it.label} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-rose-50 border border-rose-200 text-rose-600">{it.label}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Dimension Detail</p>
          <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
            {SLACK_HEALTH_SCORES.flatMap(s => s.items.filter(it => it.status !== 'pass')).map((it, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-[12px] text-foreground">{it.label}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{it.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab 13: POC State ─────────────────────────────────────────────────────────

function PocStateTab() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-5 max-w-4xl">
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
          <p className="text-[11px] font-bold text-teal-800 uppercase mb-1">POC Last Confirmed Working State — Restoration Reference</p>
          <p className="text-[12px] text-teal-900 leading-relaxed">
            The Penny AI Slack POC was confirmed working with both Penny (Gemini) and Agentforce (Penny–Transition Trails Assistant) responding in the same channel simultaneously. Assessment quiz flow, connected Agentforce, and both the Penny AI channel and admin channel were tested. This tab is the reference document for restoring and validating that state.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Confirmed Working — POC State</p>
          <div className="space-y-2">
            {POC_WORKING_ITEMS.map(item => (
              <div key={item.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${
                item.status === 'confirmed-working' ? 'border-emerald-200 bg-emerald-50' : 'border-teal-200 bg-teal-50'
              }`}>
                <CheckCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${item.status === 'confirmed-working' ? 'text-emerald-500' : 'text-teal-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-[12px] font-semibold text-foreground">{item.capability}</p>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      item.status === 'confirmed-working' ? 'border-emerald-200 bg-white text-emerald-700' : 'border-teal-200 bg-white text-teal-700'
                    }`}>{item.status === 'confirmed-working' ? 'Confirmed' : 'Tested'}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{item.note}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Channel: {item.channel} · {item.testedDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Bots Confirmed Active — Penny AI Channel</p>
          <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
            {POC_BOTS_CONFIRMED.map(bot => (
              <div key={bot.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border shrink-0 ${bot.colorCls}`}>{bot.platform}</span>
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-foreground">{bot.name}</p>
                  <p className="text-[11px] text-muted-foreground">{bot.role}</p>
                </div>
                <span className="text-[10px] font-medium text-emerald-600 shrink-0">✓ Confirmed in POC</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
            Both Penny (Gemini) and Agentforce were observed responding in the same Penny AI channel — confirmed via screenshot showing simultaneous active responses. The Trail OS Bot handled delivery routing, test messages, and event logging.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Channels Tested in POC</p>
          <div className="grid grid-cols-2 gap-3">
            {POC_CHANNELS_RECORD.map(ch => (
              <div key={ch.role} className={`rounded-lg border p-4 ${ch.role === 'penny' ? 'border-teal-200 bg-teal-50' : 'border-violet-200 bg-violet-50'}`}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Hash className={`w-4 h-4 ${ch.role === 'penny' ? 'text-teal-600' : 'text-violet-600'}`} />
                  <p className="text-[13px] font-bold text-foreground">{ch.channelName}</p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                    ch.testedStatus === 'confirmed-working' ? 'border-emerald-200 bg-white text-emerald-700' : 'border-teal-200 bg-white text-teal-700'
                  }`}>{ch.testedStatus === 'confirmed-working' ? 'Confirmed' : 'Tested'}</span>
                </div>
                <div className="space-y-1 mb-3">
                  {ch.featuresTested.map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-[11px] text-foreground">
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> {f}
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border/30">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Recommended Env Var</p>
                  <code className="text-[10px] font-mono text-muted-foreground">{ch.recommendedEnvVar}</code>
                  <p className="text-[10px] text-muted-foreground mt-0.5 italic leading-snug">{ch.envVarHint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Restore Checklist</p>
          <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
            {POC_RESTORE_CHECKLIST.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                  {item.done ? '✓' : String(i + 1)}
                </span>
                <div className="flex-1">
                  <p className={`text-[12px] font-semibold ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.step}</p>
                  <p className="text-[11px] text-muted-foreground">{item.note}</p>
                </div>
                <span className={`text-[10px] font-medium shrink-0 ${item.done ? 'text-emerald-600' : 'text-muted-foreground'}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab 14: POC Readiness ─────────────────────────────────────────────────────

function PocReadinessTab() {
  const { state: valState } = useSlackValidation();
  const liveChecks  = valState.kind === 'done' ? valState.data.checks   : null;
  const liveChannels = valState.kind === 'done' ? valState.data.channels : null;

  const tokenValid   = liveChecks?.some(c => c.id === 'api-auth-test'          && c.status === 'pass') ?? false;
  const hasPennyCh   = liveChecks?.some(c => c.id === 'secret-penny-channel'   && c.status === 'pass') ?? false;
  const hasAdminCh   = liveChecks?.some(c => c.id === 'secret-admin-channel'   && c.status === 'pass') ?? false;
  const pennyCh      = liveChannels?.find(c => c.resolvedRole === 'penny');
  const adminCh      = liveChannels?.find(c => c.resolvedRole === 'admin');
  const pennyChPass  = pennyCh?.status === 'pass';
  const pennyScopeIssue = pennyCh?.scopeIssue === true;
  const pennyMember  = pennyCh?.isMember === true;
  const adminChPass  = adminCh?.status === 'pass';
  const adminScopeIssue = adminCh?.scopeIssue === true;
  const adminMember  = adminCh?.isMember === true;

  const pennyChDetail = () => {
    if (!liveChannels) return 'Run Workspace Validation to check.';
    if (pennyChPass)       return `Channel accessible${pennyMember ? ' — bot is a member ✓' : ' — bot not yet a member. Run /invite @penny.'}`;
    if (pennyScopeIssue)   return 'channels:read scope missing. Token is valid — add scope in Slack App → OAuth & Permissions → Bot Token Scopes, then reinstall.';
    return `Channel access failed: ${pennyCh?.error ?? 'unknown error'}. ${pennyCh?.fix ?? ''}`;
  };
  const adminChDetail = () => {
    if (!liveChannels) return 'Run Workspace Validation to check.';
    if (adminChPass)       return `Channel accessible${adminMember ? ' — bot is a member ✓' : ' — bot not yet a member. Run /invite @penny.'}`;
    if (adminScopeIssue)   return 'channels:read scope missing. Token is valid — add scope in Slack App → OAuth & Permissions → Bot Token Scopes, then reinstall.';
    return `Channel access failed: ${adminCh?.error ?? 'unknown error'}. ${adminCh?.fix ?? ''}`;
  };

  const liveItems = [
    { id:'token',        label:'Bot Token Valid',                    status: liveChecks ? (tokenValid ? 'pass' : 'fail')      : 'pending', detail: liveChecks ? (tokenValid ? 'auth.test confirmed — @penny is valid.' : 'auth.test failed. Regenerate the Bot User OAuth Token.') : 'Run Workspace Validation to check.' },
    { id:'penny-ch-id',  label:'Penny Channel ID configured',        status: liveChecks ? (hasPennyCh  ? 'pass' : 'warning')  : 'pending', detail: hasPennyCh  ? 'SLACK_PENNY_CHANNEL_ID is set — Penny AI channel explicitly configured.'   : 'Set SLACK_PENNY_CHANNEL_ID with the Penny AI channel ID from the POC.' },
    { id:'admin-ch-id',  label:'Admin Channel ID configured',        status: liveChecks ? (hasAdminCh  ? 'pass' : 'warning')  : 'pending', detail: hasAdminCh  ? 'SLACK_ADMIN_CHANNEL_ID is set — admin/ops channel explicitly configured.'  : 'Set SLACK_ADMIN_CHANNEL_ID with the admin channel ID from the POC.' },
    { id:'penny-access', label:'Penny AI Channel — Slack API',       status: liveChannels ? (pennyChPass ? 'pass' : pennyScopeIssue ? 'warning' : 'fail') : 'pending', detail: pennyChDetail() },
    { id:'penny-member', label:'Bot Member of Penny AI Channel',     status: liveChannels ? (pennyMember ? 'pass' : pennyChPass ? 'warning' : pennyScopeIssue ? 'warning' : 'skip') : 'pending', detail: pennyMember ? 'Bot confirmed as member — can receive events and post.' : pennyChPass ? 'Channel accessible but bot is not yet a member. Run /invite @penny in the Penny AI channel.' : pennyScopeIssue ? 'Cannot verify until scope is added.' : 'Blocked until channel access is resolved.' },
    { id:'admin-access', label:'Admin Channel — Slack API',          status: liveChannels ? (adminChPass ? 'pass' : adminScopeIssue ? 'warning' : 'fail') : 'pending', detail: adminChDetail() },
    { id:'admin-member', label:'Bot Member of Admin Channel',        status: liveChannels ? (adminMember ? 'pass' : adminChPass ? 'warning' : adminScopeIssue ? 'warning' : 'skip') : 'pending', detail: adminMember ? 'Bot confirmed as member of admin channel.' : adminChPass ? 'Channel accessible but bot not yet a member.' : adminScopeIssue ? 'Cannot verify until scope is added.' : 'Blocked until admin channel access is resolved.' },
  ];

  const scopeActionNeeded = pennyScopeIssue || adminScopeIssue;

  const nextSteps = [
    { step:'Bot token valid (auth.test)',                         done: tokenValid,                  detail:'@penny is active and authenticated.' },
    { step:'SLACK_PENNY_CHANNEL_ID configured',                   done: hasPennyCh,                  detail:'Penny AI channel ID set in Replit Secrets.' },
    { step:'SLACK_ADMIN_CHANNEL_ID configured',                   done: hasAdminCh,                  detail:'Admin channel ID set in Replit Secrets.' },
    { step:'Add channels:read + groups:read scopes',              done: !scopeActionNeeded && liveChannels !== null, detail:'Required for conversations.info channel discovery. Slack App → OAuth & Permissions → Bot Token Scopes → add channels:read + groups:read → reinstall app.' },
    { step:'Invite bot to Penny AI channel',                      done: pennyMember,                 detail:'Run /invite @penny in the Penny AI Slack channel.' },
    { step:'Invite bot to Admin channel',                         done: adminMember,                 detail:'Run /invite @penny in the admin Slack channel.' },
    { step:'Send test message to Penny AI channel',               done: false,                       detail:'Use "Test → Penny AI" button in Workspace Validation to confirm chat:write works.' },
    { step:'Confirm Penny → Prompt Studio routing',               done: false,                       detail:'Verify assessment quiz templates are wired to the restored Penny AI channel.' },
    { step:'Re-confirm Agentforce integration path',              done: false,                       detail:'Confirm Agentforce (Penny–Transition Trails Assistant) targets the Penny AI channel.' },
    { step:'End-to-end: user mention → Penny + Agentforce respond', done: false,                    detail:'User @mentions Penny → Penny responds → Agentforce also responds → assessment starts → Trail OS records.' },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-5 max-w-4xl">
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-[11px] font-bold text-primary uppercase mb-1">POC Integration Readiness</p>
          <p className="text-[12px] text-foreground leading-relaxed">
            Live readiness across all systems required to restore the confirmed-working POC state: Slack channels, Penny/Gemini, Agentforce, Assessment, Prompt Studio, and Trail OS event recording. Slack checks update automatically when Workspace Validation runs.
          </p>
        </div>

        {/* Live Slack readiness */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">Live Slack Readiness</p>
            {liveChecks === null && <span className="text-[10px] text-muted-foreground italic">— run Workspace Validation to populate</span>}
          </div>
          <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
            {liveItems.map(item => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                <ValidationIcon status={item.status} />
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.detail}</p>
                </div>
                <ReadinessBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Integration components */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Integration Components</p>
          <div className="grid grid-cols-2 gap-2">
            {POC_INTEGRATION_LINKS.map(link => (
              <div key={link.id} className={`rounded-lg border p-3 ${
                link.status === 'operational' ? 'border-emerald-200 bg-emerald-50' :
                link.status === 'partial'     ? 'border-amber-200 bg-amber-50' :
                                               'border-sky-200 bg-sky-50'
              }`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[12px] font-semibold text-foreground">{link.label}</p>
                  <ReadinessBadge status={link.status} />
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mb-2">{link.description}</p>
                <code className="text-[10px] font-mono text-muted-foreground/60">{link.route}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Next steps to restore POC */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Restore Path — What Needs to Happen Next</p>
          <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
            {nextSteps.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                  {item.done ? '✓' : String(i + 1)}
                </span>
                <div className="flex-1">
                  <p className={`text-[12px] font-semibold ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.step}</p>
                  <p className="text-[11px] text-muted-foreground">{item.detail}</p>
                </div>
                {item.done && <ReadinessBadge status="pass" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Default export ────────────────────────────────────────────────────────────

function SlackIntegrationCenterInner({ onOpenCreate }: { onOpenCreate: () => void }) {
  const { state: valState } = useSlackValidation();
  const govSummary = getGovernanceSummary();

  const liveChecks = valState.kind === 'done' ? valState.data.checks : null;
  const liveFail   = liveChecks ? liveChecks.filter(c => c.status === 'fail').length : null;

  const criticalBadge = govSummary.critical > 0
    ? `${govSummary.critical} critical issue${govSummary.critical > 1 ? 's' : ''}`
    : undefined;

  const descParts: string[] = [];
  if (valState.kind === 'loading') descParts.push('Checking secrets…');
  else if (liveChecks) descParts.push(liveFail === 0 ? 'All secrets validated ✓' : `${liveFail} secret/API check${liveFail !== 1 ? 's' : ''} failing`);
  descParts.push(`${govSummary.critical + govSummary.high} critical/high governance issues`);
  descParts.push('all scenarios defined and partially ready');

  const actions = [
    { id: 'add-channel', label: 'Add Channel Mapping', icon: Plus, onClick: onOpenCreate, variant: 'primary' as const },
  ];

  return (
    <HubShell
      title="Slack Integration Center"
      icon={Hash}
      description={`Operational workflow validation. ${descParts.join(' · ')}.`}
      badge={criticalBadge ?? 'Workflow Validation'}
      actions={actions}
      tabs={[
        { id:'overview',    label:'Overview',            path:'/collaboration/slack',                   icon:Hash,          content:<OverviewTab /> },
        { id:'validation',  label:'Workspace Validation',path:'/collaboration/slack/validation',        icon:Key,           content:<WorkspaceValidationTab /> },
        { id:'prog-channel',label:'Program → Channel',   path:'/collaboration/slack/prog-channel',      icon:Map,           content:<ProgramChannelTab /> },
        { id:'role-user',   label:'Role → User',         path:'/collaboration/slack/role-user',         icon:Users,         content:<RoleUserTab /> },
        { id:'penny-ch',    label:`${TERMS.aiAssistant} → Channel`, path:'/collaboration/slack/penny-channel',     icon:Brain,         content:<PennyDeliveryTab /> },
        { id:'flows',       label:'Flow Explorer',        path:'/collaboration/slack/flows',             icon:Workflow,      content:<FlowExplorerTab /> },
        { id:'channels',    label:'Channel Registry',    path:'/collaboration/slack/channels',          icon:Hash,          content:<ChannelRegistry /> },
        { id:'profiles',    label:'Object Profiles',     path:'/collaboration/slack/profiles',          icon:Layers,        content:<ObjectProfilesTab /> },
        { id:'scenarios',   label:'Scenarios',           path:'/collaboration/slack/scenarios',         icon:Play,          content:<ScenariosTab /> },
        { id:'governance',  label:'Governance',          path:'/collaboration/slack/governance',        icon:Shield,        content:<GovernanceTab /> },
        { id:'testing',     label:'Test Suite',          path:'/collaboration/slack/testing',           icon:FlaskConical,  content:<TestSuiteTab /> },
        { id:'health',      label:'Health',              path:'/collaboration/slack/health',            icon:BarChart2,     content:<IntegrationHealthTab /> },
        { id:'poc-state',   label:'Confirmed State',      path:'/collaboration/slack/poc-state',         icon:CheckCircle,   content:<PocStateTab /> },
        { id:'poc-ready',   label:'Go-Live Checklist',   path:'/collaboration/slack/poc-readiness',     icon:Zap,           content:<PocReadinessTab /> },
      ]}
    />
  );
}

export default function SlackIntegrationCenter() {
  const { openActionPanel, openSlackPanel } = useAppContext();

  useEffect(() => {
    openSlackPanel({ context: 'slack', title: 'Slack Integration', subtitle: 'Workspace health, channel status, and pending actions from your Slack integration.' });
  }, []);

  function handleAddChannelMapping() {
    openActionPanel({
      title: 'Add Channel Mapping', objectType: 'Channel Mapping',
      subtitle: `Connect a Slack channel to a Trail OS object — program, role, cohort, or ${TERMS.aiAssistant} capability.`,
      slackContext: 'slack',
      fields: [
        { id: 'channelName', label: 'Slack Channel Name',  type: 'text',     required: true, placeholder: 'e.g. #career-coaching-jan25' },
        { id: 'mapType',     label: 'Mapping Type',        type: 'select',   options: ['Program → Channel', 'Role → User', `${TERMS.aiAssistant} → Channel`, 'Cohort → Channel'], required: true },
        { id: 'trailObject', label: 'Trail OS Object',     type: 'text',     required: true, placeholder: 'e.g. Job Seekers — Digital Literacy Trail' },
        { id: 'purpose',     label: 'Purpose',             type: 'textarea', placeholder: 'What is this channel used for in Trail OS?', rows: 2 },
        { id: 'visibility',  label: 'Channel Visibility',  type: 'select',   options: ['Public', 'Private'] },
        { id: 'pennyAccess', label: `${TERMS.aiAssistant} Can Post`, type: 'select',   options: ['Yes', 'No — humans only', 'Read-only'] },
      ],
    });
  }

  return (
    <SlackValidationProvider>
      <SlackIntegrationCenterInner onOpenCreate={handleAddChannelMapping} />
    </SlackValidationProvider>
  );
}
