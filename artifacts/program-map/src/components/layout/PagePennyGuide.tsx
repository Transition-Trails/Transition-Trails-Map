import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Send, Sparkles, ArrowRight,
  CheckCircle2, AlertTriangle, Lightbulb,
  Hash, Folder, Calendar, Mail, Database, ExternalLink,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTierFlags } from '@/hooks/useTierFlags';
import { useAppContext } from '@/context/AppContext';
import { SIGNAL_COUNTS, locationToContext } from '@/data/signalCounts';

// ── Page context ───────────────────────────────────────────────────────────────

type PageCtx =
  | 'home' | 'programs' | 'penny' | 'operations'
  | 'knowledge' | 'collaboration' | 'admin' | 'digital-twin' | 'default';

function deriveCtx(loc: string): PageCtx {
  if (loc === '/' || loc === '') return 'home';
  if (loc.startsWith('/program'))      return 'programs';
  if (loc.startsWith('/penny'))        return 'penny';
  if (loc.startsWith('/operations'))   return 'operations';
  if (loc.startsWith('/knowledge'))    return 'knowledge';
  if (loc.startsWith('/collaboration')) return 'collaboration';
  if (loc.startsWith('/admin'))        return 'admin';
  if (loc.startsWith('/digital-twin') || loc.startsWith('/uom') || loc.startsWith('/governance'))
    return 'digital-twin';
  return 'default';
}

// ── Signal source config ───────────────────────────────────────────────────────

const SOURCE_ICO = {
  slack:      { Icon: Hash,     cls: 'text-[#4A154B]', bg: 'bg-[#4A154B]/10', label: 'Slack' },
  drive:      { Icon: Folder,   cls: 'text-blue-600',  bg: 'bg-blue-50',       label: 'Drive' },
  calendar:   { Icon: Calendar, cls: 'text-emerald-600', bg: 'bg-emerald-50',  label: 'Calendar' },
  email:      { Icon: Mail,     cls: 'text-amber-600', bg: 'bg-amber-50',      label: 'Email' },
  salesforce: { Icon: Database, cls: 'text-sky-600',   bg: 'bg-sky-50',        label: 'Salesforce' },
} as const;
type SigSource = keyof typeof SOURCE_ICO;

type SigItem = { urgent: boolean; source: SigSource; text: string; meta: string };

