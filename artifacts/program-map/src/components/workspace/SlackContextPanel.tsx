import { useState } from 'react';
import {
  Hash, ExternalLink, AlertTriangle, CheckCircle2, Clock, X,
  Zap, MessageSquare, Bell, ArrowRight, Radio, Settings,
  Users, Send, Shield, Calendar, ChevronRight,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  SLACK_WORKSPACE,
  SLACK_CHANNELS,
  SLACK_ACTIVITY,
  SLACK_GOVERNANCE,
  SLACK_HEALTH_SCORES,
  type SlackChannel,
  type SlackActivityEvent,
} from '@/data/slackIntegrationData';
import type { SlackPanelConfig, SlackPanelContext } from '@/types/actionPanel';

const WORKSPACE_WEB = `https://${SLACK_WORKSPACE.domain}.slack.com`;

function slackChannelUrl(channelId: string) {
  return `${WORKSPACE_WEB}/channels/${channelId}`;
}

function slackThreadUrl(channelId: string, ts?: string) {
  if (!ts) return slackChannelUrl(channelId);
  return `${WORKSPACE_WEB}/archives/${channelId}/p${ts}`;
}

// ── Context config ────────────────────────────────────────────────────────────

const CONTEXT_META: Record<SlackPanelContext, {
  color: string;
  label: string;
  purposeFilter?: string[];
  contextualChannelIds?: string[];
}> = {
  penny: {
    color: '#4A154B',
    label: 'Penny AI',
    purposeFilter: ['penny', 'admin'],
    contextualChannelIds: ['penny-qa', 'trail-os-ops', 'penny-admin-team'],
  },
  program: {
    color: '#0078D4',
    label: 'Program',
    purposeFilter: ['program', 'cohort', 'coach'],
  },
  cohort: {
    color: '#0078D4',
    label: 'Cohort',
    purposeFilter: ['cohort', 'coach'],
  },
  slack: {
    color: '#4A154B',
    label: 'Slack Integration',
    purposeFilter: undefined,
  },
  governance: {
    color: '#6B4F12',
    label: 'Governance',
    purposeFilter: ['admin', 'internal', 'executive'],
    contextualChannelIds: ['trail-os-ops', 'exec-briefs', 'governance-team'],
  },
  calendar: {
    color: '#0F7B6C',
    label: 'Calendar',
    purposeFilter: ['internal', 'admin', 'cohort'],
    contextualChannelIds: ['trail-os-ops', 'foundations-coaches'],
  },
  collaboration: {
    color: '#4A154B',
    label: 'Collaboration',
    purposeFilter: undefined,
  },
  people: {
    color: '#5C2D91',
    label: 'People & Roles',
    purposeFilter: ['coach', 'admin', 'internal'],
    contextualChannelIds: ['foundations-coaches', 'trail-os-ops'],
  },
  'digital-twin': {
    color: '#0078D4',
    label: 'Digital Twin',
    purposeFilter: ['executive', 'admin', 'internal'],
    contextualChannelIds: ['exec-briefs', 'trail-os-ops'],
  },
};

// ── Pending action items per context ─────────────────────────────────────────

interface PendingItem {
  id: string;
  kind: 'mention' | 'ask' | 'reminder' | 'escalation' | 'alert';
  text: string;
  channel?: string;
  channelId?: string;
  time?: string;
  urgent?: boolean;
}

