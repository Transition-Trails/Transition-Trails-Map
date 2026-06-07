import { useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useAppContext } from '@/context/AppContext';
import { pennyCapabilities } from '@/data/pennyCapabilities';
import { trailOsCapabilities } from '@/data/trailOsCapabilities';
import { resolvePhases } from '@/data/resolvePhases';
import { demandStages } from '@/data/demandStages';
import { Map, Database, Compass, BookOpen, Layers } from 'lucide-react';

export function CommandPalette() {
  const { searchOpen, setSearchOpen, setSelectedItem, programs, sourceDocuments } = useAppContext();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setSearchOpen]);

  const handleSelect = (item: any, type: any, route: string) => {
    setSearchOpen(false);
    setLocation(route);
    setSelectedItem({ type, id: item.id, data: item });
  };

  return (
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
      <CommandInput placeholder="Search programs, capabilities, phases, documents…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Programs">
          {programs.map((p) => (
            <CommandItem key={p.id} onSelect={() => handleSelect(p, 'program', '/')}>
              <Map className="mr-2 h-4 w-4 text-primary" />
              <span>{p.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Penny Capabilities">
          {pennyCapabilities.map((p) => (
            <CommandItem key={p.id} onSelect={() => handleSelect(p, 'penny', '/trail-os-penny')}>
              <Database className="mr-2 h-4 w-4 text-secondary" />
              <span>{p.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Trail OS Capabilities">
          {trailOsCapabilities.map((t) => (
            <CommandItem key={t.id} onSelect={() => handleSelect(t, 'trailOs', '/trail-os-penny')}>
              <Layers className="mr-2 h-4 w-4 text-accent" />
              <span>{t.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="RESOLVE Phases">
          {resolvePhases.map((r) => (
            <CommandItem key={r.id} onSelect={() => handleSelect(r, 'resolve', '/resolve-demand')}>
              <Compass className="mr-2 h-4 w-4 text-primary" />
              <span>{r.letter} — {r.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Demand Stages">
          {demandStages.map((d) => (
            <CommandItem key={d.id} onSelect={() => handleSelect(d, 'demand', '/resolve-demand')}>
              <Layers className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{d.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Source Documents">
          {sourceDocuments.map((d) => (
            <CommandItem key={d.id} onSelect={() => handleSelect(d, 'document', '/source-docs')}>
              <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{d.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
