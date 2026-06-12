import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Layers, FileText, Compass, Brain, Monitor, Plug,
  Search, ArrowLeft, ChevronRight, Save, X, AlertTriangle,
  ExternalLink, CheckCircle2, Users, Copy, User, Shield, Sliders, Building2, Plus,
  Key, Lock, Layout, ListTodo, Database,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import type { Program } from '@/data/programs';
import type { SourceDocument } from '@/data/sourceDocuments';
import type { ResolvePhase } from '@/data/resolvePhases';
import type { PennyCapability } from '@/data/pennyCapabilities';
import type { TrailOsCapability } from '@/data/trailOsCapabilities';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type AdminView = 'home' | 'programs' | 'documents' | 'resolve' | 'penny' | 'trailOs' | 'integrations'
  | 'roles' | 'templates' | 'users' | 'permissions' | 'settings';

const URL_SECTION_MAP: Partial<Record<string, AdminView>> = {
  programs: 'programs', documents: 'documents', resolve: 'resolve',
  'trail-os': 'trailOs', penny: 'penny', roles: 'roles',
  templates: 'templates', integrations: 'integrations',
  users: 'users', permissions: 'permissions', settings: 'settings',
};

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Admin() {
  const [location] = useLocation();
  const urlSection = location.split('/admin/')[1]?.split('/')[0] ?? '';

  const [view, setView]         = useState<AdminView>(() => URL_SECTION_MAP[urlSection] ?? 'home');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    const sect = location.split('/admin/')[1]?.split('/')[0] ?? '';
    setView(URL_SECTION_MAP[sect] ?? 'home');
    setSelectedId(null);
    setSearch('');
  }, [location]);

  function navigate(v: AdminView) {
    setView(v);
    setSelectedId(null);
    setSearch('');
  }

  if (view === 'home') return <AdminHome onNavigate={navigate} />;

  return (
    <AreaEditor
      view={view}
      selectedId={selectedId}
      onSelect={setSelectedId}
      search={search}
      onSearch={setSearch}
      onBack={() => navigate('home')}
    />
  );
}

// ─── Admin home ────────────────────────────────────────────────────────────────

