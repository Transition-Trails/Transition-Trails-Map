import { useState } from 'react';
import { sourceDocuments } from '@/data/sourceDocuments';
import { useAppContext } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Layers } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SourceDocs() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { setSelectedItem, selectedItem, openSlackPanel } = useAppContext();

  const statuses = ['All', 'Active', 'Draft', 'Deprecated', 'Archived'];

  const filteredDocs = sourceDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRowClick = (doc: any) => {
    setSelectedItem({ type: 'document', id: doc.id, data: doc });
  };

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden">
      <div className="p-6 border-b shrink-0">
        <h1 className="text-3xl font-serif font-bold mb-4">Source Documents</h1>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search documents..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex flex-wrap gap-2">
              {statuses.map(status => (
                <Badge
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                </Badge>
              ))}
            </div>
            <button
              onClick={() => openSlackPanel({ context: 'knowledge', title: 'Knowledge Library', subtitle: 'Slack, Drive, and workspace signals for the Knowledge Library.' })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-muted-foreground bg-white border border-border/70 hover:text-foreground hover:border-border transition-colors whitespace-nowrap ml-auto"
            >
              <Layers className="w-3 h-3" />
              Workspace Signals
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="w-full min-w-[800px]">
            <div className="grid grid-cols-[50px_2fr_1fr_100px_1fr_1fr_2fr] gap-4 p-4 border-b bg-card sticky top-0 z-10 font-semibold text-sm text-muted-foreground">
              <div>#</div>
              <div>Document Name</div>
              <div>Category</div>
              <div>Status</div>
              <div>Owner</div>
              <div>Last Updated</div>
              <div>Programs</div>
            </div>
            
            <div className="divide-y divide-border/50">
              {filteredDocs.map(doc => (
                <div 
                  key={doc.id}
                  onClick={() => handleRowClick(doc)}
                  className={`grid grid-cols-[50px_2fr_1fr_100px_1fr_1fr_2fr] gap-4 p-4 items-center text-sm transition-colors cursor-pointer hover:bg-muted/30 ${
                    selectedItem?.type === 'document' && selectedItem.id === doc.id ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="text-muted-foreground">{doc.id}</div>
                  <div className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    {doc.name}
                  </div>
                  <div><Badge variant="outline" className="text-xs font-normal bg-white">{doc.category}</Badge></div>
                  <div>
                    <Badge variant={
                      doc.status === 'Active' ? 'default' : 
                      doc.status === 'Draft' ? 'secondary' : 'outline'
                    } className={`text-[10px] ${doc.status === 'Active' ? 'bg-primary text-primary-foreground' : doc.status === 'Draft' ? 'bg-accent text-accent-foreground' : ''}`}>
                      {doc.status}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">{doc.owner}</div>
                  <div className="text-muted-foreground">{doc.lastUpdated}</div>
                  <div className="text-muted-foreground line-clamp-1">{doc.programs.join(', ')}</div>
                </div>
              ))}
              
              {filteredDocs.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No documents found matching your criteria.
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
