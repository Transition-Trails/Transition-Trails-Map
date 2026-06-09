import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Search as SearchIcon, ArrowRight, Target, ExternalLink, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import type { ActiveContext } from '@/context/AppContext';
import {
  SEARCH_INDEX, EXAMPLE_PATHS, EXAMPLE_SEARCHES, searchIndex, groupByObjectType,
  type SearchEntry,
} from '@/data/globalSearchData';

// ── Utility components ────────────────────────────────────────────────────────
function HealthDot({ health }: { health?: string }) {
  const cls =
    health === 'healthy'         ? 'bg-emerald-500' :
    health === 'needs-attention' ? 'bg-amber-500'   :
    health === 'incomplete'      ? 'bg-rose-500'    : 'bg-gray-300';
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${cls}`} />;
}

function TypeBadge({ entry }: { entry: SearchEntry }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${entry.categoryBg} ${entry.categoryColor}`}>
      {entry.objectTypeName}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const cls = value >= 85 ? 'bg-emerald-400' : value >= 70 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${cls} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[9px] tabular-nums text-muted-foreground">{value}%</span>
    </div>
  );
}

// ── Result card (left panel) ──────────────────────────────────────────────────
function ResultCard({ entry, selected, onSelect }: { entry: SearchEntry; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-3 border-b border-border/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary ${
        selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
      }`}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <p className={`text-[12px] font-bold leading-tight truncate ${selected ? 'text-primary-foreground' : 'text-foreground'}`}>
          {entry.name}
        </p>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <HealthDot health={entry.health} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
          selected ? 'bg-primary-foreground/10 text-primary-foreground/80 border-primary-foreground/20' : `${entry.categoryBg} ${entry.categoryColor} border-border`
        }`}>
          {entry.objectTypeName}
        </span>
        <span className={`text-[9px] ${selected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{entry.status}</span>
      </div>
    </button>
  );
}

// ── Explorer panel (right) ────────────────────────────────────────────────────
function ExplorerPanel({ entry, onSetContext }: { entry: SearchEntry; onSetContext: (e: SearchEntry) => void }) {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col h-full">
      {/* Object header */}
      <div className="px-5 pt-5 pb-4 border-b border-border bg-background/60 space-y-2.5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <TypeBadge entry={entry} />
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border bg-muted text-muted-foreground border-border">
                {entry.status}
              </span>
            </div>
            <h2 className="text-lg font-bold font-serif text-foreground leading-tight">{entry.name}</h2>
          </div>
          <div className="text-right shrink-0">
            <ConfidenceBar value={entry.confidence} />
            <p className="text-[9px] text-muted-foreground mt-1">confidence</p>
          </div>
        </div>

        <p className="text-[12px] text-muted-foreground leading-relaxed">{entry.description}</p>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Owner: <strong className="text-foreground">{entry.owner}</strong></span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            SoT: <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-teal-50 border border-teal-200 text-teal-700 ml-1">{entry.sourceOfTruth}</span>
          </span>
        </div>

        {/* Health dot */}
        <div className="flex items-center gap-1.5">
          <HealthDot health={entry.health} />
          <span className="text-[11px] text-muted-foreground capitalize">{entry.health?.replace('-', ' ')}</span>
        </div>
      </div>

      {/* Relationships */}
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4">

          {/* Relationship preview */}
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-2">Relationships</p>
            {entry.relationships.map((r, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                  r.direction === 'up' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {r.direction === 'up' ? '↑ upstream' : '↓ downstream'}
                </span>
                <span className="text-[11px] text-foreground font-medium">{r.name}</span>
                <span className="text-[9px] text-muted-foreground ml-auto">{r.type}</span>
              </div>
            ))}
            {entry.relationships.length === 0 && (
              <p className="text-[11px] text-muted-foreground">No relationships mapped yet.</p>
            )}
          </div>

          {/* Impact summary */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Impact Summary</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">{entry.impactSummary}</p>
          </div>

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {entry.tags.map(t => (
                  <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-muted border border-border text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-border bg-card shrink-0 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onSetContext(entry)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors"
        >
          <Target className="w-3.5 h-3.5" />
          Set as Context
        </button>
        <button
          onClick={() => setLocation(entry.workspaceLink)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-white text-[11px] font-semibold text-foreground hover:bg-muted/40 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Workspace
        </button>
        {entry.profileId && (
          <button
            onClick={() => setLocation(`/uom/profile/${entry.profileId}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-white text-[11px] font-semibold text-foreground hover:bg-muted/40 transition-colors"
          >
            View Profile
          </button>
        )}
      </div>
    </div>
  );
}

