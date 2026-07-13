import { useState, useMemo } from 'react';
import { X, Plus, Hash, Search } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import {
  pennyCapabilities,
  type PennyCapability,
} from '@/data/pennyCapabilityData';

// ── Badge helpers ─────────────────────────────────────────────────────────────

function getDomainColor(domain: string): string {
  const map: Record<string, string> = {
    Coaching:       'bg-violet-100 text-violet-700',
    Career:         'bg-blue-100 text-blue-700',
    Learning:       'bg-emerald-100 text-emerald-700',
    Knowledge:      'bg-amber-100 text-amber-700',
    Operations:     'bg-orange-100 text-orange-700',
    Communications: 'bg-cyan-100 text-cyan-700',
    Questing:       'bg-pink-100 text-pink-700',
  };
  return map[domain] ?? 'bg-gray-100 text-gray-600';
}

function getMaturityColor(maturity: string): string {
  const map: Record<string, string> = {
    'Prototype':      'bg-amber-100 text-amber-700',
    'Defined':        'bg-blue-100 text-blue-700',
    'Planned':        'bg-violet-100 text-violet-700',
    'In Development': 'bg-orange-100 text-orange-700',
    'Integrated':     'bg-cyan-100 text-cyan-700',
    'Operational':    'bg-emerald-100 text-emerald-700',
  };
  return map[maturity] ?? 'bg-gray-100 text-gray-600';
}

function getPocLabel(pocStatus: string): string {
  const map: Record<string, string> = {
    exists:  'In POC',
    partial: 'Partial',
    planned: 'Planned',
    none:    'Not in POC',
  };
  return map[pocStatus] ?? pocStatus;
}

function getPocColor(pocStatus: string): string {
  const map: Record<string, string> = {
    exists:  'bg-emerald-100 text-emerald-700',
    partial: 'bg-amber-100 text-amber-700',
    planned: 'bg-violet-100 text-violet-700',
    none:    'bg-gray-100 text-gray-500',
  };
  return map[pocStatus] ?? 'bg-gray-100 text-gray-500';
}

// ── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label, mono }: { label: string; mono?: boolean }) {
  return (
    <span className={`inline-block bg-muted px-2 py-0.5 rounded-full text-[10px] text-foreground leading-tight ${mono ? 'font-mono' : ''}`}>
      {label}
    </span>
  );
}

