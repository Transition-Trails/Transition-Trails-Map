import { Search, Map, Database, Compass, BookOpen, Search as SearchIcon, Eye } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Topbar() {
  const [location, setLocation] = useLocation();
  const { activeLens, setActiveLens, setSearchOpen } = useAppContext();

  const tabs = [
    { id: '/', label: 'Program Map', icon: Map },
    { id: '/trail-os-penny', label: 'Trail OS + Penny', icon: Database },
    { id: '/resolve-demand', label: 'RESOLVE + Demand', icon: Compass },
    { id: '/source-docs', label: 'Source Documents', icon: BookOpen },
  ];

  return (
    <div className="flex items-center justify-between h-[52px] px-4 border-b bg-card">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
          <Map className="w-5 h-5" />
        </div>
        <span className="text-xl font-semibold font-serif text-foreground">Transition Trails</span>
      </div>

      <div className="flex items-center gap-1 h-full">
        {tabs.map((tab) => {
          const isActive = location === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setLocation(tab.id)}
              className={`flex items-center gap-2 px-4 h-full text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center bg-muted/50 rounded-full px-3 py-1.5 border">
          <span className="text-xs font-medium text-muted-foreground mr-2">Lens:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-semibold bg-white shadow-sm border">
                {activeLens.charAt(0).toUpperCase() + activeLens.slice(1)} View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Select Lens</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {['executive', 'program', 'operations', 'architect'].map((lens) => (
                <DropdownMenuItem key={lens} onClick={() => setActiveLens(lens)}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${activeLens === lens ? 'bg-primary' : 'bg-transparent'}`} />
                  {lens.charAt(0).toUpperCase() + lens.slice(1)} View
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSearchOpen(true)}>
          <SearchIcon className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
