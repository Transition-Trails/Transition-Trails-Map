import { useState, useMemo, useEffect, useRef } from 'react';
import { TERMS } from '@/config/terminology';
import { useLocation } from 'wouter';
import {
  Search as SearchIcon, ArrowRight, X, Sparkles, ChevronDown,
  BookOpen, Users, Layers, Brain, FileText, Shield, Network,
  GraduationCap, Calendar, Activity, Clock,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import {
  SEARCH_INDEX, searchIndex, groupByObjectType,
  type SearchEntry,
} from '@/data/globalSearchData';

// ── Tier-gated type sets ───────────────────────────────────────────────────────
const EVERYDAY_TYPES = new Set(['program', 'cohort', 'sprint', 'lesson', 'assessment', 'person']);
const POWER_TYPES    = new Set([
  'program', 'cohort', 'sprint', 'module', 'lesson', 'assessment',
  'penny-capability', 'knowledge-source', 'knowledge-article', 'standard',
  'program-blueprint', 'person', 'role',
]);

// Plain-English labels for everyday users
const FRIENDLY_LABEL: Record<string, string> = {
  program:    'Program',
  cohort:     'Group',
  sprint:     'Sprint',
  module:     'Module',
  lesson:     'Workshop',
  assessment: 'Assessment',
  person:     'Team Member',
};

// Icon per object type
const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  program:           GraduationCap,
  cohort:            Users,
  sprint:            Calendar,
  module:            Layers,
  lesson:            BookOpen,
  assessment:        FileText,
  'penny-capability':Brain,
  'knowledge-source':BookOpen,
  'knowledge-article':FileText,
  standard:          Shield,
  'program-blueprint':Shield,
  'prompt-template': FileText,
  person:            Users,
  role:              Users,
  'slack-channel':   Network,
  integration:       Network,
};

// ── Health dot ────────────────────────────────────────────────────────────────
function HealthDot({ health, size = 'sm' }: { health?: string; size?: 'sm' | 'md' }) {
  const sz  = size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5';
  const cls =
    health === 'healthy'         ? 'bg-[#2F6B3F]' :
    health === 'needs-attention' ? 'bg-[#CC8400]'  :
    health === 'incomplete'      ? 'bg-[#A93F2F]'  : 'bg-muted-foreground/25';
  return <span className={`inline-block rounded-full shrink-0 ${sz} ${cls}`} />;
}

