// ── Types ─────────────────────────────────────────────────────────────────────

export type ChangeKind = "major" | "minor" | "fix";

export interface ReleaseEntry {
  kind: ChangeKind;
  text: string;
}

export interface Release {
  version: string;
  date: string;
  label?: string;
  entries: ReleaseEntry[];
}

// ── Release data ──────────────────────────────────────────────────────────────

export const RELEASES: Release[] = [
  {
    version: "1.5",
    date: "August 6, 2026",
    label: "Current",
    entries: [
      { kind: "major", text: "Homebase system launched — audience-dispatched landing pages for learners, coaches, volunteers, and team staff, each with a dedicated shell and personalised content." },
      { kind: "major", text: "Google SSO + Google Group routing live — sign-in derives each user's audience from DWD group membership; 5-minute cache auto-refreshes on /me." },
      { kind: "major", text: "Learner Homebase shipped — upcoming sessions, quest progress band, Penny nudges, and a clear sign-in error page for rejected learners." },
      { kind: "major", text: "Coach Homebase shipped — squad overview, artefact review queue, and week summary card." },
      { kind: "major", text: "Volunteer Homebase shipped — real Salesforce unassigned case queue with specialty matching, optimistic claim UI, and two-layer concurrency protection." },
      { kind: "major", text: "Team Homebase shipped — team@transitiontrails.org members land on a focused workspace with a Mission Control link; superadmins in the group reach it via /homebase." },
      { kind: "minor", text: "Back to Homebase card added to Mission Control — visible for all team group members (including superadmins) via direct group membership check." },
      { kind: "minor", text: "Staff volunteer admin page at /admin/people/volunteers — set commitment level, specialty, and coordinator without leaving Trail OS." },
      { kind: "minor", text: "19-test Google Group audience routing suite + DWD diagnostic probe script added to the API server." },
      { kind: "minor", text: "connect-pg-simple replaces session-file-store for durable cross-instance sessions — all 561 tests updated and passing." },
      { kind: "fix",   text: "Learner sign-in blank page fixed — rejected learners now see a clear error message with reason and retry button instead of a silent redirect." },
      { kind: "fix",   text: "Home icon naming collision in Mission Control fixed — was accidentally rendering the entire page component inside the card, causing a blank white screen." },
    ],
  },
  {
    version: "1.4",
    date: "August 5, 2026",
    entries: [
      { kind: "major",  text: "Salesforce interaction log now writes with correct Source__c value ('TRAIL OS') — eliminates the silent zero-record failure that was discarding all logs." },
      { kind: "major",  text: "Staff writes to Penny_Interaction_Log__c are now deliberately skipped (Learner__c is required) and surfaced as a neutral 'Skipped' column in the write-health strip instead of silently failing." },
      { kind: "major",  text: "Audience__c field wiring added to interaction log payload, SOQL queries, and memory-window filter — activates automatically once the field is provisioned in Salesforce Setup." },
      { kind: "minor",  text: "Write-health strip expanded to 4 columns: Attempts · Successful · Failed · Skipped." },
      { kind: "minor",  text: "Compile-time exhaustiveness guard added to SfInteractionSource — adding a new picklist value without handling it is now a TypeScript error." },
      { kind: "minor",  text: "Version badge in sidebar footer is now a link to this release notes page." },
      { kind: "fix",    text: "Stale api-server .tsbuildinfo cache deleted — was causing spurious TypeScript errors about articleReviewsTable.nextReviewDue not existing." },
      { kind: "fix",    text: "getInteractionHistory SOQL now filters by audience = 'learner' so staff messages no longer pollute the learner memory window." },
    ],
  },
  {
    version: "1.3",
    date: "July 18, 2026",
    entries: [
      { kind: "major",  text: "Knowledge Review Queue launched — staff can approve, reject, and annotate SF Knowledge articles from within Trail OS." },
      { kind: "major",  text: "Article review audit trail added: reviewer name, timestamp, and decision are stored and shown in the review queue." },
      { kind: "major",  text: "Quest activity retry logic introduced — learners no longer lose a quest response if the Salesforce write fails on the first attempt." },
      { kind: "minor",  text: "Trail Signals → Ask Penny auto-fire pattern: clicking a signal now pre-populates the Penny panel with rich context." },
      { kind: "minor",  text: "Validation Center now labels TT Automation as 'Deferred (Phase 2)' rather than a passing check." },
      { kind: "minor",  text: "SF Cases Lightning URL construction fixed — uses the correct MyDomain base URL from Organization sobject instead of the legacy instance hostname." },
      { kind: "fix",    text: "Penny write-health monitor now correctly distinguishes 'rate-limited describe' from 'missing fields' in the Validation Center." },
      { kind: "fix",    text: "Picklist type guard prevents unknown Source__c values from reaching Salesforce (was causing silent zero-record inserts)." },
    ],
  },
  {
    version: "1.2",
    date: "June 28, 2026",
    entries: [
      { kind: "major",  text: "Procedure Builder launched — create and publish step-by-step procedures stored in Google Drive under Content/Procedures/[slug]/." },
      { kind: "major",  text: "Learner Edit Drawer introduced — profile state lifted to LearnerDetail parent; trail and coaching sections save independently." },
      { kind: "major",  text: "Program Penny Config wired to database — pennyStatus persisted via program_penny_configs table with GET/PATCH API routes." },
      { kind: "minor",  text: "Role-aware hub pattern enforced — HubShell hides the tab bar when only one tab is available (Everyday tier)." },
      { kind: "minor",  text: "ContextBar tier variants shipped: EverydayContextBar (auto-label), PowerContextBar (Current Focus), AdminContextBar (full engine)." },
      { kind: "minor",  text: "Hub overview-first pattern applied to Knowledge, Programs, and Penny — first tab is always the Command Center at the base path." },
      { kind: "fix",    text: "Drive folder search debounce added — prevents stalling when a user types quickly." },
      { kind: "fix",    text: "Reviewed articles no longer reappear after a browser refresh." },
    ],
  },
  {
    version: "1.1",
    date: "June 10, 2026",
    entries: [
      { kind: "major",  text: "Google OAuth wizard launched at /admin/integrations/google-auth — guides staff through DWD service account setup and per-user consent." },
      { kind: "major",  text: "Slack validation provider wired — auto-fetches channel membership and posts a smoke-test message from the integration center." },
      { kind: "major",  text: "Phase 1 Readiness Dashboard shipped at /admin/phase1-readiness — real-time view of integration health, data coverage, and POC status." },
      { kind: "minor",  text: "Centralized integration truth in src/data/readinessState.ts — Salesforce, Slack, Gemini, Google Drive, Google Calendar, and Agentforce all marked 'live'." },
      { kind: "minor",  text: "Admin sidebar consolidated: Setup + Integrations + People & Access. All old paths redirect to /admin/integrations." },
      { kind: "minor",  text: "Brand design system tokens committed to src/index.css — Poppins (headings) and Open Sans (body) applied globally." },
      { kind: "fix",    text: "Salesforce OAuth callback URL rejection fixed — Connected App now accepts the correct redirect URI." },
      { kind: "fix",    text: "Session silent logout on token expiry patched — Salesforce token refresh is now handled gracefully." },
    ],
  },
  {
    version: "1.0",
    date: "May 22, 2026",
    entries: [
      { kind: "major",  text: "Trail OS initial release — Program Map dashboard, Digital Twin (Explore / Map / Impact / Governance), and Operations Hub live." },
      { kind: "major",  text: "Penny AI assistant launched — Ask Penny panel, memory window, interaction log, and capability registry." },
      { kind: "major",  text: "Knowledge workspace shipped — Knowledge graph, SF Knowledge articles, and Org Memory." },
      { kind: "major",  text: "Collaboration workspace shipped — My Trail Signals, Google Drive, Google Calendar, Gmail, and Slack integration centers." },
      { kind: "major",  text: "Google SSO authentication live — per-user sign-in, Google Groups tier lookup, and 5-minute group cache." },
      { kind: "minor",  text: "Global search, Context switcher, and ContextBar always-visible footer wired across all pages." },
      { kind: "minor",  text: "RESOLVE demand workflow integrated — 7-phase pipeline: Recognize, Explore, Select, Outline, Launch, Verify, Evolve." },
      { kind: "minor",  text: "Role-based access enforced (Everyday / Power / Staff / Admin) via default-deny middleware and Clerk publishable key." },
    ],
  },
];
