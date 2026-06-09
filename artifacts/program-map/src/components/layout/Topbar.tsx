import { Map, Search as SearchIcon } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';

const PAGE_INFO: Array<[string, string, string]> = [
  ['/',                                  'Trail OS',               'Mission Control'],
  ['/navigator/program-map',             'Navigator',              'Program Map'],
  ['/navigator/resolve',                 'Navigator',              'Delivery Operating System'],
  ['/navigator/roles',                   'Navigator',              'Roles'],
  ['/navigator/trail-os-map',            'Navigator',              'Trail OS Capability Map'],
  ['/navigator/knowledge-relationships', 'Navigator',              'Knowledge Relationships'],
  ['/operations/program-health',         'Operations',             'Program Health'],
  ['/operations/salesforce-health',      'Operations',             'Salesforce Health'],
  ['/operations/automation-health',      'Operations',             'Automation Health'],
  ['/operations/website-marketing',      'Operations',             'Website & Marketing'],
  ['/operations/penny-health',           'Operations',             'Penny Health'],
  ['/operations/trail-os-health',        'Operations',             'Trail OS Health'],
  ['/operations/communications',         'Operations',             'Communications'],
  ['/admin/comm-channels',               'Administration',         'Communication Channels'],
  ['/admin/comm-routing',                'Administration',         'Comm Routing'],
  ['/admin/comm-templates',              'Administration',         'Message Templates'],
  ['/demand/intake',                     'Demand',                 'Intake'],
  ['/demand/cases',                      'Demand',                 'Salesforce Cases'],
  ['/demand/epics',                      'Demand',                 'Epics'],
  ['/demand/features',                   'Demand',                 'Features'],
  ['/demand/stories',                    'Demand',                 'Stories'],
  ['/demand/roadmap',                    'Demand',                 'Roadmap'],
  ['/demand/change-request',             'Demand',                 'Submit Change Request'],
  ['/penny/learners',                    'Penny',                  'Learners'],
  ['/penny/logs',                        'Penny',                  'Logs'],
  ['/penny/trail-quests',                'Penny',                  'Trail Quests'],
  ['/penny/assessments',                 'Penny',                  'Assessments'],
  ['/penny/intelligence',                'Penny',                  'Intelligence'],
  ['/penny/test-penny',                  'Penny',                  'Test Penny'],
  ['/penny/response-quality',            'Penny',                  'Response Quality'],
  ['/penny/prompt-library',              'Penny',                  'Prompt Library'],
  ['/penny/integrations',                'Penny',                  'Integrations'],
  ['/library/documents',                 'Knowledge Library',      'Documents'],
  ['/library/templates',                 'Knowledge Library',      'Templates'],
  ['/library/salesforce-kb',             'Knowledge Library',      'Salesforce Knowledge'],
  ['/library/source-mapping',            'Knowledge Library',      'Source Mapping'],
  ['/library/search',                    'Knowledge Library',      'Search'],
];

function getPageInfo(location: string) {
  for (const [path, section, title] of PAGE_INFO) {
    if (location === path) return { section, title };
  }
  if (location.startsWith('/admin'))         return { section: 'Administration', title: 'Knowledge Management' };
  if (location.startsWith('/digital-twin'))  return { section: 'Digital Twin',   title: 'Overview' };
  if (location.startsWith('/uom'))           return { section: 'Digital Twin',   title: 'Object Model' };
  if (location.startsWith('/governance'))    return { section: 'Digital Twin',   title: 'Governance' };
  if (location.startsWith('/operations'))    return { section: 'Operations',     title: 'Dashboard' };
  if (location.startsWith('/program'))       return { section: 'Programs',       title: 'Dashboard' };
  if (location.startsWith('/penny'))         return { section: 'Penny',          title: 'Dashboard' };
  if (location.startsWith('/knowledge'))     return { section: 'Knowledge',      title: 'Dashboard' };
  if (location.startsWith('/collaboration')) return { section: 'Collaboration',  title: 'Dashboard' };
  if (location.startsWith('/search'))        return { section: 'Trail OS',       title: 'Global Search' };
  if (location.startsWith('/context'))       return { section: 'Trail OS',       title: 'Context Engine' };
  return { section: 'Trail OS', title: 'Dashboard' };
}

// ── Lens toggle ────────────────────────────────────────────────────────────
function LensPill({ activeLens, setActiveLens }: { activeLens: string; setActiveLens: (l: string) => void }) {
  return (
    <div className="flex items-center rounded-full border border-border overflow-hidden text-[11px] h-[26px]">
      <button
        onClick={() => setActiveLens('executive')}
        className={`px-2.5 h-full font-semibold transition-colors ${
          activeLens === 'executive'
            ? 'bg-amber-100 text-amber-800 border-r border-amber-200'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
        }`}
      >
        Executive
      </button>
      <button
        onClick={() => setActiveLens('builder')}
        className={`px-2.5 h-full font-semibold transition-colors ${
          activeLens === 'builder'
            ? 'bg-sky-100 text-sky-800'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
        }`}
      >
        Builder
      </button>
    </div>
  );
}

export function Topbar() {
  const [location, setLocation] = useLocation();
  const { activeLens, setActiveLens } = useAppContext();

  const { section, title } = getPageInfo(location);

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
        <LensPill activeLens={activeLens} setActiveLens={setActiveLens} />
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => setLocation('/search')}
          title="Global Search"
        >
          <SearchIcon className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
