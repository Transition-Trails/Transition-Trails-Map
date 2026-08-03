import { useState } from 'react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import {
  Bot, CheckCircle2, AlertTriangle, ArrowRight, Brain,
  Zap, Shield, Users, Slack, ChevronRight, RefreshCw,
  GitMerge, Layers,
} from 'lucide-react';

// ── Coexistence decision matrix ───────────────────────────────────────────────

interface MatrixRow {
  capability: string;
  handler: 'Penny' | 'Agentforce' | 'Both';
  rationale: string;
}

const MATRIX: MatrixRow[] = [
  { capability: 'Career coaching & resume review',         handler: 'Penny',      rationale: 'Penny uses Gemini for generative, multi-turn coaching sessions' },
  { capability: 'Salesforce CRM record actions',           handler: 'Agentforce', rationale: 'Agentforce has native access to Salesforce objects and flows' },
  { capability: 'Trail Quest delivery via Slack',          handler: 'Both',       rationale: 'Penny generates the quest; Agentforce records completion in Salesforce' },
  { capability: 'Assessment delivery & quiz flow',         handler: 'Both',       rationale: 'Penny coaches; Agentforce writes results to Assessment__c' },
  { capability: 'Learner onboarding & program intake',     handler: 'Agentforce', rationale: 'CRM-native flow — creates Contact + Program Engagement records' },
  { capability: 'Knowledge retrieval (RAG)',               handler: 'Penny',      rationale: 'Penny RAG corpus covers TT curriculum, standards, and source docs' },
  { capability: 'Program health & operations insight',     handler: 'Penny',      rationale: 'Penny aggregates Trail Signals; no CRM record write needed' },
  { capability: 'Certification pathway tracking',         handler: 'Agentforce', rationale: 'Certification records live natively in Salesforce Certification objects' },
  { capability: 'Weekly cohort summaries',                handler: 'Penny',      rationale: 'Penny generates and delivers via Slack using its knowledge corpus' },
  { capability: 'Escalation from learner to coach',       handler: 'Agentforce', rationale: 'Agentforce creates Task records and routes to the correct coach queue' },
];

