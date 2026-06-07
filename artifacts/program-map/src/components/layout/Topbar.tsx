import { Map, Search as SearchIcon, Settings } from 'lucide-react';
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

const PAGE_TITLES: Record<string, string> = {
  '/': 'Program Map',
  '/trail-os-penny': 'Trail OS + Penny',
  '/resolve-demand': 'RESOLVE Framework',
  '/source-docs': 'Source Documents',
  '/admin': 'Knowledge Management',
};

export function Topbar() {
  const [location] = useLocation();
  const { activeLens, setActiveLens, setSearchOpen } = useAppContext();

  const currentTitle = PAGE_TITLES[location] ?? 'Transition Trails';

  return (
    <div className="flex items-center justify-between h-[48px] px-4 border-b bg-card shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary">
          <Map className="w-4 h-4" />
        </div>
        <span className="text-base font-semibold font-serif text-foreground leading-none">Transition Trails</span>
        <span className="text-muted-foreground/30 select-none mx-1">·</span>
        <span className="text-sm text-muted-foreground font-medium">{currentTitle}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-muted/50 rounded-full px-3 py-1 border text-xs">
          <span className="font-medium text-muted-foreground mr-2">Lens:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 px-2 text-xs font-semibold bg-white shadow-sm border rounded-full">
                {activeLens.charAt(0).toUpperCase() + activeLens.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Select Lens</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {['executive', 'program', 'operations', 'architect'].map((lens) => (
                <DropdownMenuItem key={lens} onClick={() => setActiveLens(lens)} className="text-xs">
                  <div className={`w-1.5 h-1.5 rounded-full mr-2 ${activeLens === lens ? 'bg-primary' : 'bg-transparent border border-border'}`} />
                  {lens.charAt(0).toUpperCase() + lens.slice(1)} View
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => setSearchOpen(true)}
          title="Search (Ctrl K)"
        >
          <SearchIcon className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