const SIGNAL_ITEMS: Record<PageCtx, SigItem[]> = {
  home: [
    { urgent: true,  source: 'slack',      text: 'Learning Coach: low confidence on Cohort 3 recap scoring',     meta: '8m ago' },
    { urgent: true,  source: 'salesforce', text: 'Trail of Mastery source docs overdue — execute phase blocked', meta: '1h ago' },
    { urgent: false, source: 'slack',      text: 'Foundations Trail Cohort 2: enrollment at 89% capacity',       meta: '2h ago' },
    { urgent: false, source: 'drive',      text: 'Sprint 3 Resume Writing materials updated',                    meta: '3h ago' },
    { urgent: false, source: 'calendar',   text: 'Sprint 3 session confirmed — Thursday 10am',                   meta: '5h ago' },
    { urgent: false, source: 'email',      text: 'Weekly brief generated — 3 cohort updates',                    meta: '6h ago' },
    { urgent: false, source: 'salesforce', text: "Explorer's Trail Cohort 3 — 3 enrollment slots open",          meta: '8h ago' },
  ],
  programs: [
    { urgent: true,  source: 'salesforce', text: 'Trail of Mastery: source documentation needed before Q3',      meta: '1h ago' },
    { urgent: false, source: 'slack',      text: "Explorer's Trail Cohort 3 — enrollment at 80%",                meta: '2h ago' },
    { urgent: false, source: 'drive',      text: 'Content standards: 4 items pending review',                    meta: '4h ago' },
    { urgent: false, source: 'calendar',   text: 'Sprint 3 review scheduled — Thursday',                         meta: '5h ago' },
  ],
  penny: [
    { urgent: true,  source: 'slack',      text: 'Learning Coach: confidence flag on Cohort 3 recap',            meta: '8m ago' },
    { urgent: false, source: 'salesforce', text: '14 capabilities pending Agentforce integration (Q3 2025)',      meta: '2h ago' },
    { urgent: false, source: 'slack',      text: 'Test Penny: 12 prototype queries this week',                   meta: '3h ago' },
    { urgent: false, source: 'drive',      text: 'Trail Quest capability spec updated',                          meta: '5h ago' },
    { urgent: false, source: 'salesforce', text: 'Penny interaction log: 234 this week',                         meta: '8h ago' },
  ],
  operations: [
    { urgent: true,  source: 'salesforce', text: 'Trail of Mastery execute phase: source docs required',         meta: '1h ago' },
    { urgent: false, source: 'slack',      text: '2 demand change requests unassigned in queue',                 meta: '3h ago' },
    { urgent: false, source: 'calendar',   text: 'Q3 sprint review not yet scheduled',                           meta: '4h ago' },
    { urgent: false, source: 'drive',      text: 'Integration readiness: 5 checklist items open',                meta: '6h ago' },
    { urgent: false, source: 'salesforce', text: 'Foundations Trail capacity alert: 89%',                        meta: '8h ago' },
  ],
  knowledge: [
    { urgent: false, source: 'drive',      text: "12 documents flagged 'needs-review'",                          meta: '2h ago' },
    { urgent: false, source: 'drive',      text: 'Source Mapping updated — RESOLVE Course Canvas',               meta: '3h ago' },
    { urgent: false, source: 'slack',      text: 'Sprint 3 materials question in #guided-trail',                 meta: '5h ago' },
    { urgent: false, source: 'salesforce', text: 'Org Memory: 234 Penny interactions logged this week',          meta: '6h ago' },
  ],
  collaboration: [
    { urgent: false, source: 'slack',      text: 'Slack activation ready — awaiting Q3 go-live',                 meta: '1h ago' },
    { urgent: false, source: 'calendar',   text: 'Sprint 3 Resume Workshop — Thursday 10am',                     meta: '2h ago' },
    { urgent: false, source: 'slack',      text: '#guided-trail-cohort-1: Week 3 message from coach',            meta: '4h ago' },
    { urgent: false, source: 'drive',      text: '7 message templates ready for testing',                        meta: '6h ago' },
  ],
  admin: [
    { urgent: false, source: 'slack',      text: 'Phase 1 readiness: 3 of 8 integration checks complete',        meta: '2h ago' },
    { urgent: false, source: 'calendar',   text: 'Q3 launch review not yet scheduled',                           meta: '4h ago' },
    { urgent: false, source: 'drive',      text: 'Secrets audit: last run 3 days ago',                           meta: '6h ago' },
  ],
  'digital-twin': [
    { urgent: false, source: 'salesforce', text: 'Digital Compass: 6 object relationships unmapped',             meta: '3h ago' },
    { urgent: false, source: 'drive',      text: 'Governance policy document updated',                           meta: '5h ago' },
    { urgent: false, source: 'slack',      text: '#trail-os-ops: governance review thread active',               meta: '8h ago' },
  ],
  default: [
    { urgent: false, source: 'slack',      text: 'No context-specific signals for this page yet',                meta: '' },
  ],
};

// ── Penny content definitions ──────────────────────────────────────────────────

