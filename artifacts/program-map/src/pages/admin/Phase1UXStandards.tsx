import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Navigation, Layout, Users, PanelRight, Cpu, Type,
  Monitor, Palette, Smartphone, CheckCircle2, XCircle,
  ListFilter, Wand2, Database,
  type LucideIcon,
} from 'lucide-react';

interface Standard {
  id: string;
  rule: string;
  rationale: string;
  doExample?: string;
  dontExample?: string;
}

interface Section {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  badge: string;
  summary: string;
  standards: Standard[];
}

const SECTIONS: Section[] = [
  {
    id: 'navigation',
    title: 'Navigation',
    icon: Navigation,
    color: 'emerald',
    badge: 'Core',
    summary: 'Everyday Users reach their content in one click. No accordion expansion, no sub-page choices.',
    standards: [
      {
        id: 'nav-1',
        rule: 'One useful page per major area for Everyday Users.',
        rationale: 'Everyday Users have one job per area. Surfacing sub-pages creates decision overhead and implies the user must choose the right one.',
        doExample: 'Clicking "Operations" lands directly on the Operations Overview.',
        dontExample: 'Showing "Executive Overview" and "Health Indicators" as separate choices in the sidebar.',
      },
      {
        id: 'nav-2',
        rule: 'One-click navigation — no expand-then-select for Everyday Users.',
        rationale: 'The sidebar group item itself is the navigation target. Everyday Users should never need to expand a group to find a link.',
        doExample: 'All sub-items for an area have minTier: "power"; the group pathPrefix IS the destination.',
        dontExample: 'Requiring the user to click "Operations" to expand, then click "Overview" to navigate.',
      },
      {
        id: 'nav-3',
        rule: 'No duplicate sub-pages unless content is genuinely distinct and role-appropriate.',
        rationale: 'Pages like "Executive Overview" vs "Health Indicators" overlap for Everyday Users. Consolidate into one role-appropriate view.',
        doExample: 'A single Operations page surfaces the Everyday User\u2019s relevant metrics and attention items.',
        dontExample: 'Two Operations sub-pages showing similar program health data at different granularity.',
      },
      {
        id: 'nav-4',
        rule: 'Power / Admin users retain full sub-navigation depth.',
        rationale: 'Power users and Admins need to navigate directly to specific tools. Their expanded sidebar is a feature, not a problem.',
        doExample: 'Power users see all Operations sub-items in the sidebar and can deep-link to any tab.',
        dontExample: 'Hiding sub-nav for Power users to match Everyday simplicity.',
      },
    ],
  },
  {
    id: 'layout',
    title: 'Layout & Headers',
    icon: Layout,
    color: 'sky',
    badge: 'Core',
    summary: 'Compact headers get out of the way. Content starts close to the top. Two-column layouts below metrics.',
    standards: [
      {
        id: 'lay-1',
        rule: 'Compact page headers — no large h1 headings on content pages.',
        rationale: 'An Everyday User navigated here intentionally. A large heading restates what they just clicked and wastes vertical space.',
        doExample: 'Hub title inline with icon at 14–15px, description on the same row or immediately below.',
        dontExample: 'A standalone h1 "Operations" at the top of the Operations page.',
      },
      {
        id: 'lay-2',
        rule: 'No tab bar when only one tab is visible for the current role.',
        rationale: 'A tab bar with one item is visual noise. HubShell suppresses the bar automatically when tabs.length === 1.',
        doExample: 'Everyday Users see no tab bar on Operations, Programs, Penny, Knowledge, or Collaboration.',
        dontExample: 'Showing a single-item tab bar "Overview" above a content area.',
      },
      {
        id: 'lay-3',
        rule: 'Two-column content layout below the metrics strip where useful.',
        rationale: 'Wide desktop screens waste space with single-column content. Two columns allow related-but-distinct content side-by-side.',
        doExample: 'Home: left col = Recent Activity + Attention; right col = Program Portfolio + Demand.',
        dontExample: 'A single full-width column of stacked cards on a 1280px screen.',
      },
      {
        id: 'lay-4',
        rule: 'Cards are jumping-off points, not full reports.',
        rationale: 'Cards should trigger action or navigation, not contain all the detail. Detail lives in the workspace or right panel.',
        doExample: 'A Program card shows name, status, and a one-line summary. Clicking opens the program workspace.',
        dontExample: 'A card with a full enrollment breakdown, multi-paragraph notes, and nested sub-items.',
      },
      {
        id: 'lay-5',
        rule: 'No modal or slide-over overlays for primary content.',
        rationale: 'Overlays block context, trap keyboard focus, and break the split-view layout. Content belongs in a workspace pane or a routed page.',
        doExample: 'Clicking a program navigates to /program/:id which renders in the main content area.',
        dontExample: 'Opening program detail in a modal sheet on top of the list.',
      },
    ],
  },
  {
    id: 'roles',
    title: 'Role-Aware Views',
    icon: Users,
    color: 'violet',
    badge: 'Core',
    summary: 'Three distinct tiers: Everyday User, Penny Power User, Admin/Super Admin. Each tier sees only what is useful to them.',
    standards: [
      {
        id: 'role-1',
        rule: 'Three tiers: Everyday User → Penny Power User → Admin/Super Admin.',
        rationale: 'The role system is the primary UX filter. Content, navigation depth, and available actions should all respond to tier.',
        doExample: 'useTierFlags() → { isEveryday, isPowerOrAbove, isAdminOrAbove }. Gate components on these flags.',
        dontExample: 'Showing the same UI to all roles and relying on text labels to communicate access level.',
      },
      {
        id: 'role-2',
        rule: 'Technical and admin language is hidden from Everyday Users.',
        rationale: 'Terms like "Integration Readiness", "Salesforce Architecture", "Prompt Studio", "Org Memory" are not meaningful to Everyday Users and create anxiety.',
        doExample: '"My Programs" instead of "Programs", "My Learners" instead of "Learners".',
        dontExample: 'Showing a sidebar item labeled "Salesforce Arch" to an Everyday User.',
      },
      {
        id: 'role-3',
        rule: 'Integration status notices and admin tooling are gated to Admin+ only.',
        rationale: 'In-progress status notices ("connecting to Salesforce…") are meaningful to Admins monitoring build progress, not to Everyday Users doing their job.',
        doExample: 'Wrap integration notice banners in isAdminOrAbove checks.',
        dontExample: 'Showing "Salesforce connection pending" to all users.',
      },
    ],
  },
  {
    id: 'right-panel',
    title: 'Right-Side Support Panel',
    icon: PanelRight,
    color: 'amber',
    badge: 'Persistent',
    summary: 'Ask Penny + Penny Insights + Trail Signals is the persistent right-side support surface. Never remove it, never replace it with inline alerts.',
    standards: [
      {
        id: 'rp-1',
        rule: 'Ask Penny / Penny Insights / Trail Signals is always mounted on the right.',
        rationale: 'The right panel is the user\u2019s intelligent advisor. It should be present regardless of which area the user is in.',
        doExample: 'AppShell mounts ContextPanel unconditionally. The panel collapses gracefully when no context is set.',
        dontExample: 'Removing or hiding the right panel on specific pages to "simplify" the view.',
      },
      {
        id: 'rp-2',
        rule: 'Trail Signals is the evidence layer behind Penny Insights, not a standalone alert feed.',
        rationale: 'Penny synthesizes signals into insights. Trail Signals surfaces the raw evidence when the user wants to drill in. The hierarchy is: Insight → Signal → Detail.',
        doExample: 'Penny Insights: "Explorer\'s Trail Cohort 3 is 12 of 15 enrolled." Trail Signal: raw enrollment metric with source.',
        dontExample: 'Surfacing Trail Signals as top-level notifications independent of Penny\'s insight context.',
      },
      {
        id: 'rp-3',
        rule: 'The right panel replaces modals and slide-overs for contextual detail.',
        rationale: 'When a user needs more detail about something Penny mentioned, that detail surfaces in the right panel — not in a modal that blocks the main view.',
        doExample: 'Clicking a Trail Signal expands the detail inline in the right panel.',
        dontExample: 'Opening a modal to show the full data behind a Penny insight.',
      },
      {
        id: 'rp-4',
        rule: 'Penny panels that are embedded inside a page (not the global slide-over) start in a "Knowledge Brief" dormant state and activate only on explicit user action.',
        rationale: 'Auto-firing AI analysis when the user selects a record is disruptive and wastes API calls. The Knowledge Brief state shows step context and a "Focus with Penny" CTA — Penny activates when the user is ready.',
        doExample: 'Program Config wizard: selecting a program loads context silently; the right panel shows a Knowledge Brief until "Focus with Penny" is clicked.',
        dontExample: 'Automatically sending a Penny prompt and opening the chat panel the moment a user clicks a list item.',
      },
    ],
  },
  {
    id: 'wizard',
    title: 'Wizard & Multi-step Flows',
    icon: Wand2,
    color: 'teal',
    badge: 'Interaction',
    summary: '60/40 split for guided admin flows — wizard steps on the left, Penny guidance on the right. Steps are freely navigable once prerequisites are met.',
    standards: [
      {
        id: 'wiz-1',
        rule: 'Admin wizards use a 60/40 split: form steps left, Penny guidance right.',
        rationale: 'Guided flows benefit from AI assistance alongside the form, not after. The 60/40 split keeps guidance visible without crowding the input area.',
        doExample: 'Program Config: step panel at 60%, PennyGuidancePanel at 40% with dormant Knowledge Brief state.',
        dontExample: 'Putting Penny guidance below the form where it is not visible while filling in fields.',
      },
      {
        id: 'wiz-2',
        rule: 'Step indicators are clickable once the prerequisite step is complete.',
        rationale: 'Locking users into a linear flow after they have already satisfied the prerequisite is frustrating. Free navigation speeds up review and correction.',
        doExample: 'StepIndicator circles become clickable buttons after a program is selected; clicking loads the target step\'s data automatically.',
        dontExample: 'Requiring the user to click "Next" through every preceding step to return to Step 3.',
      },
      {
        id: 'wiz-3',
        rule: 'Optional steps are visually marked and can be skipped — the step indicator reflects the skipped state.',
        rationale: 'Not all programs have cohorts. Presenting a mandatory cohort step for ongoing programs adds confusion and blocks progress.',
        doExample: 'When "isCohortBased" is off, the Cohorts step shows a strikethrough label in the step indicator and is bypassed in the advance logic.',
        dontExample: 'Hiding the step entirely, leaving users unsure whether they missed something.',
      },
      {
        id: 'wiz-4',
        rule: 'The Review step is a validation gate, not just a summary.',
        rationale: 'Allowing a save action before required data is in place creates broken records. The Review step checks each section and surfaces specific "Fix →" links.',
        doExample: 'Review renders a checklist: Program ✓, Cohorts (skipped), Course ✗. The "Save" button is disabled until all required sections pass. Each failing section has a "Fix →" jump link.',
        dontExample: 'A "Summary" tab that shows what was entered but allows saving regardless of completeness.',
      },
    ],
  },
  {
    id: 'filters',
    title: 'Filter & Selection Patterns',
    icon: ListFilter,
    color: 'indigo',
    badge: 'Interaction',
    summary: 'Pill buttons for multi-state filters. Create New always opens a blank form. Selections never pre-populate creation forms.',
    standards: [
      {
        id: 'fil-1',
        rule: 'Use horizontal pill buttons for filters with 3 or more states.',
        rationale: 'A boolean toggle can only express 2 states. When a filter has 3+ options (All / Active / Archived / Discovery), pill buttons make all options visible at once and communicate the current selection clearly.',
        doExample: 'Status filter: [All] [Discovery] [Active] [Completed / Cancelled] — active pill highlighted in primary green.',
        dontExample: 'A single "Show completed" toggle that hides the full range of status options.',
      },
      {
        id: 'fil-2',
        rule: '"Create New" always opens with a completely blank form, regardless of what is currently selected.',
        rationale: 'A creation form pre-populated with another record\'s data misleads the user into thinking they are editing that record, and risks accidentally saving incorrect data to a new entry.',
        doExample: 'The "+ Create New" button explicitly resets all form fields to empty defaults before opening the form panel.',
        dontExample: 'Toggling the creation form open while it still contains the selected program\'s name and dates.',
      },
      {
        id: 'fil-3',
        rule: 'Search and status filters compose — both apply simultaneously.',
        rationale: 'Users frequently need to search within a filtered subset (e.g. "find active programs with \'Trail\' in the name"). Treating search and filter as separate modes forces extra steps.',
        doExample: 'Typing in the search box while "Active" is selected shows only active programs matching the search term.',
        dontExample: 'Clearing the status filter when the user starts typing, or ignoring the search when a filter is active.',
      },
    ],
  },
  {
    id: 'live-data',
    title: 'Live Data Display',
    icon: Database,
    color: 'rose',
    badge: 'Data',
    summary: 'Always show human-readable values. Never expose raw Salesforce IDs or system keys in the UI.',
    standards: [
      {
        id: 'dat-1',
        rule: 'Resolve Salesforce lookup IDs to names before rendering.',
        rationale: 'A Salesforce User ID (e.g. 005Hp00000jVjh8IAC) is meaningless to a user. All lookup fields must be resolved to their human-readable Name at the API layer via SOQL relationship traversal.',
        doExample: 'SELECT Program_Manager__r.Name FROM pmdm__Program__c — return Program_Manager_Name in the API response; display that field in the UI.',
        dontExample: 'Rendering the raw Manager ID "005Hp00000jVjh8IAC" in the program detail card.',
      },
      {
        id: 'dat-2',
        rule: 'Resolve lookups at the API layer, not the frontend.',
        rationale: 'Fetching a User record on the frontend to resolve a name adds a second round trip and couples the component to Salesforce schema. SOQL relationship traversal does it in one query.',
        doExample: 'API route uses Program_Manager__r.Name in the SOQL SELECT and flattens it to Program_Manager_Name in the JSON response.',
        dontExample: 'Frontend component receives a raw ID, then makes a second fetch to /api/users/:id to look up the name.',
      },
      {
        id: 'dat-3',
        rule: 'Strip HTML tags from Salesforce rich-text fields before rendering in non-rich-text contexts.',
        rationale: 'Salesforce rich-text fields (Description, Goals, etc.) may contain HTML markup. Rendering raw HTML in a plain text div shows escaped tags to the user.',
        doExample: 'API or frontend helper: value.replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim() before showing in a plain text element.',
        dontExample: 'Displaying "Provide &lt;b&gt;members&lt;/b&gt; with support" in a standard text node.',
      },
    ],
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure vs Visible Tools',
    icon: Cpu,
    color: 'orange',
    badge: 'Architecture',
    summary: 'Digital Twin and Context Engine power the experience invisibly for Everyday Users. Admins and Power Users interact with them directly.',
    standards: [
      {
        id: 'inf-1',
        rule: 'Digital Twin is infrastructure for Everyday Users, a visible tool for Admins.',
        rationale: 'The Digital Twin enriches context, surfaces relationships, and powers Penny insights behind the scenes. Only Admins and Power Users need to inspect the graph directly.',
        doExample: 'Digital Twin sidebar group has minTier: "power". Everyday Users benefit from it without seeing it.',
        dontExample: 'Surfacing a "Digital Twin" link in the Everyday User sidebar.',
      },
      {
        id: 'inf-2',
        rule: 'Context Engine is infrastructure for Everyday Users, a visible tool for Admins.',
        rationale: 'Context Engine drives workspace context switching and the right panel. Everyday Users experience its output (relevant context in the panel), not its configuration.',
        doExample: 'Context Engine sidebar item is gated to power+. Everyday Users see their workspace context populated automatically.',
        dontExample: 'Showing a "Context Engine" option to Everyday Users who have no reason to configure it.',
      },
    ],
  },
  {
    id: 'language',
    title: 'Language Standards',
    icon: Type,
    color: 'slate',
    badge: 'Copy',
    summary: 'Branded terms live in terminology.ts. Use plain language for Everyday Users. Save technical terms for Power/Admin surfaces.',
    standards: [
      {
        id: 'lng-1',
        rule: 'All branded UI labels are defined in src/config/terminology.ts.',
        rationale: 'Centralizing terms prevents inconsistency. "Trail Signals", "Knowledge Brief", "Penny" as a product name — these must come from one source of truth.',
        doExample: 'import { TERMS } from "@/config/terminology"; then use TERMS.trailSignals.',
        dontExample: 'Hardcoding "Trail Signals" as a string literal in multiple components.',
      },
      {
        id: 'lng-2',
        rule: 'Page titles and section headers for Everyday Users use plain, task-oriented language.',
        rationale: 'Internal product names, architecture terms, and system labels are not helpful to task-focused Everyday Users.',
        doExample: '"Your programs", "Learner sessions this week", "Items needing attention".',
        dontExample: '"Executive Overview", "Integration Readiness", "Org Memory", "Prompt Studio".',
      },
    ],
  },
  {
    id: 'responsive',
    title: 'Desktop Responsiveness',
    icon: Monitor,
    color: 'sky',
    badge: 'Layout',
    summary: 'Three desktop breakpoints: full (≥1280px), split (960–1279px), compact (768–959px). Mobile is a separate future experience.',
    standards: [
      {
        id: 'res-1',
        rule: 'Desktop layout has three breakpoints: full / split / compact.',
        rationale: 'The split-view layout (main content + right panel) must function across a range of desktop screen widths. The right panel collapses at split, hides at compact.',
        doExample: 'Full: sidebar 220px + main + 320px right panel. Split: sidebar 48px (icons) + main + collapsed panel. Compact: full-width main, no sidebar.',
        dontExample: 'Adding mobile-specific CSS that forces layout changes on 768px screens used in desktop split-view.',
      },
      {
        id: 'res-2',
        rule: 'Trail OS is a desktop-first internal operating platform. Do not compromise the desktop UI to serve mobile.',
        rationale: 'Attempting to make the current architecture work on mobile phones will degrade both experiences. A dedicated mobile experience is the correct path.',
        doExample: 'Show a "Mobile experience coming soon" message on screens below 768px.',
        dontExample: 'Adding hamburger menus, bottom nav bars, or touch-sized tap targets to the desktop layout.',
      },
      {
        id: 'res-3',
        rule: 'Super Admin preview and Google Groups access direction are preserved across all breakpoints.',
        rationale: 'Admin tools must remain accessible and functional on the desktop breakpoints used for administration.',
        doExample: 'Super Admin role switcher (UserProfileButton) and Google Groups setup flow test-verified on all three desktop breakpoints.',
        dontExample: 'Hiding admin tools behind breakpoint-specific CSS that makes them inaccessible at split-view width.',
      },
    ],
  },
  {
    id: 'visual',
    title: 'Visual & Styling',
    icon: Palette,
    color: 'violet',
    badge: 'Design',
    summary: 'Trail Cream background, shadcn/ui tokens, Tailwind utilities. No custom color values outside the token system.',
    standards: [
      {
        id: 'vis-1',
        rule: 'Trail Cream (hsl(45 30% 96%)) is the app background. bg-background always resolves to Trail Cream.',
        rationale: 'The warm off-white creates the calm, focused feel of the platform. It differentiates Trail OS from generic enterprise tools that use pure white.',
        doExample: 'Set background: "45 30% 96%" in CSS vars. Use bg-background / bg-card throughout.',
        dontExample: 'Using bg-white, bg-gray-50, or #ffffff as a background in any new component.',
      },
      {
        id: 'vis-2',
        rule: 'Use shadcn/ui design tokens (bg-card, text-foreground, text-muted-foreground, border) for all new components.',
        rationale: 'Token-based styling ensures components automatically adapt to the theme. Hard-coded colors break in dark mode and resist global theme changes.',
        doExample: 'className="bg-card border rounded-xl text-foreground".',
        dontExample: 'className="bg-white border border-gray-200 text-gray-900".',
      },
      {
        id: 'vis-3',
        rule: 'Status colors follow the platform convention: emerald = healthy/complete, amber = warning/at-risk, rose = critical/blocked, sky = informational.',
        rationale: 'Consistent color semantics let users read status at a glance without reading labels.',
        doExample: 'A critical attention item uses text-[#A93F2F] / bg-[#FBEAE6]. An on-track item uses text-[#2F6B3F] / bg-[#E6F0EA].',
        dontExample: 'Using red for some critical states and orange for others, or using blue for both informational and success states.',
      },
    ],
  },
  {
    id: 'mobile',
    title: 'Mobile — Separate Future Experience',
    icon: Smartphone,
    color: 'stone',
    badge: 'Future',
    summary: 'A dedicated mobile experience will be built separately. The desktop design must not be compromised to serve mobile.',
    standards: [
      {
        id: 'mob-1',
        rule: 'A separate native or responsive-mobile app will be built for mobile users.',
        rationale: 'Trail OS has a fundamentally different information density, navigation model, and interaction pattern than what works on a phone. Trying to bridge both with CSS breakpoints produces a degraded experience on both.',
        doExample: 'Trail OS ships as a desktop-only platform. Mobile users see a "coming soon" screen. A mobile experience is scoped as a separate future deliverable.',
        dontExample: 'Adding @media (max-width: 640px) rules to the desktop shell to "support mobile".',
      },
      {
        id: 'mob-2',
        rule: 'Do not add touch-target sizing, bottom navigation, or hamburger menus to the desktop UI.',
        rationale: 'These patterns actively interfere with mouse-driven desktop UX (larger touch targets reduce density; hamburger menus hide navigation that should be persistent).',
        doExample: 'Keep the 220px persistent sidebar and 8px-padded interactive elements on desktop.',
        dontExample: 'Replacing the sidebar with a hamburger menu "so it works on mobile too".',
      },
    ],
  },
];

