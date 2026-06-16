import { useState } from "react";

type TierKey = "everyday" | "power" | "admin" | "superadmin";
type FilterTier = TierKey | "all";

interface MatrixRow {
  persona: string;
  type: string;
  typeCls: string;
  tier: TierKey;
  tierLabel: string;
  tierDot: string;
  tierBadge: string;
  health: "healthy" | "needs-attention" | "incomplete";
  navigator: string;
  operations: string;
  demand: string;
  penny: string;
  knowledge: string;
  collaboration: string;
  administration: string;
  pennyDepth: string;
  sfAccess: string;
  authMethod: string;
}

const MATRIX_ROWS: MatrixRow[] = [
  { persona: "Learner", type: "Learner", typeCls: "bg-emerald-50 text-emerald-700 border-emerald-200", tier: "everyday", tierLabel: "Everyday", tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "healthy", navigator: "✓ Program Map", operations: "✓ Own programs", demand: "View only", penny: "✓ Guided", knowledge: "✓ Library", collaboration: "✓ Core", administration: "— Hidden", pennyDepth: "Guided — coaching prompts, Trail Quests", sfAccess: "Contact, Enrollment, Training Plan", authMethod: "Google Sign-In" },
  { persona: "Coach", type: "Staff", typeCls: "bg-blue-50 text-blue-700 border-blue-200", tier: "everyday", tierLabel: "Everyday", tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "needs-attention", navigator: "✓ Program Map", operations: "✓ Own cohorts", demand: "View only", penny: "✓ Guided", knowledge: "✓ Library", collaboration: "✓ Full", administration: "— Hidden", pennyDepth: "Guided — coach briefs, escalations", sfAccess: "Contact, Volunteer, Program Engagement", authMethod: "Google Sign-In" },
  { persona: "Program Lead", type: "Staff", typeCls: "bg-blue-50 text-blue-700 border-blue-200", tier: "everyday", tierLabel: "Everyday", tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "healthy", navigator: "✓ Full", operations: "✓ Full", demand: "✓ Full", penny: "✓ Guided", knowledge: "✓ Library", collaboration: "✓ Full", administration: "— Hidden", pennyDepth: "Guided — program health, cohort summaries", sfAccess: "Training Plan, Campaign, Account, Report", authMethod: "Google Sign-In" },
  { persona: "Curriculum Designer", type: "Staff", typeCls: "bg-blue-50 text-blue-700 border-blue-200", tier: "everyday", tierLabel: "Everyday", tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "healthy", navigator: "✓ Program Map", operations: "View only", demand: "✓ Full", penny: "✓ Power access", knowledge: "✓ All tabs", collaboration: "✓ Core", administration: "— Hidden", pennyDepth: "Power — curriculum generation, prompt governance", sfAccess: "Training Plan, Training Plan Item, Knowledge", authMethod: "Google Sign-In" },
  { persona: "Penny Admin", type: "Admin", typeCls: "bg-violet-50 text-violet-700 border-violet-200", tier: "power", tierLabel: "Power", tierDot: "bg-violet-500", tierBadge: "bg-violet-50 border-violet-200 text-violet-700", health: "needs-attention", navigator: "✓ Full", operations: "✓ Full", demand: "✓ Full", penny: "✓ Full suite", knowledge: "✓ All tabs", collaboration: "✓ Full", administration: "— Hidden", pennyDepth: "Full — prompt-level, capability registry, quality metrics", sfAccess: "Knowledge, Case, Integration Log", authMethod: "Power group · trailospennyadmin@…" },
  { persona: "Volunteer", type: "Volunteer", typeCls: "bg-violet-50 text-violet-700 border-violet-200", tier: "everyday", tierLabel: "Everyday", tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "needs-attention", navigator: "✓ Limited", operations: "— Hidden", demand: "— Hidden", penny: "✓ Coach briefs", knowledge: "✓ Library", collaboration: "✓ Core", administration: "— Hidden", pennyDepth: "Guided — coach briefs only", sfAccess: "Volunteer, Volunteer Job, Volunteer Shift, Contact", authMethod: "Google Sign-In" },
  { persona: "Client Sponsor", type: "Sponsor", typeCls: "bg-rose-50 text-rose-700 border-rose-200", tier: "everyday", tierLabel: "Everyday", tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "incomplete", navigator: "— Limited", operations: "View only", demand: "— Hidden", penny: "✓ Exec briefs", knowledge: "— Hidden", collaboration: "— Hidden", administration: "— Hidden", pennyDepth: "Guided — executive briefs only", sfAccess: "Account, Opportunity, Contact, Report", authMethod: "Google Sign-In" },
  { persona: "Employer Partner", type: "Partner", typeCls: "bg-amber-50 text-amber-700 border-amber-200", tier: "everyday", tierLabel: "Everyday", tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "incomplete", navigator: "— Limited", operations: "— Hidden", demand: "— Hidden", penny: "— Planned Q4", knowledge: "— Hidden", collaboration: "— Hidden", administration: "— Hidden", pennyDepth: "None — employer matching planned Q4", sfAccess: "Account, Opportunity, Job Application, Contact", authMethod: "Google Sign-In" },
  { persona: "Executive Director", type: "Staff", typeCls: "bg-blue-50 text-blue-700 border-blue-200", tier: "admin", tierLabel: "Admin", tierDot: "bg-amber-500", tierBadge: "bg-amber-50 border-amber-200 text-amber-700", health: "healthy", navigator: "✓ Full", operations: "✓ Full", demand: "✓ Full", penny: "✓ Full", knowledge: "✓ All tabs", collaboration: "✓ Full", administration: "✓ View", pennyDepth: "Admin — executive briefs, impact summaries, full context", sfAccess: "Account, Opportunity, Report, Dashboard", authMethod: "Admin group · trailosadmin@…" },
  { persona: "Salesforce Admin", type: "Admin", typeCls: "bg-slate-100 text-slate-700 border-slate-300", tier: "admin", tierLabel: "Admin", tierDot: "bg-amber-500", tierBadge: "bg-amber-50 border-amber-200 text-amber-700", health: "healthy", navigator: "✓ Full", operations: "✓ Full", demand: "✓ Full", penny: "✓ Full", knowledge: "✓ All tabs", collaboration: "✓ Full", administration: "✓ Full", pennyDepth: "Admin — SF mapping, data layer, integration governance", sfAccess: "All objects, Permission Set, Profile, User", authMethod: "Admin group · trailosadmin@…" },
  { persona: "Platform Admin", type: "Admin", typeCls: "bg-slate-100 text-slate-700 border-slate-300", tier: "superadmin", tierLabel: "Super", tierDot: "bg-slate-500", tierBadge: "bg-slate-100 border-slate-300 text-slate-700", health: "healthy", navigator: "✓ Full", operations: "✓ Full", demand: "✓ Full", penny: "✓ Unrestricted", knowledge: "✓ All tabs", collaboration: "✓ Full", administration: "✓ Full", pennyDepth: "Unrestricted — all RAG chunks, system prompts, governance override", sfAccess: "All objects", authMethod: "Email whitelist (prototype only)" },
];

