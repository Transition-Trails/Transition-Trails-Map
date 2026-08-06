# Transition Trails Design System (TTDS)

> Version 2.0 · June 2026 · The single source of truth for the Transition Trails brand.
> **Mission:** *"Empowering individuals and organizations by bridging the experience gap through education, mentorship, and hands-on work."*

TTDS is the visual translation of the Transition Trails mission. It is nature-inspired, reinforcing the metaphor of **trails and guided progress**. This is the binding style reference — do not invent colors, type, spacing, or components not grounded here.

---

## Organization Context

**Transition Trails** is a nonprofit workforce-development organization that solves the *"experience gap"* — the systemic problem where talented people earn professional certifications (primarily **Salesforce**) but cannot land a first role because employers demand verifiable, on-the-job experience. Transition Trails focuses exclusively on **post-certification, experience-based development**: supervised project work with real nonprofit partners, guided by expert mentors, producing trusted proof of applied judgment.

**Three stakeholders:**
- **Learners** — earn experience-validated credentials employers recognize.
- **Nonprofit partners** — receive supervised project capacity at low risk.
- **The organization** — a durable, founder-independent, evidence-driven institution.

**Five strategic pillars:** Evidence Before Scale · Founder-Independent Delivery · Governed Technology & AI · Measurable Nonprofit Impact · Financial Sustainability.

**Founder & CEO:** Angela Hines. Website: transitiontrails.org

### Products / surfaces represented
- **Marketing website** (`transitiontrails.org`) — orientation & invitation; homepage, program pages, get-involved.
- **Learner portal** — built on **Salesforce Experience Cloud**; the learner's dashboard and program tracking. TTDS maps directly to Experience Cloud theme settings (see Salesforce mapping in the brand book).

### Sources this system was built from
Provided by the user as read-only inputs:
- `uploads/TT_Brand_Book_Design_System_v2.docx` — the full Brand Book & Design System (v2.0, June 2026). Sections: North Star (strategy), Voice (messaging), Visual Identity (logo/color/type/imagery), Brand in Action (application, Salesforce mapping, governance).
- Mounted codebase `Transition Trails design system/design-system/` — `base.md` (condensed guide), `tokens.css` (design tokens), `components.html` (copy-ready component markup). The tokens here are lifted verbatim from these files.

No design binaries (logo PNGs, photography, illustrations, font files) were included with those sources — see **Caveats** below.

---

## Content Fundamentals

One unified voice: **calm, credible, encouraging.** The persona is a **Strategic Advisor** — knowledgeable and forward-thinking, yet grounded, accessible, and focused on helping others navigate their journey. **We guide; the learner is always the hero.**

- **Person & address:** Speak *to* the learner as "you"; the organization is "we." Never make the org the hero ("we transformed his career" → "he built the experience employers were looking for").
- **Casing:** Sentence case for body and UI. Title Case for proper program/trail names. No ALL-CAPS shouting.
- **Tone traits:** Professional & forward-thinking · Supportive & guiding · Clear & action-oriented · Calm & confident. Precise language, actionable next steps, no urgency/hype.
- **Trail-inspired lexicon** (use naturally, never forced): *pathway, milestone, horizon, guide, navigator, compass.*
- **Prohibited terms** (protect identity within the Salesforce ecosystem — TT is independent):
  - "Trailhead" → **Learning Path / Curriculum**
  - "Trailblazer" → **Learner / Navigator / Transitioner**
  - "Ohana" → **TTDS Community / Network**
  - "Ranger / Expedition" → **Milestone / Stage**
- **Avoid:** overpromising ("guaranteed job!"), corporate buzzwords, talking down, exaggeration.
- **Emoji:** not part of the brand. Do not use in product/marketing copy. Status meaning is carried by icons + text, never color or emoji alone.
- **Content mix (70/20/10):** 70% *The Guide* (tips, how-tos — "Here is a tool for your journey"), 20% *The Navigator* (learner/volunteer/partner stories — "Others are on this path with you"), 10% *The Compass* (donate/volunteer/enroll — "The next step on your trail is here").

**Example copy in-voice:**
- CTA labels: "Find your Trail", "Take the Next Step →", "Support the Mission", "View All Trails →"
- Reassuring microcopy: "We'll only use this to send trail updates."
- Callout accent (Caveat): *start your journey today*

---

## Visual Foundations

**Overall vibe:** nature-inspired, warm, soft, and reassuring — "calm confidence." Generous whitespace, gentle motion, rounded forms. Never hype, neon, or high-tech.

**Color.** Four brand colors, each with clear intent:
- **Trail Green `#2F6B3F`** — primary: action buttons, headings, growth themes.
- **Deep Teal `#2F6F7E`** — secondary: containers, nav header background, footer, depth.
- **Sky Blue `#7FAFC6`** (tint `#EDF5F8`) — surface: backgrounds, cards, "white-space equivalent."
- **Sun Amber `#F5A623`** — accent: **one** "Next Step" CTA per screen, progress markers, highlights.
- Neutrals: Trail Light `#FAFAF7` (main bg), Warm Gray `#E2E4E1` (borders/dividers), Slate `#4A4F4D` (body text), Charcoal `#2A2E2C` (headings/icons).
- Ramps exist for Green & Amber (100/300/500/700). **Max 1–2 background colors per surface.**
- **Sun Amber rule:** never more than one amber CTA per screen; never decorative. Never rely on color alone for meaning (pair with icon + text).

