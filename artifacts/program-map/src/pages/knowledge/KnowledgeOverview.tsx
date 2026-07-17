import { useMemo } from 'react';
import { TERMS } from '@/config/terminology';
import { useLocation } from 'wouter';
import { useAppContext } from '@/context/AppContext';
import {
  Database, BookMarked, GitBranch, Archive, CheckCircle, AlertTriangle,
  XCircle, Shield, ChevronRight, Brain, Clock, Layers,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TRUST_LEVEL_CONFIG } from '@/data/knowledgeSourceData';
import type { TrustLevel, KnowledgeSource } from '@/data/knowledgeSourceData';
import { useKnowledgeSources } from '@/hooks/useKnowledgeSources';

// ── Penny Insights data ────────────────────────────────────────────────────────
// Extracted so JSX stays clean; TERMS used throughout — no hardcoded brand strings.

function buildInsights(total: number, approved: number) {
  const pending = total - approved;
  return [
    {
      priority: '1',
      action: 'Configure Google Drive folder indexing',
      why: `The Google Drive API is connected. The next step is configuring folder indexing for the Foundations and Guided Trail program folders so ${TERMS.aiAssistant} can retrieve curriculum content, coach guides, and assessment rubrics.`,
      tag: 'Action Now',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      path: '/admin/integrations',
    },
    {
      priority: '2',
      action: 'Complete trust reviews for pending sources',
      why: `${pending} source${pending !== 1 ? 's' : ''} cannot be used by ${TERMS.aiAssistant} until trust review is complete. Approving these expands ${TERMS.aiAssistant}'s knowledge retrieval surface and improves coaching quality.`,
      tag: 'Action Now',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      path: '/knowledge/sources',
    },
    {
      priority: '3',
      action: 'Establish Org Memory records',
      why: `${TERMS.platform} currently has no institutional memory layer. Capturing key organizational decisions (e.g. why Salesforce is the system of record, why ${TERMS.aiAssistant} supports rather than replaces coaches) would allow ${TERMS.aiAssistant} to provide context-aware answers to strategic questions.`,
      tag: 'Phase 2',
      tagColor: 'bg-slate-100 text-slate-600 border-slate-200',
      path: '/knowledge/memory',
    },
  ];
}

// ── Tiny shared primitives ────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
      {children}
    </p>
  );
}

