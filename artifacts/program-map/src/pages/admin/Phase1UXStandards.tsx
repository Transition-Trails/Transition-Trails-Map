import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Navigation, Layout, Users, Cpu, Type,
  Monitor, Palette, BookOpen, MessageSquare,
  CheckCircle2, XCircle,
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
    id: 'context',
    title: 'Context & History',
    icon: BookOpen,
    color: 'sky',
    badge: 'Read First',
    summary: 'Trail OS predates the design system. The old standard had the right instinct — density — but the wrong tool. At 14 px, the hierarchy is readable. Density now moves from type size to information architecture.',
    standards: [
      {
        id: 'ctx-1',
        rule: 'Trail OS was built before the design system existed. Old screens reflect that, not deliberate divergence.',
        rationale: 'The pre-design-system standard instructed developers to use 9–12 px text, uppercase micro-labels, and tighter corner radii. That standard was solving a real problem — Trail OS is a dense internal tool for a small team, and that instinct was right. What changes is the answer. The design system now provides the right tools for the same problem.',
        doExample: 'When you encounter a screen that still uses tiny uppercase labels, update it to the current standard rather than treating the old style as intentional.',
        dontExample: 'Reading an old screen and assuming its 10 px uppercase eyebrow label is a deliberate design choice to preserve.',
      },
      {
        id: 'ctx-2',
        rule: 'Density is still a goal. The tool for density is information architecture, not type size.',
        rationale: 'Showing fewer things, using progressive disclosure, and splitting content across tabs achieves density without sacrificing legibility. Shrinking text does not make a screen feel organised — it makes it illegible and exhausting.',
        doExample: 'A dense table with many columns: prefer fewer columns with an expandable detail row, or move secondary columns to a secondary tab.',
        dontExample: 'Reducing all cell text to 11 px to fit ten columns inside a viewport.',
      },
      {
        id: 'ctx-3',
        rule: 'If a screen cannot work at 14 px, the screen is showing too much. That is a layout problem, not a type problem.',
        rationale: 'The 14 px floor is non-negotiable. A screen that breaks at 14 px is a signal that it needs progressive disclosure, a secondary tab, or fewer columns — not that the floor should be bent for this one case.',
        doExample: 'Move secondary detail columns to an expandable row or side panel. Add a secondary tab for advanced fields.',
        dontExample: 'Dropping a single label to 12 px "just for this screen" because the table is wide.',
      },
    ],
  },
  {
    id: 'typography',
    title: 'Typography',
    icon: Type,
    color: 'emerald',
    badge: 'Core',
    summary: 'Poppins for headings. Open Sans for all interface text. 14 px floor, no exceptions. Sentence case throughout.',
    standards: [
      {
        id: 'typ-1',
        rule: 'Poppins for headings, Open Sans for body and all interface text. No other typefaces in Trail OS.',
        rationale: 'Caveat is a brand face but has no role in an operations tool. Fraunces is for outward-facing surfaces only and is not used here. The prohibition on literal serif faces stands — font-serif in the Tailwind config resolves to Poppins, which is correct and intentional.',
        doExample: 'Page titles and section headers: font-serif (Poppins, semibold). Labels, body, badges, table headers, captions: font-sans (Open Sans).',
        dontExample: 'Using font-mono for section headers, or introducing Caveat for any label or UI element.',
      },
      {
        id: 'typ-2',
        rule: '14 px is the floor for all interface text. There are no exceptions for density.',
        rationale: 'The old standard used 9–12 px text to pack information onto a screen. At that size, text is not readable — it is only legible with effort. The 14 px floor is the lowest brand size for interface text and applies to badges, table cells, captions, helper text, metadata, and every other interface element.',
        doExample: 'text-[14px] or text-sm for all labels, badges, table cells, captions, and metadata.',
        dontExample: 'text-[10px] uppercase tracking-widest for an eyebrow label, even when the layout feels tight.',
      },
      {
        id: 'typ-3',
        rule: 'Type scale — use the bottom of the brand range because this is an internal tool.',
        rationale: 'Brand type ranges exist for a reason. An internal operations tool sits at the dense end. These sizes are the Trail OS standard: page title 28 px Poppins semibold, section title 22 px, card or panel title 18 px, stat values 28 px, body 16 px Open Sans regular, secondary and metadata 14 px regular, labels / badges / table headers 14 px semibold.',
        doExample: 'A stat card: value at text-[28px] font-serif font-semibold, label at text-[14px] font-semibold text-muted-foreground.',
        dontExample: 'text-xl (20 px) for stat values that should read at a glance, or text-[13px] because it "looks a bit tighter".',
      },
      {
        id: 'typ-4',
        rule: 'Sentence case throughout. The old uppercase treatment reads as shouting at 14 px.',
        rationale: 'Uppercase micro-labels — SECTION TITLE, TYPE, TIER — were compensating for illegibly small text. At 14 px the label is readable in sentence case. Uppercase at 14 px reads as shouting, which conflicts with the calm, precise voice the brand asks for in an operations context.',
        doExample: '"Filter by tier" not "FILTER BY TIER". "Section title" not "SECTION TITLE". "Needs attention" not "NEEDS ATTENTION".',
        dontExample: 'text-[14px] font-bold uppercase for a filter label, table column header, or section eyebrow.',
      },
      {
        id: 'typ-5',
        rule: 'Title Case only for proper programme and trail names.',
        rationale: "Programme names like \"Explorer's Trail\" and \"Career Launch Cohort 3\" are proper names and use Title Case. Interface labels, descriptions, section headers, tab names, and button text use sentence case.",
        doExample: '"Explorer\'s Trail" (programme name), "Career Launch Cohort 3" (trail name). vs "Program overview" (interface label), "Health indicators" (section header).',
        dontExample: 'Title Case for tab labels: "Program Overview", "Health Indicators", "Courses And Modules".',
      },
    ],
  },
  {
    id: 'colour',
    title: 'Colour',
    icon: Palette,
    color: 'amber',
    badge: 'Core',
    summary: 'Everything from the token layer. Five status roles, no more. One amber element per screen — the primary action.',
    standards: [
      {
        id: 'col-1',
        rule: 'Use token classes only in screen code — no raw hex values and no Tailwind framework colour utilities.',
        rationale: 'Raw hex values and Tailwind colour utilities (bg-emerald-100, text-sky-700) couple a screen to specific colour values that cannot be updated globally. Token classes (bg-card, text-foreground, text-muted-foreground, border-border) adapt to theme changes automatically. For status, import STATUS_CLASSES from src/config/statusColors.',
        doExample: 'bg-card, text-foreground, text-muted-foreground, border-border. Status: import from STATUS_CLASSES.',
        dontExample: 'bg-emerald-50 text-emerald-700 border-emerald-200 hardcoded on a status badge in a screen file.',
      },
      {
        id: 'col-2',
        rule: 'Four brand colours, each with a single intent.',
        rationale: 'Using a brand colour outside its intent weakens the system and confuses users who have learned what each colour means.',
        doExample: 'Trail Green (#2F6B3F): success, live, active. Deep Teal (#2F6F7E): information, configured, by design, read-only. Trail Light (#F5F0E8): page background. Warm Gray (#4A4F4D): neutral text and dividers.',
        dontExample: 'Using Trail Green for a decorative section accent, or Deep Teal for a success state.',
      },
      {
        id: 'col-3',
        rule: 'Five status roles, and only these five. Never invent a sixth.',
        rationale: 'More than five status colours require users to memorise a legend. Five roles cover every operational state in Trail OS.',
        doExample: 'Success (Trail Green): live, active, passing, complete, approved. Information (Deep Teal): configured, planned, by design, read-only. Attention (dark amber text on lightest amber tint): needs setup, partial, prototype, warning, needs rework. Critical (functional red on its tint): blocked, failed, missing credentials, destructive. Neutral (Warm Gray, Slate text): not started, deferred, inactive.',
        dontExample: 'A new "in-progress" blue status, or using amber as a fill for a "warning" state card.',
      },
      {
        id: 'col-4',
        rule: 'One amber element per screen, and it must be the primary action. Amber is never a status fill.',
        rationale: 'Amber (#F5A623, bg-accent) is the brand\'s primary CTA colour. It signals "the most important action on this screen". Using it for status fills, category labels, or decoration dilutes that signal. Attention status uses amber text on a tint — not an amber fill.',
        doExample: 'The primary "Save", "Confirm", or "Activate" button is the one amber element on a page.',
        dontExample: 'Amber background on a "warning" status card, amber category dot for a person type, or amber decorative border on a section header.',
      },
      {
        id: 'col-5',
        rule: 'Meaning is never carried by colour alone. Every status keeps a text label and an icon.',
        rationale: 'Colour-blind users must be able to read status without relying on hue. A coloured dot on its own is not a status indicator — it is decoration.',
        doExample: 'A success badge: green dot + CheckCircle2 icon + "Live". An attention strip: amber border + AlertTriangle icon + "Needs setup".',
        dontExample: 'A standalone coloured dot as the only status indicator, with no label or icon alongside it.',
      },
      {
        id: 'col-6',
        rule: 'Two background colours maximum per surface. No categorical colour for programmes, person types, or roles.',
        rationale: 'More than two background values on one surface creates visual noise and collapses the hierarchy. Categorical colour-coding forces users to memorise a legend; label text carries the same distinction more clearly and without the overhead.',
        doExample: 'Trail Light page background + white card. A programme is distinguished by its name and a status badge, not a hue.',
        dontExample: 'Six programme cards each with a distinct colour header. A person-type badge that is teal for "Staff" and amber for "Volunteer".',
      },
      {
        id: 'col-7',
        rule: 'Third-party brand marks keep their own colours and must never be converted.',
        rationale: 'Modifying a third-party logo or brand colour violates trademark guidelines and misleads users about product origin.',
        doExample: 'The Gmail logo uses Google brand colours. The Salesforce logo uses Salesforce blue. These are left unchanged in any colour sweep.',
        dontExample: 'Converting fill-rose-400 on a Gmail SVG icon to a Trail OS brand colour during a colour standardisation pass.',
      },
      {
        id: 'col-8',
        rule: 'The functional red is not a brand colour. It exists because an operations tool must distinguish a blocker from a warning.',
        rationale: 'The Transition Trails brand book has no red. An operations tool that cannot show a critical error is broken. The functional red (#A93F2F on #FBEAE6) is the only non-brand colour permitted in Trail OS and is pending a brand book entry.',
        doExample: 'Critical badge: bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4] — import from STATUS_CLASSES.critical.',
        dontExample: 'Using bg-red-500, text-red-700, or any Tailwind red outside the approved functional red values.',
      },
    ],
  },
  {
    id: 'shape',
    title: 'Shape & Elevation',
    icon: Layout,
    color: 'sky',
    badge: 'Core',
    summary: 'Consistent corner radii. White cards on Trail Light. Sky tint for nested surfaces. Soft shadows only.',
    standards: [
      {
        id: 'shp-1',
        rule: 'Corner radii: 8 px for small elements, 14 px for buttons and inputs, 22 px for cards, fully rounded for badges and pills.',
        rationale: 'The old standard used rounded-lg (8 px) for all cards. The brand specifies 22 px for card containers — large enough to feel intentional, not so large it becomes novelty. Consistent radii across element types create a coherent system.',
        doExample: 'Tags and small chips: rounded (8 px). Buttons and text inputs: rounded-[14px]. Cards and panels: rounded-[22px]. Badges and status pills: rounded-full.',
        dontExample: 'rounded-lg on a card, rounded-full on a button, or rounded-sm on an input.',
      },
      {
        id: 'shp-2',
        rule: 'White cards on the Trail Light background. Sky tint for nested surfaces within a card.',
        rationale: 'bg-card resolves to white and is theme-safe. A nested surface using the same background as its card does not lift — it reads as flat. The Sky tint (#EDF5F8) provides the separation needed for secondary surfaces inside a card.',
        doExample: 'Page background: bg-background (Trail Light). Card: bg-card (white). Nested surface inside a card: bg-[#EDF5F8].',
        dontExample: 'A nested surface using bg-muted/20 (barely distinguishable from the card) or bg-background (same as the page behind the card).',
      },
      {
        id: 'shp-3',
        rule: 'Borders: 1 px Warm Gray on cards and dividers. 1.5 px on inputs and secondary button outlines.',
        rationale: 'Consistent border weights create a clear interactive hierarchy. Inputs and secondary buttons need slightly more weight to communicate affordance.',
        doExample: 'border border-border on cards and section dividers. border-[1.5px] border-border on text inputs and secondary buttons.',
        dontExample: 'border-2 on a standard card (too heavy) or borderless inputs (insufficient affordance).',
      },
      {
        id: 'shp-4',
        rule: 'Soft low-contrast shadows only. No hard drop shadows. Never a shadow on a logo.',
        rationale: 'Hard drop shadows (shadow-lg, sharp offset shadows) create a dated look and compete with the flat token surfaces. Logo shadows distort brand marks and violate brand guidelines.',
        doExample: 'shadow-sm at rest, shadow-md on the hover lift state.',
        dontExample: 'shadow-xl on any card, a hard drop-shadow on the Trail OS wordmark, or a box-shadow with an offset and opacity on a panel.',
      },
    ],
  },
  {
    id: 'spacing',
    title: 'Spacing',
    icon: Monitor,
    color: 'slate',
    badge: 'Core',
    summary: 'The 8 px scale: 4, 8, 16, 24, 32, 48, 64. Nothing off-scale. For density, use the lower end of the scale.',
    standards: [
      {
        id: 'spc-1',
        rule: 'The spacing scale is 4, 8, 16, 24, 32, 48, 64 px. Nothing off-scale.',
        rationale: 'Off-scale spacing values (p-3, p-5, gap-3, gap-5) exist in the current codebase as a legacy of building before a system existed. New work uses the defined scale so spacing feels intentional and consistent across every surface.',
        doExample: 'p-2 (8 px), p-4 (16 px), p-6 (24 px), p-8 (32 px), gap-2 (8 px), gap-4 (16 px).',
        dontExample: 'p-3 (12 px), p-5 (20 px), gap-3 (12 px), gap-5 (20 px) — these are off-scale.',
      },
      {
        id: 'spc-2',
        rule: 'For Trail OS density, choose the lower end of the scale. Never go below the scale.',
        rationale: 'The 8 px scale is already compact at the low end. Choosing p-2 (8 px) instead of p-4 (16 px) achieves the denser feel without inventing off-scale values. Below 4 px (p-1) should only appear for internal icon padding, never for layout gaps or section separators.',
        doExample: 'Dense table row: py-2 (8 px top/bottom). Compact card: p-4 (16 px). Generous overview header: p-8 (32 px).',
        dontExample: 'px-1.5 (6 px) on a card container, or py-0.5 (2 px) on a body text row.',
      },
    ],
  },
  {
    id: 'interaction',
    title: 'Interaction',
    icon: Cpu,
    color: 'teal',
    badge: 'Core',
    summary: 'Trail Green focus ring on every interactive element. Cards lift 3 px on hover. Nothing shrinks on press. No decorative animation.',
    standards: [
      {
        id: 'int-1',
        rule: 'Every interactive element has a 3 px Trail Green focus ring at 15% opacity.',
        rationale: 'A visible focus ring is an accessibility requirement. The brand focus ring is soft enough not to dominate the surface but visible enough to orient keyboard users at all times.',
        doExample: 'focus:outline-none focus:ring focus:ring-[#2F6B3F]/15 on all buttons, links, inputs, and selects.',
        dontExample: 'focus:outline-none with no replacement ring, or a browser-default blue ring that conflicts with the brand palette.',
      },
      {
        id: 'int-2',
        rule: 'Cards lift 3 px on hover over approximately 160 ms with the card shadow. Buttons shift colour on hover.',
        rationale: 'Hover feedback confirms interactivity without distraction. The canonical card hover is a translateY(-3px) with shadow-md upgrade. Buttons shift one shade darker. Nothing shrinks, nothing bounces.',
        doExample: 'hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 on interactive cards.',
        dontExample: 'hover:scale-95 (shrinks), hover:opacity-50 (fades), or no hover feedback at all on a clickable card.',
      },
      {
        id: 'int-3',
        rule: 'Press state goes darker. Nothing shrinks or bounces on click.',
        rationale: 'A press state that shrinks or bounces is disorienting in a dense data tool. Darkening the colour or background on active state confirms the click without spatial movement.',
        doExample: 'active:bg-primary/90 on a primary button. active:bg-muted on a secondary card.',
        dontExample: 'active:scale-95 on a button, or a spring-bounce animation triggered by a list item click.',
      },
      {
        id: 'int-4',
        rule: 'Animation only when it carries meaning. 200 ms ease-out, no bounces.',
        rationale: 'Decorative animation distracts in a focused work tool. Animation is appropriate for panel slide-in/out, accordion open/close, and loading skeleton shimmer. Not for hover effects, button presses, or page transitions.',
        doExample: 'Slide-in panel: 200 ms ease-out translateX. Accordion: 200 ms ease-in-out max-height. Loading: shimmer on skeleton placeholders.',
        dontExample: 'A list item that bounces into view on page load, a button that wiggles on hover, or a spring animation on a card click.',
      },
    ],
  },
  {
    id: 'layout',
    title: 'Layout Patterns',
    icon: Navigation,
    color: 'emerald',
    badge: 'Core',
    summary: 'Overview-first hubs. List-and-detail as a secondary tab. Right-rail panels, not modals. Ask Penny always in the right rail.',
    standards: [
      {
        id: 'lay-1',
        rule: 'Overview-first hubs: a populated overview at the base path, never an empty split pane as a landing.',
        rationale: 'A hub that lands on an empty detail pane forces the user to make a selection before they see anything useful. The overview surfaces the most relevant content at first render.',
        doExample: '/program lands on the Program Overview (health metrics, blueprint coverage, Penny coverage). The programme list is a secondary tab.',
        dontExample: 'A split pane with a list on the left and an empty "select a programme" placeholder on the right as the default landing state.',
      },
      {
        id: 'lay-2',
        rule: 'List-and-detail is a secondary tab, never the default landing.',
        rationale: 'The ObjectWorkspace left-list/right-detail pattern is powerful for detailed inspection but poor as a first impression of a hub. It always lives behind a tab click.',
        doExample: 'Knowledge hub: Overview at /knowledge (default), Sources at /knowledge/sources (ObjectWorkspace).',
        dontExample: 'Setting the Sources ObjectWorkspace as the landing page for the Knowledge hub.',
      },
      {
        id: 'lay-3',
        rule: 'No modal or full-page overlays. The established right-rail slide-over panels are the only exception.',
        rationale: 'Modals block context, trap keyboard focus, and break the split-view layout. The AskPennyPanel and CalendarActionPanel are the only slide-over exceptions and are globally mounted in AppShell.',
        doExample: 'Detail content opens in the right panel (ContextPanel) or navigates to a routed page.',
        dontExample: 'A Dialog component for record detail, a Sheet overlay for a creation form.',
      },
      {
        id: 'lay-4',
        rule: 'No empty default detail panes. No hero or intro cards on operational pages.',
        rationale: 'Empty panes waste space and communicate nothing. Hero cards restate what the user just navigated to. Both consume vertical space that operational content needs.',
        doExample: 'All pages show meaningful content at first render. The page header is compact: eyebrow + title + one-line description inline.',
        dontExample: 'A full-width "Welcome to Operations" card above the metrics strip, or an empty right pane that says "Select a record to begin".',
      },
      {
        id: 'lay-5',
        rule: 'Underline tabs, not pill buttons, wherever HubShell is used.',
        rationale: 'Pill buttons for navigation imply the content behind them is categorically different. Underline tabs communicate that you are navigating within the same surface.',
        doExample: 'HubShell renders underline tab bars automatically. The active tab has a bottom border in the primary colour.',
        dontExample: 'Replacing the HubShell tab bar with a row of rounded pill buttons.',
      },
      {
        id: 'lay-6',
        rule: 'Ask Penny is always in the right rail. Never a modal, never a takeover.',
        rationale: 'Penny is a contextual advisor, not an interruption. A right-rail panel keeps Penny available alongside the work surface. A takeover or modal forces the user to stop what they are doing.',
        doExample: 'AskPennyPanel slides in from the right at max-width 400 px. The rest of the UI remains visible behind it.',
        dontExample: 'Opening Penny as a full-screen overlay, a centred modal, or a bottom sheet.',
      },
    ],
  },
  {
    id: 'voice',
    title: 'Voice',
    icon: MessageSquare,
    color: 'stone',
    badge: 'Copy',
    summary: 'Sentence case. "You" and "we". Calm, precise, actionable. No emoji. Status is icon plus text.',
    standards: [
      {
        id: 'vce-1',
        rule: 'Sentence case in all UI text. Title Case only for proper programme and trail names.',
        rationale: 'Consistent casing is a signal of quality and care. Inconsistent capitalisation — mixing sentence case, Title Case, and ALL CAPS in labels — reads as unfinished.',
        doExample: '"Filter by tier", "Access tiers and auth", "Your programmes this week".',
        dontExample: '"Filter By Tier", "Access Tiers And Auth", "Your Programmes This Week".',
      },
      {
        id: 'vce-2',
        rule: 'Speak to the user as "you" and call the organisation "we". Calm, precise, actionable — no urgency or hype.',
        rationale: 'Trail OS is a tool for a small, trusted team. The voice should feel like a knowledgeable colleague: clear about what is happening, what is needed, and what comes next. Never breathless, never alarming, never cheerleading.',
        doExample: '"Your assigned programmes are below." "We could not reach Salesforce — check your credentials." "3 roles need an owner assigned."',
        dontExample: '"Supercharge your workflow!" "CRITICAL: Immediate action required!" "Congratulations, you\'ve unlocked the Operations Hub!"',
      },
      {
        id: 'vce-3',
        rule: 'No emoji in the product or in repository documents. Status is an icon plus text.',
        rationale: 'Emoji are ambiguous across platforms and render differently across operating systems. Lucide icons are consistent, accessible, and at home in a professional tool. An emoji in a status badge cannot be interpreted correctly by a screen reader.',
        doExample: 'A success state: CheckCircle2 icon + "Live". An attention state: AlertTriangle icon + "Needs setup".',
        dontExample: '"✅ Live", "⚠️ Needs setup", "🚀 Launching…" in any UI label, tooltip, or documentation line.',
      },
      {
        id: 'vce-4',
        rule: 'Do not adopt Trailhead, Trailblazer, Ohana, Ranger or Expedition as Trail OS vocabulary.',
        rationale: 'These terms belong to the Salesforce ecosystem. Referring to the Salesforce platform by its real name is correct. Adopting its vocabulary as ours blurs the identity of Trail OS and Transition Trails Academy.',
        doExample: '"This record is stored in Salesforce." "The learner\'s Salesforce contact record…"',
        dontExample: '"Your trailblazer journey starts here." "Earn your ranger badge." "Join the ohana."',
      },
    ],
  },
  {
    id: 'role-gating',
    title: 'Role Gating',
    icon: Users,
    color: 'violet',
    badge: 'Core',
    summary: 'Three tiers: Everyday, Power, Admin. Each tier sees only what is useful to them. Technical language is gated to Admin.',
    standards: [
      {
        id: 'rg-1',
        rule: 'Three tiers: Everyday User → Penny Power User → Admin / Super Admin.',
        rationale: 'The role system is the primary UX filter. Content, navigation depth, and available actions all respond to tier. Gate components on useTierFlags() → { isEveryday, isPowerOrAbove, isAdminOrAbove }.',
        doExample: 'Everyday users see plain-language summaries. Power users see operational controls. Admins see configuration, governance, and audit tooling.',
        dontExample: 'Showing the same UI to all roles and relying on text labels alone to communicate access level.',
      },
      {
        id: 'rg-2',
        rule: 'Technical and admin language is hidden from Everyday Users.',
        rationale: 'Terms like "Integration Readiness", "Prompt Studio", and "Org Memory" are not meaningful to an Everyday User and create anxiety. Everyday Users see task-oriented plain language.',
        doExample: '"Your programmes" (Everyday) vs "Programme management" (Admin). One visible tab means no tab bar is shown.',
        dontExample: 'Showing a sidebar item labelled "Salesforce Architecture" or "Integration Readiness" to an Everyday User.',
      },
      {
        id: 'rg-3',
        rule: 'Integration status notices and admin tooling are gated to Admin+ only.',
        rationale: 'In-progress status notices ("connecting to Salesforce…") are meaningful to Admins monitoring build progress, not to Everyday Users doing their jobs.',
        doExample: 'Wrap integration notice banners in isAdminOrAbove checks. The Everyday view of Operations shows programme health, not integration health.',
        dontExample: 'Surfacing "Salesforce connection pending" or "Google OAuth incomplete" to all users at login.',
      },
      {
        id: 'rg-4',
        rule: 'Infrastructure items (Digital Twin, Context Engine) are invisible to Everyday Users.',
        rationale: 'These tools enrich the experience behind the scenes. Everyday Users benefit from their output — relevant context in the right panel, enriched programme data — without needing to know the mechanism.',
        doExample: 'Digital Twin sidebar group has minTier: "power". Everyday Users see contextually enriched data without a "Digital Twin" menu item.',
        dontExample: 'Adding a "Context Engine" or "Digital Twin" link to the Everyday sidebar to demonstrate platform sophistication.',
      },
    ],
  },
];

