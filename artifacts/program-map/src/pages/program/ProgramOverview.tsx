import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { TERMS } from '@/config/terminology';
import { LayoutGrid, CheckCircle, AlertCircle, FileEdit, Brain, ChevronRight, Sparkles, BookOpen, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import { usePennyConfigs } from '@/hooks/useProgramPennyConfig';
import { useSfLmsCourses } from '@/hooks/useSfCurriculum';

// ── Tiny shared primitives ────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[14px] font-bold  text-muted-foreground/50 mb-2">
      {children}
    </p>
  );
}

function StatPill({
  value, label, color, onClick,
}: { value: number | string; label: string; color: string; onClick?: () => void }) {
  const base = 'flex flex-col items-center px-4 py-2.5 rounded-lg border border-border bg-background min-w-[72px]';
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} hover:border-primary/40 hover:bg-primary/[0.02] transition-colors`}>
        <span className={`text-xl font-semibold ${color}`}>{value}</span>
        <span className="text-[14px] text-muted-foreground mt-0.5 text-center leading-tight">{label}</span>
      </button>
    );
  }
  return (
    <div className={base}>
      <span className={`text-xl font-semibold ${color}`}>{value}</span>
      <span className="text-[14px] text-muted-foreground mt-0.5 text-center leading-tight">{label}</span>
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
      className="group w-full text-left rounded-lg border border-border bg-background p-4 hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">{title}</p>
            <p className="text-[14px] text-muted-foreground leading-snug mt-0.5">{desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className={`text-[14px] font-bold border rounded px-1.5 py-0.5 ${badgeColor ?? 'bg-muted text-muted-foreground border-border'}`}>
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
  confirmed:    { dot: 'bg-[#E6F0EA]0', label: 'Confirmed',    textCls: 'text-[#2F6B3F]', bgCls: 'bg-[#E6F0EA] border-[#9FC3AE]' },
  'needs-review': { dot: 'bg-[#CC8400]', label: 'Needs Review', textCls: 'text-[#CC8400]',   bgCls: 'bg-[#FFF3E0] border-[#FFD08A]' },
  draft:        { dot: 'bg-[#C8CBC6]',   label: 'Draft',        textCls: 'text-slate-600',   bgCls: 'bg-slate-50 border-slate-200' },
  deprecated:   { dot: 'bg-[#A93F2F]',    label: 'Deprecated',   textCls: 'text-[#A93F2F]',    bgCls: 'bg-[#FBEAE6] border-[#E8B9B4]' },
} as const;

// ── Penny status display config ───────────────────────────────────────────────

const PENNY_STATUS_CONFIG = {
  'Active':      { label: 'Active',      textCls: 'text-primary font-medium',   dot: 'text-primary' },
  'Planned':     { label: 'Planned',     textCls: 'text-[#CC8400] font-medium', dot: 'text-[#CC8400]' },
  'Not Planned': { label: 'Not planned', textCls: 'text-muted-foreground',      dot: 'text-muted-foreground/30' },
} as const;

// ── Main component ────────────────────────────────────────────────────────────

export default function ProgramOverview() {
  const [, setLocation] = useLocation();
  const { programs, setSelectedItem } = useAppContext();
  const { isEveryday, isAdminOrAbove } = useTierFlags();

  const { data: pennyConfigsData, isLoading: pennyConfigsLoading } = usePennyConfigs();
  const { data: lmsData, isLoading: lmsLoading } = useSfLmsCourses();

  // Build a map of programId → penny status from the DB
  const pennyConfigMap = useMemo(() => {
    const map = new Map<string, 'Active' | 'Planned' | 'Not Planned'>();
    for (const row of pennyConfigsData?.configs ?? []) {
      map.set(row.programId, row.status);
    }
    return map;
  }, [pennyConfigsData]);

  const stats = useMemo(() => {
    const confirmed    = programs.filter(p => p.confidence === 'confirmed').length;
    const needsReview  = programs.filter(p => p.confidence === 'needs-review').length;
    const draft        = programs.filter(p => p.confidence === 'draft').length;
    const blueprintOk  = confirmed;

    const activePrograms = programs.filter(p => p.confidence !== 'deprecated');
    const pennyActive  = activePrograms.filter(p => (pennyConfigMap.get(p.id) ?? p.pennyStatus) === 'Active').length;
    const withoutPenny = activePrograms.filter(p => (pennyConfigMap.get(p.id) ?? p.pennyStatus) !== 'Active').length;

    return { confirmed, needsReview, draft, pennyActive, blueprintOk, withoutPenny };
  }, [programs, pennyConfigMap]);

  // LMS summary stats
  const lmsSummary = useMemo(() => {
    const courses = lmsData?.courses ?? [];
    const withModules = courses.filter(c => c.modules.length > 0);
    const totalModules = courses.reduce((sum, c) => sum + c.modules.length, 0);
    const completedModules = courses.reduce(
      (sum, c) => sum + c.modules.filter(m => m.Status__c === 'Complete').length,
      0
    );
    const inProgressCourses = courses.filter(c =>
      c.modules.some(m => m.Status__c === 'In Progress')
    ).length;
    return { total: courses.length, withModules: withModules.length, totalModules, completedModules, inProgressCourses };
  }, [lmsData]);

  // Navigate directly to Program Configuration pre-selected to this program
  function openProgram(p: (typeof programs)[number]) {
    setSelectedItem({ type: 'program', id: p.id, data: p });
    setLocation(`/program/config/${p.id}`);
  }

  if (isEveryday) {
    return (
      <ScrollArea className="h-full">
        <div className="p-5 space-y-4 max-w-2xl">
          <Eyebrow>Your Programs</Eyebrow>
          <div className="space-y-2">
            {programs
              .filter(p => p.confidence !== 'deprecated')
              .map(p => {
                const cfg = CONFIDENCE_CONFIG[p.confidence] ?? CONFIDENCE_CONFIG.draft;
                const pennyStatus = pennyConfigMap.get(p.id) ?? p.pennyStatus;
                return (
                  <button
                    key={p.id}
                    onClick={() => openProgram(p)}
                    className="group w-full text-left rounded-lg border border-border bg-background p-3.5 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-foreground">{p.name}</p>
                        <p className="text-[14px] text-muted-foreground truncate">{p.coreOutcome}</p>
                      </div>
                      {pennyStatus === 'Active' && (
                        <span className="text-[14px] font-bold bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 shrink-0">
                          {TERMS.aiAssistant} Active
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
          <StatPill value={programs.length}   label="Total Programs"              color="text-foreground"  onClick={() => setLocation('/program/config')} />
          <StatPill value={stats.confirmed}   label="Confirmed"                   color="text-[#2F6B3F]" onClick={() => setLocation('/program/config')} />
          <StatPill value={stats.needsReview} label="Needs Review"                color="text-[#CC8400]"   onClick={() => setLocation('/program/config')} />
          <StatPill value={stats.draft}       label="Draft"                       color="text-slate-500"   onClick={() => setLocation('/program/config')} />
          <StatPill value={stats.pennyActive} label={`${TERMS.aiAssistant} Active`} color="text-primary"  onClick={() => setLocation('/penny/capabilities')} />
        </div>

        {/* ── Program health + Blueprint coverage ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Program health list */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Eyebrow>Program Health</Eyebrow>
            <div className="space-y-1">
              {programs.filter(p => p.confidence !== 'deprecated').map(p => {
                const cfg = CONFIDENCE_CONFIG[p.confidence] ?? CONFIDENCE_CONFIG.draft;
                return (
                  <button
                    key={p.id}
                    onClick={() => openProgram(p)}
                    className="group w-full flex items-center gap-2.5 py-1.5 px-1 rounded hover:bg-primary/[0.04] border-b border-border/30 last:border-0 transition-colors"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                    <span className="text-[14px] text-foreground flex-1 truncate text-left group-hover:text-primary transition-colors">
                      {p.name}
                    </span>
                    <span className={`text-[14px] font-bold border rounded px-1.5 py-0.5 shrink-0 ${cfg.bgCls} ${cfg.textCls}`}>
                      {cfg.label}
                    </span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/20 group-hover:text-primary shrink-0 transition-colors" />
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setLocation('/program/config')}
              className="text-[14px] font-medium text-primary hover:underline flex items-center gap-0.5"
            >
              Configure programs <ChevronRight className="w-3 h-3" />
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
                  iconCls: 'text-[#2F6B3F]',
                  barCls: 'bg-[#2F6B3F]',
                  note: `${stats.blueprintOk} program${stats.blueprintOk !== 1 ? 's' : ''} confirmed against Blueprint v2`,
                  path: '/program/blueprint',
                },
                {
                  label: 'Needs Review',
                  count: stats.needsReview,
                  icon: AlertCircle,
                  iconCls: 'text-[#CC8400]',
                  barCls: 'bg-[#CC8400]',
                  note: `${stats.needsReview} program${stats.needsReview !== 1 ? 's' : ''} — sprint structure migration may be pending`,
                  path: '/program/config',
                },
                {
                  label: 'Draft / In Progress',
                  count: stats.draft,
                  icon: FileEdit,
                  iconCls: 'text-slate-400',
                  barCls: 'bg-slate-300',
                  note: `${stats.draft} program${stats.draft !== 1 ? 's' : ''} not yet governed by blueprint`,
                  path: '/program/config',
                },
              ].map(row => (
                <button
                  key={row.label}
                  onClick={() => setLocation(row.path)}
                  className="group w-full flex items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-primary/[0.04] transition-colors"
                >
                  <row.icon className={`w-3.5 h-3.5 shrink-0 ${row.iconCls}`} />
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[14px] font-medium text-foreground group-hover:text-primary transition-colors">{row.label}</span>
                      <span className="text-[14px] font-semibold text-foreground">{row.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.barCls}`}
                        style={{ width: `${programs.length ? Math.round((row.count / programs.length) * 100) : 0}%` }}
                      />
                    </div>
                    <p className="text-[14px] text-muted-foreground/60 mt-0.5 truncate">{row.note}</p>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/20 group-hover:text-primary shrink-0 transition-colors" />
                </button>
              ))}
            </div>
            {isAdminOrAbove && (
              <button
                onClick={() => setLocation('/program/blueprint')}
                className="text-[14px] font-medium text-primary hover:underline flex items-center gap-0.5"
              >
                Open Blueprint canvas <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* ── Penny coverage + LMS overview ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Penny coverage — reads from DB-backed penny configs */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Eyebrow>{TERMS.aiAssistant} Coverage</Eyebrow>
            {pennyConfigsLoading ? (
              <div className="flex items-center gap-1.5 py-2 text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[14px]">Loading…</span>
              </div>
            ) : (
              <div className="space-y-1">
                {programs.filter(p => p.confidence !== 'deprecated').map(p => {
                  const pennyStatus = pennyConfigMap.get(p.id) ?? p.pennyStatus ?? 'Not Planned';
                  const cfg = PENNY_STATUS_CONFIG[pennyStatus] ?? PENNY_STATUS_CONFIG['Not Planned'];
                  return (
                    <button
                      key={p.id}
                      onClick={() => openProgram(p)}
                      className="group w-full flex items-center gap-2.5 py-1.5 px-1 rounded hover:bg-primary/[0.04] border-b border-border/30 last:border-0 transition-colors"
                    >
                      <Sparkles className={`w-3 h-3 shrink-0 ${cfg.dot}`} />
                      <span className="text-[14px] text-foreground flex-1 truncate text-left group-hover:text-primary transition-colors">
                        {p.name}
                      </span>
                      <span className={`text-[14px] shrink-0 ${cfg.textCls}`}>
                        {cfg.label}
                      </span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/20 group-hover:text-primary shrink-0 transition-colors" />
                    </button>
                  );
                })}
              </div>
            )}
            {!pennyConfigsLoading && stats.withoutPenny > 0 && (
              <button
                onClick={() => setLocation('/penny/capabilities')}
                className="group w-full text-left rounded border border-[#FFD08A] bg-[#FFF3E0] px-2.5 py-1.5 hover:border-[#CC8400] transition-colors"
              >
                <p className="text-[14px] text-[#CC8400] font-medium group-hover:underline">
                  {stats.withoutPenny} program{stats.withoutPenny > 1 ? 's' : ''} without {TERMS.aiAssistant} — configure in {TERMS.aiAssistant} Capabilities →
                </p>
              </button>
            )}
          </div>

          {/* LMS overview — live from Salesforce */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Eyebrow>LMS Overview</Eyebrow>
            {lmsLoading ? (
              <div className="flex items-center gap-1.5 py-2 text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[14px]">Loading from Salesforce…</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Courses',          value: lmsSummary.total,            color: 'text-foreground' },
                    { label: 'With modules',      value: lmsSummary.withModules,      color: 'text-foreground' },
                    { label: 'Total modules',     value: lmsSummary.totalModules,     color: 'text-foreground' },
                    { label: 'Modules complete',  value: lmsSummary.completedModules, color: 'text-[#2F6B3F]' },
                  ].map(s => (
                    <div key={s.label} className="rounded-md bg-background border border-border px-2.5 py-2">
                      <p className={`text-base font-semibold ${s.color}`}>{s.value}</p>
                      <p className="text-[14px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                {lmsSummary.totalModules > 0 && (
                  <div>
                    <div className="flex justify-between text-[14px] text-muted-foreground mb-1">
                      <span>Overall module completion</span>
                      <span>{Math.round((lmsSummary.completedModules / lmsSummary.totalModules) * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#2F6B3F]"
                        style={{ width: `${Math.round((lmsSummary.completedModules / lmsSummary.totalModules) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setLocation('/program/courses')}
                  className="text-[14px] font-medium text-primary hover:underline flex items-center gap-0.5"
                >
                  <BookOpen className="w-3 h-3" /> Open Courses &amp; Modules <ChevronRight className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Navigation cards ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Eyebrow>Program Areas</Eyebrow>
          <div className="grid grid-cols-1 gap-2">
            <NavCard
              icon={LayoutGrid}
              title="Programs"
              desc="Configure and manage individual programs, cohorts, courses, and modules in Salesforce."
              path="/program/config"
              badge={stats.needsReview > 0 ? `${stats.needsReview} need review` : undefined}
              badgeColor="bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]"
            />
          </div>
        </div>

        {/* ── Penny Insights ───────────────────────────────────────────────── */}
        <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-primary" />
            <Eyebrow>{TERMS.aiAssistant} — What Would Create the Most Impact</Eyebrow>
          </div>
          <div className="space-y-2">
            {[
              {
                priority: '1',
                action: `Complete blueprint migration for ${stats.needsReview > 0 ? stats.needsReview + ' programs needing review' : 'all programs'}`,
                why: `Programs without confirmed blueprints cannot be fully governed by Trail OS standards. Completing blueprint compliance unlocks accurate gap reporting, curriculum readiness scoring, and ${TERMS.aiAssistant} template matching.`,
                tag: stats.needsReview > 0 ? 'Action Now' : 'Complete',
                tagColor: stats.needsReview > 0
                  ? 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]'
                  : 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]',
                path: '/program/blueprint',
              },
              {
                priority: '2',
                action: `Map ${TERMS.aiAssistant} to all active programs`,
                why: `${stats.withoutPenny} program${stats.withoutPenny !== 1 ? 's are' : ' is'} not yet mapped to ${TERMS.aiAssistant} capabilities. Mapping enables ${TERMS.aiAssistant} to proactively surface coaching suggestions, learning signals, and cohort intelligence for every program.`,
                tag: stats.withoutPenny > 0 ? 'Action Now' : 'Complete',
                tagColor: stats.withoutPenny > 0
                  ? 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]'
                  : 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]',
                path: '/penny/capabilities',
              },
              ...(lmsSummary.completedModules < lmsSummary.totalModules ? [{
                priority: '3',
                action: `Progress ${lmsSummary.totalModules - lmsSummary.completedModules} remaining course module${lmsSummary.totalModules - lmsSummary.completedModules !== 1 ? 's' : ''}`,
                why: `${lmsSummary.completedModules} of ${lmsSummary.totalModules} modules are complete across ${lmsSummary.total} courses. Completing modules unlocks cohort-level reporting and enables ${TERMS.aiAssistant} to surface learning gap signals per trail.`,
                tag: 'In Progress',
                tagColor: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
                path: '/program/courses',
              }] : []),
            ].map(item => (
              <button
                key={item.priority}
                onClick={() => setLocation(item.path)}
                className="group w-full text-left flex items-start gap-3 rounded-md px-2 py-2 hover:bg-primary/[0.05] transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[14px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors">{item.action}</p>
                    <span className={`text-[14px] font-bold border rounded px-1.5 py-0.5 ${item.tagColor}`}>
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-[14px] text-muted-foreground mt-0.5 leading-relaxed">{item.why}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
