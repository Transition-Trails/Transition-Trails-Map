import type { ComponentType } from 'react';
import { useLocation } from 'wouter';
import { ActionBar, type ActionItem } from '@/components/workspace/ActionBar';

export interface HubTab {
  id: string;
  label: string;
  path: string;
  icon?: ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

export function HubShell({
  title,
  icon: Icon,
  description,
  badge,
  tabs,
  actions,
  separatorAfter,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  description?: string;
  badge?: string;
  tabs: HubTab[];
  actions?: ActionItem[];
  /** Insert a visual separator after the tab with this id. */
  separatorAfter?: string;
}) {
  const [location, setLocation] = useLocation();

  // Most-specific match first (longest path wins)
  const sorted = [...tabs].sort((a, b) => b.path.length - a.path.length);
  const activeTab =
    sorted.find(t => location === t.path || location.startsWith(t.path + '/')) ?? tabs[0];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Hub header + tab bar */}
      <div className="border-b border-border px-4 pt-2.5 pb-0 bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <h1 className="text-sm font-semibold text-foreground leading-none">{title}</h1>
          {badge && (
            <span className="text-[14px] font-semibold  text-muted-foreground/50">
              {badge}
            </span>
          )}
          {description && <span className="text-[14px] text-muted-foreground line-clamp-1 hidden sm:block">{description}</span>}
        </div>
        {tabs.length > 1 && (
          <div className="flex items-center gap-0.5 overflow-x-auto pb-0.5 mt-1.5">
            {tabs.map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab.id === tab.id;
              return (
                <div key={tab.id} className="flex items-center">
                  <button
                    onClick={() => setLocation(tab.path)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[14px] font-semibold rounded-t-md whitespace-nowrap border-b-2 transition-colors ${
                      isActive
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    {TabIcon && <TabIcon className="w-3 h-3 shrink-0" />}
                    {tab.label}
                  </button>
                  {separatorAfter === tab.id && (
                    <span className="w-px h-4 bg-border mx-1 shrink-0" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hub action bar */}
      {actions && actions.length > 0 && (
        <ActionBar actions={actions} />
      )}

      {/* Active content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab.content}
      </div>
    </div>
  );
}
