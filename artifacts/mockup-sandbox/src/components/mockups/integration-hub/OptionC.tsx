import { useState } from "react";

type StatusType = "live" | "partial" | "needs-setup" | "phase-2";

interface SetupItem {
  id: string;
  label: string;
  status: StatusType;
  owner: string;
  where: string;
  detail: string;
  action: string;
  actionLabel: string;
  tag: string;
}

interface Category {
  id: string;
  icon: string;
  label: string;
  description: string;
  items: SetupItem[];
}

const CATEGORIES: Category[] = [
  {
    id: "all",
    icon: "⚡",
    label: "All Setup Items",
    description: "Every configuration item across all domains",
    items: [],
  },
  {
    id: "api-keys",
    icon: "🔑",
    label: "API Keys & Auth",
    description: "Credentials, OAuth tokens, and access configuration",
    items: [
      { id: "gemini-key", label: "Gemini AI API Key", status: "live", owner: "Tech Lead", where: "Replit Secrets → GEMINI_API_KEY", detail: "Active · Gemini 2.5 Flash · 21 models available · POST /api/penny/ask wired · billing confirmed. Validated via GET /api/gemini/validate.", action: "/admin/integrations", actionLabel: "View integration", tag: "AI" },
      { id: "google-oauth", label: "Google OAuth (Drive, Calendar, Gmail)", status: "live", owner: "Tech Lead", where: "/admin/integrations/google-auth", detail: "GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + 3 refresh tokens (Drive, Calendar, Gmail). All scopes confirmed. Re-authorize at /admin/integrations/google-auth if tokens expire.", action: "/admin/integrations/google-auth", actionLabel: "View OAuth config", tag: "Google" },
      { id: "sf-creds", label: "Salesforce credentials", status: "live", owner: "Ops Admin", where: "Replit Secrets → SALESFORCE_*", detail: "SALESFORCE_INSTANCE_URL + SALESFORCE_ACCESS_TOKEN active · 127 Accounts, 129 Contacts, NPSP + PMM (7/8 objects) · read-only REST API live.", action: "/admin/integrations", actionLabel: "SF config", tag: "Salesforce" },
      { id: "agentforce-key", label: "Agentforce API Key", status: "live", owner: "Tech Lead", where: "Replit Secrets → AGENTFORCE_API_KEY", detail: "Agent ID 0Xxan0… · Sessions API live · create → message → close per invoke cycle confirmed via Assessment panel.", action: "/penny/assessments", actionLabel: "Test Agentforce", tag: "AI" },
      { id: "clerk-keys", label: "Clerk v6 authentication keys", status: "live", owner: "Tech Lead", where: "Replit Secrets → CLERK_*", detail: "Clerk v6.9.1 · Google Sign-In wired · ClerkProvider + proxy configured · signed-in/signed-out gating live across all routes.", action: "/admin/setup", actionLabel: "Auth config", tag: "Access" },
      { id: "slack-tokens", label: "Slack bot + signing tokens", status: "partial", owner: "Ops Admin", where: "Replit Secrets → SLACK_*", detail: "Bot token, app token, signing secret, 3 channel IDs all configured. @coachconnectbot posting live. Missing: channels:read + groups:read scopes — add to Slack app manifest.", action: "/admin/integrations", actionLabel: "Fix scopes", tag: "Slack" },
    ],
  },
  {
    id: "google-drive",
    icon: "📂",
    label: "Google Drive Setup",
    description: "Drive folders, asset library, and file access",
    items: [
      { id: "penny-folder-id", label: "Penny Asset Library folder ID", status: "live", owner: "Content Admin", where: "Replit Secrets → GOOGLE_DRIVE_PENNY_FOLDER_ID", detail: "Set and confirmed · Shared Drive (TT Content → Penny Asset Library) · 6 state subfolders (Coaching, Confidence-Builder, Interview-Prep, Quest-Debrief, Resume-Review, Trail-Talk) · 38 assets loaded.", action: "/penny/asset-library", actionLabel: "Open Asset Library", tag: "Drive" },
      { id: "drive-subfolders", label: "6 Penny state subfolders created", status: "live", owner: "Content Admin", where: "Google Drive → TT Content → Penny Asset Library", detail: "All 6 subfolders confirmed in Drive with files. Subfolder names must match state slugs (coaching, confidence-builder, interview-prep, quest-debrief, resume-review, trail-talk).", action: "/penny/asset-library", actionLabel: "View library", tag: "Drive" },
      { id: "program-folders", label: "Program workspace folders linked", status: "needs-setup", owner: "Program Manager", where: "/knowledge/sources → Add Drive source", detail: "Google Drive OAuth is live and Shared Drive is accessible. Next step: create a Drive folder per program and link each in the Knowledge Source registry.", action: "/knowledge/sources", actionLabel: "Link folders", tag: "Drive" },
      { id: "drive-rules", label: "Drive signal rules configured", status: "phase-2", owner: "Tech Lead", where: "/collaboration → Drive rule card", detail: "Collaboration Overview drive rule card built. Automated routing of Drive activity to Penny and Trail Signals is Phase 2.", action: "/collaboration", actionLabel: "View rules", tag: "Drive" },
    ],
  },
  {
    id: "slack",
    icon: "💬",
    label: "Slack Channels",
    description: "Channel IDs, bot membership, and signal routing",
    items: [
      { id: "slack-penny-channel", label: "#penny-ai channel ID set", status: "live", owner: "Ops Admin", where: "Replit Secrets → SLACK_PENNY_CHANNEL_ID", detail: "Bot confirmed posting to Penny AI channel · coexistence POC (Agentforce + Penny dual-AI) confirmed in this channel.", action: "/admin/integrations", actionLabel: "Slack config", tag: "Slack" },
      { id: "slack-admin-channel", label: "#trail-os-admin channel ID set", status: "live", owner: "Ops Admin", where: "Replit Secrets → SLACK_ADMIN_CHANNEL_ID", detail: "Bot confirmed posting to Admin channel · smoke test message capability wired.", action: "/admin/integrations", actionLabel: "Slack config", tag: "Slack" },
      { id: "slack-read-scope", label: "channels:read + groups:read scopes", status: "needs-setup", owner: "Tech Lead", where: "Slack App Manifest → OAuth Scopes", detail: "These scopes are needed for Penny to resolve channel names and group membership. Add both to the Slack app manifest and reinstall the app.", action: "/admin/integrations", actionLabel: "Fix scopes", tag: "Slack" },
      { id: "slack-weekly-brief", label: "Weekly Brief delivery pipeline", status: "needs-setup", owner: "Tech Lead", where: "/penny/capabilities → Weekly Brief", detail: "Penny Weekly Brief capability defined but Slack delivery not yet wired end-to-end. Requires channels:read scope first.", action: "/penny/capabilities", actionLabel: "View capability", tag: "Slack" },
    ],
  },
  {
    id: "content",
    icon: "📚",
    label: "Content & Insights",
    description: "Knowledge sources, SF field mapping, and Penny content",
    items: [
      { id: "knowledge-sources-verify", label: "Verify 3 unverified knowledge sources", status: "needs-setup", owner: "Knowledge Manager", where: "/knowledge/sources → Trust review", detail: "3 sources are Unverified and not yet fed to Penny's RAG corpus. Complete trust review for each to activate them in Penny.", action: "/knowledge/sources", actionLabel: "Review sources", tag: "Content" },
      { id: "sf-insights-mapping", label: "SF Insights field mapping", status: "needs-setup", owner: "Ops Director", where: "/operations/scorecards → Field config", detail: "Salesforce Accounts, Contacts, and Cases data is live. Penny context fields (program match, risk level, engagement score) not yet mapped from SF objects.", action: "/operations/scorecards", actionLabel: "Map fields", tag: "Salesforce" },
      { id: "penny-assets-loaded", label: "Penny assets uploaded to Drive", status: "live", owner: "Content Admin", where: "Google Drive → TT Content → Penny Asset Library", detail: "38 assets across 6 state folders confirmed · thumbnails loading in Asset Library · grid view live at /penny/asset-library.", action: "/penny/asset-library", actionLabel: "View assets", tag: "Content" },
      { id: "sf-kb", label: "Salesforce KB connector", status: "needs-setup", owner: "Tech Lead", where: "/knowledge/sources → Add Salesforce source", detail: "SF REST API is live and querying Accounts/Contacts/Cases. SF Knowledge Base object not yet connected to Knowledge Library.", action: "/knowledge/sources", actionLabel: "Configure", tag: "Salesforce" },
      { id: "org-memory", label: "Org Memory decision records", status: "phase-2", owner: "Program Manager", where: "/knowledge/memory", detail: "Org Memory tab built — decision record creation, structured templates, and AI indexing are Phase 2.", action: "/knowledge/memory", actionLabel: "View Memory", tag: "Content" },
    ],
  },
  {
    id: "access",
    icon: "🔐",
    label: "Access Control",
    description: "User tiers, group membership, and route gating",
    items: [
      { id: "google-groups-tier", label: "Google Groups auto-tier", status: "live", owner: "Workspace Admin", where: "Google Workspace Admin → Groups", detail: "3 Google Groups (Everyday / Power / Admin) drive tier assignment. Service account DWD configured. Real group membership resolved on every login via /api/auth/tier.", action: "/admin/integrations", actionLabel: "View config", tag: "Access" },
      { id: "tier-gated-routes", label: "Role-gated routes live", status: "live", owner: "Tech Lead", where: "App.tsx → HubShell tier guards", detail: "Admin+ tabs, actions, and sidebar items hidden from Everyday users. HubShell hides tab bar when only 1 tab available.", action: "/admin/setup", actionLabel: "View setup", tag: "Access" },
      { id: "secrets-audit", label: "Secrets audit passing", status: "live", owner: "Tech Lead", where: "/admin/secrets-audit", detail: "Dual-layer audit: presence/format check + live API validation. All critical secrets present. Run live check at /admin/secrets-audit.", action: "/admin/secrets-audit", actionLabel: "Run audit", tag: "Security" },
    ],
  },
];

