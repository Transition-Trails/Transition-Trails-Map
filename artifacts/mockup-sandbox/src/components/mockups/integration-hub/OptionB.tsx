import { useState } from "react";

type StatusType = "live" | "partial" | "needs-setup" | "phase-2";

interface DepItem {
  label: string;
  status: StatusType;
  note: string;
  action?: string;
  actionLabel?: string;
}

interface DomainCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  border: string;
  headerBg: string;
  deps: DepItem[];
}

const DOMAINS: DomainCard[] = [
  {
    id: "ai-core",
    icon: "✨",
    title: "Penny AI Core",
    subtitle: "What Penny thinks with",
    color: "text-violet-700",
    border: "border-violet-200",
    headerBg: "bg-violet-50",
    deps: [
      { label: "Gemini 2.5 Flash key", status: "live", note: "GEMINI_API_KEY active · billing confirmed · POST /api/penny/ask live", action: "/admin/integrations", actionLabel: "View" },
      { label: "RAG knowledge corpus", status: "partial", note: "22 chunks active · 3 sources unverified — activate in Knowledge Library", action: "/knowledge/sources", actionLabel: "Review" },
      { label: "Agentforce Sessions API", status: "live", note: "Dual-AI coaching wired · Assessment panel live · Agent ID 0Xxan0…", action: "/penny/assessments", actionLabel: "View" },
      { label: "Penny capability registry", status: "live", note: "12 confirmed capabilities · prompt library active", action: "/penny/capabilities", actionLabel: "View" },
    ],
  },
  {
    id: "data-access",
    icon: "📂",
    title: "Data Access",
    subtitle: "What Penny reads",
    color: "text-sky-700",
    border: "border-sky-200",
    headerBg: "bg-sky-50",
    deps: [
      { label: "Salesforce (Accounts, Contacts, Cases)", status: "live", note: "127 Accounts · 129 Contacts · NPSP + PMM · read-only REST API live", action: "/admin/integrations", actionLabel: "View" },
      { label: "Google Drive — Penny Assets", status: "live", note: "GOOGLE_DRIVE_PENNY_FOLDER_ID set · Shared Drive · 6 state folders · 38 files", action: "/penny/asset-library", actionLabel: "Open" },
      { label: "Google Drive — Program folders", status: "needs-setup", note: "OAuth live but program workspace folders not yet linked in source registry", action: "/knowledge/sources", actionLabel: "Link" },
      { label: "SF Insights field mapping", status: "needs-setup", note: "Accounts/Cases data live but Penny context fields not mapped — configure in scorecards", action: "/operations/scorecards", actionLabel: "Map" },
    ],
  },
  {
    id: "channels",
    icon: "📡",
    title: "Channels & Comms",
    subtitle: "How Penny communicates",
    color: "text-emerald-700",
    border: "border-emerald-200",
    headerBg: "bg-emerald-50",
    deps: [
      { label: "Slack bot (@coachconnectbot)", status: "partial", note: "Posting confirmed to Penny AI + Admin channels · channels:read scope missing — channel names unresolved", action: "/admin/integrations", actionLabel: "Fix" },
      { label: "Gmail read + send", status: "live", note: "gmail.readonly + gmail.send · real inbox · Penny draft + send live", action: "/collaboration/gmail", actionLabel: "Open" },
      { label: "Google Calendar events", status: "live", note: "Real events via /api/calendar/events · Penny prep briefs per event", action: "/collaboration/calendar-live", actionLabel: "Open" },
      { label: "Signal routing rules", status: "partial", note: "Rule hub live at Collaboration Overview · automated Penny routing Phase 2", action: "/collaboration", actionLabel: "Configure" },
    ],
  },
  {
    id: "access",
    icon: "🔐",
    title: "Access Control",
    subtitle: "Who Penny talks to",
    color: "text-amber-700",
    border: "border-amber-200",
    headerBg: "bg-amber-50",
    deps: [
      { label: "Google Sign-In (Clerk v6)", status: "live", note: "Branded sign-in · Google OAuth · ClerkProvider wired", action: "/admin/setup", actionLabel: "View" },
      { label: "Google Groups auto-tier", status: "live", note: "3 Groups → Everyday / Power / Admin · DWD service account · real-time on every login", action: "/admin/integrations", actionLabel: "View" },
      { label: "Penny tier-filtered responses", status: "live", note: "RAG corpus filtered by access tier · Everyday / Power / Admin see different context depth", action: "/penny", actionLabel: "Test" },
      { label: "Role-gated routes & tabs", status: "live", note: "HubShell tier guards · Admin+ tabs hidden from Everyday users", action: "/admin/setup", actionLabel: "View" },
    ],
  },
  {
    id: "content",
    icon: "📚",
    title: "Content & Knowledge",
    subtitle: "What Penny knows",
    color: "text-rose-700",
    border: "border-rose-200",
    headerBg: "bg-rose-50",
    deps: [
      { label: "Knowledge source library", status: "partial", note: "Sources page live · 3 sources unverified · trust review needed before Penny activation", action: "/knowledge/sources", actionLabel: "Review" },
      { label: "Penny Asset Library", status: "live", note: "38 assets across 6 Penny states · Drive-backed thumbnails · grid + list views", action: "/penny/asset-library", actionLabel: "Open" },
      { label: "Org Memory / decision records", status: "phase-2", note: "Org Memory tab built — decision records creation and AI indexing Phase 2", action: "/knowledge/memory", actionLabel: "View" },
      { label: "Salesforce KB sync", status: "needs-setup", note: "REST API live but SF Knowledge Base connector not yet configured", action: "/knowledge/sources", actionLabel: "Configure" },
    ],
  },
  {
    id: "ops",
    icon: "📊",
    title: "Operations & Health",
    subtitle: "How Penny monitors",
    color: "text-zinc-700",
    border: "border-zinc-200",
    headerBg: "bg-zinc-50",
    deps: [
      { label: "Health dashboard", status: "live", note: "Program health scores, last check-in, flags — /operations/health", action: "/operations/health", actionLabel: "View" },
      { label: "Demand pipeline (cases + epics)", status: "live", note: "SF Cases live · Demand intake, epics, stories, roadmap built", action: "/demand/cases", actionLabel: "View" },
      { label: "Scorecard accuracy", status: "partial", note: "Scorecards built · live SF data feed wiring Phase 2", action: "/operations/scorecards", actionLabel: "View" },
      { label: "Trail Signals auto-assignment", status: "partial", note: "System-assigned by tier/role/context · user control + GA4 Phase 2", action: "/navigator/program-map", actionLabel: "View" },
    ],
  },
];

