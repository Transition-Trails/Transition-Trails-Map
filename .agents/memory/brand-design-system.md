---
name: Brand design system
description: Transition Trails brand tokens, their locations, and rules for how to use them in the app.
---

## Single source of truth
All brand values live in `artifacts/program-map/src/index.css` `:root` Section 1 (clearly labelled "TRANSITION TRAILS BRAND TOKENS"). The `@theme inline` block maps those to Tailwind utility names. Never write raw hex or HSL values outside Section 1.

## Fonts
- Headings: **Poppins** — mapped to `--app-font-serif` → `font-serif` / `var(--font-serif)`
- Body/interface: **Open Sans** — mapped to `--app-font-sans` → `font-sans`
- Monospace: Menlo — unchanged
- Loaded via `<link>` in `index.html` AND `@import` in `index.css` (both, for early paint)
- Global `h1–h6` rule in `@layer base` forces Poppins for all headings

**Why:** Inter and Playfair Display are not brand fonts. Inter is explicitly on the brand avoid list.

## Colour tokens (H S% L% for hsl())
| Token | Value | Hex | Role |
|---|---|---|---|
| `--brand-green` | `136 39% 30%` | #2F6B3F | Primary: buttons, links, headings |
| `--brand-green-light` | `145 25% 92%` | #E6F0EA | Hover tints, sidebar accent |
| `--brand-green-dark` | `136 40% 24%` | #245531 | Pressed/active states |
| `--brand-teal` | `191 46% 34%` | #2F6F7E | Secondary |
| `--brand-sky` | `199 38% 64%` | #7FAFC6 | Surface accent |
| `--brand-sky-tint` | `196 45% 95%` | #EDF5F8 | Nested panels, sidebar, muted |
| `--brand-amber` | `37 91% 55%` | #F5A623 | Accent |
| `--brand-trail-light` | `60 22% 97%` | #FAFAF7 | Page background |
| `--brand-warm-gray` | `100 5% 89%` | #E2E4E1 | Borders, dividers |
| `--brand-slate` | `156 3% 30%` | #4A4F4D | Body text |
| `--brand-charcoal` | `152 4% 17%` | #2A2E2C | Headings, icons |

## Radius
- `--brand-radius-sm`: 0.5rem (8px) → small elements
- `--brand-radius-md`: 0.875rem (14px) → buttons, inputs (`rounded-md`)
- `--brand-radius-lg`: 1.375rem (22px) → cards (`rounded-lg`)
- `--radius`: 0.875rem — backward compat for shadcn components

## Shadows
- `--brand-shadow-sm`: `0 6px 16px rgba(42,46,44,0.08)` — small elements
- `--brand-shadow-card`: `0 12px 28px rgba(42,46,44,0.10)` — cards
- `--brand-shadow-hover`: `0 15px 32px rgba(42,46,44,0.13)` — card hover state
- Applied via `.bg-card` selector in `@layer base`; hover lifts 3px at 167ms ease

## Focus ring
`*:focus-visible { outline: 3px solid rgba(47,107,63,0.15); outline-offset: 2px; }` in `@layer base`

## Dark theme
Intentionally **unchanged** — no brand dark palette specified yet. `.dark` block is frozen.

## Status badge colours (emerald, sky, violet, amber, indigo, rose)
NOT yet mapped to brand colours — that is a separate piece of work. Do not collapse these onto brand tokens until that brief is provided.