type AttItem = { icon: typeof CheckCircle2; bg: string; iconCls: string; text: string };
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
      'Trail of Mastery · Execute phase needs source documentation before Q3 review',
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
    powerCanned:    "Current priority: Trail of Mastery execute phase needs source documentation before Q3. 2 change requests are unassigned. Penny flagged 1 Learning Coach confidence issue — review at /penny/intelligence.",
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
      { label: 'Salesforce mapping', path: '/program/salesforce' },
      { label: 'Program blueprint',  path: '/program/blueprint' },
    ],
    everydayCanned: "Each program has a structured curriculum, cohort schedule, and Penny support built in. Your active programs have all materials for this sprint uploaded.",
    powerCanned:    "Programs overview: Explorer's Trail has the most complete Salesforce mapping. Trail of Mastery execute phase needs source documentation before Q3 review. Content standards flagged 4 items needing updates.",
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
      'Agentforce integration planned Q3 — live Salesforce data coming',
    ],
    attentionItems: [
      { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200',       iconCls: 'text-amber-500',   text: '1 Learning Coach confidence flag this week' },
      { icon: CheckCircle2,  bg: 'bg-emerald-50 border-emerald-200', iconCls: 'text-emerald-500', text: 'Test Penny is available for prototype queries' },
    ],
    everydaySteps: [
      { label: 'Test Penny',          path: '/penny/test' },
      { label: 'My learner profile',  path: '/penny/learners' },
    ],
    powerSteps: [
      { label: 'Capability map',         path: '/penny' },
      { label: 'Test Penny',             path: '/penny/test' },
      { label: 'Intelligence dashboard', path: '/penny/intelligence' },
    ],
    everydayCanned: "I'm Penny — here to guide you through your program, help find resources, and answer questions. Try asking about your current sprint, upcoming sessions, or anything in the Knowledge Library.",
    powerCanned:    "Penny status: Learning Coach, Trail Quest, and Assessment capabilities are in prototype. 14 more planned pending Agentforce integration in Q3. The confidence flag on Learning Coach relates to Cohort 3 recap scoring — review at /penny/intelligence.",
  },
  operations: {
    everydayInsights: [
      'All 5 programs are currently running as planned',
      'Next major milestone: Guided Trail Sprint 3 on Thursday',
    ],
    powerInsights: [
      'Health status: 3 active, 1 in discovery, 1 in planning',
      'Integration readiness: Salesforce connected (prototype), Google Workspace Q3',
      '5 open demand items — 2 flagged for follow-up',
      'Trail of Mastery execute phase needs attention before Q3',
    ],
    attentionItems: [
      { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200',   iconCls: 'text-amber-500', text: 'Execute phase — source documentation needed' },
      { icon: Lightbulb,     bg: 'bg-sky-50 border-sky-200',        iconCls: 'text-sky-500',   text: 'Schedule Trail of Mastery Q3 sprint review' },
    ],
    everydaySteps: [{ label: 'View program status', path: '/operations' }],
    powerSteps: [
      { label: 'Health indicators',     path: '/operations/health' },
      { label: 'Integration readiness', path: '/operations/integrations' },
      { label: 'Demand overview',       path: '/operations/demand' },
    ],
    everydayCanned: "Operations are running normally. Guided Trail Cohort 1 is in Week 3 of 8 and on track. Your next milestone is Sprint 3 on Thursday.",
    powerCanned:    "Ops summary: 3 programs in active delivery. Trail of Mastery execute phase is top priority — source documentation needed before Q3. Google Workspace SSO coming Q3.",
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
      { label: 'Search knowledge',       path: '/knowledge/search' },
    ],
    powerSteps: [
      { label: 'Source documents', path: '/knowledge' },
      { label: 'Relationships',    path: '/knowledge/relationships' },
    ],
    everydayCanned: "The Knowledge Library has all program documents, templates, and resources. Sprint 3 Resume Writing materials were just updated. Use Knowledge Search to find anything specific.",
    powerCanned:    "Knowledge health: 47 active docs, 12 flagged for review. Source mapping updated 3h ago — RESOLVE Course Canvas is current. Org Memory shows 234 Penny interactions this week.",
  },
  collaboration: {
    everydayInsights: [
      'Google Calendar shows your next session: Sprint 3 Resume Workshop — Thursday',
      'Slack channels for your programs are coming Q3 2025',
      'Penny will send session reminders once Slack integration is live',
    ],
    powerInsights: [
      'Slack integration: prototype-ready, activation planned Q3 2025',
      'Google Calendar: connected for timing context; event-write coming Q3',
      '3 communication routes defined — all in prototype status',
      '7 message templates ready for testing',
    ],
    attentionItems: [
      { icon: Lightbulb,    bg: 'bg-sky-50 border-sky-200',          iconCls: 'text-sky-500',     text: 'Slack activation ready — awaiting Q3 go-live' },
      { icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-200', iconCls: 'text-emerald-500', text: 'Google Calendar connected for session timing' },
    ],
    everydaySteps: [{ label: 'View Google Calendar', path: '/collaboration/calendar' }],
    powerSteps: [
      { label: 'Slack integration', path: '/collaboration/slack' },
      { label: 'Message templates', path: '/collaboration/templates' },
    ],
    everydayCanned: "Google Calendar is connected and shows your upcoming sessions. Slack channels for your programs will be activated in Q3 2025 — Penny will send reminders and updates through there.",
    powerCanned:    "Collaboration stack: Google Calendar is connected. Slack is prototype-ready — Q3 go-live. 3 communication routes and 7 message templates defined and ready to test.",
  },
  admin: {
    everydayInsights: [],
    powerInsights: [
      'Phase 1 readiness: 3 of 8 integration checks complete',
      'Google OAuth setup available — configure at /admin/google-oauth',
      'Access roles matrix reviewed and up to date',
    ],
    attentionItems: [
      { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200', iconCls: 'text-amber-500', text: 'Phase 1 readiness: 3 of 8 items complete' },
    ],
    everydaySteps: [],
    powerSteps: [
      { label: 'Phase 1 readiness', path: '/admin/phase1-readiness' },
      { label: 'Google Auth setup', path: '/admin/google-oauth' },
    ],
    everydayCanned: "",
    powerCanned:    "Admin status: Phase 1 readiness at 3 of 8 checks. Google OAuth is configured and ready to test. Next: complete Google Workspace SSO before Q3 launch.",
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
    powerInsights:    ['Select any item to open its knowledge brief', 'Trail Insights shows context for this page'],
    attentionItems: [],
    everydaySteps: [],
    powerSteps: [],
    everydayCanned: "I'm here to help with anything on this page — programs, resources, or how Trail OS works.",
    powerCanned:    "Ask me about specific items, relationships, or how this section connects to the broader Trail OS system.",
  },
};

// ── Component ──────────────────────────────────────────────────────────────────

export function PagePennyGuide() {
  const [location, setLocation] = useLocation();
  const { isEveryday, isPowerOrAbove } = useTierFlags();
  const { pennyPanelTab, setPennyPanelTab } = useAppContext();
  const [query, setQuery]       = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ctx         = deriveCtx(location);
  const content     = CONTENT[ctx];
  const signalCtx   = locationToContext(location);
  const nudgeCounts = SIGNAL_COUNTS[signalCtx] ?? null;
  const signalItems = SIGNAL_ITEMS[ctx] ?? SIGNAL_ITEMS.default;
  const urgentCount = nudgeCounts?.urgent ?? 0;
  const totalCount  = nudgeCounts?.total ?? signalItems.length;

  const insights = isEveryday ? content.everydayInsights : content.powerInsights;
  const steps    = isEveryday ? content.everydaySteps    : content.powerSteps;
  const canned   = isEveryday ? content.everydayCanned   : content.powerCanned;

  function handleAsk() {
    if (!query.trim() || !canned) return;
    setResponse(canned);
    setQuery('');
  }

  // ── Tab bar ──────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'penny'   as const, label: 'Penny',          badge: null,       urgent: false },
    { id: 'signals' as const, label: 'Trail Insights', badge: totalCount, urgent: urgentCount > 0 },
    { id: 'ask'     as const, label: 'Ask',             badge: null,       urgent: false },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-border/40 bg-white/80">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setPennyPanelTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-all duration-150 ${
              pennyPanelTab === tab.id
                ? 'border-violet-500 text-violet-700 bg-violet-50/40'
                : 'border-transparent text-muted-foreground/70 hover:text-foreground hover:border-border/50'
            }`}
          >
            {tab.label}
            {tab.badge !== null && tab.badge > 0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                tab.urgent
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-muted/80 text-muted-foreground border border-border/60'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Penny tab ─────────────────────────────────────────────────────── */}
      {pennyPanelTab === 'penny' && (
        isEveryday && insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center p-5 h-full">
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-500" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Ask Penny a question or select an item to open its brief.
            </p>
            <button onClick={() => setPennyPanelTab('ask')} className="flex items-center gap-1 text-[10px] font-medium text-violet-600 hover:underline">
              Open Ask <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">

              {/* Insights */}
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

              {/* Next steps */}
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
                    <span className="font-semibold text-muted-foreground/70">Prototype mode</span> — Salesforce, Agentforce, and GA4 connections planned Q3–Q4 2025. Select any item to open its Knowledge Brief.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )
      )}

      {/* ── Trail Insights tab ────────────────────────────────────────────── */}
      {pennyPanelTab === 'signals' && (
        <ScrollArea className="h-full">
          <div className="p-4 space-y-3">

            {/* Count summary */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Trail Signals</p>
              <div className="rounded-lg border border-[#4A154B]/15 bg-[#4A154B]/[0.03] p-3">
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-2xl font-bold text-foreground">{totalCount}</span>
                  <span className="text-[11px] text-muted-foreground">signals</span>
                  {urgentCount > 0 && (
                    <>
                      <span className="text-muted-foreground/40 mx-0.5">·</span>
                      <span className="text-[11px] font-semibold text-amber-600">{urgentCount} urgent</span>
                    </>
                  )}
                </div>

                {/* Source chips */}
                {nudgeCounts && (
                  <div className="flex flex-wrap gap-1">
                    {(Object.entries(nudgeCounts.sources) as [SigSource, number][])
                      .filter(([, n]) => n > 0)
                      .map(([src, n]) => {
                        const { Icon, cls, bg, label } = SOURCE_ICO[src];
                        return (
                          <span key={src} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${bg}`}>
                            <Icon className={`w-2.5 h-2.5 ${cls}`} />
                            <span className={cls}>{label} {n}</span>
                          </span>
                        );
                      })
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Signal item list */}
            <div className="space-y-1">
              {signalItems.map((item, i) => {
                const { Icon, cls, bg } = SOURCE_ICO[item.source];
                return (
                  <div key={i} className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg border ${
                    item.urgent ? 'border-amber-200 bg-amber-50/60' : 'border-border/50 bg-white/60'
                  }`}>
                    <span className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${bg}`}>
                      <Icon className={`w-3 h-3 ${cls}`} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] leading-snug ${item.urgent ? 'font-medium text-amber-900' : 'text-foreground'}`}>
                        {item.urgent && <span className="text-amber-600 font-bold mr-1">!</span>}
                        {item.text}
                      </p>
                      {item.meta && <p className="text-[9px] text-muted-foreground/60 mt-0.5">{item.meta}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Workspace link */}
            <a
              href="https://transitiontrails.slack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[#4A154B] text-white text-[10px] font-bold hover:bg-[#3D0F3E] transition-colors"
            >
              <Hash className="w-3.5 h-3.5" />
              Open Transition Trails Workspace
              <ExternalLink className="w-3 h-3 ml-auto" />
            </a>

            <p className="text-[9px] text-muted-foreground/40 text-center leading-snug">
              Phase 1 · Prototype signal data — Live Slack/Drive/Salesforce Q3 2025
            </p>
          </div>
        </ScrollArea>
      )}

      {/* ── Ask tab ───────────────────────────────────────────────────────── */}
      {pennyPanelTab === 'ask' && (
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">

            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-violet-600/70 mb-2">Ask Penny</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isEveryday
                  ? 'Ask me about your programs, upcoming sessions, or anything in the Knowledge Library.'
                  : 'Ask me about this page, system relationships, or operational context across Trail OS.'}
              </p>
            </div>

            {/* Response */}
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

            {/* Input */}
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAsk()}
                  placeholder={`Ask Penny about ${ctx === 'home' ? 'your dashboard' : ctx === 'default' ? 'this page' : ctx}…`}
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
                Phase 1 · Prototype responses — Live Agentforce Q3 2025
              </p>
            </div>

            {/* Quick question suggestions */}
            {!response && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1.5">Try asking</p>
                <div className="space-y-1">
                  {(isEveryday
                    ? ["What's happening with my programs?", "What do I need to do this week?", "Find Sprint 3 materials"]
                    : ["What needs attention today?", "What's the status of Trail of Mastery?", "Show me Penny activity this week"]
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
