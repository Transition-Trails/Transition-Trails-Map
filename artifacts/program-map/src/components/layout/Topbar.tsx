import { useRef, useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/react';
import { Map, Search as SearchIcon, ChevronDown, Bell, Monitor, User, Layers, Chrome, ChevronRight, LogOut, Menu, Sparkles, CalendarDays, Activity, Mail } from 'lucide-react';
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
  ['/admin/people-access',                 'Administration',         'People & Access'],
  ['/admin/integration-readiness',         'Administration',         'Integration Readiness Center'],
  ['/admin/integrations/google-auth',      'Administration',         'Google OAuth Authorization'],
  ['/admin/integrations/google-drive',     'Administration',         'Google Drive Integration'],
  ['/admin/integrations/google-calendar',  'Administration',         'Google Calendar Integration'],
  ['/admin/integrations/secrets',          'Administration',         'Secrets Audit'],
  ['/admin/integrations',                  'Administration',         'Integrations'],
  ['/admin/phase1-readiness',              'Administration',         'Phase 1 Readiness'],
  ['/admin/phase1-audit',                  'Administration',         'Penny Capability Build Audit'],
  ['/admin/ux-standards',                  'Administration',         'UX Standards'],
  ['/admin/create-audit',                  'Administration',         'Create Audit'],
  ['/admin/sf-validation',                 'Administration',         'SF Validation'],
  ['/admin/salesforce-arch',               'Administration',         'Salesforce Architecture'],
  ['/admin/program-resources',             'Administration',         'Program Resources'],
  ['/admin/program-config',               'Administration',         'Program Config'],
  ['/operations/scorecards',             'Operations',             'Scorecards'],
  ['/operations/trends',                 'Operations',             'Trends & Insights'],
  ['/operations/demand',                 'Operations',             'Demand'],
  ['/program',                           'Programs',               'Programs'],
  ['/program/standards',                 'Programs',               'Standards'],
  ['/program/blueprint',                 'Programs',               'Blueprint'],
  ['/admin/salesforce-arch',             'Administration',         'Salesforce Architecture'],
  ['/admin/sf-validation',               'Administration',         'SF Validation Center'],
  ['/admin/program-resources',           'Administration',         'Drive Workspaces'],
  ['/penny',                             TERMS.aiAssistant,        'Overview'],
  ['/penny/capabilities',               TERMS.aiAssistant,        'Capabilities'],
  ['/penny/prompts',                     TERMS.aiAssistant,        'Prompt Studio'],
  ['/penny/learners',                    TERMS.aiAssistant,        'Learners'],
  ['/penny/intelligence',               TERMS.aiAssistant,        'Intelligence'],
  ['/penny/test',                        TERMS.aiAssistant,        `Test ${TERMS.aiAssistant}`],
  ['/knowledge',                         'Knowledge',              'Overview'],
  ['/knowledge/sources',                 'Knowledge',              'Sources'],
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
  if (location.startsWith('/admin'))        return { section: 'Administration', title: 'Administration' };
  if (location.startsWith('/digital-twin')) return { section: 'Digital Twin',   title: 'Explore' };
  if (location.startsWith('/governance'))   return { section: 'Digital Twin',   title: 'Governance' };
  if (location.startsWith('/uom'))          return { section: 'Digital Twin',   title: 'Object Model' };
  if (location.startsWith('/operations'))   return { section: 'Operations',     title: 'Dashboard' };
  if (location.startsWith('/program'))      return { section: 'Programs',       title: 'Dashboard' };
  if (location.startsWith('/penny'))        return { section: TERMS.aiAssistant, title: 'Dashboard' };
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
    { key: 'drive',      color: 'bg-[#E6F0EA]0',  count: counts.sources.drive      },
    { key: 'salesforce', color: 'bg-[#EDF5F8]0',       count: counts.sources.salesforce },
    { key: 'calendar',   color: 'bg-[#A93F2F]',      count: counts.sources.calendar   },
    { key: 'email',      color: 'bg-[#2F6F7E]',      count: counts.sources.email      },
  ].filter(s => s.count > 0);

  return (
    <button
      onClick={() => openSlackPanel(getSignalPanelConfig(context))}
      title={TERMS.signalTooltip(counts.total, counts.urgent)}
      className={`group flex items-center gap-1.5 h-[26px] px-2.5 rounded-full text-[10px] font-semibold border transition-all duration-200 whitespace-nowrap ${
        panelOpen
          ? 'bg-[#4A154B]/10 border-[#4A154B]/25 text-[#4A154B]/80'
          : counts.urgent > 0
          ? 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400] hover:bg-[#FFF3E0] hover:border-[#FFD08A]'
          : 'bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {/* Icon — always visible (mirrors Sparkles for Penny, CalendarDays for Calendar) */}
      <Activity className="w-3 h-3 flex-shrink-0" />
      {/* Urgent pulse dot — only when there are urgent signals and panel is closed */}
      {counts.urgent > 0 && !panelOpen && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#CC8400] animate-pulse flex-shrink-0" />
      )}
      {/* Text — hidden below sm breakpoint, matching Penny/Calendar pattern */}
      <span className="hidden sm:inline">
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
  const { user: clerkUser }       = useUser();
  const { signOut }               = useClerk();
  const [open, setOpen]           = useState(false);
  const ref                       = useRef<HTMLDivElement>(null);

  const current      = TIER_CONFIG[userTier];
  const isPreviewing = userTier !== 'superadmin';

  // Derive display data from Clerk user
  const name     = clerkUser?.fullName ?? clerkUser?.firstName ?? 'Trail OS User';
  const email    = clerkUser?.primaryEmailAddress?.emailAddress ?? '';
  const initials = clerkUser
    ? (`${clerkUser.firstName?.[0] ?? ''}${clerkUser.lastName?.[0] ?? ''}`
        .toUpperCase() || 'TO')
    : 'TO';
  const photoUrl = clerkUser?.imageUrl ?? null;

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
    everyday:   'bg-[#E6F0EA]0',
    power:      'bg-[#EDF5F8]0',
    admin:      'bg-[#FFF3E0]0',
    superadmin: 'bg-primary',
  };

  return (
    <div className="relative" ref={ref}>

      {/* ── Avatar button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title={`Signed in as ${name} · ${current.label} view`}
        className={`relative flex items-center justify-center w-7 h-7 rounded-full ring-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-primary/50 ${
          open
            ? `ring-primary/40 ring-offset-1 ring-offset-background`
            : isPreviewing
            ? `ring-${current.dotClass.replace('bg-', '')}/30 ring-offset-1 ring-offset-background hover:ring-primary/30`
            : 'ring-border/60 hover:ring-primary/30 ring-offset-1 ring-offset-background'
        }`}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="w-full h-full rounded-full object-cover" />
        ) : (
          <div className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold select-none">
            {initials}
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
                {photoUrl ? (
                  <img src={photoUrl} alt={name} className="w-full h-full rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold ring-2 ring-border select-none">
                    {initials}
                  </div>
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${tierDot[userTier]}`} />
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{email}</p>
              </div>

              {/* Google connected badge */}
              <span className="text-[8px] font-bold uppercase tracking-wide bg-[#E6F0EA] border border-[#9FC3AE] text-[#2F6B3F] px-1.5 py-0.5 rounded flex-shrink-0">
                Google
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
              Tier auto-assigned via Google Groups on sign-in. Super Admin can preview any tier.
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
              <Chrome className="w-3.5 h-3.5 text-[#2F6B3F] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold text-foreground">Google Account</p>
                  <span className="text-[8px] font-bold bg-[#E6F0EA] border border-[#9FC3AE] text-[#2F6B3F] px-1.5 py-0.5 rounded uppercase tracking-wide">
                    Connected
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug truncate">
                  {email || 'Signed in via Google Workspace'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Sign out ── */}
          <div className="px-4 py-2 border-t border-border">
            <button
              onClick={() => { setOpen(false); void signOut(); }}
              className="w-full flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1 group"
            >
              <LogOut className="w-3.5 h-3.5 flex-shrink-0 group-hover:text-[#A93F2F] transition-colors" />
              <span className="group-hover:text-[#A93F2F] transition-colors">Sign out</span>
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
  const {
    rightPanelOpen, setRightPanelOpen,
    askPennyOpen, setAskPennyOpen,
    calendarPanelOpen, setCalendarPanelOpen,
    gmailPanelOpen, setGmailPanelOpen,
    mobileSidebarOpen, setMobileSidebarOpen,
  } = useAppContext();

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
        <span className="text-base font-semibold text-foreground leading-none flex-shrink-0">
          {TERMS.brand}
        </span>
        <span className="text-muted-foreground/30 select-none mx-0.5 flex-shrink-0">·</span>
        <span className="text-xs text-muted-foreground font-medium flex-shrink-0 hidden sm:block">{section}</span>
        <span className="text-muted-foreground/30 select-none hidden sm:block flex-shrink-0">/</span>
        <span className="text-sm text-foreground font-medium truncate">{title}</span>
      </div>

      {/* Right — Ask Penny toggle (split/mobile) + signals + search + user */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Ask Penny panel toggle — always visible */}
        <button
          className={`flex items-center gap-1.5 h-[26px] px-2.5 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${
            askPennyOpen
              ? 'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E] hover:bg-[#EDF5F8]'
              : 'bg-muted/40 border-border/70 text-muted-foreground hover:bg-[#EDF5F8] hover:border-[#7FAFC6] hover:text-[#2F6F7E]'
          }`}
          onClick={() => {
            if (askPennyOpen) {
              setAskPennyOpen(false);
            } else {
              setAskPennyOpen(true);
              setCalendarPanelOpen(false);
            }
          }}
          title={`Ask ${TERMS.aiAssistant} (AI guide)`}
        >
          <Sparkles className="w-3 h-3 flex-shrink-0" />
          <span className="hidden sm:inline">{askPennyOpen ? 'Close' : TERMS.aiAssistant}</span>
        </button>

        {/* Calendar action panel toggle */}
        <button
          className={`flex items-center gap-1.5 h-[26px] px-2.5 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${
            calendarPanelOpen
              ? 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F] hover:bg-[#E6F0EA]'
              : 'bg-muted/40 border-border/70 text-muted-foreground hover:bg-[#E6F0EA] hover:border-[#9FC3AE] hover:text-[#2F6B3F]'
          }`}
          onClick={() => {
            if (calendarPanelOpen) {
              setCalendarPanelOpen(false);
            } else {
              setCalendarPanelOpen(true);
              setAskPennyOpen(false);
              setGmailPanelOpen(false);
            }
          }}
          title={`Calendar — upcoming events & ${TERMS.aiAssistant} prep briefs`}
        >
          <CalendarDays className="w-3 h-3 flex-shrink-0" />
          <span className="hidden sm:inline">{calendarPanelOpen ? 'Close' : 'Calendar'}</span>
        </button>

        {/* Gmail action panel toggle */}
        <button
          className={`flex items-center gap-1.5 h-[26px] px-2.5 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${
            gmailPanelOpen
              ? 'bg-[#FBEAE6] border-[#E8B9B4] text-[#A93F2F] hover:bg-[#FBEAE6]'
              : 'bg-muted/40 border-border/70 text-muted-foreground hover:bg-[#FBEAE6] hover:border-[#E8B9B4] hover:text-[#A93F2F]'
          }`}
          onClick={() => {
            if (gmailPanelOpen) {
              setGmailPanelOpen(false);
            } else {
              setGmailPanelOpen(true);
              setAskPennyOpen(false);
              setCalendarPanelOpen(false);
            }
          }}
          title={`Mail — inbox & ${TERMS.aiAssistant} draft assist`}
        >
          <Mail className="w-3 h-3 flex-shrink-0" />
          <span className="hidden sm:inline">{gmailPanelOpen ? 'Close' : 'Mail'}</span>
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