const NAV_COLS: { key: keyof MatrixRow; label: string }[] = [
  { key: "navigator",      label: "Navigator" },
  { key: "operations",     label: "Operations" },
  { key: "demand",         label: "Demand" },
  { key: "penny",          label: "Penny" },
  { key: "knowledge",      label: "Knowledge" },
  { key: "collaboration",  label: "Collab" },
  { key: "administration", label: "Admin" },
];

const TIER_OPTIONS: { key: FilterTier; label: string; dot: string }[] = [
  { key: "all",        label: "All roles",   dot: "bg-zinc-400" },
  { key: "everyday",   label: "Everyday",    dot: "bg-emerald-500" },
  { key: "power",      label: "Power",       dot: "bg-violet-500" },
  { key: "admin",      label: "Admin",       dot: "bg-amber-500" },
  { key: "superadmin", label: "Super Admin", dot: "bg-slate-500" },
];

const HEALTH_DOT: Record<string, string> = {
  healthy: "bg-emerald-500",
  "needs-attention": "bg-amber-400",
  incomplete: "bg-rose-500",
};

function CellValue({ value }: { value: string }) {
  if (value.startsWith("✓")) return <span className="text-[11px] text-emerald-600 font-medium">{value}</span>;
  if (value.startsWith("—")) return <span className="text-[11px] text-zinc-300">{value}</span>;
  return <span className="text-[11px] text-zinc-500">{value}</span>;
}

