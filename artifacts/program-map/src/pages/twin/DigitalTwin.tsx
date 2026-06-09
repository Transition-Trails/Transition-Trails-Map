import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Network, Map, BookOpen, Brain, Users, GitBranch, Zap, BarChart2, ChevronRight } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import PeopleRolesStudio from '@/pages/people/PeopleRolesStudio';
import KnowledgeRelationships from '@/pages/navigator/KnowledgeRelationships';

// ── Graph node/edge data ──────────────────────────────────────────────────────
interface GNode { id: string; label: string; x: number; y: number; r: number; fill: string; path: string; outer?: boolean; desc: string; }
interface GEdge { from: string; to: string; dashed?: boolean; }

const ORG_NODES: GNode[] = [
  { id: 'hub',    label: 'Trail OS',       x: 350, y: 270, r: 30, fill: '#0f172a', path: '/',                      desc: 'Unified operating platform for Transition Trails.' },
  { id: 'prog',   label: 'Programs',       x: 350, y: 80,  r: 23, fill: '#059669', path: '/program',               desc: 'Foundations Trail, Guided Trail, Explorer\'s Trail, Trail of Mastery, Digital Compass.' },
  { id: 'curr',   label: 'Curriculum',     x: 481, y: 139, r: 21, fill: '#b45309', path: '/program/curriculum',    desc: 'Modules, lessons, assessments, cohorts, and learning objectives.' },
  { id: 'know',   label: 'Knowledge',      x: 535, y: 270, r: 21, fill: '#6d28d9', path: '/knowledge',             desc: 'Source Registry, Knowledge Library, Governance, and Org Memory.' },
  { id: 'penny',  label: 'Penny AI',       x: 481, y: 401, r: 21, fill: '#be185d', path: '/penny',                 desc: 'Capability Registry, Prompt Studio, Learners, Intelligence.' },
  { id: 'sf',     label: 'Salesforce',     x: 350, y: 460, r: 21, fill: '#0369a1', path: '/program/salesforce',    desc: 'System of record — learners, programs, coaches, outcomes, contacts.' },
  { id: 'integ',  label: 'Integrations',   x: 219, y: 401, r: 19, fill: '#0f766e', path: '/operations/integrations', desc: 'Google Drive, LMS, Slack, Calendar, Agentforce integration readiness.' },
  { id: 'people', label: 'People & Roles', x: 165, y: 270, r: 21, fill: '#1d4ed8', path: '/digital-twin/people',   desc: '11 personas, 14 roles, 5 blueprints, program participation, comm and Penny mappings.' },
  { id: 'collab', label: 'Collaboration',  x: 219, y: 139, r: 21, fill: '#c2410c', path: '/collaboration',         desc: 'Slack, Google Chat, Calendar, message templates, weekly briefs, notifications.' },
  { id: 'oic',    label: 'Intelligence',   x: 572, y: 50,  r: 16, fill: '#4f46e5', path: '/operations',            desc: 'Operational Intelligence — executive health, scorecards, trends, recommendations.', outer: true },
  { id: 'memory', label: 'Org Memory',     x: 128, y: 50,  r: 16, fill: '#7c3aed', path: '/knowledge/memory',      desc: 'Decisions, history, lessons learned, institutional knowledge.', outer: true },
];

const ORG_EDGES: GEdge[] = [
  { from: 'hub', to: 'prog'   }, { from: 'hub', to: 'curr'   }, { from: 'hub', to: 'know'   },
  { from: 'hub', to: 'penny'  }, { from: 'hub', to: 'sf'     }, { from: 'hub', to: 'integ'  },
  { from: 'hub', to: 'people' }, { from: 'hub', to: 'collab' },
  { from: 'prog',   to: 'curr'   }, { from: 'prog',   to: 'people' }, { from: 'prog',   to: 'collab' }, { from: 'prog', to: 'sf' },
  { from: 'curr',   to: 'know'   }, { from: 'curr',   to: 'penny'  },
  { from: 'know',   to: 'penny'  },
  { from: 'people', to: 'collab' }, { from: 'people', to: 'sf'     },
  { from: 'sf',     to: 'integ'  }, { from: 'penny',  to: 'collab' }, { from: 'collab', to: 'integ' },
  { from: 'oic',    to: 'hub',    dashed: true },
  { from: 'memory', to: 'know',   dashed: true },
];

