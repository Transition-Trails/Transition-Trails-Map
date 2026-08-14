import { useState, useEffect } from 'react';
import { TERMS } from '@/config/terminology';
import { APP_VERSION } from '@/config/version';
import { useSeenVersion } from '@/hooks/useSeenVersion';
import { useLocation } from 'wouter';
import {
  Home, Activity, GraduationCap, Brain, BookOpen, MessageSquare, Settings,
  ChevronDown, Search, CheckSquare, Briefcase,
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
  excludePrefixes?: string[];
  items: NavItem[];
  minTier?: AccessTier;
};

const navGroups: NavGroup[] = [
  {
    id: 'tasks',
    label: 'Tasks',
    icon: CheckSquare,
    pathPrefix: '/tasks',
    items: [
      { id: 'tasks-all', path: '/tasks', label: 'My Tasks' },
    ],
  },
  {
    id: 'cases',
    label: 'Cases',
    icon: Briefcase,
    pathPrefix: '/cases',
    items: [
      { id: 'cases-all', path: '/cases', label: 'My Cases' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Activity,
    pathPrefix: '/operations',
    items: [
      { id: 'ops-health',  path: '/operations/health',  label: 'Health Indicators', minTier: 'admin' },
      { id: 'ops-demand',  path: '/operations/demand',  label: 'Demand',            minTier: 'admin' },
    ],
  },
  {
    id: 'program',
    label: 'Programs',
    icon: GraduationCap,
    pathPrefix: '/program',
    items: [
      { id: 'prog-builder',    path: '/program',             label: 'Builder',          minTier: 'power' },
      { id: 'prog-governance', path: '/program/governance',  label: 'Governance',       minTier: 'admin' },
    ],
  },
  {
    id: 'penny',
    label: TERMS.aiAssistant,
    icon: Brain,
    pathPrefix: '/penny',
    items: [
      { id: 'penny-overview',      path: '/penny',               label: 'Overview',         minTier: 'admin' },
      { id: 'penny-operate-label', label: 'Operate',             isLabel: true },
      { id: 'penny-learners',      path: '/penny/learners',      label: 'Learners',         minTier: 'admin' },
      { id: 'penny-session-log',   path: '/penny/session-log',   label: 'Session Log',      minTier: 'admin' },
      { id: 'penny-trail-quests',  path: '/penny/trail-quests',  label: 'Trail Quests',     minTier: 'admin' },
      { id: 'penny-assessments',   path: '/penny/assessments',   label: 'Assessments',      minTier: 'admin' },
      { id: 'penny-config-label',  label: `Configure ${TERMS.aiAssistant}`,     isLabel: true },
      { id: 'penny-question-bank', path: '/penny/question-bank', label: 'Question Bank',    minTier: 'admin' },
      { id: 'penny-trail-configs', path: '/penny/trail-configs', label: 'Trail Configs',    minTier: 'admin' },
      { id: 'penny-prompts',       path: '/penny/prompts',       label: 'Prompt Studio',    minTier: 'admin' },
      { id: 'penny-capabilities',  path: '/penny/capabilities',  label: 'Capabilities',     minTier: 'admin' },
      { id: 'penny-create-label',      label: 'Create',         isLabel: true },
      { id: 'penny-content-studio', path: '/penny/content-studio', label: 'Content Studio', minTier: 'admin' },
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
    extraPrefixes: ['/knowledge/governance'],
    items: [
      { id: 'know-studio',     path: '/knowledge/studio',     label: 'Studio',     minTier: 'admin' },
      { id: 'know-governance', path: '/knowledge/governance', label: 'Governance', minTier: 'admin' },
    ],
  },
  {
    id: 'collaboration',
    label: 'Collaboration',
    icon: MessageSquare,
    pathPrefix: '/collaboration',
    items: [
      { id: 'collab-overview', path: '/collaboration',         label: 'Overview'       },
      { id: 'collab-comms',    path: '/collaboration/comms',   label: 'Comms'          },
      { id: 'collab-signals',  path: '/collaboration/signals', label: 'Trail Signals'  },
      { id: 'collab-channels', path: '/collaboration/channels',label: 'Channels', minTier: 'admin' },
    ],
  },
  {
    id: 'admin',
    minTier: 'admin',
    label: 'Administration',
    icon: Settings,
    pathPrefix: '/admin',
    extraPrefixes: ['/uom', '/governance'],
    items: [
      { id: 'admin-integrations',  path: '/admin/integrations',  label: 'Integrations'    },
      { id: 'admin-people-access', path: '/admin/people-access', label: 'People & Access'  },
      { id: 'admin-users',         path: '/admin/users',         label: 'Users'            },
      { id: 'admin-adoption',      path: '/admin/adoption',      label: 'Adoption'         },
    ],
  },
];

function isGroupActive(group: NavGroup, location: string): boolean {
  if ((group.excludePrefixes ?? []).some(p => location.startsWith(p))) return false;
  if (location.startsWith(group.pathPrefix)) return true;
  return (group.extraPrefixes ?? []).some(p => location.startsWith(p));
}

function calcMaxHeight(items: NavItem[]): number {
  return items.reduce((sum, item) => sum + (item.isLabel ? 36 : 40), 0);
}

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { userTier, mobileSidebarOpen, setMobileSidebarOpen } = useAppContext();
  const { hasUnseenRelease, markSeen } = useSeenVersion();

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

  const isSearch = location === '/search';

  const topBtnCls = (active: boolean) =>
    `w-full flex items-center justify-center xl:justify-start gap-2.5 px-2.5 py-2 rounded-md text-[14px] font-semibold transition-colors text-left ${
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

          {/* Mission Control */}
          <button title="Home" onClick={() => nav('/mission-control')} className={topBtnCls(location === '/mission-control')}>
            <Home className={`w-4 h-4 flex-shrink-0 ${location === '/mission-control' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            <span className="hidden xl:inline">Home</span>
          </button>

          {/* Global Search */}
          <button title="Global Search" onClick={() => nav('/search')} className={topBtnCls(isSearch)}>
            <Search className={`w-4 h-4 flex-shrink-0 ${isSearch ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            <span className="hidden xl:inline">Global Search</span>
          </button>

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
                  className={`w-full flex items-center justify-center xl:justify-start gap-2.5 px-2.5 py-2 rounded-md text-[14px] font-semibold transition-colors text-left ${
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
                            <p className="text-[14px] font-semibold text-muted-foreground/40">{item.label}</p>
                          </div>
                        );
                      }
                      const isActive = location === item.path ||
                        (item.path !== group.pathPrefix && location.startsWith(item.path + '/'));
                      return (
                        <button
                          key={item.id}
                          onClick={() => nav(item.path)}
                          className={`w-full text-left pl-3 pr-2 py-1.5 text-[14px] rounded-r-md transition-colors ${
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
        <div className="px-1 xl:px-3 py-2 border-t border-sidebar-border flex-shrink-0 space-y-1">
          {/* Homebase toggle — consistent with the Mission Control icon on the Homebase drawer */}
          <button
            onClick={() => setLocation('/homebase')}
            className="w-full flex items-center justify-center xl:justify-start gap-2 xl:px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title="Back to Homebase"
          >
            <Home className="w-4 h-4 flex-shrink-0" />
            <span className="hidden xl:block text-[12px] whitespace-nowrap">Homebase</span>
          </button>
          {/* Version link — expanded sidebar */}
          <a
            href="/release-notes"
            onClick={(e) => {
              e.preventDefault();
              markSeen();
              window.history.pushState({}, "", "/release-notes");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            className="hidden xl:flex items-center gap-1.5 text-[12px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors xl:px-2"
          >
            Trail OS v{APP_VERSION} · Internal
            {hasUnseenRelease && (
              <span
                className="relative flex h-2 w-2 flex-shrink-0"
                title={`What's new in v${APP_VERSION}`}
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
          </a>
          {/* Version dot — collapsed sidebar (clickable) */}
          <div className="xl:hidden flex justify-center py-0.5">
            <button
              onClick={() => {
                markSeen();
                window.history.pushState({}, "", "/release-notes");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
              title={`Trail OS v${APP_VERSION} — Release notes`}
              className="p-0.5 rounded-full"
            >
              {hasUnseenRelease ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 block" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
