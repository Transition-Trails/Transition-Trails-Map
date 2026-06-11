import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain, Rss, Mail, Calendar, LogIn, LayoutGrid, Image,
  Smartphone, Zap, BookOpen, X, ChevronRight, User, Users,
  Shield, Star, type LucideIcon,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Column = 'Draft' | 'Active' | 'Ready' | 'Done';

interface RoleImpact { role: string; impact: string; }

interface BacklogCard {
  id: string;
  title: string;
  column: Column;
  phase: 'Phase 2';
  owner: string;
  summary: string;
  tags: string[];
  dependencies: string[];
  roleImpact: RoleImpact[];
  acceptanceCriteria: string[];
  icon: LucideIcon;
  hue: string; // Tailwind color token (e.g. 'violet')
}

// ── Role icon helper ──────────────────────────────────────────────────────────

const ROLE_ICONS: Record<string, LucideIcon> = {
  'Everyday User': User,
  'Penny Power User': Star,
  'Admin': Shield,
  'Super Admin': Users,
};

// ── Card data ─────────────────────────────────────────────────────────────────

const CARDS: BacklogCard[] = [
  {
    id: 'p2-ask-penny-panel',
    title: 'Universal Ask Penny Side Panel',
    column: 'Draft',
    phase: 'Phase 2',
    owner: 'TBD',
    summary: 'Ask Penny available from anywhere through the right-side panel using page context, user role, Trail Signals, and connected systems — no navigation change required.',
    tags: ['Penny', 'Right Panel', 'UX'],
    icon: Brain,
    hue: 'violet',
    dependencies: [
      'Phase 1 right panel (ContextBar) architecture stable',
      'Valid Gemini API key set in Secrets Audit (new AQ. format or legacy AIza format)',
      'Trail Signals schema finalised',
      'Penny capability architecture (Phase 1) complete',
    ],
    roleImpact: [
      { role: 'Everyday User',    impact: 'Primary beneficiary — Ask Penny without leaving any page' },
      { role: 'Penny Power User', impact: 'Advanced queries using source citations and signal context' },
      { role: 'Admin',            impact: 'Can configure default context injected into every Penny panel session' },
    ],
    acceptanceCriteria: [
      'Panel opens from any page without navigating away',
      'Penny receives current page context and active user role',
      'Trail Signals are available as Penny input context',
      'Connected systems (Salesforce, Google) can be queried through Penny',
      'Panel closes cleanly and preserves page scroll position',
      'No Penny action writes data without explicit user confirmation',
    ],
  },
  {
    id: 'p2-trail-signals-control',
    title: 'My Trail Signals Control Center',
    column: 'Draft',
    phase: 'Phase 2',
    owner: 'TBD',
    summary: 'Users customise what enters their Trail Signals feed — add personal watch rules, set urgency, choose digest or alert delivery, and distinguish required vs optional signals.',
    tags: ['Trail Signals', 'Personalization', 'UX'],
    icon: Rss,
    hue: 'amber',
    dependencies: [
      'Trail Signals schema and source registry finalised (Phase 1)',
      'User profile persistence layer (database-backed, not in-memory)',
      'Notification delivery infrastructure (email or push)',
      'Signal source connector library for Salesforce, Google, Slack',
    ],
    roleImpact: [
      { role: 'Everyday User',    impact: 'Self-service control over their own signal feed and notification preferences' },
      { role: 'Penny Power User', impact: 'Can author advanced watch rules with conditional logic' },
      { role: 'Admin',            impact: 'Can view signal configuration for any user; can set org-level required signals' },
      { role: 'Super Admin',      impact: 'Can define which signal sources are available per role tier' },
    ],
    acceptanceCriteria: [
      'User can add, pause, and remove signal sources from personal feed',
      'Urgency levels (High / Medium / Low) configurable per signal type',
      'Digest (daily summary) vs real-time toggle per signal source',
      'Required signals (set by Admin) cannot be disabled by Everyday User',
      'Watch rules support basic conditions (object type, field value, threshold)',
      'Control Center preferences persist across sessions and devices',
    ],
  },
  {
    id: 'p2-gmail-panel',
    title: 'Email / Gmail Action Panel',
    column: 'Draft',
    phase: 'Phase 2',
    owner: 'TBD',
    summary: 'Surface unanswered messages, draft follow-ups, escalation summaries, and open email threads directly from the Trail OS right panel — powered by Gmail and Penny AI.',
    tags: ['Gmail', 'Right Panel', 'Actions'],
    icon: Mail,
    hue: 'sky',
    dependencies: [
      'Google OAuth token with gmail.readonly and gmail.compose scopes',
      'Google OAuth Setup flow complete (/admin/google-oauth)',
      'Right Panel (ContextBar) infrastructure stable',
      'Gemini API key valid for AI-drafted replies',
    ],
    roleImpact: [
      { role: 'Everyday User',    impact: 'Read surface — unanswered threads and follow-up reminders' },
      { role: 'Penny Power User', impact: 'Penny-drafted replies, thread summaries, and escalation detection' },
      { role: 'Admin',            impact: 'Can configure team-level email visibility and escalation thresholds' },
    ],
    acceptanceCriteria: [
      'Unanswered messages surfaced for threads older than a configurable threshold (default 24h)',
      'Penny can draft a follow-up reply in the panel before the user sends',
      'Escalation summary generated for threads with 3+ participants or > 5 days old',
      'Clicking a thread opens full Gmail thread in a new tab',
      'No email is sent without explicit user confirmation inside Trail OS',
      'Panel shows zero-state gracefully when inbox is clear',
    ],
  },
  {
    id: 'p2-calendar-panel',
    title: 'Calendar Action Panel',
    column: 'Draft',
    phase: 'Phase 2',
    owner: 'TBD',
    summary: 'Surface no-response invites, meeting prep briefs, upcoming Trail Talks, reminders, and calendar event context from the Trail OS right panel — powered by Google Calendar.',
    tags: ['Google Calendar', 'Right Panel', 'Actions'],
    icon: Calendar,
    hue: 'emerald',
    dependencies: [
      'Google OAuth token with calendar.readonly scope',
      'Google OAuth Setup flow complete (/admin/google-oauth)',
      'Trail Talks calendar ID or label defined in admin config',
      'Gemini API key for Penny meeting prep generation',
    ],
    roleImpact: [
      { role: 'Everyday User',    impact: 'Event reminders and no-response invite alerts surfaced in right panel' },
      { role: 'Penny Power User', impact: 'Penny generates meeting prep briefs from event title, description, and attendees' },
      { role: 'Admin',            impact: 'Trail Talks shown as branded events visible to all configured users' },
    ],
    acceptanceCriteria: [
      'No-response invites surfaced with one-click RSVP action in panel',
      'Penny generates a meeting prep brief (agenda, attendees, relevant docs) 15 minutes before start',
      'Trail Talk events rendered with branded styling and topic summary',
      'Reminder fires in-panel 15 minutes before events (configurable)',
      'No calendar writes (RSVP, create, delete) occur without explicit user action',
      'Panel shows next 5 events in chronological order with time-to-start countdowns',
    ],
  },
  {
    id: 'p2-google-signin',
    title: 'Google Sign-In & Google Groups Access',
    column: 'Draft',
    phase: 'Phase 2',
    owner: 'TBD',
    summary: 'Use Google authentication and Google Group membership to automatically determine Everyday User, Penny Power User, Admin, and Super Admin access — no manual role assignment.',
    tags: ['Auth', 'Google', 'Access Control'],
    icon: LogIn,
    hue: 'rose',
    dependencies: [
      'Google OAuth app with openid, email, profile scopes',
      'Google Admin SDK or Directory API access for group membership reads',
      'Group naming convention agreed (e.g. trail-os-admin@transitiontrails.org)',
      'Role mapping table defined in Super Admin settings',
      'Session and JWT infrastructure (Phase 1 auth shell)',
    ],
    roleImpact: [
      { role: 'Everyday User',    impact: 'Google SSO replaces any manual login — role assigned from group membership' },
      { role: 'Penny Power User', impact: 'Group membership grants additional Penny capabilities automatically' },
      { role: 'Admin',            impact: 'Can view user role assignments; cannot change group mappings' },
      { role: 'Super Admin',      impact: 'Configures Google Group → Trail OS role mapping table in admin settings' },
    ],
    acceptanceCriteria: [
      'Login via Google SSO (no username/password form)',
      'Google Group membership queried within 2 seconds of successful auth',
      'Role mapping table is configurable by Super Admin without a code deploy',
      'Unmapped users fall back to Everyday User role (not blocked)',
      'Everyday User cannot see admin tools regardless of direct URL access',
      'Role changes take effect on next login without requiring a full re-auth',
    ],
  },
  {
    id: 'p2-mural-integration',
    title: 'Mural Integration',
    column: 'Draft',
    phase: 'Phase 2',
    owner: 'TBD',
    summary: 'Support Mural boards for workshops, planning sessions, retrospectives, discovery, and cross-team collaboration — including future OAuth callback setup and board management from Trail OS.',
    tags: ['Mural', 'Collaboration', 'Workshops'],
    icon: LayoutGrid,
    hue: 'orange',
    dependencies: [
      'Mural API access and OAuth app (Client ID + Secret)',
      'Mural workspace configured for Transition Trails',
      'OAuth callback URI registered in Mural Developer settings',
      'Right panel or dedicated embed surface in Trail OS',
    ],
    roleImpact: [
      { role: 'Everyday User',    impact: 'View-only access to linked Mural boards for their programs' },
      { role: 'Penny Power User', impact: 'Can contribute to and create boards linked to Trail OS objects' },
      { role: 'Admin',            impact: 'Manages board ↔ program linkages from admin settings' },
      { role: 'Super Admin',      impact: 'Configures Mural OAuth connection and workspace ID in Secrets Audit' },
    ],
    acceptanceCriteria: [
      'Mural boards embeddable as iframes on relevant Trail OS pages (programs, workshops)',
      'Workshop and retrospective template boards pre-linked to program types',
      'OAuth flow documented in the Google OAuth Setup wizard pattern',
      'Board access is controlled by Trail OS role (view vs edit)',
      'Phase 2 minimum viable: read-only embed with click-to-open-in-Mural',
      'Board list retrieved from Mural API and stored per program object',
    ],
  },
  {
    id: 'p2-penny-asset-library',
    title: 'Penny Asset Library',
    column: 'Draft',
    phase: 'Phase 2',
    owner: 'TBD',
    summary: 'Manage themed Penny images, ElevenLabs voice, HeyGen avatar, and contextual Penny states — coaching, resume review, interview prep, Trail Talk, confidence builder, and quest debrief.',
    tags: ['Penny', 'Media', 'Assets'],
    icon: Image,
    hue: 'pink',
    dependencies: [
      'ElevenLabs API key and Penny voice ID configured',
      'HeyGen API key and Penny avatar ID configured',
      'Object Storage (App Storage) configured for binary asset hosting',
      'Penny state machine defined (which states trigger which asset set)',
      'Gemini API for contextual prompt injection per state',
    ],
    roleImpact: [
      { role: 'Penny Power User', impact: 'Contextual Penny states fire the right asset set for their activity' },
      { role: 'Admin',            impact: 'Can preview all Penny states from the asset library panel' },
      { role: 'Super Admin',      impact: 'Manages asset library at /admin/penny-assets — upload, tag, map to states' },
    ],
    acceptanceCriteria: [
      'Asset library UI at /admin/penny-assets accessible to Super Admin',
      'Each Penny state (coaching, resume review, Trail Talk, etc.) has an associated image, voice script, and avatar variant',
      'Contextual trigger fires the correct asset set when the user enters a matched context',
      'ElevenLabs voice playback works in-browser without additional plugin',
      'HeyGen avatar renders in Test Penny panel (/penny/test)',
      'Fallback static image renders if API keys are absent',
    ],
  },
  {
    id: 'p2-mobile-trail-os',
    title: 'Mobile Trail OS Experience',
    column: 'Draft',
    phase: 'Phase 2',
    owner: 'TBD',
    summary: 'A separate mobile-first experience focused on Penny, Trail Signals, push notifications, quick actions, and task completion — not a squeezed version of the desktop UI.',
    tags: ['Mobile', 'Expo', 'UX'],
    icon: Smartphone,
    hue: 'teal',
    dependencies: [
      'Expo / React Native scaffold wired into pnpm monorepo',
      'Push notification service (Expo Notifications or FCM)',
      'Mobile-compatible Google OAuth flow (PKCE)',
      'Trail Signals API stable and performant enough for polling',
      'Penny API (Gemini) accessible from mobile context',
    ],
    roleImpact: [
      { role: 'Everyday User',    impact: 'Primary mobile audience — Penny chat, signal feed, and quick actions on the go' },
      { role: 'Penny Power User', impact: 'Mobile Penny with full context and voice output via ElevenLabs' },
      { role: 'Admin',            impact: 'Mobile monitoring view for team signals and escalations' },
    ],
    acceptanceCriteria: [
      'Expo app scaffold with Penny chat, Trail Signals feed, and quick-action cards',
      'Push notifications fire for High-urgency Trail Signals',
      'Authentication via Google Sign-In with biometric unlock for return visits',
      'No desktop admin tools, sidebars, or top-nav present in mobile app',
      'Signal feed is offline-tolerant with a local cache (last known state shown)',
      'Quick actions (RSVP, mark complete, send reply) available without full page navigation',
    ],
  },
  {
    id: 'p2-penny-reacts-signals',
    title: 'Penny Reacts to Trail Signals',
    column: 'Draft',
    phase: 'Phase 2',
    owner: 'TBD',
    summary: 'Penny interprets Trail Signals, explains why they matter, prioritises them, and suggests next actions — citing the trusted source that triggered each signal.',
    tags: ['Penny', 'Trail Signals', 'AI'],
    icon: Zap,
    hue: 'yellow',
    dependencies: [
      'Trail Signals schema and source registry finalised (Phase 1)',
      'Gemini API key valid and confirmed in Secrets Audit (AQ. or AIza format)',
      'Source-to-signal mapping defined (Salesforce record, Google doc, Slack message)',
      'Penny context architecture (Universal Side Panel, p2-ask-penny-panel)',
    ],
    roleImpact: [
      { role: 'Everyday User',    impact: 'Penny explains each signal in plain language and suggests 1-3 next actions' },
      { role: 'Penny Power User', impact: 'Advanced prioritisation scoring and source citation drill-down' },
      { role: 'Admin',            impact: 'Can audit Penny signal interpretations and flag inaccurate responses' },
    ],
    acceptanceCriteria: [
      'Penny receives signal context (type, source, timestamp, severity) on trigger',
      'Response explains the signal in plain language without jargon',
      'Response cites the source record (Salesforce link, Google Doc link, Slack message)',
      'Penny suggests 1-3 concrete next actions ranked by urgency',
      'A priority score (1-10) is calculated and visible on each interpreted signal',
      "Penny does not surface signals or source data outside the user's role permissions",
    ],
  },
  {
    id: 'p2-learning-delivery',
    title: 'Learning Delivery Center',
    column: 'Draft',
    phase: 'Phase 2',
    owner: 'TBD',
    summary: 'Future LMS abstraction layer for courses, assignments, topics, completions, and learner progress — bridging Google Classroom, external LMS systems, and Salesforce PMM Program Engagements.',
    tags: ['Learning', 'LMS', 'Salesforce'],
    icon: BookOpen,
    hue: 'indigo',
    dependencies: [
      'Google Classroom API OAuth token and course list access',
      'Salesforce PMM pmdm__ProgramEngagement__c confirmed accessible (Phase 1 ✅)',
      'Salesforce pmdm__ServiceDelivery__c confirmed accessible (Phase 1 ✅)',
      'LMS platform decision (Google Classroom vs third-party) made by stakeholders',
      'Learner object definition agreed (Contact → Learner mapping)',
    ],
    roleImpact: [
      { role: 'Everyday User',    impact: 'Learner dashboard shows enrolled courses, completions, and next assignment' },
      { role: 'Penny Power User', impact: 'Penny recommends next courses based on learning gaps and program engagement history' },
      { role: 'Admin',            impact: 'Manages course catalogue and links Salesforce PMM engagements to completions' },
      { role: 'Super Admin',      impact: 'Configures LMS OAuth connection and object mapping in admin settings' },
    ],
    acceptanceCriteria: [
      'Learner dashboard shows enrolled courses, completions, and next assignment from LMS',
      'Salesforce PMM Program Engagements linkable to course completions in admin UI',
      'Penny can recommend courses from identified learning gaps in Trail Signals',
      'Google Classroom OAuth flow documented following the Google OAuth Setup wizard pattern',
      'Learner progress syncs to Salesforce pmdm__ProgramEngagement__c on completion',
      'Abstraction layer supports swapping underlying LMS without changing Trail OS UI',
    ],
  },
];

