import { useState } from 'react';
import { sourceDocuments } from '@/data/sourceDocuments';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import { Search, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const STATUS_COLORS: Record<string, string> = {
  Active:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  Draft:      'bg-sky-50 text-sky-700 border-sky-200',
  Deprecated: 'bg-amber-50 text-amber-700 border-amber-200',
  Archived:   'bg-muted text-muted-foreground border-border',
};

export default function SourceDocs() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { setSelectedItem, selectedItem } = useAppContext();
  const { isEveryday } = useTierFlags();

  const statuses = ['All', 'Active', 'Draft', 'Deprecated', 'Archived'];

  const filteredDocs = sourceDocuments.filter(doc => {
    const matchesSearch  = doc.name.toLowerCase().includes(search.toLowerCase()) ||
                           doc.category?.toLowerCase().includes(search.toLowerCase()) ||
                           doc.programs?.some(p => p.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus  = statusFilter === 'All' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">

      {/* ── Compact toolbar ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b bg-card flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            placeholder={isEveryday ? 'Search documents…' : 'Search by name, category, program…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1 text-[12px] rounded-md border border-border/70 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 h-7"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white text-muted-foreground border-border/70 hover:text-foreground hover:border-border'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Result count */}
        <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap ml-auto hidden sm:block">
          {filteredDocs.length} {filteredDocs.length === 1 ? 'doc' : 'docs'}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="w-full min-w-[640px]">

            {/* Header row */}
            <div className="grid grid-cols-[40px_2fr_1fr_90px_1fr_1fr] gap-3 px-3 py-2 border-b bg-muted/40 sticky top-0 z-10">
              {['#', 'Document', 'Category', 'Status', 'Owner', 'Updated'].map(h => (
                <div key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/40">
              {filteredDocs.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedItem({ type: 'document', id: doc.id, data: doc })}
                  className={`grid grid-cols-[40px_2fr_1fr_90px_1fr_1fr] gap-3 px-3 py-2 items-center cursor-pointer transition-colors hover:bg-muted/30 ${
                    selectedItem?.type === 'document' && selectedItem.id === doc.id ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="text-[10px] text-muted-foreground/50 font-mono">{doc.id}</div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="text-[12px] font-medium text-foreground truncate">{doc.name}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{doc.category}</div>
                  <div>
                    <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${STATUS_COLORS[doc.status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                      {doc.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{doc.owner}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{doc.lastUpdated}</div>
                </div>
              ))}

              {filteredDocs.length === 0 && (
                <div className="px-3 py-10 text-center text-[12px] text-muted-foreground">
                  No documents match your search.
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
