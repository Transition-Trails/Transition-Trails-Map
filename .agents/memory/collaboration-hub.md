---
name: Collaboration hub consolidation
description: 6 sidebar items + 2 dead pages folded into one CollaborationHub with 4 tabs.
---

CollaborationHub at `/collaboration` replaces all previous per-service routes.

**4 tabs:**
- Overview (`/collaboration`) — live service status grid (Slack/Gmail/Calendar/Drive), signal routing summary, active channels, quick-nav cards
- Comms (`/collaboration/comms`) — inner tab switcher: Gmail (GmailCenter.tsx) | Google Calendar (CalendarPanel.tsx)
- Trail Signals (`/collaboration/signals`) — renders MyTrailSignals.tsx (localStorage-based personal signal config)
- Channels (`/collaboration/channels`, admin-only) — inner tab switcher: CommChannels | MessageTemplates | CommNotifications | WeeklyBriefs

**Files deleted:** CollaborationWorkspace.tsx (was unrouted dead code), SlackIntegrationCenter.tsx (1,679 lines; live Slack validation status absorbed into Overview tab; channel management lives in CommChannels)

**Files kept in place (used as tab content):**
- `artifacts/program-map/src/pages/collaboration/GmailCenter.tsx`
- `artifacts/program-map/src/pages/collaboration/CalendarPanel.tsx`
- `artifacts/program-map/src/pages/collaboration/MyTrailSignals.tsx`
- `artifacts/program-map/src/pages/communications/CommChannels.tsx`
- `artifacts/program-map/src/pages/communications/MessageTemplates.tsx`
- `artifacts/program-map/src/pages/communications/CommNotifications.tsx`
- `artifacts/program-map/src/pages/communications/WeeklyBriefs.tsx`

**GoogleCalendarIntegrationCenter + GoogleDriveIntegrationCenter** remain in the collaboration folder but are only rendered via `/admin/integrations/google-calendar` and `/admin/integrations/google-drive` routes — not under /collaboration any more.

**max-w removed from:** MyTrailSignals.tsx, CommNotifications.tsx, MessageTemplates.tsx.

**Sidebar:** was 6 items; now 4 (Overview, Comms, Trail Signals, Channels[admin]).

**Old routes redirect:** my-signals→/signals, calendar-live/gmail→/comms, slack→/, templates/briefs/notifications→/channels.

**Why:** Too many sidebar items showed the same data from different angles (Slack signals overlapped MyTrailSignals, channel lists duplicated). Consolidating into one hub with inner-tab sub-navigation eliminates duplication while keeping all live functionality intact.

**How to apply:** New collaboration features go as tabs or sections within CollaborationHub, not as new top-level sidebar pages. If a feature is user-facing daily use → Comms or Signals tab. Admin/config → Channels tab.