// ── "What changed, and why" table data ────────────────────────────────────────

interface Change {
  topic: string;
  oldRule: string;
  newRule: string;
  reason: string;
}

const CHANGES: Change[] = [
  {
    topic: 'Type sizes',
    oldRule: '9–12 px text throughout',
    newRule: '14 px floor everywhere',
    reason: 'At 14 px the hierarchy is readable; shrinking text to create density produces illegibility, not compactness.',
  },
  {
    topic: 'Uppercase labels',
    oldRule: 'text-[10px] font-bold uppercase tracking-widest for eyebrow labels',
    newRule: 'text-[14px] font-semibold sentence case',
    reason: 'Uppercase compensated for illegibly small text. At 14 px it reads as shouting, which conflicts with the brand voice.',
  },
  {
    topic: 'Stat values',
    oldRule: 'text-xl max (20 px)',
    newRule: '28 px Poppins semibold',
    reason: 'Brand type scale. Stats should land at a glance — 20 px is too small for a number the user checks first.',
  },
  {
    topic: 'Card radius',
    oldRule: 'rounded-lg (8 px)',
    newRule: 'rounded-[22px]',
    reason: 'Brand specification. 22 px is the designed card radius; rounded-lg was a generic default.',
  },
  {
    topic: 'Card background',
    oldRule: 'bg-white explicit',
    newRule: 'bg-card',
    reason: 'On Trail Light, explicit white is too close in value to the page background. bg-card is theme-safe and resolves to the same value.',
  },
  {
    topic: 'Colour families',
    oldRule: 'Tailwind emerald / sky / violet / indigo / rose / amber utilities',
    newRule: 'Five status roles via STATUS_CLASSES from src/config/statusColors',
    reason: 'Framework utilities couple screens to implementation values. Named semantic roles survive theme changes and communicate intent.',
  },
  {
    topic: 'Amber usage',
    oldRule: 'Freely used for categories, status fills, and decoration',
    newRule: 'One per screen — primary action only; status uses amber text on a tint',
    reason: 'Amber is the brand CTA colour. Over-use dilutes the signal that a primary action is available on this screen.',
  },
  {
    topic: 'Shadows and hover',
    oldRule: 'No explicit rule',
    newRule: 'Soft card shadow, 3 px lift on hover over 160 ms',
    reason: 'The absence of a rule allowed hard drop shadows and decorative animation to enter the codebase unchecked.',
  },
  {
    topic: 'Focus ring',
    oldRule: 'Browser default',
    newRule: '3 px Trail Green at 15% opacity on every interactive element',
    reason: 'Accessibility requirement. The brand ring is consistent, visible to keyboard users, and does not conflict with the palette.',
  },
  {
    topic: 'Fonts',
    oldRule: 'font-sans only, no type specification',
    newRule: 'Poppins (headings, font-serif) + Open Sans (interface text, font-sans)',
    reason: 'Trail OS now has a type system. Applying it here aligns the tool with outward-facing Transition Trails materials.',
  },
];

