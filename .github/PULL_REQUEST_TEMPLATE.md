## Summary

<!-- What does this PR do? One or two sentences. -->

## Type of change

- [ ] `feat` — new feature or page
- [ ] `fix` — bug fix
- [ ] `refactor` — code restructure (no behaviour change)
- [ ] `style` — UX / visual change (no logic change)
- [ ] `docs` — documentation only
- [ ] `chore` — build, config, dependencies
- [ ] `test` — tests added or updated

## Affected sections

<!-- Check all that apply -->
- [ ] Digital Twin
- [ ] Operations
- [ ] Programs
- [ ] Penny
- [ ] Knowledge
- [ ] Collaboration
- [ ] Administration
- [ ] App shell (Sidebar, Topbar, ContextBar, ContextPanel)
- [ ] Data files (`src/data/`)
- [ ] API server (`artifacts/api-server/`)
- [ ] Shared components (`src/components/`)
- [ ] Documentation / repo files

## Pre-merge checklist

### Required
- [ ] `pnpm run typecheck` passes — **0 errors**
- [ ] No `font-serif` added anywhere
- [ ] No secrets, API keys, tokens, or `.env` values committed
- [ ] No `console.log` left in production code

### UX compliance (if UI changed)
- [ ] Stat values use `text-xl font-semibold` (not `text-2xl` or `text-3xl`)
- [ ] Eyebrow labels use `text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50`
- [ ] All pages show meaningful content at first render (no empty default panes)
- [ ] No modal or slide-over overlays introduced
- [ ] New hub first tab is `Overview` (command center), not a workspace

### Navigation (if pages added/changed)
- [ ] Route added to `App.tsx`
- [ ] Sidebar item added to `Sidebar.tsx` navGroups (if navigable from sidebar)
- [ ] Admin tiles updated in `AdminSetup.tsx` (if admin tool added)
- [ ] Legacy redirect added for any old paths that should still work

### Data (if data files changed)
- [ ] Typed interfaces defined and exported
- [ ] New hue values added to `HUE_MAP` in `Phase2Backlog.tsx` (if applicable)
- [ ] `readinessState.ts` updated if integration status changed

### Phase 2 items
- [ ] Features that are Phase 2 have been added as backlog cards in `Phase2Backlog.tsx` instead of being built
- [ ] New backlog card hue exists in `HUE_MAP`

## Screenshots

<!-- Add screenshots for any visual changes. Check all four tiers (Everyday / Power / Admin / Super Admin). -->

| Before | After |
|---|---|
| | |

## Notes for reviewer

<!-- Anything the reviewer should know: edge cases, open questions, follow-up items. -->
