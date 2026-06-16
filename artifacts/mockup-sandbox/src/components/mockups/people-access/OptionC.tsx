import { useState, useMemo } from "react";

type TierKey = "everyday" | "power" | "admin" | "superadmin";
type FilterTier = TierKey | "all";
type FilterType = "all" | "Learner" | "Staff" | "Admin" | "Volunteer" | "Sponsor" | "Partner";
type FilterHealth = "all" | "healthy" | "needs-attention" | "incomplete";
type SortDir = "asc" | "desc";

interface MatrixRow {
  persona: string;
  type: string;
  typeCls: string;
  tier: TierKey;
  tierLabel: string;
  tierOrder: number;
  tierDot: string;
  tierBadge: string;
  health: "healthy" | "needs-attention" | "incomplete";
  healthOrder: number;
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
  { persona: "Learner",            type: "Learner",   typeCls: "bg-emerald-50 text-emerald-700 border-emerald-200", tier: "everyday",   tierLabel: "Everyday", tierOrder: 0, tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "healthy",          healthOrder: 0, navigator: "✓ Program Map",  operations: "✓ Own programs", demand: "View only",  penny: "✓ Guided",      knowledge: "✓ Library",   collaboration: "✓ Core",  administration: "— Hidden",  pennyDepth: "Guided — coaching prompts, Trail Quests", sfAccess: "Contact, Enrollment, Training Plan", authMethod: "Google Sign-In" },
  { persona: "Coach",              type: "Staff",     typeCls: "bg-blue-50 text-blue-700 border-blue-200",           tier: "everyday",   tierLabel: "Everyday", tierOrder: 0, tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "needs-attention",  healthOrder: 1, navigator: "✓ Program Map",  operations: "✓ Own cohorts", demand: "View only",  penny: "✓ Guided",      knowledge: "✓ Library",   collaboration: "✓ Full",  administration: "— Hidden",  pennyDepth: "Guided — coach briefs, escalations", sfAccess: "Contact, Volunteer, Program Engagement", authMethod: "Google Sign-In" },
  { persona: "Program Lead",       type: "Staff",     typeCls: "bg-blue-50 text-blue-700 border-blue-200",           tier: "everyday",   tierLabel: "Everyday", tierOrder: 0, tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "healthy",          healthOrder: 0, navigator: "✓ Full",         operations: "✓ Full",         demand: "✓ Full",     penny: "✓ Guided",      knowledge: "✓ Library",   collaboration: "✓ Full",  administration: "— Hidden",  pennyDepth: "Guided — program health, cohort summaries", sfAccess: "Training Plan, Campaign, Account, Report", authMethod: "Google Sign-In" },
  { persona: "Curriculum Designer",type: "Staff",     typeCls: "bg-blue-50 text-blue-700 border-blue-200",           tier: "everyday",   tierLabel: "Everyday", tierOrder: 0, tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "healthy",          healthOrder: 0, navigator: "✓ Program Map",  operations: "View only",      demand: "✓ Full",     penny: "✓ Power access",knowledge: "✓ All tabs",  collaboration: "✓ Core",  administration: "— Hidden",  pennyDepth: "Power — curriculum generation, prompt governance", sfAccess: "Training Plan, Training Plan Item, Knowledge", authMethod: "Google Sign-In" },
  { persona: "Penny Admin",        type: "Admin",     typeCls: "bg-violet-50 text-violet-700 border-violet-200",     tier: "power",      tierLabel: "Power",    tierOrder: 1, tierDot: "bg-violet-500",  tierBadge: "bg-violet-50 border-violet-200 text-violet-700",   health: "needs-attention",  healthOrder: 1, navigator: "✓ Full",         operations: "✓ Full",         demand: "✓ Full",     penny: "✓ Full suite",  knowledge: "✓ All tabs",  collaboration: "✓ Full",  administration: "— Hidden",  pennyDepth: "Full — prompt-level, capability registry, quality metrics", sfAccess: "Knowledge, Case, Integration Log", authMethod: "Power group · trailospennyadmin@…" },
  { persona: "Volunteer",          type: "Volunteer", typeCls: "bg-violet-50 text-violet-700 border-violet-200",     tier: "everyday",   tierLabel: "Everyday", tierOrder: 0, tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "needs-attention",  healthOrder: 1, navigator: "✓ Limited",      operations: "— Hidden",       demand: "— Hidden",   penny: "✓ Coach briefs",knowledge: "✓ Library",   collaboration: "✓ Core",  administration: "— Hidden",  pennyDepth: "Guided — coach briefs only", sfAccess: "Volunteer, Volunteer Job, Volunteer Shift, Contact", authMethod: "Google Sign-In" },
  { persona: "Client Sponsor",     type: "Sponsor",   typeCls: "bg-rose-50 text-rose-700 border-rose-200",           tier: "everyday",   tierLabel: "Everyday", tierOrder: 0, tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "incomplete",       healthOrder: 2, navigator: "— Limited",      operations: "View only",      demand: "— Hidden",   penny: "✓ Exec briefs", knowledge: "— Hidden",    collaboration: "— Hidden",administration: "— Hidden",  pennyDepth: "Guided — executive briefs only", sfAccess: "Account, Opportunity, Contact, Report", authMethod: "Google Sign-In" },
  { persona: "Employer Partner",   type: "Partner",   typeCls: "bg-amber-50 text-amber-700 border-amber-200",        tier: "everyday",   tierLabel: "Everyday", tierOrder: 0, tierDot: "bg-emerald-500", tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700", health: "incomplete",       healthOrder: 2, navigator: "— Limited",      operations: "— Hidden",       demand: "— Hidden",   penny: "— Planned Q4",  knowledge: "— Hidden",    collaboration: "— Hidden",administration: "— Hidden",  pennyDepth: "None — employer matching planned Q4", sfAccess: "Account, Opportunity, Job Application, Contact", authMethod: "Google Sign-In" },
  { persona: "Executive Director", type: "Staff",     typeCls: "bg-blue-50 text-blue-700 border-blue-200",           tier: "admin",      tierLabel: "Admin",    tierOrder: 2, tierDot: "bg-amber-500",   tierBadge: "bg-amber-50 border-amber-200 text-amber-700",       health: "healthy",          healthOrder: 0, navigator: "✓ Full",         operations: "✓ Full",         demand: "✓ Full",     penny: "✓ Full",        knowledge: "✓ All tabs",  collaboration: "✓ Full",  administration: "✓ View",    pennyDepth: "Admin — executive briefs, impact summaries, full context", sfAccess: "Account, Opportunity, Report, Dashboard", authMethod: "Admin group · trailosadmin@…" },
  { persona: "Salesforce Admin",   type: "Admin",     typeCls: "bg-slate-100 text-slate-700 border-slate-300",       tier: "admin",      tierLabel: "Admin",    tierOrder: 2, tierDot: "bg-amber-500",   tierBadge: "bg-amber-50 border-amber-200 text-amber-700",       health: "healthy",          healthOrder: 0, navigator: "✓ Full",         operations: "✓ Full",         demand: "✓ Full",     penny: "✓ Full",        knowledge: "✓ All tabs",  collaboration: "✓ Full",  administration: "✓ Full",    pennyDepth: "Admin — SF mapping, data layer, integration governance", sfAccess: "All objects, Permission Set, Profile, User", authMethod: "Admin group · trailosadmin@…" },
  { persona: "Platform Admin",     type: "Admin",     typeCls: "bg-slate-100 text-slate-700 border-slate-300",       tier: "superadmin", tierLabel: "Super",    tierOrder: 3, tierDot: "bg-slate-500",   tierBadge: "bg-slate-100 border-slate-300 text-slate-700",      health: "healthy",          healthOrder: 0, navigator: "✓ Full",         operations: "✓ Full",         demand: "✓ Full",     penny: "✓ Unrestricted",knowledge: "✓ All tabs",  collaboration: "✓ Full",  administration: "✓ Full",    pennyDepth: "Unrestricted — all RAG chunks, system prompts, governance override", sfAccess: "All objects", authMethod: "Email whitelist (prototype only)" },
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
  { key: "all",        label: "All tiers",   dot: "bg-zinc-400" },
  { key: "everyday",   label: "Everyday",    dot: "bg-emerald-500" },
  { key: "power",      label: "Power",       dot: "bg-violet-500" },
  { key: "admin",      label: "Admin",       dot: "bg-amber-500" },
  { key: "superadmin", label: "Super Admin", dot: "bg-slate-500" },
];

const TYPE_OPTIONS: { key: FilterType; label: string }[] = [
  { key: "all",       label: "All types" },
  { key: "Staff",     label: "Staff" },
  { key: "Admin",     label: "Admin" },
  { key: "Learner",   label: "Learner" },
  { key: "Volunteer", label: "Volunteer" },
  { key: "Sponsor",   label: "Sponsor" },
  { key: "Partner",   label: "Partner" },
];

const HEALTH_OPTIONS: { key: FilterHealth; label: string; dot: string }[] = [
  { key: "all",              label: "All",              dot: "bg-zinc-400" },
  { key: "healthy",          label: "Healthy",          dot: "bg-emerald-500" },
  { key: "needs-attention",  label: "Needs attention",  dot: "bg-amber-400" },
  { key: "incomplete",       label: "Incomplete",       dot: "bg-rose-500" },
];

const HEALTH_DOT: Record<string, string> = {
  healthy: "bg-emerald-500",
  "needs-attention": "bg-amber-400",
  incomplete: "bg-rose-500",
};

type SortKey = "persona" | "type" | "tier" | "health";

function CellValue({ value, inverted }: { value: string; inverted?: boolean }) {
  if (value.startsWith("✓")) return <span className={`text-[11px] font-medium ${inverted ? "text-emerald-300" : "text-emerald-600"}`}>{value}</span>;
  if (value.startsWith("—")) return <span className={`text-[11px] ${inverted ? "text-zinc-500" : "text-zinc-300"}`}>{value}</span>;
  return <span className={`text-[11px] ${inverted ? "text-zinc-300" : "text-zinc-500"}`}>{value}</span>;
}

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 text-[10px] ${active ? "text-zinc-700" : "text-zinc-300"}`}>
      {!active ? "↕" : dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

export function OptionC() {
  const [filterTier, setFilterTier]       = useState<FilterTier>("all");
  const [filterType, setFilterType]       = useState<FilterType>("all");
  const [filterHealth, setFilterHealth]   = useState<FilterHealth>("all");
  const [search, setSearch]               = useState("");
  const [selectedRow, setSelectedRow]     = useState<string | null>(null);
  const [sortKey, setSortKey]             = useState<SortKey>("tier");
  const [sortDir, setSortDir]             = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const processedRows = useMemo(() => {
    let rows = [...MATRIX_ROWS];

    // Filters
    if (filterTier !== "all")   rows = rows.filter((r) => r.tier === filterTier);
    if (filterType !== "all")   rows = rows.filter((r) => r.type === filterType);
    if (filterHealth !== "all") rows = rows.filter((r) => r.health === filterHealth);
    if (search.trim())          rows = rows.filter((r) => r.persona.toLowerCase().includes(search.toLowerCase()) || r.type.toLowerCase().includes(search.toLowerCase()));

    // Sort
    rows.sort((a, b) => {
      let valA: string | number;
      let valB: string | number;
      if (sortKey === "persona") { valA = a.persona; valB = b.persona; }
      else if (sortKey === "type")   { valA = a.type;    valB = b.type; }
      else if (sortKey === "tier")   { valA = a.tierOrder; valB = b.tierOrder; }
      else                           { valA = a.healthOrder; valB = b.healthOrder; }

      if (typeof valA === "number") return sortDir === "asc" ? valA - (valB as number) : (valB as number) - valA;
      return sortDir === "asc"
        ? valA.localeCompare(valB as string)
        : (valB as string).localeCompare(valA);
    });
    return rows;
  }, [filterTier, filterType, filterHealth, search, sortKey, sortDir]);

  const activeRow = MATRIX_ROWS.find((r) => r.persona === selectedRow) ?? null;
  const totalRows = MATRIX_ROWS.length;
  const shown     = processedRows.length;

  const healthCounts = {
    healthy:   MATRIX_ROWS.filter((r) => r.health === "healthy").length,
    needsAttn: MATRIX_ROWS.filter((r) => r.health === "needs-attention").length,
    incomplete: MATRIX_ROWS.filter((r) => r.health === "incomplete").length,
  };

  function clearFilters() {
    setFilterTier("all");
    setFilterType("all");
    setFilterHealth("all");
    setSearch("");
  }

  const hasActiveFilters = filterTier !== "all" || filterType !== "all" || filterHealth !== "all" || search.trim() !== "";

  return (
    <div className="min-h-screen bg-zinc-50 font-sans flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-zinc-200 px-8 py-5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Administration — People &amp; Access</p>
            <h1 className="text-xl font-bold text-zinc-900">Permission Matrix Studio</h1>
            <p className="text-[13px] text-zinc-500 mt-0.5">
              Sort columns · filter by tier, type, or health · click a row to inspect the full access profile.
            </p>
          </div>
          <div className="flex gap-2">
            {[
              { label: `${healthCounts.healthy} healthy`,         dot: "bg-emerald-500", cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
              { label: `${healthCounts.needsAttn} needs attention`, dot: "bg-amber-400",  cls: "bg-amber-50 border-amber-200 text-amber-700" },
              { label: `${healthCounts.incomplete} incomplete`,   dot: "bg-rose-500",   cls: "bg-rose-50 border-rose-200 text-rose-700" },
            ].map((b) => (
              <div key={b.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-semibold ${b.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />{b.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <div className="mt-4 flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[12px]">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search personas…"
              className="pl-7 pr-3 py-1.5 text-[12px] rounded-lg border border-zinc-200 bg-white text-zinc-800 placeholder-zinc-400 outline-none focus:border-zinc-400 w-44"
            />
          </div>

          {/* Tier pills */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400 mr-1">Tier</span>
            {TIER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilterTier(opt.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all ${
                  filterTier === opt.key
                    ? "bg-zinc-800 border-zinc-800 text-white"
                    : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                {opt.label}
              </button>
            ))}
          </div>

          {/* Type select */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400 mr-1">Type</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="text-[12px] rounded-lg border border-zinc-200 bg-white text-zinc-700 px-2 py-1.5 outline-none focus:border-zinc-400"
            >
              {TYPE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>

          {/* Health pills */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400 mr-1">Health</span>
            {HEALTH_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilterHealth(opt.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all ${
                  filterHealth === opt.key
                    ? "bg-zinc-800 border-zinc-800 text-white"
                    : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                {opt.label}
              </button>
            ))}
          </div>

          {/* Row count + clear */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] text-zinc-400">
              {shown === totalRows ? `${totalRows} roles` : `${shown} of ${totalRows} roles`}
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[11px] text-zinc-500 underline hover:text-zinc-800"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Matrix table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead className="bg-white border-b border-zinc-200 sticky top-0 z-10">
              <tr>
                {/* Sortable columns */}
                {(
                  [
                    { key: "persona" as SortKey, label: "Persona",  w: "w-36" },
                    { key: "type"    as SortKey, label: "Type",     w: "w-24" },
                    { key: "tier"    as SortKey, label: "Tier",     w: "w-20" },
                    { key: "health"  as SortKey, label: "Health",   w: "w-16" },
                  ]
                ).map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-zinc-500 cursor-pointer select-none hover:bg-zinc-50 ${col.w}`}
                  >
                    {col.label}
                    <SortIcon col={col.key} active={sortKey === col.key} dir={sortDir} />
                  </th>
                ))}
                {/* Nav cols (not sortable) */}
                {NAV_COLS.map((col) => (
                  <th key={col.key as string} className="text-left px-3 py-3 font-bold text-[10px] uppercase tracking-wider text-zinc-500">
                    {col.label}
                  </th>
                ))}
                <th className="text-left px-3 py-3 font-bold text-[10px] uppercase tracking-wider text-zinc-500">Penny depth</th>
              </tr>
            </thead>
            <tbody>
              {processedRows.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-8 py-12 text-center text-[13px] text-zinc-400">
                    No roles match the current filters.{" "}
                    <button onClick={clearFilters} className="underline hover:text-zinc-700">Clear filters</button>
                  </td>
                </tr>
              )}
              {processedRows.map((row, i) => {
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
                        : "bg-zinc-50/60 hover:bg-zinc-100"
                    }`}
                  >
                    {/* Persona */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.tierDot}`} />
                        <span className={`font-semibold ${isActive ? "text-white" : "text-zinc-800"}`}>{row.persona}</span>
                      </div>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${isActive ? "bg-white/20 border-white/30 text-white" : row.typeCls}`}>{row.type}</span>
                    </td>
                    {/* Tier */}
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isActive ? "bg-white/20 border-white/30 text-white" : row.tierBadge}`}>{row.tierLabel}</span>
                    </td>
                    {/* Health */}
                    <td className="px-4 py-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full inline-block ${HEALTH_DOT[row.health]}`} title={row.health} />
                    </td>
                    {/* Nav columns */}
                    {NAV_COLS.map((col) => (
                      <td key={col.key as string} className="px-3 py-2.5">
                        <CellValue value={row[col.key] as string} inverted={isActive} />
                      </td>
                    ))}
                    {/* Penny depth */}
                    <td className="px-3 py-2.5">
                      <span className={`text-[11px] ${isActive ? "text-violet-300" : "text-violet-600"}`}>
                        {row.pennyDepth.split(" — ")[0]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Detail side panel ──────────────────────────────────────────── */}
        {activeRow && (
          <div className="w-80 border-l border-zinc-200 bg-white overflow-auto shrink-0">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-start justify-between">
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
              <button onClick={() => setSelectedRow(null)} className="text-[11px] text-zinc-400 hover:text-zinc-700 shrink-0 ml-2">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Auth */}
              <div>
                <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1.5">Auth method</p>
                <p className="text-[11px] font-mono text-zinc-600 bg-zinc-50 rounded px-2.5 py-2 leading-snug">{activeRow.authMethod}</p>
              </div>

              {/* Penny */}
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                <p className="text-[10px] font-bold uppercase text-violet-500 mb-1">Penny depth</p>
                <p className="text-[12px] text-violet-800 leading-snug">{activeRow.pennyDepth}</p>
              </div>

              {/* SF access */}
              <div>
                <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1.5">Salesforce access</p>
                <p className="text-[11px] text-zinc-600 leading-relaxed">{activeRow.sfAccess}</p>
              </div>

              {/* Nav access breakdown */}
              <div>
                <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Navigation access</p>
                <div className="space-y-1.5">
                  {NAV_COLS.map((col) => {
                    const val = activeRow[col.key] as string;
                    return (
                      <div key={col.key as string} className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-zinc-400 w-24 shrink-0">{col.label}</span>
                        <span className={`text-[11px] ${val.startsWith("✓") ? "text-emerald-600 font-medium" : "text-zinc-400"}`}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
