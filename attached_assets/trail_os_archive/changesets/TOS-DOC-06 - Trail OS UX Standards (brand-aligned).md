# Trail OS UX Standards

> Replaces "Phase 1 UX Standards" · August 2026
> Applies to: the Trail OS operating platform. Mirrored in the app at the UX Standards page.

---

## Preamble — read this if you knew the old standard

The Transition Trails Design System is the source of truth for every visual decision in Trail OS.

Trail OS was built before the design system existed. The Phase 1 UX Standards were the best
available reference at the time, and they were solving a real problem: Trail OS is a dense internal
operations tool for a team of ten to thirty people, and consumer-scale typography would have made it
unusable. That instinct was correct.

The answer it reached — nine to twelve pixel type, uppercase micro-labels, tight radius — is the part
that has to change, because it conflicts with the brand and with accessibility. **Density is still a
goal. It is now achieved by showing fewer things, not by shrinking them.** Prefer fewer columns, a
narrower default, progressive disclosure, and a secondary tab over reducing type size.

Where this document and the design system disagree, the design system wins. This document does not
create a second standard; it states how the one standard applies at Trail OS density.

---

## 1. Type

**Faces.** Poppins for headings. Open Sans for body and all interface text. Nothing else.

- Caveat is a brand face but has no role in an operations tool. Not used in Trail OS.
- Fraunces is used on outward-facing surfaces only — the public site. Not used in Trail OS.
- The existing prohibition on serif faces stands.

**Floor: 14 pixels.** No interface text below fourteen pixels anywhere — badges, table cells,
timestamps, counts, captions, tooltips, helper text. This is the brand minimum and the accessibility
minimum, and there are no exceptions for density.

**Scale.** Trail OS sits at the bottom of each brand range, which is where an internal tool belongs.

| Role | Size | Face | Weight |
|---|---|---|---|
| Page title | 28px | Poppins | 600 |
| Section title | 22px | Poppins | 600 |
| Card or panel title | 18px | Poppins | 600 |
| Stat value | 28px | Poppins | 600 |
| Body | 16px | Open Sans | 400 |
| Secondary / metadata | 14px | Open Sans | 400 |
| Label, badge, table header | 14px | Open Sans | 600 |

**Casing.** Sentence case throughout the interface. No uppercase eyebrow labels, no all-caps
anything. Title Case only for proper programme and trail names.

The old standard used tiny bold uppercase text as a way of making small text legible. At fourteen
pixels that treatment reads as shouting, and the brand asks for sentence case. Drop the uppercase
when you raise the size.

---

## 2. Colour

**Everything comes from the token layer.** No raw hex values and no stock framework palette classes
in a screen. If a colour is needed and no token exists, that is a design-system question, not a
local decision.

**The four brand colours.** Trail Green for primary action and growth. Deep Teal for containers,
headers and depth. Sky Blue and its tint for surfaces. Sun Amber for the accent.

**Five status roles, and only these five.**

| Role | Colour | Use for |
|---|---|---|
| Success | Trail Green | live, active, passing, complete, healthy, approved |
| Information | Deep Teal | configured, planned, by design, read-only, informational |
| Attention | Amber 700 text on Amber 100 | needs setup, partial, prototype, warning, needs rework |
| Critical | Functional red on its tint | blocked, failed, missing credentials, destructive |
| Neutral | Warm Gray with Slate text | not started, deferred, inactive, unknown |

The functional red is not a brand colour. It exists because an operations tool has to distinguish a
blocker from a warning, and the brand book has no red. It is pending a brand book entry as a
functional colour.

**The amber rule.** One amber element per screen, and it must be the primary action. Amber is never
a status fill, never a category colour, never decorative. Status uses amber *text on a tint*.

**Never colour alone.** Every status carries a text label and an icon. A coloured dot on its own is
not a status.

**Two background colours maximum** on any surface.

**No categorical colour.** Programmes, person types, roles and record types are distinguished by
their labels, not by hue. Four brand colours cannot carry eight programmes, and because the brand
requires a label alongside any colour, the hue would be decorative. One exception: the programme
map, which may use brand values for differentiation.

**Third-party marks keep their own colour.** Gmail, Slack and Salesforce logos are their brands, not
our status system. Do not convert them.

---

## 3. Shape and elevation

| Element | Radius |
|---|---|
| Small elements | 8px |
| Buttons, inputs | 14px |
| Cards | 22px |
| Badges, pills | fully rounded |

