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
- `src/index.css` — `--brand-critical` / `--brand-critical-light` / `--brand-critical-mid` vars (provisional until brand book finalised)

## Sweep rules (what maps to what)

- emerald / teal / green → **success**
- sky / violet / indigo / blue / purple → **information**
- amber / orange → **attention** (amber solid fill `bg-accent` reserved for single primary CTA only — attention uses dark text `#CC8400` on light tint `#FFF3E0`)
- rose / pink / red → **critical** (`#A93F2F` is provisional)

## Deliberate exclusions

- `src/pages/ProgramMap.tsx` — per-program `HEADER_COLOR` / `BORDER_COLOR` maps (sky-blue, deep-teal, trail-green, sun-amber, charcoal) kept intentionally; colour aids map comprehension. User deferred decision on whether to convert.
- `src/components/ui/toast.tsx` — shadcn/ui destructive toast red classes left untouched.

**Why:** Amber solid fill is forbidden for status; it is exclusively the primary CTA button colour (`bg-accent`). Using it for status would make every attention badge look like a button.

**How to apply:** When adding any new badge, dot, border, or status text, import `STATUS_CLASSES` from `statusColors.ts` and use the role key. Never introduce a new raw Tailwind colour family — always map to one of the five roles first.