// ── Empty explorer ─────────────────────────────────────────────────────────────
function ExamplePaths({ onNodeClick }: { onNodeClick: (name: string) => void }) {
  return (
    <div className="p-6 space-y-5">
      <div>
        <p className="text-[11px] font-bold text-foreground mb-1">Relationship Explorer</p>
        <p className="text-[11px] text-muted-foreground">Select a search result to explore its relationships, ownership, health, and impact across Trail OS.</p>
      </div>
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase text-muted-foreground/60">Example Paths</p>
        {EXAMPLE_PATHS.map(path => (
          <div key={path.label} className="rounded-lg border border-border bg-white p-3 space-y-2">
            <p className="text-[12px] font-bold text-foreground">{path.label}</p>
            <p className="text-[11px] text-muted-foreground">{path.description}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {path.nodes.map((node, i) => (
                <div key={node.name} className="flex items-center gap-1">
                  <button
                    onClick={() => onNodeClick(node.name)}
                    className="text-[10px] font-semibold text-primary border border-primary/20 bg-primary/5 rounded px-2 py-0.5 hover:bg-primary/10 transition-colors"
                  >
                    {node.name}
                  </button>
                  {i < path.nodes.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── GlobalSearch page ─────────────────────────────────────────────────────────
export default function GlobalSearch() {
  const [query, setQuery]           = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const { setActiveContext, activeContext } = useAppContext();

  const results = useMemo(() => {
    const base = searchIndex(query);
    if (typeFilter === 'All') return base;
    return base.filter(e => e.objectTypeName === typeFilter);
  }, [query, typeFilter]);

  const grouped = useMemo(() => groupByObjectType(results), [results]);
  const typeOptions = useMemo(() => ['All', ...Array.from(new Set(SEARCH_INDEX.map(e => e.objectTypeName)))], []);

  const selected = results.find(e => e.id === selectedId) ?? null;

  function handleSetContext(entry: SearchEntry) {
    const ctx: ActiveContext = {
      id: entry.id,
      objectTypeId: entry.objectTypeId,
      objectTypeName: entry.objectTypeName,
      category: entry.category,
      categoryColor: entry.categoryColor,
      categoryBg: entry.categoryBg,
      name: entry.name,
      status: entry.status,
      statusVariant: entry.statusVariant,
      health: entry.health,
      owner: entry.owner,
      workspaceLink: entry.workspaceLink,
      profileId: entry.profileId,
      setAt: new Date().toISOString(),
    };
    setActiveContext(ctx);
  }

  function handleNodeClick(name: string) {
    const match = SEARCH_INDEX.find(e => e.name === name || e.name.includes(name));
    if (match) { setQuery(match.name); setSelectedId(match.id); }
    else setQuery(name);
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Search header */}
      <div className="px-5 pt-5 pb-4 border-b border-border bg-card shrink-0">
        <h1 className="text-lg font-bold font-serif text-foreground mb-3">Global Search & Relationship Explorer</h1>
        <div className="relative max-w-xl">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedId(null); }}
            placeholder="Search all Trail OS objects — programs, capabilities, knowledge, roles, integrations…"
            autoFocus
            className="w-full text-[13px] border border-border rounded-lg pl-10 pr-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-muted-foreground/40"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSelectedId(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Example searches */}
        {!query && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[10px] font-bold text-muted-foreground/60">Try:</span>
            {EXAMPLE_SEARCHES.map(s => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border bg-white text-foreground hover:bg-muted/40 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Active context banner */}
        {activeContext && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-primary bg-primary/5 border border-primary/15 rounded-md px-3 py-1.5">
            <Target className="w-3.5 h-3.5 shrink-0" />
            <span>Active context: <strong>{activeContext.name}</strong> ({activeContext.objectTypeName})</span>
          </div>
        )}
      </div>

      {/* Type filter row */}
      <div className="px-5 py-2 border-b border-border bg-background/60 flex items-center gap-2 overflow-x-auto shrink-0">
        {typeOptions.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border whitespace-nowrap transition-colors ${
              typeFilter === t ? 'bg-foreground text-background border-foreground' : 'bg-white border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            {t}
            {t !== 'All' && (
              <span className="ml-1 opacity-50">
                {results.filter(e => e.objectTypeName === t).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Body: results + explorer */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Results */}
        <div className="w-[300px] flex-shrink-0 border-r border-border overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <SearchIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No results for <strong>"{query}"</strong></p>
              <p className="text-xs mt-1">Try a different term or clear the filter.</p>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-border/40 bg-muted/30">
                <p className="text-[10px] font-bold text-muted-foreground">
                  {results.length} result{results.length !== 1 ? 's' : ''}{query ? ` for "${query}"` : ' — all objects'}
                </p>
              </div>
              {Array.from(grouped.entries()).map(([typeName, entries]) => (
                <div key={typeName}>
                  <div className="px-3 py-1.5 bg-muted/20 border-b border-border/30">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">{typeName}</p>
                  </div>
                  {entries.map(entry => (
                    <ResultCard
                      key={entry.id}
                      entry={entry}
                      selected={selectedId === entry.id}
                      onSelect={() => setSelectedId(entry.id)}
                    />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Right: Explorer */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ExplorerPanel entry={selected} onSetContext={handleSetContext} />
          ) : (
            <ExamplePaths onNodeClick={handleNodeClick} />
          )}
        </div>
      </div>
    </div>
  );
}
