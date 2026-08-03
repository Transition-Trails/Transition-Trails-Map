import { useState, useMemo } from 'react';
import { TERMS } from '@/config/terminology';
import { useLocation } from 'wouter';
import { Search as SearchIcon, ArrowRight, Target, ExternalLink, X, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import type { ActiveContext } from '@/context/AppContext';
import {
  SEARCH_INDEX, EXAMPLE_PATHS, EXAMPLE_SEARCHES, searchIndex, groupByObjectType,
  type SearchEntry,
} from '@/data/globalSearchData';

// ── Tier-based type filtering ─────────────────────────────────────────────────
const EVERYDAY_TYPES = new Set(['program', 'cohort', 'sprint', 'lesson', 'assessment', 'person']);
const POWER_TYPES    = new Set([
  'program', 'cohort', 'sprint', 'module', 'lesson', 'assessment',
  'penny-capability', 'knowledge-source', 'knowledge-article', 'standard',
  'program-blueprint', 'person', 'role',
]);

// Friendly plain-language labels for everyday users
const FRIENDLY_LABEL: Record<string, string> = {
  program:    'Program',
  cohort:     'Cohort',
  sprint:     'Sprint',
  module:     'Module',
  lesson:     'Workshop',
  assessment: 'Assessment',
  person:     'Team Member',
};

// Contextual next-step hints per object type
const NEXT_STEP: Record<string, string> = {
  program:    'View program details, upcoming sessions, and your active cohort.',
  cohort:     'See who is enrolled, the week schedule, and your assigned coach.',
  sprint:     'Open sprint materials, upcoming workshops, and activity checklist.',
  lesson:     'Access lesson content, activities, and Penny coaching for this session.',
  assessment: 'View assessment details, prompts, and your progress.',
  person:     'See contact details, role, and program involvement.',
};

// Everyday filter groups
const EVERYDAY_FILTERS = [
  { id: 'all',      label: 'All',      types: null as string[] | null },
  { id: 'programs', label: 'Programs', types: ['program', 'cohort', 'sprint'] },
  { id: 'learning', label: 'Learning', types: ['lesson', 'assessment'] },
  { id: 'people',   label: 'People',   types: ['person'] },
];

// Power filter groups
const POWER_FILTERS = [
  { id: 'all',      label: 'All',      types: null as string[] | null },
  { id: 'programs', label: 'Programs', types: ['program', 'cohort', 'sprint', 'module'] },
  { id: 'penny',    label: TERMS.aiAssistant, types: ['penny-capability'] },
  { id: 'knowledge',label: 'Knowledge', types: ['knowledge-source', 'knowledge-article', 'standard'] },
  { id: 'people',   label: 'People',   types: ['person'] },
];

const EVERYDAY_SUGGESTED = ['my programs', 'active cohort', 'resume workshop', 'sprint 3', 'interview prep', 'my coach'];
const POWER_SUGGESTED    = ['resume review quality', 'source trust', 'learner at-risk', 'cohort intelligence', 'penny capabilities'];

// ── Shared utility components ─────────────────────────────────────────────────
function HealthDot({ health }: { health?: string }) {
  const cls =
    health === 'healthy'         ? 'bg-[#E6F0EA]0' :
    health === 'needs-attention' ? 'bg-[#FFF3E0]0'   :
    health === 'incomplete'      ? 'bg-[#FBEAE6]0'    : 'bg-muted-foreground/30';
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
  const cls = value >= 85 ? 'bg-[#2F6B3F]' : value >= 70 ? 'bg-[#CC8400]' : 'bg-[#A93F2F]';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${cls} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[9px] tabular-nums text-muted-foreground">{value}%</span>
    </div>
  );
}