const CONTEXT_PENDING: Record<SlackPanelContext, PendingItem[]> = {
  penny: [
    { id:'p1', kind:'ask',       text:'@penny-bot — "Can you resend the Week 6 check-in to Alex?" Awaiting response.', channel:'#penny-qa', channelId:'penny-qa', time:'2h ago', urgent:false },
    { id:'p2', kind:'alert',     text:'Bot token not yet configured — Penny message delivery is blocked in production.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Ongoing', urgent:true },
    { id:'p3', kind:'reminder',  text:'Prompt template review due: Learning Coach v1.4 QA check.', channel:'#penny-qa', channelId:'penny-qa', time:'Today', urgent:false },
    { id:'p4', kind:'mention',   text:'You were mentioned in #penny-qa: "Capability Registry update needed for Resume Review."', channel:'#penny-qa', channelId:'penny-qa', time:'Yesterday', urgent:false },
  ],
  program: [
    { id:'p1', kind:'ask',       text:'Coach asked: "Can Penny auto-send the Sprint 4 brief to Cohort 2 early?" Needs confirmation.', channel:'#foundations-coaches', channelId:'foundations-coaches', time:'1h ago', urgent:true },
    { id:'p2', kind:'escalation',text:'At-risk learner alert: Jordan M. missed Week 6 check-in — coach follow-up requested.', channel:'#foundations-cohort-2', channelId:'foundations-cohort-2', time:'Mon', urgent:true },
    { id:'p3', kind:'reminder',  text:'Program review cadence: Q2 cohort completion report due this week.', channel:'#exec-briefs', channelId:'exec-briefs', time:'This week', urgent:false },
  ],
  cohort: [
    { id:'p1', kind:'escalation',text:'At-risk learner alert: Jordan M. — missed Week 6 check-in. Coach notified.', channel:'#foundations-cohort-2', channelId:'foundations-cohort-2', time:'Mon', urgent:true },
    { id:'p2', kind:'ask',       text:'Learner request in channel: "When is the Sprint 4 deadline?"', channel:'#foundations-cohort-2', channelId:'foundations-cohort-2', time:'3h ago', urgent:false },
    { id:'p3', kind:'reminder',  text:'Trail Quest delivery pending: "LinkedIn Profile Sprint 4" — not yet scheduled.', channel:'#foundations-cohort-2', channelId:'foundations-cohort-2', time:'Tomorrow', urgent:false },
  ],
  slack: [
    { id:'p1', kind:'alert',     text:'OAuth not yet connected — Penny delivery blocked. Requires workspace admin.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Ongoing', urgent:true },
    { id:'p2', kind:'alert',     text:'Bot token & signing secret missing — required for webhook validation.', time:'Ongoing', urgent:true },
    { id:'p3', kind:'escalation',text:'3 channels missing governance records — review required.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Overdue', urgent:false },
    { id:'p4', kind:'mention',   text:'1 unmapped user (U10J) — no Trail OS persona assigned.', time:'Ongoing', urgent:false },
  ],
  governance: [
    { id:'p1', kind:'escalation',text:'Q2 Slack governance review overdue — next review Jun 2025.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Overdue', urgent:true },
    { id:'p2', kind:'alert',     text:'#guided-trail-general: missing purpose + governance record.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Ongoing', urgent:false },
    { id:'p3', kind:'reminder',  text:'Lifecycle model review: Channel archival policy for Q3 cohorts not yet set.', time:'This week', urgent:false },
  ],
  calendar: [
    { id:'p1', kind:'reminder',  text:'Sprint 4 kickoff event pending Slack announcement — send via #foundations-cohort-2.', channel:'#foundations-cohort-2', channelId:'foundations-cohort-2', time:'Tomorrow', urgent:false },
    { id:'p2', kind:'ask',       text:'Coach requested: "Can Penny send a calendar reminder before Thursday session?"', channel:'#foundations-coaches', channelId:'foundations-coaches', time:'Today', urgent:false },
  ],
  collaboration: [
    { id:'p1', kind:'alert',     text:'OAuth integration pending — Slack collaboration features limited.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Ongoing', urgent:true },
    { id:'p2', kind:'reminder',  text:'#guided-trail-general needs channel purpose + governance record.', time:'Overdue', urgent:false },
  ],
  people: [
    { id:'p1', kind:'mention',   text:'Coach channel: "New volunteer orientation — who handles Slack onboarding?"', channel:'#foundations-coaches', channelId:'foundations-coaches', time:'Yesterday', urgent:false },
    { id:'p2', kind:'reminder',  text:'1 unmapped user (U10J) — no role or persona assigned. Cannot receive Penny.', time:'Ongoing', urgent:false },
  ],
  'digital-twin': [
    { id:'p1', kind:'ask',       text:'Exec brief: "Digital Twin impact — which programs are affected by the new Standard?" Needs triage.', channel:'#exec-briefs', channelId:'exec-briefs', time:'Today', urgent:false },
    { id:'p2', kind:'reminder',  text:'Knowledge relationship change: notify program leads via #trail-os-ops.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'This week', urgent:false },
  ],
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function HealthDotSlack({ health }: { health: SlackChannel['health'] }) {
  const cls = health === 'healthy' ? 'bg-emerald-500' : health === 'needs-attention' ? 'bg-amber-500' : 'bg-rose-500';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${cls}`} />;
}

function OAuthStatusChip() {
  const ok = SLACK_WORKSPACE.oauthStatus === 'connected';
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border ${
      ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
    }`}>
      {ok ? 'OAuth Connected' : 'OAuth Pending'}
    </span>
  );
}