// ── Section block used in drawer ─────────────────────────────────────────────

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function CapabilityDrawer({
  cap,
  onClose,
  onRequestChanges,
}: {
  cap: PennyCapability;
  onClose: () => void;
  onRequestChanges: () => void;
}) {
  const depNames = cap.dependencies
    .map(id => pennyCapabilities.find(c => c.id === id)?.name ?? id)
    .filter(Boolean);

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40 bg-black/10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[480px] bg-card border-l border-border shadow-2xl">

        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getDomainColor(cap.domain)}`}>
                {cap.domain}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getMaturityColor(cap.maturity)}`}>
                {cap.maturity}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPocColor(cap.pocStatus)}`}>
                {getPocLabel(cap.pocStatus)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <h2 className="text-base font-bold text-foreground mt-2 leading-snug">{cap.name}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{cap.shortDescription}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          <DrawerSection title="Purpose">
            <p className="text-[12px] text-foreground leading-relaxed">{cap.purpose}</p>
          </DrawerSection>

          <DrawerSection title="Audience">
            <div className="flex flex-wrap gap-1">
              {cap.audience.map(a => <Chip key={a} label={a} />)}
            </div>
          </DrawerSection>

          <DrawerSection title="Inputs">
            <div className="flex flex-wrap gap-1">
              {cap.inputs.map(i => <Chip key={i} label={i} />)}
            </div>
          </DrawerSection>

          <DrawerSection title="Outputs">
            <div className="flex flex-wrap gap-1">
              {cap.outputs.map(o => <Chip key={o} label={o} />)}
            </div>
          </DrawerSection>

          <DrawerSection title="POC Status">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPocColor(cap.pocStatus)}`}>
              {getPocLabel(cap.pocStatus)}
            </span>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{cap.pocMapping}</p>
          </DrawerSection>

          <DrawerSection title="Next Steps">
            <ol className="space-y-1">
              {cap.nextSteps.map((s, i) => (
                <li key={i} className="text-[12px] text-foreground leading-snug">
                  <span className="text-muted-foreground mr-1">{i + 1}.</span>{s}
                </li>
              ))}
            </ol>
          </DrawerSection>

          {cap.relatedSfObjects.length > 0 && (
            <DrawerSection title="Related Salesforce Objects">
              <div className="flex flex-wrap gap-1">
                {cap.relatedSfObjects.map(o => <Chip key={o} label={o} mono />)}
              </div>
            </DrawerSection>
          )}

          {depNames.length > 0 && (
            <DrawerSection title="Dependencies">
              <div className="flex flex-wrap gap-1">
                {depNames.map(n => <Chip key={n} label={n} />)}
              </div>
            </DrawerSection>
          )}

          {cap.foundationsTrailExample && (
            <DrawerSection title="Foundations Trail Example">
              <p className="text-[12px] text-muted-foreground leading-relaxed italic border-l-2 border-border pl-3">
                {cap.foundationsTrailExample}
              </p>
            </DrawerSection>
          )}

          <DrawerSection title="Future Integration">
            <p className="text-[12px] text-muted-foreground leading-snug">{cap.futureIntegrationStatus}</p>
          </DrawerSection>

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-border flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Owner: <strong className="text-foreground">{cap.owner}</strong>
          </span>
          <button
            onClick={onRequestChanges}
            className="px-3 py-1.5 text-[10px] font-semibold border border-border rounded-full hover:bg-muted/40 transition-colors"
          >
            Request Changes
          </button>
        </div>

      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PennyCapabilityRegistry() {
  const { openActionPanel, openSlackPanel } = useAppContext();

  const [search,         setSearch]         = useState('');
  const [domainFilter,   setDomainFilter]   = useState('');
  const [maturityFilter, setMaturityFilter] = useState('');
  const [pocFilter,      setPocFilter]      = useState('');
  const [selected,       setSelected]       = useState<PennyCapability | null>(null);
  const [drawerOpen,     setDrawerOpen]     = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return pennyCapabilities.filter(c => {
      if (q && !c.name.toLowerCase().includes(q) && !c.shortDescription.toLowerCase().includes(q)) return false;
      if (domainFilter   && c.domain    !== domainFilter)   return false;
      if (maturityFilter && c.maturity  !== maturityFilter) return false;
      if (pocFilter      && c.pocStatus !== pocFilter)      return false;
      return true;
    });
  }, [search, domainFilter, maturityFilter, pocFilter]);

  const anyFilter = search || domainFilter || maturityFilter || pocFilter;

  function clearFilters() {
    setSearch('');
    setDomainFilter('');
    setMaturityFilter('');
    setPocFilter('');
  }

  function openCapability(cap: PennyCapability) {
    setSelected(cap);
    setDrawerOpen(true);
  }

  function handleNewCapability() {
    openActionPanel({
      title: 'Request New Capability', objectType: 'Penny Capability',
      subtitle: 'Register a new Penny AI capability. Appears with Planned/Draft status until validated.',
      slackContext: 'penny',
      fields: [
        { id: 'name',              label: 'Capability Name',       type: 'text',     required: true, placeholder: 'e.g. Salary Negotiation Coach' },
        { id: 'domain',            label: 'Domain',                type: 'select',   options: ['Coaching', 'Career', 'Learning', 'Knowledge', 'Operations', 'Communications', 'Questing'], required: true },
        { id: 'description',       label: 'Description',           type: 'textarea', placeholder: 'What does this capability do for learners?', rows: 3 },
        { id: 'trigger',           label: 'When to Use',           type: 'textarea', placeholder: 'Describe the context where Penny should invoke this…', rows: 3 },
        { id: 'maturity',          label: 'Maturity Level',        type: 'select',   options: ['Concept', 'Planned', 'In Development', 'POC Ready', 'Live'] },
        { id: 'hallucinationRisk', label: 'Hallucination Risk',    type: 'select',   options: ['Low', 'Medium', 'High'] },
        { id: 'knowledgeSources',  label: 'Key Knowledge Sources', type: 'textarea', placeholder: 'Which sources should Penny query?', rows: 2 },
      ],
    });
  }

  const selectClasses = 'h-7 text-[11px] rounded-md border border-input bg-white px-2 focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Page header */}
      <div className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0 bg-background">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Penny Capabilities</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {filtered.length} of {pennyCapabilities.length} capabilities across 7 domains
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => openSlackPanel({ context: 'penny', title: 'Penny Capabilities', subtitle: 'Slack channels and pending bot status for capability work.' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-[#4A154B]/20 bg-[#4A154B]/5 text-[#4A154B] hover:bg-[#4A154B]/10 transition-colors"
            >
              <Hash className="w-3.5 h-3.5" />
              Slack
            </button>
            <button
              onClick={handleNewCapability}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[10px] font-bold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Request New Capability
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or description…"
              className="h-7 text-[11px] rounded-md border border-input bg-white pl-6 pr-2.5 w-64 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)} className={selectClasses}>
            <option value="">All Domains</option>
            {(['Coaching', 'Career', 'Learning', 'Knowledge', 'Operations', 'Communications', 'Questing'] as const).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select value={maturityFilter} onChange={e => setMaturityFilter(e.target.value)} className={selectClasses}>
            <option value="">All Maturity Levels</option>
            {(['Prototype', 'Defined', 'Planned', 'In Development', 'Integrated', 'Operational'] as const).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select value={pocFilter} onChange={e => setPocFilter(e.target.value)} className={selectClasses}>
            <option value="">All POC Status</option>
            <option value="exists">In POC</option>
            <option value="partial">Partial</option>
            <option value="planned">Planned</option>
            <option value="none">Not in POC</option>
          </select>

          {anyFilter && (
            <button
              onClick={clearFilters}
              className="text-[10px] text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-5 py-4">
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide w-44">Name</th>
                <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide w-28">Domain</th>
                <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide w-28">Maturity</th>
                <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide w-24">POC</th>
                <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide w-28">Owner</th>
                <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                    No capabilities match your filters.{' '}
                    <button onClick={clearFilters} className="underline hover:text-foreground transition-colors">
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map(cap => (
                  <tr
                    key={cap.id}
                    onClick={() => openCapability(cap)}
                    className="bg-white hover:bg-muted/20 cursor-pointer border-b border-border/50 last:border-0 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-[12px] font-medium text-foreground w-44">
                      {cap.name}
                    </td>
                    <td className="px-3 py-2.5 w-28">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getDomainColor(cap.domain)}`}>
                        {cap.domain}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 w-28">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getMaturityColor(cap.maturity)}`}>
                        {cap.maturity}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 w-24">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getPocColor(cap.pocStatus)}`}>
                        {getPocLabel(cap.pocStatus)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground w-28">
                      {cap.owner}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground max-w-xs">
                      <span className="line-clamp-2">{cap.shortDescription}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      {drawerOpen && selected && (
        <CapabilityDrawer
          cap={selected}
          onClose={() => setDrawerOpen(false)}
          onRequestChanges={handleNewCapability}
        />
      )}

    </div>
  );
}
