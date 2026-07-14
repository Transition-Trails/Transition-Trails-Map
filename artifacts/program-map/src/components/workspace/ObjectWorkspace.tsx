// Shared object workspace pattern — left list + right detail + tabs
// Used by Program, Penny, Knowledge, People, and Collaboration workspaces.
import { useState, useMemo } from 'react';
import type { ComponentType } from 'react';
import { Search as SearchIcon } from 'lucide-react';

export type WorkspaceHealth = 'healthy' | 'needs-attention' | 'incomplete' | 'unknown';

export interface WorkspaceItem {
  id: string;
  name: string;
  typeName?: string;
  typeColor?: string;
  typeBg?: string;
  status?: string;
  statusVariant?: 'active' | 'inactive' | 'draft' | 'planning';
  health?: WorkspaceHealth;
  secondary?: string;
  confidence?: number;
  owner?: string;
}

export interface WorkspaceTab {
  id: string;
  label: string;
  render: (item: WorkspaceItem) => React.ReactNode;
}

export function HealthDot({ health }: { health?: WorkspaceHealth }) {
  const cls =
    health === 'healthy'          ? 'bg-emerald-500' :
    health === 'needs-attention'  ? 'bg-amber-500'   :
    health === 'incomplete'       ? 'bg-rose-500'    : 'bg-gray-300';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${cls}`} />;
}

export function StatusBadge({ status, variant }: { status?: string; variant?: string }) {
  if (!status) return null;
  const cls =
    variant === 'active'   ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    variant === 'inactive' ? 'bg-slate-50 text-slate-500 border-slate-200'       :
    variant === 'draft'    ? 'bg-sky-50 text-sky-700 border-sky-200'             :
    variant === 'planning' ? 'bg-indigo-50 text-indigo-700 border-indigo-200'    :
                             'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${cls}`}>
      {status}
    </span>
  );
}

export function ConfidencePill({ value }: { value?: number }) {
  if (value === undefined) return null;
  const cls = value >= 85 ? 'text-emerald-600' : value >= 70 ? 'text-amber-600' : 'text-rose-600';
  return <span className={`text-[10px] font-bold tabular-nums ${cls}`}>{value}%</span>;
}

export function ObjectWorkspace({
  icon: Icon,
  items,
  tabs,
  defaultTabId,
  emptyTitle = 'Select an object',
  emptyBody  = 'Choose an item from the list to view its workspace.',
}: {
  icon: ComponentType<{ className?: string }>;
  items: WorkspaceItem[];
  tabs: WorkspaceTab[];
  defaultTabId?: string;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const [selectedId, setSelectedId]   = useState<string | null>(items[0]?.id ?? null);
  const [activeTabId, setActiveTabId] = useState<string>(defaultTabId ?? tabs[0]?.id ?? '');
  const [query, setQuery]             = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.typeName ?? '').toLowerCase().includes(q) ||
      (i.secondary ?? '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const selected  = items.find(i => i.id === selectedId) ?? null;
  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];

  return (
    <div className="flex h-full overflow-hidden bg-background">

      {/* ── Left: Object List ────────────────────────────────────────────── */}
      <div className="w-[248px] flex-shrink-0 flex flex-col border-r border-border bg-card">
        {/* Search */}
        <div className="px-3 py-2.5 border-b border-border/60 bg-background/60">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter objects…"
              className="w-full text-[11px] border border-border rounded-md pl-7 pr-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40"
            />
          </div>
          <p className="text-[9px] text-muted-foreground/50 mt-1.5 font-medium">
            {filtered.length} object{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-[11px] text-muted-foreground text-center">No results</div>
          ) : (
            filtered.map(item => {
              const isActive = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setSelectedId(item.id); setActiveTabId(defaultTabId ?? tabs[0]?.id ?? ''); }}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted/40 text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-0.5">
                    <span className={`text-[12px] font-semibold leading-snug truncate ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.health && <HealthDot health={item.health} />}
                      {item.confidence !== undefined && (
                        <span className={`text-[9px] font-bold tabular-nums ${isActive ? 'text-primary-foreground/80' : item.confidence >= 85 ? 'text-emerald-600' : item.confidence >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {item.confidence}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.typeName && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                        isActive ? 'bg-primary-foreground/10 text-primary-foreground/80 border-primary-foreground/20' : (item.typeBg ?? 'bg-muted') + ' ' + (item.typeColor ?? 'text-muted-foreground') + ' border-border'
                      }`}>
                        {item.typeName}
                      </span>
                    )}
                    {item.status && (
                      <span className={`text-[9px] ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {item.status}
                      </span>
                    )}
                  </div>
                  {item.secondary && (
                    <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {item.secondary}
                    </p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Detail workspace ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Object header */}
            <div className="px-5 pt-4 pb-0 border-b border-border bg-background/80 shrink-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-bold text-foreground leading-tight truncate">
                      {selected.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {selected.typeName && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${selected.typeBg ?? 'bg-muted'} ${selected.typeColor ?? 'text-muted-foreground'} border-border`}>
                          {selected.typeName}
                        </span>
                      )}
                      {selected.status && (
                        <StatusBadge status={selected.status} variant={selected.statusVariant} />
                      )}
                      {selected.health && (
                        <>
                          <HealthDot health={selected.health} />
                          <span className="text-[10px] text-muted-foreground">{selected.health.replace('-', ' ')}</span>
                        </>
                      )}
                      {selected.confidence !== undefined && (
                        <span className="text-[10px] text-muted-foreground">· <ConfidencePill value={selected.confidence} /></span>
                      )}
                    </div>
                  </div>
                </div>
                {selected.owner && (
                  <div className="shrink-0 text-right">
                    <p className="text-[9px] font-bold uppercase text-muted-foreground/50">Owner</p>
                    <p className="text-[11px] text-foreground font-medium">{selected.owner}</p>
                  </div>
                )}
              </div>

              {/* Tab bar */}
              <div className="flex gap-0 overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`px-3 py-2 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-colors focus-visible:outline-none ${
                      activeTab?.id === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {activeTab?.render(selected)}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Icon className="w-8 h-8 text-primary/30" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">{emptyTitle}</p>
            <p className="text-xs max-w-xs">{emptyBody}</p>
          </div>
        )}
      </div>
    </div>
  );
}
