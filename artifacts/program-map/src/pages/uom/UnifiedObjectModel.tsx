import { useState } from 'react';
import { useLocation } from 'wouter';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Layers, LayoutGrid, GitBranch, Database, Shield, Search, User,
  ArrowRight, ExternalLink, ChevronRight,
} from 'lucide-react';
import {
  OBJECT_TYPES, OBJECT_CATEGORIES, OBJECTS_BY_CATEGORY, OBJECT_MAP,
  RELATIONSHIP_MATRIX, SOURCE_OF_TRUTH_SYSTEMS, REL_TYPE_CONFIG,
  type UOMObjectType, type ObjectCategory,
} from '@/data/unifiedObjectModelData';

// ── shared badge helpers ────────────────────────────────────────────────────
function CatBadge({ category }: { category: ObjectCategory }) {
  const cat = OBJECT_CATEGORIES.find(c => c.id === category);
  if (!cat) return null;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${cat.bg} ${cat.color}`}>
      {cat.label}
    </span>
  );
}

function SoTBadge({ sys }: { sys: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#E6F0EA] border border-[#9FC3AE] text-[#2F6B3F]">
      {sys}
    </span>
  );
}

// ── Tab: Architecture Overview ───────────────────────────────────────────────
function ArchitectureOverview() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-3xl">
        <div>
          <h2 className="text-base font-bold text-foreground mb-1">What is the Unified Object Model?</h2>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            The Unified Object Model (UOM) is the architectural foundation of Trail OS. It defines every core object type
            used across the platform, how each object relates to others, who owns each object, where the authoritative
            data lives, and what health means for each type. The UOM makes Trail OS coherent by ensuring all workspaces
            share the same vocabulary, the same ownership patterns, and the same quality standards.
          </p>
        </div>

        <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] px-4 py-3">
          <p className="text-[11px] font-bold text-[#CC8400] uppercase tracking-wider mb-1">Phase 1 Architecture Capability</p>
          <p className="text-[12px] text-[#CC8400] leading-relaxed">
            The UOM establishes the common language for Universal Object Profiles, Global Search, and future automation.
            Every new page, integration, and Penny capability built after Phase 1 will reference this model.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold text-foreground uppercase tracking-wide mb-3">Object Layers ({OBJECT_TYPES.length} Core Types)</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {OBJECTS_BY_CATEGORY.map(cat => (
              <div key={cat.id} className={`rounded-lg border p-3 ${cat.bg}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${cat.color}`}>{cat.label}</p>
                <div className="flex flex-wrap gap-1">
                  {cat.objects.map(o => (
                    <span key={o.id} className="text-[11px] text-foreground bg-white/70 rounded px-1.5 py-0.5 border border-white/80">
                      {o.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-foreground uppercase tracking-wide mb-3">Common Object Profile Structure</p>
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
              Every object type in Trail OS exposes the same profile structure, enabling consistent navigation and future automation.
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {['Overview', 'Relationships', 'Ownership', 'Health', 'Standards', 'Related Programs',
                'Related Knowledge', 'Related Penny Assets', 'Related Communications', 'Related Salesforce Objects', 'Related Decisions', 'History'
              ].map(tab => (
                <div key={tab} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-muted/30 border border-border/60">
                  <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/50 flex-shrink-0" />
                  <span className="text-[11px] text-foreground">{tab}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-foreground uppercase tracking-wide mb-3">Relationship Principles</p>
          <div className="space-y-1.5">
            {[
              ['Object relationships are the primary navigation model.', 'Clicking a relationship navigates to the connected object\'s profile, not a new page.'],
              ['Every object has a single source of truth.', 'Salesforce, Standards Studio, or a dedicated registry — never ambiguous.'],
              ['Ownership is always explicit.', 'Every object has at least one named owner role and a defined review cycle.'],
              ['Health is measurable and automated.', 'Health indicators draw from real system data — not manual status fields.'],
              ['The Digital Twin reflects this model.', 'Every node in the Digital Twin org graph is a UOM object type with live profile data.'],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-muted/20 border border-border/60">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div>
                  <span className="text-[12px] font-semibold text-foreground">{title}</span>
                  <span className="text-[11px] text-muted-foreground ml-1">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab: Object Catalog ─────────────────────────────────────────────────────
function ObjectCatalog({ onSelectObject }: { onSelectObject: (id: string) => void }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {OBJECTS_BY_CATEGORY.map(cat => (
          <div key={cat.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${cat.color}`}>{cat.label}</span>
              <span className="text-[10px] text-muted-foreground/60">{cat.objects.length} types</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {cat.objects.map(obj => (
                <button
                  key={obj.id}
                  onClick={() => onSelectObject(obj.id)}
                  className={`text-left p-3 rounded-lg border transition-all hover:shadow-sm hover:scale-[1.01] ${cat.bg}`}
                >
                  <p className="text-[12px] font-bold text-foreground mb-0.5">{obj.name}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">{obj.purpose}</p>
                  <div className="flex flex-wrap gap-1 mt-auto">
                    <span className="text-[9px] bg-white/70 border border-white/80 rounded px-1 py-0.5 text-muted-foreground truncate max-w-[120px]">
                      SoT: {obj.sourceOfTruth.split(' ')[0]}
                    </span>
                    <span className="text-[9px] bg-white/70 border border-white/80 rounded px-1 py-0.5 text-muted-foreground">
                      {obj.relationships.length} rels
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// ── Tab: Relationship Matrix ─────────────────────────────────────────────────
const REL_ABBREV: Record<string, string> = {
  'contains': 'has', 'governs': 'gov', 'sources': 'src', 'maps-to': 'map',
  'triggers': 'trg', 'participates-in': 'par', 'syncs-with': 'syn',
  'depends-on': 'dep', 'informs': 'inf', 'serves': 'srv',
};
const REL_CELL_COLOR: Record<string, string> = {
  'contains': 'bg-[#E6F0EA] text-[#245531]', 'governs': 'bg-[#EDF5F8] text-[#2F6F7E]',
  'sources': 'bg-[#EDF5F8] text-[#2F6F7E]', 'maps-to': 'bg-[#EDF5F8] text-[#2F6F7E]',
  'triggers': 'bg-[#FBEAE6] text-[#A93F2F]', 'participates-in': 'bg-[#FFF3E0] text-[#CC8400]',
  'syncs-with': 'bg-[#E6F0EA] text-[#245531]', 'depends-on': 'bg-[#FBEAE6] text-[#A93F2F]',
  'informs': 'bg-[#EDF5F8] text-[#2F6F7E]', 'serves': 'bg-[#FFF3E0] text-[#CC8400]',
};

function RelationshipMatrix() {
  const matrixMap = new Map<string, string>();
  RELATIONSHIP_MATRIX.forEach(e => matrixMap.set(`${e.fromId}:${e.toId}`, e.type));

  const SHORT_NAMES: Record<string, string> = {
    'program': 'Prog', 'cohort': 'Cohr', 'sprint': 'Sprt', 'module': 'Mod', 'lesson': 'Les', 'assessment': 'Asmt',
    'knowledge-source': 'KSrc', 'knowledge-article': 'KArt', 'standard': 'Std', 'program-blueprint': 'PBP',
    'penny-capability': 'PCap', 'prompt-template': 'Prmpt', 'person': 'Pers', 'role': 'Role',
    'communication-channel': 'Chan', 'calendar': 'Cal', 'google-drive-resource': 'GDrv',
    'salesforce-object': 'SFrc', 'decision': 'Dec', 'integration': 'Int',
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="mb-3">
          <p className="text-[11px] font-bold text-foreground mb-1">Object-to-Object Relationship Matrix</p>
          <p className="text-[10px] text-muted-foreground">Rows = source object. Columns = target object. Cells show relationship type from source to target.</p>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {Object.entries(REL_ABBREV).map(([type, abbrev]) => (
            <div key={type} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${REL_CELL_COLOR[type]}`}>
              <span>{abbrev}</span>
              <span className="font-normal opacity-70">=</span>
              <span>{REL_TYPE_CONFIG[type as keyof typeof REL_TYPE_CONFIG]?.label ?? type}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="w-14 border border-border/40 bg-muted/30" />
                {OBJECT_TYPES.map(col => (
                  <th key={col.id} className="border border-border/40 bg-muted/20 px-0.5 py-1 min-w-[30px]">
                    <div className="writing-mode-vertical text-[8px] font-bold text-muted-foreground text-center" title={col.name}>
                      {SHORT_NAMES[col.id]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OBJECT_TYPES.map(row => (
                <tr key={row.id} className="hover:bg-muted/10">
                  <td className="border border-border/40 bg-muted/20 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                    {SHORT_NAMES[row.id]}
                  </td>
                  {OBJECT_TYPES.map(col => {
                    const relType = matrixMap.get(`${row.id}:${col.id}`);
                    return (
                      <td key={col.id} className="border border-border/30 text-center p-0.5">
                        {relType ? (
                          <span className={`inline-flex items-center justify-center w-full h-5 rounded text-[8px] font-bold ${REL_CELL_COLOR[relType] ?? 'bg-muted'}`}>
                            {REL_ABBREV[relType] ?? '?'}
                          </span>
                        ) : (
                          <span className="block w-full h-5" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab: Source of Truth ─────────────────────────────────────────────────────
function SourceOfTruth() {
  const systemGroups = SOURCE_OF_TRUTH_SYSTEMS.map(sys => ({
    sys,
    objects: OBJECT_TYPES.filter(o => o.sourceOfTruth.includes(sys.split(' ')[0])),
  })).filter(g => g.objects.length > 0);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="rounded-lg border border-border bg-white">
          <div className="grid grid-cols-[1fr_200px_200px] text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border bg-muted/20">
            <div>Object Type</div>
            <div>Source of Truth</div>
            <div>Connected Systems</div>
          </div>
          {OBJECT_TYPES.map((obj, i) => {
            const cat = OBJECT_CATEGORIES.find(c => c.id === obj.category);
            return (
              <div key={obj.id} className={`grid grid-cols-[1fr_200px_200px] px-4 py-2.5 ${i < OBJECT_TYPES.length - 1 ? 'border-b border-border/40' : ''} hover:bg-muted/10`}>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-foreground">{obj.name}</span>
                  {cat && <span className={`text-[9px] font-bold ${cat.color}`}>{cat.label.replace(' Layer', '')}</span>}
                </div>
                <div>
                  <SoTBadge sys={obj.sourceOfTruth} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {obj.systems.slice(0, 3).map(s => (
                    <span key={s} className="text-[9px] bg-muted/30 border border-border/60 rounded px-1 py-0.5 text-muted-foreground">{s}</span>
                  ))}
                  {obj.systems.length > 3 && (
                    <span className="text-[9px] text-muted-foreground/60">+{obj.systems.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <p className="text-[11px] font-bold text-foreground uppercase tracking-wide mb-2">By Authoritative System</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {systemGroups.map(g => (
              <div key={g.sys} className="rounded-lg border border-border bg-white p-3">
                <p className="text-[11px] font-bold text-[#2F6B3F] mb-1.5">{g.sys}</p>
                <div className="space-y-0.5">
                  {g.objects.map(o => (
                    <p key={o.id} className="text-[11px] text-foreground">{o.name}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab: Governance ──────────────────────────────────────────────────────────
function Governance() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        <div className="rounded-lg border border-border bg-white">
          <div className="grid grid-cols-[1fr_160px_180px_160px] text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border bg-muted/20">
            <div>Object Type</div>
            <div>Primary Owner</div>
            <div>Review Cycle</div>
            <div>Standards</div>
          </div>
          {OBJECT_TYPES.map((obj, i) => (
            <div key={obj.id} className={`grid grid-cols-[1fr_160px_180px_160px] px-4 py-2.5 ${i < OBJECT_TYPES.length - 1 ? 'border-b border-border/40' : ''} hover:bg-muted/10`}>
              <div className="flex items-center gap-1.5">
                <CatBadge category={obj.category} />
                <span className="text-[12px] font-semibold text-foreground">{obj.name}</span>
              </div>
              <div>
                <span className="text-[11px] text-foreground">{obj.ownership[0]}</span>
                {obj.ownership.length > 1 && (
                  <span className="text-[10px] text-muted-foreground"> + {obj.ownership.length - 1}</span>
                )}
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">{obj.reviewCycle}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {obj.standards.length > 0
                  ? obj.standards.map(s => (
                    <span key={s} className="text-[9px] bg-[#EDF5F8] border border-[#7FAFC6] text-[#2F6F7E] rounded px-1 py-0.5">{s}</span>
                  ))
                  : <span className="text-[10px] text-muted-foreground/50">—</span>
                }
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-[11px] font-bold text-foreground uppercase tracking-wide mb-2">Governance Principles</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ['Ownership is always named', 'Every object has a named owner role — not a team or department. Ownership without a name is unresolved.'],
              ['Review cycles are binding', 'Every object has a defined review cycle. Missing a review creates a health flag, not a silent pass.'],
              ['Standards reference is mandatory', 'Objects with applicable blueprints must document compliance. Undocumented compliance = non-compliance.'],
              ['Source of truth is singular', 'No object has two sources of truth. If data exists in two systems, one is authoritative and one is derived.'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-md bg-muted/20 border border-border/60 px-3 py-2">
                <p className="text-[11px] font-semibold text-foreground mb-0.5">{title}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab: Object Explorer ─────────────────────────────────────────────────────
function ObjectExplorer() {
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<string>('program');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const obj = OBJECT_MAP[selectedId];

  const explorerTabs = ['Overview', 'Relationships', 'Ownership', 'Health', 'Standards', 'Systems'];

  return (
    <div className="flex h-full min-h-0">
      {/* Object list */}
      <div className="w-44 flex-shrink-0 border-r border-border overflow-y-auto py-2 px-1.5 bg-muted/10">
        {OBJECTS_BY_CATEGORY.map(cat => (
          <div key={cat.id} className="mb-2">
            <p className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 ${cat.color}`}>{cat.label.replace(' Layer', '')}</p>
            {cat.objects.map(o => (
              <button
                key={o.id}
                onClick={() => { setSelectedId(o.id); setActiveTab('overview'); }}
                className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                  selectedId === o.id
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                {o.name}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {obj && (
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Profile header */}
          <div className="flex-shrink-0 border-b border-border px-5 pt-4 pb-0 bg-white">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <CatBadge category={obj.category} />
                  <span className="text-[10px] text-muted-foreground">Source of Truth: <strong>{obj.sourceOfTruth}</strong></span>
                </div>
                <h2 className="text-lg font-bold text-foreground">{obj.name}</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed max-w-xl">{obj.purpose}</p>
              </div>
              <button
                onClick={() => setLocation(obj.workspaceLink)}
                className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium ml-4 flex-shrink-0 mt-1"
              >
                Open Workspace <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            {/* Lifecycle pills */}
            <div className="flex items-center gap-1 mt-2 mb-3">
              {obj.lifecycle.map((stage, i) => (
                <div key={stage} className="flex items-center gap-0.5">
                  <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full border ${
                    i === 0 ? 'border-[#9FC3AE] bg-[#E6F0EA] text-[#2F6B3F]'
                    : i === obj.lifecycle.length - 1 ? 'border-muted text-muted-foreground bg-muted/20'
                    : 'border-border bg-white text-foreground/70'
                  }`}>{stage}</span>
                  {i < obj.lifecycle.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/30" />}
                </div>
              ))}
            </div>
            {/* Profile tab bar */}
            <div className="flex gap-0 border-b-0">
              {explorerTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${
                    activeTab === tab.toLowerCase()
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <ScrollArea className="flex-1">
            <div className="p-5">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Ownership</p>
                    <div className="flex flex-wrap gap-1.5">
                      {obj.ownership.map(o => (
                        <span key={o} className="text-[11px] px-2 py-1 rounded-md bg-[#EDF5F8] border border-[#7FAFC6] text-[#2F6F7E] font-medium">{o}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Review Cycle</p>
                    <p className="text-[12px] text-foreground">{obj.reviewCycle}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Connected Systems</p>
                    <div className="flex flex-wrap gap-1.5">
                      {obj.systems.map(s => <SoTBadge key={s} sys={s} />)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Profile Tabs (Universal Object Profile)</p>
                    <div className="flex flex-wrap gap-1">
                      {obj.profileTabs.map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 border border-border/60 text-foreground/70">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'relationships' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">{obj.relationships.length} Direct Relationships</p>
                  {obj.relationships.map(rel => {
                    const target = OBJECT_MAP[rel.targetId];
                    const relCfg = REL_TYPE_CONFIG[rel.type];
                    return (
                      <div key={`${rel.targetId}`} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border bg-white hover:bg-muted/10">
                        <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${REL_CELL_COLOR[rel.type] ?? 'bg-muted'}`}>
                          {relCfg?.label ?? rel.type}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-foreground">{rel.targetName}</p>
                          <p className="text-[10px] text-muted-foreground">{rel.description}</p>
                        </div>
                        {target && (
                          <button
                            onClick={() => setSelectedId(rel.targetId)}
                            className="text-[10px] text-primary hover:underline font-medium shrink-0 flex items-center gap-0.5 mt-0.5"
                          >
                            Profile <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'ownership' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Owner Roles</p>
                    {obj.ownership.map((owner, i) => (
                      <div key={owner} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[#7FAFC6] bg-[#EDF5F8] mb-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#2F6F7E] flex items-center justify-center text-[9px] font-bold text-white shrink-0">{i + 1}</div>
                        <div>
                          <p className="text-[12px] font-semibold text-[#2F6F7E]">{owner}</p>
                          <p className="text-[10px] text-[#2F6F7E]">{i === 0 ? 'Primary owner — final accountability' : 'Secondary owner — operational responsibility'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Review Cadence</p>
                    <div className="px-3 py-2.5 rounded-lg border border-border bg-white">
                      <p className="text-[12px] text-foreground">{obj.reviewCycle}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'health' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">{obj.health.length} Health Indicators</p>
                  {obj.health.map(h => (
                    <div key={h.name} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border bg-white">
                      <div className="w-2 h-2 rounded-full bg-muted mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[12px] font-semibold text-foreground">{h.name}</p>
                          <span className="text-[9px] bg-[#E6F0EA] border border-[#9FC3AE] text-[#2F6B3F] rounded px-1 py-0.5">{h.source}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{h.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'standards' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Governing Standards</p>
                  {obj.standards.length > 0 ? (
                    obj.standards.map(s => (
                      <div key={s} className="px-3 py-2.5 rounded-lg border border-[#7FAFC6] bg-[#EDF5F8]">
                        <p className="text-[12px] font-semibold text-[#2F6F7E]">{s}</p>
                        <p className="text-[10px] text-[#2F6F7E] mt-0.5">View full standard in Standards Studio → Program & Curriculum workspace</p>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 rounded-lg border border-border bg-muted/20 text-center">
                      <p className="text-[11px] text-muted-foreground">No governing standards defined for this object type.</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">This object type follows general organizational guidelines.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'systems' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Source of Truth</p>
                    <div className="px-3 py-2.5 rounded-lg border border-[#9FC3AE] bg-[#E6F0EA]">
                      <p className="text-[13px] font-bold text-[#245531]">{obj.sourceOfTruth}</p>
                      <p className="text-[10px] text-[#2F6B3F] mt-0.5">The authoritative system of record for this object type.</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Connected Systems</p>
                    <div className="space-y-1.5">
                      {obj.systems.map(s => (
                        <div key={s} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-white">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#2F6B3F] shrink-0" />
                          <span className="text-[12px] text-foreground">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// ── Object Profiles Tab ───────────────────────────────────────────────────────
function ObjectProfilesTab() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const filtered = query.trim()
    ? OBJECT_TYPES.filter(o =>
        o.name.toLowerCase().includes(query.toLowerCase()) ||
        o.category.toLowerCase().includes(query.toLowerCase()) ||
        o.purpose.toLowerCase().includes(query.toLowerCase())
      )
    : OBJECT_TYPES;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter profiles…"
            className="flex-1 h-8 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} of {OBJECT_TYPES.length}</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(obj => {
            const catConfig = OBJECT_CATEGORIES.find(c => c.id === obj.category);
            return (
              <button
                key={obj.id}
                onClick={() => setLocation('/uom/explorer')}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card hover:bg-muted/40 hover:border-primary/30 transition-colors p-3 text-left w-full"
              >
                <div className="w-8 h-8 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{obj.name}</span>
                    {catConfig && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{catConfig.label}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{obj.purpose}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 flex-shrink-0 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}

// ── HubShell wiring ──────────────────────────────────────────────────────────
function ArchTab()         { return <ArchitectureOverview />; }
function CatalogTab()      { return <ObjectCatalog onSelectObject={() => {}} />; }
function MatrixTab()       { return <RelationshipMatrix />; }
function SoTTab()          { return <SourceOfTruth />; }
function GovernanceTab()   { return <Governance />; }
function ExplorerTab()     { return <ObjectExplorer />; }
function ProfilesTab()     { return <ObjectProfilesTab />; }

export default function UnifiedObjectModel() {
  return (
    <HubShell
      title="Unified Object Model"
      icon={Layers}
      description={`Defines all ${OBJECT_TYPES.length} core object types, their relationships, ownership, health indicators, and source of truth — the architectural foundation of Trail OS.`}
      tabs={[
        { id: 'architecture', label: 'Architecture',       path: '/uom',             icon: Layers,    content: <ArchTab /> },
        { id: 'catalog',      label: 'Object Catalog',     path: '/uom/catalog',     icon: LayoutGrid,content: <CatalogTab /> },
        { id: 'matrix',       label: 'Relationship Matrix',path: '/uom/matrix',      icon: GitBranch, content: <MatrixTab /> },
        { id: 'sources',      label: 'Source of Truth',    path: '/uom/sources',     icon: Database,  content: <SoTTab /> },
        { id: 'governance',   label: 'Governance',         path: '/uom/governance',  icon: Shield,    content: <GovernanceTab /> },
        { id: 'explorer',     label: 'Object Explorer',    path: '/uom/explorer',    icon: Search,    content: <ExplorerTab /> },
        { id: 'profiles',     label: 'Object Profiles',    path: '/uom/profiles',    icon: User,      content: <ProfilesTab /> },
      ]}
    />
  );
}