**Type.** Poppins (geometric, modern, confident) for headings H1–H4; Open Sans (Roboto fallback; highly readable, neutral) for body & UI; Caveat (handwritten, warm) for accent only — trail names / short pull quotes, **max one per page, never body or UI.** Scale: H1 36–48 / H2 28–36 / H3 22–28 / H4 18–22 / body 16–18 / small 14–16 / label 14–16. Minimum sizes honor accessibility guidance — never shrink below.

**Spacing & layout.** 8px-based scale (4·8·16·24·32·48·64). Clear vertical flow; content hierarchy drives layout; predictable rhythm reduces cognitive load. Generous margins and padding. Simple content blocks, one primary CTA per view.

**Radius.** Soft & approachable: sm 8px · md 14px (buttons, inputs) · lg 22px (cards) · pill 999px (badges). No sharp corners.

**Backgrounds.** Flat brand colors and light neutral surfaces — **no aggressive gradients.** Card media may use a soft green tint gradient (`--tt-green-100 → --tt-green-300`) as a placeholder for photography. Imagery, when present, is candid documentary **photography** (diverse people, learning in motion, natural/soft light) or **hand-drawn/watercolor illustration** (earthy palette; trails, bridges, maps, compasses). Imagery color vibe: warm, natural, muted greens/blues — never cool tech, neon, or glossy stock.

**Borders.** 1px Warm Gray on cards/dividers; 1.5px Warm Gray on inputs and secondary-button outlines (teal outline for secondary buttons).

**Shadows.** Soft and low-contrast: card `0 12px 28px rgba(42,46,44,.10)`, soft `0 6px 16px rgba(42,46,44,.08)`, amber CTA glow `0 2px 8px rgba(245,166,35,.35)`. No hard drop shadows on the logo, ever.

**Focus.** Green focus ring `0 0 0 3px rgba(47,107,63,.15)` on inputs and interactive fields.

**Animation & interaction.** Purposeful only — "avoid decorative animation without meaning." Scroll fade-ins for orientation; hover states to reinforce interactivity; progress indicators to signal advancement. Cards **lift** on hover (`translateY(-3px)` + card shadow, ~.15s). Buttons transition background/color on hover (primary → green-700; amber → amber-700; secondary → sky-100 fill). Press = darker color (no aggressive shrink). Easing: gentle/standard, short (~.15s). No bounces.

**Transparency & blur.** Used sparingly — the amber shadow and focus ring use low-opacity brand color; otherwise surfaces are solid. No heavy glass/blur motifs.

---

## Iconography

The brand book does not ship an icon font or SVG icon set, and none were included in the provided sources. TTDS relies on a small set of **semantic status glyphs used inline with text** (never color-alone):
- Success `✓` · Info `ⓘ` · Warning `⚠` — as seen in the copy-ready alerts.
- Directional affordance: a trailing arrow `→` on forward-motion CTAs ("Take the Next Step →").

**Emoji are NOT used** in product or marketing copy. Where richer UI icons are needed (nav, dashboard, feature blocks), substitute a **stroke icon set that matches the calm, rounded, human tone — Lucide** (rounded caps/joins, ~1.75–2px stroke) — pulled from CDN. **This is a substitution, flagged below** — swap for an official TT icon set if one exists. Do not hand-draw brand marks or logos; render the wordmark in Poppins type where a logo would go (no logo files were provided).

---

## Index / Manifest

**Root**
- `styles.css` — global entry point (imports only). Consumers link this.
- `readme.md` — this file.
- `SKILL.md` — Agent Skill wrapper for downloadable use.
- `thumbnail.html` — homepage tile.

**`tokens/`** — `fonts.css` · `colors.css` · `typography.css` · `spacing.css` · `elevation.css` · `semantic.css`

**`guidelines/`** — foundation specimen cards (Design System tab): color, type, spacing, brand voice.

**`components/`** — reusable primitives (each dir has `<Name>.jsx` + `.d.ts` + `.prompt.md` + a card):
- `actions/` → **Button**
- `forms/` → **Input**
- `content/` → **Card**
- `status/` → **Pill**, **Alert**, **Stepper**

**`ui_kits/`**
- `website/` → marketing site recreation (Homepage, Programs, Get Involved).
- `portal/` → Salesforce Experience Cloud learner portal (Dashboard, Program Detail).

**`assets/`** — see Caveats; no brand binaries were provided.

### Intentional additions
- **Stepper** — the brand book explicitly describes progress steppers (Amber = current step); built as a primitive.
- **Lucide icons (CDN)** — substituted for UI iconography since no icon set was provided (flagged).

---

## Caveats & substitutions
- **No logo files.** The brand book references `TT_Badge_1024px_transparent.png`, `TT_Stacked_White_*`, `TT_Circle_*`, `TT_AppIcon_1024px.png`, but none were supplied. The wordmark is rendered in **Poppins type** everywhere a mark would appear. *Please provide the logo PNGs to complete the identity.*
- **No local font files.** Poppins, Open Sans, and Caveat are loaded from the **Google Fonts CDN** (all three are available there). No `.ttf`/`.woff` binaries were provided.
- **No photography or illustration** assets were provided; card media and hero images use soft green-tint placeholders. *Please provide brand photography/illustration.*
- **Icons substituted** with Lucide (CDN) per above.
