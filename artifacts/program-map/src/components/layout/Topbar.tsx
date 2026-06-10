import { useRef, useState, useEffect } from 'react';
import { Map, Search as SearchIcon, ChevronDown } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { locationToContext, getSignalPanelConfig, SIGNAL_COUNTS } from '@/data/signalCounts';
import { TERMS } from '@/config/terminology';
import { type AccessTier, TIER_CONFIG, TIER_ORDER } from '@/config/accessTiers';

// ── Page info lookup ──────────────────────────────────────────────────────────

const PAGE_INFO: Array<[string, string, string]> = [
  ['/',                                  'Trail OS',               'Mission Control'],
  ['/digital-twin',                      'Digital Twin',           'Explore'],
  ['/digital-twin/map',                  'Digital Twin',           'Map'],
  ['/digital-twin/impact',               'Digital Twin',           'Impact'],
  ['/digital-twin/governance',           'Digital Twin',           'Governance'],
  ['/operations',                        'Operations',             'Executive Overview'],
  ['/operations/health',                 'Operations',             'Health Indicators'],
  ['/operations/integrations',           'Operations',             'Integration Readiness'],
  ['/operations/scorecards',             'Operations',             'Scorecards'],
  ['/operations/trends',                 'Operations',             'Trends & Insights'],
  ['/operations/demand',                 'Operations',             'Demand'],
  ['/program',                           'Programs',               'Programs'],
  ['/program/standards',                 'Programs',               'Standards'],
  ['/program/blueprint',                 'Programs',               'Blueprint'],
  ['/program/salesforce',                'Programs',               'Salesforce Arch'],
  ['/program/resources',                 'Programs',               'Resources'],
  ['/penny',                             'Penny',                  'Capabilities'],
  ['/penny/prompts',                     'Penny',                  'Prompt Studio'],
  ['/penny/learners',                    'Penny',                  'Learners'],
  ['/penny/intelligence',                'Penny',                  'Intelligence'],
  ['/penny/trail-os-map',                'Penny',                  'Trail OS Map'],
  ['/penny/test',                        'Penny',                  'Test Penny'],
  ['/knowledge',                         'Knowledge',              'Sources'],
  ['/knowledge/library',                 'Knowledge',              'Library'],
  ['/knowledge/relationships',           'Knowledge',              'Relationships'],
  ['/knowledge/memory',                  'Knowledge',              'Org Memory'],
  ['/knowledge/search',                  'Knowledge',              'Search'],
  ['/collaboration',                     'Collaboration',          'Overview'],
  ['/collaboration/slack',               'Collaboration',          'Slack'],
  ['/collaboration/drive',               'Collaboration',          'Google Drive'],
  ['/collaboration/calendar',            'Collaboration',          'Google Calendar'],
  ['/collaboration/channels',            'Collaboration',          'Channels'],
  ['/collaboration/templates',           'Collaboration',          'Templates'],
  ['/search',                            'Trail OS',               'Global Search'],
  ['/context',                           'Trail OS',               'Context Engine'],
];

function getPageInfo(location: string) {
  for (const [path, section, title] of PAGE_INFO) {
    if (location === path) return { section, title };
  }
  if (location.startsWith('/admin'))        return { section: 'Administration', title: 'Knowledge Management' };
  if (location.startsWith('/digital-twin')) return { section: 'Digital Twin',   title: 'Explore' };
  if (location.startsWith('/governance'))   return { section: 'Digital Twin',   title: 'Governance' };
  if (location.startsWith('/uom'))          return { section: 'Digital Twin',   title: 'Object Model' };
  if (location.startsWith('/operations'))   return { section: 'Operations',     title: 'Dashboard' };
  if (location.startsWith('/program'))      return { section: 'Programs',       title: 'Dashboard' };
  if (location.startsWith('/penny'))        return { section: 'Penny',          title: 'Dashboard' };
  if (location.startsWith('/knowledge'))    return { section: 'Knowledge',      title: 'Dashboard' };
  if (location.startsWith('/collaboration'))return { section: 'Collaboration',  title: 'Dashboard' };
  return { section: 'Trail OS', title: 'Dashboard' };
}

// ── Trail Signals indicator ───────────────────────────────────────────────────