const COLOR_MAP: Record<string, { bg: string; icon: string; badge: string; border: string }> = {
  emerald: { bg: 'bg-[#E6F0EA]', icon: 'text-[#2F6B3F]', badge: 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]', border: 'border-[#9FC3AE]' },
  sky:     { bg: 'bg-[#EDF5F8]',     icon: 'text-[#2F6F7E]',     badge: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',             border: 'border-[#7FAFC6]' },
  violet:  { bg: 'bg-[#EDF5F8]',  icon: 'text-[#2F6F7E]',  badge: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',    border: 'border-[#7FAFC6]' },
  amber:   { bg: 'bg-[#FFF3E0]',   icon: 'text-[#CC8400]',   badge: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',       border: 'border-[#FFD08A]' },
  rose:    { bg: 'bg-[#FBEAE6]',    icon: 'text-[#A93F2F]',    badge: 'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]',          border: 'border-[#E8B9B4]' },
  teal:    { bg: 'bg-[#E6F0EA]',    icon: 'text-[#2F6B3F]',    badge: 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]',          border: 'border-[#9FC3AE]' },
  indigo:  { bg: 'bg-[#EDF5F8]',  icon: 'text-[#2F6F7E]',  badge: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',    border: 'border-[#7FAFC6]' },
  orange:  { bg: 'bg-[#FFF3E0]',  icon: 'text-[#CC8400]',  badge: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',    border: 'border-[#FFD08A]' },
  slate:   { bg: 'bg-slate-50',   icon: 'text-slate-600',   badge: 'bg-slate-100 text-slate-600 border-slate-200',       border: 'border-slate-200' },
  stone:   { bg: 'bg-stone-50',   icon: 'text-stone-600',   badge: 'bg-stone-100 text-stone-600 border-stone-200',       border: 'border-stone-200' },
};

function StandardRow({ std }: { std: Standard }) {
  return (
    <div className="py-3.5 border-b last:border-0">
      <p className="text-[13px] font-semibold text-foreground leading-snug mb-1">{std.rule}</p>
      <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">{std.rationale}</p>
      {(std.doExample || std.dontExample) && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {std.doExample && (
            <div className="flex gap-1.5 rounded-lg bg-[#E6F0EA] border border-[#E6F0EA] px-2.5 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F] mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-[#245531] leading-relaxed">{std.doExample}</p>
            </div>
          )}
          {std.dontExample && (
            <div className="flex gap-1.5 rounded-lg bg-[#FBEAE6] border border-[#FBEAE6] px-2.5 py-2">
              <XCircle className="w-3.5 h-3.5 text-[#A93F2F] mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-[#A93F2F] leading-relaxed">{std.dontExample}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  const c = COLOR_MAP[section.color] ?? COLOR_MAP['slate'];
  const Icon = section.icon;
  return (
    <div className={`rounded-xl border-2 ${c.border} bg-card overflow-hidden`}>
      <div className={`flex items-start gap-3 px-4 py-3.5 ${c.bg} border-b ${c.border}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg} ${c.icon}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[13px] font-bold text-foreground">{section.title}</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${c.badge}`}>{section.badge}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">{section.summary}</p>
        </div>
        <div className="text-[11px] font-semibold text-muted-foreground flex-shrink-0 pt-0.5">
          {section.standards.length} rule{section.standards.length !== 1 ? 's' : ''}
        </div>
      </div>
      <div className="px-4">
        {section.standards.map(std => (
          <StandardRow key={std.id} std={std} />
        ))}
      </div>
    </div>
  );
}

export default function Phase1UXStandards() {
  const totalRules = SECTIONS.reduce((n, s) => n + s.standards.length, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Compact header */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-card flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Layout className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Trail OS UX Standards</p>
              <Badge variant="secondary" className="text-[10px]">Internal Reference</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {SECTIONS.length} sections · {totalRules} rules · Trail OS desktop platform
            </p>
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground text-right">
          <p className="font-semibold">Updated Jul 2026</p>
          <p>Apply before shipping any new page or component</p>
        </div>
      </div>

      {/* Intent strip */}
      <div className="px-5 py-2.5 bg-[#FFF3E0] border-b border-[#FFF3E0] flex-shrink-0">
        <p className="text-[12px] text-[#CC8400] leading-relaxed">
          <span className="font-semibold">Purpose:</span> These standards capture the design decisions that define how Trail OS looks, behaves, and communicates with its users.
          They exist so that every contributor — human or AI-assisted — preserves the UX quality and consistency of the platform.
          When adding a new page, component, or navigation item, verify it against these rules before shipping.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4">
          {SECTIONS.map(section => (
            <SectionCard key={section.id} section={section} />
          ))}

          {/* Footer note */}
          <div className="rounded-xl border bg-card px-5 py-4 text-center">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              These standards are maintained in{' '}
              <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono">
                src/pages/admin/Phase1UXStandards.tsx
              </code>{' '}
              alongside the app code.
              Update this file when a standard is revised, added, or deprecated.
              Design decisions not covered here should be proposed as new rules before implementation, not after.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