// ── Type badge ────────────────────────────────────────────────────────────────
function TypeBadge({ entry, friendly }: { entry: SearchEntry; friendly?: boolean }) {
  const label = friendly ? (FRIENDLY_LABEL[entry.objectTypeId] ?? entry.objectTypeName) : entry.objectTypeName;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[12px] font-bold border leading-none ${entry.categoryBg} ${entry.categoryColor}`}>
      {label}
    </span>
  );
}

// ── Everyday quick-access tiles ───────────────────────────────────────────────
const EVERYDAY_TILES = [
  { icon: GraduationCap, label: 'My programs',    q: 'foundations',  hint: "Active programs you're enrolled in" },
  { icon: Users,         label: 'My coach',        q: 'coach',        hint: 'Find your assigned coach' },
  { icon: Calendar,      label: 'Current sprint',  q: 'sprint 3',     hint: "Active sprint and this week's sessions" },
  { icon: BookOpen,      label: 'Resume workshop', q: 'resume',       hint: 'Access resume writing materials' },
  { icon: FileText,      label: 'Assessments',     q: 'assessment',   hint: 'Your upcoming and completed assessments' },
  { icon: Brain,         label: TERMS.aiAssistant, q: 'penny',        hint: `Ask ${TERMS.aiAssistant} a question` },
];

// ── Power quick-access tiles ──────────────────────────────────────────────────
const POWER_TILES = [
  { icon: Activity,       label: 'At-risk learners',      q: 'at-risk',       hint: 'Learners flagged for intervention' },
  { icon: Brain,          label: 'Penny capabilities',    q: 'penny',         hint: 'All active AI capabilities' },
  { icon: BookOpen,       label: 'Knowledge sources',     q: 'knowledge',     hint: 'Browse trusted knowledge sources' },
  { icon: Shield,         label: 'Standards',             q: 'standard',      hint: 'Program and content standards' },
  { icon: GraduationCap,  label: 'Active programs',       q: 'foundations',   hint: 'Programs currently in delivery' },
  { icon: Clock,          label: 'Recent assessments',    q: 'assessment',    hint: 'Latest assessment results' },
];

// ── Admin quick-access tiles ──────────────────────────────────────────────────
const ADMIN_TILES = [
  { icon: Network,        label: 'Relationship paths',    q: 'foundations trail', hint: 'Explore object relationships' },
  { icon: Activity,       label: 'Health alerts',         q: 'needs-attention', hint: 'Objects flagged for review' },
  { icon: Brain,          label: 'Penny governance',      q: 'penny blueprint', hint: 'Capability compliance status' },
  { icon: Shield,         label: 'Blueprints',            q: 'blueprint',     hint: 'Program and module blueprints' },
  { icon: Users,          label: 'Roles & people',        q: 'coach',         hint: 'Active roles and team members' },
  { icon: BookOpen,       label: 'Knowledge audit',       q: 'linkedin',      hint: 'Sources flagged for trust review' },
];

// ── Empty state (tier-aware) ──────────────────────────────────────────────────
function EmptyState({
  onQuery, isEveryday, isPowerOrAbove, isAdminOrAbove,
}: {
  onQuery: (q: string) => void;
  isEveryday: boolean;
  isPowerOrAbove: boolean;
  isAdminOrAbove: boolean;
}) {
  const tiles = isEveryday ? EVERYDAY_TILES : isAdminOrAbove ? ADMIN_TILES : POWER_TILES;
  const heading = isEveryday
    ? 'Find your programs and team'
    : isAdminOrAbove
    ? 'Search any Trail OS object'
    : `Search programs, knowledge, and ${TERMS.aiAssistant}`;
  const sub = isEveryday
    ? 'Search programs, workshops, team members, and learning materials.'
    : isAdminOrAbove
    ? 'All object types visible — results are scoped to your account permissions.'
    : 'Your accessible programs, knowledge sources, and Penny capabilities.';

  return (
    <div className="max-w-xl mx-auto pt-8 px-4 pb-12">
      <p className="text-[14px] font-semibold text-foreground mb-1">{heading}</p>
      <p className="text-[14px] text-muted-foreground mb-6">{sub}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {tiles.map(tile => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.q}
              onClick={() => onQuery(tile.q)}
              className="flex items-start gap-2.5 px-3 py-3 rounded-xl border border-border bg-white hover:bg-muted/30 hover:border-foreground/20 transition-all text-left group"
            >
              <Icon className="w-4 h-4 text-primary/50 shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{tile.label}</p>
                <p className="text-[12px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{tile.hint}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Inline result card (expanded) ─────────────────────────────────────────────
function ExpandedCard({
  entry, isEveryday, isAdminOrAbove, onClose, onNavigate, onSetContext,
}: {
  entry: SearchEntry;
  isEveryday: boolean;
  isAdminOrAbove: boolean;
  onClose: () => void;
  onNavigate: (link: string) => void;
  onSetContext: (e: SearchEntry) => void;
}) {
  const { setAskPennyOpen, setPendingPennyQuery, setCalendarPanelOpen } = useAppContext();
  const friendlyType = isEveryday
    ? (FRIENDLY_LABEL[entry.objectTypeId] ?? entry.objectTypeName)
    : entry.objectTypeName;
  const Icon = TYPE_ICON[entry.objectTypeId] ?? FileText;

  function askPenny() {
    const q = `Tell me about "${entry.name}" (${friendlyType}) in Trail OS. Status: ${entry.status}. ${entry.description}`;
    setCalendarPanelOpen(false);
    setAskPennyOpen(true);
    setPendingPennyQuery(q);
  }

  return (
    <div className="mt-1 mb-2 mx-0 rounded-xl border border-primary/25 ring-1 ring-primary/10 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 bg-muted/10 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-primary/60" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <TypeBadge entry={entry} friendly={isEveryday} />
            {entry.status && (
              <span className="text-[12px] text-muted-foreground">{entry.status}</span>
            )}
            <HealthDot health={entry.health} size="md" />
            {!isEveryday && entry.health && (
              <span className="text-[12px] text-muted-foreground capitalize">{entry.health.replace('-', ' ')}</span>
            )}
          </div>
          <h3 className="text-[14px] font-semibold text-foreground leading-snug">{entry.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Description */}
        <p className="text-[13px] text-muted-foreground leading-relaxed">{entry.description}</p>

        {/* Metadata row — power/admin only */}
        {!isEveryday && (
          <div className="flex items-center gap-3 flex-wrap text-[12px] text-muted-foreground">
            {entry.owner && (
              <span>Owner: <strong className="text-foreground">{entry.owner}</strong></span>
            )}
            {entry.sourceOfTruth && (
              <span>Source: <strong className="text-foreground">{entry.sourceOfTruth}</strong></span>
            )}
            {isAdminOrAbove && entry.confidence && (
              <span className={`font-semibold ${entry.confidence >= 85 ? 'text-[#2F6B3F]' : entry.confidence >= 70 ? 'text-[#CC8400]' : 'text-[#A93F2F]'}`}>
                {entry.confidence}% confidence
              </span>
            )}
          </div>
        )}

        {/* Relationships — admin only, compact */}
        {isAdminOrAbove && entry.relationships.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] font-semibold text-muted-foreground/50 shrink-0">Links:</span>
            {entry.relationships.slice(0, 4).map((r, i) => (
              <span
                key={i}
                className={`text-[12px] font-medium px-1.5 py-0.5 rounded border ${
                  r.direction === 'up'
                    ? 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]'
                    : 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]'
                }`}
              >
                {r.direction === 'up' ? '↑' : '↓'} {r.name}
              </span>
            ))}
            {entry.relationships.length > 4 && (
              <span className="text-[12px] text-muted-foreground/50">+{entry.relationships.length - 4} more</span>
            )}
          </div>
        )}

        {/* Tags — admin/power only */}
        {!isEveryday && entry.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {entry.tags.slice(0, 6).map(t => (
              <span key={t} className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-2.5 border-t border-border/40 bg-muted/5 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onNavigate(entry.workspaceLink)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
        >
          Open <ArrowRight className="w-3 h-3" />
        </button>
        <button
          onClick={askPenny}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[13px] font-semibold hover:bg-primary/10 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          Ask {TERMS.aiAssistant}
        </button>
        {!isEveryday && (
          <button
            onClick={() => onSetContext(entry)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Set as context
          </button>
        )}
      </div>
    </div>
  );
}

// ── Result row ────────────────────────────────────────────────────────────────
function ResultRow({
  entry, expanded, onToggle, isEveryday, isAdminOrAbove, onNavigate, onSetContext,
}: {
  entry: SearchEntry;
  expanded: boolean;
  onToggle: () => void;
  isEveryday: boolean;
  isAdminOrAbove: boolean;
  onNavigate: (link: string) => void;
  onSetContext: (e: SearchEntry) => void;
}) {
  const Icon = TYPE_ICON[entry.objectTypeId] ?? FileText;
  const friendlyType = isEveryday
    ? (FRIENDLY_LABEL[entry.objectTypeId] ?? entry.objectTypeName)
    : entry.objectTypeName;

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border/30 transition-colors group ${
          expanded ? 'bg-primary/4' : 'hover:bg-muted/25'
        }`}
      >
        {/* Icon */}
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
          expanded ? 'bg-primary/12' : 'bg-muted/40 group-hover:bg-muted/70'
        }`}>
          <Icon className={`w-3.5 h-3.5 ${expanded ? 'text-primary' : 'text-muted-foreground/50'}`} />
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[14px] font-semibold truncate ${expanded ? 'text-primary' : 'text-foreground'}`}>
              {entry.name}
            </span>
            <HealthDot health={entry.health} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded border leading-none ${entry.categoryBg} ${entry.categoryColor}`}>
              {friendlyType}
            </span>
            {entry.status && (
              <span className="text-[12px] text-muted-foreground">{entry.status}</span>
            )}
            {!isEveryday && entry.owner && (
              <span className="text-[12px] text-muted-foreground/60 truncate hidden sm:inline">{entry.owner}</span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/40 shrink-0 transition-transform ${expanded ? 'rotate-180 text-primary/50' : ''}`} />
      </button>

      {/* Inline expanded detail */}
      {expanded && (
        <div className="px-4 pb-2">
          <ExpandedCard
            entry={entry}
            isEveryday={isEveryday}
            isAdminOrAbove={isAdminOrAbove}
            onClose={onToggle}
            onNavigate={onNavigate}
            onSetContext={onSetContext}
          />
        </div>
      )}
    </div>
  );
}