export function OptionC() {
  const [filterTier, setFilterTier] = useState<FilterTier>("all");
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  const visibleRows = filterTier === "all" ? MATRIX_ROWS : MATRIX_ROWS.filter((r) => r.tier === filterTier);
  const activeRow = MATRIX_ROWS.find((r) => r.persona === selectedRow) ?? null;

  const healthCounts = {
    healthy: MATRIX_ROWS.filter((r) => r.health === "healthy").length,
    needsAttn: MATRIX_ROWS.filter((r) => r.health === "needs-attention").length,
    incomplete: MATRIX_ROWS.filter((r) => r.health === "incomplete").length,
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-8 py-5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Administration — People &amp; Access</p>
            <h1 className="text-xl font-bold text-zinc-900">Permission Matrix Studio</h1>
            <p className="text-[13px] text-zinc-500 mt-0.5">Filter by tier · click any row to see full access profile and setup status.</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{healthCounts.healthy} healthy
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[12px] font-semibold text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />{healthCounts.needsAttn} needs attention
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-[12px] font-semibold text-rose-700">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />{healthCounts.incomplete} incomplete
            </div>
          </div>
        </div>

        {/* Tier filter pills */}
        <div className="flex items-center gap-2 mt-4">
          {TIER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilterTier(opt.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${
                filterTier === opt.key
                  ? "bg-zinc-800 border-zinc-800 text-white"
                  : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
              {opt.label}
            </button>
          ))}
          <span className="text-[11px] text-zinc-400 ml-2">{visibleRows.length} of {MATRIX_ROWS.length} roles shown</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Matrix */}
        <div className={`overflow-auto transition-all duration-300 ${activeRow ? "flex-1" : "flex-1"}`}>
          <table className="w-full border-collapse text-[12px]">
            <thead className="bg-white border-b border-zinc-200 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-zinc-500 w-36">Persona</th>
                <th className="text-left px-3 py-3 font-bold text-[10px] uppercase tracking-wider text-zinc-500 w-20">Type</th>
                <th className="text-left px-3 py-3 font-bold text-[10px] uppercase tracking-wider text-zinc-500 w-20">Tier</th>
                <th className="text-left px-3 py-3 font-bold text-[10px] uppercase tracking-wider text-zinc-500 w-12">Health</th>
                {NAV_COLS.map((col) => (
                  <th key={col.key} className="text-left px-3 py-3 font-bold text-[10px] uppercase tracking-wider text-zinc-500">{col.label}</th>
                ))}
                <th className="text-left px-3 py-3 font-bold text-[10px] uppercase tracking-wider text-zinc-500">Penny depth</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, i) => {
                const isActive = selectedRow === row.persona;
                return (
                  <tr
                    key={row.persona}
                    onClick={() => setSelectedRow(isActive ? null : row.persona)}
                    className={`border-b border-zinc-100 cursor-pointer transition-colors ${
                      isActive
                        ? "bg-zinc-900 text-white"
                        : i % 2 === 0
                        ? "bg-white hover:bg-zinc-50"
                        : "bg-zinc-50 hover:bg-zinc-100"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.tierDot}`} />
                        <span className={`font-semibold ${isActive ? "text-white" : "text-zinc-800"}`}>{row.persona}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${isActive ? "bg-white/20 border-white/30 text-white" : row.typeCls}`}>{row.type}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${isActive ? "bg-white/20 border-white/30 text-white" : row.tierBadge}`}>{row.tierLabel}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`w-2.5 h-2.5 rounded-full inline-block ${HEALTH_DOT[row.health]}`} title={row.health} />
                    </td>
                    {NAV_COLS.map((col) => (
                      <td key={col.key} className="px-3 py-3">
                        {isActive
                          ? <span className={`text-[11px] ${(row[col.key] as string).startsWith("✓") ? "text-emerald-300" : "text-zinc-400"}`}>{row[col.key] as string}</span>
                          : <CellValue value={row[col.key] as string} />
                        }
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <span className={`text-[11px] ${isActive ? "text-violet-300" : "text-violet-600"}`}>{row.pennyDepth.split(" — ")[0]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail side panel */}
        {activeRow && (
          <div className="w-80 border-l border-zinc-200 bg-white overflow-auto shrink-0">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-[14px] font-bold text-zinc-900">{activeRow.persona}</h2>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${activeRow.typeCls}`}>{activeRow.type}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeRow.tierBadge}`}>{activeRow.tierLabel}</span>
                  <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[activeRow.health]}`} />
                  <span className="text-[10px] text-zinc-500">{activeRow.health.replace("-", " ")}</span>
                </div>
              </div>
              <button onClick={() => setSelectedRow(null)} className="text-[11px] text-zinc-400 hover:text-zinc-700 shrink-0">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Auth method */}
              <div>
                <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Auth method</p>
                <p className="text-[11px] font-mono text-zinc-600 bg-zinc-50 rounded px-2.5 py-2">{activeRow.authMethod}</p>
              </div>

              {/* Penny depth */}
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                <p className="text-[10px] font-bold uppercase text-violet-500 mb-1">Penny depth</p>
                <p className="text-[12px] text-violet-800 leading-snug">{activeRow.pennyDepth}</p>
              </div>

              {/* SF access */}
              <div>
                <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Salesforce access</p>
                <p className="text-[11px] text-zinc-600 leading-relaxed">{activeRow.sfAccess}</p>
              </div>

              {/* Nav access */}
              <div>
                <p className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Navigation access</p>
                <div className="space-y-1.5">
                  {NAV_COLS.map((col) => (
                    <div key={col.key} className="flex items-start gap-2">
                      <span className="text-[11px] font-semibold text-zinc-500 w-24 shrink-0">{col.label}</span>
                      <span className={`text-[11px] ${(activeRow[col.key] as string).startsWith("✓") ? "text-emerald-600 font-medium" : "text-zinc-400"}`}>{activeRow[col.key] as string}</span>
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
