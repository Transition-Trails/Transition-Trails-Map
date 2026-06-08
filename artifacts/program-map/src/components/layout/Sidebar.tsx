import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Home, Map, Activity, Inbox, Brain, BookOpen, Settings, ChevronDown, MessageSquare, GraduationCap,
} from 'lucide-react';

type NavItem  = { path: string; label: string; isLabel?: false } | { label: string; isLabel: true };
type NavGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathPrefix: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    id: 'navigator',
    label: 'Navigator',
    icon: Map,
    pathPrefix: '/navigator',
    items: [
      { path: '/navigator/program-map',             label: 'Program Map' },
      { path: '/navigator/resolve',                  label: 'RESOLVE' },
      { path: '/navigator/roles',                    label: 'Roles' },
      { path: '/navigator/trail-os-map',             label: 'Trail OS Capability Map' },
      { path: '/navigator/knowledge-relationships',  label: 'Knowledge Relationships' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations Center',
    icon: Activity,
    pathPrefix: '/operations',
    items: [
      { path: '/operations/program-health',    label: 'Program Health' },
      { path: '/operations/salesforce-health', label: 'Salesforce Health' },
      { path: '/operations/automation-health', label: 'Automation Health' },
      { path: '/operations/website-marketing', label: 'Website & Marketing' },
      { path: '/operations/penny-health',      label: 'Penny Health' },
      { path: '/operations/trail-os-health',   label: 'Trail OS Health' },
      { path: '/operations/communications',    label: 'Communications' },
    ],
  },
  {
    id: 'demand',
    label: 'Demand Management',
    icon: Inbox,
    pathPrefix: '/demand',
    items: [
      { path: '/demand/intake',          label: 'Intake' },
      { path: '/demand/cases',           label: 'Salesforce Cases' },
      { path: '/demand/epics',           label: 'Epics' },
      { path: '/demand/features',        label: 'Features' },
      { path: '/demand/stories',         label: 'Stories' },
      { path: '/demand/roadmap',         label: 'Roadmap' },
      { path: '/demand/change-request',  label: 'Submit Change Request' },
    ],
  },
  {
    id: 'penny',
    label: 'Penny Command Center',
    icon: Brain,
    pathPrefix: '/penny',
    items: [
      { path: '/penny/learners',         label: 'Learners' },
      { path: '/penny/logs',             label: 'Logs' },
      { path: '/penny/trail-quests',     label: 'Trail Quests' },
      { path: '/penny/assessments',      label: 'Assessments' },
      { path: '/penny/intelligence',     label: 'Intelligence' },
      { path: '/penny/test-penny',       label: 'Test Penny' },
      { path: '/penny/response-quality', label: 'Response Quality' },
      { path: '/penny/prompt-library',   label: 'Prompt Library' },
      { path: '/penny/integrations',     label: 'Integrations' },
    ],
  },
  {
    id: 'communications',
    label: 'Communications',
    icon: MessageSquare,
    pathPrefix: '/communications',
    items: [
      { path: '/communications/overview',          label: 'Overview' },
      { path: '/communications/providers',         label: 'Providers' },
      { path: '/communications/channels',          label: 'Channels & Spaces' },
      { path: '/communications/calendar',          label: 'Calendar' },
      { path: '/communications/penny-broadcasts',  label: 'Penny Broadcasts' },
      { path: '/communications/weekly-briefs',     label: 'Weekly Briefs' },
      { path: '/communications/notifications',     label: 'Notifications' },
      { path: '/communications/message-templates', label: 'Message Templates' },
    ],
  },
  {
    id: 'library',
    label: 'Knowledge Library',
    icon: BookOpen,
    pathPrefix: '/library',
    items: [
      { path: '/library/documents',     label: 'Documents' },
      { path: '/library/templates',     label: 'Templates' },
      { path: '/library/salesforce-kb', label: 'Salesforce Knowledge' },
      { path: '/library/source-mapping', label: 'Source Mapping' },
      { path: '/library/search',        label: 'Search' },
    ],
  },
  {
    id: 'curriculum',
    label: 'Curriculum Studio',
    icon: GraduationCap,
    pathPrefix: '/curriculum',
    items: [
      { path: '/curriculum/overview',            label: 'Overview' },
      { label: 'Program Structure', isLabel: true },
      { path: '/curriculum/programs',            label: 'Programs' },
      { path: '/curriculum/cohorts',             label: 'Cohorts' },
      { path: '/curriculum/sprints',             label: 'Sprints' },
      { path: '/curriculum/modules',             label: 'Modules' },
      { label: 'Learning Assets', isLabel: true },
      { path: '/curriculum/lessons',             label: 'Lessons' },
      { path: '/curriculum/assessments',         label: 'Assessments' },
      { path: '/curriculum/knowledge-articles',  label: 'Knowledge Articles' },
      { path: '/curriculum/resources',           label: 'Resources' },
      { label: 'Penny Assets', isLabel: true },
      { path: '/curriculum/coaching-prompts',    label: 'Coaching Prompts' },
      { path: '/curriculum/reflection-prompts',  label: 'Reflection Prompts' },
      { path: '/curriculum/trail-quests',        label: 'Trail Quests' },
      { path: '/curriculum/weekly-reviews',      label: 'Weekly Reviews' },
      { label: 'Penny Content Assistant', isLabel: true },
      { path: '/curriculum/penny-assistant',     label: 'Content Workshop' },
      { path: '/curriculum/penny-actions',       label: 'Action Library' },
      { path: '/curriculum/consistency-review',  label: 'Consistency Review' },
      { path: '/curriculum/generated-outputs',   label: 'Generated Outputs' },
      { label: 'Delivery Assets', isLabel: true },
      { path: '/curriculum/slack-activities',    label: 'Slack Activities' },
      { path: '/curriculum/google-chat',         label: 'Google Chat' },
      { path: '/curriculum/calendar-events',     label: 'Calendar Events' },
      { path: '/curriculum/office-hours',        label: 'Office Hours' },
      { path: '/curriculum/content-health',      label: 'Content Health' },
      { label: 'Blueprints & Architecture', isLabel: true },
      { path: '/curriculum/blueprint',           label: 'Program Blueprint' },
      { path: '/curriculum/salesforce-mapping',  label: 'Salesforce Architecture' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: Settings,
    pathPrefix: '/admin',
    items: [
      { path: '/admin/programs',          label: 'Programs' },
      { path: '/admin/program-resources', label: 'Program Resources' },
      { path: '/admin/documents',         label: 'Documents' },
      { path: '/admin/resolve',         label: 'RESOLVE' },
      { path: '/admin/trail-os',        label: 'Trail OS' },
      { path: '/admin/penny',           label: 'Penny' },
      { path: '/admin/roles',           label: 'Roles' },
      { path: '/admin/templates',       label: 'Templates' },
      { path: '/admin/integrations',    label: 'Integrations' },
      { path: '/admin/comm-channels',   label: 'Comm Channels' },
      { path: '/admin/comm-routing',    label: 'Comm Routing' },
      { path: '/admin/comm-templates',  label: 'Message Templates' },
      { path: '/admin/users',           label: 'Users' },
      { path: '/admin/permissions',     label: 'Permissions' },
      { path: '/admin/settings',        label: 'Settings' },
    ],
  },
];

function calcMaxHeight(items: NavItem[]): number {
  return items.reduce((sum, item) => sum + (item.isLabel ? 28 : 36), 0);
}

export function Sidebar() {
  const [location, setLocation] = useLocation();

  const activeGroupId = navGroups.find(g => location.startsWith(g.pathPrefix))?.id;

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set([activeGroupId ?? 'navigator'])
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

        {navGroups.map(group => {
          const isOpen        = openGroups.has(group.id);
          const isGroupActive = location.startsWith(group.pathPrefix);
          const Icon          = group.icon;

          return (
            <div key={group.id}>
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-semibold transition-colors text-left ${
                  isGroupActive
                    ? 'text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isGroupActive ? 'text-primary' : 'text-muted-foreground'}`} />
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
                        <div key={`label-${idx}`} className="px-3 pt-2 pb-0.5">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                            {item.label}
                          </p>
                        </div>
                      );
                    }
                    const isActive = location === item.path;
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
        <p className="text-[10px] text-muted-foreground text-center">v1.0 — Internal</p>
      </div>
    </div>
  );
}
