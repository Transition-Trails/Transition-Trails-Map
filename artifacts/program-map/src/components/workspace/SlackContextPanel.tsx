import { useState } from 'react';
import {
  Hash, ExternalLink, AlertTriangle, CheckCircle2, Clock, X,
  Zap, MessageSquare, Bell, ArrowRight, Radio, Settings,
  Users, Send, Shield, Calendar, ChevronRight,
  Folder, Mail, FileText, Info, Lock,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TERMS } from '@/config/terminology';
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
    label: `${TERMS.aiAssistant} AI`,
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
  home: {
    color: '#145A32',
    label: 'Mission Control',
    purposeFilter: ['admin', 'internal', 'executive'],
    contextualChannelIds: ['trail-os-ops', 'exec-briefs'],
  },
  operations: {
    color: '#145A32',
    label: 'Operations',
    purposeFilter: ['admin', 'internal', 'cohort'],
    contextualChannelIds: ['trail-os-ops', 'foundations-coaches', 'exec-briefs'],
  },
  demand: {
    color: '#145A32',
    label: 'Demand Queue',
    purposeFilter: ['admin', 'internal'],
    contextualChannelIds: ['trail-os-ops'],
  },
  knowledge: {
    color: '#0F7B6C',
    label: 'Knowledge Library',
    purposeFilter: ['internal', 'executive', 'admin'],
    contextualChannelIds: ['trail-os-ops', 'exec-briefs'],
  },
  admin: {
    color: '#6B4F12',
    label: 'Administration',
    purposeFilter: ['admin', 'internal'],
    contextualChannelIds: ['trail-os-ops'],
  },
  navigator: {
    color: '#145A32',
    label: 'Navigator',
    purposeFilter: ['program', 'coach', 'admin'],
    contextualChannelIds: ['foundations-coaches', 'trail-os-ops'],
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
    { id:'p2', kind:'alert',     text:'@penny live — posting to Penny AI + Admin channels confirmed. Next: wire Penny capability output to Slack delivery pipeline.', channel:'#penny-ai', channelId:'penny-ai', time:'Active', urgent:false },
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
    { id:'p1', kind:'alert',     text:'Slack bot live — SLACK_BOT_TOKEN configured, @penny posting to Penny AI + Admin channels confirmed.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Active', urgent:false },
    { id:'p2', kind:'reminder',  text:'Next: add channels:read + groups:read scopes to Slack app to enable channel name resolution in Penny.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Pending', urgent:false },
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
    { id:'p1', kind:'alert',     text:'Slack live — @penny confirmed. Next: wire Penny capability output to Slack delivery for weekly briefs and learner nudges.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Active', urgent:false },
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
  home: [
    { id:'p1', kind:'alert',    text:'3 Slack channels missing governance records — review required.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Overdue', urgent:true },
    { id:'p2', kind:'reminder', text:'Q2 platform report due — exec brief not yet published.', channel:'#exec-briefs', channelId:'exec-briefs', time:'This week', urgent:false },
    { id:'p3', kind:'mention',  text:'Learning Coach flagged low confidence — Cohort 3 recap needs review.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'8m ago', urgent:false },
  ],
  operations: [
    { id:'p1', kind:'alert',    text:'Below-target enrollment: Guided Trail (4/8). Outreach in #foundations-coaches recommended.', channel:'#foundations-coaches', channelId:'foundations-coaches', time:'Ongoing', urgent:true },
    { id:'p2', kind:'escalation',text:'Trail of Mastery Q3 launch — no cohort scheduled. Planning thread in #trail-os-ops needed.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Overdue', urgent:false },
    { id:'p3', kind:'reminder', text:'Foundations Trail at 89% capacity — post in #exec-briefs to open a new cohort.', channel:'#exec-briefs', channelId:'exec-briefs', time:'This week', urgent:false },
  ],
  demand: [
    { id:'p1', kind:'escalation', text:'REQ-030: Penny not responding to RESOLVE questions — 4 days open, no owner. Needs immediate triage.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'4d ago', urgent:true },
    { id:'p2', kind:'alert',      text:'2 change requests unassigned — demand queue at risk of stalling past SLA.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'3h ago', urgent:true },
    { id:'p3', kind:'reminder',   text:'REQ-028: Trail Quest reminder emails — 7 days in backlog. Triage or defer decision needed.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'7d ago', urgent:false },
  ],
  knowledge: [
    { id:'p1', kind:'reminder', text:'Source mapping update needed — RESOLVE Launch phase docs not yet mapped.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Overdue', urgent:true },
    { id:'p2', kind:'ask',      text:'3 source docs in review queue — awaiting confidence confirmation from team.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'This week', urgent:false },
    { id:'p3', kind:'mention',  text:'Digital Twin relationship update — coach notified in #trail-os-ops.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'3h ago', urgent:false },
  ],
  admin: [
    { id:'p1', kind:'alert',    text:'OAuth integration pending — Slack workspace not yet connected. Requires admin action.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Ongoing', urgent:true },
    { id:'p2', kind:'reminder', text:'Q3 role matrix not yet approved — permission review needed before Jul 1.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'This week', urgent:false },
    { id:'p3', kind:'alert',    text:'1 unmapped Slack user (U10J) — no Trail OS persona assigned.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Ongoing', urgent:false },
  ],
  navigator: [
    { id:'p1', kind:'reminder', text:'RESOLVE Launch phase — source mapping docs complete. Verify phase docs pending review.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'Overdue', urgent:false },
    { id:'p2', kind:'ask',      text:'Trail of Mastery status unresolved — Q3 planning thread not yet started.', channel:'#trail-os-ops', channelId:'trail-os-ops', time:'This week', urgent:false },
  ],
};

// ── Google Drive signals per context ─────────────────────────────────────────

interface DriveItem {
  id: string;
  name: string;
  kind: 'folder' | 'doc' | 'sheet' | 'slides';
  status: 'ok' | 'needs-review' | 'missing' | 'updated';
  note?: string;
}

const DRIVE_FOLDER_URL = 'https://drive.google.com/drive/u/0/my-drive';

const CONTEXT_DRIVE: Partial<Record<SlackPanelContext, { folderName: string; items: DriveItem[] }>> = {
  home: {
    folderName: 'Trail OS Shared',
    items: [
      { id:'d1', name:'Platform Roadmap Q3 2025',      kind:'doc',    status:'updated',      note:'Updated 2 days ago' },
      { id:'d2', name:'Q2 Program Summary Report',     kind:'sheet',  status:'needs-review', note:'Review requested by Dr. Simmons' },
      { id:'d3', name:'Operating Procedures Guide',    kind:'doc',    status:'ok' },
      { id:'d4', name:'Transition Trails Brand Deck',  kind:'slides', status:'ok' },
    ],
  },
  operations: {
    folderName: 'Operations Center',
    items: [
      { id:'d1', name:'Ops Runbook v2',                    kind:'doc',   status:'updated',      note:'Updated last week' },
      { id:'d2', name:'Program Health Dashboard Notes',    kind:'sheet', status:'needs-review', note:'Q2 review pending' },
      { id:'d3', name:'Cohort Capacity Tracker',           kind:'sheet', status:'ok' },
      { id:'d4', name:'Q3 Planning Template',              kind:'doc',   status:'missing',      note:'Expected Jun 15' },
    ],
  },
  penny: {
    folderName: 'Penny AI Team',
    items: [
      { id:'d1', name:'Prompt Library Export (Jun)',    kind:'sheet', status:'updated' },
      { id:'d2', name:'Capability Specs v1.3',          kind:'doc',   status:'needs-review', note:'Review before deploy' },
      { id:'d3', name:'QA Test Results — Sprint 4',     kind:'sheet', status:'ok' },
      { id:'d4', name:'Penny Integration Architecture', kind:'doc',   status:'ok' },
    ],
  },
  program: {
    folderName: 'Program Library',
    items: [
      { id:'d1', name:'Foundations Trail Curriculum',        kind:'folder', status:'ok' },
      { id:'d2', name:"Explorer's Trail Learner Handbook",   kind:'doc',    status:'needs-review', note:'Sprint 4 update needed' },
      { id:'d3', name:'Program Templates Library',           kind:'folder', status:'ok' },
      { id:'d4', name:'Cohort 2 Completion Records',         kind:'sheet',  status:'missing',      note:'Due at cohort close' },
    ],
  },
  knowledge: {
    folderName: 'Knowledge Library',
    items: [
      { id:'d1', name:'Source Documents Master',          kind:'folder', status:'ok' },
      { id:'d2', name:'RESOLVE Course Canvas — Phase 5',  kind:'doc',   status:'updated',      note:'Source mapping updated 3h ago' },
      { id:'d3', name:'Knowledge Review Queue',           kind:'sheet', status:'needs-review', note:'3 docs need review' },
      { id:'d4', name:'Digital Twin Relationship Map',    kind:'slides',status:'ok' },
    ],
  },
  governance: {
    folderName: 'Governance & Compliance',
    items: [
      { id:'d1', name:'Governance Policies v2',   kind:'doc',   status:'ok' },
      { id:'d2', name:'Q2 Audit Log',             kind:'sheet', status:'needs-review', note:'Review overdue' },
      { id:'d3', name:'Channel Registry Export',  kind:'sheet', status:'updated' },
      { id:'d4', name:'Q3 Policy Templates',      kind:'doc',   status:'missing',      note:'Expected Jun 20' },
    ],
  },
  'digital-twin': {
    folderName: 'Digital Twin Assets',
    items: [
      { id:'d1', name:'Knowledge Graph Export',         kind:'slides', status:'updated' },
      { id:'d2', name:'Digital Twin Architecture Spec', kind:'doc',   status:'needs-review', note:'Q3 update needed' },
      { id:'d3', name:'Source Mapping Registry',        kind:'sheet', status:'ok' },
    ],
  },
  admin: {
    folderName: 'Administration',
    items: [
      { id:'d1', name:'Admin Configuration Guide', kind:'doc',   status:'ok' },
      { id:'d2', name:'Permission Matrix',         kind:'sheet', status:'needs-review', note:'Review before Q3' },
      { id:'d3', name:'Platform Config Tracker',   kind:'sheet', status:'updated' },
    ],
  },
  navigator: {
    folderName: 'Navigator Resources',
    items: [
      { id:'d1', name:'Program Map Reference',           kind:'doc',   status:'ok' },
      { id:'d2', name:'RESOLVE Framework Guide',         kind:'doc',   status:'needs-review', note:'Cohort 3 update pending' },
      { id:'d3', name:'Roles & Responsibilities Matrix', kind:'sheet', status:'ok' },
    ],
  },
  slack: {
    folderName: 'Collaboration Assets',
    items: [
      { id:'d1', name:'Channel Governance Policy',   kind:'doc',   status:'ok' },
      { id:'d2', name:'Slack Setup Runbook',         kind:'doc',   status:'updated' },
      { id:'d3', name:'Channel Registry (Master)',   kind:'sheet', status:'needs-review', note:'Q3 audit overdue' },
    ],
  },
  collaboration: {
    folderName: 'Collaboration Assets',
    items: [
      { id:'d1', name:'Channel Governance Policy',   kind:'doc',   status:'ok' },
      { id:'d2', name:'Integration Setup Guide',     kind:'doc',   status:'updated' },
      { id:'d3', name:'Channel Registry (Master)',   kind:'sheet', status:'needs-review', note:'Q3 audit overdue' },
    ],
  },
};

// ── Phase 2 signal data ────────────────────────────────────────────────────────

interface Phase2Signal { text: string; urgency: 'high' | 'medium' | 'low'; }

const EMAIL_SIGNALS: Phase2Signal[] = [
  { text: 'Unanswered coach email — Jordan M. (3 days old)',      urgency: 'high' },
  { text: "Draft follow-up ready: Explorer's Trail learner check-in", urgency: 'medium' },
  { text: 'Escalation response needed: Cohort 2 capacity concern', urgency: 'high' },
  { text: 'Sprint 4 schedule confirmation pending from facilitator', urgency: 'low' },
  { text: 'New intake inquiry — no response yet (2 days)',         urgency: 'medium' },
];

const CALENDAR_SIGNALS: Phase2Signal[] = [
  { text: 'Trail Talk: Program Strategy — Thu 2pm · 2 invites no response', urgency: 'medium' },
  { text: 'Cohort 2 Sprint 4 Kickoff — Thu 10am · prep materials missing',  urgency: 'high' },
  { text: 'Weekly team sync — Mon · no agenda prepared yet',                urgency: 'low' },
  { text: 'Learner onboarding — Fri · handbooks not yet uploaded',          urgency: 'medium' },
  { text: 'Executive review — needs prep brief from Knowledge Library',     urgency: 'low' },
];

// ── Drive + Phase 2 sub-components ───────────────────────────────────────────

function DriveItemRow({ item }: { item: DriveItem }) {
  const kindColor = item.kind === 'folder' ? 'text-[#CC8400]' :
                    item.kind === 'sheet'  ? 'text-[#2F6B3F]' :
                    item.kind === 'slides' ? 'text-[#CC8400]' : 'text-[#2F6F7E]';
  const statusBadge =
    item.status === 'needs-review' ? <span className="text-[14px] font-bold bg-[#FFF3E0] border border-[#FFD08A] text-[#CC8400] rounded px-1 py-0.5">Review</span> :
    item.status === 'missing'      ? <span className="text-[14px] font-bold bg-[#FBEAE6] border border-[#E8B9B4] text-[#A93F2F] rounded px-1 py-0.5">Missing</span> :
    item.status === 'updated'      ? <span className="text-[14px] font-bold bg-[#EDF5F8] border border-[#7FAFC6] text-[#2F6F7E] rounded px-1 py-0.5">Updated</span> :
    null;

  return (
    <a
      href={DRIVE_FOLDER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 px-2.5 py-2 mx-2 mb-1 rounded-lg border border-transparent hover:border-border/50 hover:bg-muted/20 transition-colors group"
    >
      <FileText className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${kindColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[14px] font-semibold text-foreground group-hover:text-primary truncate transition-colors">{item.name}</span>
          {statusBadge}
        </div>
        {item.note && <p className="text-[14px] text-muted-foreground/60 mt-0.5">{item.note}</p>}
      </div>
      <ExternalLink className="w-3 h-3 text-muted-foreground/20 group-hover:text-primary/50 shrink-0 mt-0.5 transition-colors" />
    </a>
  );
}

function DriveSection({ context }: { context: SlackPanelContext }) {
  const data = CONTEXT_DRIVE[context];
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-border/40 bg-muted/20 flex items-start gap-1.5 flex-shrink-0">
        <Info className="w-3 h-3 text-muted-foreground/40 shrink-0 mt-0.5" />
        <p className="text-[14px] text-muted-foreground/60 leading-snug">
          No live Drive connection yet. Links open your Google Drive — items are contextual placeholders.
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-2">
          {data ? (
            <>
              <a
                href={DRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 mx-2 mb-2 rounded-lg bg-[#FFF3E0]/70 border border-[#FFD08A]/60 hover:bg-[#FFF3E0] transition-colors"
              >
                <Folder className="w-3.5 h-3.5 text-[#CC8400] shrink-0" />
                <span className="text-[14px] font-bold text-[#CC8400] flex-1 truncate">{data.folderName}</span>
                <ExternalLink className="w-3 h-3 text-[#CC8400]/60 shrink-0" />
              </a>
              {data.items.map(item => <DriveItemRow key={item.id} item={item} />)}
              <div className="px-3 pt-3 pb-1 border-t border-border/30 mt-2 space-y-1.5">
                <p className="text-[14px] text-muted-foreground/50 leading-snug">
                  Connect Google Drive in Phase 2 for real-time doc signals, review queue sync, and change detection.
                </p>
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[14px] text-primary/70 hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Open Google Drive
                </a>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-8 gap-2 text-center px-4">
              <Folder className="w-6 h-6 text-muted-foreground/30" />
              <p className="text-[14px] text-muted-foreground">No Drive data mapped for this context.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function Phase2Section({ tool }: { tool: 'email' | 'calendar' }) {
  const isEmail = tool === 'email';
  const signals  = isEmail ? EMAIL_SIGNALS : CALENDAR_SIGNALS;
  const Icon     = isEmail ? Mail : Calendar;
  const accentCls  = isEmail ? 'text-[#2F6F7E]'  : 'text-primary';
  const headerBg   = isEmail ? 'bg-[#EDF5F8]/60 border-[#7FAFC6]/60' : 'bg-primary/[0.04] border-primary/15';
  const headerText = isEmail ? 'text-[#2F6F7E]'  : 'text-primary/80';
  const phaseLabel = isEmail ? 'Email Signals' : 'Calendar Signals';
  const phaseDesc  = isEmail
    ? 'Unanswered messages, draft follow-ups, and escalation emails — surfaced from Gmail.'
    : 'Upcoming meetings, no-response invites, prep reminders, and Trail Talk scheduling — from Google Calendar.';
  const openUrl   = isEmail ? 'https://mail.google.com' : 'https://calendar.google.com';
  const openLabel = isEmail ? 'Open Gmail' : 'Open Google Calendar';

  const planned = isEmail
    ? ['Unanswered email detection (3-day threshold)','Draft follow-up generator for at-risk learners','Escalation email triage and routing','Weekly brief email confirmation workflow','Coach → learner thread tracking']
    : ['No-response invite detection and reminders','Meeting prep brief auto-generation','Trail Talk scheduling and prep reminders','Cohort session calendar sync with Slack','Google Meet link integration for 1:1s'];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <div className={`rounded-lg border px-3 py-2.5 ${headerBg}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${accentCls}`} />
              <span className={`text-[14px] font-bold ${headerText}`}>{phaseLabel}</span>
              <span className="ml-auto text-[14px] font-bold bg-muted border border-border rounded-full px-2 py-0.5 text-muted-foreground">Phase 2</span>
            </div>
            <p className={`text-[14px] leading-snug ${headerText} opacity-80`}>{phaseDesc}</p>
          </div>

          <div>
            <p className="text-[14px] font-bold  text-muted-foreground/50 mb-1.5 px-0.5">
              Preview — signals that will surface here
            </p>
            <div className="space-y-1">
              {signals.map((sig, i) => (
                <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-muted/20 border border-border/30 opacity-60">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                    sig.urgency === 'high' ? 'bg-[#A93F2F]' : sig.urgency === 'medium' ? 'bg-[#CC8400]' : 'bg-muted-foreground/30'
                  }`} />
                  <p className="text-[14px] text-foreground leading-snug">{sig.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/40 bg-white px-3 py-2.5">
            <p className="text-[14px] font-bold  text-muted-foreground/50 mb-2">Planned capabilities</p>
            <ul className="space-y-1.5">
              {planned.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[14px] text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-muted-foreground/30 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[14px] font-semibold transition-colors ${
              isEmail ? 'border-[#7FAFC6]/60 bg-[#EDF5F8]/40 text-[#2F6F7E] hover:bg-[#EDF5F8]' : 'border-primary/20 bg-primary/[0.03] text-primary/80 hover:bg-primary/[0.06]'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {openLabel}
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>

          <div className="rounded border border-border/40 bg-muted/20 px-2.5 py-2 flex items-start gap-1.5">
            <Lock className="w-3 h-3 text-muted-foreground/30 shrink-0 mt-0.5" />
            <p className="text-[14px] text-muted-foreground/60 leading-snug">
              <strong>Phase 2 — Google Auth</strong>: Sign-In with Google will connect Drive, Gmail, and Calendar without separate credentials.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function HealthDotSlack({ health }: { health: SlackChannel['health'] }) {
  const cls = health === 'healthy' ? 'bg-[#E6F0EA]0' : health === 'needs-attention' ? 'bg-[#FFF3E0]0' : 'bg-[#FBEAE6]0';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${cls}`} />;
}

function OAuthStatusChip() {
  const ok = SLACK_WORKSPACE.oauthStatus === 'connected';
  return (
    <span className={`text-[14px] font-bold  rounded-full px-2 py-0.5 border ${
      ok ? 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]' : 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]'
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
      className="flex items-start gap-2 px-2.5 py-2 mx-2 mb-1 rounded-lg border border-transparent hover:border-[#4A154B]/15 hover:bg-[#4A154B]/[0.04] bg-white/60 transition-colors group"
    >
      <HealthDotSlack health={ch.health} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[14px] font-bold text-foreground group-hover:text-primary transition-colors truncate">{ch.name}</span>
          {ch.pennyEnabled && (
            <span className="text-[14px] font-bold bg-secondary/10 text-secondary border border-secondary/20 rounded-full px-1.5 py-0.5 shrink-0">{TERMS.aiAssistant}</span>
          )}
        </div>
        {showProgram && ch.relatedProgram && (
          <p className="text-[14px] text-muted-foreground/70 truncate">{ch.relatedProgram}{ch.relatedCohort ? ` · ${ch.relatedCohort}` : ''}</p>
        )}
        <p className="text-[14px] text-muted-foreground/50 mt-0.5">{ch.memberCount} members · {ch.messageFrequency} activity</p>
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
  const iconCls = ev.severity === 'success' ? 'text-[#2F6B3F]' :
                  ev.severity === 'warning' ? 'text-[#CC8400]' :
                  ev.severity === 'error'   ? 'text-[#A93F2F]'   : 'text-muted-foreground/40';
  return (
    <div className="flex items-start gap-2 px-2.5 py-1.5 border-b border-border/30 last:border-0">
      <Icon className={`w-3 h-3 shrink-0 mt-0.5 ${iconCls}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-foreground leading-snug">{ev.summary}</p>
        {ev.channel && (
          <a
            href={slackChannelUrl(ev.channel.replace('#', ''))}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] text-primary/70 hover:text-primary transition-colors"
          >
            {ev.channel}
          </a>
        )}
      </div>
      <span className="text-[14px] text-muted-foreground/40 shrink-0 mt-0.5 whitespace-nowrap">{ev.timestamp}</span>
    </div>
  );
}

function PendingItemRow({ item }: { item: PendingItem }) {
  const Icon = item.kind === 'mention'   ? MessageSquare :
               item.kind === 'ask'       ? ArrowRight :
               item.kind === 'reminder'  ? Bell :
               item.kind === 'escalation'? AlertTriangle : AlertTriangle;
  const iconCls = item.urgent ? 'text-[#A93F2F]' :
                  item.kind === 'escalation' ? 'text-[#CC8400]' :
                  item.kind === 'alert' ? 'text-[#CC8400]' : 'text-muted-foreground/50';
  const bgCls = item.urgent
    ? 'border-[#E8B9B4] bg-[#FBEAE6] shadow-sm'
    : 'border-border/50 bg-white shadow-sm';

  return (
    <div className={`rounded-lg border px-2.5 py-2 ${bgCls}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-3 h-3 shrink-0 mt-0.5 ${iconCls}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] text-foreground leading-snug">{item.text}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.channel && (
              <a
                href={item.channelId ? slackChannelUrl(item.channelId) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] text-primary/70 hover:text-primary transition-colors flex items-center gap-0.5"
              >
                {item.channel} <ExternalLink className="w-2.5 h-2.5 inline" />
              </a>
            )}
            {item.time && <span className="text-[14px] text-muted-foreground/40">{item.time}</span>}
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
  const [activeTab, setActiveTab]   = useState<'channels' | 'pending' | 'activity'>('pending');
  const [activeTool, setActiveTool] = useState<'slack' | 'drive' | 'email' | 'calendar'>('slack');
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

  type WorkspaceTool = 'slack' | 'drive' | 'email' | 'calendar';
  interface ToolDef { id: WorkspaceTool; label: string; Icon: React.ElementType; badge: number; urgent: boolean; phase2: boolean; }
  const workspaceTools: ToolDef[] = [
    { id: 'slack',    label: 'Slack',    Icon: Hash,     badge: urgentCount > 0 ? urgentCount : pending.length, urgent: urgentCount > 0, phase2: false },
    { id: 'drive',    label: 'Drive',    Icon: Folder,   badge: CONTEXT_DRIVE[config.context]?.items.length ?? 0, urgent: false, phase2: false },
    { id: 'email',    label: 'Email',    Icon: Mail,     badge: 0, urgent: false, phase2: true },
    { id: 'calendar', label: 'Calendar', Icon: Calendar, badge: 0, urgent: false, phase2: true },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-3 pt-3 pb-2.5 border-b border-[#4A154B]/20 flex-shrink-0 bg-[#4A154B]/[0.07]">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="text-[14px] font-bold  text-[#4A154B]/60">{TERMS.trailSignals}</span>
              <span className="text-[14px] font-bold text-[#4A154B] border border-[#4A154B]/20 bg-[#4A154B]/5 rounded-full px-1.5 py-0.5">
                {meta.label}
              </span>
              <OAuthStatusChip />
            </div>
            <h2 className="text-[14px] font-bold text-foreground leading-tight">{config.title}</h2>
            {config.subtitle && (
              <p className="text-[14px] text-muted-foreground/70 leading-snug mt-0.5">{config.subtitle}</p>
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
          className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg bg-[#4A154B] text-white text-[14px] font-bold hover:bg-[#3D0F3E] transition-colors"
        >
          <Hash className="w-3 h-3" />
          Open Transition Trails Workspace
          <ExternalLink className="w-3 h-3 ml-auto" />
        </a>

        {/* Status strip */}
        {(urgentCount > 0 || SLACK_WORKSPACE.oauthStatus !== 'connected') && (
          <div className={`mt-1.5 rounded-lg border px-2.5 py-1.5 flex items-center gap-1.5 ${
            urgentCount > 0 ? 'border-[#E8B9B4] bg-[#FBEAE6]' : 'border-[#FFD08A] bg-[#FFF3E0]/70'
          }`}>
            <AlertTriangle className="w-3 h-3 text-[#CC8400] shrink-0" />
            <p className="text-[14px] text-[#CC8400] leading-snug flex-1">
              {urgentCount > 0 ? `${urgentCount} urgent action${urgentCount > 1 ? 's' : ''} pending` : ''}
              {urgentCount > 0 && SLACK_WORKSPACE.oauthStatus !== 'connected' ? ' · ' : ''}
              {SLACK_WORKSPACE.oauthStatus !== 'connected' ? 'OAuth not yet connected' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Workspace tool switcher */}
      <div className="flex border-b border-border/40 flex-shrink-0 bg-white pt-1 px-1 gap-0.5">
        {workspaceTools.map(tool => {
          const ToolIcon = tool.Icon;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 text-[14px] font-bold  transition-colors border-b-2 rounded-t ${
                activeTool === tool.id
                  ? 'border-[#4A154B] text-[#4A154B]'
                  : 'border-transparent text-muted-foreground/50 hover:text-foreground/70'
              }`}
            >
              <div className="flex items-center gap-0.5">
                <ToolIcon className="w-3 h-3" />
                {tool.badge > 0 && !tool.phase2 && (
                  <span className={`text-[14px] font-bold text-white rounded-full min-w-[13px] text-center leading-[13px] px-0.5 ${tool.urgent ? 'bg-[#FBEAE6]0' : 'bg-muted-foreground/40'}`}>
                    {tool.badge}
                  </span>
                )}
                {tool.phase2 && (
                  <span className="text-[14px] font-bold bg-muted text-muted-foreground/50 rounded px-0.5">P2</span>
                )}
              </div>
              {tool.label}
            </button>
          );
        })}
      </div>

      {activeTool === 'slack' && (
      <>
      {/* Tabs */}
      <div className="flex border-b border-[#4A154B]/10 flex-shrink-0 bg-white">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-[14px] font-semibold transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-[#4A154B] text-[#4A154B]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[14px] font-bold ${
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
                  <CheckCircle2 className="w-6 h-6 text-[#2F6B3F]" />
                  <p className="text-[14px] font-semibold text-muted-foreground">No pending actions</p>
                </div>
              ) : (
                <>
                  {pending.map(item => <PendingItemRow key={item.id} item={item} />)}
                </>
              )}

              {/* Context-specific quick actions */}
              <div className="pt-2 border-t border-border/40">
                <p className="text-[14px] font-bold  text-[#4A154B]/60 px-0.5 mb-1.5">Quick Actions</p>
                <div className="space-y-1">
                  {(config.context === 'penny' || config.context === 'program' || config.context === 'cohort') && (
                    <a
                      href={SLACK_CHANNELS.find(c => c.id === 'foundations-cohort-2')
                        ? slackChannelUrl('foundations-cohort-2') : WORKSPACE_WEB}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#4A154B]/20 bg-white shadow-sm hover:bg-[#4A154B]/[0.05] transition-colors text-[14px] font-semibold text-foreground"
                    >
                      <Send className="w-3 h-3 text-[#4A154B]" />
                      Send Test Message via {TERMS.aiAssistant}
                      <ExternalLink className="w-2.5 h-2.5 ml-auto text-muted-foreground/40" />
                    </a>
                  )}
                  {config.context === 'governance' && (
                    <a
                      href={slackChannelUrl('trail-os-ops')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#FFD08A]/60 bg-white shadow-sm hover:bg-[#FFF3E0]/50 transition-colors text-[14px] font-semibold text-foreground"
                    >
                      <Shield className="w-3 h-3 text-[#CC8400]" />
                      Post Governance Alert to #trail-os-ops
                      <ExternalLink className="w-2.5 h-2.5 ml-auto text-muted-foreground/40" />
                    </a>
                  )}
                  {config.context === 'calendar' && (
                    <a
                      href={slackChannelUrl('foundations-cohort-2')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-primary/20 bg-white shadow-sm hover:bg-primary/[0.04] transition-colors text-[14px] font-semibold text-foreground"
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
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/50 bg-white shadow-sm hover:bg-muted/30 transition-colors text-[14px] font-semibold text-foreground"
                  >
                    <Radio className="w-3 h-3 text-muted-foreground/60" />
                    Open #trail-os-ops in Slack
                    <ExternalLink className="w-2.5 h-2.5 ml-auto text-muted-foreground/40" />
                  </a>
                </div>
              </div>

              {/* Penny / workspace status for Penny context */}
              {config.context === 'penny' && pennyReadiness && (
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[14px] font-bold  text-[#4A154B]/60 px-0.5 mb-1.5">{TERMS.aiAssistant} Slack Status</p>
                  <div className="rounded-lg border border-[#4A154B]/15 bg-white shadow-sm px-2.5 py-2 space-y-1">
                    {pennyReadiness.items.slice(0, 4).map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {item.status === 'pass'    ? <CheckCircle2 className="w-3 h-3 text-[#2F6B3F] shrink-0" /> :
                         item.status === 'partial' ? <Clock        className="w-3 h-3 text-[#CC8400]  shrink-0" /> :
                                                     <AlertTriangle className="w-3 h-3 text-[#A93F2F]   shrink-0" />}
                        <span className="text-[14px] text-foreground flex-1 truncate">{item.label}</span>
                      </div>
                    ))}
                    <a
                      href="/collaboration/slack"
                      className="text-[14px] text-primary/70 hover:text-primary flex items-center gap-1 mt-0.5"
                    >
                      View full integration status <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Workspace readiness for slack context */}
              {(config.context === 'slack' || config.context === 'collaboration') && workspaceReadiness && (
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[14px] font-bold  text-muted-foreground/50 px-0.5 mb-1.5">Workspace Health</p>
                  <div className="rounded-lg border border-border/50 bg-white shadow-sm px-2.5 py-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex-1 bg-muted/40 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${workspaceReadiness.score >= 80 ? 'bg-[#E6F0EA]0' : workspaceReadiness.score >= 50 ? 'bg-[#FFF3E0]0' : 'bg-[#FBEAE6]0'}`}
                          style={{ width: `${workspaceReadiness.score}%` }}
                        />
                      </div>
                      <span className="text-[14px] font-bold text-foreground">{workspaceReadiness.score}%</span>
                    </div>
                    <p className="text-[14px] text-muted-foreground/70 leading-snug">{workspaceReadiness.note}</p>
                    <a
                      href="/collaboration/slack"
                      className="text-[14px] text-primary/70 hover:text-primary flex items-center gap-1 mt-1"
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
                  <p className="text-[14px] text-muted-foreground">No channels mapped for this context.</p>
                  <a href="/collaboration/slack" className="text-[14px] text-primary hover:underline">Open Slack Integration Center</a>
                </div>
              ) : (
                <div className="pt-1">
                  {relevantChannels.map(ch => (
                    <ChannelRow key={ch.id} ch={ch} showProgram={config.context !== 'program'} />
                  ))}
                </div>
              )}
              <div className="px-2.5 pt-2 pb-1 border-t border-[#4A154B]/10 mt-1">
                <a
                  href={WORKSPACE_WEB}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[14px] text-[#4A154B] font-semibold hover:opacity-70 transition-opacity"
                >
                  <ExternalLink className="w-3 h-3" />
                  Browse all channels in Slack
                </a>
                <a
                  href="/collaboration/slack"
                  className="flex items-center gap-1.5 text-[14px] text-muted-foreground/70 hover:text-foreground transition-colors mt-1"
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
              <p className="text-[14px] font-bold  text-muted-foreground/50 px-4 py-1.5">Recent Slack Activity</p>
              {relevantActivity.map(ev => <ActivityRow key={ev.id} ev={ev} />)}
              <div className="px-4 pt-2 pb-1 border-t border-[#4A154B]/10 mt-1">
                <a
                  href="/collaboration/slack"
                  className="flex items-center gap-1.5 text-[14px] text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  <ArrowRight className="w-3 h-3" />
                  View full activity feed
                </a>
              </div>
            </div>
          )}

        </div>
      </ScrollArea>

      </>
      )}

      {activeTool === 'drive' && <DriveSection context={config.context} />}
      {activeTool === 'email' && <Phase2Section tool="email" />}
      {activeTool === 'calendar' && <Phase2Section tool="calendar" />}

      {/* Footer */}
      <div className="px-3 pt-2 pb-2.5 border-t border-[#4A154B]/15 flex-shrink-0 bg-white space-y-1.5">
        {/* Phase 1 system-driven notice */}
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-bold  text-[#4A154B]/40 bg-[#4A154B]/5 border border-[#4A154B]/10 px-1.5 py-0.5 rounded-full">
            Phase 1
          </span>
          <span className="text-[14px] text-muted-foreground/50">
            Signals are system-driven — assigned by tier, role &amp; page context.
          </span>
          <a
            href="/admin/phase1-readiness"
            className="text-[14px] text-[#4A154B]/50 hover:text-[#4A154B] transition-colors ml-auto flex-shrink-0 underline underline-offset-2"
          >
            Phase 2 roadmap →
          </a>
        </div>
        {/* Integration links */}
        <div className="flex items-center gap-2">
          <a
            href="/collaboration/slack"
            className="text-[14px] text-muted-foreground/50 hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Settings className="w-2.5 h-2.5" />
            Slack Integration Center
          </a>
          <span className="text-muted-foreground/20 text-[14px]">·</span>
          <span className="text-[14px] text-muted-foreground/40">
            {SLACK_WORKSPACE.memberCount} members · {SLACK_WORKSPACE.channelCount} channels
          </span>
        </div>
      </div>

    </div>
  );
}