function StatPill({
  value, label, color, onClick,
}: { value: number | string; label: string; color: string; onClick?: () => void }) {
  const base = 'flex flex-col items-center px-4 py-2.5 rounded-lg border border-border bg-background min-w-[72px] transition-colors';
  const interactive = onClick ? 'cursor-pointer hover:border-primary/30 hover:bg-primary/[0.02]' : '';
  return (
    <div className={`${base} ${interactive}`} onClick={onClick}>
      <span className={`text-xl font-bold ${color}`}>{value}</span>
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
      className="group w-full text-left rounded-lg border border-border bg-background p-4 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
            <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
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

// ── Health issue row ──────────────────────────────────────────────────────────

function IssueRow({
  source, onReview, onSelect,
}: {
  source: KnowledgeSource;
  onReview: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      className="rounded-lg border border-border bg-background px-3 py-2.5 cursor-pointer hover:border-primary/30 hover:bg-primary/[0.02] transition-colors"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-foreground truncate">{source.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{source.healthIssues[0]}</p>
          {source.healthIssues.length > 1 && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              +{source.healthIssues.length - 1} more issue{source.healthIssues.length > 2 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onReview(); }}
          className="text-[10px] font-medium text-primary hover:underline shrink-0 mt-0.5"
        >
          Review →
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KnowledgeOverview() {
  const [, setLocation] = useLocation();
  const { setSelectedItem, selectedItem } = useAppContext();
  const { sources, summary } = useKnowledgeSources();

  const stats = useMemo(() => {
    const trustCounts = sources.reduce<Record<TrustLevel, number>>(
      (acc, s) => { acc[s.trustLevel] = (acc[s.trustLevel] ?? 0) + 1; return acc; },
      { Authoritative: 0, Trusted: 0, Curated: 0, Unverified: 0 },
    );
    const syncCounts = {
      Live:         sources.filter(s => s.syncStatus === 'Live').length,
      Manual:       sources.filter(s => s.syncStatus === 'Manual').length,
      Disconnected: sources.filter(s => s.syncStatus === 'Disconnected').length,
      Planned:      sources.filter(s => s.syncStatus === 'Planned' || s.syncStatus === 'Future').length,
    };
    const needsAttention = sources.filter(s => s.healthIssues.length > 0);
    return { trustCounts, syncCounts, needsAttention };
  }, [sources]);

  const trustConfig: Array<{ level: TrustLevel; dot: string }> = [
    { level: 'Authoritative', dot: 'bg-violet-500' },
    { level: 'Trusted',       dot: 'bg-sky-500'    },
    { level: 'Curated',       dot: 'bg-indigo-400' },
    { level: 'Unverified',    dot: 'bg-slate-400'  },
  ];

  const insights = buildInsights(summary.total, summary.approvedForPenny);

  function selectSource(source: KnowledgeSource) {
    setSelectedItem({ type: 'knowledgeSource', id: source.id, data: source });
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5 max-w-4xl">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
            Knowledge Library
          </p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-base font-semibold text-foreground leading-snug">Overview</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Source health, trust governance, and {TERMS.aiAssistant} readiness across all knowledge sources.
              </p>
            </div>
          </div>
        </div>

        {/* ── Summary bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <StatPill
            value={summary.total}
            label="Total Sources"
            color="text-foreground"
            onClick={() => setLocation('/knowledge/sources')}
          />
          <StatPill
            value={summary.healthy}
            label="Healthy"
            color="text-emerald-600"
            onClick={() => setLocation('/knowledge/sources')}
          />
          <StatPill
            value={summary.warnings}
            label="Warnings"
            color="text-amber-600"
            onClick={() => setLocation('/knowledge/sources')}
          />
          <StatPill
            value={summary.critical}
            label="Critical"
            color="text-rose-600"
            onClick={() => setLocation('/knowledge/sources')}
          />
          <StatPill
            value={summary.approvedForPenny}
            label={`${TERMS.aiAssistant} Ready`}
            color="text-primary"
            onClick={() => setLocation('/knowledge/sources')}
          />
        </div>

        {/* ── Source health + Trust breakdown ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Source health */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Eyebrow>Source Health</Eyebrow>
            <div className="space-y-2">
              {[
                { label: 'Healthy',  count: summary.healthy,  icon: CheckCircle,   iconCls: 'text-emerald-500', barCls: 'bg-emerald-400' },
                { label: 'Warning',  count: summary.warnings, icon: AlertTriangle, iconCls: 'text-amber-500',   barCls: 'bg-amber-400'  },
                { label: 'Critical', count: summary.critical, icon: XCircle,       iconCls: 'text-rose-500',    barCls: 'bg-rose-400'   },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2.5">
                  <row.icon className={`w-3.5 h-3.5 shrink-0 ${row.iconCls}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-medium text-foreground">{row.label}</span>
                      <span className="text-[11px] font-bold text-foreground">{row.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.barCls}`}
                        style={{ width: `${Math.round((row.count / (summary.total || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setLocation('/knowledge/sources')}
              className="mt-1 text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
            >
              Manage sources <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Trust breakdown */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Eyebrow>Trust Breakdown</Eyebrow>
            <div className="space-y-2">
              {trustConfig.map(t => (
                <div key={t.level} className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} />
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-foreground font-medium">{t.level}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">
                        — {TRUST_LEVEL_CONFIG[t.level].description}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-foreground ml-2 shrink-0">{stats.trustCounts[t.level]}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {stats.trustCounts.Unverified > 0
                ? `${stats.trustCounts.Unverified} source${stats.trustCounts.Unverified > 1 ? 's' : ''} require trust review before ${TERMS.aiAssistant} activation.`
                : 'All sources have a trust level assigned.'}
            </p>
          </div>
        </div>

        {/* ── Sync coverage + Penny readiness ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Sync coverage */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Eyebrow>Sync Coverage</Eyebrow>
            <div className="space-y-1.5">
              {[
                { label: 'Live',         count: stats.syncCounts.Live,         dot: 'bg-emerald-500', note: 'real-time connection' },
                { label: 'Manual',       count: stats.syncCounts.Manual,       dot: 'bg-amber-400',   note: 'periodic manual sync' },
                { label: 'Disconnected', count: stats.syncCounts.Disconnected, dot: 'bg-rose-500',    note: 'no connection' },
                { label: 'Planned',      count: stats.syncCounts.Planned,      dot: 'bg-slate-300',   note: 'future integration' },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.dot}`} />
                  <span className="text-[11px] text-foreground font-medium w-24 shrink-0">{row.label}</span>
                  <span className="text-[11px] font-bold text-foreground w-5">{row.count}</span>
                  <span className="text-[10px] text-muted-foreground">{row.note}</span>
                </div>
              ))}
            </div>
            {stats.syncCounts.Disconnected > 0 && (
              <div className="rounded border border-rose-200 bg-rose-50 px-2.5 py-1.5">
                <p className="text-[10px] text-rose-700 font-medium">
                  {stats.syncCounts.Disconnected} disconnected source{stats.syncCounts.Disconnected > 1 ? 's' : ''} — Google Drive API connection required (Phase 2).
                </p>
              </div>
            )}
          </div>

          {/* Penny readiness */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Eyebrow>{TERMS.aiAssistant} Readiness</Eyebrow>
            <div className="flex items-end gap-6">
              <div>
                <span className="text-xl font-bold text-primary">{summary.approvedForPenny}</span>
                <p className="text-[10px] text-muted-foreground">approved for {TERMS.aiAssistant}</p>
              </div>
              <div>
                <span className="text-xl font-bold text-muted-foreground">
                  {summary.total - summary.approvedForPenny}
                </span>
                <p className="text-[10px] text-muted-foreground">pending review</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Sources must pass trust review before {TERMS.aiAssistant} can retrieve from them. Governance records are managed in the Sources workspace.
            </p>
            <button
              onClick={() => setLocation('/knowledge/sources')}
              className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
            >
              Review governance <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ── Needs attention ─────────────────────────────────────────────── */}
        {stats.needsAttention.length > 0 && (
          <div className="space-y-2">
            <Eyebrow>
              Needs Attention — {stats.needsAttention.length} source{stats.needsAttention.length > 1 ? 's' : ''} with open issues
            </Eyebrow>
            <div className="space-y-2">
              {stats.needsAttention.slice(0, 5).map(src => (
                <IssueRow
                  key={src.id}
                  source={src}
                  onReview={() => setLocation('/knowledge/sources')}
                  onSelect={() => selectSource(src)}
                />
              ))}
              {stats.needsAttention.length > 5 && (
                <button
                  onClick={() => setLocation('/knowledge/sources')}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  View {stats.needsAttention.length - 5} more in Sources workspace →
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/60 italic">
              Click any row to open the {TERMS.knowledgeBrief ?? 'Knowledge Brief'} panel for that source.
            </p>
          </div>
        )}

        {/* ── Navigation cards ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Eyebrow>Knowledge Areas</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <NavCard
              icon={Database}
              title="Sources"
              desc={`Source governance, trust reviews, sync status, and ${TERMS.aiAssistant} activation.`}
              path="/knowledge/sources"
              badge={summary.warnings + summary.critical > 0
                ? `${summary.warnings + summary.critical} issues`
                : 'All clear'}
              badgeColor={summary.warnings + summary.critical > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'}
            />
            <NavCard
              icon={BookMarked}
              title="Library"
              desc="Source documents, templates, and reference materials."
              path="/knowledge/library"
            />
            <NavCard
              icon={GitBranch}
              title="Relationships"
              desc={`How knowledge sources connect to programs, ${TERMS.aiAssistant}, and systems.`}
              path="/knowledge/relationships"
            />
            <NavCard
              icon={Archive}
              title="Org Memory"
              desc="Institutional decisions, program history, and governance records."
              path="/knowledge/memory"
              badge="Phase 2"
              badgeColor="bg-slate-100 text-slate-500 border-slate-200"
            />
          </div>
        </div>

        {/* ── Penny Insights ───────────────────────────────────────────────── */}
        <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-primary shrink-0" />
            <Eyebrow>{TERMS.aiAssistant} — What Would Create the Most Impact</Eyebrow>
          </div>
          <div className="space-y-3">
            {insights.map(item => (
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
                  <button
                    onClick={() => setLocation(item.path)}
                    className="mt-1 text-[10px] font-medium text-primary hover:underline flex items-center gap-0.5"
                  >
                    Go there <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 pt-1 border-t border-primary/10">
            <Clock className="w-3 h-3 text-muted-foreground/50" />
            <p className="text-[10px] text-muted-foreground/60">
              {TERMS.aiAssistant} insights reflect current source health — live impact scoring is a Phase 2 capability.
            </p>
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