function ChannelRow({ ch, showProgram }: { ch: SlackChannel; showProgram?: boolean }) {
  return (
    <a
      href={slackChannelUrl(ch.id)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-muted/40 transition-colors group"
    >
      <HealthDotSlack health={ch.health} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors truncate">{ch.name}</span>
          {ch.pennyEnabled && (
            <span className="text-[8px] font-bold bg-secondary/10 text-secondary border border-secondary/20 rounded-full px-1.5 py-0.5 shrink-0">Penny</span>
          )}
        </div>
        {showProgram && ch.relatedProgram && (
          <p className="text-[10px] text-muted-foreground/70 truncate">{ch.relatedProgram}{ch.relatedCohort ? ` · ${ch.relatedCohort}` : ''}</p>
        )}
        <p className="text-[9px] text-muted-foreground/50 mt-0.5">{ch.memberCount} members · {ch.messageFrequency} activity</p>
      </div>
      <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary/60 transition-colors shrink-0 mt-0.5" />
    </a>
  );
}

function ActivityRow({ ev }: { ev: SlackActivityEvent }) {
  const Icon = ev.type === 'penny' ? Zap :
               ev.type === 'governance' ? Shield :
               ev.type === 'channel' ? Hash :
               ev.type === 'user' ? Users : Radio;
  const iconCls = ev.severity === 'success' ? 'text-emerald-500' :
                  ev.severity === 'warning' ? 'text-amber-500' :
                  ev.severity === 'error'   ? 'text-rose-500'   : 'text-muted-foreground/40';
  return (
    <div className="flex items-start gap-2 px-2.5 py-1.5">
      <Icon className={`w-3 h-3 shrink-0 mt-0.5 ${iconCls}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-foreground leading-snug">{ev.summary}</p>
        {ev.channel && (
          <a
            href={slackChannelUrl(ev.channel.replace('#', ''))}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-primary/70 hover:text-primary transition-colors"
          >
            {ev.channel}
          </a>
        )}
      </div>
      <span className="text-[9px] text-muted-foreground/40 shrink-0 mt-0.5 whitespace-nowrap">{ev.timestamp}</span>
    </div>
  );
}

function PendingItemRow({ item }: { item: PendingItem }) {
  const Icon = item.kind === 'mention'   ? MessageSquare :
               item.kind === 'ask'       ? ArrowRight :
               item.kind === 'reminder'  ? Bell :
               item.kind === 'escalation'? AlertTriangle : AlertTriangle;
  const iconCls = item.urgent ? 'text-rose-500' :
                  item.kind === 'escalation' ? 'text-amber-500' :
                  item.kind === 'alert' ? 'text-amber-500' : 'text-muted-foreground/50';
  const bgCls = item.urgent ? 'border-rose-100 bg-rose-50/50' : 'border-border bg-card';

  return (
    <div className={`rounded-lg border px-2.5 py-2 ${bgCls}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-3 h-3 shrink-0 mt-0.5 ${iconCls}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-foreground leading-snug">{item.text}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.channel && (
              <a
                href={item.channelId ? slackChannelUrl(item.channelId) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] text-primary/70 hover:text-primary transition-colors flex items-center gap-0.5"
              >
                {item.channel} <ExternalLink className="w-2.5 h-2.5 inline" />
              </a>
            )}
            {item.time && <span className="text-[9px] text-muted-foreground/40">{item.time}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface SlackContextPanelProps {
  config: SlackPanelConfig;
  onClose: () => void;
}

export function SlackContextPanel({ config, onClose }: SlackContextPanelProps) {
  const [activeTab, setActiveTab] = useState<'channels' | 'pending' | 'activity'>('pending');
  const meta = CONTEXT_META[config.context];
  const pending = CONTEXT_PENDING[config.context] ?? [];
  const urgentCount = pending.filter(p => p.urgent).length;

  const relevantChannels: SlackChannel[] = (() => {
    if (config.channelIds?.length) {
      return SLACK_CHANNELS.filter(c => config.channelIds!.includes(c.id));
    }
    if (config.context === 'slack' || config.context === 'collaboration') {
      return SLACK_CHANNELS.filter(c => c.lifecycle === 'active').slice(0, 8);
    }
    if (config.context === 'program' && config.objectName) {
      const byProgram = SLACK_CHANNELS.filter(c =>
        c.relatedProgram?.toLowerCase().includes(config.objectName!.toLowerCase())
      );
      if (byProgram.length > 0) return byProgram;
    }
    const purposeChannels = meta.purposeFilter
      ? SLACK_CHANNELS.filter(c => meta.purposeFilter!.includes(c.purpose))
      : [];
    const hintChannels = meta.contextualChannelIds
      ? SLACK_CHANNELS.filter(c => meta.contextualChannelIds!.some(id => c.id.includes(id) || c.name.includes(id)))
      : [];
    const combined = [...purposeChannels, ...hintChannels].filter((c, i, a) => a.findIndex(x => x.id === c.id) === i);
    return combined.slice(0, 6);
  })();

  const relevantActivity: SlackActivityEvent[] = (() => {
    if (config.context === 'penny') return SLACK_ACTIVITY.filter(e => e.type === 'penny').slice(0, 5);
    if (config.context === 'governance') return SLACK_ACTIVITY.filter(e => e.type === 'governance').slice(0, 5);
    const channelNames = relevantChannels.map(c => c.name);
    const byChannel = SLACK_ACTIVITY.filter(e => e.channel && channelNames.includes(e.channel));
    return (byChannel.length > 0 ? byChannel : SLACK_ACTIVITY).slice(0, 5);
  })();

  const pennyReadiness = SLACK_HEALTH_SCORES.find(h => h.dimension === 'penny');
  const workspaceReadiness = SLACK_HEALTH_SCORES.find(h => h.dimension === 'workspace');

  const tabs = [
    { id: 'pending' as const,  label: 'Actions',  count: pending.length },
    { id: 'channels' as const, label: 'Channels', count: relevantChannels.length },
    { id: 'activity' as const, label: 'Activity', count: relevantActivity.length },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-3 pt-3 pb-2.5 border-b border-border flex-shrink-0 bg-[#4A154B]/5">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#4A154B]/60">Slack Context</span>
              <span className="text-[9px] font-bold text-[#4A154B] border border-[#4A154B]/20 bg-[#4A154B]/5 rounded-full px-1.5 py-0.5">
                {meta.label}
              </span>
              <OAuthStatusChip />
            </div>
            <h2 className="text-[14px] font-serif font-bold text-foreground leading-tight">{config.title}</h2>
            {config.subtitle && (
              <p className="text-[10px] text-muted-foreground/70 leading-snug mt-0.5">{config.subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Close Slack panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Open workspace button */}
        <a
          href={WORKSPACE_WEB}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg bg-[#4A154B] text-white text-[10px] font-bold hover:bg-[#3D0F3E] transition-colors"
        >
          <Hash className="w-3 h-3" />
          Open Transition Trails Workspace
          <ExternalLink className="w-3 h-3 ml-auto" />
        </a>

        {/* Status strip */}
        {(urgentCount > 0 || SLACK_WORKSPACE.oauthStatus !== 'connected') && (
          <div className="mt-1.5 rounded border border-amber-200 bg-amber-50/60 px-2.5 py-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
            <p className="text-[10px] text-amber-900 leading-snug flex-1">
              {urgentCount > 0 ? `${urgentCount} urgent action${urgentCount > 1 ? 's' : ''} pending` : ''}
              {urgentCount > 0 && SLACK_WORKSPACE.oauthStatus !== 'connected' ? ' · ' : ''}
              {SLACK_WORKSPACE.oauthStatus !== 'connected' ? 'OAuth not yet connected' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0 bg-card">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-[#4A154B] text-[#4A154B]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                activeTab === tab.id ? 'bg-[#4A154B]/10 text-[#4A154B]' : 'bg-muted/60 text-muted-foreground/60'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <ScrollArea className="flex-1">
        <div className="py-2 space-y-0.5">

          {/* Pending / Actions tab */}
          {activeTab === 'pending' && (
            <div className="px-2.5 space-y-2 py-1">
              {pending.length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-2 text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <p className="text-[11px] font-semibold text-muted-foreground">No pending actions</p>
                </div>
              ) : (
                <>
                  {pending.map(item => <PendingItemRow key={item.id} item={item} />)}
                </>
              )}

              {/* Context-specific quick actions */}
              <div className="pt-2 border-t border-border/50">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 px-0.5 mb-1.5">Quick Actions</p>
                <div className="space-y-1">
                  {(config.context === 'penny' || config.context === 'program' || config.context === 'cohort') && (
                    <a
                      href={SLACK_CHANNELS.find(c => c.id === 'foundations-cohort-2')
                        ? slackChannelUrl('foundations-cohort-2') : WORKSPACE_WEB}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/40 transition-colors text-[10px] font-semibold text-foreground"
                    >
                      <Send className="w-3 h-3 text-[#4A154B]" />
                      Send Test Message via Penny
                      <ExternalLink className="w-2.5 h-2.5 ml-auto text-muted-foreground/40" />
                    </a>
                  )}
                  {config.context === 'governance' && (
                    <a
                      href={slackChannelUrl('trail-os-ops')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/40 transition-colors text-[10px] font-semibold text-foreground"
                    >
                      <Shield className="w-3 h-3 text-amber-600" />
                      Post Governance Alert to #trail-os-ops
                      <ExternalLink className="w-2.5 h-2.5 ml-auto text-muted-foreground/40" />
                    </a>
                  )}
                  {config.context === 'calendar' && (
                    <a
                      href={slackChannelUrl('foundations-cohort-2')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/40 transition-colors text-[10px] font-semibold text-foreground"
                    >
                      <Calendar className="w-3 h-3 text-primary" />
                      Send Calendar Reminder to Cohort
                      <ExternalLink className="w-2.5 h-2.5 ml-auto text-muted-foreground/40" />
                    </a>
                  )}
                  <a
                    href={slackChannelUrl('trail-os-ops')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/40 transition-colors text-[10px] font-semibold text-foreground"
                  >
                    <Radio className="w-3 h-3 text-muted-foreground/60" />
                    Open #trail-os-ops in Slack
                    <ExternalLink className="w-2.5 h-2.5 ml-auto text-muted-foreground/40" />
                  </a>
                </div>
              </div>

              {/* Penny / workspace status for Penny context */}
              {config.context === 'penny' && pennyReadiness && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 px-0.5 mb-1.5">Penny Slack Status</p>
                  <div className="rounded-lg border border-border px-2.5 py-2 space-y-1">
                    {pennyReadiness.items.slice(0, 4).map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {item.status === 'pass'    ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> :
                         item.status === 'partial' ? <Clock        className="w-3 h-3 text-amber-500  shrink-0" /> :
                                                     <AlertTriangle className="w-3 h-3 text-rose-500   shrink-0" />}
                        <span className="text-[10px] text-foreground flex-1 truncate">{item.label}</span>
                      </div>
                    ))}
                    <a
                      href="/collaboration/slack"
                      className="text-[9px] text-primary/70 hover:text-primary flex items-center gap-1 mt-0.5"
                    >
                      View full integration status <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Workspace readiness for slack context */}
              {(config.context === 'slack' || config.context === 'collaboration') && workspaceReadiness && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 px-0.5 mb-1.5">Workspace Health</p>
                  <div className="rounded-lg border border-border px-2.5 py-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex-1 bg-muted/40 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${workspaceReadiness.score >= 80 ? 'bg-emerald-500' : workspaceReadiness.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${workspaceReadiness.score}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-foreground">{workspaceReadiness.score}%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 leading-snug">{workspaceReadiness.note}</p>
                    <a
                      href="/collaboration/slack"
                      className="text-[9px] text-primary/70 hover:text-primary flex items-center gap-1 mt-1"
                    >
                      Configure in Slack Integration Center <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Channels tab */}
          {activeTab === 'channels' && (
            <div>
              {relevantChannels.length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-2 text-center px-4">
                  <Hash className="w-6 h-6 text-muted-foreground/30" />
                  <p className="text-[11px] text-muted-foreground">No channels mapped for this context.</p>
                  <a href="/collaboration/slack" className="text-[10px] text-primary hover:underline">Open Slack Integration Center</a>
                </div>
              ) : (
                <div>
                  {relevantChannels.map(ch => (
                    <ChannelRow key={ch.id} ch={ch} showProgram={config.context !== 'program'} />
                  ))}
                </div>
              )}
              <div className="px-2.5 pt-2 pb-1 border-t border-border/50 mt-1">
                <a
                  href={WORKSPACE_WEB}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-[#4A154B] font-semibold hover:opacity-70 transition-opacity"
                >
                  <ExternalLink className="w-3 h-3" />
                  Browse all channels in Slack
                </a>
                <a
                  href="/collaboration/slack"
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 hover:text-foreground transition-colors mt-1"
                >
                  <Settings className="w-3 h-3" />
                  Manage channel mappings
                </a>
              </div>
            </div>
          )}

          {/* Activity tab */}
          {activeTab === 'activity' && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 px-4 py-1.5">Recent Slack Activity</p>
              {relevantActivity.map(ev => <ActivityRow key={ev.id} ev={ev} />)}
              <div className="px-4 pt-2 pb-1 border-t border-border/50 mt-1">
                <a
                  href="/collaboration/slack"
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  <ArrowRight className="w-3 h-3" />
                  View full activity feed
                </a>
              </div>
            </div>
          )}

        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border flex-shrink-0 bg-card">
        <div className="flex items-center gap-2">
          <a
            href="/collaboration/slack"
            className="text-[9px] text-muted-foreground/50 hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Settings className="w-2.5 h-2.5" />
            Slack Integration Center
          </a>
          <span className="text-muted-foreground/20 text-[9px]">·</span>
          <span className="text-[9px] text-muted-foreground/40">
            {SLACK_WORKSPACE.memberCount} members · {SLACK_WORKSPACE.channelCount} channels
          </span>
        </div>
      </div>

    </div>
  );
}
