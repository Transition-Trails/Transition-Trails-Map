// Compact Knowledge Brief version of a Universal Object Profile.
// Used in the ContextPanel rail when any UOM-typed object is selected.

import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ArrowRight, ExternalLink } from 'lucide-react';
import type { ObjectProfile, ProfileHealthStatus } from '@/data/universalObjectProfileData';
import { PROFILE_MAP } from '@/data/universalObjectProfileData';
import { OBJECT_MAP } from '@/data/unifiedObjectModelData';

const HEALTH_CONFIG: Record<ProfileHealthStatus, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  'healthy':        { icon: CheckCircle2,   color: 'text-[#2F6B3F]', bg: 'bg-[#E6F0EA] border-[#9FC3AE]', label: 'Healthy'         },
  'needs-attention':{ icon: AlertTriangle,  color: 'text-[#CC8400]',   bg: 'bg-[#FFF3E0] border-[#FFD08A]',    label: 'Needs Attention' },
  'incomplete':     { icon: XCircle,        color: 'text-[#A93F2F]',    bg: 'bg-[#FBEAE6] border-[#E8B9B4]',      label: 'Incomplete'      },
  'unknown':        { icon: HelpCircle,     color: 'text-muted-foreground', bg: 'bg-muted/30 border-border',  label: 'Unknown'         },
};

const INDICATOR_DOT: Record<string, string> = {
  healthy: 'bg-[#E6F0EA]0', warning: 'bg-[#FFF3E0]0', critical: 'bg-[#A93F2F]', unknown: 'bg-muted-foreground/40',
};

// Full UOM profile brief — used when profile instance data exists
function FullProfileBrief({ profile }: { profile: ObjectProfile }) {
  const [, setLocation] = useLocation();
  const hCfg   = HEALTH_CONFIG[profile.health.overall];
  const HIcon  = hCfg.icon;
  const topRels = profile.relationships.slice(0, 4);
  const topInds = profile.health.indicators.slice(0, 3);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${profile.categoryBg} ${profile.categoryColor}`}>
              {profile.category}
            </span>
            <span className="text-[9px] text-muted-foreground">{profile.objectTypeName}</span>
          </div>
          <h2 className="text-base font-bold text-foreground">{profile.name}</h2>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{profile.description}</p>
        </div>

        {/* Health */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${hCfg.bg}`}>
          <HIcon className={`w-3.5 h-3.5 shrink-0 ${hCfg.color}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-[11px] font-bold ${hCfg.color}`}>{hCfg.label}</p>
            <p className="text-[10px] text-muted-foreground truncate">{profile.health.summary.slice(0, 80)}…</p>
          </div>
        </div>

        {/* Top indicators */}
        {topInds.length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Health Indicators</p>
            {topInds.map(ind => (
              <div key={ind.name} className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${INDICATOR_DOT[ind.status]}`} />
                <span className="text-[11px] text-foreground flex-1">{ind.name}</span>
                <span className="text-[10px] font-medium text-foreground/80">{ind.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Ownership */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Owner</p>
          <p className="text-[11px] font-semibold text-[#2F6F7E]">{profile.ownership.primary}</p>
          <p className="text-[10px] text-muted-foreground">{profile.ownership.team}</p>
        </div>

        {/* Top relationships */}
        {topRels.length > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Relationships</p>
            <div className="space-y-1">
              {topRels.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className={`text-[8px] px-1 py-0.5 rounded border ${r.direction === 'upstream' ? 'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E]' : 'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E]'}`}>
                    {r.direction === 'upstream' ? '↑' : '↓'}
                  </span>
                  <span className="text-[10px] text-foreground truncate">{r.objectName}</span>
                  {r.profileId && PROFILE_MAP[r.profileId] && (
                    <button onClick={() => setLocation(`/uom/profile/${r.profileId}`)} className="text-primary shrink-0">
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <button
            onClick={() => setLocation(`/uom/profile/${profile.id}`)}
            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline w-full"
          >
            View Full Profile <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setLocation(profile.workspaceLink)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground w-full"
          >
            Open Workspace <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </ScrollArea>
  );
}

// Generic UOM type brief — used when only the UOM type def is available (no profile instance)
function UOMTypeBrief({ type, data }: { type: string; data: any }) {
  const [, setLocation] = useLocation();

  // Map selectedItem types to UOM object type IDs
  const TYPE_TO_UOM: Record<string, string> = {
    role: 'role', persona: 'person', roleBlueprint: 'program-blueprint', roleParticipation: 'cohort',
    healthIndicator: 'program', oicRecommendation: 'program', trendInsight: 'program', twinNode: 'program',
  };
  const uomId   = TYPE_TO_UOM[type];
  const uomType = uomId ? OBJECT_MAP[uomId] : null;
  const name    = data?.name ?? data?.title ?? type;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {uomType && (
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{uomType.category.replace('-layer', '').replace('-', ' ')} Layer</span>
            <h2 className="text-base font-bold text-foreground">{name}</h2>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{uomType.purpose}</p>
          </div>
        )}
        {!uomType && (
          <div>
            <h2 className="text-base font-bold text-foreground">{name}</h2>
            {data?.description && <p className="text-[11px] text-muted-foreground">{data.description}</p>}
          </div>
        )}

        {data && Object.keys(data).filter(k => typeof data[k] === 'string' && k !== 'id').slice(0, 5).length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Key Details</p>
            {Object.keys(data).filter(k => typeof data[k] === 'string' && k !== 'id').slice(0, 5).map(k => (
              <div key={k} className="flex items-baseline gap-1.5">
                <span className="text-[9px] text-muted-foreground/60 capitalize w-20 shrink-0">{k.replace(/([A-Z])/g,' $1').toLowerCase()}</span>
                <span className="text-[11px] text-foreground">{String(data[k]).slice(0, 60)}</span>
              </div>
            ))}
          </div>
        )}

        {uomType && (
          <>
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Owned By</p>
              {uomType.ownership.slice(0, 2).map(o => <p key={o} className="text-[11px] font-medium text-[#2F6F7E]">{o}</p>)}
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Source of Truth</p>
              <p className="text-[11px] text-[#2F6B3F] font-medium">{uomType.sourceOfTruth}</p>
            </div>
            <div className="pt-1 border-t border-border/40">
              <button
                onClick={() => setLocation(`/uom/explorer`)}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline w-full"
              >
                View in Object Explorer <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function ObjectProfileBrief({
  profileId,
  type,
  data,
}: {
  profileId?: string;
  type?: string;
  data?: any;
}) {
  const profile = profileId ? PROFILE_MAP[profileId] : null;
  if (profile) return <FullProfileBrief profile={profile} />;
  if (type)    return <UOMTypeBrief type={type} data={data ?? {}} />;
  return null;
}
