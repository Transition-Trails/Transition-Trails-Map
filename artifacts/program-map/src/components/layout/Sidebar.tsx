import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Home, Network, Activity, GraduationCap, Brain, BookOpen, MessageSquare, Settings,
  ChevronDown, Search, Target, Monitor, Sliders,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { type AccessTier, canAccess, TIER_CONFIG } from '@/config/accessTiers';
import { useTierFlags } from '@/hooks/useTierFlags';

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
      { id: 'dt-explore',    path: '/digital-twin',              label: 'Explore',    minTier: 'admin' },
      { id: 'dt-governance', path: '/digital-twin/governance',   label: 'Governance', minTier: 'admin' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Activity,
    pathPrefix: '/operations',
    items: [
      { id: 'ops-overview',         path: '/operations',                    label: 'Executive Overview',  minTier: 'admin' },
      { id: 'ops-health',           path: '/operations/health',             label: 'Health Indicators',   minTier: 'admin' },
      { id: 'ops-scorecards',       path: '/operations/scorecards',         label: 'Scorecards',          minTier: 'admin' },
      { id: 'ops-trends',           path: '/operations/trends',             label: 'Trends & Insights',   minTier: 'admin' },
      { id: 'ops-demand',           path: '/operations/demand',             label: 'Demand',              minTier: 'admin' },
      { id: 'ops-recommendations',  path: '/operations/recommendations',    label: 'Recommendations',     minTier: 'admin' },
    ],
  },
  {
    id: 'program',
    label: 'Programs',
    icon: GraduationCap,
    pathPrefix: '/program',
    items: [
      { id: 'prog-overview',   path: '/program',             label: 'Overview',        minTier: 'admin' },
      { id: 'prog-programs',   path: '/program/programs',    label: 'Programs',        minTier: 'admin' },
      { id: 'prog-standards',  path: '/program/standards',   label: 'Standards',       minTier: 'admin' },
      { id: 'prog-blueprint',  path: '/program/blueprint',   label: 'Blueprint',       minTier: 'admin' },
    ],
  },
  {
    id: 'penny',
    label: 'Penny',
    icon: Brain,
    pathPrefix: '/penny',
    items: [
      { id: 'penny-overview',      path: '/penny',               label: 'Overview',         minTier: 'admin' },
      { id: 'penny-operate-label', label: 'Operate',             isLabel: true },
      { id: 'penny-learners',      path: '/penny/learners',      label: 'Learners',         minTier: 'admin' },
      { id: 'penny-session-log',   path: '/penny/session-log',   label: 'Session Log',      minTier: 'admin' },
      { id: 'penny-trail-quests',  path: '/penny/trail-quests',  label: 'Trail Quests',     minTier: 'admin' },
      { id: 'penny-config-label',  label: 'Configure Penny',     isLabel: true },
      { id: 'penny-trail-configs', path: '/penny/trail-configs', label: 'Trail Configs',    minTier: 'admin' },
      { id: 'penny-prompts',       path: '/penny/prompts',       label: 'Prompt Studio',    minTier: 'admin' },
      { id: 'penny-capabilities',  path: '/penny/capabilities',  label: 'Capabilities',     minTier: 'admin' },
      { id: 'penny-admin-label',   label: 'Admin',               isLabel: true },
      { id: 'penny-sandbox',       path: '/penny/penny-sandbox', label: 'Penny Sandbox',    minTier: 'admin' },
      { id: 'penny-logs',          path: '/penny/penny-logs',    label: 'Penny Logs',       minTier: 'admin' },
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    icon: BookOpen,
    pathPrefix: '/knowledge',
    items: [
      { id: 'know-overview', path: '/knowledge',         label: 'Overview', minTier: 'admin' },
      { id: 'know-sources',  path: '/knowledge/sources', label: 'Sources',  minTier: 'admin' },
      { id: 'know-library',  path: '/knowledge/library', label: 'Library',  minTier: 'admin' },
    ],
  },
  {
    id: 'collaboration',
    label: 'Collaboration',
    icon: MessageSquare,
    pathPrefix: '/collaboration',
    items: [
      { id: 'collab-overview',      path: '/collaboration',               label: 'Overview',         minTier: 'admin' },
      { id: 'collab-my-signals',    path: '/collaboration/my-signals',    label: 'My Trail Signals', minTier: 'power' },
      { id: 'collab-calendar-live', path: '/collaboration/calendar-live', label: 'Calendar',         minTier: 'power' },
      { id: 'collab-gmail',         path: '/collaboration/gmail',         label: 'Gmail',            minTier: 'power' },
      { id: 'collab-slack',         path: '/collaboration/slack',         label: 'Slack',     minTier: 'admin' },
      { id: 'collab-channels',      path: '/collaboration/channels',      label: 'Channels',  minTier: 'admin' },
      { id: 'collab-templates',     path: '/collaboration/templates',     label: 'Templates', minTier: 'admin' },
    ],
  },
  {
    id: 'admin',
    minTier: 'admin',
    label: 'Administration',
    icon: Settings,
    pathPrefix: '/admin',
    items: [
      { id: 'admin-home',          path: '/admin/setup',          label: 'Administration' },
      { id: 'admin-integrations',  path: '/admin/integrations',   label: 'Integrations'   },
      { id: 'admin-people-access', path: '/admin/people-access',  label: 'People & Access' },
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
  const { userTier, mobileSidebarOpen, setMobileSidebarOpen } = useAppContext();
  const { isEveryday, isAdminOrAbove } = useTierFlags();

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

  const topBtnCls = (active: boolean) =>
    `w-full flex items-center justify-center xl:justify-start gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-semibold transition-colors text-left ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    }`;

  const nav = (path: string) => { setLocation(path); setMobileSidebarOpen(false); };

  return (
    <>
      {/* Mobile backdrop — tapping outside closes the overlay */}
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/*
        Three responsive states (see src/config/responsive.ts):
        < md  → fixed overlay, hidden off-screen; shown when mobileSidebarOpen
        md–xl → 44px icon-only rail; always in flow; labels + sub-nav hidden
        ≥ xl  → 220px full sidebar; all content visible
      */}
      <div className={`
        fixed md:relative z-50 md:z-auto
        inset-y-0 left-0 md:inset-y-auto md:left-auto
        w-[220px] md:w-[44px] xl:w-[220px]
        flex-shrink-0 flex flex-col h-full
        bg-sidebar border-r border-sidebar-border
        transition-transform duration-200
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex-1 overflow-y-auto py-2 px-1 xl:px-2 space-y-0.5">

          {/* Home */}
          <button title="Home" onClick={() => nav('/')} className={topBtnCls(location === '/')}>
            <Home className={`w-4 h-4 flex-shrink-0 ${location === '/' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            <span className="hidden xl:inline">Home</span>
          </button>

          {/* Trail OS Overview */}
          <button title="Trail OS Overview" onClick={() => nav('/trail-os-overview')} className={topBtnCls(location === '/trail-os-overview')}>
            <Monitor className={`w-4 h-4 flex-shrink-0 ${location === '/trail-os-overview' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            <span className="hidden xl:inline">Trail OS Overview</span>
          </button>

          {/* Global Search */}
          <button title="Global Search" onClick={() => nav('/search')} className={topBtnCls(isSearch)}>
            <Search className={`w-4 h-4 flex-shrink-0 ${isSearch ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            <span className="hidden xl:inline">Global Search</span>
          </button>

          {/* Context Engine / Focus — Power+ only */}
          {!isEveryday && (
            <button
              title={isAdminOrAbove ? 'Context Engine' : 'Focus'}
              onClick={() => nav('/context')}
              className={topBtnCls(isContext)}
            >
              <Target className={`w-4 h-4 flex-shrink-0 ${isContext ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              <span className="hidden xl:inline">{isAdminOrAbove ? 'Context Engine' : 'Focus'}</span>
            </button>
          )}

          <div className="h-px bg-sidebar-border/60 mx-1 my-1" />

          {/* Nav groups */}
          {visibleGroups.map(group => {
            const isOpen      = openGroups.has(group.id);
            const groupActive = isGroupActive(group, location);
            const Icon        = group.icon;
            const visibleItems = group.items;

            return (
              <div key={group.id}>
                <button
                  title={group.label}
                  onClick={() => {
                    if (!isGroupActive(group, location)) setLocation(group.pathPrefix);
                    toggleGroup(group.id);
                  }}
                  className={`w-full flex items-center justify-center xl:justify-start gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-semibold transition-colors text-left ${
                    groupActive
                      ? 'text-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${groupActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="flex-1 truncate hidden xl:inline">{group.label}</span>
                  <ChevronDown className={`hidden xl:block w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
                </button>

                {/* Sub-nav — only visible at xl (full workspace); at md icon-rail, clicking the group header navigates */}
                <div
                  className="hidden xl:block overflow-hidden transition-all duration-200 ease-in-out"
                  style={{ maxHeight: isOpen ? `${calcMaxHeight(visibleItems)}px` : '0px' }}
                >
                  <div className="ml-4 border-l border-sidebar-border/60 mt-0.5 mb-1 space-y-0.5">
                    {visibleItems.map((item, idx) => {
                      if (item.isLabel) {
                        return (
                          <div key={`label-${idx}`} className="px-3 pt-2.5 pb-0.5">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">{item.label}</p>
                          </div>
                        );
                      }
                      const isActive = location === item.path ||
                        (item.path !== group.pathPrefix && location.startsWith(item.path + '/'));
                      return (
                        <button
                          key={item.id}
                          onClick={() => nav(item.path)}
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

        {/* Footer */}
        <div className="px-1 xl:px-3 py-2 border-t border-sidebar-border flex-shrink-0">
          <p className="hidden xl:block text-[9px] font-bold text-amber-600/70 uppercase tracking-wider">Phase 1 Architecture</p>
          <p className="hidden xl:block text-[9px] text-muted-foreground/40 mt-0.5">Trail OS v1.0 · Internal Prototype</p>
          <div className="xl:hidden flex justify-center py-0.5" title="Phase 1 · Trail OS v1.0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
          </div>
        </div>
      </div>
    </>
  );
}
