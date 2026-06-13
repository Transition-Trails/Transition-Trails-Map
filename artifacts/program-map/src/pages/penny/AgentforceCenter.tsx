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
  Penny:      { cls: 'bg-violet-50 text-violet-700 border-violet-200',   dot: 'bg-violet-500'   },
  Agentforce: { cls: 'bg-cyan-50 text-cyan-700 border-cyan-200',         dot: 'bg-cyan-500'     },
  Both:       { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
} as const;

// ── POC Validation checklist ──────────────────────────────────────────────────

interface CheckItem {
  label: string;
  detail: string;
  status: 'confirmed' | 'pending' | 'blocked';
}

const POC_CHECKS: CheckItem[] = [
  { label: 'Agentforce bot active in Salesforce org',          detail: 'Penny–Transition Trails Assistant confirmed deployed in POC org', status: 'confirmed' },
  { label: 'Penny AI Slack channel shared',                    detail: 'Both Penny (Gemini) and Agentforce respond in the same channel',   status: 'confirmed' },
  { label: 'Simultaneous response confirmed',                  detail: 'Screenshot evidence: both AIs responding in same thread',          status: 'confirmed' },
  { label: 'Assessment quiz flow tested',                      detail: 'Quiz flow triggered via Agentforce in POC channel',               status: 'confirmed' },
  { label: 'Trail OS Bot routing operational',                 detail: '@coachconnectbot handling delivery + event logging',               status: 'confirmed' },
  { label: 'AGENTFORCE_API_KEY configured in Replit Secrets', detail: 'Required to re-connect Agentforce from Trail OS API server',      status: 'pending'   },
  { label: 'Context handoff payload defined',                  detail: 'User ID + session summary + active program passed on handoff',    status: 'pending'   },
  { label: 'Trail OS → Agentforce API route added',           detail: 'POST /api/agentforce/invoke endpoint not yet built',              status: 'pending'   },
];