// Flatten all items into the "All" category
const ALL_ITEMS = CATEGORIES.filter((c) => c.id !== "all").flatMap((c) => c.items);
CATEGORIES[0].items = ALL_ITEMS;

const STATUS: Record<StatusType, { dot: string; badge: string; label: string; row: string }> = {
  live: { dot: "bg-emerald-500", badge: "bg-emerald-50 border-emerald-200 text-emerald-700", label: "Live", row: "" },
  partial: { dot: "bg-amber-400", badge: "bg-amber-50 border-amber-200 text-amber-700", label: "Partial", row: "border-l-2 border-l-amber-300" },
  "needs-setup": { dot: "bg-rose-500", badge: "bg-rose-50 border-rose-200 text-rose-700", label: "Needs Setup", row: "border-l-2 border-l-rose-400" },
  "phase-2": { dot: "bg-zinc-300", badge: "bg-zinc-50 border-zinc-200 text-zinc-400", label: "Phase 2", row: "" },
};

export function OptionC() {
  const [activeCat, setActiveCat] = useState("needs-setup-filter");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusType | "all">("all");

  const cat = activeCat === "needs-setup-filter"
    ? { ...CATEGORIES[0], label: "Needs Attention", items: ALL_ITEMS.filter((i) => i.status === "needs-setup" || i.status === "partial") }
    : CATEGORIES.find((c) => c.id === activeCat) ?? CATEGORIES[0];

  const displayItems = filter === "all" ? cat.items : cat.items.filter((i) => i.status === filter);

  const needsCount = ALL_ITEMS.filter((i) => i.status === "needs-setup").length;
  const partialCount = ALL_ITEMS.filter((i) => i.status === "partial").length;
  const liveCount = ALL_ITEMS.filter((i) => i.status === "live").length;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Administration — Integration Center</p>
            <h1 className="text-xl font-bold text-zinc-900">Integration Setup Checklist</h1>
            <p className="text-[13px] text-zinc-500 mt-0.5">Every configuration item needed to run Penny and Trail OS, organized by domain.</p>
          </div>
          <div className="flex gap-2">
            {(["all", "live", "partial", "needs-setup"] as const).map((f) => {
              const count = f === "all" ? ALL_ITEMS.length : ALL_ITEMS.filter((i) => i.status === f).length;
              const colors: Record<string, string> = {
                all: "border-zinc-300 text-zinc-700 bg-white",
                live: "border-emerald-200 text-emerald-700 bg-emerald-50",
                partial: "border-amber-200 text-amber-700 bg-amber-50",
                "needs-setup": "border-rose-200 text-rose-700 bg-rose-50",
              };
              const labels: Record<string, string> = { all: "All", live: "Live", partial: "Partial", "needs-setup": "Needs Setup" };
              return (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${filter === f ? colors[f] + " ring-1 ring-offset-1 ring-current" : "border-zinc-200 text-zinc-500 bg-white hover:bg-zinc-50"}`}>
                  {labels[f]} <span className="ml-1 font-bold">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Sidebar categories */}
        <div className="w-56 bg-white border-r border-zinc-200 overflow-auto flex flex-col">
          {/* Needs attention shortcut */}
          <div className="p-3 border-b border-zinc-100">
            <button
              onClick={() => setActiveCat("needs-setup-filter")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all ${activeCat === "needs-setup-filter" ? "bg-rose-50 border border-rose-200" : "hover:bg-zinc-50 border border-transparent"}`}
            >
              <span className="text-base">🚦</span>
              <div>
                <div className={`text-[12px] font-semibold ${activeCat === "needs-setup-filter" ? "text-rose-700" : "text-zinc-700"}`}>Needs Attention</div>
                <div className="text-[10px] text-zinc-400">{needsCount + partialCount} items</div>
              </div>
            </button>
          </div>
          <div className="p-3 space-y-1">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-2 mb-2">By Domain</p>
            {CATEGORIES.filter((c) => c.id !== "all").map((c) => {
              const live = c.items.filter((i) => i.status === "live").length;
              const pct = Math.round((live / c.items.length) * 100);
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border ${activeCat === c.id ? "bg-violet-50 border-violet-200" : "border-transparent hover:bg-zinc-50"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{c.icon}</span>
                    <span className={`text-[11px] font-semibold ${activeCat === c.id ? "text-violet-800" : "text-zinc-700"}`}>{c.label}</span>
                  </div>
                  <div className="ml-5 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-zinc-100 overflow-hidden">
                      <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[9px] text-zinc-400">{live}/{c.items.length}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Checklist panel */}
        <div className="flex-1 overflow-auto">
          <div className="px-6 py-4 border-b border-zinc-200 bg-white flex items-center gap-3">
            <span className="text-xl">{activeCat === "needs-setup-filter" ? "🚦" : (CATEGORIES.find((c) => c.id === activeCat)?.icon ?? "⚡")}</span>
            <div>
              <h2 className="text-[14px] font-bold text-zinc-900">{cat.label}</h2>
              <p className="text-[11px] text-zinc-500">{cat.description} · {displayItems.length} items</p>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {displayItems.length === 0 && (
              <div className="text-center py-12 text-zinc-400 text-[13px]">No items match the current filter.</div>
            )}
            {displayItems.map((item) => {
              const s = STATUS[item.status];
              const isOpen = expandedItem === item.id;
              return (
                <div key={item.id} className={`rounded-xl border bg-white overflow-hidden transition-shadow ${isOpen ? "shadow-md" : "hover:shadow-sm"} ${s.row}`}>
                  <button
                    onClick={() => setExpandedItem(isOpen ? null : item.id)}
                    className="w-full text-left px-5 py-3.5 flex items-center gap-3"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`}></span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-zinc-800">{item.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{item.where}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-zinc-400 hidden sm:block">{item.owner}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>{s.label}</span>
                      <span className="text-zinc-300 text-xs">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-3 border-t border-zinc-100 bg-zinc-50">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-[12px] text-zinc-600 leading-relaxed">{item.detail}</p>
                          <p className="text-[10px] text-zinc-400 mt-2 font-medium">Owner: {item.owner} · Location: {item.where}</p>
                        </div>
                        <a href={item.action} className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[11px] font-semibold hover:bg-violet-700 transition-colors whitespace-nowrap">
                          {item.actionLabel} →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