// ── Filter chip row ───────────────────────────────────────────────────────────
interface FilterChip { id: string; label: string; types: string[] | null }

function FilterChips({
  chips, activeId, onSelect, results,
}: {
  chips: FilterChip[];
  activeId: string;
  onSelect: (id: string) => void;
  results: SearchEntry[];
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0">
      {chips.map(c => {
        const count = c.types
          ? results.filter(e => (c.types as string[]).includes(e.objectTypeId)).length
          : results.length;
        const active = activeId === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors ${
              active
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground bg-background hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            {c.label}
            {c.id !== 'all' && (
              <span className={`text-[12px] leading-none ${active ? 'opacity-60' : 'text-muted-foreground/50'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Filter definitions per tier ───────────────────────────────────────────────
const EVERYDAY_CHIPS: FilterChip[] = [
  { id: 'all',      label: 'All',       types: null },
  { id: 'programs', label: 'Programs',  types: ['program', 'cohort', 'sprint'] },
  { id: 'learning', label: 'Learning',  types: ['lesson', 'assessment'] },
  { id: 'people',   label: 'People',    types: ['person'] },
];

const POWER_CHIPS: FilterChip[] = [
  { id: 'all',       label: 'All',       types: null },
  { id: 'programs',  label: 'Programs',  types: ['program', 'cohort', 'sprint', 'module'] },
  { id: 'penny',     label: TERMS.aiAssistant, types: ['penny-capability', 'prompt-template'] },
  { id: 'knowledge', label: 'Knowledge', types: ['knowledge-source', 'knowledge-article', 'standard', 'program-blueprint'] },
  { id: 'people',    label: 'People',    types: ['person', 'role'] },
];

// Admin chips are derived dynamically from results

// ── Main component ────────────────────────────────────────────────────────────
export default function GlobalSearch() {
  const [query,       setQuery      ] = useState('');
  const [expandedId,  setExpandedId ] = useState<string | null>(null);
  const [filterChip,  setFilterChip ] = useState('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'resume review', 'cohort 2', 'foundations trail',
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const { setActiveContext, setAskPennyOpen, setCalendarPanelOpen, setPendingPennyQuery } = useAppContext();
  const { isEveryday, isPowerOrAbove, isAdminOrAbove } = useTierFlags();
  const [, setLocation] = useLocation();

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Tier-gated index
  const visibleIndex = useMemo(() => {
    if (isAdminOrAbove) return SEARCH_INDEX;
    if (isPowerOrAbove) return SEARCH_INDEX.filter(e => POWER_TYPES.has(e.objectTypeId));
    return SEARCH_INDEX.filter(e => EVERYDAY_TYPES.has(e.objectTypeId));
  }, [isEveryday, isPowerOrAbove, isAdminOrAbove]);

  // Build admin chips dynamically from visible types
  const adminChips: FilterChip[] = useMemo(() => {
    if (!isAdminOrAbove) return [];
    const types = Array.from(new Set(SEARCH_INDEX.map(e => e.objectTypeName)));
    return [
      { id: 'all', label: 'All', types: null },
      ...types.map(t => ({ id: t, label: t, types: [SEARCH_INDEX.find(e => e.objectTypeName === t)?.objectTypeId ?? t] })),
    ];
  }, [isAdminOrAbove]);

  const chips = isEveryday ? EVERYDAY_CHIPS : isAdminOrAbove ? adminChips : POWER_CHIPS;

  // Search results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? visibleIndex.filter(e =>
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.tags.some(t => t.toLowerCase().includes(q)) ||
          e.objectTypeName.toLowerCase().includes(q)
        )
      : visibleIndex;

    const chip = chips.find(c => c.id === filterChip);
    if (chip?.types) return base.filter(e => (chip.types as string[]).includes(e.objectTypeId));
    return base;
  }, [query, visibleIndex, filterChip, chips]);

  const grouped = useMemo(() => groupByObjectType(results), [results]);

  function handleQuery(q: string) {
    setQuery(q);
    setExpandedId(null);
    setFilterChip('all');
  }

  function clearSearch() {
    setQuery('');
    setExpandedId(null);
    setFilterChip('all');
    inputRef.current?.focus();
  }

  function handleNavigate(link: string) {
    setLocation(link);
  }

  function handleSetContext(entry: SearchEntry) {
    setActiveContext({
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
    });
  }

  function toggleExpanded(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  const placeholder = isEveryday
    ? 'Search programs, workshops, team members…'
    : isPowerOrAbove && !isAdminOrAbove
    ? `Search programs, ${TERMS.aiAssistant} capabilities, knowledge…`
    : 'Search programs, knowledge, people, integrations…';

  const hasQuery = query.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-border shrink-0">

        {/* Input */}
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { handleQuery(e.target.value); }}
            onKeyDown={e => {
              if (e.key === 'Escape') clearSearch();
              if (e.key === 'Enter' && hasQuery && !recentSearches.includes(query.trim())) {
                setRecentSearches(prev => [query.trim(), ...prev].slice(0, 5));
              }
            }}
            placeholder={placeholder}
            className="w-full text-[15px] border-2 border-border rounded-xl pl-10 pr-10 py-3 bg-white focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground/35 transition-all shadow-sm"
          />
          {hasQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors p-0.5 rounded"
              aria-label="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Below search bar: either result count + filters, or recent searches */}
        {hasQuery ? (
          <div className="mt-3 flex items-center gap-3 flex-wrap max-w-2xl">
            <span className="text-[13px] text-muted-foreground/60 shrink-0">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
            <div className="flex-1 min-w-0">
              <FilterChips
                chips={chips}
                activeId={filterChip}
                onSelect={id => { setFilterChip(id); setExpandedId(null); }}
                results={visibleIndex.filter(e => {
                  const q = query.trim().toLowerCase();
                  return e.name.toLowerCase().includes(q) ||
                    e.description.toLowerCase().includes(q) ||
                    e.tags.some(t => t.toLowerCase().includes(q));
                })}
              />
            </div>
          </div>
        ) : (
          recentSearches.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap max-w-2xl">
              <span className="text-[12px] font-bold text-muted-foreground/40 shrink-0 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Recent
              </span>
              {recentSearches.map(r => (
                <button
                  key={r}
                  onClick={() => handleQuery(r)}
                  className="text-[13px] px-2.5 py-0.5 rounded-full border border-border bg-white text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Results / Empty state ────────────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        {!hasQuery ? (
          /* Empty state — quick-access tiles */
          <EmptyState
            onQuery={handleQuery}
            isEveryday={isEveryday}
            isPowerOrAbove={isPowerOrAbove}
            isAdminOrAbove={isAdminOrAbove}
          />
        ) : results.length === 0 ? (
          /* No results */
          <div className="py-16 text-center max-w-xs mx-auto">
            <SearchIcon className="w-8 h-8 mx-auto text-muted-foreground/15 mb-3" />
            <p className="text-[14px] font-semibold text-foreground mb-1">No results for "{query}"</p>
            <p className="text-[14px] text-muted-foreground mb-4">
              {isEveryday
                ? 'Try searching for a program name, workshop, or your coach.'
                : 'Try a different term or adjust the filter above.'}
            </p>
            <button
              onClick={clearSearch}
              className="text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
          /* Grouped results */
          <div className="divide-y divide-border/30">
            {Array.from(grouped.entries()).map(([typeName, entries]) => (
              <div key={typeName}>
                {/* Type group header */}
                <div className="px-4 py-2 bg-muted/15 border-b border-border/30 flex items-center gap-2 sticky top-0 z-10">
                  <span className="text-[12px] font-bold text-muted-foreground/50 uppercase tracking-wide">
                    {isEveryday ? (FRIENDLY_LABEL[entries[0].objectTypeId] ?? typeName) : typeName}
                  </span>
                  <span className="text-[12px] text-muted-foreground/40">{entries.length}</span>
                </div>

                {/* Rows */}
                {entries.map(entry => (
                  <ResultRow
                    key={entry.id}
                    entry={entry}
                    expanded={expandedId === entry.id}
                    onToggle={() => toggleExpanded(entry.id)}
                    isEveryday={isEveryday}
                    isAdminOrAbove={isAdminOrAbove}
                    onNavigate={handleNavigate}
                    onSetContext={handleSetContext}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

    </div>
  );
}