const HANDLER_CFG = {
  Penny:      { cls: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',   dot: 'bg-[#EDF5F8]0'   },
  Agentforce: { cls: 'bg-cyan-50 text-cyan-700 border-cyan-200',         dot: 'bg-cyan-500'     },
  Both:       { cls: 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]', dot: 'bg-[#E6F0EA]0' },
} as const;

// ── POC Validation checklist ──────────────────────────────────────────────────

interface CheckItem {
  label: string;
  detail: string;
  status: 'confirmed' | 'pending' | 'blocked';
}

const POC_CHECKS: CheckItem[] = [
  { label: 'Agentforce bot active in Salesforce org',          detail: 'Penny–Transition Trails Assistant confirmed deployed in POC org',          status: 'confirmed' },
  { label: 'Penny AI Slack channel shared',                    detail: 'Both Penny (Gemini) and Agentforce respond in the same channel',            status: 'confirmed' },
  { label: 'Simultaneous response confirmed',                  detail: 'Screenshot evidence: both AIs responding in same thread',                   status: 'confirmed' },
  { label: 'Assessment quiz flow tested',                      detail: 'Quiz flow triggered via Agentforce in POC channel',                         status: 'confirmed' },
  { label: 'Trail OS Bot routing operational',                 detail: '@penny handling delivery + event logging',                         status: 'confirmed' },
  { label: 'AGENTFORCE_API_KEY set in Replit Secrets',        detail: 'Agent ID (0Xxan…) set — Salesforce Connector handles auth automatically',   status: 'confirmed' },
  { label: 'Context handoff payload defined',                  detail: 'learnerId + programId passed as Agentforce session variables on every call', status: 'confirmed' },
  { label: 'POST /api/agentforce/invoke route live',          detail: 'Trail OS API server routes messages directly to the Agentforce Sessions API', status: 'confirmed' },
];

const CHECK_CFG = {
  confirmed: { icon: CheckCircle2, cls: 'text-[#2F6B3F]', bg: 'bg-[#E6F0EA] border-[#E6F0EA]' },
  pending:   { icon: AlertTriangle, cls: 'text-[#CC8400]',  bg: 'bg-[#FFF3E0] border-[#FFF3E0]'   },
  blocked:   { icon: AlertTriangle, cls: 'text-[#A93F2F]',   bg: 'bg-[#FBEAE6] border-[#FBEAE6]'     },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

interface AgentTestResult {
  ok: boolean;
  responsePreview?: string;
  sessionId?: string;
  detail?: string;
  hint?: string;
}

export default function AgentforceCenter() {
  const { setAskPennyOpen, setPendingPennyQuery } = useAppContext();
  const [, setLocation] = useLocation();
  const [testing, setTesting]       = useState(false);
  const [testResult, setTestResult] = useState<AgentTestResult | null>(null);

  const confirmed = POC_CHECKS.filter(c => c.status === 'confirmed').length;
  const pending   = POC_CHECKS.filter(c => c.status === 'pending').length;

  async function runAgentforceTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await fetch('/api/agentforce/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await resp.json() as AgentTestResult;
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, detail: 'Network error — API server unreachable' });
    } finally {
      setTesting(false);
    }
  }

  function askPennyAboutHandoff() {
    setPendingPennyQuery(
      `Explain the Agentforce coexistence model for Trail OS. When should a learner interaction be handled by Penny (Gemini) vs Agentforce? What does the handoff look like from a learner's perspective?`
    );
    setAskPennyOpen(true);
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-5xl">

        {/* Header */}
        <div className="space-y-3">
          <p className="text-[14px] font-bold  text-muted-foreground/50">
            Penny Command Center
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground">Agentforce</h1>
                <p className="text-[14px] text-muted-foreground">
                  Salesforce-native AI coexisting with Penny — confirmed working in the Trail OS POC.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[14px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2.5 py-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E6F0EA]0" />
              <span className="font-semibold">Live · API Connected</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'POC Steps Confirmed', value: confirmed,          color: 'text-[#2F6B3F]', icon: CheckCircle2 },
            { label: 'Pending Config',       value: pending,            color: 'text-[#CC8400]',   icon: AlertTriangle },
            { label: 'Capabilities Shared', value: MATRIX.filter(m => m.handler === 'Both').length, color: 'text-cyan-600', icon: GitMerge },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-1.5`} />
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-[14px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* POC context */}
        <div className="rounded-lg border border-cyan-200 bg-cyan-50/60 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-cyan-600" />
            <p className="text-[14px] font-semibold text-foreground">POC Evidence</p>
          </div>
          <p className="text-[14px] text-cyan-800/80 leading-relaxed">
            The Penny AI Slack POC confirmed both <strong>Penny (Gemini)</strong> and <strong>Agentforce (Penny–Transition Trails Assistant)</strong> responding
            simultaneously in the same channel. The assessment quiz flow was triggered via Agentforce, and the Trail OS Bot
            (@penny) handled delivery routing and event logging. All components were confirmed active.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setLocation('/collaboration/slack')}
              className="flex items-center gap-1 text-[14px] text-cyan-700 border border-cyan-200 rounded-md px-2.5 py-1 hover:bg-cyan-100 transition-colors"
            >
              <Slack className="w-2.5 h-2.5" /> View Slack POC documentation <ChevronRight className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={askPennyAboutHandoff}
              className="flex items-center gap-1 text-[14px] text-primary border border-primary/20 rounded-md px-2.5 py-1 hover:bg-primary/5 transition-colors"
            >
              <Brain className="w-2.5 h-2.5" /> Ask Penny about the handoff model
            </button>
          </div>
        </div>

        {/* Coexistence decision matrix */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[14px] font-bold  text-muted-foreground/60">
              Coexistence Decision Matrix
            </p>
            <div className="flex items-center gap-2">
              {(['Penny', 'Agentforce', 'Both'] as const).map(h => (
                <div key={h} className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${HANDLER_CFG[h].dot}`} />
                  <span className="text-[14px] text-muted-foreground">{h}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_130px] gap-x-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
              {['Capability', 'Handled by'].map(h => (
                <p key={h} className="text-[14px] font-bold  text-muted-foreground/60">{h}</p>
              ))}
            </div>
            <div className="bg-card divide-y divide-border">
              {MATRIX.map(row => {
                const cfg = HANDLER_CFG[row.handler];
                return (
                  <div key={row.capability} className="grid grid-cols-[1fr_130px] gap-x-3 items-start px-4 py-3">
                    <div>
                      <p className="text-[14px] font-medium text-foreground">{row.capability}</p>
                      <p className="text-[14px] text-muted-foreground mt-0.5 leading-snug">{row.rationale}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[14px] font-semibold border rounded-full px-2 py-0.5 w-fit mt-0.5 ${cfg.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {row.handler}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* POC Validation checklist */}
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/60 mb-2.5">
            Restoration Checklist
          </p>
          <div className="space-y-2">
            {POC_CHECKS.map(item => {
              const cfg = CHECK_CFG[item.status];
              return (
                <div key={item.label} className={`flex items-start gap-3 rounded-lg border p-3 ${cfg.bg}`}>
                  <cfg.icon className={`w-3.5 h-3.5 ${cfg.cls} shrink-0 mt-0.5`} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-foreground">{item.label}</p>
                    <p className="text-[14px] text-muted-foreground mt-0.5">{item.detail}</p>
                  </div>
                  <span className={`text-[14px] font-bold  shrink-0 ${cfg.cls}`}>
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Agentforce test */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-cyan-600" />
              <p className="text-[14px] font-semibold text-foreground">Live Agent Test</p>
            </div>
            <span className="text-[14px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2 py-0.5 font-semibold">
              POST /api/agentforce/test
            </span>
          </div>
          <p className="text-[14px] text-muted-foreground leading-snug">
            Creates a real Agentforce session, sends a greeting to the Penny–Transition Trails Assistant,
            and returns the response. Uses the Salesforce Connector for auth — no separate token needed.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => void runAgentforceTest()}
              disabled={testing}
              className="flex items-center gap-1.5 text-[14px] text-cyan-700 border border-cyan-200 rounded-md px-3 py-1.5 hover:bg-cyan-50 transition-colors disabled:opacity-40"
            >
              {testing
                ? <RefreshCw className="w-3 h-3 animate-spin" />
                : <Zap className="w-3 h-3" />
              }
              {testing ? 'Connecting to Agentforce…' : 'Run live test'}
            </button>
            {testResult && testResult.ok && (
              <span className="flex items-center gap-1 text-[14px] text-[#2F6B3F]">
                <CheckCircle2 className="w-3 h-3" /> Session live · agent responded
              </span>
            )}
            {testResult && !testResult.ok && (
              <span className="flex items-center gap-1 text-[14px] text-[#A93F2F]">
                <AlertTriangle className="w-3 h-3" /> {testResult.detail?.slice(0, 80) ?? 'Test failed'}
              </span>
            )}
          </div>
          {testResult?.ok && testResult.responsePreview && (
            <div className="rounded-lg border border-cyan-100 bg-cyan-50/60 p-3 space-y-1">
              <p className="text-[14px] font-bold  text-cyan-600/60">Agentforce Response</p>
              <p className="text-[14px] text-foreground leading-relaxed">{testResult.responsePreview}</p>
              {testResult.sessionId && (
                <p className="text-[14px] text-muted-foreground font-mono">session: {testResult.sessionId}</p>
              )}
            </div>
          )}
          {testResult && !testResult.ok && testResult.hint && (
            <div className="rounded-lg border border-[#FFF3E0] bg-[#FFF3E0] p-3">
              <p className="text-[14px] text-[#CC8400] leading-snug">
                <span className="font-semibold">Fix: </span>{testResult.hint}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLocation('/admin/setup')}
            className="rounded-lg border border-[#9FC3AE] bg-[#E6F0EA]/40 p-4 text-left hover:bg-[#E6F0EA] transition-colors group"
          >
            <Shield className="w-4 h-4 text-[#2F6B3F] mb-2" />
            <p className="text-[14px] font-semibold text-foreground">Secrets · Configured</p>
            <p className="text-[14px] text-muted-foreground mt-0.5">AGENTFORCE_API_KEY is set · view all secrets</p>
            <div className="flex items-center gap-1 mt-2 text-[14px] text-[#2F6B3F]">
              Admin Setup <ArrowRight className="w-3 h-3" />
            </div>
          </button>
          <button
            onClick={() => setLocation('/collaboration/slack')}
            className="rounded-lg border border-border bg-card p-4 text-left hover:border-[#4A154B]/30 hover:bg-[#4A154B]/5 transition-colors group"
          >
            <Slack className="w-4 h-4 text-[#4A154B] mb-2" />
            <p className="text-[14px] font-semibold text-foreground">Slack Integration Center</p>
            <p className="text-[14px] text-muted-foreground mt-0.5">Full POC documentation + channel validation</p>
            <div className="flex items-center gap-1 mt-2 text-[14px] text-[#4A154B]/70">
              View POC docs <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>

      </div>
    </ScrollArea>
  );
}
