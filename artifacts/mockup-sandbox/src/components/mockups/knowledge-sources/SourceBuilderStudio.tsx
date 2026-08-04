import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderOpen, Database, Link as LinkIcon, Check, Plus, X, Search } from "lucide-react";

type TrustLevel = 'Authoritative' | 'Trusted' | 'Curated' | 'Unverified';
type SyncStatus = 'Live' | 'Manual' | 'Disconnected' | 'Planned';
type HealthStatus = 'healthy' | 'needs-attention' | 'incomplete';
type SourceType = 'google_drive' | 'sf_knowledge' | 'custom_link';

interface Source {
  id: string;
  name: string;
  type: SourceType;
  trust: TrustLevel;
  sync: SyncStatus;
  pennyApproved: boolean;
  owner: string;
  health: HealthStatus;
  status: 'Complete' | 'Draft';
  draftStep?: string;
}

const MOCK_SOURCES: Source[] = [
  { id: '1', name: 'Guided Trail Blueprint', type: 'google_drive', trust: 'Authoritative', sync: 'Live', pennyApproved: true, owner: 'Program Director', health: 'healthy', status: 'Complete' },
  { id: '2', name: 'Salesforce Knowledge Articles', type: 'sf_knowledge', trust: 'Trusted', sync: 'Live', pennyApproved: true, owner: 'Ops Team', health: 'healthy', status: 'Complete' },
  { id: '3', name: 'LinkedIn Job Market Insights', type: 'custom_link', trust: 'Curated', sync: 'Manual', pennyApproved: true, owner: 'Career Coach', health: 'needs-attention', status: 'Complete' },
  { id: '4', name: 'Resume Writing Standards', type: 'google_drive', trust: 'Trusted', sync: 'Manual', pennyApproved: false, owner: 'Program Director', health: 'needs-attention', status: 'Complete' },
  { id: '5', name: 'Coaching Protocol Library', type: 'google_drive', trust: 'Authoritative', sync: 'Live', pennyApproved: true, owner: 'Penny Admin', health: 'healthy', status: 'Complete' },
  { id: '6', name: 'SF Cases & Client Feedback', type: 'sf_knowledge', trust: 'Curated', sync: 'Disconnected', pennyApproved: false, owner: 'Ops Team', health: 'incomplete', status: 'Complete' },
  { id: '7', name: 'Untitled Source', type: 'custom_link', trust: 'Unverified', sync: 'Planned', pennyApproved: false, owner: 'Penny Admin', health: 'incomplete', status: 'Draft', draftStep: 'Identity' },
];

const HEALTH_COLORS = {
  'healthy': 'bg-[#2F6B3F]',
  'needs-attention': 'bg-[#CC8400]',
  'incomplete': 'bg-[#8B2A2A]'
};

const STATUS_BADGE_COLORS = {
  'green': 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',
  'amber': 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',
  'blue': 'text-[#2F6F7E] bg-[#EDF5F8] border-[#B6D8E4]',
  'red': 'text-[#8B2A2A] bg-[#FAE6E6] border-[#F0BDBD]',
  'gray': 'text-muted-foreground bg-muted border-border'
};

const getTrustBadgeClass = (trust: TrustLevel) => {
  switch (trust) {
    case 'Authoritative': return STATUS_BADGE_COLORS.green;
    case 'Trusted': return STATUS_BADGE_COLORS.blue;
    case 'Curated': return STATUS_BADGE_COLORS.amber;
    default: return STATUS_BADGE_COLORS.gray;
  }
};

const getSyncDotClass = (sync: SyncStatus) => {
  switch (sync) {
    case 'Live': return 'bg-[#2F6B3F]';
    case 'Manual': return 'bg-[#CC8400]';
    case 'Disconnected': return 'bg-[#8B2A2A]';
    default: return 'bg-muted-foreground';
  }
};

const TypeIcon = ({ type, className }: { type: SourceType, className?: string }) => {
  switch (type) {
    case 'google_drive': return <FolderOpen className={className} />;
    case 'sf_knowledge': return <Database className={className} />;
    case 'custom_link': return <LinkIcon className={className} />;
  }
};

