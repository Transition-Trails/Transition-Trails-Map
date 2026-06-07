import { useLocation } from 'wouter';
import { useAppContext } from '@/context/AppContext';
import { Map, Database, Compass, BookOpen, Eye, Activity, Box, Settings } from 'lucide-react';

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { activeLens, setActiveLens } = useAppContext();

  const navItems = [
    { id: '/', label: 'Program Map', icon: Map },
    { id: '/trail-os-penny', label: 'Trail OS + Penny', icon: Database },
    { id: '/resolve-demand', label: 'RESOLVE + Demand', icon: Compass },
    { id: '/source-docs', label: 'Source Documents', icon: BookOpen },
  ];

  const lenses = [
    { id: 'executive', label: 'Executive View', icon: Activity },
    { id: 'program', label: 'Program View', icon: BookOpen },
    { id: 'operations', label: 'Operations View', icon: Settings },
    { id: 'architect', label: 'Architect View', icon: Box },
  ];

  return (
    <div className="w-[200px] flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-y-auto">
      <div className="flex-1 py-4 px-3 space-y-6">
        
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setLocation(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div>
          <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active Lens
          </div>
          <div className="space-y-1">
            {lenses.map((lens) => {
              const isActive = activeLens === lens.id;
              const Icon = lens.icon;
              return (
                <button
                  key={lens.id}
                  onClick={() => setActiveLens(lens.id)}
                  className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/20 text-primary font-medium border border-primary/30'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {lens.label}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      <div className="p-4 border-t border-sidebar-border space-y-4">
        <button
          onClick={() => setLocation('/admin')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            location === '/admin'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
          }`}
        >
          <Settings className="w-4 h-4" />
          Admin
        </button>
        <div className="text-xs text-muted-foreground text-center">
          v1.0 — Internal
        </div>
      </div>
    </div>
  );
}
