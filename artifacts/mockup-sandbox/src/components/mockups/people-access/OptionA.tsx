import { useState } from "react";

type TierKey = "everyday" | "power" | "admin" | "superadmin";

interface TierDef {
  key: TierKey;
  label: string;
  short: string;
  group: string;
  description: string;
  color: string;
  border: string;
  headerBg: string;
  dot: string;
  badge: string;
  personas: string[];
  navAccess: string[];
  capabilities: string[];
  pennyDepth: string;
  authMethod: string;
}

const TIERS: TierDef[] = [
  {
    key: "everyday",
    label: "Everyday User",
    short: "Everyday",
    group: "trailosusers@transitiontrails.org",
    description: "Program team, coaches, and coordinators.",
    color: "text-emerald-700",
    border: "border-emerald-200",
    headerBg: "bg-emerald-50",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 border-emerald-200 text-emerald-700",
    personas: ["Learner", "Coach", "Program Lead", "Curriculum Designer", "Volunteer"],
    navAccess: ["Navigator", "Operations", "Penny (limited)", "Knowledge", "Collaboration"],
    capabilities: [
      "View program health (own programs)",
      "Penny guided responses",
      "Gmail read + compose",
      "Calendar events",
      "Slack channels",
    ],
    pennyDepth: "Guided — curated responses, no raw context",
    authMethod: "Google Groups: trailosusers@…",
  },
  {
    key: "power",
    label: "Penny Power User",
    short: "Power",
    group: "trailospennyadmin@transitiontrails.org",
    description: "Penny governors and AI operations.",
    color: "text-violet-700",
    border: "border-violet-200",
    headerBg: "bg-violet-50",
    dot: "bg-violet-500",
    badge: "bg-violet-50 border-violet-200 text-violet-700",
    personas: ["Penny Admin", "Curriculum Designer (senior)"],
    navAccess: ["All Everyday access", "Penny full suite", "Knowledge (all tabs)", "Prompt Studio", "Capability Registry"],
    capabilities: [
      "Penny prompt governance",
      "Capability registry management",
      "Source trust configuration",
      "Quality metrics dashboard",
      "RAG corpus management",
    ],
    pennyDepth: "Full — prompt-level access + analytics",
    authMethod: "Google Groups: trailospennyadmin@…",
  },
  {
    key: "admin",
    label: "Admin",
    short: "Admin",
    group: "trailosadmin@transitiontrails.org",
    description: "System integrators and platform operators.",
    color: "text-amber-700",
    border: "border-amber-200",
    headerBg: "bg-amber-50",
    dot: "bg-amber-500",
    badge: "bg-amber-50 border-amber-200 text-amber-700",
    personas: ["Salesforce Admin", "Executive Director", "Platform Admin"],
    navAccess: ["All Power access", "Administration suite", "Integrations hub", "Secrets audit", "SF Validation", "Phase readiness"],
    capabilities: [
      "Integration configuration",
      "Token rotation & secrets",
      "Salesforce object mapping",
      "Google OAuth management",
      "Slack + Drive config",
    ],
    pennyDepth: "Admin — full context + governance override",
    authMethod: "Google Groups: trailosadmin@…",
  },
  {
    key: "superadmin",
    label: "Super Admin",
    short: "Super",
    group: "N/A — email whitelist only",
    description: "Platform builders and architects.",
    color: "text-slate-700",
    border: "border-slate-300",
    headerBg: "bg-slate-100",
    dot: "bg-slate-500",
    badge: "bg-slate-100 border-slate-300 text-slate-700",
    personas: ["Platform Builder", "Trail OS Architect"],
    navAccess: ["All Admin access", "Trail OS Map", "Digital Twin studio", "All audit pages", "RESOLVE framework", "Role modeling"],
    capabilities: [
      "Full platform configuration",
      "Route and permission override",
      "Lens and UX customization",
      "All integration setup",
      "Phase planning + backlog",
    ],
    pennyDepth: "Unrestricted — all RAG chunks, system prompts",
    authMethod: "Email whitelist (prototype builder only)",
  },
];

const NAV_MATRIX: { section: string; everyday: string; power: string; admin: string; superadmin: string }[] = [
  { section: "Navigator",       everyday: "✓ Full",      power: "✓ Full",      admin: "✓ Full",      superadmin: "✓ Full" },
  { section: "Operations",      everyday: "✓ Own only",  power: "✓ Full",      admin: "✓ Full",      superadmin: "✓ Full" },
  { section: "Demand Mgmt",     everyday: "✓ View only", power: "✓ Full",      admin: "✓ Full",      superadmin: "✓ Full" },
  { section: "Penny",           everyday: "✓ Guided",    power: "✓ Full",      admin: "✓ Full",      superadmin: "✓ Full" },
  { section: "Knowledge",       everyday: "✓ Library",   power: "✓ All tabs",  admin: "✓ All tabs",  superadmin: "✓ All tabs" },
  { section: "Collaboration",   everyday: "✓ Core",      power: "✓ Full",      admin: "✓ Full",      superadmin: "✓ Full" },
  { section: "Administration",  everyday: "— Hidden",    power: "— Hidden",    admin: "✓ Full",      superadmin: "✓ Full" },
  { section: "Digital Twin",    everyday: "— Hidden",    power: "✓ View",      admin: "✓ Full",      superadmin: "✓ Full" },
];

