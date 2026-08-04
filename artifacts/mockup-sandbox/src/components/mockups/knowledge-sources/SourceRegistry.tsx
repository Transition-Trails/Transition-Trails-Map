import React, { useState } from "react";
import { 
  Search, Plus, FolderOpen, Database, Link as LinkIcon, Edit, X, ChevronDown
} from "lucide-react";

type Source = {
  id: string;
  name: string;
  type: "Google Drive" | "SF Knowledge Base" | "Custom Link";
  trust: "Authoritative" | "Trusted" | "Curated" | "Unverified";
  sync: "Live" | "Manual" | "Disconnected" | "Planned/Future";
  penny: boolean;
  owner: string;
  health: "healthy" | "needs-attention" | "incomplete";
};

const sources: Source[] = [
  { id: "1", name: "Guided Trail Blueprint", type: "Google Drive", trust: "Authoritative", sync: "Live", penny: true, owner: "Program Director", health: "healthy" },
  { id: "2", name: "Salesforce Knowledge Articles", type: "SF Knowledge Base", trust: "Trusted", sync: "Live", penny: true, owner: "Ops Team", health: "healthy" },
  { id: "3", name: "LinkedIn Job Market Insights", type: "Custom Link", trust: "Curated", sync: "Manual", penny: true, owner: "Career Coach", health: "needs-attention" },
  { id: "4", name: "Resume Writing Standards", type: "Google Drive", trust: "Trusted", sync: "Manual", penny: false, owner: "Program Director", health: "needs-attention" },
  { id: "5", name: "Coaching Protocol Library", type: "Google Drive", trust: "Authoritative", sync: "Live", penny: true, owner: "Penny Admin", health: "healthy" },
  { id: "6", name: "SF Cases & Client Feedback", type: "SF Knowledge Base", trust: "Curated", sync: "Disconnected", penny: false, owner: "Ops Team", health: "incomplete" },
];

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-4 rounded-lg border bg-card shadow-sm">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Tab({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <button className={`py-3 text-sm font-medium border-b-2 transition-colors ${active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'}`}>
      {children}
    </button>
  );
}

function CollapsibleSection({ title, defaultOpen, children }: { title: string; defaultOpen: boolean; children?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
       <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors focus:outline-none">
          <span className="text-sm font-semibold">{title}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
       </button>
       {isOpen && (
          <div className="p-4 border-t">
             {children || <div className="text-[11px] text-muted-foreground">Section content...</div>}
          </div>
       )}
    </div>
  );
}

