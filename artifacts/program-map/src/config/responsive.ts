/**
 * Trail OS — Responsive Layout Contract
 * ────────────────────────────────────────────────────────────────────────────
 * Three breakpoint states govern the shell at all times.
 * Any new layout work MUST satisfy all three states before merging.
 *
 *  STATE 1 — FULL WORKSPACE  (≥ 1280px / Tailwind `xl`)
 *  ──────────────────────────────────────────────────────
 *  • Sidebar:      220px expanded — icons + labels + accordion sub-nav
 *  • Main:         flex-1, scrollable, compact cards
 *  • Right panel:  300–420px Ask Penny / Trail Signals — always visible
 *  • ContextBar:   full width, always mounted
 *  • Use case:     single large monitor, dedicated Trail OS window
 *
 *  STATE 2 — SPLIT VIEW  (768px–1279px / Tailwind `md` to just below `xl`)
 *  ──────────────────────────────────────────────────────────────────────────
 *  • Sidebar:      44px icon-only rail — icons + tooltips, no labels,
 *                  clicking a group navigates to that group's root page,
 *                  accordion sub-nav hidden (tap → navigate instead)
 *  • Main:         flex-1, full available width
 *  • Right panel:  hidden by default; toggled via "Ask Penny" button in Topbar
 *  • ContextBar:   full width, always mounted
 *  • Use case:     Trail OS beside Replit, Slack, Google Drive, meetings, docs
 *
 *  GUARDRAILS for split view:
 *  - No horizontal scroll (overflow-hidden on AppShell is the fence)
 *  - No multi-row action/tab bars above content on Everyday pages
 *  - Long descriptions/admin detail must be hidden or truncated at this width
 *  - Card grids must use `grid-cols-2` (not 4) at md; use `md:grid-cols-2 xl:grid-cols-4`
 *
 *  STATE 3 — COMPACT / MOBILE  (< 768px / below Tailwind `md`)
 *  ──────────────────────────────────────────────────────────────
 *  • Sidebar:      hidden; shown as fixed overlay when hamburger is toggled
 *                  (hamburger button is `md:hidden` in Topbar)
 *  • Main:         full viewport width
 *  • Right panel:  hidden; toggled via "Ask Penny" button in Topbar
 *  • ContextBar:   full width, always mounted
 *  • Use case:     tablet portrait, emergency mobile access
 *
 * ── BREAKPOINT CONSTANTS ─────────────────────────────────────────────────────
 * These match the Tailwind config.  Reference these in comments, not raw numbers.
 */

export const BREAKPOINTS = {
  /** Compact / mobile — below this, sidebar becomes hamburger overlay */
  md: 768,
  /** Split view lower bound */
  splitViewMin: 768,
  /** Split view upper bound — below this, right panel is hidden by default */
  splitViewMax: 1279,
  /** Full workspace — sidebar 220px, right panel always visible */
  xl: 1280,
} as const;

/**
 * Tailwind classes that encode the three-state sidebar width.
 * Use on the sidebar wrapper div.
 *   mobile  → 220px (overlay, driven by translate)
 *   md      → 44px icon rail
 *   xl      → 220px full
 */
export const SIDEBAR_WIDTH_CLASSES = 'w-[220px] md:w-[44px] xl:w-[220px]';

/**
 * Tailwind classes for content grids that must respect split view.
 * Prefer 2-col at md, 4-col at xl.
 */
export const GRID_2_TO_4 = 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
export const GRID_1_TO_2 = 'grid-cols-1 md:grid-cols-2';
