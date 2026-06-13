import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  Send, Sparkles, ArrowRight, ChevronDown,
  CheckCircle2, AlertTriangle, Lightbulb,
  Hash, Folder, Calendar, Mail, Database, ExternalLink,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTierFlags } from '@/hooks/useTierFlags';
import { useAppContext } from '@/context/AppContext';
import { SIGNAL_COUNTS, locationToContext } from '@/data/signalCounts';

// ── Page context ──────────────────────────────────────────────────────────────

type PageCtx =
  | 'home' | 'programs' | 'penny' | 'operations' | 'demand'
  | 'knowledge' | 'collaboration' | 'admin' | 'digital-twin' | 'default';

function deriveCtx(loc: string): PageCtx {
  if (loc === '/' || loc === '') return 'home';
  if (loc.startsWith('/program'))                return 'programs';
  if (loc.startsWith('/penny'))                  return 'penny';
  if (loc.startsWith('/operations/demand'))      return 'demand';
  if (loc.startsWith('/operations'))             return 'operations';
  if (loc.startsWith('/knowledge'))              return 'knowledge';
  if (loc.startsWith('/collaboration'))          return 'collaboration';
  if (loc.startsWith('/admin'))                  return 'admin';
  if (loc.startsWith('/digital-twin') || loc.startsWith('/uom') || loc.startsWith('/governance'))
    return 'digital-twin';
  return 'default';
}

// ── Source config ─────────────────────────────────────────────────────────────

const SOURCE_ICO = {
  slack:      { Icon: Hash,     cls: 'text-[#4A154B]',    bg: 'bg-[#4A154B]/8',  label: 'Slack' },
  drive:      { Icon: Folder,   cls: 'text-blue-600',     bg: 'bg-blue-50',       label: 'Google Drive' },
  calendar:   { Icon: Calendar, cls: 'text-emerald-600',  bg: 'bg-emerald-50',    label: 'Google Calendar' },
  email:      { Icon: Mail,     cls: 'text-amber-600',    bg: 'bg-amber-50',      label: 'Gmail' },
  salesforce: { Icon: Database, cls: 'text-sky-600',      bg: 'bg-sky-50',        label: 'Salesforce' },
} as const;
type SigSource = keyof typeof SOURCE_ICO;

const SOURCE_CONNECT: Record<SigSource, { status: string; cls: string; dotCls: string; link?: string }> = {
  slack:      { status: 'Live',            cls: 'text-emerald-600',      dotCls: 'bg-emerald-500',         link: 'https://transitiontrails.slack.com' },
  drive:      { status: 'Connected',       cls: 'text-emerald-600',      dotCls: 'bg-emerald-500',         link: 'https://drive.google.com' },
  calendar:   { status: 'Connected',       cls: 'text-emerald-600',      dotCls: 'bg-emerald-500',         link: 'https://calendar.google.com' },
  email:      { status: 'Phase 2',         cls: 'text-muted-foreground', dotCls: 'bg-muted-foreground/30' },
  salesforce: { status: 'Live',            cls: 'text-emerald-600',      dotCls: 'bg-emerald-500' },
};

type SigItem = {
  urgent: boolean;
  source: SigSource;
  text: string;
  meta: string;
  why: string;
};