// ── Colour map for section card rendering ─────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; icon: string; badge: string; border: string }> = {
  emerald: { bg: 'bg-[#E6F0EA]', icon: 'text-[#2F6B3F]', badge: 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]', border: 'border-[#9FC3AE]' },
  sky:     { bg: 'bg-[#EDF5F8]', icon: 'text-[#2F6F7E]', badge: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]', border: 'border-[#7FAFC6]' },
  violet:  { bg: 'bg-[#EDF5F8]', icon: 'text-[#2F6F7E]', badge: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]', border: 'border-[#7FAFC6]' },
  amber:   { bg: 'bg-[#FFF3E0]', icon: 'text-[#CC8400]', badge: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]', border: 'border-[#FFD08A]' },
  rose:    { bg: 'bg-[#FBEAE6]', icon: 'text-[#A93F2F]', badge: 'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]', border: 'border-[#E8B9B4]' },
  teal:    { bg: 'bg-[#E6F0EA]', icon: 'text-[#2F6B3F]', badge: 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]', border: 'border-[#9FC3AE]' },
  slate:   { bg: 'bg-[#F2F3F1]', icon: 'text-[#4A4F4D]', badge: 'bg-[#F2F3F1] text-[#4A4F4D] border-[#C8CBC6]', border: 'border-[#C8CBC6]' },
  stone:   { bg: 'bg-[#F2F3F1]', icon: 'text-[#4A4F4D]', badge: 'bg-[#F2F3F1] text-[#4A4F4D] border-[#C8CBC6]', border: 'border-[#C8CBC6]' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StandardRow({ std }: { std: Standard }) {
  return (
    <div className="py-3.5 border-b last:border-0">
      <p className="text-[14px] font-semibold text-foreground leading-snug mb-1">{std.rule}</p>
      <p className="text-[14px] text-muted-foreground leading-relaxed mb-2">{std.rationale}</p>
      {(std.doExample || std.dontExample) && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {std.doExample && (
            <div className="flex gap-1.5 rounded-lg bg-[#E6F0EA] border border-[#9FC3AE]/40 px-2.5 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F] mt-0.5 flex-shrink-0" />
              <p className="text-[14px] text-[#245531] leading-relaxed">{std.doExample}</p>
            </div>
          )}
          {std.dontExample && (
            <div className="flex gap-1.5 rounded-lg bg-[#FBEAE6] border border-[#E8B9B4]/40 px-2.5 py-2">
              <XCircle className="w-3.5 h-3.5 text-[#A93F2F] mt-0.5 flex-shrink-0" />
              <p className="text-[14px] text-[#A93F2F] leading-relaxed">{std.dontExample}</p>
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
    <div className={`rounded-[22px] border-2 ${c.border} bg-card overflow-hidden`}>
      <div className={`flex items-start gap-3 px-4 py-3.5 ${c.bg} border-b ${c.border}`}>
        <div className={`w-8 h-8 rounded-[14px] flex items-center justify-center flex-shrink-0 ${c.bg} ${c.icon}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[18px] font-serif font-semibold text-foreground">{section.title}</p>
            <span className={`text-[14px] font-semibold px-1.5 py-0.5 rounded-full border ${c.badge}`}>{section.badge}</span>
          </div>
          <p className="text-[14px] text-muted-foreground leading-snug">{section.summary}</p>
        </div>
        <div className="text-[14px] font-semibold text-muted-foreground flex-shrink-0 pt-0.5">
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

// ── Main page ─────────────────────────────────────────────────────────────────

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
              <p className="text-[18px] font-serif font-semibold text-foreground">Trail OS UX Standards</p>
            </div>
            <p className="text-[14px] text-muted-foreground">
              {SECTIONS.length} sections · {totalRules} rules · applies to every screen and component
            </p>
          </div>
        </div>
        <div className="text-[14px] text-muted-foreground text-right">
          <p className="font-semibold">Updated Aug 2026</p>
          <p>Apply before shipping any new page or component</p>
        </div>
      </div>

      {/* Intent strip */}
      <div className="px-5 py-2.5 bg-[#EDF5F8] border-b border-[#7FAFC6]/30 flex-shrink-0">
        <p className="text-[14px] text-[#2F6F7E] leading-relaxed">
          <span className="font-semibold">Design system is the source of truth.</span>{' '}
          Trail OS was created before the Transition Trails design system existed. This document translates
          the design system into the specific decisions that govern a dense internal operations tool.
          When these standards conflict with a pre-system pattern still visible in the codebase,
          this document wins.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4">
          {SECTIONS.map(section => (
            <SectionCard key={section.id} section={section} />
          ))}

          {/* What changed, and why */}
          <div className="rounded-[22px] border-2 border-[#C8CBC6] bg-card overflow-hidden">
            <div className="flex items-start gap-3 px-4 py-3.5 bg-[#F2F3F1] border-b border-[#C8CBC6]">
              <div className="flex-1 min-w-0">
                <p className="text-[18px] font-serif font-semibold text-foreground mb-0.5">What changed, and why</p>
                <p className="text-[14px] text-muted-foreground leading-snug">
                  Each old rule mapped to its replacement and the reason. Use this when you encounter a legacy
                  pattern and want to understand what replaced it.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[14px]">
                <thead className="bg-[#F2F3F1] border-b border-border sticky top-0">
                  <tr>
                    {['Topic', 'Old rule', 'New rule', 'Reason'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[14px] font-semibold text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CHANGES.map((c, i) => (
                    <tr key={c.topic} className={`border-b border-border/60 ${i % 2 === 0 ? 'bg-card' : 'bg-[#F2F3F1]/40'}`}>
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap align-top">{c.topic}</td>
                      <td className="px-4 py-3 text-[#A93F2F] font-mono leading-snug align-top max-w-[200px]">
                        <span className="bg-[#FBEAE6] px-1.5 py-0.5 rounded">{c.oldRule}</span>
                      </td>
                      <td className="px-4 py-3 text-[#2F6B3F] font-mono leading-snug align-top max-w-[200px]">
                        <span className="bg-[#E6F0EA] px-1.5 py-0.5 rounded">{c.newRule}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground leading-snug align-top">{c.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-border bg-[#F2F3F1]/40">
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Density is not lost — it moves from type size to information architecture.</span>{' '}
                A screen that works at 14 px has the right amount of information on it.
                A screen that does not work at 14 px is showing too much, and the fix is
                progressive disclosure, fewer columns, or a secondary tab — not a smaller font.
              </p>
            </div>
          </div>

          {/* Footer note */}
          <div className="rounded-[22px] border bg-card px-5 py-4 text-center">
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              These standards are maintained in{' '}
              <code className="text-[14px] bg-muted px-1.5 py-0.5 rounded font-mono">
                src/pages/admin/Phase1UXStandards.tsx
              </code>{' '}
              and mirrored in{' '}
              <code className="text-[14px] bg-muted px-1.5 py-0.5 rounded font-mono">
                TRAIL_OS_SPEC.md § 5
              </code>{' '}
              at the repository root. Update both when a standard is revised, added, or deprecated.
              Design decisions not covered here should be proposed as new rules before implementation, not after.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