function SignalsIndicator() {
  const [location] = useLocation();
  const { openSlackPanel, slackPanel } = useAppContext();

  const context = locationToContext(location);
  const counts  = SIGNAL_COUNTS[context];
  if (!counts || counts.total === 0) return null;

  const panelOpen = slackPanel !== null;

  const sourceDots: Array<{ key: string; color: string; count: number }> = [
    { key: 'slack',      color: 'bg-[#4A154B]/60', count: counts.sources.slack      },
    { key: 'drive',      color: 'bg-emerald-500',  count: counts.sources.drive      },
    { key: 'salesforce', color: 'bg-sky-500',       count: counts.sources.salesforce },
    { key: 'calendar',   color: 'bg-rose-400',      count: counts.sources.calendar   },
    { key: 'email',      color: 'bg-blue-400',      count: counts.sources.email      },
  ].filter(s => s.count > 0);

  return (
    <button
      onClick={() => openSlackPanel(getSignalPanelConfig(context))}
      title={TERMS.signalTooltip(counts.total, counts.urgent)}
      className={`group flex items-center gap-1.5 h-[26px] px-2.5 rounded-full text-[10px] font-semibold border transition-all duration-200 whitespace-nowrap ${
        panelOpen
          ? 'bg-[#4A154B]/10 border-[#4A154B]/25 text-[#4A154B]/80'
          : counts.urgent > 0
          ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300'
          : 'bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
        panelOpen ? 'bg-[#4A154B]/50' : counts.urgent > 0 ? 'bg-amber-400 animate-pulse' : 'bg-muted-foreground/40'
      }`} />
      <span>
        {panelOpen
          ? TERMS.trailSignals
          : counts.urgent > 0
          ? `${counts.urgent} urgent`
          : `${counts.total} ${TERMS.trailSignals}`}
      </span>
      <span className="hidden group-hover:flex items-center gap-0.5 ml-0.5">
        {sourceDots.map(s => (
          <span key={s.key} className={`w-1 h-1 rounded-full ${s.color}`} title={s.key} />
        ))}
      </span>
    </button>
  );
}

// ── Tier switcher — replaces Executive/Builder lens toggle ────────────────────

const TIER_SEGMENTS: { tier: AccessTier; label: string; icon?: string }[] = [
  { tier: 'everyday',   label: 'Everyday' },
  { tier: 'power',      label: 'Power'    },
  { tier: 'admin',      label: 'Admin'    },
  { tier: 'superadmin', label: 'Super', icon: '★' },
];

function TierSwitcher() {
  const { userTier, setUserTier } = useAppContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const current = TIER_CONFIG[userTier];
  const isPreviewing = userTier !== 'superadmin';

  return (
    <div className="relative" ref={ref}>
      {/* Compact pill — shows current tier, click to open dropdown */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 h-[26px] px-2.5 rounded-full text-[10px] font-semibold border transition-all duration-150 whitespace-nowrap ${
          isPreviewing
            ? `${current.colorClass} hover:opacity-90`
            : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/15'
        }`}
        title={`Viewing as: ${current.label}. Click to switch tier.`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${current.dotClass}`} />
        {TIER_SEGMENTS.find(s => s.tier === userTier)?.icon && (
          <span className="text-[9px] leading-none">{TIER_SEGMENTS.find(s => s.tier === userTier)?.icon}</span>
        )}
        <span>{current.shortLabel}</span>
        {isPreviewing && (
          <span className="text-[8px] opacity-60 font-normal ml-0.5">preview</span>
        )}
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[30px] z-50 w-[260px] bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-3 pt-2.5 pb-2 border-b border-border/60">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">View as tier</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Switch to preview what each access level sees.
            </p>
          </div>

          {/* Tier options */}
          {TIER_ORDER.map(tier => {
            const cfg    = TIER_CONFIG[tier];
            const seg    = TIER_SEGMENTS.find(s => s.tier === tier)!;
            const active = userTier === tier;
            return (
              <button
                key={tier}
                onClick={() => { setUserTier(tier); setOpen(false); }}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors ${
                  active ? 'bg-muted/60' : 'hover:bg-muted/40'
                }`}
              >
                <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.badgeClass} border`}>
                  {seg.icon
                    ? <span className="text-[9px]">{seg.icon}</span>
                    : <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-foreground">{cfg.label}</span>
                    {active && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                    {tier !== 'superadmin' && (
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${cfg.badgeClass}`}>
                        {cfg.groupLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{cfg.description}</p>
                </div>
              </button>
            );
          })}

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border/60 bg-muted/20">
            <p className="text-[9px] text-muted-foreground/60 leading-snug">
              <span className="font-semibold text-muted-foreground/80">Prototype mode</span> — tier controls navigation visibility only.
              Future: Google Workspace SSO assigns tiers automatically via group membership.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────

export function Topbar() {
  const [location, setLocation] = useLocation();
  const { section, title } = getPageInfo(location);

  return (
    <div className="flex items-center justify-between h-[48px] px-4 border-b bg-card shrink-0">
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary flex-shrink-0">
          <Map className="w-4 h-4" />
        </div>
        <span className="text-base font-semibold font-serif text-foreground leading-none flex-shrink-0">
          {TERMS.brand}
        </span>
        <span className="text-muted-foreground/30 select-none mx-0.5 flex-shrink-0">·</span>
        <span className="text-xs text-muted-foreground font-medium flex-shrink-0 hidden sm:block">{section}</span>
        <span className="text-muted-foreground/30 select-none hidden sm:block flex-shrink-0">/</span>
        <span className="text-sm text-foreground font-medium truncate">{title}</span>
      </div>

      {/* Right — signals + tier switcher + search */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <SignalsIndicator />
        <TierSwitcher />
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