export function SourceBuilderStudio() {
  const [selectedId, setSelectedId] = useState<string>('5');
  const selectedSource = MOCK_SOURCES.find(s => s.id === selectedId) || MOCK_SOURCES[4];
  
  const steps = ['Identity', 'Connection', 'Governance', 'Penny Config'];
  const activeStepIndex = 3; // Hardcoded to Penny Config for the selected state per hypothesis

  return (
    <div 
      className="flex h-screen w-full bg-background font-sans overflow-hidden" 
      style={{ '--primary': '165 70% 30%', '--primary-foreground': '165 10% 98%' } as React.CSSProperties}
    >
      {/* Left Pane: List */}
      <div className="w-[320px] flex-shrink-0 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Sources ({MOCK_SOURCES.length - 1})</h2>
            <Button size="sm" className="h-8 gap-1 rounded-full px-3">
              <Plus className="w-4 h-4" />
              New
            </Button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search sources..." className="pl-9 h-9 bg-muted/40" />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {MOCK_SOURCES.map((source) => {
              const isSelected = source.id === selectedId;
              return (
                <button
                  key={source.id}
                  onClick={() => setSelectedId(source.id)}
                  className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors border ${
                    isSelected 
                      ? 'bg-primary/5 border-primary/30 shadow-sm' 
                      : 'border-transparent hover:bg-muted/50'
                  }`}
                >
                  <div className={`mt-0.5 w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <TypeIcon type={source.type} className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {source.name}
                      </span>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        source.status === 'Draft' ? 'bg-[#CC8400]' : HEALTH_COLORS[source.health]
                      }`} />
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                      {source.status === 'Draft' ? (
                        <span className="text-[#CC8400] font-medium">Draft — {source.draftStep}</span>
                      ) : (
                        <>
                          <span className="capitalize">{source.type.replace('_', ' ')}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${getSyncDotClass(source.sync)}`} />
                            {source.sync}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
        
        <div className="p-3 border-t bg-muted/10 text-[11px] text-muted-foreground font-medium text-center">
          4 of 6 fully configured
        </div>
      </div>

      {/* Right Pane: Builder */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto p-8 lg:p-12">
            
            {/* Header */}
            <div className="mb-10">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                <TypeIcon type={selectedSource.type} className="w-3.5 h-3.5" />
                <span>{selectedSource.type.replace('_', ' ')}</span>
                <span>/</span>
                <span>Source Builder</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">{selectedSource.name}</h1>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${getTrustBadgeClass(selectedSource.trust)}`}>
                      {selectedSource.trust}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <div className={`w-2 h-2 rounded-full ${getSyncDotClass(selectedSource.sync)}`} />
                      {selectedSource.sync}
                    </div>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="text-sm text-muted-foreground">Last edited 2 hrs ago by {selectedSource.owner}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground mr-2">Health:</span>
                  <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${
                    selectedSource.health === 'healthy' ? STATUS_BADGE_COLORS.green :
                    selectedSource.health === 'needs-attention' ? STATUS_BADGE_COLORS.amber :
                    STATUS_BADGE_COLORS.red
                  }`}>
                    {selectedSource.health.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Stepper */}
            <div className="mb-12">
              <div className="relative flex items-center justify-between">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-muted z-0">
                  <div className="h-full bg-primary" style={{ width: `${(activeStepIndex / (steps.length - 1)) * 100}%` }} />
                </div>
                
                {steps.map((step, idx) => {
                  const isCompleted = idx < activeStepIndex;
                  const isActive = idx === activeStepIndex;
                  const isPending = idx > activeStepIndex;
                  
                  return (
                    <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 bg-background transition-colors
                        ${isCompleted ? 'border-primary bg-primary text-primary-foreground' : ''}
                        ${isActive ? 'border-primary text-primary ring-4 ring-primary/10' : ''}
                        ${isPending ? 'border-muted-foreground/30 text-muted-foreground/50' : ''}
                      `}>
                        {isCompleted ? <Check className="w-4 h-4" /> : (idx + 1)}
                      </div>
                      <span className={`text-[11px] font-semibold uppercase tracking-wider absolute top-10 whitespace-nowrap
                        ${isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground/50'}
                      `}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden mt-16">
              <div className="px-8 py-6 border-b bg-muted/10 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Step 4: Penny Configuration</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">Configure how the Penny AI agent utilizes this source in conversations.</p>
                </div>
                <div className="text-[10px] uppercase font-bold text-primary tracking-wider bg-primary/10 px-3 py-1 rounded-full">
                  Active Step
                </div>
              </div>
              
              <div className="p-8 space-y-10">
                {/* Approved Toggle */}
                <div className="flex items-start justify-between gap-8 p-5 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      Approved for Penny
                      <Badge className="bg-primary hover:bg-primary text-[10px] px-1.5 py-0 h-4">RECOMMENDED</Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-xl">
                      Enable Penny to retrieve and cite this source when answering questions. Authoritative sources should always be approved to ensure high-quality answers.
                    </p>
                  </div>
                  <Switch checked={selectedSource.pennyApproved} className="data-[state=checked]:bg-primary" />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* Use Description */}
                  <div className="col-span-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                      Source Context <span className="text-primary">*</span>
                    </label>
                    <Textarea 
                      placeholder="Describe what Penny should use this source for..." 
                      className="resize-none h-24 text-sm"
                      defaultValue="Contains all official coaching protocols, session outlines, and rubrics. Use this to guide coaches on how to structure their 1:1 sessions and what milestones to hit."
                    />
                    <p className="text-[11px] text-muted-foreground mt-2">Penny uses this description to understand when to search this document.</p>
                  </div>

                  {/* Retrieval Note */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                      Retrieval Instructions
                    </label>
                    <Input 
                      placeholder="Any instructions for how Penny should weight this source" 
                      defaultValue="Prioritize exact quotes from the rubric section."
                      className="text-sm"
                    />
                  </div>
                </div>

                <hr className="border-border" />

                <div className="grid grid-cols-2 gap-8">
                  {/* Linked Capabilities */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                      Linked Capabilities
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-muted text-foreground hover:bg-muted font-medium px-3 py-1">
                        Career Coaching
                      </Badge>
                      <Badge variant="secondary" className="bg-muted text-foreground hover:bg-muted font-medium px-3 py-1">
                        Resume Review
                      </Badge>
                      <button className="inline-flex items-center justify-center rounded-full border border-dashed border-muted-foreground/40 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </button>
                    </div>
                  </div>

                  {/* Category Mapping */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                      Category Mapping
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium shadow-sm">
                        Protocols
                        <button className="text-muted-foreground hover:text-foreground">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium shadow-sm">
                        Internal Docs
                        <button className="text-muted-foreground hover:text-foreground">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <button className="inline-flex items-center justify-center rounded-full border border-dashed border-muted-foreground/40 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
                        <Plus className="w-3 h-3 mr-1" /> Add Category
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" className="text-muted-foreground">
                Back to Governance
              </Button>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="font-medium">
                  Mark Complete
                </Button>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6">
                  Save Source
                </Button>
              </div>
            </div>

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}