const STATUS: Record<StatusType, { dot: string; badge: string; label: string }> = {
  live: { dot: "bg-emerald-500", badge: "bg-emerald-50 border-emerald-200 text-emerald-700", label: "Live" },
  partial: { dot: "bg-amber-400", badge: "bg-amber-50 border-amber-200 text-amber-700", label: "Partial" },
  "needs-setup": { dot: "bg-rose-500", badge: "bg-rose-50 border-rose-200 text-rose-700", label: "Needs Setup" },
  "phase-2": { dot: "bg-zinc-300", badge: "bg-zinc-50 border-zinc-200 text-zinc-500", label: "Phase 2" },
};

function scoreCard(card: DomainCard) {
  const live = card.deps.filter((d) => d.status === "live").length;
  return Math.round((live / card.deps.length) * 100);
}

export function OptionB() {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [expandedDep, setExpandedDep] = useState<string | null>(null);

  const active = DOMAINS.find((d) => d.id === selectedCard);

  const totalItems = DOMAINS.flatMap((d) => d.deps);
  const liveCount = totalItems.filter((i) => i.status === "live").length;
  const needsCount = totalItems.filter((i) => i.status === "needs-setup").length;
  const partialCount = totalItems.filter((i) => i.status === "partial").length;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Administration — Integration Center</p>
            <h1 className="text-xl font-bold text-zinc-900">Penny Dependency Map</h1>
            <p className="text-[13px] text-zinc-500 mt-0.5">Click any domain card to inspect what's live, partial, or needs setup.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[13px] font-bold text-emerald-700">{liveCount}</span>
              <span className="text-[11px] text-emerald-600">live</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-[13px] font-bold text-amber-700">{partialCount}</span>
              <span className="text-[11px] text-amber-600">partial</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-[13px] font-bold text-rose-700">{needsCount}</span>
              <span className="text-[11px] text-rose-600">needs setup</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Domain cards grid */}
        <div className={`overflow-auto p-5 transition-all duration-300 ${selectedCard ? "w-72 shrink-0" : "flex-1"}`}>
          <div className={`grid gap-4 ${selectedCard ? "grid-cols-1" : "grid-cols-3"}`}>
            {DOMAINS.map((d) => {
              const score = scoreCard(d);
              const isSelected = selectedCard === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => { setSelectedCard(isSelected ? null : d.id); setExpandedDep(null); }}
                  className={`text-left rounded-xl border-2 overflow-hidden transition-all hover:shadow-md ${isSelected ? d.border + " shadow-md" : "border-zinc-200 hover:border-zinc-300"}`}
                >
                  <div className={`px-4 py-3 ${isSelected ? d.headerBg : "bg-white"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{d.icon}</span>
                      <span className={`text-[13px] font-bold ${isSelected ? d.color : "text-zinc-800"}`}>{d.title}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500">{d.subtitle}</p>
                  </div>
                  <div className="px-4 py-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-1">
                        {d.deps.map((dep) => (
                          <span key={dep.label} className={`w-2.5 h-2.5 rounded-full ${STATUS[dep.status].dot}`} title={dep.label}></span>
                        ))}
                      </div>
                      <span className={`text-[11px] font-bold ${score === 100 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600"}`}>{score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div className={`h-full rounded-full ${score === 100 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${score}%` }} />
                    </div>
                    {!selectedCard && (
                      <p className="text-[10px] text-zinc-400 mt-2">
                        {d.deps.filter((dep) => dep.status === "live").length}/{d.deps.length} ready · click to inspect
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {active && (
          <div className="flex-1 border-l border-zinc-200 bg-white overflow-auto">
            <div className={`px-6 py-4 border-b ${active.headerBg}`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{active.icon}</span>
                <div>
                  <h2 className={`text-base font-bold ${active.color}`}>{active.title}</h2>
                  <p className="text-[12px] text-zinc-500">{active.subtitle}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {active.deps.map((dep) => {
                const s = STATUS[dep.status];
                const key = active.id + dep.label;
                const isOpen = expandedDep === key;
                return (
                  <div key={dep.label} className={`rounded-xl border overflow-hidden transition-shadow ${isOpen ? "shadow-md" : "hover:shadow-sm"}`}>
                    <button
                      onClick={() => setExpandedDep(isOpen ? null : key)}
                      className="w-full text-left px-5 py-4 flex items-center gap-3 bg-white"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`}></span>
                      <span className="flex-1 text-[13px] font-semibold text-zinc-800">{dep.label}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>{s.label}</span>
                      <span className="text-zinc-300">{isOpen ? "▲" : "▼"}</span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 border-t border-zinc-100 pt-3 bg-zinc-50">
                        <p className="text-[12px] text-zinc-600 leading-relaxed mb-3">{dep.note}</p>
                        {dep.action && (
                          <a href={dep.action} className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:underline">
                            {dep.actionLabel} →
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
