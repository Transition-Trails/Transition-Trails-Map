import { useState } from "react";

const PHASES = [
  {
    id: "foundation",
    label: "Foundation",
    icon: "🔑",
    description: "API keys & authentication",
    items: [
      { id: "gemini", label: "Gemini AI connected", status: "live", detail: "GEMINI_API_KEY active · Gemini 2.5 Flash · POST /api/penny/ask live · billing confirmed.", action: "/admin/integrations", actionLabel: "View config" },
      { id: "clerk", label: "Trail OS access (Clerk)", status: "live", detail: "Clerk v6 Google Sign-In wired · 3 access tiers (Everyday / Power / Admin) auto-assigned from Google Groups.", action: "/admin/setup", actionLabel: "Manage access" },
      { id: "google-oauth", label: "Google OAuth authorized", status: "live", detail: "GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + refresh tokens for Drive, Calendar, and Gmail all configured.", action: "/admin/integrations/google-auth", actionLabel: "View OAuth" },
      { id: "salesforce", label: "Salesforce connected", status: "live", detail: "REST API · 127 Accounts · 129 Contacts · NPSP + PMM (7/8 objects) confirmed · read-only.", action: "/admin/integrations", actionLabel: "SF config" },
    ],
  },
  {
    id: "connect",
    label: "Connect",
    icon: "🔗",
    description: "Data sources & channels",
    items: [
      { id: "drive-folder", label: "Penny Asset Library folder set", status: "live", detail: "GOOGLE_DRIVE_PENNY_FOLDER_ID set · Shared Drive (TT Content → Penny Asset Library) · 6 state subfolders · 38 assets loaded.", action: "/penny/asset-library", actionLabel: "View assets" },
      { id: "slack-channels", label: "Slack channels linked", status: "partial", detail: "Bot token + @coachconnectbot active · Penny AI + Admin channels confirmed · channels:read scope pending — channel name resolution incomplete.", action: "/admin/integrations", actionLabel: "Add scope" },
      { id: "gmail", label: "Gmail read & send live", status: "live", detail: "gmail.readonly + gmail.send confirmed · Real inbox at /collaboration/gmail · Penny draft + send via POST /api/gmail/send.", action: "/collaboration/gmail", actionLabel: "Open Gmail" },
      { id: "calendar", label: "Google Calendar live", status: "live", detail: "Real events via /api/calendar/events · Penny prep briefs per event · pending invite flags.", action: "/collaboration/calendar-live", actionLabel: "View calendar" },
    ],
  },
  {
    id: "configure",
    label: "Configure",
    icon: "⚙️",
    description: "Insights, folders & signal rules",
    items: [
      { id: "knowledge-sources", label: "Knowledge sources activated", status: "partial", detail: "22-chunk RAG corpus active · 3 sources still Unverified and not yet fed to Penny · trust review needed.", action: "/knowledge/sources", actionLabel: "Review sources" },
      { id: "drive-programs", label: "Program Drive folders linked", status: "needs-setup", detail: "Google Drive OAuth is live but program-specific workspace folders not yet linked in source registry. Phase 2 item.", action: "/knowledge/sources", actionLabel: "Link folders" },
      { id: "signal-rules", label: "Signal rules configured", status: "partial", detail: "Collaboration Overview rule hub live · Slack, Gmail, Calendar, Drive channel rules visible and structured · automated routing Phase 2.", action: "/collaboration", actionLabel: "Edit rules" },
      { id: "insights", label: "SF Insights mapped", status: "needs-setup", detail: "Salesforce data live (Accounts, Contacts, Cases) but Insights field mapping to Penny context not yet configured.", action: "/operations/scorecards", actionLabel: "Map fields" },
    ],
  },
  {
    id: "active",
    label: "Penny Active",
    icon: "✨",
    description: "End-to-end validation",
    items: [
      { id: "penny-ask", label: "Ask Penny responds", status: "live", detail: "POST /api/penny/ask · Gemini 2.5 Flash · 22-chunk RAG · tier-filtered responses confirmed.", action: "/penny", actionLabel: "Open Penny" },
      { id: "agentforce", label: "Agentforce dual-AI live", status: "live", detail: "Sessions API wired · Assessment coaching dual-AI (Penny + Agentforce) on every Coach/Next click.", action: "/penny/assessments", actionLabel: "View Assessments" },
      { id: "penny-assets", label: "Penny Asset Library live", status: "live", detail: "6 Penny states · 38 Drive assets · thumbnail grid · face-anchored images at /penny/asset-library.", action: "/penny/asset-library", actionLabel: "View Library" },
      { id: "trail-signals", label: "Trail Signals auto-assigned", status: "partial", detail: "System-assigned Phase 1 · tier, role, context, and program ownership drive signal selection · user control Phase 2.", action: "/navigator/program-map", actionLabel: "View Signals" },
    ],
  },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  live: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Live", dot: "bg-emerald-500" },
  partial: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Partial", dot: "bg-amber-400" },
  "needs-setup": { color: "text-rose-700", bg: "bg-rose-50 border-rose-200", label: "Needs Setup", dot: "bg-rose-500" },
};