function buildRadial(
  centerX: number, centerY: number, r: number,
  items: Omit<GNode, 'x' | 'y' | 'r'>[]
): GNode[] {
  const step = (2 * Math.PI) / items.length;
  return items.map((item, i) => ({
    ...item,
    r: 20,
    x: Math.round(centerX + r * Math.cos(-Math.PI / 2 + i * step)),
    y: Math.round(centerY + r * Math.sin(-Math.PI / 2 + i * step)),
  }));
}

const PROGRAM_NODES: GNode[] = [
  { id: 'c', label: 'Programs', x: 350, y: 270, r: 26, fill: '#059669', path: '/program', desc: 'Hub' },
  ...buildRadial(350, 270, 155, [
    { id: 'p1', label: 'Curriculum',  fill: '#b45309', path: '/program/curriculum', desc: 'Modules, lessons, assessments' },
    { id: 'p2', label: 'Standards',   fill: '#92400e', path: '/program/standards',  desc: 'Design standards and quality' },
    { id: 'p3', label: 'Salesforce',  fill: '#0369a1', path: '/program/salesforce', desc: 'CRM and program data' },
    { id: 'p4', label: 'People',      fill: '#1d4ed8', path: '/digital-twin/people', desc: 'Roles, blueprints, participation' },
    { id: 'p5', label: 'Penny AI',    fill: '#be185d', path: '/penny',               desc: 'Coaching, quests, intelligence' },
    { id: 'p6', label: 'Comms',       fill: '#c2410c', path: '/collaboration',        desc: 'Channels, calendar, briefs' },
  ]),
];
const PROGRAM_EDGES: GEdge[] = [
  { from: 'c', to: 'p1' }, { from: 'c', to: 'p2' }, { from: 'c', to: 'p3' },
  { from: 'c', to: 'p4' }, { from: 'c', to: 'p5' }, { from: 'c', to: 'p6' },
  { from: 'p1', to: 'p2' }, { from: 'p1', to: 'p5' }, { from: 'p3', to: 'p4' },
];

const KNOWLEDGE_NODES: GNode[] = [
  { id: 'kc', label: 'Knowledge', x: 350, y: 270, r: 26, fill: '#6d28d9', path: '/knowledge', desc: 'Hub' },
  ...buildRadial(350, 270, 155, [
    { id: 'k1', label: 'Penny AI',      fill: '#be185d', path: '/penny',                  desc: 'AI draws on knowledge sources' },
    { id: 'k2', label: 'Curriculum',    fill: '#b45309', path: '/program/curriculum',      desc: 'Articles linked to modules' },
    { id: 'k3', label: 'Google Drive',  fill: '#059669', path: '/operations/integrations', desc: 'Content repository source' },
    { id: 'k4', label: 'LMS',           fill: '#0369a1', path: '/operations/integrations', desc: 'Learning management source' },
    { id: 'k5', label: 'Salesforce KB', fill: '#0369a1', path: '/program/salesforce',      desc: 'Knowledge__c object' },
    { id: 'k6', label: 'Org Memory',    fill: '#7c3aed', path: '/knowledge/memory',        desc: 'Decisions, history, rationale' },
  ]),
];
const KNOWLEDGE_EDGES: GEdge[] = [
  { from: 'kc', to: 'k1' }, { from: 'kc', to: 'k2' }, { from: 'kc', to: 'k3' },
  { from: 'kc', to: 'k4' }, { from: 'kc', to: 'k5' }, { from: 'kc', to: 'k6', dashed: true },
  { from: 'k1', to: 'k2' }, { from: 'k3', to: 'k2' }, { from: 'k4', to: 'k2' },
];

const PENNY_NODES: GNode[] = [
  { id: 'pc', label: 'Penny AI', x: 350, y: 270, r: 26, fill: '#be185d', path: '/penny', desc: 'Hub' },
  ...buildRadial(350, 270, 155, [
    { id: 'pn1', label: 'Knowledge',    fill: '#6d28d9', path: '/knowledge',           desc: '6 approved knowledge sources' },
    { id: 'pn2', label: 'Curriculum',   fill: '#b45309', path: '/program/curriculum',  desc: 'Coaching, reflection, quests' },
    { id: 'pn3', label: 'Learners',     fill: '#059669', path: '/penny/learners',       desc: 'Learner context, progress, flags' },
    { id: 'pn4', label: 'Coaches',      fill: '#1d4ed8', path: '/digital-twin/people', desc: 'Coach briefs, escalation alerts' },
    { id: 'pn5', label: 'Prompt Studio',fill: '#7c3aed', path: '/penny/prompts',        desc: '20+ governed prompt templates' },
    { id: 'pn6', label: 'Salesforce',   fill: '#0369a1', path: '/program/salesforce',  desc: 'Variables, context, records' },
  ]),
];
const PENNY_EDGES: GEdge[] = [
  { from: 'pc', to: 'pn1' }, { from: 'pc', to: 'pn2' }, { from: 'pc', to: 'pn3' },
  { from: 'pc', to: 'pn4' }, { from: 'pc', to: 'pn5' }, { from: 'pc', to: 'pn6' },
  { from: 'pn1', to: 'pn2' }, { from: 'pn5', to: 'pn3' }, { from: 'pn6', to: 'pn3' },
];

