import { useLocation } from 'wouter';
import {
  Shield, Users, Brain, Settings, Star, ArrowLeft,
  CheckCircle2, XCircle, MinusCircle, Lock, Globe,
  Mail, Chrome, Network, ChevronRight,
} from 'lucide-react';
import { TIER_CONFIG, TIER_FEATURES, TIER_NAV_SUMMARY, TIER_ORDER, type AccessTier } from '@/config/accessTiers';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TERMS } from '@/config/terminology';

const NAV_SECTIONS = [
  'Home', 'Global Search', 'Context Engine',
  'Operations', 'Programs', TERMS.aiAssistant, 'Knowledge',
  'Collaboration', 'Digital Twin', 'Administration',
];

const FEATURE_ROWS = Object.keys(TIER_FEATURES);

const TIER_ICONS: Record<AccessTier, React.ReactNode> = {
  everyday:   <Users  className="w-4 h-4" />,
  power:      <Brain  className="w-4 h-4" />,
  admin:      <Shield className="w-4 h-4" />,
  superadmin: <Star   className="w-4 h-4" />,
};

function NavCell({ value }: { value: string }) {
  if (value.startsWith('✓')) {
    return (
      <span className="flex items-start gap-1 text-[11px] text-foreground">
        <CheckCircle2 className="w-3 h-3 text-[#2F6B3F] mt-0.5 flex-shrink-0" />
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
      <MinusCircle className="w-3 h-3 text-[#CC8400] mt-0.5 flex-shrink-0" />
      <span>{value}</span>
    </span>
  );
}

interface AccessRolesMatrixProps {
  onBack: () => void;
}

export default function AccessRolesMatrix({ onBack }: AccessRolesMatrixProps) {
  const { userTier, setUserTier } = useAppContext();
  const [, setLocation] = useLocation();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Administration
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Access &amp; Roles</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Trail OS uses four access tiers to control what each user sees. In production, tiers are
                assigned automatically via Google Workspace group membership. In prototype mode, use the
                tier switcher in the Topbar to preview any tier.
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-[#FFF3E0] border border-[#FFD08A] text-[#CC8400] text-[11px] font-medium px-3 py-1.5 rounded-full flex-shrink-0">
              <Lock className="w-3.5 h-3.5" />
              Prototype — no auth enforced
            </div>
          </div>
        </div>

        {/* ── Tier cards ─────────────────────────────────────────────── */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Access Tiers
          </h2>
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

                  {/* Preview button */}
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

        {/* ── Google Groups mapping ──────────────────────────────────── */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Google Groups → Trail OS Role Mapping
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[200px_1fr_200px_1fr] bg-muted/40 border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-4 py-2">
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
                  className={`grid grid-cols-[200px_1fr_200px_1fr] px-4 py-3 text-[12px] items-center ${
                    i % 2 === 0 ? '' : 'bg-muted/20'
                  }`}
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
            <div className="grid grid-cols-[200px_1fr_200px_1fr] px-4 py-3 text-[12px] items-center bg-primary/5 border-t border-primary/10">
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
            Full group addresses: <span className="font-mono">trail-os-users@transitiontrails.org</span>,{' '}
            <span className="font-mono">trail-power-users@…</span>,{' '}
            <span className="font-mono">trail-admins@…</span> — update in <code>src/config/accessTiers.ts</code> when your Google Workspace domain is finalized.
          </p>
        </div>

        {/* ── Navigation visibility matrix ───────────────────────────── */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Navigation Visibility
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Header */}
            <div className="grid bg-muted/40 border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70"
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
            {/* Rows */}
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

        {/* ── Feature capabilities ───────────────────────────────────── */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Feature Capabilities
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid bg-muted/40 border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70"
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

        {/* ── Google Sign-In placeholder ─────────────────────────────── */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Future: Google Workspace Authentication
          </h2>
          <div className="rounded-xl border border-dashed border-border bg-muted/10 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center flex-shrink-0 shadow-sm">
                <Chrome className="w-5 h-5 text-[#4285F4]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">Google Sign-In (OAuth 2.0 + OpenID Connect)</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Users will sign in with their Transition Trails Google account. No separate Trail OS password required.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: <Globe className="w-4 h-4 text-[#2F6F7E]" />,
                  title: 'Step 1 — Google OAuth App',
                  body: 'Configure OAuth client in Google Cloud Console for the Trail OS domain. Client ID is already set up in /admin/google-oauth for the prototype.',
                  status: 'partial',
                },
                {
                  icon: <Users className="w-4 h-4 text-[#2F6F7E]" />,
                  title: 'Step 2 — Google Groups Setup',
                  body: 'Create trail-os-users, trail-power-users, and trail-admins groups in Google Admin. Add members to grant access tiers automatically.',
                  status: 'planned',
                },
                {
                  icon: <Network className="w-4 h-4 text-[#2F6B3F]" />,
                  title: 'Step 3 — Group Membership Check',
                  body: 'On sign-in, Trail OS calls the Google Directory API to check group membership and assign the matching access tier. Tier updates automatically when group membership changes.',
                  status: 'planned',
                },
              ].map(step => (
                <div key={step.title} className="bg-white border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {step.icon}
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      step.status === 'partial'
                        ? 'bg-[#FFF3E0] text-[#CC8400]'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.status === 'partial' ? 'Partial' : 'Planned'}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-foreground mb-1">{step.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-snug">{step.body}</p>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-[#EDF5F8] border border-[#EDF5F8] rounded-lg px-3 py-2">
              <Mail className="w-3.5 h-3.5 text-[#2F6F7E] mt-0.5 flex-shrink-0" />
              <span>
                <span className="font-semibold text-[#2F6F7E]">Prototype access:</span>{' '}
                Use the tier switcher (★ Super button in Topbar) to preview any tier. Google Workspace SSO will
                replace this when enabled — no code changes needed in components, just wire the auth response to{' '}
                <code className="bg-[#EDF5F8] px-1 rounded">setUserTier()</code> in AppContext.
              </span>
            </div>

            <button
              onClick={() => setLocation('/admin/google-oauth')}
              className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
            >
              View Google Auth Setup
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