const SIGNAL_ITEMS: Record<PageCtx, SigItem[]> = {
  home: [
    { urgent: true,  source: 'slack',      text: 'Learning Coach: low confidence on Cohort 3 recap scoring',     meta: '8m ago',  why: 'Penny monitors coach confidence scores to flag when outputs may need human review before affecting learner feedback' },
    { urgent: true,  source: 'salesforce', text: 'Trail of Mastery source docs overdue — execute phase blocked', meta: '1h ago',  why: 'This Salesforce phase record requires documentation before Penny can generate content or update program status' },
    { urgent: false, source: 'slack',      text: 'Foundations Trail Cohort 2: enrollment at 89% capacity',       meta: '2h ago',  why: 'Penny watches enrollment channels to flag when a new cohort may need to open soon' },
    { urgent: false, source: 'drive',      text: 'Sprint 3 Resume Writing materials updated',                    meta: '3h ago',  why: 'Penny reads Drive so learners always see the most current version of program materials' },
    { urgent: false, source: 'calendar',   text: 'Sprint 3 session confirmed — Thursday 10am',                   meta: '5h ago',  why: 'Penny reads Calendar to surface upcoming milestones and session timing relevant to your programs' },
    { urgent: false, source: 'email',      text: 'Weekly brief generated — 3 cohort updates',                    meta: '6h ago',  why: 'Penny monitors email digests to track program communication patterns (Phase 2 — read-only access)' },
    { urgent: false, source: 'salesforce', text: "Explorer's Trail Cohort 3 — 3 enrollment slots open",          meta: '8h ago',  why: 'Penny tracks Salesforce enrollment records to surface open capacity for outreach or cohort planning' },
  ],
  programs: [
    { urgent: true,  source: 'salesforce', text: 'Trail of Mastery: source documentation needed before execute phase can proceed', meta: '1h ago',  why: 'Salesforce execution phases require documentation records — Penny flags these as blockers to program delivery' },
    { urgent: false, source: 'slack',      text: "Explorer's Trail Cohort 3 — enrollment at 80%",                meta: '2h ago',  why: 'Penny watches cohort enrollment channels to surface capacity trends across active programs' },
    { urgent: false, source: 'drive',      text: 'Content standards: 4 items pending review',                    meta: '4h ago',  why: 'Penny reads Drive metadata to surface content quality review backlogs before they affect delivery' },
    { urgent: false, source: 'calendar',   text: 'Sprint 3 review scheduled — Thursday',                         meta: '5h ago',  why: 'Penny reads Calendar to surface program milestone timing and flag missing reviews' },
  ],
  penny: [
    { urgent: true,  source: 'slack',      text: 'Learning Coach: confidence flag on Cohort 3 recap',            meta: '8m ago',  why: "Penny self-monitors its own Learning Coach output to flag when its recommendations may need human verification" },
    { urgent: false, source: 'salesforce', text: 'Gemini API live — 21 models available including Gemini 2.5 Flash. Ready to wire first capability call.', meta: '1h ago',  why: 'Penny monitors API integration status so the team knows when live AI responses are unblocked end-to-end' },
    { urgent: false, source: 'slack',      text: 'Test Penny: 12 prototype queries this week',                   meta: '3h ago',  why: 'Penny monitors its own usage in test channels to measure adoption and identify capability gaps' },
    { urgent: false, source: 'drive',      text: 'Trail Quest capability spec updated',                          meta: '5h ago',  why: 'Penny watches Drive for spec updates to its own capability definitions so guidance stays current' },
    { urgent: false, source: 'salesforce', text: 'Penny interaction log: 234 this week',                         meta: '8h ago',  why: 'Penny reads its interaction log from Salesforce to surface usage patterns for system improvement' },
  ],
  operations: [
    { urgent: true,  source: 'salesforce', text: 'Trail of Mastery execute phase: source docs required',         meta: '1h ago',  why: 'Penny flags Salesforce phase blockers that prevent program delivery from moving forward' },
    { urgent: false, source: 'slack',      text: '2 demand change requests unassigned in queue',                 meta: '3h ago',  why: 'Penny monitors demand channels to flag unassigned work that may accumulate into delivery delays' },
    { urgent: false, source: 'salesforce', text: 'Salesforce live — wire first data query to health dashboard',   meta: '4h ago',  why: 'Penny monitors integration status so the team knows when live data can replace prototype figures in the health dashboard' },
    { urgent: false, source: 'drive',      text: 'Integration readiness: 5 checklist items open',                meta: '6h ago',  why: 'Penny reads Drive checklists to surface open operational items affecting integration timelines' },
    { urgent: false, source: 'salesforce', text: 'Foundations Trail capacity alert: 89%',                        meta: '8h ago',  why: 'Penny monitors Salesforce cohort records to flag when enrollment is approaching its limit' },
  ],
  demand: [
    { urgent: true,  source: 'slack',      text: 'REQ-030: Penny not responding to RESOLVE — 4 days open, no owner assigned',   meta: '4d ago',  why: 'Penny monitors demand channels for high-impact bug reports; stability issues are escalated when they age without an owner' },
    { urgent: true,  source: 'salesforce', text: '2 change requests unassigned — queue stalling past SLA window',               meta: '3h ago',  why: 'Penny monitors the demand queue to flag items that risk missing triage SLA and creating delivery delays' },
    { urgent: false, source: 'slack',      text: 'REQ-028: Trail Quest reminders — 7 days in backlog, no action',               meta: '7d ago',  why: 'Penny surfaces long-idle backlog items so the team can decide to triage, defer, or close them before they pile up' },
    { urgent: false, source: 'salesforce', text: "Explorer's Trail generated 3 of 7 open requests this week",                   meta: '2d ago',  why: "Penny reads Salesforce intake records to show which programs are generating the most demand pressure" },
    { urgent: false, source: 'salesforce', text: 'REQ-029 approved and in progress — Guided Trail Module 4 pacing update',      meta: '5d ago',  why: 'Penny confirms approved requests are moving to delivery so nothing gets approved-but-forgotten' },
  ],
  knowledge: [
    { urgent: false, source: 'drive',      text: "12 documents flagged 'needs-review'",                          meta: '2h ago',  why: "Penny reads Drive metadata to surface documents that may be outdated — these affect what Penny can reliably cite" },
    { urgent: false, source: 'drive',      text: 'Source Mapping updated — RESOLVE Course Canvas',               meta: '3h ago',  why: 'Penny watches source mapping records to know when the knowledge graph changes and can reindex' },
    { urgent: false, source: 'slack',      text: 'Sprint 3 materials question in #guided-trail',                 meta: '5h ago',  why: 'Penny monitors program channels to surface learner questions that may indicate a materials gap' },
    { urgent: false, source: 'salesforce', text: 'Org Memory: 234 Penny interactions logged this week',          meta: '6h ago',  why: "Penny reads its interaction log to identify knowledge gaps and improve future answers" },
  ],
  collaboration: [
    { urgent: false, source: 'slack',      text: '@coachconnectbot live in Penny AI + Admin channels — delivery pipeline ready to wire',  meta: '1h ago',  why: 'Penny monitors Slack bot status — Slack is live and Penny delivery can now be wired to the live bot' },
    { urgent: false, source: 'calendar',   text: 'Sprint 3 Resume Workshop — Thursday 10am',                     meta: '2h ago',  why: 'Penny reads Calendar to surface upcoming collaborative sessions so you can prepare' },
    { urgent: false, source: 'slack',      text: '#guided-trail-cohort-1: Week 3 message from coach',            meta: '4h ago',  why: 'Penny monitors cohort channels to surface coach communications that may need a follow-up' },
    { urgent: false, source: 'drive',      text: '7 message templates ready for testing',                        meta: '6h ago',  why: 'Penny watches template folders to surface communication assets that are ready to use or review' },
  ],
  admin: [
    { urgent: false, source: 'salesforce', text: 'Salesforce fully connected — REST API live, PMM + NPSP confirmed', meta: '2h ago',  why: 'Penny monitors integration state to surface when platform dependencies unblock the next wave of live data wiring' },
    { urgent: false, source: 'slack',      text: 'Phase 2 backlog: 19 draft features captured at /admin/phase2-backlog', meta: '4h ago', why: 'Penny tracks backlog progress in admin channels so the team can see which deferred features are queued and ready to scope' },
    { urgent: false, source: 'drive',      text: 'Secrets audit: last run 3 days ago',                           meta: '6h ago',  why: 'Penny monitors Drive audit logs to surface security hygiene status for the admin team' },
  ],
  'digital-twin': [
    { urgent: false, source: 'salesforce', text: 'Digital Compass: 6 object relationships unmapped',             meta: '3h ago',  why: 'Penny reads Salesforce object metadata to surface gaps in Digital Twin coverage' },
    { urgent: false, source: 'drive',      text: 'Governance policy document updated',                           meta: '5h ago',  why: 'Penny watches governance docs in Drive to surface policy changes that affect object rules' },
    { urgent: false, source: 'slack',      text: '#trail-os-ops: governance review thread active',               meta: '8h ago',  why: 'Penny monitors ops channels to surface active governance discussions needing attention' },
  ],
  default: [
    { urgent: false, source: 'slack',      text: 'No context-specific signals for this page yet',                meta: '',        why: 'Penny will surface signals as you navigate to pages with active data connections' },
  ],
};