// ── Impact map ────────────────────────────────────────────────────────────────
const IMPACT_MAP: Record<string, { label: string; items: { area: string; examples: string[] }[] }> = {
  'Programs': {
    label: 'If a program changes...',
    items: [
      { area: 'Curriculum', examples: ['Modules, lessons, and assessments must be reviewed', 'Learning objectives may need updating'] },
      { area: 'People & Roles', examples: ['Role participation mappings must be updated', 'Blueprints may need revision'] },
      { area: 'Communications', examples: ['Slack channels, calendar events, and templates are affected', 'Welcome and cohort messages may need updating'] },
      { area: 'Penny AI', examples: ['Trail quests and coaching prompts reference program context', 'Coach briefs and executive summaries will reflect changes'] },
      { area: 'Salesforce', examples: ['Program__c record and related PMM data updated', 'Outcome reports and dashboards may change'] },
    ],
  },
  'Knowledge': {
    label: 'If a knowledge source changes...',
    items: [
      { area: 'Penny AI', examples: ['Penny may surface outdated or inaccurate content', 'Prompt quality and hallucination risk increases'] },
      { area: 'Curriculum', examples: ['Knowledge articles linked to modules may be stale', 'Content health score will drop'] },
      { area: 'Learners', examples: ['Coaching and reflection responses may degrade', 'Trail quest answers may reference incorrect information'] },
    ],
  },
  'People & Roles': {
    label: 'If a role changes...',
    items: [
      { area: 'Communications', examples: ['Slack channel and Google Chat space assignments may need updating', 'Calendar event ownership changes'] },
      { area: 'Responsibilities', examples: ['Blueprint responsibilities must be reviewed', 'Role health score will be recalculated'] },
      { area: 'Penny AI', examples: ['Penny support mapping for the role may need updating', 'Coach briefs and escalation logic affected'] },
      { area: 'Salesforce', examples: ['Profile and permission set assignments may change', 'Related record ownership and visibility affected'] },
    ],
  },
  'Curriculum': {
    label: 'If curriculum content changes...',
    items: [
      { area: 'Standards', examples: ['Changes must be reviewed against active design standards', 'Standards Studio consistency score may change'] },
      { area: 'Penny AI', examples: ['Coaching prompts, reflection prompts, and trail quests must be reviewed', 'Consistency review should be triggered'] },
      { area: 'Assessments', examples: ['Assessment questions may need updating to match new content', 'Scoring criteria may change'] },
      { area: 'Knowledge Articles', examples: ['Linked knowledge articles may need updating', 'New articles may need to be created'] },
    ],
  },
  'Integrations': {
    label: 'If an integration changes...',
    items: [
      { area: 'Salesforce', examples: ['Object mappings and sync fields may be affected', 'Data flows may be interrupted'] },
      { area: 'Penny AI', examples: ['Context variables sourced from changed integration may be unavailable', 'Prompt rendering may fail without required variables'] },
      { area: 'Communications', examples: ['Slack adapter or Google Chat sync may need reconfiguration', 'Calendar sync may be affected'] },
    ],
  },
};

