import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tag, Wrench, Sparkles, ArrowUpCircle } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChangeKind = "major" | "minor" | "fix";

interface ReleaseEntry {
  kind: ChangeKind;
  text: string;
}

interface Release {
  version: string;
  date: string;
  label?: string;
  entries: ReleaseEntry[];
}

// ── Release data ──────────────────────────────────────────────────────────────

const RELEASES: Release[] = [
  {
    version: "1.4",
    date: "August 5, 2026",
    label: "Current",
    entries: [
      { kind: "major",  text: "Salesforce interaction log now writes with correct Source__c value ('TRAIL OS') — eliminates the silent zero-record failure that was discarding all logs." },
      { kind: "major",  text: "Staff writes to Penny_Interaction_Log__c are now deliberately skipped (Learner__c is required) and surfaced as a neutral 'Skipped' column in the write-health strip instead of silently failing." },
      { kind: "major",  text: "Audience__c field wiring added to interaction log payload, SOQL queries, and memory-window filter — activates automatically once the field is provisioned in Salesforce Setup." },
      { kind: "major",  text: "Deployment build hook added: production DB schema is now auto-migrated (drizzle-kit push) on every publish, ending the schema-drift warnings that appeared in the publish UI." },
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const KIND_META: Record<ChangeKind, { label: string; icon: React.ReactNode; color: string }> = {
  major: {
    label: "Major",
    icon: <ArrowUpCircle className="w-3.5 h-3.5" />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  minor: {
    label: "Minor",
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: "bg-sky-50 text-sky-700 border-sky-200",
  },
  fix: {
    label: "Bug Fix",
    icon: <Wrench className="w-3.5 h-3.5" />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

function KindBadge({ kind }: { kind: ChangeKind }) {
  const meta = KIND_META[kind];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium shrink-0 ${meta.color}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReleaseNotes() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
            Trail OS
          </p>
        </div>
        <h1 className="text-lg font-semibold font-serif text-foreground">Release Notes</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          A history of major features, improvements, and bug fixes across every version.
        </p>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-b border-border shrink-0 flex items-center gap-3">
        <span className="text-[11px] text-muted-foreground mr-1">Key:</span>
        {(["major", "minor", "fix"] as ChangeKind[]).map((k) => (
          <KindBadge key={k} kind={k} />
        ))}
      </div>

      {/* Releases */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-6 space-y-10 max-w-2xl">
          {RELEASES.map((release) => (
            <section key={release.version}>
              {/* Version header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold font-serif text-foreground">
                    v{release.version}
                  </span>
                  {release.label && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {release.label}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">{release.date}</span>
                <div className="flex-1 border-t border-border" />
              </div>

              {/* Entries grouped by kind */}
              {(["major", "minor", "fix"] as ChangeKind[]).map((kind) => {
                const items = release.entries.filter((e) => e.kind === kind);
                if (items.length === 0) return null;
                return (
                  <div key={kind} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <KindBadge kind={kind} />
                    </div>
                    <ul className="space-y-2 pl-1">
                      {items.map((entry, i) => (
                        <li key={i} className="flex gap-2 text-[12px] text-foreground/80 leading-relaxed">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                          {entry.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
