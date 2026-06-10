import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Home, Network, Activity, GraduationCap, Brain, BookOpen, MessageSquare, Settings,
  ChevronDown, Search, Target,
} from 'lucide-react';

type NavItem  = { path: string; label: string; isLabel?: false } | { label: string; isLabel: true };
type NavGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathPrefix: string;
  extraPrefixes?: string[];
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    id: 'digital-twin',
    label: 'Digital Twin',
    icon: Network,
    pathPrefix: '/digital-twin',
    extraPrefixes: ['/uom', '/governance'],
    items: [
      { path: '/digital-twin',              label: 'Explore' },
      { path: '/digital-twin/map',          label: 'Map' },
      { path: '/digital-twin/impact',       label: 'Impact' },
      { path: '/digital-twin/governance',   label: 'Governance' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Activity,
    pathPrefix: '/operations',
    items: [
      { path: '/operations',              label: 'Executive Overview' },
      { path: '/operations/health',       label: 'Health Indicators' },
      { path: '/operations/integrations', label: 'Integration Readiness' },
      { path: '/operations/scorecards',   label: 'Scorecards' },
      { path: '/operations/trends',       label: 'Trends & Insights' },
    ],
  },
  {
    id: 'program',
    label: 'Programs',
    icon: GraduationCap,
    pathPrefix: '/program',
    items: [
      { path: '/program',            label: 'Programs' },
      { path: '/program/standards',  label: 'Standards' },
      { path: '/program/blueprint',  label: 'Blueprint' },
      { path: '/program/salesforce', label: 'Salesforce Arch' },
      { path: '/program/resources',  label: 'Resources' },
    ],
  },
  {
    id: 'penny',
    label: 'Penny',
    icon: Brain,
    pathPrefix: '/penny',
    items: [
      { path: '/penny',              label: 'Capabilities' },
      { path: '/penny/prompts',      label: 'Prompt Studio' },
      { path: '/penny/learners',     label: 'Learners' },
      { path: '/penny/intelligence', label: 'Intelligence' },
      { path: '/penny/trail-os-map', label: 'Trail OS Map' },
      { path: '/penny/test',         label: 'Test Penny' },
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    icon: BookOpen,
    pathPrefix: '/knowledge',
    items: [
      { path: '/knowledge',               label: 'Sources' },
      { path: '/knowledge/library',       label: 'Library' },
      { path: '/knowledge/relationships', label: 'Relationships' },
      { path: '/knowledge/memory',        label: 'Org Memory' },
      { path: '/knowledge/search',        label: 'Search' },
    ],
  },
  {
    id: 'collaboration',
    label: 'Collaboration',
    icon: MessageSquare,
    pathPrefix: '/collaboration',
    items: [
      { path: '/collaboration',               label: 'Overview' },
      { path: '/collaboration/slack',         label: 'Slack' },
      { path: '/collaboration/drive',         label: 'Google Drive' },
      { path: '/collaboration/calendar',      label: 'Google Calendar' },
      { path: '/collaboration/channels',      label: 'Channels' },
      { path: '/collaboration/templates',     label: 'Templates' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: Settings,
    pathPrefix: '/admin',
    items: [
      { path: '/admin',          label: 'Setup' },
      { path: '/admin/programs', label: 'Programs' },
      { path: '/admin/people',   label: 'People & Roles' },
      { path: '/admin/roles',    label: 'Roles' },
      { path: '/admin/penny',    label: 'Penny' },
      { path: '/admin/settings', label: 'Settings' },
      { label: 'Integrations', isLabel: true },
      { path: '/admin/secrets-audit',  label: 'Secrets Audit' },
      { path: '/admin/google-oauth',   label: 'Google Auth Setup' },
      { label: 'Readiness', isLabel: true },
      { path: '/admin/phase1-readiness', label: 'Phase 1 Readiness' },
    ],
  },
];

function isGroupActive(group: NavGroup, location: string): boolean {
  if (location.startsWith(group.pathPrefix)) return true;
  return (group.extraPrefixes ?? []).some(p => location.startsWith(p));
}

function calcMaxHeight(items: NavItem[]): number {
  return items.reduce((sum, item) => sum + (item.isLabel ? 28 : 36), 0);
}

export function Sidebar() {
  const [location, setLocation] = useLocation();

  const activeGroupId = navGroups.find(g => isGroupActive(g, location))?.id;

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set([activeGroupId ?? 'digital-twin'])
  );

  useEffect(() => {
    if (activeGroupId) {
      setOpenGroups(prev => prev.has(activeGroupId) ? prev : new Set([...prev, activeGroupId]));
    }
  }, [activeGroupId]);

  function toggleGroup(id: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const isSearch  = location === '/search';
  const isContext = location === '/context' || location.startsWith('/context/');

  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">

        {/* Home */}
        <button
          onClick={() => setLocation('/')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-semibold transition-colors text-left ${
            location === '/'
              ? 'bg-primary text-primary-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }`}
        >
          <Home className={`w-4 h-4 flex-shrink-0 ${location === '/' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
          <span>Home</span>
        </button>

        {/* Global Search */}
        <button
          onClick={() => setLocation('/search')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-semibold transition-colors text-left ${
            isSearch
              ? 'bg-primary text-primary-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }`}
        >
          <Search className={`w-4 h-4 flex-shrink-0 ${isSearch ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
          <span>Global Search</span>
        </button>

        {/* Context Engine */}
        <button
          onClick={() => setLocation('/context')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-semibold transition-colors text-left ${
            isContext
              ? 'bg-primary text-primary-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }`}
        >
          <Target className={`w-4 h-4 flex-shrink-0 ${isContext ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
          <span>Context Engine</span>
        </button>

        <div className="h-px bg-sidebar-border/60 mx-1 my-1" />

        {/* Nav groups */}
        {navGroups.map(group => {
          const isOpen        = openGroups.has(group.id);
          const groupActive   = isGroupActive(group, location);
          const Icon          = group.icon;

          return (
            <div key={group.id}>
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-semibold transition-colors text-left ${
                  groupActive
                    ? 'text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${groupActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="flex-1 truncate">{group.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-200 ${
                    isOpen ? '' : '-rotate-90'
                  }`}
                />
              </button>

              <div
                className="overflow-hidden transition-all duration-200 ease-in-out"
                style={{ maxHeight: isOpen ? `${calcMaxHeight(group.items)}px` : '0px' }}
              >
                <div className="ml-4 border-l border-sidebar-border/60 mt-0.5 mb-1 space-y-0.5">
                  {group.items.map((item, idx) => {
                    if (item.isLabel) {
                      return (
                        <div key={`label-${idx}`} className="px-3 pt-2.5 pb-0.5">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                            {item.label}
                          </p>
                        </div>
                      );
                    }
                    const isActive = location === item.path ||
                      (item.path !== group.pathPrefix && location.startsWith(item.path + '/'));
                    return (
                      <button
                        key={item.path}
                        onClick={() => setLocation(item.path)}
                        className={`w-full text-left pl-3 pr-2 py-1.5 text-[12px] rounded-r-md transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        }`}
                      >
                        <span className="truncate block">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-sidebar-border flex-shrink-0">
        <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider text-center">Phase 1 Architecture Consolidation</p>
        <p className="text-[10px] text-muted-foreground text-center mt-0.5">v1.0 — Internal Prototype</p>
      </div>
    </div>
  );
}
