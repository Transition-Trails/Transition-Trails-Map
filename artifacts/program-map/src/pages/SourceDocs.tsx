import { useState } from 'react';
import { sourceDocuments } from '@/data/sourceDocuments';
import { useAppContext } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function SourceDocs() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const { setSelectedItem, selectedItem } = useAppContext();

  const statuses = ['All', 'Active', 'Draft', 'Deprecated', 'Archived'];

  const filteredDocs = sourceDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRowClick = (doc: any) => {
    setSelectedItem({ type: 'document', id: doc.id, data: doc });
    setSelectedDoc(doc);
    setDrawerOpen(true);
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

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          {selectedDoc && (
            <div className="space-y-6 mt-6">
              <SheetHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={
                    selectedDoc.status === 'Active' ? 'default' : 
                    selectedDoc.status === 'Draft' ? 'secondary' : 'outline'
                  } className={`text-[10px] ${selectedDoc.status === 'Active' ? 'bg-primary text-primary-foreground' : selectedDoc.status === 'Draft' ? 'bg-accent text-accent-foreground' : ''}`}>
                    {selectedDoc.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{selectedDoc.category}</span>
                </div>
                <SheetTitle className="text-3xl font-serif text-foreground leading-tight">
                  {selectedDoc.name}
                </SheetTitle>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/50">
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Owner</span>
                  <span className="text-sm font-medium">{selectedDoc.owner}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Last Updated</span>
                  <span className="text-sm text-muted-foreground">{selectedDoc.lastUpdated}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Programs Affected</span>
                <div className="flex flex-wrap gap-1">
                  {selectedDoc.programs?.map((p: string) => (
                    <Badge key={p} variant="secondary">{p}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Description</span>
                <p className="text-sm text-foreground leading-relaxed">
                  This document serves as the primary governance artifact for {selectedDoc.name.toLowerCase()}. 
                  It details the strategic alignment, operational requirements, and intended outcomes for the associated programs.
                </p>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Key Sections</span>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>Executive Summary & Objectives</li>
                  <li>Target Audience & Persona Maps</li>
                  <li>Curriculum Framework & Pedagogy</li>
                  <li>Operational Dependencies</li>
                  <li>Evaluation & Outcomes Metrics</li>
                </ul>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Related Documents</span>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-white">Master Program Overview</Badge>
                  <Badge variant="outline" className="bg-white">Brand Book</Badge>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-border/50">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button className="w-full gap-2" disabled>
                        <Download className="w-4 h-4" />
                        Download Document
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Document management coming soon</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
