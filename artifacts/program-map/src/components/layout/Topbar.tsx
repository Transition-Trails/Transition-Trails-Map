import { Map, Search as SearchIcon } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PAGE_INFO: Array<[string, string, string]> = [
  ['/navigator/program-map',             'Navigator',              'Program Map'],
  ['/navigator/resolve',                 'Navigator',              'Delivery Operating System'],
  ['/navigator/roles',                   'Navigator',              'Roles'],
  ['/navigator/trail-os-map',            'Navigator',              'Trail OS Capability Map'],
  ['/navigator/knowledge-relationships', 'Navigator',              'Knowledge Relationships'],
  ['/operations/program-health',         'Operations Center',      'Program Health'],
  ['/operations/salesforce-health',      'Operations Center',      'Salesforce Health'],
  ['/operations/automation-health',      'Operations Center',      'Automation Health'],
  ['/operations/website-marketing',      'Operations Center',      'Website & Marketing'],
  ['/operations/penny-health',           'Operations Center',      'Penny Health'],
  ['/operations/trail-os-health',        'Operations Center',      'Trail OS Health'],
  ['/operations/communications',         'Operations Center',      'Communications'],
  ['/admin/comm-channels',               'Administration',         'Communication Channels'],
  ['/admin/comm-routing',                'Administration',         'Comm Routing'],
  ['/admin/comm-templates',              'Administration',         'Message Templates'],
  ['/demand/intake',                     'Demand Management',      'Intake'],
  ['/demand/cases',                      'Demand Management',      'Salesforce Cases'],
  ['/demand/epics',                      'Demand Management',      'Epics'],
  ['/demand/features',                   'Demand Management',      'Features'],
  ['/demand/stories',                    'Demand Management',      'Stories'],
  ['/demand/roadmap',                    'Demand Management',      'Roadmap'],
  ['/demand/change-request',             'Demand Management',      'Submit Change Request'],
  ['/penny/learners',                    'Penny Command Center',   'Learners'],
  ['/penny/logs',                        'Penny Command Center',   'Logs'],
  ['/penny/trail-quests',               'Penny Command Center',   'Trail Quests'],
  ['/penny/assessments',                 'Penny Command Center',   'Assessments'],
  ['/penny/intelligence',                'Penny Command Center',   'Intelligence'],
  ['/penny/test-penny',                  'Penny Command Center',   'Test Penny'],
  ['/penny/response-quality',            'Penny Command Center',   'Response Quality'],
  ['/penny/prompt-library',              'Penny Command Center',   'Prompt Library'],
  ['/penny/integrations',                'Penny Command Center',   'Integrations'],
  ['/library/documents',                 'Knowledge Library',      'Documents'],
  ['/library/templates',                 'Knowledge Library',      'Templates'],
  ['/library/salesforce-kb',             'Knowledge Library',      'Salesforce Knowledge'],
  ['/library/source-mapping',            'Knowledge Library',      'Source Mapping'],
  ['/library/search',                    'Knowledge Library',      'Search'],
];

const LENS_PAGES = new Set(['/navigator/program-map', '/navigator/resolve', '/navigator/trail-os-map']);

function getPageInfo(location: string) {
  for (const [path, section, title] of PAGE_INFO) {
    if (location === path) return { section, title };
  }
  if (location.startsWith('/admin')) return { section: 'Administration', title: 'Knowledge Management' };
  return { section: 'Trail OS', title: 'Dashboard' };
}

export function Topbar() {
  const [location] = useLocation();
  const { activeLens, setActiveLens, setSearchOpen } = useAppContext();

  const { section, title } = getPageInfo(location);
  const showLens = LENS_PAGES.has(location);

  return (
    <div className="flex items-center justify-between h-[48px] px-4 border-b bg-card shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary flex-shrink-0">
          <Map className="w-4 h-4" />
        </div>
        <span className="text-base font-semibold font-serif text-foreground leading-none flex-shrink-0">
          Transition Trails
        </span>
        <span className="text-muted-foreground/30 select-none mx-0.5 flex-shrink-0">·</span>
        <span className="text-xs text-muted-foreground font-medium flex-shrink-0 hidden sm:block">{section}</span>
        <span className="text-muted-foreground/30 select-none hidden sm:block flex-shrink-0">/</span>
        <span className="text-sm text-foreground font-medium truncate">{title}</span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {showLens && (
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
                {['executive', 'program', 'operations', 'architect'].map(lens => (
                  <DropdownMenuItem key={lens} onClick={() => setActiveLens(lens)} className="text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${activeLens === lens ? 'bg-primary' : 'bg-transparent border border-border'}`} />
                    {lens.charAt(0).toUpperCase() + lens.slice(1)} View
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <Button
          variant="ghost" size="icon"
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