**Surfaces.** White cards on the Trail Light page background. The Sky tint for nested or secondary
surfaces inside a card. Never a card that is nearly the same value as the page behind it.

**Borders.** 1px Warm Gray on cards and dividers. 1.5px Warm Gray on inputs and secondary button
outlines.

**Shadows.** Soft and low contrast — the card shadow for cards, the lighter one for smaller raised
elements. No hard drop shadows. Never a shadow on a logo.

---

## 4. Spacing

The eight-pixel scale: 4, 8, 16, 24, 32, 48, 64. Nothing off-scale.

Generous padding is the brand default. Where Trail OS needs to be denser than the marketing site,
reach for the lower end of the scale — not for values outside it.

---

## 5. Interaction

**Focus.** A three-pixel Trail Green ring at fifteen percent opacity, on every interactive element.
Not one pixel, and not the framework default.

**Hover.** Cards lift three pixels over about a sixth of a second with the card shadow. Buttons
transition colour — primary to the dark green, amber to the dark amber, secondary to the sky fill.

**Press.** Goes darker. Nothing shrinks.

**Easing.** Gentle and short. No bounces.

**Animation only when it carries meaning** — orientation, progress, state change. No decorative
motion.

---

## 6. Layout patterns

These carried over from the Phase 1 standard unchanged. They were good and they stay.

- **Overview-first hubs.** Every hub's first tab is a populated overview at the hub's base path,
  showing real data. Never an empty split pane as a landing.
- **List and detail is a secondary tab**, never the default landing.
- **No modal or full-page overlays.** Use inline panels or tabs. The established exceptions are the
  right-rail panels — Ask Penny, the Gmail and Calendar action panels — which are part of the shell.
- **No empty default detail panes.** Every page shows something meaningful at first render.
- **No hero or intro cards** at the top of operational pages.
- **Underline tabs**, not pill buttons.
- **Ask Penny is always the right rail.** Never a modal, never a takeover.

---

## 7. Voice in the interface

- Sentence case. Speak to the user as "you"; the organisation is "we".
- Calm, precise, actionable. No urgency, no hype, no exaggeration.
- **No emoji**, in the product or in the repository documents. Status is an icon plus text.
- Prohibited as our own vocabulary: Trailhead, Trailblazer, Ohana, Ranger, Expedition. Referring to
  an external platform by its real name is fine; adopting its language as ours is not.

---

## 8. Role gating

Unchanged from the Phase 1 standard.

- **Everyday** — plain language, single tab, no action bar, no governance metadata.
- **Power and above** — operational controls, multi-tab hubs, action bar.
- **Admin and above** — the Administration group, Blueprint, People and Access.
- **Super Admin only** — Secrets Audit, the OAuth wizard, phase tooling.

Sidebar groups hide entirely below their minimum tier. Hub tabs are included conditionally.

---

## 9. What changed, and why

| Phase 1 standard | Now | Why |
|---|---|---|
| Eyebrow labels at 10px bold uppercase | 14px sentence case | Below the brand and accessibility floor; uppercase at 14px shouts |
| Body text at 11–12px | 16px, secondary 14px | Brand floor is 14 for small text, 16 for body |
| Badge text at 9–10px bold | 14px | Smallest text in the app; largest accessibility exposure |
| Stat values capped at ~20px | 28px Poppins | Brand H2 range; stats are headings |
| Cards at the smaller radius | 22px | Brand card radius — "soft and approachable" |
| Cards on a muted tinted background | White cards on Trail Light | The old pairing left ~2% separation between card and page |
| Six framework colour families for status | Five brand semantic roles | Brand has four colours and caps two backgrounds per surface |
| Amber used for warnings, categories, chrome | Amber = the one primary action | Brand amber rule; amber is never decorative |
| Framework default shadows, no hover | Brand shadows, 3px card lift | Brand elevation and motion spec |
| 1px focus ring | 3px Trail Green at 15% | Brand focus spec; also the better accessibility answer |
| Inter and Playfair Display | Poppins and Open Sans | Inter is on the brand avoid list; Playfair is not a brand face |

**Density is not lost.** It moves from type size to information architecture: fewer columns, tighter
spacing within the scale, progressive disclosure, and secondary tabs. If a screen cannot work at
fourteen pixels, the screen is showing too much — that is a layout problem, not a type problem.
