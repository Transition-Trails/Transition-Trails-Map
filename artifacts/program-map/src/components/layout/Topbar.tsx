import { useRef, useState, useEffect } from 'react';
import { Map, Search as SearchIcon, ChevronDown, Bell, Monitor, User, Layers, Chrome, ChevronRight, LogOut, Menu, Sparkles } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { locationToContext, getSignalPanelConfig, SIGNAL_COUNTS } from '@/data/signalCounts';
import { TERMS } from '@/config/terminology';
import { type AccessTier, TIER_CONFIG, TIER_ORDER } from '@/config/accessTiers';

// ── Page info lookup ──────────────────────────────────────────────────────────

const PAGE_INFO: Array<[string, string, string]> = [
  ['/',                                  'Trail OS',               'Mission Control'],
  ['/trail-os-overview',                 'Trail OS',               'Overview'],
  ['/digital-twin',                      'Digital Twin',           'Explore'],
  ['/digital-twin/governance',           'Digital Twin',           'Governance'],
  ['/operations',                        'Operations',             'Executive Overview'],
  ['/operations/health',                 'Operations',             'Health Indicators'],
  ['/admin/integration-readiness',       'Administration',         'Integration Readiness Center'],
  ['/operations/scorecards',             'Operations',             'Scorecards'],
  ['/operations/trends',                 'Operations',             'Trends & Insights'],
  ['/operations/demand',                 'Operations',             'Demand'],
  ['/program',                           'Programs',               'Programs'],
  ['/program/standards',                 'Programs',               'Standards'],
  ['/program/blueprint',                 'Programs',               'Blueprint'],
  ['/program/resources',                 'Programs',               'Resources'],
  ['/admin/salesforce-arch',             'Administration',         'Salesforce Architecture'],
  ['/penny',                             'Penny',                  'Capabilities'],
  ['/penny/prompts',                     'Penny',                  'Prompt Studio'],
  ['/penny/learners',                    'Penny',                  'Learners'],
  ['/penny/intelligence',                'Penny',                  'Intelligence'],
  ['/penny/test',                        'Penny',                  'Test Penny'],
  ['/knowledge',                         'Knowledge',              'Sources'],
  ['/knowledge/library',                 'Knowledge',              'Library'],
  ['/knowledge/relationships',           'Knowledge',              'Relationships'],
  ['/knowledge/memory',                  'Knowledge',              'Org Memory'],
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

// ── Tier segment config ───────────────────────────────────────────────────────

const TIER_SEGMENTS: { tier: AccessTier; label: string; icon?: string }[] = [
  { tier: 'everyday',   label: 'Everyday' },
  { tier: 'power',      label: 'Power'    },
  { tier: 'admin',      label: 'Admin'    },
  { tier: 'superadmin', label: 'Super', icon: '★' },
];

// Placeholder prototype user (replaced with real Google data post-auth)
const PROTOTYPE_USER = {
  name:     'Trail OS User',
  email:    'prototype@transitiontrails.org',
  initials: 'TT',
  photoUrl: null as string | null,
};

// ── Section row used in the preferences list ──────────────────────────────────
function PrefRow({ icon: Icon, label, hint, badge, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left group"
    >
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-foreground leading-none">{label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{hint}</p>
      </div>
      {badge ? (
        <span className="text-[8px] font-bold uppercase tracking-wide bg-muted border border-border text-muted-foreground/60 px-1.5 py-0.5 rounded flex-shrink-0">
          {badge}
        </span>
      ) : (
        <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors flex-shrink-0" />
      )}
    </button>
  );
}

// ── User profile button + panel ───────────────────────────────────────────────
function UserProfileButton() {
  const { userTier, setUserTier } = useAppContext();
  const [open, setOpen]           = useState(false);
  const ref                       = useRef<HTMLDivElement>(null);

  const current      = TIER_CONFIG[userTier];
  const isPreviewing = userTier !== 'superadmin';
  const user         = PROTOTYPE_USER;

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Tier dot color overlay on avatar
  const tierDot: Record<AccessTier, string> = {
    everyday:   'bg-emerald-500',
    power:      'bg-violet-500',
    admin:      'bg-amber-500',
    superadmin: 'bg-primary',
  };

  return (
    <div className="relative" ref={ref}>

      {/* ── Avatar button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title={`Signed in as ${user.name} · ${current.label} view`}
        className={`relative flex items-center justify-center w-7 h-7 rounded-full ring-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-primary/50 ${
          open
            ? `ring-primary/40 ring-offset-1 ring-offset-background`
            : isPreviewing
            ? `ring-${current.dotClass.replace('bg-', '')}/30 ring-offset-1 ring-offset-background hover:ring-primary/30`
            : 'ring-border/60 hover:ring-primary/30 ring-offset-1 ring-offset-background'
        }`}
      >
        {user.photoUrl ? (
          <img src={user.photoUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
        ) : (
          <div className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold select-none">
            {user.initials}
          </div>
        )}
        {/* Tier dot — bottom-right overlay */}
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-background ${tierDot[userTier]}`} />
      </button>

      {/* ── Profile panel dropdown ── */}
      {open && (
        <div className="absolute right-0 top-[36px] z-50 w-[310px] bg-card border border-border rounded-xl shadow-xl overflow-hidden">

          {/* ── Identity header ── */}
          <div className="px-4 py-3.5 border-b border-border bg-muted/20">
            <div className="flex items-center gap-3">
              {/* Large avatar */}
              <div className="relative w-10 h-10 flex-shrink-0">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="w-full h-full rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold ring-2 ring-border select-none">
                    {user.initials}
                  </div>
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${tierDot[userTier]}`} />
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>

              {/* Prototype badge */}
              <span className="text-[8px] font-bold uppercase tracking-wide bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded flex-shrink-0">
                Prototype
              </span>
            </div>

            {/* Current tier pill */}
            <div className={`mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${current.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tierDot[userTier]}`} />
              {current.label}
              {isPreviewing && <span className="font-normal opacity-60 ml-0.5">· previewing</span>}
            </div>
          </div>

          {/* ── View as / Tier switcher ── */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">View As</p>
            <div className="grid grid-cols-2 gap-1.5">
              {TIER_ORDER.map(tier => {
                const cfg    = TIER_CONFIG[tier];
                const seg    = TIER_SEGMENTS.find(s => s.tier === tier)!;
                const active = userTier === tier;
                return (
                  <button
                    key={tier}
                    onClick={() => setUserTier(tier)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors border text-[11px] font-medium ${
                      active
                        ? `${cfg.badgeClass} shadow-sm`
                        : 'border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground bg-transparent'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tierDot[tier]}`} />
                    {seg.icon && <span className="text-[9px] leading-none mr-[-2px]">{seg.icon}</span>}
                    <span className="flex-1 truncate">{cfg.shortLabel}</span>
                    {active && <span className="text-[8px] opacity-50 font-normal">active</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-muted-foreground/50 mt-2 leading-snug">
              Super Admin can preview any tier. Future: assigned automatically via Google Groups.
            </p>
          </div>

          {/* ── Preferences ── */}
          <div className="py-1">
            <div className="px-4 pt-2 pb-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Preferences</p>
            </div>
            <PrefRow
              icon={Layers}
              label="Trail Signals"
              hint="Configure signal channels and alert thresholds"
              badge="Soon"
            />
            <PrefRow
              icon={Bell}
              label="Notifications"
              hint="Email, Slack, and in-app notification rules"
              badge="Soon"
            />
            <PrefRow
              icon={Monitor}
              label="Display & Accessibility"
              hint="Theme, density, font size, and contrast"
              badge="Soon"
            />
            <PrefRow
              icon={User}
              label="Profile Preferences"
              hint="Name, timezone, language, and defaults"
              badge="Soon"
            />
          </div>

          {/* ── Google account section ── */}
          <div className="px-4 py-3 border-t border-border bg-muted/10">
            <div className="flex items-start gap-2.5">
              <Chrome className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold text-foreground">Google Account</p>
                  <span className="text-[8px] font-bold bg-sky-50 border border-sky-200 text-sky-700 px-1.5 py-0.5 rounded uppercase tracking-wide">
                    Q3 Planned
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  Sign-in, profile photo, and tier assignment via Google Workspace SSO + Groups.
                </p>
              </div>
            </div>
          </div>

          {/* ── Sign out stub ── */}
          <div className="px-4 py-2 border-t border-border">
            <button className="w-full flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1 group">
              <LogOut className="w-3.5 h-3.5 flex-shrink-0 group-hover:text-rose-500 transition-colors" />
              <span className="group-hover:text-rose-600 transition-colors">Sign out</span>
              <span className="ml-auto text-[8px] opacity-40 font-medium">prototype only</span>
            </button>
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
  const { rightPanelOpen, setRightPanelOpen, mobileSidebarOpen, setMobileSidebarOpen } = useAppContext();

  return (
    <div className="flex items-center justify-between h-[48px] px-3 border-b bg-card shrink-0">
      {/* Left — hamburger (mobile) + breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Hamburger — compact/mobile only (< md) */}
        <button
          className="md:hidden flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors flex-shrink-0"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          title="Navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

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

      {/* Right — Ask Penny toggle (split/mobile) + signals + search + user */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Ask Penny panel toggle — split view + mobile (< xl) */}
        <button
          className={`xl:hidden flex items-center gap-1.5 h-[26px] px-2.5 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${
            rightPanelOpen
              ? 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
              : 'bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          title="Ask Penny / Trail Signals"
        >
          <Sparkles className="w-3 h-3 flex-shrink-0" />
          <span className="hidden sm:inline">{rightPanelOpen ? 'Close' : 'Ask Penny'}</span>
        </button>

        <SignalsIndicator />
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => setLocation('/search')}
          title="Global Search"
        >
          <SearchIcon className="w-3.5 h-3.5" />
        </Button>
        <UserProfileButton />
      </div>
    </div>
  );
}
