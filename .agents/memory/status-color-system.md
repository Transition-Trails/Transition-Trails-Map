---
name: Status colour system
description: 5-role brand status system; all off-brand Tailwind colours swept from codebase; decision rules for each role.
---

## The five roles

| Role | Badge bg | Text | Border | Dot |
|---|---|---|---|---|
| success | `#E6F0EA` | `#2F6B3F` | `#9FC3AE` | `#2F6B3F` |
| information | `#EDF5F8` | `#2F6F7E` | `#7FAFC6` | `#2F6F7E` |
| attention | `#FFF3E0` | `#CC8400` | `#FFD08A` | `#CC8400` |
| critical | `#FBEAE6` | `#A93F2F` | `#E8B9B4` | `#A93F2F` |
| neutral | `#F2F3F1` | `#4A4F4D` | `#C8CBC6` | `#C8CBC6` |

## Key files

- `src/config/statusColors.ts` — `STATUS_CLASSES`, `StatusRole` type, `lifecycleColorClasses()`, `confidenceToRole()`, `trustToRole()`, `healthToRole()`, `badgeClasses()`, `dotClass()`
- `src/config/accessTiers.ts` — tier colours: everyday→success, power→information, admin→attention
- `src/components/ConfidenceBadge.tsx` — confirmed→success, needs-review→attention, draft→information, deprecated→neutral
- `src/index.css` — `--brand-critical` / `--brand-critical-light` / `--brand-critical-mid` vars

## Sweep rules (what maps to what)

- emerald / teal / green → **success**
- sky / violet / indigo / blue / purple → **information**
- amber / orange → **attention** (amber solid fill `bg-accent` reserved for single primary CTA only — attention uses dark text `#CC8400` on light tint `#FFF3E0`)
- rose / pink / red → **critical**

## Deliberate exclusions — permanent

- `src/pages/ProgramMap.tsx` — per-programme `HEADER_COLOR` / `BORDER_COLOR` maps (sky-blue, deep-teal, trail-green, charcoal). `sun-amber` entry was converted to mid-green `#9FC3AE` / border `#2F6B3F` because amber is reserved for the primary CTA only.
- `src/pages/collaboration/GmailCenter.tsx:591` — `fill-rose-400` on the Gmail logo SVG. **Never convert this in any future pass.** It is Google's brand mark; third-party logos must stay brand-accurate.
- `src/data/governanceData.ts` — `color: 'emerald'` etc. are data values fed into `lifecycleColorClasses()` at render time, not CSS classes. Correct by design.

## Person-type colour coding — removed

All `colorCls` / `badgeCls` entries in `src/data/peopleRolesData.ts` are neutral (`text-[#4A4F4D] bg-[#F2F3F1] border-[#C8CBC6]`). Per-role colour coding was removed because the label already carries the meaning; colour coding only builds a legend users must memorise.

## Toast destructive variant

`src/components/ui/toast.tsx` destructive cva uses explicit brand classes: `border-[#E8B9B4] bg-[#FBEAE6] text-[#A93F2F]`. ToastClose close button uses `text-[#A93F2F]/60` / `hover:text-[#A93F2F]` / `focus:ring-[#A93F2F]` / `focus:ring-offset-[#FBEAE6]`.

## Standard focus ring

Inputs use: `focus:outline-none focus:ring focus:ring-[#2F6B3F]/15` (3 px Trail Green at 15% opacity).

**Why:** Amber solid fill is forbidden for status; it is exclusively the primary CTA button colour (`bg-accent`). Using it for status would make every attention badge look like a button.

**How to apply:** When adding any new badge, dot, border, or status text, import `STATUS_CLASSES` from `statusColors.ts` and use the role key. Never introduce a new raw Tailwind colour family — always map to one of the five roles first. Never convert third-party brand marks (logos, icons from external services).
