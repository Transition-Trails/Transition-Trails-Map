import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { LayoutGrid, Star, Layers, CheckCircle, AlertCircle, FileEdit, Brain, ChevronRight, Sparkles, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';

// ── Tiny shared primitives ────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
      {children}
    </p>
  );
}

function StatPill({
  value, label, color,
}: { value: number | string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-2.5 rounded-lg border border-border bg-white min-w-[72px]">
      <span className={`text-xl font-semibold ${color}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground mt-0.5 text-center leading-tight">{label}</span>
    </div>
  );
}

function NavCard({
  icon: Icon, title, desc, path, badge, badgeColor,
}: {
  icon: React.ElementType; title: string; desc: string; path: string;
  badge?: string; badgeColor?: string;
}) {
  const [, setLocation] = useLocation();
  return (
    <button
      onClick={() => setLocation(path)}
      className="group w-full text-left rounded-lg border border-border bg-white p-4 hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-foreground">{title}</p>
            <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className={`text-[9px] font-bold border rounded px-1.5 py-0.5 ${badgeColor ?? 'bg-muted text-muted-foreground border-border'}`}>
              {badge}
            </span>
          )}
          <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  );
}

// ── Confidence dot + label ────────────────────────────────────────────────────

const CONFIDENCE_CONFIG = {
  confirmed:    { dot: 'bg-emerald-500', label: 'Confirmed', textCls: 'text-emerald-700', bgCls: 'bg-emerald-50 border-emerald-200' },
  'needs-review': { dot: 'bg-amber-400',   label: 'Needs Review', textCls: 'text-amber-700', bgCls: 'bg-amber-50 border-amber-200' },
  draft:        { dot: 'bg-slate-400',   label: 'Draft',     textCls: 'text-slate-600',  bgCls: 'bg-slate-50 border-slate-200' },
  deprecated:   { dot: 'bg-rose-400',    label: 'Deprecated', textCls: 'text-rose-700',  bgCls: 'bg-rose-50 border-rose-200' },
} as const;

// ── Main component ────────────────────────────────────────────────────────────

export default function ProgramOverview() {
  const [, setLocation] = useLocation();
  const { programs } = useAppContext();
  const { isEveryday, isAdminOrAbove } = useTierFlags();

  const stats = useMemo(() => {
    const confirmed    = programs.filter(p => p.confidence === 'confirmed').length;
    const needsReview  = programs.filter(p => p.confidence === 'needs-review').length;
    const draft        = programs.filter(p => p.confidence === 'draft').length;
    const pennyActive  = programs.filter(p => p.pennyFeatures?.length > 0).length;
    const blueprintOk  = programs.filter(p => p.confidence === 'confirmed').length;
    const withoutPenny = programs.filter(p => !p.pennyFeatures?.length).length;
    return { confirmed, needsReview, draft, pennyActive, blueprintOk, withoutPenny };
  }, [programs]);

  if (isEveryday) {
    // Everyday: compact list of programs with Penny features — no governance detail
    return (
      <ScrollArea className="h-full">
        <div className="p-5 space-y-4 max-w-2xl">
          <Eyebrow>Your Programs</Eyebrow>
          <div className="space-y-2">
            {programs
              .filter(p => p.confidence !== 'deprecated')
              .map(p => {
                const cfg = CONFIDENCE_CONFIG[p.confidence] ?? CONFIDENCE_CONFIG.draft;
                return (
                  <button
                    key={p.id}
                    onClick={() => setLocation('/program/programs')}
                    className="group w-full text-left rounded-lg border border-border bg-white p-3.5 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.coreOutcome}</p>
                      </div>
                      {p.pennyFeatures?.length > 0 && (
                        <span className="text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 shrink-0">
                          Penny Active
                        </span>
                      )}
                      <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary shrink-0" />
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5 max-w-4xl">

        {/* ── Summary bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <StatPill value={programs.length}       label="Total Programs"   color="text-foreground" />
          <StatPill value={stats.confirmed}        label="Confirmed"        color="text-emerald-600" />
          <StatPill value={stats.needsReview}      label="Needs Review"     color="text-amber-600" />
          <StatPill value={stats.draft}            label="Draft"            color="text-slate-500" />
          <StatPill value={stats.pennyActive}      label="Penny Active"     color="text-primary" />
        </div>

        {/* ── Program health + Blueprint coverage ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Program health list */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Eyebrow>Program Health</Eyebrow>
            <div className="space-y-1.5">
              {programs.filter(p => p.confidence !== 'deprecated').map(p => {
                const cfg = CONFIDENCE_CONFIG[p.confidence] ?? CONFIDENCE_CONFIG.draft;
                return (
                  <div key={p.id} className="flex items-center gap-2.5 py-1 border-b border-border/30 last:border-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                    <span className="text-[11px] text-foreground flex-1 truncate">{p.name}</span>
                    <span className={`text-[9px] font-bold border rounded px-1.5 py-0.5 shrink-0 ${cfg.bgCls} ${cfg.textCls}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setLocation('/program/programs')}
              className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
            >
              Open Program workspace <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Blueprint coverage */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Eyebrow>Blueprint Coverage</Eyebrow>
            <div className="space-y-2">
              {[
                {
                  label: 'Blueprint Compliant',
                  count: stats.blueprintOk,
                  icon: CheckCircle,
                  iconCls: 'text-emerald-500',
                  barCls: 'bg-emerald-400',
                  note: 'confirmed against Program Blueprint v2',
                },
                {
                  label: 'Needs Review',
                  count: stats.needsReview,
                  icon: AlertCircle,
                  iconCls: 'text-amber-500',
                  barCls: 'bg-amber-400',
                  note: 'sprint structure migration may be pending',
                },
                {
                  label: 'Draft / In Progress',
                  count: stats.draft,
                  icon: FileEdit,
                  iconCls: 'text-slate-400',
                  barCls: 'bg-slate-300',
                  note: 'not yet governed by blueprint',
                },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2.5">
                  <row.icon className={`w-3.5 h-3.5 shrink-0 ${row.iconCls}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-medium text-foreground">{row.label}</span>
                      <span className="text-[11px] font-semibold text-foreground">{row.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.barCls}`}
                        style={{ width: `${programs.length ? Math.round((row.count / programs.length) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {isAdminOrAbove && (
              <button
                onClick={() => setLocation('/program/blueprint')}
                className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
              >
                Open Blueprint canvas <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* ── Penny coverage + Standards readiness ────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Penny coverage */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Eyebrow>Penny Coverage</Eyebrow>
            <div className="space-y-1.5">
              {programs.filter(p => p.confidence !== 'deprecated').map(p => (
                <div key={p.id} className="flex items-center gap-2.5 py-1 border-b border-border/30 last:border-0">
                  <Sparkles className={`w-3 h-3 shrink-0 ${p.pennyFeatures?.length ? 'text-primary' : 'text-muted-foreground/30'}`} />
                  <span className="text-[11px] text-foreground flex-1 truncate">{p.name}</span>
                  <span className={`text-[10px] ${p.pennyFeatures?.length ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {p.pennyFeatures?.length
                      ? `${p.pennyFeatures.length} feature${p.pennyFeatures.length > 1 ? 's' : ''}`
                      : 'Not mapped'}
                  </span>
                </div>
              ))}
            </div>
            {stats.withoutPenny > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                <p className="text-[10px] text-amber-700 font-medium">
                  {stats.withoutPenny} program{stats.withoutPenny > 1 ? 's' : ''} without Penny features — add mapping in the Programs workspace.
                </p>
              </div>
            )}
          </div>

          {/* Standards readiness */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Eyebrow>Standards Readiness</Eyebrow>
            <div className="space-y-2">
              {[
                { category: 'Architecture',  status: 'Defined',  dot: 'bg-emerald-500', note: 'Program + Module + Lesson blueprints active' },
                { category: 'Content',       status: 'Partial',  dot: 'bg-amber-400',   note: 'Curriculum standards in review' },
                { category: 'Penny',         status: 'Defined',  dot: 'bg-emerald-500', note: 'Penny Blueprint v1 governs capabilities' },
                { category: 'Delivery',      status: 'Partial',  dot: 'bg-amber-400',   note: 'Facilitator standards being finalized' },
              ].map(row => (
                <div key={row.category} className="flex items-start gap-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${row.dot}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-foreground">{row.category}</span>
                      <span className={`text-[9px] font-bold ${row.status === 'Defined' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {row.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{row.note}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setLocation('/program/standards')}
              className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
            >
              Open Standards Studio <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ── Navigation cards ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Eyebrow>Program Areas</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <NavCard
              icon={LayoutGrid}
              title="Programs"
              desc="Explore and manage individual programs, curriculum, Penny features, and system health."
              path="/program/programs"
              badge={stats.needsReview > 0 ? `${stats.needsReview} need review` : undefined}
              badgeColor="bg-amber-50 text-amber-700 border-amber-200"
            />
            <NavCard
              icon={Star}
              title="Standards"
              desc="Quality rulebook, gap report, and standards audit checklist."
              path="/program/standards"
            />
            {isAdminOrAbove && (
              <NavCard
                icon={Layers}
                title="Blueprint"
                desc="Cross-program blueprint canvas — structure, curriculum, and Penny mapping."
                path="/program/blueprint"
              />
            )}
          </div>
        </div>

        {/* ── Penny Insights ───────────────────────────────────────────────── */}
        <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-primary" />
            <Eyebrow>Penny — What Would Create the Most Impact</Eyebrow>
          </div>
          <div className="space-y-2">
            {[
              {
                priority: '1',
                action: `Complete blueprint migration for ${stats.draft > 0 ? stats.draft + ' draft' : 'all'} program${stats.draft !== 1 ? 's' : ''}`,
                why: 'Programs without confirmed blueprints cannot be fully governed by Trail OS standards. Completing blueprint compliance unlocks accurate gap reporting, curriculum readiness scoring, and Penny template matching.',
                tag: 'Action Now',
                tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
              },
              {
                priority: '2',
                action: 'Map Penny features to all active programs',
                why: `${stats.withoutPenny} program${stats.withoutPenny !== 1 ? 's are' : ' is'} not mapped to Penny capabilities. Mapping enables Penny to proactively surface coaching suggestions, learning signals, and cohort intelligence for every program — not just those already wired up.`,
                tag: stats.withoutPenny > 0 ? 'Action Now' : 'Complete',
                tagColor: stats.withoutPenny > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200',
              },
              {
                priority: '3',
                action: 'Finalize Content and Delivery standards',
                why: 'Two of four standards categories are partial. Finalizing these gives coaches and curriculum designers a complete quality rulebook — and allows Penny to flag standards gaps automatically in Phase 2.',
                tag: 'Phase 2',
                tagColor: 'bg-slate-100 text-slate-600 border-slate-200',
              },
            ].map(item => (
              <div key={item.priority} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[12px] font-semibold text-foreground">{item.action}</p>
                    <span className={`text-[9px] font-bold border rounded px-1.5 py-0.5 ${item.tagColor}`}>
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{item.why}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 pt-1 border-t border-primary/10">
            <Clock className="w-3 h-3 text-muted-foreground/50" />
            <p className="text-[10px] text-muted-foreground/60">
              Penny insights are Phase 1 guidance — live impact scoring and cohort signals arrive in Phase 2.
            </p>
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