// ── Column config ─────────────────────────────────────────────────────────────

const COLUMNS: { id: Column; label: string; headerCls: string; dotCls: string }[] = [
  { id: 'Draft',  label: 'Drafts', headerCls: 'border-stone-300 bg-stone-100 text-stone-700', dotCls: 'bg-stone-400' },
  { id: 'Active', label: 'Active', headerCls: 'border-sky-300 bg-sky-100 text-sky-700',       dotCls: 'bg-sky-500' },
  { id: 'Ready',  label: 'Ready',  headerCls: 'border-emerald-300 bg-emerald-100 text-emerald-700', dotCls: 'bg-emerald-500' },
  { id: 'Done',   label: 'Done',   headerCls: 'border-teal-300 bg-teal-100 text-teal-700',    dotCls: 'bg-teal-500' },
];

// ── Hue → Tailwind classes map ────────────────────────────────────────────────

const HUE_MAP: Record<string, { card: string; icon: string; tag: string; dot: string }> = {
  violet: { card: 'border-violet-200 hover:border-violet-300', icon: 'bg-violet-100 text-violet-700', tag: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400' },
  amber:  { card: 'border-amber-200 hover:border-amber-300',   icon: 'bg-amber-100 text-amber-700',   tag: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400' },
  sky:    { card: 'border-sky-200 hover:border-sky-300',       icon: 'bg-sky-100 text-sky-700',       tag: 'bg-sky-100 text-sky-700',       dot: 'bg-sky-400' },
  emerald:{ card: 'border-emerald-200 hover:border-emerald-300', icon: 'bg-emerald-100 text-emerald-700', tag: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  rose:   { card: 'border-rose-200 hover:border-rose-300',     icon: 'bg-rose-100 text-rose-700',     tag: 'bg-rose-100 text-rose-700',     dot: 'bg-rose-400' },
  orange: { card: 'border-orange-200 hover:border-orange-300', icon: 'bg-orange-100 text-orange-700', tag: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  pink:   { card: 'border-pink-200 hover:border-pink-300',     icon: 'bg-pink-100 text-pink-700',     tag: 'bg-pink-100 text-pink-700',     dot: 'bg-pink-400' },
  teal:   { card: 'border-teal-200 hover:border-teal-300',     icon: 'bg-teal-100 text-teal-700',     tag: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-400' },
  yellow: { card: 'border-yellow-200 hover:border-yellow-300', icon: 'bg-yellow-100 text-yellow-700', tag: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  indigo: { card: 'border-indigo-200 hover:border-indigo-300', icon: 'bg-indigo-100 text-indigo-700', tag: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400' },
};

// ── Card detail drawer ────────────────────────────────────────────────────────

function CardDrawer({ card, onClose }: { card: BacklogCard; onClose: () => void }) {
  const hue = HUE_MAP[card.hue];
  const Icon = card.icon;
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Scrim */}
      <div className="flex-1 bg-black/20" onClick={onClose} />
      {/* Panel */}
      <div className="w-[480px] bg-[#FAF8F4] border-l border-stone-200 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-stone-200 bg-white">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${hue.icon}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-foreground leading-tight">{card.title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                <span className={`w-1.5 h-1.5 rounded-full ${hue.dot}`} /> Draft
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">Phase 2</span>
              <span className="text-[10px] text-muted-foreground">Owner: {card.owner}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-stone-100 transition-colors shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5">
            {/* Summary */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5">Summary</p>
              <p className="text-[12px] text-foreground leading-relaxed">{card.summary}</p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {card.tags.map(t => (
                <span key={t} className={`px-2 py-0.5 rounded text-[10px] font-bold ${hue.tag}`}>{t}</span>
              ))}
            </div>

            {/* Dependencies */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Dependencies</p>
              <ul className="space-y-1.5">
                {card.dependencies.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-stone-400 mt-0.5 shrink-0" />
                    <span className="text-[12px] text-foreground leading-snug">{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Role Impact */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Role Impact</p>
              <div className="space-y-1.5">
                {card.roleImpact.map((r, i) => {
                  const RIcon = ROLE_ICONS[r.role] ?? User;
                  return (
                    <div key={i} className="flex items-start gap-2.5 rounded-md bg-stone-50 border border-stone-200 px-3 py-2">
                      <RIcon className="w-3.5 h-3.5 text-stone-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-foreground">{r.role}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">{r.impact}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Acceptance Criteria</p>
              <ul className="space-y-2">
                {card.acceptanceCriteria.map((ac, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-stone-400 mt-0.5 shrink-0 w-4 text-right">{i + 1}.</span>
                    <span className="text-[12px] text-foreground leading-snug">{ac}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Compact board card ────────────────────────────────────────────────────────

function BoardCard({ card, onClick }: { card: BacklogCard; onClick: () => void }) {
  const hue = HUE_MAP[card.hue];
  const Icon = card.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-lg border px-3 py-2.5 transition-all duration-150 hover:shadow-sm group ${hue.card}`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${hue.icon}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-foreground/80 transition-colors">
            {card.title}
          </p>
          <p className="text-[10px] text-muted-foreground leading-snug mt-1 line-clamp-2">
            {card.summary}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {card.tags.slice(0, 2).map(t => (
              <span key={t} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${hue.tag}`}>{t}</span>
            ))}
            {card.tags.length > 2 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-100 text-stone-500">+{card.tags.length - 2}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Phase2Backlog() {
  const [activeCard, setActiveCard] = useState<BacklogCard | null>(null);

  const columnCards = (col: Column) => CARDS.filter(c => c.column === col);

  return (
    <div className="flex flex-col h-full bg-[#FAF8F4]">
      {/* Page header */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-stone-200 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[17px] font-bold text-foreground">Phase 2 Backlog</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                Super Admin
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground max-w-2xl">
              Draft backlog for Phase 2 Trail OS features. These are planning artefacts — none are built yet.
              Click any card to see full detail including dependencies, role impact, and acceptance criteria.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className="text-[12px] font-bold text-foreground">{CARDS.length} cards</p>
              <p className="text-[10px] text-muted-foreground">{CARDS.filter(c => c.column === 'Draft').length} Drafts · Phase 2</p>
            </div>
          </div>
        </div>

        {/* Column summary chips */}
        <div className="flex items-center gap-2 mt-3">
          {COLUMNS.map(col => {
            const count = columnCards(col.id).length;
            return (
              <span key={col.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${col.headerCls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${col.dotCls}`} />
                {col.label}
                <span className="font-bold">{count}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full px-6 py-4 min-w-max">
          {COLUMNS.map(col => {
            const cards = columnCards(col.id);
            return (
              <div key={col.id} className="w-72 flex flex-col h-full">
                {/* Column header */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border ${col.headerCls} mb-2 shrink-0`}>
                  <span className={`w-2 h-2 rounded-full ${col.dotCls}`} />
                  <span className="text-[12px] font-bold">{col.label}</span>
                  <span className="ml-auto text-[11px] font-bold opacity-60">{cards.length}</span>
                </div>

                {/* Cards scroll area */}
                <ScrollArea className="flex-1 rounded-b-lg">
                  <div className="space-y-2 pb-4 pr-1">
                    {cards.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-stone-200 px-3 py-6 text-center">
                        <p className="text-[11px] text-muted-foreground/50">No cards</p>
                      </div>
                    ) : (
                      cards.map(card => (
                        <BoardCard key={card.id} card={card} onClick={() => setActiveCard(card)} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail drawer */}
      {activeCard && <CardDrawer card={activeCard} onClose={() => setActiveCard(null)} />}
    </div>
  );
}