// ── Everyday-specific components ──────────────────────────────────────────────
function EverydayResultCard({ entry, selected, onSelect }: { entry: SearchEntry; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-3 border-b border-border/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary ${
        selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <HealthDot health={selected ? 'unknown' : entry.health} />
        <p className={`text-[12px] font-bold leading-tight truncate flex-1 ${selected ? 'text-primary-foreground' : 'text-foreground'}`}>
          {entry.name}
        </p>
      </div>
      <p className={`text-[10px] pl-4 leading-snug line-clamp-2 ${selected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
        {entry.description}
      </p>
    </button>
  );
}

function EverydayDetailPanel({ entry, onSetContext }: { entry: SearchEntry; onSetContext: (e: SearchEntry) => void }) {
  const [, setLocation] = useLocation();
  const friendlyType = FRIENDLY_LABEL[entry.objectTypeId] ?? entry.objectTypeName;
  const nextStep = NEXT_STEP[entry.objectTypeId] ?? 'Open this item to explore further.';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-border space-y-1.5">
        <div className="flex items-center gap-2">
          <HealthDot health={entry.health} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{friendlyType}</span>
          {entry.status && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground">{entry.status}</span>
            </>
          )}
        </div>
        <h2 className="text-base font-semibold text-foreground leading-tight">{entry.name}</h2>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{entry.description}</p>
      </div>

      {/* Next step */}
      <div className="px-5 py-3 bg-primary/5 border-b border-primary/10">
        <p className="text-[9px] font-bold uppercase tracking-widest text-primary/60 mb-1">Next step</p>
        <p className="text-[12px] text-foreground leading-snug">{nextStep}</p>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="px-5 py-3 border-t border-border flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setLocation(entry.workspaceLink)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors"
        >
          Open
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onSetContext(entry)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-[11px] font-semibold text-foreground hover:bg-muted/40 transition-colors"
        >
          <Target className="w-3.5 h-3.5" />
          Set as Context
        </button>
      </div>
    </div>
  );
}

function EverydayEmptyState({ onSuggest }: { onSuggest: (s: string) => void }) {
  return (
    <div className="p-5 space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Find anything</p>
        <p className="text-[13px] font-semibold text-foreground mb-0.5">What are you looking for?</p>
        <p className="text-[11px] text-muted-foreground">Find programs, sessions, team members, and learning materials.</p>
      </div>
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2.5">Quick searches</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { emoji: '📋', label: 'My programs',     q: 'foundations' },
            { emoji: '👥', label: 'Active cohort',   q: 'cohort 2' },
            { emoji: '✏️', label: 'Resume workshop', q: 'resume' },
            { emoji: '💬', label: 'Interview prep',  q: 'interview' },
            { emoji: '👤', label: 'My coach',        q: 'coach' },
            { emoji: '📅', label: 'Current sprint',  q: 'sprint 3' },
          ].map(item => (
            <button
              key={item.q}
              onClick={() => onSuggest(item.q)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors text-left"
            >
              <span className="text-[15px] leading-none">{item.emoji}</span>
              <span className="text-[11px] text-foreground font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Full search components (power/admin) ──────────────────────────────────────
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

function ExplorerPanel({ entry, onSetContext }: { entry: SearchEntry; onSetContext: (e: SearchEntry) => void }) {
  const [, setLocation] = useLocation();
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-border space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <TypeBadge entry={entry} />
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border bg-muted text-muted-foreground border-border">
                {entry.status}
              </span>
              <div className="flex items-center gap-1">
                <HealthDot health={entry.health} />
                <span className="text-[9px] text-muted-foreground capitalize">{entry.health?.replace('-', ' ')}</span>
              </div>
            </div>
            <h2 className="text-base font-semibold text-foreground leading-tight">{entry.name}</h2>
          </div>
          <div className="text-right shrink-0">
            <ConfidenceBar value={entry.confidence} />
            <p className="text-[9px] text-muted-foreground mt-0.5">confidence</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{entry.description}</p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          {entry.owner && (
            <span>Owner: <strong className="text-foreground">{entry.owner}</strong></span>
          )}
          {entry.sourceOfTruth && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                SoT: <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#E6F0EA] border border-[#9FC3AE] text-[#2F6B3F] ml-1">{entry.sourceOfTruth}</span>
              </span>
            </>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Relationships */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Relationships</p>
            {entry.relationships.length > 0 ? (
              <div className="space-y-1">
                {entry.relationships.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                      r.direction === 'up' ? 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]' : 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]'
                    }`}>
                      {r.direction === 'up' ? '↑ upstream' : '↓ downstream'}
                    </span>
                    <span className="text-[11px] text-foreground font-medium flex-1 truncate">{r.name}</span>
                    <span className="text-[9px] text-muted-foreground shrink-0">{r.type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">No relationships mapped yet.</p>
            )}
          </div>

          {/* Impact summary */}
          {entry.impactSummary && (
            <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0]/60 p-3">
              <p className="text-[9px] font-bold text-[#CC8400] uppercase tracking-widest mb-1">Impact Summary</p>
              <p className="text-[11px] text-[#CC8400] leading-relaxed">{entry.impactSummary}</p>
            </div>
          )}

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Tags</p>
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
      <div className="px-4 py-3 border-t border-border shrink-0 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onSetContext(entry)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors"
        >
          <Target className="w-3.5 h-3.5" />
          Set as Context
        </button>
        <button
          onClick={() => setLocation(entry.workspaceLink)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-[11px] font-semibold text-foreground hover:bg-muted/40 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Workspace
        </button>
        {entry.profileId && (
          <button
            onClick={() => setLocation(`/uom/profile/${entry.profileId}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-[11px] font-semibold text-foreground hover:bg-muted/40 transition-colors"
          >
            View Profile
          </button>
        )}
      </div>
    </div>
  );
}

function ExamplePaths({ onNodeClick }: { onNodeClick: (name: string) => void }) {
  return (
    <div className="p-5 space-y-4">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Relationship Explorer</p>
        <p className="text-[13px] font-semibold text-foreground mb-0.5">Select a result to explore</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Search for any object, then select it to see its relationships, ownership, health, and impact across Trail OS.
        </p>
      </div>
      <div className="space-y-2.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Example paths</p>
        {EXAMPLE_PATHS.map(path => (
          <div key={path.label} className="rounded-lg border border-border bg-background p-3 space-y-2">
            <p className="text-[12px] font-semibold text-foreground">{path.label}</p>
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

// ── GlobalSearch ───────────────────────────────────────────────────────────────
export default function GlobalSearch() {
  const [query, setQuery]           = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState('all');
  const { setActiveContext, activeContext } = useAppContext();
  const { isEveryday, isPowerOrAbove, isAdminOrAbove } = useTierFlags();

  // Determine visible types based on tier
  const visibleIndex = useMemo(() => {
    if (isAdminOrAbove) return SEARCH_INDEX;
    if (isPowerOrAbove) return SEARCH_INDEX.filter(e => POWER_TYPES.has(e.objectTypeId));
    return SEARCH_INDEX.filter(e => EVERYDAY_TYPES.has(e.objectTypeId));
  }, [isEveryday, isPowerOrAbove, isAdminOrAbove]);

  // Active filter groups
  const filterGroups = isEveryday ? EVERYDAY_FILTERS : isPowerOrAbove && !isAdminOrAbove ? POWER_FILTERS : null;
  const suggested    = isEveryday ? EVERYDAY_SUGGESTED : isPowerOrAbove && !isAdminOrAbove ? POWER_SUGGESTED : EXAMPLE_SEARCHES;

  // Search + group filter
  const results = useMemo(() => {
    const base = query
      ? visibleIndex.filter(e =>
          e.name.toLowerCase().includes(query.toLowerCase()) ||
          e.description.toLowerCase().includes(query.toLowerCase()) ||
          e.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
        )
      : visibleIndex;

    if (filterGroups) {
      const group = filterGroups.find(g => g.id === filterGroup);
      if (group && group.types) {
        return base.filter(e => (group.types as string[]).includes(e.objectTypeId));
      }
    } else {
      if (filterGroup !== 'All' && filterGroup !== 'all') {
        return base.filter(e => e.objectTypeName === filterGroup);
      }
    }
    return base;
  }, [query, visibleIndex, filterGroup, filterGroups]);

  const grouped  = useMemo(() => groupByObjectType(results), [results]);
  const selected = results.find(e => e.id === selectedId) ?? null;

  // Admin: derive type options dynamically from visible index
  const adminTypeOptions = useMemo(() =>
    isAdminOrAbove ? ['All', ...Array.from(new Set(SEARCH_INDEX.map(e => e.objectTypeName)))] : [],
    [isAdminOrAbove]
  );

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

  function clearSearch() {
    setQuery('');
    setSelectedId(null);
    setFilterGroup('all');
  }

  const searchPlaceholder = isEveryday
    ? 'Search programs, team, sessions, and documents…'
    : isPowerOrAbove && !isAdminOrAbove
    ? `Search programs, ${TERMS.aiAssistant} capabilities, knowledge, and people…`
    : `Search all Trail OS objects — programs, capabilities, knowledge, roles, integrations…`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background">

      {/* Search header */}
      <div className="px-5 pt-4 pb-3 border-b border-border shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">
          {isAdminOrAbove ? 'Global Search & Relationship Explorer' : 'Search'}
        </p>
        <h1 className="text-base font-semibold text-foreground mb-3">
          {isAdminOrAbove ? 'Find and explore any Trail OS object' : isEveryday ? 'Find your programs and team' : 'Search across Trail OS'}
        </h1>

        {/* Search input */}
        <div className="relative max-w-xl">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedId(null); setFilterGroup('all'); }}
            placeholder={searchPlaceholder}
            autoFocus
            className="w-full text-[13px] border border-border rounded-lg pl-10 pr-8 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-muted-foreground/40"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Suggested / example searches */}
        {!query && (
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
              {isEveryday ? 'Try:' : 'Explore:'}
            </span>
            {suggested.map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); setSelectedId(null); }}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Active context banner */}
        {activeContext && (
          <div className="mt-2.5 flex items-center gap-2 text-[11px] text-primary bg-primary/5 border border-primary/15 rounded-md px-3 py-1.5">
            <Target className="w-3.5 h-3.5 shrink-0" />
            <span>Active context: <strong>{activeContext.name}</strong> · {activeContext.objectTypeName}</span>
            <button
              onClick={() => setActiveContext(null)}
              className="ml-auto text-[9px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div className="px-4 py-2 border-b border-border/60 flex items-center gap-1.5 overflow-x-auto shrink-0">
        {filterGroups ? (
          filterGroups.map(fg => (
            <button
              key={fg.id}
              onClick={() => { setFilterGroup(fg.id); setSelectedId(null); }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border whitespace-nowrap transition-colors ${
                filterGroup === fg.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {fg.label}
              {fg.id !== 'all' && (
                <span className="ml-1 opacity-50">
                  {results.filter(e => fg.types ? (fg.types as string[]).includes(e.objectTypeId) : true).length}
                </span>
              )}
            </button>
          ))
        ) : (
          adminTypeOptions.map(t => (
            <button
              key={t}
              onClick={() => { setFilterGroup(t); setSelectedId(null); }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border whitespace-nowrap transition-colors ${
                filterGroup === t
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {t}
              {t !== 'All' && (
                <span className="ml-1 opacity-50">
                  {SEARCH_INDEX.filter(e => e.objectTypeName === t).length}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Results list */}
        <div className="w-[280px] flex-shrink-0 border-r border-border overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <SearchIcon className="w-7 h-7 mx-auto text-muted-foreground/20" />
              <p className="text-[12px] font-semibold text-foreground">No results for "{query}"</p>
              <p className="text-[11px] text-muted-foreground">Try a different term or clear the filter.</p>
              <button
                onClick={clearSearch}
                className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Clear search
              </button>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground/60">
                  {results.length} result{results.length !== 1 ? 's' : ''}{query ? ` for "${query}"` : ''}
                </p>
                {selectedId && (
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-[9px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    Deselect
                  </button>
                )}
              </div>
              {isEveryday ? (
                results.map(entry => (
                  <EverydayResultCard
                    key={entry.id}
                    entry={entry}
                    selected={selectedId === entry.id}
                    onSelect={() => setSelectedId(prev => prev === entry.id ? null : entry.id)}
                  />
                ))
              ) : (
                Array.from(grouped.entries()).map(([typeName, entries]) => (
                  <div key={typeName}>
                    <div className="px-3 py-1.5 bg-muted/20 border-b border-border/30">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">{typeName}</p>
                    </div>
                    {entries.map(entry => (
                      <ResultCard
                        key={entry.id}
                        entry={entry}
                        selected={selectedId === entry.id}
                        onSelect={() => setSelectedId(prev => prev === entry.id ? null : entry.id)}
                      />
                    ))}
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Right: Detail / Explorer panel */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            isEveryday ? (
              <EverydayDetailPanel entry={selected} onSetContext={handleSetContext} />
            ) : (
              <ExplorerPanel entry={selected} onSetContext={handleSetContext} />
            )
          ) : (
            isEveryday ? (
              <EverydayEmptyState onSuggest={q => { setQuery(q); setSelectedId(null); }} />
            ) : (
              <ExamplePaths onNodeClick={handleNodeClick} />
            )
          )}
        </div>
      </div>
    </div>
  );
}