function AdminHome({ onNavigate }: { onNavigate: (v: AdminView) => void }) {
  const [, setLocation] = useLocation();
  const { programs, sourceDocuments, resolvePhases, pennyCapabilities, trailOsCapabilities, openSlackPanel } = useAppContext();

  const cmsAreas: {
    id: AdminView;
    icon: React.ReactNode;
    label: string;
    count: number;
    borderColor: string;
    iconBg: string;
    description: string;
  }[] = [
    {
      id: 'programs',
      icon: <Layers className="w-5 h-5" />,
      label: 'Program Records',
      count: programs.length,
      borderColor: 'border-primary/20 hover:border-primary/40',
      iconBg: 'bg-primary/10 text-primary',
      description: 'Edit program cards — strategic roles, core outcomes, audience, duration, and confidence status. Canonical CMS for program data.',
    },
    {
      id: 'documents',
      icon: <FileText className="w-5 h-5" />,
      label: 'Source Documents',
      count: sourceDocuments.length,
      borderColor: 'border-sky-200 hover:border-sky-400',
      iconBg: 'bg-sky-50 text-sky-700',
      description: 'Manage document records with source-of-truth mapping, Google Drive links, and key decision influence tracking.',
    },
    {
      id: 'resolve',
      icon: <Compass className="w-5 h-5" />,
      label: 'RESOLVE Framework',
      count: resolvePhases.length,
      borderColor: 'border-teal-200 hover:border-teal-400',
      iconBg: 'bg-teal-50 text-teal-700',
      description: 'Edit the 8 RESOLVE phases — names, purposes, source notes, confidence status, and source document references.',
    },
    {
      id: 'penny',
      icon: <Brain className="w-5 h-5" />,
      label: 'Penny Capability Records',
      count: pennyCapabilities.length,
      borderColor: 'border-amber-200 hover:border-amber-400',
      iconBg: 'bg-amber-50 text-amber-700',
      description: 'Edit Penny AI capability records — purpose, executive summary, key facts, and program connections. Canonical CMS for Penny data.',
    },
    {
      id: 'trailOs',
      icon: <Monitor className="w-5 h-5" />,
      label: 'Trail OS Capabilities',
      count: trailOsCapabilities.length,
      borderColor: 'border-slate-200 hover:border-slate-400',
      iconBg: 'bg-slate-50 text-slate-600',
      description: 'Manage Trail OS operational capability records — descriptions, RESOLVE phase connections, and Penny capability links.',
    },
    {
      id: 'integrations',
      icon: <Plug className="w-5 h-5" />,
      label: 'Integration Config',
      count: 1,
      borderColor: 'border-border hover:border-border/60',
      iconBg: 'bg-muted text-muted-foreground',
      description: 'Configure external integration data settings — Salesforce Cases Kanban field mapping and future data connections.',
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 max-w-4xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Administration</p>
              <h1 className="text-base font-semibold text-foreground">Knowledge Management</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Admin &amp; Super Admin functions — data editing, access control, integration credentials, and system readiness.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => openSlackPanel({ context: 'admin', title: 'Administration', subtitle: TERMS.signalSubtitle('Administration') })}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-muted-foreground bg-white border border-border/70 hover:text-foreground hover:border-border transition-colors"
              >
                <Layers className="w-3 h-3" />
                {TERMS.trailSignals}
              </button>
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium px-3 py-1.5 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                Prototype — edits reset on refresh
              </div>
            </div>
          </div>

          {/* Canonical page map */}
          <div className="mb-5 rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2.5">Canonical Page Map — one home per concept</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {([
                { concept: 'Program operations & blueprints',  path: '/program' },
                { concept: 'Program data records (CMS edit)',  path: '/admin → Program Records' },
                { concept: 'Penny capabilities & AI ops',      path: '/penny' },
                { concept: 'Penny capability records (CMS)',   path: '/admin → Penny Capability Records' },
                { concept: 'People, roles &amp; access tiers',   path: '/admin/people-access' },
                { concept: 'Source docs & knowledge',          path: '/knowledge' },
                { concept: 'Integration credentials & auth',   path: '/admin/secrets-audit' },
              ] as const).map(row => (
                <div key={row.concept} className="flex items-center gap-2 text-[11px]">
                  <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                  <span className="text-muted-foreground flex-1">{row.concept}</span>
                  <code className="text-[10px] font-mono text-foreground bg-background border border-border/40 px-1.5 py-0.5 rounded shrink-0 ml-2">{row.path}</code>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 1: Knowledge Management CMS ── */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">Knowledge Management</p>
            <div className="grid grid-cols-3 gap-3">
              {cmsAreas.map(area => (
                <button
                  key={area.id}
                  onClick={() => onNavigate(area.id)}
                  className={`text-left p-4 rounded-lg border bg-card transition-all duration-150 hover:shadow-sm group ${area.borderColor}`}
                >
                  <div className="flex items-start justify-between mb-2.5">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${area.iconBg}`}>
                      {area.icon}
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold tabular-nums">{area.count}</Badge>
                  </div>
                  <p className="font-semibold text-foreground text-sm mb-1.5">{area.label}</p>
                  <p className="text-[12px] text-muted-foreground leading-snug line-clamp-3">{area.description}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    <span>Manage</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Section 2: Platform Administration ── */}
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">Platform Administration</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setLocation('/admin/people-access')}
                className="text-left p-4 rounded-lg border bg-card border-indigo-200 hover:border-indigo-400 transition-all duration-150 hover:shadow-sm group"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-700">
                    <Users className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">People · Access</Badge>
                </div>
                <p className="font-semibold text-foreground text-sm mb-1.5">People &amp; Access</p>
                <p className="text-[12px] text-muted-foreground leading-snug">
                  Personas, organizational roles, access tiers, Google Groups mapping, navigation visibility matrix, and feature permission grid.
                </p>
                <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  <span>Open</span><ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              <div className="p-4 rounded-lg border border-dashed border-border/50 bg-muted/10">
                <div className="flex items-start justify-between mb-2.5">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-muted/60 text-muted-foreground/50">
                    <Lock className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold text-muted-foreground/60">Phase 2</Badge>
                </div>
                <p className="font-semibold text-muted-foreground/50 text-sm mb-1.5">Platform Controls</p>
                <p className="text-[12px] text-muted-foreground/40 leading-snug">
                  User provisioning, permissions configuration, settings, and template management — planned for Phase 2.
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 3: Setup & Integration ── */}
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">Setup &amp; Integration</p>
            <div className="grid grid-cols-3 gap-3">
              {/* Primary Setup entry — spans full row visually as the command center */}
              <button
                onClick={() => setLocation('/admin/setup')}
                className="text-left p-4 rounded-lg border bg-card border-amber-200 hover:border-amber-400 transition-all duration-150 hover:shadow-sm group col-span-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-amber-50 text-amber-700">
                      <Plug className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-foreground text-sm">Setup</p>
                        <Badge variant="secondary" className="text-xs font-semibold">Command Center</Badge>
                      </div>
                      <p className="text-[12px] text-muted-foreground leading-snug max-w-2xl">
                        One view of every integration, credential, and readiness area — Salesforce, Slack, Google Workspace, Gemini AI, Phase 1 readiness, Phase 2 backlog, UX standards, secrets audit, and access matrix.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4 text-xs text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0">
                    <span>Open</span><ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setLocation('/admin/integration-readiness')}
                className="text-left p-4 rounded-lg border bg-card border-violet-200 hover:border-violet-400 transition-all duration-150 hover:shadow-sm group"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-violet-50 text-violet-700">
                    <Plug className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">17 integrations</Badge>
                </div>
                <p className="font-semibold text-foreground text-sm mb-1.5">Integration Readiness Center</p>
                <p className="text-[12px] text-muted-foreground leading-snug">
                  Full integration planning workspace — catalog, data flow, auth, field mapping, sync readiness, risk register, testing, and launch planning.
                </p>
                <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  <span>Open</span><ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              <button
                onClick={() => setLocation('/admin/salesforce-arch')}
                className="text-left p-4 rounded-lg border bg-card border-blue-200 hover:border-blue-400 transition-all duration-150 hover:shadow-sm group"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-700">
                    <Database className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">Mapping</Badge>
                </div>
                <p className="font-semibold text-foreground text-sm mb-1.5">Salesforce Architecture</p>
                <p className="text-[12px] text-muted-foreground leading-snug">
                  Object-level mapping between Trail OS, Salesforce (NPSP · PMM · Nonprofit Cloud), and Google Drive. Visual map, table, and by-product views.
                </p>
                <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  <span>Open</span><ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              <button
                onClick={() => setLocation('/admin/create-audit')}
                className="text-left p-4 rounded-lg border bg-card border-slate-200 hover:border-slate-400 transition-all duration-150 hover:shadow-sm group"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-slate-50 text-slate-600">
                    <Plus className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">Audit</Badge>
                </div>
                <p className="font-semibold text-foreground text-sm mb-1.5">Create Actions Audit</p>
                <p className="text-[12px] text-muted-foreground leading-snug">
                  Full audit of every create/add action across Trail OS — workspaces covered, object types, entry points, and read-only views.
                </p>
                <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  <span>Open</span><ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            {/* Compact readiness drill-ins */}
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {[
                { label: 'Phase 1 Readiness',   badge: 'Phase 1',   href: '/admin/phase1-readiness',  cls: 'border-amber-200 hover:border-amber-400'   },
                { label: 'Phase 1 UX Standards', badge: 'Standards', href: '/admin/ux-standards',      cls: 'border-indigo-200 hover:border-indigo-400'  },
                { label: 'Phase 2 Backlog',      badge: '10 items',  href: '/admin/phase2-backlog',     cls: 'border-stone-200 hover:border-stone-400'    },
              ].map(item => (
                <button
                  key={item.href}
                  onClick={() => setLocation(item.href)}
                  className={`text-left px-3 py-2.5 rounded-md border bg-card transition-all duration-150 hover:shadow-sm group flex items-center justify-between ${item.cls}`}
                >
                  <span className="text-[12px] font-medium text-foreground">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px] font-semibold">{item.badge}</Badge>
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Prototype notice */}
          <div className="mt-8 p-4 rounded-lg bg-muted/40 border border-border/40 text-[12px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Prototype admin.</strong> Edits apply to this browser session only and reset on page refresh.
            This admin is not yet connected to Google Drive or a database.
            A future version will write edits back to a connected knowledge store.
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Two-pane area editor ──────────────────────────────────────────────────────

function AreaEditor({
  view, selectedId, onSelect, search, onSearch, onBack,
}: {
  view: AdminView;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  search: string;
  onSearch: (s: string) => void;
  onBack: () => void;
}) {
  const ctx = useAppContext();

  const areaLabels: Record<AdminView, string> = {
    home: '',
    programs: 'Program Records',
    documents: 'Source Documents',
    resolve: 'RESOLVE Framework',
    penny: 'Penny Capability Records',
    trailOs: 'Trail OS Capabilities',
    integrations: 'Integration Config',
    roles: 'Roles',
    templates: 'Templates',
    users: 'Users',
    permissions: 'Permissions',
    settings: 'Settings',
  };

  const STUB_VIEWS = new Set<AdminView>(['roles', 'templates', 'users', 'permissions', 'settings']);

  if (STUB_VIEWS.has(view)) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-card flex-shrink-0">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Administration
          </button>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-xs font-medium text-foreground">{areaLabels[view]}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1.5">{areaLabels[view]}</p>
          <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
            This administration section is being built. Configuration and management tools will be added in a future sprint.
          </p>
        </div>
      </div>
    );
  }

  type ListRecord = { id: string; name: string; confidence?: string; category?: string };

  const allRecords: ListRecord[] = (() => {
    if (view === 'programs')     return ctx.programs.map(p => ({ id: p.id, name: p.name, confidence: p.confidence }));
    if (view === 'documents')    return ctx.sourceDocuments.map(d => ({ id: d.id, name: d.name, confidence: d.confidence, category: d.category }));
    if (view === 'resolve')      return ctx.resolvePhases.map(r => ({ id: r.id, name: `${r.letter} — ${r.name}`, confidence: r.confidence }));
    if (view === 'penny')        return ctx.pennyCapabilities.map(p => ({ id: p.id, name: p.name, confidence: p.confidence }));
    if (view === 'trailOs')      return ctx.trailOsCapabilities.map(t => ({ id: t.id, name: t.name, confidence: t.confidence }));
    if (view === 'integrations') return [{ id: 'salesforce', name: 'Salesforce Cases Kanban' }];
    return [];
  })();

  const filtered = allRecords.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-card flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Knowledge Base
        </button>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-xs font-medium text-foreground">{areaLabels[view]}</span>
        <Badge variant="secondary" className="text-[10px] tabular-nums ml-1">{allRecords.length}</Badge>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* ── Left list panel ── */}
        <div className="w-64 flex-shrink-0 border-r flex flex-col bg-muted/10">
          <div className="p-3 border-b bg-card">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={e => onSearch(e.target.value)}
                placeholder="Search records..."
                className="pl-8 h-8 text-xs bg-white"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="py-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-xs text-muted-foreground text-center">No records match.</p>
              ) : (
                filtered.map(record => (
                  <button
                    key={record.id}
                    onClick={() => onSelect(record.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-border/30 last:border-0 transition-colors ${
                      selectedId === record.id
                        ? 'bg-primary/5 border-l-[3px] border-l-primary pl-[9px]'
                        : 'hover:bg-muted/50 border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{record.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {record.confidence && (
                        <ConfidenceBadge status={record.confidence as any} />
                      )}
                      {record.category && (
                        <span className="text-[10px] text-muted-foreground">{record.category}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ── Right editor panel ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-card">
          {!selectedId ? (
            <SelectPrompt areaLabel={areaLabels[view]} count={allRecords.length} />
          ) : view === 'programs' ? (
            <ProgramEditor id={selectedId} />
          ) : view === 'documents' ? (
            <DocumentEditor id={selectedId} />
          ) : view === 'resolve' ? (
            <ResolvePhaseEditor id={selectedId} />
          ) : view === 'penny' ? (
            <PennyCapabilityEditor id={selectedId} />
          ) : view === 'trailOs' ? (
            <TrailOsCapabilityEditor id={selectedId} />
          ) : view === 'integrations' ? (
            <SalesforceEditor />
          ) : null}
        </div>

      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function SelectPrompt({ areaLabel, count }: { areaLabel: string; count: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-muted/5">
      <div className="w-10 h-10 rounded-full bg-muted/70 flex items-center justify-center mb-4">
        <FileText className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1.5">Select a record to edit</p>
      <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed mb-4">
        Choose one of the {count} {areaLabel.toLowerCase()} records from the list on the left.
      </p>
      <div className="text-[11px] text-muted-foreground/70 bg-muted/50 border border-border/50 rounded-lg px-4 py-3 max-w-[280px] leading-relaxed">
        Changes apply to this session only and reset on refresh. A future version will persist edits to a connected knowledge store.
      </div>
    </div>
  );
}

// ─── Shared utilities ──────────────────────────────────────────────────────────

function useSaveState() {
  const [dirty, setDirty]   = useState(false);
  const [saved, setSaved]   = useState(false);

  function markDirty()    { setDirty(true);  setSaved(false); }
  function markSaved()    { setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2500); }
  function markCanceled() { setDirty(false); setSaved(false); }

  return { dirty, saved, markDirty, markSaved, markCanceled };
}

function FormHeader({
  name, entityLabel, confidence, dirty, saved, onSave, onCancel,
}: {
  name: string; entityLabel: string; confidence?: string;
  dirty: boolean; saved: boolean; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b bg-card flex-shrink-0">
      <div className="min-w-0 mr-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{entityLabel}</span>
          {confidence && <ConfidenceBadge status={confidence as any} />}
        </div>
        <p className="font-serif font-semibold text-foreground text-base leading-tight mt-0.5 line-clamp-1">{name}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-primary font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
          </span>
        )}
        {dirty && !saved && (
          <span className="text-[11px] text-amber-600 font-medium">Unsaved changes</span>
        )}
        <Button variant="outline" size="sm" onClick={onCancel} disabled={!dirty} className="h-7 text-xs">
          <X className="w-3.5 h-3.5 mr-1" />Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={!dirty} className="h-7 text-xs">
          <Save className="w-3.5 h-3.5 mr-1" />Save
        </Button>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-1.5">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FormRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
      {children}
    </div>
  );
}

function ConfidenceSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-8 rounded-md border border-input bg-white px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <option value="confirmed">Confirmed</option>
      <option value="needs-review">Needs Review</option>
      <option value="draft">Draft</option>
      <option value="deprecated">Deprecated</option>
    </select>
  );
}

function MultilineField({
  label, hint, value, onChange, rows = 3,
}: {
  label: string; hint?: string; value: string[]; onChange: (v: string[]) => void; rows?: number;
}) {
  return (
    <FormRow label={label} hint={hint ?? 'One item per line.'}>
      <Textarea
        value={value.join('\n')}
        onChange={e => onChange(e.target.value === '' ? [] : e.target.value.split('\n'))}
        rows={rows}
        className="text-xs resize-none"
      />
    </FormRow>
  );
}

// ─── Program editor ────────────────────────────────────────────────────────────

function ProgramEditor({ id }: { id: string }) {
  const { programs, updateProgram } = useAppContext();
  const original = programs.find(p => p.id === id)!;
  const [form, setForm] = useState<Program>({ ...original });
  const { dirty, saved, markDirty, markSaved, markCanceled } = useSaveState();

  useEffect(() => { setForm({ ...original }); markCanceled(); }, [id]);

  function set<K extends keyof Program>(key: K, val: Program[K]) {
    setForm(f => ({ ...f, [key]: val }));
    markDirty();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FormHeader
        name={form.name} entityLabel="Program" confidence={form.confidence}
        dirty={dirty} saved={saved}
        onSave={() => { updateProgram(id, form); markSaved(); }}
        onCancel={() => { setForm({ ...original }); markCanceled(); }}
      />
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-7 max-w-2xl">

          <FormSection title="Core Info">
            <FormRow label="Program Name">
              <Input value={form.name} onChange={e => set('name', e.target.value)} className="text-xs h-8" />
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Confidence">
                <ConfidenceSelect value={form.confidence ?? 'needs-review'} onChange={v => set('confidence', v as any)} />
              </FormRow>
              <FormRow label="Duration">
                <Input value={form.duration ?? ''} onChange={e => set('duration', e.target.value)} className="text-xs h-8" placeholder="e.g. 4 weeks" />
              </FormRow>
            </div>
            <FormRow label="Format">
              <Input value={form.format ?? ''} onChange={e => set('format', e.target.value)} className="text-xs h-8" placeholder="e.g. Cohort-based, self-paced" />
            </FormRow>
          </FormSection>

          <FormSection title="Positioning">
            <FormRow label="Strategic Role" hint="Short phrase for the colored card header.">
              <Input value={form.strategicRole ?? ''} onChange={e => set('strategicRole', e.target.value)} className="text-xs h-8" />
            </FormRow>
            <FormRow label="Core Outcome" hint="Primary learner outcome — shown in the card body.">
              <Textarea value={form.coreOutcome ?? ''} onChange={e => set('coreOutcome', e.target.value)} rows={2} className="text-xs resize-none" />
            </FormRow>
            <FormRow label="Audience" hint="Who this program is designed for. Separate multiple with semicolons.">
              <Textarea value={form.audience ?? ''} onChange={e => set('audience', e.target.value)} rows={2} className="text-xs resize-none" />
            </FormRow>
            <FormRow label="Prerequisites / Dependencies">
              <Input value={form.dependencies ?? ''} onChange={e => set('dependencies', e.target.value)} className="text-xs h-8" placeholder="e.g. Explorer's Trail completion" />
            </FormRow>
          </FormSection>

          <FormSection title="Decision Brief Content">
            <FormRow label="Executive Summary" hint="Full narrative for the Follow the Trail panel.">
              <Textarea value={form.executiveSummary ?? ''} onChange={e => set('executiveSummary', e.target.value)} rows={4} className="text-xs resize-none" />
            </FormRow>
            <FormRow label="Why It Matters">
              <Textarea value={form.whyItMatters ?? ''} onChange={e => set('whyItMatters', e.target.value)} rows={3} className="text-xs resize-none" />
            </FormRow>
            <FormRow label="What Breaks If Missing">
              <Textarea value={form.whatBreaksIfMissing ?? ''} onChange={e => set('whatBreaksIfMissing', e.target.value)} rows={2} className="text-xs resize-none" />
            </FormRow>
          </FormSection>

        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Document editor ───────────────────────────────────────────────────────────

function DocumentEditor({ id }: { id: string }) {
  const { sourceDocuments, updateDocument } = useAppContext();
  const original = sourceDocuments.find(d => d.id === id)!;
  const [form, setForm] = useState<SourceDocument>({ ...original });
  const { dirty, saved, markDirty, markSaved, markCanceled } = useSaveState();

  useEffect(() => { setForm({ ...original }); markCanceled(); }, [id]);

  function set<K extends keyof SourceDocument>(key: K, val: SourceDocument[K]) {
    setForm(f => ({ ...f, [key]: val }));
    markDirty();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FormHeader
        name={form.name} entityLabel="Source Document" confidence={form.confidence}
        dirty={dirty} saved={saved}
        onSave={() => { updateDocument(id, form); markSaved(); }}
        onCancel={() => { setForm({ ...original }); markCanceled(); }}
      />
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-7 max-w-2xl">

          <FormSection title="Core Info">
            <FormRow label="Document Name">
              <Input value={form.name} onChange={e => set('name', e.target.value)} className="text-xs h-8" />
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Category">
                <Input value={form.category} onChange={e => set('category', e.target.value)} className="text-xs h-8" placeholder="Strategy, Brand, Curriculum…" />
              </FormRow>
              <FormRow label="Status">
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value as any)}
                  className="w-full h-8 rounded-md border border-input bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option>Active</option>
                  <option>Draft</option>
                  <option>Deprecated</option>
                  <option>Archived</option>
                </select>
              </FormRow>
              <FormRow label="Confidence">
                <ConfidenceSelect value={form.confidence} onChange={v => set('confidence', v as any)} />
              </FormRow>
              <FormRow label="Owner">
                <Input value={form.owner} onChange={e => set('owner', e.target.value)} className="text-xs h-8" />
              </FormRow>
            </div>
            <FormRow label="Last Updated">
              <Input value={form.lastUpdated} onChange={e => set('lastUpdated', e.target.value)} className="text-xs h-8" placeholder="e.g. Jun 2025" />
            </FormRow>
            <FormRow label="Google Drive URL" hint="Link to the official source document in Google Drive or another shared location.">
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={form.driveUrl ?? ''}
                  onChange={e => set('driveUrl', e.target.value || undefined)}
                  className="text-xs h-8 flex-1"
                  placeholder="https://docs.google.com/…"
                />
                {form.driveUrl && (
                  <a
                    href={form.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 h-8 rounded-md border border-input bg-white text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open
                  </a>
                )}
              </div>
            </FormRow>
          </FormSection>

          <FormSection title="Content">
            <FormRow label="Summary" hint="1–2 sentence overview shown in the dashboard.">
              <Textarea value={form.summary} onChange={e => set('summary', e.target.value)} rows={3} className="text-xs resize-none" />
            </FormRow>
            <FormRow label="Purpose">
              <Textarea value={form.purpose} onChange={e => set('purpose', e.target.value)} rows={2} className="text-xs resize-none" />
            </FormRow>
            <FormRow label="Quick Take" hint="One sentence summarising when to consult this document.">
              <Input value={form.quickTake} onChange={e => set('quickTake', e.target.value)} className="text-xs h-8" />
            </FormRow>
          </FormSection>

          <FormSection title="Source of Truth Mapping">
            <MultilineField
              label="Source of Truth For"
              hint="What this document is the definitive reference for."
              value={form.sourceOfTruthFor}
              onChange={v => set('sourceOfTruthFor', v)}
              rows={4}
            />
            <MultilineField
              label="Not Source of Truth For"
              hint="What this document explicitly does NOT govern."
              value={form.notSourceOfTruthFor}
              onChange={v => set('notSourceOfTruthFor', v)}
              rows={3}
            />
            <MultilineField
              label="Key Decisions Influenced"
              value={form.keyDecisionsInfluenced}
              onChange={v => set('keyDecisionsInfluenced', v)}
              rows={3}
            />
          </FormSection>

          <FormSection title="Relationships">
            <MultilineField
              label="Programs"
              hint="Programs this document applies to. Use 'All' for org-wide."
              value={form.programs}
              onChange={v => set('programs', v)}
              rows={3}
            />
            <MultilineField
              label="Related Documents"
              value={form.relatedDocuments}
              onChange={v => set('relatedDocuments', v)}
              rows={3}
            />
          </FormSection>

        </div>
      </ScrollArea>
    </div>
  );
}

// ─── RESOLVE phase editor ──────────────────────────────────────────────────────

function ResolvePhaseEditor({ id }: { id: string }) {
  const { resolvePhases, updateResolvePhase } = useAppContext();
  const original = resolvePhases.find(p => p.id === id)!;
  const [form, setForm] = useState<ResolvePhase>({ ...original });
  const { dirty, saved, markDirty, markSaved, markCanceled } = useSaveState();

  useEffect(() => { setForm({ ...original }); markCanceled(); }, [id]);

  function set<K extends keyof ResolvePhase>(key: K, val: ResolvePhase[K]) {
    setForm(f => ({ ...f, [key]: val }));
    markDirty();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FormHeader
        name={`${form.letter} — ${form.name}`} entityLabel="RESOLVE Phase" confidence={form.confidence}
        dirty={dirty} saved={saved}
        onSave={() => { updateResolvePhase(id, form); markSaved(); }}
        onCancel={() => { setForm({ ...original }); markCanceled(); }}
      />
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-7 max-w-2xl">

          <FormSection title="Core Info">
            <div className="grid grid-cols-4 gap-3">
              <FormRow label="Letter">
                <Input value={form.letter} onChange={e => set('letter', e.target.value)} className="text-xs h-8" placeholder="R" />
              </FormRow>
              <div className="col-span-3">
                <FormRow label="Phase Name">
                  <Input value={form.name} onChange={e => set('name', e.target.value)} className="text-xs h-8" />
                </FormRow>
              </div>
            </div>
            <FormRow label="Confidence">
              <ConfidenceSelect value={form.confidence ?? 'needs-review'} onChange={v => set('confidence', v as any)} />
            </FormRow>
          </FormSection>

          <FormSection title="Content">
            <FormRow label="Purpose" hint="Short phrase — what this phase accomplishes.">
              <Input value={form.purpose ?? ''} onChange={e => set('purpose', e.target.value)} className="text-xs h-8" />
            </FormRow>
            <FormRow label="Executive Summary">
              <Textarea value={form.executiveSummary ?? ''} onChange={e => set('executiveSummary', e.target.value)} rows={4} className="text-xs resize-none" />
            </FormRow>
            <FormRow label="Why It Matters">
              <Textarea value={form.whyItMatters ?? ''} onChange={e => set('whyItMatters', e.target.value)} rows={3} className="text-xs resize-none" />
            </FormRow>
            <FormRow label="Source Note" hint="Where the operational detail for this phase comes from, or 'Source mapping needed'.">
              <Textarea value={form.sourceNote ?? ''} onChange={e => set('sourceNote', e.target.value)} rows={2} className="text-xs resize-none" />
            </FormRow>
          </FormSection>

          <FormSection title="Relationships">
            <MultilineField
              label="Related Programs"
              value={form.relatedPrograms}
              onChange={v => set('relatedPrograms', v)}
              rows={3}
            />
            <MultilineField
              label="Source Documents"
              value={form.docs}
              onChange={v => set('docs', v)}
              rows={3}
            />
          </FormSection>

        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Penny capability editor ───────────────────────────────────────────────────

function PennyCapabilityEditor({ id }: { id: string }) {
  const { pennyCapabilities, updatePennyCapability } = useAppContext();
  const original = pennyCapabilities.find(p => p.id === id)!;
  const [form, setForm] = useState<PennyCapability>({ ...original });
  const { dirty, saved, markDirty, markSaved, markCanceled } = useSaveState();

  useEffect(() => { setForm({ ...original }); markCanceled(); }, [id]);

  function set<K extends keyof PennyCapability>(key: K, val: PennyCapability[K]) {
    setForm(f => ({ ...f, [key]: val }));
    markDirty();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FormHeader
        name={form.name} entityLabel="Penny AI Capability" confidence={form.confidence}
        dirty={dirty} saved={saved}
        onSave={() => { updatePennyCapability(id, form); markSaved(); }}
        onCancel={() => { setForm({ ...original }); markCanceled(); }}
      />
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-7 max-w-2xl">

          <FormSection title="Core Info">
            <FormRow label="Capability Name">
              <Input value={form.name} onChange={e => set('name', e.target.value)} className="text-xs h-8" />
            </FormRow>
            <FormRow label="Confidence">
              <ConfidenceSelect value={form.confidence} onChange={v => set('confidence', v as any)} />
            </FormRow>
            <FormRow label="Purpose" hint="Short phrase — what this capability does.">
              <Input value={form.purpose} onChange={e => set('purpose', e.target.value)} className="text-xs h-8" />
            </FormRow>
          </FormSection>

          <FormSection title="Content">
            <FormRow label="Executive Summary">
              <Textarea value={form.executiveSummary} onChange={e => set('executiveSummary', e.target.value)} rows={4} className="text-xs resize-none" />
            </FormRow>
            <FormRow label="Why It Matters">
              <Textarea value={form.whyItMatters} onChange={e => set('whyItMatters', e.target.value)} rows={3} className="text-xs resize-none" />
            </FormRow>
            <MultilineField
              label="Key Facts"
              value={form.keyFacts}
              onChange={v => set('keyFacts', v)}
              rows={4}
            />
          </FormSection>

          <FormSection title="Relationships">
            <MultilineField
              label="Programs"
              hint="Programs where this capability is active."
              value={form.programs}
              onChange={v => set('programs', v)}
              rows={3}
            />
            <MultilineField
              label="Trail OS Capabilities"
              hint="Trail OS capabilities this Penny capability works alongside."
              value={form.trailOsCapabilities}
              onChange={v => set('trailOsCapabilities', v)}
              rows={2}
            />
            <MultilineField
              label="Source Documents"
              value={form.docs}
              onChange={v => set('docs', v)}
              rows={2}
            />
          </FormSection>

        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Trail OS capability editor ────────────────────────────────────────────────

function TrailOsCapabilityEditor({ id }: { id: string }) {
  const { trailOsCapabilities, updateTrailOsCapability } = useAppContext();
  const original = trailOsCapabilities.find(t => t.id === id)!;
  const [form, setForm] = useState<TrailOsCapability>({ ...original });
  const { dirty, saved, markDirty, markSaved, markCanceled } = useSaveState();

  useEffect(() => { setForm({ ...original }); markCanceled(); }, [id]);

  function set<K extends keyof TrailOsCapability>(key: K, val: TrailOsCapability[K]) {
    setForm(f => ({ ...f, [key]: val }));
    markDirty();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FormHeader
        name={form.name} entityLabel="Trail OS Capability" confidence={form.confidence}
        dirty={dirty} saved={saved}
        onSave={() => { updateTrailOsCapability(id, form); markSaved(); }}
        onCancel={() => { setForm({ ...original }); markCanceled(); }}
      />
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-7 max-w-2xl">

          <FormSection title="Core Info">
            <FormRow label="Capability Name">
              <Input value={form.name} onChange={e => set('name', e.target.value)} className="text-xs h-8" />
            </FormRow>
            <FormRow label="Confidence">
              <ConfidenceSelect value={form.confidence} onChange={v => set('confidence', v as any)} />
            </FormRow>
            <FormRow label="Description" hint="One-sentence operational summary shown on the map tile.">
              <Input value={form.description} onChange={e => set('description', e.target.value)} className="text-xs h-8" />
            </FormRow>
          </FormSection>

          <FormSection title="Content">
            <FormRow label="Executive Summary">
              <Textarea value={form.executiveSummary} onChange={e => set('executiveSummary', e.target.value)} rows={4} className="text-xs resize-none" />
            </FormRow>
            <FormRow label="Why It Matters">
              <Textarea value={form.whyItMatters} onChange={e => set('whyItMatters', e.target.value)} rows={3} className="text-xs resize-none" />
            </FormRow>
            <MultilineField
              label="Key Facts"
              value={form.keyFacts}
              onChange={v => set('keyFacts', v)}
              rows={4}
            />
          </FormSection>

          <FormSection title="Relationships">
            <MultilineField
              label="Programs"
              hint="Programs this capability supports."
              value={form.programs}
              onChange={v => set('programs', v)}
              rows={3}
            />
            <MultilineField
              label="Penny Capabilities"
              hint="Penny AI capabilities connected to this Trail OS capability."
              value={form.penny}
              onChange={v => set('penny', v)}
              rows={2}
            />
            <MultilineField
              label="RESOLVE Phases"
              hint="RESOLVE phases this capability supports."
              value={form.resolve}
              onChange={v => set('resolve', v)}
              rows={2}
            />
          </FormSection>

        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Salesforce / Integrations ─────────────────────────────────────────────────

function SalesforceEditor() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b bg-card flex-shrink-0">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Integration</span>
          <p className="font-serif font-semibold text-foreground text-base leading-tight mt-0.5">Salesforce Cases Kanban</p>
        </div>
        <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">Future State</Badge>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-6 max-w-xl">
          <div className="p-4 rounded-lg bg-muted/40 border border-border/60 text-sm text-muted-foreground leading-relaxed">
            The Salesforce Cases Kanban is a future-state feature. When connected, it will display live Salesforce case data
            alongside the program pipeline. No configuration is active yet.
          </div>

          <FormSection title="Connection Settings (Future)">
            <FormRow label="Salesforce Instance URL" hint="Your Salesforce org URL (e.g. https://mycompany.my.salesforce.com).">
              <Input disabled placeholder="Not configured" className="text-xs h-8 opacity-50" />
            </FormRow>
            <FormRow label="Case Object / View" hint="Which Salesforce Case list view or report to surface in the Kanban.">
              <Input disabled placeholder="Not configured" className="text-xs h-8 opacity-50" />
            </FormRow>
          </FormSection>

          <FormSection title="Display Settings (Future)">
            <FormRow label="Columns" hint="Comma-separated Kanban column names.">
              <Input disabled placeholder="Open, In Progress, Pending, Closed" className="text-xs h-8 opacity-50" />
            </FormRow>
            <FormRow label="Card Fields" hint="Which case fields appear on each Kanban card.">
              <Input disabled placeholder="Subject, Account, Priority, Owner" className="text-xs h-8 opacity-50" />
            </FormRow>
          </FormSection>

          <p className="text-[11px] text-muted-foreground">
            To enable this integration, a Salesforce Connected App and OAuth credentials are required.
            Contact the platform administrator to configure the connection.
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
