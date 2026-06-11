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
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
  tabs: HubTab[];
  actions?: ActionItem[];
}) {
  const [location, setLocation] = useLocation();

  // Most-specific match first (longest path wins)
  const sorted = [...tabs].sort((a, b) => b.path.length - a.path.length);
  const activeTab =
    sorted.find(t => location === t.path || location.startsWith(t.path + '/')) ?? tabs[0];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Hub header + tab bar */}
      <div className="border-b border-border px-6 pt-5 pb-0 bg-background shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Icon className="w-4 h-4 text-primary" />
          <h1 className="text-lg font-serif font-bold text-foreground">{title}</h1>
          {badge && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 ml-1">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mb-3 max-w-3xl">{description}</p>
        {tabs.length > 1 && (
          <div className="flex gap-0.5 overflow-x-auto pb-0.5">
            {tabs.map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab.id === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setLocation(tab.path)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-md whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  {TabIcon && <TabIcon className="w-3 h-3 shrink-0" />}
                  {tab.label}
                </button>
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
