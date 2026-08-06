---
name: Digital Twin migration
description: Digital Twin was folded into Governance hub; routes redirect; old file kept but unused.
---

Digital Twin's three investigation tabs (Explore, Map, Impact) moved into GovernanceHub as new tabs.

**New tab paths:**
- Object Tracer → `/governance/tracer`
- Relationship Map → `/governance/map`
- Impact Analysis → `/governance/impact`

**Components:** All extracted into `artifacts/program-map/src/pages/governance/ObjectTracerTabs.tsx` which exports `ObjectTracerTab`, `RelationshipMapTab`, `ImpactAnalysisTab`, and the `SelectedObject` type.

**Shared state:** `selected: SelectedObject | null` lives in `GovernanceHub` and is passed via closure into each tab's `content` prop.

**Why:** Digital Twin's real value is as a diagnostic/investigation tool — tracing why Penny behaves a certain way or what cascades from an object change. Governance is the natural home for that framing. The old GovernanceTab in Digital Twin was just links to existing Governance pages; it was dropped entirely.

**Route handling:** All `/digital-twin/*` paths redirect to `/governance/tracer` (or `/governance/map`, `/governance/impact` where appropriate). The old DigitalTwin import and component routes were removed from App.tsx.

**Sidebar:** Digital Twin entry removed from Administration section. `/digital-twin` removed from `extraPrefixes` (only `/uom` and `/governance` remain).

**How to apply:** If adding new investigation/diagnostic features that trace object relationships, add them as sub-tabs or sub-sections within the three Governance investigation tabs — not as a new top-level page.