// ── Page content ──────────────────────────────────────────────────────────────

type AttItem  = { icon: typeof CheckCircle2; bg: string; iconCls: string; text: string };
type StepItem = { label: string; path: string };

type PageContent = {
  everydayInsights: string[];
  powerInsights: string[];
  attentionItems: AttItem[];
  everydaySteps: StepItem[];
  powerSteps: StepItem[];
  everydayCanned: string;
  powerCanned: string;
};

const CONTENT: Record<PageCtx, PageContent> = {
  home: {
    everydayInsights: [
      'Guided Trail Cohort 1 · Week 3 of 8 — on track',
      'Foundations Trail Cohort 2 at 89% capacity — enrollment may need attention',
      'Sprint 3 Resume Workshop starts Thursday — materials are ready',
    ],
    powerInsights: [
      '5 open demand items — 2 change requests awaiting triage',
      'Trail of Mastery · Execute phase needs source documentation before delivery can proceed',
      '234 Penny interactions this week · 1 Learning Coach confidence flag',
      'Foundations Trail Cohort 2 approaching capacity (89%)',
    ],
    attentionItems: [
      { icon: CheckCircle2,  bg: 'bg-emerald-50 border-emerald-200', iconCls: 'text-emerald-500', text: "Explorer's Trail Cohort 3 · 12 of 15 enrolled" },
      { icon: Lightbulb,     bg: 'bg-sky-50 border-sky-200',          iconCls: 'text-sky-500',     text: 'Sprint 3 Resume Workshop — Thursday, materials ready' },
      { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200',       iconCls: 'text-amber-500',   text: 'Foundations Trail Cohort 2 filling up — 89% capacity' },
    ],
    everydaySteps: [
      { label: 'View my programs',        path: '/program' },
      { label: 'Check upcoming sessions', path: '/program' },
      { label: 'Knowledge Library',       path: '/knowledge/library' },
    ],
    powerSteps: [
      { label: 'Triage demand queue',    path: '/operations/demand' },
      { label: 'Review program health',  path: '/operations/health' },
      { label: 'Penny activity log',     path: '/penny/intelligence' },
    ],
    everydayCanned: "Your programs are on track this week. Guided Trail Cohort 1 is in Week 3 with all materials uploaded. Your next session is the Sprint 3 Resume Workshop on Thursday. Foundations Trail is nearly full — you may want to check if any colleagues need enrollment support.",
    powerCanned:    "Current priority: Trail of Mastery execute phase needs source documentation before delivery can proceed. 2 change requests are unassigned. Penny flagged 1 Learning Coach confidence issue — review at /penny/intelligence.",
  },
  programs: {
    everydayInsights: [
      "You're enrolled in Explorer's Trail and Guided Trail",
      'Next milestone: Sprint 3 Resume Workshop on Thursday',
      'Foundations Trail has a new cohort open — check availability',
    ],
    powerInsights: [
      '3 programs in active delivery; 2 in discovery/planning',
      'Content standards: 4 items need documentation updates',
      "Blueprint coverage: Explorer's Trail most complete; Trail of Mastery needs work",
      'Salesforce mapping: 6 of 12 objects fully mapped',
    ],
    attentionItems: [
      { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200',       iconCls: 'text-amber-500',   text: 'Trail of Mastery · Execute phase needs source docs' },
      { icon: CheckCircle2,  bg: 'bg-emerald-50 border-emerald-200', iconCls: 'text-emerald-500', text: "Explorer's Trail Cohort 3 · 12 of 15 enrolled" },
    ],
    everydaySteps: [
      { label: 'Browse all programs',   path: '/program' },
      { label: 'Knowledge Library',     path: '/knowledge/library' },
    ],
    powerSteps: [
      { label: 'Review standards',   path: '/program/standards' },
      { label: 'Salesforce mapping', path: '/admin/salesforce-arch' },
      { label: 'Program blueprint',  path: '/program/blueprint' },
    ],
    everydayCanned: "Each program has a structured curriculum, cohort schedule, and Penny support built in. Your active programs have all materials for this sprint uploaded.",
    powerCanned:    "Programs overview: Explorer's Trail has the most complete Salesforce mapping. Trail of Mastery execute phase needs source documentation before delivery can proceed. Content standards flagged 4 items needing updates.",
  },
  penny: {
    everydayInsights: [
      'Penny can answer questions about your program, cohort, and learning progress',
      'Ask Penny for help finding any document or resource',
      'Penny remembers context from your current program phase',
    ],
    powerInsights: [
      '22 Penny capabilities mapped — 8 in prototype, 14 planned',
      'Learning Coach capability: 1 confidence flag this week',
      'Trail Quest and Assessment capabilities are POC-ready',
      'Salesforce live — SF Data Intelligence capability can now be wired to real data',
    ],
    attentionItems: [
      { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200',       iconCls: 'text-amber-500',   text: '1 Learning Coach confidence flag this week' },
      { icon: CheckCircle2,  bg: 'bg-emerald-50 border-emerald-200', iconCls: 'text-emerald-500', text: 'Test Penny is available for prototype queries' },
    ],
    everydaySteps: [
      { label: 'Ask Penny',           path: '/penny' },
      { label: 'My learner profile',  path: '/penny/learners' },
    ],
    powerSteps: [
      { label: 'Capability map',         path: '/penny' },
      { label: 'Ask Penny',              path: '/penny' },
      { label: 'Intelligence dashboard', path: '/penny/intelligence' },
    ],
    everydayCanned: "I'm Penny — here to guide you through your program, help find resources, and answer questions. Try asking about your current sprint, upcoming sessions, or anything in the Knowledge Library.",
    powerCanned:    "Penny status: Learning Coach, Trail Quest, and Assessment capabilities are in prototype. Salesforce is live — SF Data Intelligence can now be wired to real data. The confidence flag on Learning Coach relates to Cohort 3 recap scoring — review at /penny/intelligence.",
  },
  operations: {
    everydayInsights: [
      'All 5 programs are currently running as planned',
      'Next major milestone: Guided Trail Sprint 3 on Thursday',
    ],
    powerInsights: [
      'Health status: 3 active, 1 in discovery, 1 in planning',
      'Integration readiness: Salesforce live (REST API), Google OAuth in progress',
      '7 open demand items — 2 flagged at-risk by age and type',
      'Trail of Mastery execute phase needs source documentation before delivery',
    ],
    attentionItems: [
      { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200',   iconCls: 'text-amber-500', text: 'Execute phase — source documentation needed' },
      { icon: Lightbulb,     bg: 'bg-sky-50 border-sky-200',        iconCls: 'text-sky-500',   text: 'Schedule Trail of Mastery Q3 sprint review' },
    ],
    everydaySteps: [{ label: 'View program status', path: '/operations' }],
    powerSteps: [
      { label: 'Health indicators',     path: '/operations/health' },
      { label: 'Integration & setup',   path: '/admin/setup' },
      { label: 'Demand queue',          path: '/operations/demand' },
    ],
    everydayCanned: "Operations are running normally. Guided Trail Cohort 1 is in Week 3 of 8 and on track. Your next milestone is Sprint 3 on Thursday.",
    powerCanned:    "Ops summary: 3 programs in active delivery. Trail of Mastery execute phase is top priority — source documentation needed before delivery. Salesforce live — wire first data query to health dashboard at /api/salesforce/validate.",
  },
  demand: {
    everydayInsights: [
      'REQ-029 approved — Guided Trail Module 4 pacing update is in progress',
      'Submit requests via the demand queue or #demand-queue Slack channel',
    ],
    powerInsights: [
      'REQ-030 is highest priority — Penny not responding to RESOLVE, 4 days without an owner',
      '2 change requests unassigned — queue at risk of stalling',
      "Explorer's Trail is the top source of open requests this week (3 of 7)",
      '7 open items total — 2 high-risk, 2 elevated by age',
    ],
    attentionItems: [
      { icon: AlertTriangle, bg: 'bg-rose-50 border-rose-200',       iconCls: 'text-rose-500',   text: 'REQ-030 · Penny not responding · 4 days open, no owner' },
      { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200',     iconCls: 'text-amber-500',  text: 'REQ-028 · Trail Quest reminders · 7 days in backlog' },
      { icon: CheckCircle2,  bg: 'bg-emerald-50 border-emerald-200', iconCls: 'text-emerald-500', text: 'REQ-029 approved — Guided Trail pacing update in progress' },
    ],
    everydaySteps: [
      { label: 'Check request status', path: '/operations/demand' },
      { label: 'View program health',  path: '/operations' },
    ],
    powerSteps: [
      { label: 'Triage queue',         path: '/operations/demand' },
      { label: 'Health indicators',    path: '/operations/health' },
      { label: 'SF Validation Center', path: '/admin/sf-validation' },
    ],
    everydayCanned: "Your open request REQ-029 was approved — the Guided Trail Module 4 pacing update is in progress. Submit new requests through the demand queue or the #demand-queue Slack channel.",
    powerCanned:    "Demand queue: 7 open items. REQ-030 is the top priority — Penny not responding to RESOLVE questions, 4 days without an owner. 2 change requests are stalling. Triage recommended before end of week. Explorer's Trail is the highest-volume program for demand this week.",
  },
  knowledge: {
    everydayInsights: [
      'The Library has all program materials, templates, and guides',
      'Sprint 3 Resume Writing materials were updated 3 hours ago',
      'Search across all documents from the Knowledge Search page',
    ],
    powerInsights: [
      '47 active documents across 5 programs',
      "Source trust: 12 documents flagged 'needs-review'",
      'Source Mapping updated — RESOLVE Course Canvas synced 3h ago',
      'Org Memory: 234 Penny interactions logged this week',
    ],
    attentionItems: [
      { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200',       iconCls: 'text-amber-500',   text: "12 documents flagged 'needs-review'" },
      { icon: CheckCircle2,  bg: 'bg-emerald-50 border-emerald-200', iconCls: 'text-emerald-500', text: 'Sprint 3 materials updated and ready' },
    ],
    everydaySteps: [
      { label: 'Open Knowledge Library', path: '/knowledge/library' },
      { label: 'Search knowledge',       path: '/search' },
    ],
    powerSteps: [
      { label: 'Source documents', path: '/knowledge' },
      { label: 'Digital Twin',     path: '/digital-twin' },
    ],
    everydayCanned: "The Knowledge Library has all program documents, templates, and resources. Sprint 3 Resume Writing materials were just updated. Use Knowledge Search to find anything specific.",
    powerCanned:    "Knowledge health: 47 active docs, 12 flagged for review. Source mapping updated 3h ago — RESOLVE Course Canvas is current. Org Memory shows 234 Penny interactions this week.",
  },
  collaboration: {
    everydayInsights: [
      'Google Calendar shows your next session: Sprint 3 Resume Workshop — Thursday',
      '@coachconnectbot is live in Slack — Penny can send session reminders once delivery pipeline is wired',
      'Message templates ready — wire Penny output to @coachconnectbot to activate broadcasts',
    ],
    powerInsights: [
      'Slack live — @coachconnectbot posting to Penny AI + Admin channels',
      'Google Calendar: connected for timing context',
      '3 communication routes defined — ready to wire Penny output to Slack delivery',
      '7 message templates ready for testing',
    ],
    attentionItems: [
      { icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-200', iconCls: 'text-emerald-500', text: 'Slack live — @coachconnectbot posting to Penny AI + Admin' },
      { icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-200', iconCls: 'text-emerald-500', text: 'Google Calendar connected for session timing' },
    ],
    everydaySteps: [{ label: 'View Google Calendar', path: '/collaboration/calendar' }],
    powerSteps: [
      { label: 'Slack integration', path: '/collaboration/slack' },
      { label: 'Message templates', path: '/collaboration/templates' },
    ],
    everydayCanned: "Google Calendar is connected and shows your upcoming sessions. Slack @coachconnectbot is live — once Penny's output is wired to Slack delivery, reminders and updates will go through there automatically.",
    powerCanned:    "Collaboration stack: Slack live (POC confirmed — @coachconnectbot posting). Google Calendar connected. 3 communication routes and 7 message templates defined. Next: wire Penny capability output to Slack delivery pipeline.",
  },
  admin: {
    everydayInsights: [],
    powerInsights: [
      'Salesforce live — REST API connected, PMM + NPSP confirmed. Next: wire to dashboard.',
      'Slack live — @coachconnectbot posting. Next: add channels:read scope.',
      'Google OAuth setup available — run at /admin/google-oauth to get refresh tokens',
      'Phase 2 backlog: 19 draft features captured at /admin/phase2-backlog',
    ],
    attentionItems: [
      { icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-200', iconCls: 'text-emerald-500', text: 'Salesforce live — REST API + PMM confirmed' },
    ],
    everydaySteps: [],
    powerSteps: [
      { label: 'Phase 1 readiness', path: '/admin/phase1-readiness' },
      { label: 'Phase 2 backlog',   path: '/admin/phase2-backlog' },
      { label: 'Google Auth setup', path: '/admin/google-oauth' },
    ],
    everydayCanned: "",
    powerCanned:    "Admin status: Salesforce live (REST API + PMM). Slack POC confirmed (@coachconnectbot). Google OAuth client ready — run /admin/google-oauth to get refresh tokens. Phase 2 backlog: 10 draft features at /admin/phase2-backlog.",
  },
  'digital-twin': {
    everydayInsights: [],
    powerInsights: [
      'Digital Twin maps all objects, relationships, and impacts across Trail OS',
      'Select any object to explore its connections and governance status',
      'Impact analysis shows what depends on each object',
    ],
    attentionItems: [
      { icon: Lightbulb, bg: 'bg-sky-50 border-sky-200', iconCls: 'text-sky-500', text: 'Select an object to explore its relationships' },
    ],
    everydaySteps: [],
    powerSteps: [
      { label: 'Explore Digital Twin', path: '/digital-twin' },
      { label: 'Impact analysis',      path: '/digital-twin/impact' },
    ],
    everydayCanned: "",
    powerCanned:    "The Digital Twin maps all Trail OS objects. Select any object to see its dependencies and what would break if it changed.",
  },
  default: {
    everydayInsights: ['Select any item on this page to see its details here'],
    powerInsights:    ['Select any item to open its Trail Insights', 'Trail Signals shows context for this page'],
    attentionItems: [],
    everydaySteps: [],
    powerSteps: [],
    everydayCanned: "I'm here to help with anything on this page — programs, resources, or how Trail OS works.",
    powerCanned:    "Ask me about specific items, relationships, or how this section connects to the broader Trail OS system.",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PagePennyGuide() {
  const [location, setLocation] = useLocation();
  const { isEveryday, isPowerOrAbove } = useTierFlags();
  const { pennyPanelTab, setPennyPanelTab } = useAppContext();
  const [query, setQuery]   = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ctx        = deriveCtx(location);
  const content    = CONTENT[ctx];
  const signalCtx  = locationToContext(location);
  const nudgeCounts = SIGNAL_COUNTS[signalCtx] ?? null;
  const signalItems = SIGNAL_ITEMS[ctx] ?? SIGNAL_ITEMS.default;
  const urgentCount = nudgeCounts?.urgent ?? 0;
  const totalCount  = nudgeCounts?.total ?? signalItems.length;

  const insights = isEveryday ? content.everydayInsights : content.powerInsights;
  const steps    = isEveryday ? content.everydaySteps    : content.powerSteps;
  const canned   = isEveryday ? content.everydayCanned   : content.powerCanned;

  // Trail Signals accordion — open when pennyPanelTab === 'signals'
  const signalsOpen = pennyPanelTab === 'signals';
  function toggleSignals() {
    setPennyPanelTab(signalsOpen ? 'penny' : 'signals');
  }

  // Active display tab — 'signals' maps to the Penny tab with accordion open
  const activeTab = pennyPanelTab === 'ask' ? 'ask' : 'penny';

  // Group signals by source
  const signalsBySource = signalItems.reduce<Partial<Record<SigSource, SigItem[]>>>((acc, item) => {
    if (!acc[item.source]) acc[item.source] = [];
    acc[item.source]!.push(item);
    return acc;
  }, {});
  const sourceOrder: SigSource[] = ['slack', 'salesforce', 'drive', 'calendar', 'email'];
  const presentSources = sourceOrder.filter(s => signalsBySource[s]?.length);

  function handleAsk() {
    if (!query.trim() || !canned) return;
    setResponse(canned);
    setQuery('');
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Tab bar: Penny | Ask ─────────────────────────────────────────── */}
      <div className="flex shrink-0 border-b border-border/40 bg-white/80">
        {(['penny', 'ask'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setPennyPanelTab(tab)}
            className={`flex-1 px-3 py-2 text-[11px] font-medium border-b-2 transition-all duration-150 ${
              activeTab === tab
                ? 'border-violet-500 text-violet-700 bg-violet-50/40'
                : 'border-transparent text-muted-foreground/60 hover:text-foreground hover:border-border/40'
            }`}
          >
            {tab === 'penny' ? 'Penny Insights' : 'Ask Penny'}
          </button>
        ))}
      </div>

      {/* ── Penny Insights tab ───────────────────────────────────────────── */}
      {activeTab === 'penny' && (
        isEveryday && insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center p-5 h-full">
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-500" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Ask Penny a question or select an item to open its brief.
            </p>
            <button onClick={() => setPennyPanelTab('ask')} className="flex items-center gap-1 text-[10px] font-medium text-violet-600 hover:underline">
              Ask a question <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">

              {/* Penny Insights section */}
              {insights.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-violet-600/70 mb-2">
                    {isEveryday ? 'Penny · Your Learning Coach' : 'Penny · Chief of Staff'}
                  </p>
                  <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3 space-y-1.5">
                    {insights.map((text, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-violet-300 flex-shrink-0 mt-0.5 leading-none text-[10px]">•</span>
                        <p className="text-[11px] text-violet-900 leading-snug">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Trail Signals accordion ──────────────────────────────────
                  The evidence layer — shows the source-level data behind
                  Penny's insights above. Collapsed by default, expand to verify.
              ──────────────────────────────────────────────────────────────── */}
              {totalCount > 0 && (
                <div className="rounded-lg border border-border/60 overflow-hidden">

                  {/* Accordion header — always visible */}
                  <button
                    onClick={toggleSignals}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                      signalsOpen ? 'bg-slate-50 border-b border-border/40' : 'bg-white hover:bg-muted/20'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] font-bold text-foreground/80 uppercase tracking-wide">Trail Signals</p>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                          urgentCount > 0
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-muted text-muted-foreground border border-border/60'
                        }`}>
                          {totalCount}
                        </span>
                        {urgentCount > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                        )}
                      </div>
                      {!signalsOpen && (
                        <p className="text-[9px] text-muted-foreground/50 mt-0.5 leading-snug">
                          {presentSources.length} source{presentSources.length !== 1 ? 's' : ''} · {urgentCount > 0 ? `${urgentCount} urgent · ` : ''}tap to see the data behind these insights
                        </p>
                      )}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 transition-transform duration-200 ${signalsOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Accordion body — source-grouped signals */}
                  {signalsOpen && (
                    <div className="divide-y divide-border/30">
                      {presentSources.map(src => {
                        const items   = signalsBySource[src]!;
                        const ico     = SOURCE_ICO[src];
                        const conn    = SOURCE_CONNECT[src];
                        const SrcIcon = ico.Icon;
                        const hasUrgent = items.some(i => i.urgent);

                        return (
                          <div key={src}>
                            {/* Source header */}
                            <div className={`flex items-center gap-2 px-3 py-1.5 ${ico.bg}`}>
                              <SrcIcon className={`w-3 h-3 ${ico.cls} flex-shrink-0`} />
                              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                                <span className={`text-[10px] font-semibold ${ico.cls}`}>{ico.label}</span>
                                {hasUrgent && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />}
                                <span className={`text-[9px] ${conn.cls} ml-0.5`}>· {conn.status}</span>
                              </div>
                              {conn.link && (
                                <a
                                  href={conn.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground/30 hover:text-muted-foreground transition-colors"
                                  title={`Open ${ico.label}`}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>

                            {/* Signal items */}
                            <div className="bg-white divide-y divide-border/20">
                              {items.map((item, i) => (
                                <div key={i} className={`px-3 py-2 ${item.urgent ? 'bg-amber-50/30' : ''}`}>
                                  <div className="flex items-start gap-1.5">
                                    {item.urgent
                                      ? <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                      : <span className="w-1 h-1 rounded-full bg-muted-foreground/20 flex-shrink-0 mt-1.5" />
                                    }
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-[11px] leading-snug ${item.urgent ? 'font-medium text-amber-900' : 'text-foreground'}`}>
                                        {item.text}
                                      </p>
                                      {item.meta && (
                                        <p className="text-[9px] text-muted-foreground/40 mt-0.5">{item.meta}</p>
                                      )}
                                      <p className="text-[9px] text-muted-foreground/50 italic leading-snug mt-1 border-l-2 border-border/40 pl-1.5">
                                        {item.why}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Footer — close + context note */}
                      <div className="px-3 py-2 bg-muted/20 flex items-center justify-between gap-2">
                        <p className="text-[9px] text-muted-foreground/40 leading-snug">
                          Phase 1 · Salesforce + Slack live · Google OAuth in progress
                        </p>
                        <button
                          onClick={toggleSignals}
                          className="text-[9px] text-muted-foreground/50 hover:text-foreground font-medium whitespace-nowrap transition-colors"
                        >
                          Hide ▴
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Attention */}
              {content.attentionItems.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Attention</p>
                  <div className="space-y-1.5">
                    {content.attentionItems.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border text-[10px] ${item.bg}`}>
                          <Icon className={`w-3 h-3 flex-shrink-0 mt-0.5 ${item.iconCls}`} />
                          <span className="text-foreground leading-snug">{item.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              {steps.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5">
                    {isEveryday ? 'Quick Actions' : 'Next Steps'}
                  </p>
                  <div className="space-y-0.5">
                    {steps.map((step, i) => (
                      <button key={i} onClick={() => setLocation(step.path)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left hover:bg-muted/40 transition-colors group"
                      >
                        <ArrowRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
                        <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">{step.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isPowerOrAbove && (
                <div className="rounded-md bg-muted/30 border border-border/50 p-2.5">
                  <p className="text-[9px] text-muted-foreground/55 leading-relaxed">
                    <span className="font-semibold text-muted-foreground/70">Salesforce + Slack live.</span> Google OAuth in progress. Agentforce + GA4: Phase 2. Select any item to open its Trail Insights.
                  </p>
                </div>
              )}

            </div>
          </ScrollArea>
        )
      )}

      {/* ── Ask Penny tab ─────────────────────────────────────────────────── */}
      {activeTab === 'ask' && (
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">

            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-violet-600/70 mb-1.5">Ask Penny</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isEveryday
                  ? 'Ask me about your programs, upcoming sessions, or anything in the Knowledge Library. I can also explain any signal.'
                  : 'Ask me about this page, system relationships, or operational context. I can explain any Trail Signal or insight.'}
              </p>
            </div>

            {response && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-2 h-2 text-white" />
                  </div>
                  <span className="text-[9px] font-bold text-violet-700 uppercase tracking-wide">Penny</span>
                  <button onClick={() => setResponse(null)} className="ml-auto text-[9px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-violet-900 leading-snug">{response}</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-1.5">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAsk()}
                  placeholder={`Ask about ${ctx === 'home' ? 'your dashboard' : ctx === 'default' ? 'this page' : ctx}…`}
                  className="flex-1 text-[11px] bg-white border border-border/70 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-violet-300 focus:border-violet-300"
                />
                <button
                  onClick={handleAsk}
                  disabled={!query.trim()}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[9px] text-muted-foreground/40 leading-snug">
                Live · Gemini API · Agentforce upgrade: Phase 2
              </p>
            </div>

            {!response && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1.5">Try asking</p>
                <div className="space-y-1">
                  {(isEveryday
                    ? ["What's happening with my programs?", "Why did Penny flag the Learning Coach?", "Find Sprint 3 materials"]
                    : ["What needs attention today?", "Why is Trail of Mastery blocked?", "Explain the Salesforce signals"]
                  ).map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => { setQuery(suggestion); inputRef.current?.focus(); }}
                      className="w-full text-left text-[10px] text-muted-foreground px-2.5 py-1.5 rounded-md hover:bg-muted/40 hover:text-foreground transition-colors"
                    >
                      "{suggestion}"
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </ScrollArea>
      )}

    </div>
  );
}
