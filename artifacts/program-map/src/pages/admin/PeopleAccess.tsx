import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Users, Shield, Star, Brain, Lock, Globe, Chrome, Network, Mail,
  ChevronRight, CheckCircle2, XCircle, MinusCircle,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TIER_CONFIG, TIER_FEATURES, TIER_NAV_SUMMARY, TIER_ORDER,
  type AccessTier,
} from '@/config/accessTiers';
import { useAppContext } from '@/context/AppContext';
import PeopleWorkspace from '@/pages/people/PeopleWorkspace';

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'people' | 'access' | 'permissions';

const TABS: { id: Tab; label: string; count?: string }[] = [
  { id: 'people',      label: 'People & Roles',  count: '11' },
  { id: 'access',      label: 'Access Tiers',    count: '4'  },
  { id: 'permissions', label: 'Permissions',                 },
];

const NAV_SECTIONS = [
  'Home', 'Global Search', 'Context Engine',
  'Operations', 'Programs', 'Penny', 'Knowledge',
  'Collaboration', 'Digital Twin', 'Administration',
];

const FEATURE_ROWS = Object.keys(TIER_FEATURES);

const TIER_ICONS: Record<AccessTier, React.ReactNode> = {
  everyday:   <Users  className="w-4 h-4" />,
  power:      <Brain  className="w-4 h-4" />,
  admin:      <Shield className="w-4 h-4" />,
  superadmin: <Star   className="w-4 h-4" />,
};

// ── Shared helpers ────────────────────────────────────────────────────────────

function NavCell({ value }: { value: string }) {
  if (value.startsWith('✓')) {
    return (
      <span className="flex items-start gap-1 text-[11px] text-foreground">
        <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
        <span>{value.replace('✓ ', '')}</span>
      </span>
    );
  }
  if (value.startsWith('—')) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
        <XCircle className="w-3 h-3 flex-shrink-0" />
        <span>{value.replace('— ', '')}</span>
      </span>
    );
  }
  return (
    <span className="flex items-start gap-1 text-[11px] text-muted-foreground">
      <MinusCircle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
      <span>{value}</span>
    </span>
  );
}

// ── Access Tiers tab ──────────────────────────────────────────────────────────