export function OptionA() {
  const [selectedTier, setSelectedTier] = useState<TierKey | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const active = TIERS.find((t) => t.key === selectedTier) ?? null;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Administration — People &amp; Access</p>
            <h1 className="text-xl font-bold text-zinc-900">Tier Command Center</h1>
            <p className="text-[13px] text-zinc-500 mt-0.5">Click any tier to inspect its personas, access rules, and Penny depth.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Auth live · Clerk v6
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[12px] font-semibold text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Prototype mode
            </span>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-113px)]">
        {/* Tier cards column */}
        <div className={`overflow-auto p-5 transition-all duration-300 ${selectedTier ? "w-80 shrink-0 border-r border-zinc-200" : "flex-1"}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Access Tiers</p>
          <div className={`grid gap-4 ${selectedTier ? "grid-cols-1" : "grid-cols-4"}`}>
            {TIERS.map((tier) => {
              const isSelected = selectedTier === tier.key;
              return (
                <button
                  key={tier.key}
                  onClick={() => { setSelectedTier(isSelected ? null : tier.key); setExpandedRow(null); }}
                  className={`text-left rounded-xl border-2 overflow-hidden transition-all hover:shadow-md ${
                    isSelected ? `${tier.border} shadow-md` : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className={`px-4 py-3 ${isSelected ? tier.headerBg : "bg-white"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${tier.dot}`} />
                      <span className={`text-[13px] font-bold ${isSelected ? tier.color : "text-zinc-800"}`}>{tier.short}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500">{tier.description}</p>
                  </div>
                  <div className="px-4 py-3 bg-white space-y-1.5">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Personas</p>
                    <div className="flex flex-wrap gap-1">
                      {tier.personas.map((p) => (
                        <span key={p} className="text-[10px] bg-zinc-100 text-zinc-600 rounded px-1.5 py-0.5">{p}</span>
                      ))}
                    </div>
                    {!selectedTier && (
                      <p className="text-[10px] text-zinc-400 pt-1">{tier.navAccess.length} nav sections · click to inspect</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Nav matrix (shown when no tier selected) */}
          {!selectedTier && (
            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Navigation Visibility Matrix</p>
              <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
                <div className="grid bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-400" style={{ gridTemplateColumns: "140px 1fr 1fr 1fr 1fr" }}>
                  <div className="px-3 py-2">Section</div>
                  {TIERS.map((t) => <div key={t.key} className="px-3 py-2 flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.short}</div>)}
                </div>
                {NAV_MATRIX.map((row, i) => (
                  <div key={row.section} className={`grid text-[11px] ${i % 2 === 0 ? "bg-white" : "bg-zinc-50"}`} style={{ gridTemplateColumns: "140px 1fr 1fr 1fr 1fr" }}>
                    <div className="px-3 py-2.5 font-semibold text-zinc-700">{row.section}</div>
                    {(["everyday", "power", "admin", "superadmin"] as TierKey[]).map((tk) => (
                      <div key={tk} className="px-3 py-2.5">
                        <span className={`${row[tk].startsWith("✓") ? "text-emerald-600" : "text-zinc-400"} text-[11px]`}>{row[tk]}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {active && (
          <div className="flex-1 overflow-auto bg-white">
            <div className={`px-6 py-4 border-b ${active.headerBg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${active.dot}`} />
                  <div>
                    <h2 className={`text-base font-bold ${active.color}`}>{active.label}</h2>
                    <p className="text-[12px] text-zinc-500">{active.description}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTier(null)} className="text-[11px] text-zinc-400 hover:text-zinc-700">✕ Close</button>
              </div>
            </div>
            <div className="p-6 space-y-5">

              {/* Auth method */}
              <div className={`rounded-lg border p-4 ${active.headerBg} ${active.border}`}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-1">Authentication Method</p>
                <p className="text-[12px] font-semibold text-zinc-800">{active.authMethod}</p>
                <p className="text-[11px] text-zinc-500 mt-1 font-mono">{active.group}</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Personas */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-2">Personas in this tier</p>
                  <div className="space-y-1.5">
                    {active.personas.map((p) => (
                      <div key={p} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 bg-white">
                        <span className={`w-2 h-2 rounded-full ${active.dot}`} />
                        <span className="text-[12px] font-medium text-zinc-800">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Capabilities */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-2">Key capabilities</p>
                  <div className="space-y-1.5">
                    {active.capabilities.map((c) => (
                      <div key={c} className="flex items-start gap-2 text-[12px] text-zinc-700">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nav access */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-2">Navigation access</p>
                <div className="flex flex-wrap gap-1.5">
                  {active.navAccess.map((n) => (
                    <span key={n} className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${active.badge}`}>{n}</span>
                  ))}
                </div>
              </div>

              {/* Penny depth */}
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500 mb-1">Penny depth</p>
                <p className="text-[13px] font-semibold text-violet-800">{active.pennyDepth}</p>
              </div>

              {/* Nav matrix for this tier */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-2">Navigation visibility</p>
                <div className="rounded-xl border border-zinc-200 overflow-hidden">
                  {NAV_MATRIX.map((row, i) => (
                    <div key={row.section} className={`flex items-center px-4 py-2.5 gap-4 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50"}`}>
                      <span className="text-[12px] font-semibold text-zinc-700 w-36 shrink-0">{row.section}</span>
                      <span className={`text-[12px] ${row[active.key].startsWith("✓") ? "text-emerald-600 font-medium" : "text-zinc-400"}`}>{row[active.key]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
