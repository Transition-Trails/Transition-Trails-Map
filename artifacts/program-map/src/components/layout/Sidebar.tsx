import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Home, Network, Activity, GraduationCap, Brain, BookOpen, MessageSquare, Settings,
  ChevronDown, Search, Target,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { type AccessTier, canAccess, TIER_CONFIG } from '@/config/accessTiers';

type NavItem =
  | { id: string; path: string; label: string; isLabel?: false; minTier?: AccessTier }
  | { id: string; label: string; isLabel: true };

type NavGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathPrefix: string;
  extraPrefixes?: string[];
  items: NavItem[];
  minTier?: AccessTier;
};

const navGroups: NavGroup[] = [
  {
    id: 'digital-twin',
    minTier: 'power',
    label: 'Digital Twin',
    icon: Network,
    pathPrefix: '/digital-twin',
    extraPrefixes: ['/uom', '/governance'],
    items: [
      { id: 'dt-explore',    path: '/digital-twin',              label: 'Explore' },
      { id: 'dt-map',        path: '/digital-twin/map',          label: 'Map',        minTier: 'admin' },
      { id: 'dt-impact',     path: '/digital-twin/impact',       label: 'Impact',     minTier: 'admin' },
      { id: 'dt-governance', path: '/digital-twin/governance',   label: 'Governance', minTier: 'admin' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Activity,
    pathPrefix: '/operations',
    items: [
      { id: 'ops-overview',      path: '/operations',              label: 'Executive Overview' },
      { id: 'ops-health',        path: '/operations/health',       label: 'Health Indicators' },
      { id: 'ops-integrations',  path: '/operations/integrations', label: 'Integration Readiness', minTier: 'power' },
      { id: 'ops-scorecards',    path: '/operations/scorecards',   label: 'Scorecards',            minTier: 'power' },
      { id: 'ops-trends',        path: '/operations/trends',       label: 'Trends & Insights',     minTier: 'power' },
      { id: 'ops-demand',        path: '/operations/demand',       label: 'Demand',                minTier: 'power' },
    ],
  },
  {
    id: 'program',
    label: 'Programs',
    icon: GraduationCap,
    pathPrefix: '/program',
    items: [
      { id: 'prog-programs',   path: '/program',            label: 'Programs' },
      { id: 'prog-standards',  path: '/program/standards',  label: 'Standards',       minTier: 'power' },
      { id: 'prog-blueprint',  path: '/program/blueprint',  label: 'Blueprint' },
      { id: 'prog-salesforce', path: '/program/salesforce', label: 'Salesforce Arch', minTier: 'power' },
      { id: 'prog-resources',  path: '/program/resources',  label: 'Resources',       minTier: 'power' },
    ],
  },
  {
    id: 'penny',
    label: 'Penny',
    icon: Brain,
    pathPrefix: '/penny',
    items: [
      { id: 'penny-capabilities',  path: '/penny',              label: 'Capabilities',  minTier: 'power' },
      { id: 'penny-prompts',       path: '/penny/prompts',      label: 'Prompt Studio', minTier: 'power' },
      { id: 'penny-learners',      path: '/penny/learners',     label: 'Learners' },
      { id: 'penny-intelligence',  path: '/penny/intelligence', label: 'Intelligence',  minTier: 'power' },
      { id: 'penny-trail-os-map',  path: '/penny/trail-os-map', label: 'Trail OS Map',  minTier: 'power' },
      { id: 'penny-test',          path: '/penny/test',         label: 'Test Penny',    minTier: 'power' },
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    icon: BookOpen,
    pathPrefix: '/knowledge',
    items: [
      { id: 'know-sources',       path: '/knowledge',               label: 'Sources',        minTier: 'power' },
      { id: 'know-library',       path: '/knowledge/library',       label: 'Library' },
      { id: 'know-relationships', path: '/knowledge/relationships', label: 'Relationships',  minTier: 'power' },
      { id: 'know-memory',        path: '/knowledge/memory',        label: 'Org Memory',     minTier: 'power' },
      { id: 'know-search',        path: '/knowledge/search',        label: 'Search' },
    ],
  },
  {
    id: 'collaboration',
    label: 'Collaboration',
    icon: MessageSquare,
    pathPrefix: '/collaboration',
    items: [
      { id: 'collab-overview',   path: '/collaboration',               label: 'Overview' },
      { id: 'collab-slack',      path: '/collaboration/slack',         label: 'Slack',            minTier: 'power' },
      { id: 'collab-drive',      path: '/collaboration/drive',         label: 'Google Drive',     minTier: 'power' },
      { id: 'collab-calendar',   path: '/collaboration/calendar',      label: 'Google Calendar' },
      { id: 'collab-channels',   path: '/collaboration/channels',      label: 'Channels',         minTier: 'power' },
      { id: 'collab-templates',  path: '/collaboration/templates',     label: 'Templates',        minTier: 'power' },
    ],
  },
  {
    id: 'admin',
    minTier: 'admin',
    label: 'Administration',
    icon: Settings,
    pathPrefix: '/admin',
    items: [
      { id: 'admin-setup',     path: '/admin',               label: 'Setup' },
      { id: 'admin-programs',  path: '/admin/programs',      label: 'Programs' },
      { id: 'admin-people',    path: '/admin/people',        label: 'People & Roles' },
      { id: 'admin-roles',     path: '/admin/roles',         label: 'Roles' },
      { id: 'admin-penny',     path: '/admin/penny',         label: 'Penny' },
      { id: 'admin-settings',  path: '/admin/settings',      label: 'Settings' },
      { id: 'admin-access',    path: '/admin/access-roles',  label: 'Access & Roles' },
      { id: 'lbl-integrations', label: 'Integrations', isLabel: true },
      { id: 'admin-secrets',   path: '/admin/secrets-audit', label: 'Secrets Audit' },
      { id: 'admin-gauth',     path: '/admin/google-oauth',  label: 'Google Auth Setup' },
      { id: 'lbl-readiness',   label: 'Readiness', isLabel: true },
      { id: 'admin-readiness', path: '/admin/phase1-readiness', label: 'Phase 1 Readiness' },
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
  const { userTier } = useAppContext();

  // Filter groups and items by access tier
  const visibleGroups = navGroups
    .filter(g => canAccess(g.minTier, userTier))
    .map(g => ({
      ...g,
      items: g.items.filter(item => {
        if (item.isLabel) return true;
        return canAccess(item.minTier, userTier);
      }),
    }));

  const activeGroupId = visibleGroups.find(g => isGroupActive(g, location))?.id;

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set([activeGroupId ?? 'operations'])
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

  const tier = TIER_CONFIG[userTier];

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

        {/* Nav groups — filtered by tier */}
        {visibleGroups.map(group => {
          const isOpen        = openGroups.has(group.id);
          const groupActive   = isGroupActive(group, location);
          const Icon          = group.icon;
          const visibleItems  = group.items;

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
                style={{ maxHeight: isOpen ? `${calcMaxHeight(visibleItems)}px` : '0px' }}
              >
                <div className="ml-4 border-l border-sidebar-border/60 mt-0.5 mb-1 space-y-0.5">
                  {visibleItems.map((item, idx) => {
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
                        key={item.id}
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

      {/* Footer — tier badge + prototype note */}
      <div className="px-3 py-2.5 border-t border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tier.dotClass}`} />
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${tier.badgeClass}`}>
            {tier.shortLabel}
          </span>
          <span className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wider">Prototype</span>
        </div>
        <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Phase 1 Architecture</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">v1.0 — Internal Prototype</p>
      </div>
    </div>
  );
}