function AccessTiersTab({
  userTier, setUserTier,
}: {
  userTier: AccessTier;
  setUserTier: (t: AccessTier) => void;
}) {
  const [, setLocation] = useLocation();

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-6 max-w-5xl">

        {/* Auth live notice */}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-[12px] text-emerald-800 leading-snug">
            <strong>Authentication is live</strong> — Google Sign-In via Clerk is active. Tier is
            auto-assigned from Google Group membership on sign-in. Use "Preview this tier" below
            to simulate a different access level in the current session.
          </p>
        </div>

        {/* Tier cards */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">Access Tiers</p>
          <div className="grid grid-cols-4 gap-3">
            {TIER_ORDER.map(tier => {
              const cfg    = TIER_CONFIG[tier];
              const active = userTier === tier;
              return (
                <div
                  key={tier}
                  className={`rounded-xl border p-4 transition-all ${
                    active
                      ? `${cfg.colorClass} ring-2 ring-offset-1 ring-current/30`
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`p-1.5 rounded-md ${active ? 'bg-current/10' : 'bg-muted'} text-current`}>
                      {TIER_ICONS[tier]}
                    </span>
                    {active && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-current bg-current/10 px-1.5 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-bold text-foreground mt-2">{cfg.label}</p>
                  {tier !== 'superadmin' && (
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{cfg.groupLabel}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{cfg.description}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1.5 leading-snug">{cfg.detail}</p>
                  {tier !== userTier && (
                    <button
                      onClick={() => setUserTier(tier)}
                      className="mt-3 w-full text-[10px] font-semibold px-2 py-1 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                    >
                      Preview this tier →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Google Groups mapping */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
            Google Groups → Trail OS Tier Mapping
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <div
              className="grid bg-muted/40 border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-4 py-2"
              style={{ gridTemplateColumns: '200px 1fr 200px 1fr' }}
            >
              <span>Google Group</span>
              <span>Trail OS Role</span>
              <span>Tier</span>
              <span>Default Lens</span>
            </div>
            {TIER_ORDER.filter(t => t !== 'superadmin').map((tier, i) => {
              const cfg = TIER_CONFIG[tier];
              return (
                <div
                  key={tier}
                  className={`grid px-4 py-3 text-[12px] items-center ${i % 2 === 0 ? '' : 'bg-muted/20'}`}
                  style={{ gridTemplateColumns: '200px 1fr 200px 1fr' }}
                >
                  <span className="font-mono text-[11px] text-muted-foreground">{cfg.googleGroup.split('@')[0]}@…</span>
                  <span className="font-medium text-foreground">{cfg.groupLabel}</span>
                  <span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
                      {cfg.label}
                    </span>
                  </span>
                  <span className="text-muted-foreground capitalize">{cfg.defaultLens}</span>
                </div>
              );
            })}
            <div
              className="grid px-4 py-3 text-[12px] items-center bg-primary/5 border-t border-primary/10"
              style={{ gridTemplateColumns: '200px 1fr 200px 1fr' }}
            >
              <span className="font-mono text-[11px] text-muted-foreground/60">N/A — prototype</span>
              <span className="font-medium text-foreground">Builder / Super Admin</span>
              <span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                  Super Admin
                </span>
              </span>
              <span className="text-muted-foreground">builder</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Live group addresses:{' '}
            <span className="font-mono">trailosusers@transitiontrails.org</span> (Everyday),{' '}
            <span className="font-mono">trailospennyadmin@transitiontrails.org</span> (Power),{' '}
            <span className="font-mono">trailosadmin@transitiontrails.org</span> (Admin)
            — managed in Google Workspace Admin.
          </p>
        </div>

        {/* Google Workspace Authentication — live */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
            Google Workspace Authentication
          </p>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-emerald-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Chrome className="w-5 h-5 text-[#4285F4]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13px] font-semibold text-foreground">Google Sign-In (OAuth 2.0 + OpenID Connect)</p>
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase tracking-wide">Live</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Users sign in with their Transition Trails Google account. Tier is auto-assigned from Google Group membership.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: <Globe className="w-4 h-4 text-emerald-600" />,
                  title: 'Step 1 — Google Sign-In',
                  body: 'Clerk handles Google OAuth. Users sign in with @transitiontrails.org accounts — no separate Trail OS password.',
                  status: 'live',
                },
                {
                  icon: <Users className="w-4 h-4 text-emerald-600" />,
                  title: 'Step 2 — Google Groups',
                  body: 'Three Trail OS groups defined in Google Workspace Admin: trailosadmin, trailospennyadmin, and trailosusers.',
                  status: 'live',
                },
                {
                  icon: <Network className="w-4 h-4 text-emerald-600" />,
                  title: 'Step 3 — Auto Tier Assignment',
                  body: 'On sign-in, /api/auth/tier checks Google Directory API group membership and assigns the matching access tier.',
                  status: 'needs-token',
                },
              ].map(step => (
                <div key={step.title} className="bg-white border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {step.icon}
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      step.status === 'live'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {step.status === 'live' ? 'Live' : 'Needs Token'}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-foreground mb-1">{step.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-snug">{step.body}</p>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <Mail className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>
                <strong className="text-amber-800">To enable group-based tier assignment:</strong>{' '}
                Set <code className="bg-amber-100 px-1 rounded">GOOGLE_DIRECTORY_REFRESH_TOKEN</code> in Admin → Setup.
                Without it, all @transitiontrails.org users default to the Everyday tier.
              </span>
            </div>

            <button
              onClick={() => setLocation('/admin/google-oauth')}
              className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
            >
              View Google Auth Setup <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Permissions tab ───────────────────────────────────────────────────────────

function PermissionsTab() {
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-6 max-w-5xl">

        {/* Navigation visibility */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
            Navigation Visibility
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <div
              className="grid bg-muted/40 border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70"
              style={{ gridTemplateColumns: '140px 1fr 1fr 1fr 1fr' }}
            >
              <div className="px-4 py-2">Section</div>
              {TIER_ORDER.map(tier => {
                const cfg = TIER_CONFIG[tier];
                return (
                  <div key={tier} className="px-3 py-2 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                    {cfg.shortLabel}
                  </div>
                );
              })}
            </div>
            {NAV_SECTIONS.map((section, i) => (
              <div
                key={section}
                className={`grid items-start ${i % 2 === 0 ? '' : 'bg-muted/20'}`}
                style={{ gridTemplateColumns: '140px 1fr 1fr 1fr 1fr' }}
              >
                <div className="px-4 py-3 text-[12px] font-semibold text-foreground">{section}</div>
                {TIER_ORDER.map(tier => (
                  <div key={tier} className="px-3 py-3">
                    <NavCell value={TIER_NAV_SUMMARY[tier][section] ?? '—'} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Feature capabilities */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
            Feature Capabilities
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <div
              className="grid bg-muted/40 border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70"
              style={{ gridTemplateColumns: '160px 1fr 1fr 1fr 1fr' }}
            >
              <div className="px-4 py-2">Feature</div>
              {TIER_ORDER.map(tier => {
                const cfg = TIER_CONFIG[tier];
                return (
                  <div key={tier} className="px-3 py-2 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                    {cfg.shortLabel}
                  </div>
                );
              })}
            </div>
            {FEATURE_ROWS.map((feature, i) => (
              <div
                key={feature}
                className={`grid items-start ${i % 2 === 0 ? '' : 'bg-muted/20'}`}
                style={{ gridTemplateColumns: '160px 1fr 1fr 1fr 1fr' }}
              >
                <div className="px-4 py-3 text-[12px] font-semibold text-foreground">{feature}</div>
                {TIER_ORDER.map(tier => (
                  <div key={tier} className="px-3 py-3 text-[11px] text-muted-foreground leading-snug">
                    {TIER_FEATURES[feature][tier]}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PeopleAccess() {
  const [activeTab, setActiveTab] = useState<Tab>('people');
  const { userTier, setUserTier } = useAppContext();

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Compact header */}
      <div className="flex-shrink-0 border-b bg-card">
        <div className="flex items-center justify-between gap-4 px-5 pt-3 pb-0">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
              Administration · People &amp; Access
            </p>
            <h1 className="text-[15px] font-semibold text-foreground leading-snug">People, Roles &amp; Access</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5 mb-3">
              Personas, organizational roles, platform access tiers, Google Groups mapping, and permission matrix.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 pb-3">
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <Lock className="w-3 h-3 text-amber-600" />
              <span className="text-[11px] font-semibold text-amber-700">Prototype mode</span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0 px-5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/60'
              }`}
            >
              {tab.label}
              {tab.count && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — each fills remaining height */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'people'      && <PeopleWorkspace />}
        {activeTab === 'access'      && <AccessTiersTab userTier={userTier} setUserTier={setUserTier} />}
        {activeTab === 'permissions' && <PermissionsTab />}
      </div>

    </div>
  );
}
