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
    { id: 'executive', label: 'Executive', icon: Activity },
    { id: 'program', label: 'Program', icon: Eye },
    { id: 'operations', label: 'Operations', icon: Box },
    { id: 'architect', label: 'Architect', icon: Settings },
  ];

  return (
    <div className="w-[188px] flex-shrink-0 flex flex-col h-full bg-sidebar border-r border-sidebar-border">

      <div className="flex-1 flex flex-col py-3 overflow-y-auto">

        <nav className="px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setLocation(item.id)}
                data-testid={`nav-${item.id.replace('/', '') || 'home'}`}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mx-2 my-3 border-t border-sidebar-border" />

        <div className="px-2">
          <p className="px-2.5 mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Lens
          </p>
          <div className="space-y-0.5">
            {lenses.map((lens) => {
              const isActive = activeLens === lens.id;
              const Icon = lens.icon;
              return (
                <button
                  key={lens.id}
                  onClick={() => setActiveLens(lens.id)}
                  data-testid={`lens-${lens.id}`}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                    isActive
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{lens.label} View</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-2 pb-3 border-t border-sidebar-border pt-3 space-y-0.5">
        <button
          onClick={() => setLocation('/admin')}
          data-testid="nav-admin"
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors text-left ${
            location === '/admin'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
          }`}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Admin</span>
        </button>
        <p className="text-[10px] text-muted-foreground text-center pt-1">v1.0 — Internal</p>
      </div>
    </div>
  );
}