export function SourceRegistry() {
  const [isDrawerOpen, setDrawerOpen] = useState(true);

  return (
    <div 
      className="min-h-screen bg-background font-sans text-foreground flex flex-col relative" 
      style={{ '--primary': '160 60% 25%', '--primary-foreground': '0 0% 100%' } as React.CSSProperties}
    >
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between bg-card shadow-sm z-10 relative">
        <div>
          <h1 className="text-base font-semibold">Knowledge Sources</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Manage data repositories connected to Trail OS and Penny's retrieval engine.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search sources..." className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm" />
          </div>
          <button className="h-9 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            New Source
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Stat strip */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Total Sources" value="6" />
          <StatCard title="Drive Sources" value="3" />
          <StatCard title="SF KB" value="2" />
          <StatCard title="Penny-Enabled" value="4" />
        </div>

        {/* Tabs & Table Container */}
        <div className="bg-card border rounded-lg shadow-sm flex flex-col">
          <div className="border-b px-4 flex items-center gap-6">
            <Tab active>All Sources</Tab>
            <Tab>Drive</Tab>
            <Tab>Salesforce KB</Tab>
            <Tab>Links</Tab>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase text-muted-foreground bg-muted/40 font-semibold tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-lg">Name & Type</th>
                  <th className="px-4 py-3 font-medium">Trust Level</th>
                  <th className="px-4 py-3 font-medium">Sync Status</th>
                  <th className="px-4 py-3 font-medium">Penny</th>
                  <th className="px-4 py-3 font-medium">Health</th>
                  <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sources.map(source => (
                   <tr key={source.id} className="group hover:bg-muted/30 transition-colors h-14">
                      <td className="px-4 py-2 w-[35%]">
                         <div className="flex items-start gap-3">
                            {source.type === "Google Drive" && <FolderOpen className="w-4 h-4 text-muted-foreground mt-0.5" />}
                            {source.type === "SF Knowledge Base" && <Database className="w-4 h-4 text-muted-foreground mt-0.5" />}
                            {source.type === "Custom Link" && <LinkIcon className="w-4 h-4 text-muted-foreground mt-0.5" />}
                            <div>
                               <div className="text-sm font-medium text-foreground">{source.name}</div>
                               <div className="text-[11px] text-muted-foreground">{source.type} • Owner: {source.owner}</div>
                            </div>
                         </div>
                      </td>
                      <td className="px-4 py-2">
                         <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                            ${source.trust === 'Authoritative' ? 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]' : ''}
                            ${source.trust === 'Trusted' ? 'text-[#2F6F7E] bg-[#EDF5F8] border-[#A2D3DF]' : ''}
                            ${source.trust === 'Curated' ? 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' : ''}
                            ${source.trust === 'Unverified' ? 'text-muted-foreground bg-muted border-border' : ''}
                         `}>
                           {source.trust}
                         </span>
                      </td>
                      <td className="px-4 py-2">
                         <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full 
                               ${source.sync === 'Live' ? 'bg-[#2F6B3F]' : ''}
                               ${source.sync === 'Manual' ? 'bg-[#CC8400]' : ''}
                               ${source.sync === 'Disconnected' ? 'bg-[#8B2A2A]' : ''}
                               ${source.sync === 'Planned/Future' ? 'bg-muted-foreground' : ''}
                            `} />
                            <span className="text-[13px]">{source.sync}</span>
                         </div>
                      </td>
                      <td className="px-4 py-2">
                         <button className={`w-8 h-4 rounded-full relative transition-colors focus:outline-none shadow-inner border border-transparent ${source.penny ? 'bg-[#2F6B3F]' : 'bg-muted-foreground/30'}`}>
                            <span className={`absolute top-[1px] left-[1px] bg-white w-3.5 h-3.5 rounded-full transition-transform shadow-sm ${source.penny ? 'translate-x-4' : 'translate-x-0'}`} />
                         </button>
                      </td>
                      <td className="px-4 py-2">
                         <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full 
                               ${source.health === 'healthy' ? 'bg-[#2F6B3F]' : ''}
                               ${source.health === 'needs-attention' ? 'bg-[#CC8400]' : ''}
                               ${source.health === 'incomplete' ? 'bg-[#8B2A2A]' : ''}
                            `} />
                            <span className="text-[11px] capitalize text-muted-foreground font-medium">{source.health.replace('-', ' ')}</span>
                         </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                         <button onClick={() => setDrawerOpen(true)} className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all">
                            <Edit className="w-4 h-4" />
                         </button>
                      </td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit Drawer Overlay */}
      {isDrawerOpen && (
        <div className="absolute inset-0 z-50 flex justify-end overflow-hidden">
          {/* Scrim */}
          <div className="absolute inset-0 bg-background/40 backdrop-blur-sm transition-opacity" onClick={() => setDrawerOpen(false)} />
          
          {/* Drawer */}
          <div className="w-[440px] bg-background h-full shadow-2xl border-l relative flex flex-col transform transition-transform animate-in slide-in-from-right-8 duration-300">
            <div className="flex items-start justify-between px-6 py-5 border-b bg-card">
              <div>
                <h2 className="text-base font-semibold leading-tight">Salesforce Knowledge Articles</h2>
                <div className="flex items-center gap-1.5 mt-1.5">
                   <Database className="w-3.5 h-3.5 text-muted-foreground" />
                   <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">SF Knowledge Base</span>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-md transition-colors">
                 <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               <CollapsibleSection title="Identity" defaultOpen={false}>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Source Name</label>
                       <input type="text" defaultValue="Salesforce Knowledge Articles" className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
               </CollapsibleSection>
               
               <CollapsibleSection title="Connection" defaultOpen={false}>
                  <div className="text-[11px] text-muted-foreground">Connection settings are managed by the integration layer.</div>
               </CollapsibleSection>
               
               <CollapsibleSection title="Governance" defaultOpen={false}>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Trust Level</label>
                       <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                          <option>Authoritative</option>
                          <option selected>Trusted</option>
                          <option>Curated</option>
                          <option>Unverified</option>
                       </select>
                    </div>
                  </div>
               </CollapsibleSection>
               
               <CollapsibleSection title="Penny Configuration" defaultOpen={true}>
                  <div className="space-y-5">
                     <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">Approved for Penny</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">Allow Penny to retrieve from this source</div>
                        </div>
                        <button className="w-9 h-5 rounded-full relative transition-colors focus:outline-none bg-[#2F6B3F] shadow-inner">
                           <span className="absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full transition-transform translate-x-4 shadow-sm" />
                        </button>
                     </div>
                     <div className="h-px bg-border w-full" />
                     <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Retrieval Role</label>
                        <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                           <option>General Knowledge</option>
                           <option selected>Standard Operating Procedures</option>
                           <option>Core Protocol</option>
                           <option>Coaching Examples</option>
                        </select>
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                          <span>Use Description</span>
                          <span className="font-normal text-muted-foreground/70">Required</span>
                        </label>
                        <textarea className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground resize-none" defaultValue="Contains standard operating procedures and knowledge articles for resolving client cases. Use when answering factual questions about Trail OS operations." />
                     </div>
                  </div>
               </CollapsibleSection>
            </div>

            <div className="p-4 border-t bg-card flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
               <button className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors" onClick={() => setDrawerOpen(false)}>Cancel</button>
               <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity shadow-sm">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