export function OptionA() {
  const [activePhase, setActivePhase] = useState("foundation");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const phase = PHASES.find((p) => p.id === activePhase)!;

  const phaseScore = (p: typeof PHASES[0]) => {
    const live = p.items.filter((i) => i.status === "live").length;
    return Math.round((live / p.items.length) * 100);
  };

  const overallScore = Math.round(
    PHASES.reduce((acc, p) => acc + phaseScore(p), 0) / PHASES.length
  );

  const totalLive = PHASES.flatMap((p) => p.items).filter((i) => i.status === "live").length;
  const totalNeeds = PHASES.flatMap((p) => p.items).filter((i) => i.status === "needs-setup").length;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-8 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Administration — Penny Setup</p>
            <h1 className="text-xl font-bold text-zinc-900">Penny Setup Journey</h1>
            <p className="text-[13px] text-zinc-500 mt-0.5">Step through each phase to get Penny fully operational for your team.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-zinc-900">{overallScore}%</div>
              <div className="text-[11px] text-zinc-500">overall ready</div>
            </div>
            <div className="w-14 h-14 rounded-full border-4 border-zinc-100 flex items-center justify-center bg-white shadow-sm" style={{ background: `conic-gradient(#10b981 ${overallScore * 3.6}deg, #e4e4e7 0deg)` }}>
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[11px] font-bold text-zinc-700">{overallScore}%</div>
            </div>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex gap-3 mt-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{totalLive} live
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            {PHASES.flatMap((p) => p.items).filter((i) => i.status === "partial").length} partial
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>{totalNeeds} needs setup
          </span>
        </div>
      </div>

      <div className="flex h-[calc(100vh-148px)]">
        {/* Phase stepper sidebar */}
        <div className="w-56 bg-white border-r border-zinc-200 flex flex-col gap-1 p-3 shrink-0">
          {PHASES.map((p, idx) => {
            const score = phaseScore(p);
            const isActive = p.id === activePhase;
            return (
              <button
                key={p.id}
                onClick={() => { setActivePhase(p.id); setExpandedItem(null); }}
                className={`w-full text-left px-3 py-3 rounded-lg transition-all border ${isActive ? "bg-violet-50 border-violet-200" : "border-transparent hover:bg-zinc-50"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{p.icon}</span>
                  <span className={`text-[12px] font-semibold ${isActive ? "text-violet-800" : "text-zinc-700"}`}>
                    {idx + 1}. {p.label}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 ml-6 mb-2">{p.description}</p>
                <div className="ml-6 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${score === 100 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-zinc-500">{score}%</span>
                </div>
              </button>
            );
          })}

          <div className="mt-auto px-3 py-3 border-t border-zinc-100">
            <a href="/admin/phase1-readiness" className="text-[11px] text-violet-600 hover:underline font-medium">→ Full readiness report</a>
          </div>
        </div>

        {/* Phase content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span className="text-xl">{phase.icon}</span>
              Phase {PHASES.findIndex((p) => p.id === activePhase) + 1}: {phase.label}
            </h2>
            <p className="text-[12px] text-zinc-500">{phase.description}</p>
          </div>

          <div className="space-y-3">
            {phase.items.map((item) => {
              const s = STATUS_CONFIG[item.status];
              const isExpanded = expandedItem === item.id;
              return (
                <div key={item.id} className={`rounded-xl border bg-white overflow-hidden transition-shadow ${isExpanded ? "shadow-md" : "hover:shadow-sm"}`}>
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`}></span>
                    <span className="flex-1 text-[13px] font-semibold text-zinc-800">{item.label}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.color}`}>{s.label}</span>
                    <span className="text-zinc-300 text-sm">{isExpanded ? "▲" : "▼"}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 border-t border-zinc-100 pt-3">
                      <p className="text-[12px] text-zinc-600 leading-relaxed mb-3">{item.detail}</p>
                      <a
                        href={item.action}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[11px] font-semibold hover:bg-violet-700 transition-colors"
                      >
                        {item.actionLabel} →
                      </a>
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
