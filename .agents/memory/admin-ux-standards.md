---
name: Phase 1 Admin UX Standards
description: Typography, spacing, layout, and navigation rules applied across all admin pages in the Phase 1 audit pass.
---

# Phase 1 Admin UX Standards

Applied consistently across Admin.tsx, Phase1ReadinessDashboard, IntegrationReadinessCenter, GoogleOAuthFlow, CreateAudit, IntegrationSecretsAudit, Scorecards, Trends & Insights.

## Typography scale
- Eyebrow: `text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50`
- Page title: `text-base font-semibold` (was text-2xl/text-3xl font-serif)
- Description: `text-[11px] text-muted-foreground`
- Section heads inside content: `text-[12px] font-bold`
- Stat numbers: `text-xl font-bold` (was text-2xl/text-3xl)

## Cards
- `p-4 rounded-lg border` (was p-5 rounded-xl border-2)
- Icon containers: `w-8 h-8 rounded-md` (was w-10 h-10 rounded-xl)

## Navigation / tabs
- Multi-tab pages use underline-style tabs, not pill buttons
- 9+ tabs: split into two labeled groups with a `w-px h-4 bg-border` separator + `text-[9px] Admin` label
- One navigation row only — never stacked pill rows above content
- IntegrationReadinessCenter: Overview/Catalog/Data Flow/Risks/Launch | Admin: Auth/Fields/Sync/Testing

## List/grid pages
- Use `grid grid-cols-2 gap-3` for scorecard/insight/tool-card pages instead of full-width stacked sections
- Cards are compact jumping-off points; deep detail lives in expand-in-place or right-panel drill-in

## Hero/intro cards
- REMOVE large explanatory hero cards at the top of pages (blue/primary border cards with long copy)
- Replace with inline status strip or subheader notice if security/warning context needed

## Subheader banners
- Replace `px-5 py-3 border-b bg-white` info banners with compact `px-4 py-2 border-b bg-amber-50/60` inline notice strips with icon + one-line message

**Why:** The admin pages had inherited oversized layouts from early prototype work. Phase 1 standards treat admin users as experts who scan rather than read — compact cards, status dots, color-coded badges, and drill-in affordances replace long reports.

**How to apply:** Any new admin page should start from: compact header → single tab row → 2-col content grid → right-panel detail. No hero cards, no stacked nav rows, no text-2xl stats.