const CHECK_CFG = {
  confirmed: { icon: CheckCircle2, cls: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  pending:   { icon: AlertTriangle, cls: 'text-amber-600',  bg: 'bg-amber-50 border-amber-100'   },
  blocked:   { icon: AlertTriangle, cls: 'text-rose-600',   bg: 'bg-rose-50 border-rose-100'     },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgentforceCenter() {
  const { setAskPennyOpen, setPendingPennyQuery } = useAppContext();
  const [, setLocation] = useLocation();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const confirmed = POC_CHECKS.filter(c => c.status === 'confirmed').length;
  const pending   = POC_CHECKS.filter(c => c.status === 'pending').length;

  async function runSlackTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await fetch('/api/slack/validate/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'penny' }),
      });
      const data = await resp.json() as { ok?: boolean };
      setTestResult(data.ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Penny Command Center
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground">Agentforce</h1>
                <p className="text-[11px] text-muted-foreground">
                  Salesforce-native AI coexisting with Penny — confirmed working in the Trail OS POC.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-full px-2.5 py-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <span className="font-semibold">POC Confirmed · Restoring</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'POC Steps Confirmed', value: confirmed,          color: 'text-emerald-600', icon: CheckCircle2 },
            { label: 'Pending Config',       value: pending,            color: 'text-amber-600',   icon: AlertTriangle },
            { label: 'Capabilities Shared', value: MATRIX.filter(m => m.handler === 'Both').length, color: 'text-cyan-600', icon: GitMerge },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-1.5`} />
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* POC context */}
        <div className="rounded-lg border border-cyan-200 bg-cyan-50/60 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-cyan-600" />
            <p className="text-[11px] font-semibold text-foreground">POC Evidence</p>
          </div>
          <p className="text-[11px] text-cyan-800/80 leading-relaxed">
            The Penny AI Slack POC confirmed both <strong>Penny (Gemini)</strong> and <strong>Agentforce (Penny–Transition Trails Assistant)</strong> responding
            simultaneously in the same channel. The assessment quiz flow was triggered via Agentforce, and the Trail OS Bot
            (@coachconnectbot) handled delivery routing and event logging. All components were confirmed active.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setLocation('/collaboration/slack')}
              className="flex items-center gap-1 text-[10px] text-cyan-700 border border-cyan-200 rounded-md px-2.5 py-1 hover:bg-cyan-100 transition-colors"
            >
              <Slack className="w-2.5 h-2.5" /> View Slack POC documentation <ChevronRight className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={askPennyAboutHandoff}
              className="flex items-center gap-1 text-[10px] text-primary border border-primary/20 rounded-md px-2.5 py-1 hover:bg-primary/5 transition-colors"
            >
              <Brain className="w-2.5 h-2.5" /> Ask Penny about the handoff model
            </button>
          </div>
        </div>

        {/* Coexistence decision matrix */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Coexistence Decision Matrix
            </p>
            <div className="flex items-center gap-2">
              {(['Penny', 'Agentforce', 'Both'] as const).map(h => (
                <div key={h} className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${HANDLER_CFG[h].dot}`} />
                  <span className="text-[9px] text-muted-foreground">{h}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_130px] gap-x-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
              {['Capability', 'Handled by'].map(h => (
                <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{h}</p>
              ))}
            </div>
            <div className="bg-card divide-y divide-border">
              {MATRIX.map(row => {
                const cfg = HANDLER_CFG[row.handler];
                return (
                  <div key={row.capability} className="grid grid-cols-[1fr_130px] gap-x-3 items-start px-4 py-3">
                    <div>
                      <p className="text-[12px] font-medium text-foreground">{row.capability}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{row.rationale}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold border rounded-full px-2 py-0.5 w-fit mt-0.5 ${cfg.cls}`}>
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2.5">
            Restoration Checklist
          </p>
          <div className="space-y-2">
            {POC_CHECKS.map(item => {
              const cfg = CHECK_CFG[item.status];
              return (
                <div key={item.label} className={`flex items-start gap-3 rounded-lg border p-3 ${cfg.bg}`}>
                  <cfg.icon className={`w-3.5 h-3.5 ${cfg.cls} shrink-0 mt-0.5`} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.detail}</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${cfg.cls}`}>
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Test Slack channel */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Slack className="w-3.5 h-3.5 text-[#4A154B]" />
            <p className="text-[11px] font-semibold text-foreground">Test Penny AI Channel</p>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Verify the Penny AI channel is reachable before restoring Agentforce. Both Penny and Agentforce
            should respond to messages in this channel.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void runSlackTest()}
              disabled={testing}
              className="flex items-center gap-1.5 text-[11px] text-[#4A154B] border border-[#4A154B]/20 rounded-md px-3 py-1.5 hover:bg-[#4A154B]/5 transition-colors disabled:opacity-40"
            >
              {testing
                ? <RefreshCw className="w-3 h-3 animate-spin" />
                : <Slack className="w-3 h-3" />
              }
              {testing ? 'Sending…' : 'Send test to Penny AI channel'}
            </button>
            {testResult === 'success' && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> Message sent — channel live
              </span>
            )}
            {testResult === 'error' && (
              <span className="flex items-center gap-1 text-[10px] text-rose-600">
                <AlertTriangle className="w-3 h-3" /> Could not send — check Slack secrets
              </span>
            )}
          </div>
        </div>

        {/* Next steps */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLocation('/admin/setup')}
            className="rounded-lg border border-border bg-card p-4 text-left hover:border-cyan-300 hover:bg-cyan-50/30 transition-colors group"
          >
            <Shield className="w-4 h-4 text-cyan-600 mb-2" />
            <p className="text-[11px] font-semibold text-foreground group-hover:text-cyan-700">Configure secrets</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Add AGENTFORCE_API_KEY to Replit Secrets</p>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-cyan-600">
              Go to Admin Setup <ArrowRight className="w-3 h-3" />
            </div>
          </button>
          <button
            onClick={() => setLocation('/collaboration/slack')}
            className="rounded-lg border border-border bg-card p-4 text-left hover:border-[#4A154B]/30 hover:bg-[#4A154B]/5 transition-colors group"
          >
            <Slack className="w-4 h-4 text-[#4A154B] mb-2" />
            <p className="text-[11px] font-semibold text-foreground">Slack Integration Center</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Full POC documentation + channel validation</p>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-[#4A154B]/70">
              View POC docs <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>

      </div>
    </ScrollArea>
  );
}
