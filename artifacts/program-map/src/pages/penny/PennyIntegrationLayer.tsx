import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { Brain, MessageSquare, BookOpen, Hash, HardDrive, Calendar, Database, CheckCircle2, AlertTriangle, XCircle, Clock, ArrowRight, Zap, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type IntegrationStatus = 'live' | 'ready' | 'in-progress' | 'planned' | 'blocked';
type IntegrationPhase = 1 | 2;

interface IntegrationConnection {
  id: string;
  from: string;
  to: string;
  toIcon: LucideIcon;
  description: string;
  status: IntegrationStatus;
  phase: IntegrationPhase;
  readiness: number;
  method: string;
  blockers: string[];
  capabilities: string[];
  nextStep: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; cls: string; dot: string; icon: LucideIcon }> = {
  live:        { label: 'Live',        cls: 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]', dot: 'bg-[#E6F0EA]0', icon: CheckCircle2 },
  ready:       { label: 'POC Ready',   cls: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',          dot: 'bg-[#EDF5F8]0',    icon: CheckCircle2 },
  'in-progress':{ label: 'In Progress',cls: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',    dot: 'bg-[#EDF5F8]0',  icon: Zap          },
  planned:     { label: 'Planned',     cls: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',        dot: 'bg-[#FFF3E0]0',   icon: Clock        },
  blocked:     { label: 'Blocked',     cls: 'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]',           dot: 'bg-[#FBEAE6]0',    icon: XCircle      },
};

// ── Integration Data ──────────────────────────────────────────────────────────

const CONNECTIONS: IntegrationConnection[] = [
  // ── Internal connections ───────────────────────────────────────────────────
  {
    id: 'penny-prompt-studio',
    from: 'Penny',
    to: 'Prompt Studio',
    toIcon: MessageSquare,
    description: 'Penny capabilities are authored and managed in Prompt Studio. Each capability maps to one or more versioned prompts.',
    status: 'ready',
    phase: 1,
    readiness: 85,
    method: 'Internal registry — in-memory prototype, ready for live prompt endpoint',
    blockers: ['Penny API endpoint not yet provisioned'],
    capabilities: ['All 7 capabilities'],
    nextStep: 'Provision Penny POC environment and wire first live prompt call',
  },
  {
    id: 'penny-capability-registry',
    from: 'Penny',
    to: 'Capability Registry',
    toIcon: Brain,
    description: 'The Capability Registry is the source of truth for all Penny capabilities — readiness, domain, prompts, knowledge sources, and health.',
    status: 'ready',
    phase: 1,
    readiness: 90,
    method: 'In-memory AppContext — ready for API-backed persistence',
    blockers: ['API-backed persistence not yet implemented (Phase 2)'],
    capabilities: ['Resume Review', 'Learning Coach', 'Trail Quest Runner', 'Weekly Brief', 'Intake Triage', 'Cohort Health', 'SF Data Intelligence'],
    nextStep: 'Implement API endpoint for capability registry persistence',
  },
  {
    id: 'penny-knowledge-sources',
    from: 'Penny',
    to: 'Knowledge Sources',
    toIcon: BookOpen,
    description: 'Penny capabilities draw from verified knowledge sources — Salesforce KB, Program Canvas, RESOLVE Framework, and uploaded documents.',
    status: 'in-progress',
    phase: 1,
    readiness: 60,
    method: 'Knowledge source registry wired to capability definitions; sync not yet live',
    blockers: ['3 sources Unverified — not yet activated', 'Salesforce KB API access needed'],
    capabilities: ['Resume Review', 'Learning Coach', 'Weekly Brief', 'SF Data Intelligence'],
    nextStep: 'Complete trust review for 3 unverified sources; configure SF KB connector',
  },
  // ── AI backbone ────────────────────────────────────────────────────────────
  {
    id: 'penny-gemini',
    from: 'Penny',
    to: 'Gemini API',
    toIcon: Brain,
    description: 'Gemini is the generative AI backbone for all Penny capabilities. Every capability prompt routes through GEMINI_API_KEY to the Generative Language API.',
    status: 'in-progress',
    phase: 1,
    readiness: 55,
    method: 'Generative Language API v1 — model: gemini-1.5-pro or gemini-pro. Key format verified; live API returning INVALID_ARGUMENT.',
    blockers: [
      'GEMINI_API_KEY auth rejected by Google (INVALID_ARGUMENT) — Generative Language API may not be enabled for the key\'s GCP project',
      'No Penny capability is wired to make a live Gemini call yet — all capability responses are prototype',
    ],
    capabilities: ['Resume Review', 'Learning Coach', 'Trail Quest Runner', 'Weekly Brief', 'Intake Triage', 'Cohort Health', 'SF Data Intelligence'],
    nextStep: 'Verify GEMINI_API_KEY in Google AI Studio (aistudio.google.com) — ensure Generative Language API is enabled. Then wire the first Penny capability (Resume Review) to call the API.',
  },
  // ── External connections ───────────────────────────────────────────────────
  {
    id: 'penny-slack',
    from: 'Penny',
    to: 'Slack',
    toIcon: Hash,
    description: 'Penny broadcasts weekly briefs, learner nudges, cohort health alerts, and coach notifications via Slack channels. POC confirmed: @penny posting to Penny AI and Admin channels.',
    status: 'ready',
    phase: 1,
    readiness: 78,
    method: 'Slack Bot API — SLACK_BOT_TOKEN live. Penny AI channel + Admin channel confirmed working in POC.',
    blockers: ['channels:read + groups:read scopes not yet added (prevents Penny/Admin channel name resolution)', 'Penny prompt → Slack message pipeline not yet wired end-to-end'],
    capabilities: ['Weekly Brief', 'Learning Coach', 'Cohort Health'],
    nextStep: 'Add channels:read + groups:read to Slack app scopes, then wire Penny capability output to Slack message delivery',
  },
  {
    id: 'penny-google-drive',
    from: 'Penny',
    to: 'Google Drive',
    toIcon: HardDrive,
    description: 'Penny reads program documents, curriculum assets, and session recordings from Google Drive as knowledge sources.',
    status: 'in-progress',
    phase: 1,
    readiness: 45,
    method: 'Google Drive API v3 — read-only access to program-linked folders',
    blockers: ['GOOGLE_DRIVE_REFRESH_TOKEN not yet configured — OAuth flow not completed', 'Drive folder structure not yet mapped per program'],
    capabilities: ['Learning Coach', 'Trail Quest Runner', 'Weekly Brief'],
    nextStep: 'Complete Google OAuth flow (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are already configured). Store refresh token as GOOGLE_DRIVE_REFRESH_TOKEN.',
  },
  {
    id: 'penny-google-calendar',
    from: 'Penny',
    to: 'Google Calendar',
    toIcon: Calendar,
    description: 'Penny reads cohort session schedules, coach availability, and sprint milestones from Google Calendar.',
    status: 'in-progress',
    phase: 1,
    readiness: 40,
    method: 'Google Calendar API v3 — read events from shared program calendars',
    blockers: ['GOOGLE_CALENDAR_REFRESH_TOKEN not yet configured — OAuth flow not completed', 'Shared calendar structure not yet created'],
    capabilities: ['Weekly Brief', 'Learning Coach', 'Trail Quest Runner'],
    nextStep: 'Complete Calendar OAuth flow (same GOOGLE_CLIENT_ID/SECRET). Store as GOOGLE_CALENDAR_REFRESH_TOKEN. Can be done in the same OAuth session as Drive.',
  },
  {
    id: 'penny-salesforce',
    from: 'Penny',
    to: 'Salesforce',
    toIcon: Database,
    description: 'Penny reads learner progress, engagement records, and case data from Salesforce to power intelligence and personalisation. Salesforce REST API is live via Replit Connector — 127 Accounts, 129 Contacts, NPSP + PMM confirmed.',
    status: 'in-progress',
    phase: 1,
    readiness: 55,
    method: 'Salesforce REST API via Replit Connector SDK (createProxyFetch) — no credentials needed in env; proxyFetch handles auth automatically. Validation at GET /api/salesforce/validate.',
    blockers: ['Salesforce KB connector not yet configured — REST API is accessible but knowledge sync not wired', 'Penny capability not yet wired to query Salesforce via /api/salesforce/validate'],
    capabilities: ['SF Data Intelligence', 'Cohort Health', 'Intake Triage'],
    nextStep: 'Wire first Penny capability (SF Data Intelligence) to query Salesforce via the existing /api/salesforce/validate endpoint; expand to SOQL queries for learner progress and enrollment data',
  },
];

const PHASE1 = CONNECTIONS.filter(c => c.phase === 1);
const PHASE2 = CONNECTIONS.filter(c => c.phase === 2);

// ── Components ────────────────────────────────────────────────────────────────

function ReadinessMini({ value, status }: { value: number; status: IntegrationStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full ${cfg.dot}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{value}%</span>
    </div>
  );
}

function ConnectionCard({ conn }: { conn: IntegrationConnection }) {
  const cfg = STATUS_CONFIG[conn.status];
  const StatusIcon = cfg.icon;
  const ToIcon = conn.toIcon;

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-border/50 bg-muted/10">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2 py-1">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold text-primary">{conn.from}</span>
            </div>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2 py-1">
              <ToIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold text-foreground">{conn.to}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold border rounded-full px-2 py-0.5 ${cfg.cls}`}>
              <StatusIcon className="w-2.5 h-2.5" />
              {cfg.label}
            </span>
            <span className="text-[9px] font-bold text-muted-foreground border border-border rounded-full px-1.5 py-0.5">
              Phase {conn.phase}
            </span>
          </div>
        </div>
        <ReadinessMini value={conn.readiness} status={conn.status} />
      </div>

      {/* Card body */}
      <div className="px-4 py-3 space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">{conn.description}</p>

        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Method</p>
          <p className="text-[11px] text-foreground">{conn.method}</p>
        </div>

        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Penny Capabilities</p>
          <div className="flex flex-wrap gap-1">
            {conn.capabilities.map(c => (
              <span key={c} className="inline-flex text-[9px] font-medium bg-primary/5 border border-primary/15 text-primary rounded px-1.5 py-0.5">{c}</span>
            ))}
          </div>
        </div>

        {conn.blockers.length > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#A93F2F]/70 mb-1 flex items-center gap-1">
              <XCircle className="w-2.5 h-2.5" /> Blockers
            </p>
            <div className="space-y-0.5">
              {conn.blockers.map(b => (
                <div key={b} className="flex items-start gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-[#A93F2F] mt-1.5 shrink-0" />
                  <p className="text-[10px] text-foreground">{b}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded bg-primary/5 border border-primary/15 px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-primary mb-0.5">Next Step</p>
          <p className="text-[11px] text-foreground">{conn.nextStep}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function PennyIntegrationLayer() {
  const { openActionPanel, openSlackPanel } = useAppContext();
  const liveCount    = CONNECTIONS.filter(c => c.status === 'live').length;
  const readyCount   = CONNECTIONS.filter(c => c.status === 'ready').length;
  const blockedCount = CONNECTIONS.filter(c => c.status === 'blocked').length;
  const avgReadiness = Math.round(CONNECTIONS.reduce((s, c) => s + c.readiness, 0) / CONNECTIONS.length);

  function handleAddIntegration() {
    openActionPanel({
      title: 'Add Integration Connection', objectType: 'Integration Connection',
      subtitle: 'Register a new integration pairing between Penny and an external platform. Appears with Planned status.',
      slackContext: 'penny',
      fields: [
        { id: 'from',        label: 'From (Penny System)',  type: 'text',     required: true, placeholder: 'e.g. Penny Coaching Core' },
        { id: 'to',          label: 'To (External System)', type: 'text',     required: true, placeholder: 'e.g. Salesforce' },
        { id: 'description', label: 'Description',          type: 'textarea', placeholder: 'What data flows between these two systems?', rows: 3 },
        { id: 'phase',       label: 'Integration Phase',    type: 'select',   options: ['Phase 1 — Core', 'Phase 2 — Extended'], required: true },
        { id: 'status',      label: 'Current Status',       type: 'select',   options: ['Planned', 'In Development', 'POC Ready', 'Live', 'Blocked'] },
        { id: 'readiness',   label: 'Readiness %',          type: 'text',     placeholder: 'e.g. 60' },
        { id: 'blocker',     label: 'Current Blocker',      type: 'textarea', placeholder: 'What is preventing progress? (leave blank if none)', rows: 2 },
      ],
    });
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Penny — POC Integration Layer</p>
            <h2 className="text-2xl font-bold text-foreground">Penny Integration Readiness</h2>
            <p className="text-[12px] text-muted-foreground mt-1 max-w-2xl">
              Integration readiness tracking between Penny capabilities and all connected systems — internal registry and external platform integrations.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <button
              onClick={() => openSlackPanel({ context: 'penny', title: 'POC Integrations', subtitle: 'Slack bot status and pending actions for Penny integration work.' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-[#4A154B]/20 bg-[#4A154B]/5 text-[#4A154B] hover:bg-[#4A154B]/10 transition-colors"
              title="Open Slack context"
            >
              <Hash className="w-3.5 h-3.5" />
              Slack
            </button>
            <button
              onClick={handleAddIntegration}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[11px] font-bold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Integration
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Avg Readiness',   v: `${avgReadiness}%`,  cls: 'text-primary'      },
            { label: 'POC Ready',        v: readyCount,           cls: 'text-[#2F6F7E]'     },
            { label: 'Live',             v: liveCount,            cls: 'text-[#2F6B3F]'  },
            { label: 'Blocked',          v: blockedCount,         cls: 'text-[#A93F2F]'     },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-white px-3 py-3 text-center">
              <p className={`text-2xl font-bold ${s.cls}`}>{s.v}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Phase 1 integrations */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Phase 1 Integrations</p>
            <span className="text-[9px] bg-primary/10 text-primary font-bold rounded-full px-2 py-0.5">Target: Production onboarding</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PHASE1.map(c => <ConnectionCard key={c.id} conn={c} />)}
          </div>
        </div>

        {/* Phase 2 integrations */}
        {PHASE2.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Phase 2 Integrations</p>
              <span className="text-[9px] bg-muted text-muted-foreground font-bold rounded-full px-2 py-0.5">Post Phase 1 — blocked on Phase 1 foundation</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PHASE2.map(c => <ConnectionCard key={c.id} conn={c} />)}
            </div>
          </div>
        )}

        {/* What "POC Ready" means */}
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">What "POC Ready" Means</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">POC Ready</strong> = the Trail OS architecture, data models, and UI are ready to connect. The only remaining step is obtaining the external credential (API key, OAuth token, or org access) and wiring the first live call. No structural rework is needed. <strong className="text-foreground">Blocked</strong> means an external dependency is required before any integration work can begin.
          </p>
        </div>

      </div>
    </ScrollArea>
  );
}