// ── NetworkGraph component ────────────────────────────────────────────────────
function NetworkGraph({ nodes, edges, onNavigate }: {
  nodes: GNode[];
  edges: GEdge[];
  onNavigate: (path: string) => void;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const nodeMap = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);

  const isHighlighted = (id: string) => {
    if (!hoverId) return true;
    if (id === hoverId) return true;
    return edges.some(e => (e.from === hoverId && e.to === id) || (e.to === hoverId && e.from === id));
  };

  const hoverNode = hoverId ? nodeMap[hoverId] : null;
  const hoverConnected = hoverNode
    ? edges
        .filter(e => e.from === hoverId || e.to === hoverId)
        .map(e => nodeMap[e.from === hoverId ? e.to : e.from])
        .filter(Boolean)
    : [];

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 flex items-center justify-center p-4 bg-slate-50/50">
        <svg viewBox="0 0 700 540" className="w-full max-w-[660px] max-h-full" style={{ overflow: 'visible' }}>
          {edges.map((edge, i) => {
            const f = nodeMap[edge.from]; const t = nodeMap[edge.to];
            if (!f || !t) return null;
            const conn = !hoverId || hoverId === edge.from || hoverId === edge.to;
            return (
              <line key={i} x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                stroke={conn ? '#94a3b8' : '#e2e8f0'}
                strokeWidth={conn ? (edge.dashed ? 1 : 1.5) : 0.5}
                strokeDasharray={edge.dashed ? '5,4' : undefined}
                style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
              />
            );
          })}
          {nodes.map(node => {
            const hi = isHighlighted(node.id);
            const hov = hoverId === node.id;
            return (
              <g key={node.id}
                onClick={() => onNavigate(node.path)}
                onMouseEnter={() => setHoverId(node.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{ opacity: hi ? 1 : 0.2, transition: 'opacity 0.15s', cursor: 'pointer' }}>
                <circle cx={node.x} cy={node.y} r={node.r + (hov ? 4 : 0)}
                  fill={node.fill}
                  stroke={hov ? '#fff' : 'rgba(255,255,255,0.3)'}
                  strokeWidth={hov ? 3 : 1}
                  style={{ transition: 'r 0.1s' }}
                />
                {node.outer && (
                  <circle cx={node.x} cy={node.y} r={node.r + 5}
                    fill="none" stroke={node.fill} strokeWidth={1.5} strokeDasharray="3,3" opacity={0.6}
                  />
                )}
                <text x={node.x} y={node.y + node.r + 13} textAnchor="middle"
                  fontSize={9} fontWeight={600} fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fill={hi ? '#1e293b' : '#94a3b8'}
                  style={{ transition: 'fill 0.15s', pointerEvents: 'none', userSelect: 'none' }}>
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover panel */}
      <div className={`w-52 border-l border-border bg-white shrink-0 flex flex-col transition-opacity duration-150 ${hoverNode ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {hoverNode && (
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: hoverNode.fill }} />
              <p className="text-[13px] font-semibold text-foreground">{hoverNode.label}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">{hoverNode.desc}</p>
            {hoverConnected.length > 0 && (
              <>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1.5">
                  Connects to ({hoverConnected.length})
                </p>
                <div className="space-y-1 flex-1">
                  {hoverConnected.map(c => (
                    <div key={c.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.fill }} />
                      {c.label}
                    </div>
                  ))}
                </div>
              </>
            )}
            <button
              onClick={() => onNavigate(hoverNode.path)}
              className="mt-3 w-full text-[11px] font-semibold text-primary border border-primary/30 rounded-md px-2 py-1.5 hover:bg-primary/5 transition-colors">
              Open workspace →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────────
function TwinOverview({ onNavigate }: { onNavigate: (p: string) => void }) {
  const domains = [
    { label: 'Programs',     desc: '5 active programs — the delivery layer.',                 color: 'bg-emerald-600', path: '/program' },
    { label: 'Curriculum',   desc: 'Modules, lessons, assessments, sprints.',                 color: 'bg-amber-700',   path: '/program/curriculum' },
    { label: 'Knowledge',    desc: 'Sources, governance, library, org memory.',               color: 'bg-violet-700',  path: '/knowledge' },
    { label: 'Penny AI',     desc: 'Capabilities, prompts, learners, intelligence.',          color: 'bg-pink-700',    path: '/penny' },
    { label: 'Salesforce',   desc: 'System of record — CRM, programs, outcomes.',            color: 'bg-blue-700',    path: '/program/salesforce' },
    { label: 'Integrations', desc: 'Google Drive, LMS, Slack, Agentforce readiness.',        color: 'bg-teal-700',    path: '/operations/integrations' },
    { label: 'People',       desc: '11 personas, 14 roles, blueprints, mappings.',            color: 'bg-blue-800',    path: '/digital-twin/people' },
    { label: 'Collaboration',desc: 'Slack, Google Chat, Calendar, templates, briefs.',        color: 'bg-orange-700',  path: '/collaboration' },
    { label: 'Intelligence', desc: 'OIC — health, scorecards, trends, recommendations.',      color: 'bg-indigo-600',  path: '/operations' },
    { label: 'Org Memory',   desc: 'Decisions, history, lessons, institutional knowledge.',   color: 'bg-purple-700',  path: '/knowledge/memory' },
  ];
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-5 max-w-3xl">
        <div className="rounded-lg border border-border bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">What is the Digital Twin?</p>
          <p className="text-[13px] text-foreground leading-relaxed">
            The Digital Twin is the living organizational model of Transition Trails. It visualizes how every major domain — programs, curriculum, knowledge, people, Penny AI, Salesforce, integrations, and communications — connects to and depends on each other. Use the Org Graph to explore relationships visually. Use Impact Analysis to trace the cascade effects of any change. Use People & Roles to see the human layer that powers every domain.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['Org Graph', 'Programs', 'Knowledge', 'Penny Network', 'People & Roles', 'Impact Analysis'] as const).map(v => (
              <span key={v} className="text-[11px] font-semibold text-primary border border-primary/30 rounded-full px-2.5 py-0.5 cursor-pointer hover:bg-primary/5 transition-colors">
                {v}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Architecture Layers</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {domains.map(d => (
              <button key={d.label} onClick={() => onNavigate(d.path)}
                className="rounded-lg border border-border bg-white p-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors group">
                <div className={`w-2 h-2 rounded-full mb-1.5 ${d.color}`} />
                <p className="text-[12px] font-semibold text-foreground group-hover:text-primary transition-colors">{d.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{d.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Phase 1 Architecture Consolidation</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">All major Trail OS layers are now prototyped and consolidated into 8 workspaces. The Digital Twin is the capstone — use it to navigate by relationship rather than by workspace.</p>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Impact Analysis tab ───────────────────────────────────────────────────────
function ImpactAnalysis() {
  const [selected, setSelected] = useState<string>('Programs');
  const domains = Object.keys(IMPACT_MAP);
  const impact = IMPACT_MAP[selected];

  return (
    <div className="flex h-full">
      <div className="w-44 border-r border-border bg-white shrink-0 py-3 px-2">
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 px-2 mb-2">Select Domain</p>
        {domains.map(d => (
          <button key={d} onClick={() => setSelected(d)}
            className={`w-full text-left px-2 py-1.5 text-[12px] rounded-md transition-colors ${selected === d ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:bg-muted/50'}`}>
            {d}
          </button>
        ))}
      </div>
      <ScrollArea className="flex-1 h-full">
        <div className="p-5 space-y-3">
          <p className="text-[13px] font-semibold text-foreground">{impact.label}</p>
          {impact.items.map((item, i) => (
            <div key={i} className="rounded-lg border border-border bg-white p-4">
              <p className="text-[12px] font-bold text-primary mb-2 flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3" />{item.area} is affected
              </p>
              <ul className="space-y-1">
                {item.examples.map((ex, j) => (
                  <li key={j} className="text-[11px] text-muted-foreground flex gap-1.5">
                    <span className="text-muted-foreground/40 mt-0.5 shrink-0">·</span>{ex}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DigitalTwin() {
  const [, setLocation] = useLocation();
  const nav = (p: string) => setLocation(p);

  return (
    <HubShell
      title="Digital Twin"
      icon={Network}
      description="Living organizational model of Transition Trails — visualize relationships, explore connections, and trace impact across every domain."
      badge="Capstone Layer"
      tabs={[
        { id: 'overview',    label: 'Overview',       path: '/digital-twin',              icon: Network,  content: <TwinOverview onNavigate={nav} /> },
        { id: 'org-graph',   label: 'Org Graph',      path: '/digital-twin/org-graph',    icon: Map,      content: <NetworkGraph nodes={ORG_NODES} edges={ORG_EDGES} onNavigate={nav} /> },
        { id: 'programs',    label: 'Program Network',path: '/digital-twin/programs',     icon: GitBranch,content: <NetworkGraph nodes={PROGRAM_NODES} edges={PROGRAM_EDGES} onNavigate={nav} /> },
        { id: 'knowledge',   label: 'Knowledge Net',  path: '/digital-twin/knowledge',    icon: BookOpen, content: <NetworkGraph nodes={KNOWLEDGE_NODES} edges={KNOWLEDGE_EDGES} onNavigate={nav} /> },
        { id: 'penny',       label: 'Penny Network',  path: '/digital-twin/penny-network',icon: Brain,    content: <NetworkGraph nodes={PENNY_NODES} edges={PENNY_EDGES} onNavigate={nav} /> },
        { id: 'people',      label: 'People & Roles', path: '/digital-twin/people',       icon: Users,    content: <PeopleRolesStudio /> },
        { id: 'relationships', label: 'Relationships',path: '/digital-twin/relationships',icon: GitBranch,content: <KnowledgeRelationships /> },
        { id: 'impact',      label: 'Impact Analysis',path: '/digital-twin/impact',       icon: Zap,      content: <ImpactAnalysis /> },
      ]}
    />
  );
}
