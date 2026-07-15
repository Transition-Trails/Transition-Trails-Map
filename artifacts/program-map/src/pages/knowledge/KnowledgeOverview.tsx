import { useMemo } from 'react';
import { TERMS } from '@/config/terminology';
import { useLocation } from 'wouter';
import { Database, BookMarked, GitBranch, Archive, CheckCircle, AlertTriangle, XCircle, Shield, ChevronRight, Brain, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { knowledgeSources, SOURCE_SUMMARY, TRUST_LEVEL_CONFIG } from '@/data/knowledgeSourceData';
import type { TrustLevel } from '@/data/knowledgeSourceData';

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

// ── Health issue row ──────────────────────────────────────────────────────────

function IssueRow({ name, issues, onNavigate }: { name: string; issues: string[]; onNavigate: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-foreground truncate">{name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{issues[0]}</p>
          {issues.length > 1 && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">+{issues.length - 1} more issue{issues.length > 2 ? 's' : ''}</p>
          )}
        </div>
        <button
          onClick={onNavigate}
          className="text-[10px] font-medium text-primary hover:underline shrink-0 mt-0.5"
        >
          Review
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KnowledgeOverview() {
  const [, setLocation] = useLocation();

  const stats = useMemo(() => {
    const trustCounts = knowledgeSources.reduce<Record<TrustLevel, number>>(
      (acc, s) => { acc[s.trustLevel] = (acc[s.trustLevel] ?? 0) + 1; return acc; },
      { Authoritative: 0, Trusted: 0, Curated: 0, Unverified: 0 },
    );
    const syncCounts = {
      Live:         knowledgeSources.filter(s => s.syncStatus === 'Live').length,
      Manual:       knowledgeSources.filter(s => s.syncStatus === 'Manual').length,
      Disconnected: knowledgeSources.filter(s => s.syncStatus === 'Disconnected').length,
      Planned:      knowledgeSources.filter(s => s.syncStatus === 'Planned' || s.syncStatus === 'Future').length,
    };
    const needsAttention = knowledgeSources.filter(s => s.healthIssues.length > 0);
    const needsReview = knowledgeSources.filter(s =>
      s.healthIssues.some(i => i.toLowerCase().includes('review')),
    );
    return { trustCounts, syncCounts, needsAttention, needsReview };
  }, []);

  const trustConfig: Array<{ level: TrustLevel; dot: string; label: string }> = [
    { level: 'Authoritative', dot: 'bg-violet-500', label: 'Authoritative — primary sources of record' },
    { level: 'Trusted',       dot: 'bg-sky-500',    label: 'Trusted — reviewed & approved' },
    { level: 'Curated',       dot: 'bg-indigo-400', label: 'Curated — selected & maintained' },
    { level: 'Unverified',    dot: 'bg-slate-400',  label: 'Unverified — trust review required' },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5 max-w-4xl">

        {/* ── Summary bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <StatPill value={SOURCE_SUMMARY.total}        label="Total Sources"   color="text-foreground" />
          <StatPill value={SOURCE_SUMMARY.healthy}      label="Healthy"         color="text-emerald-600" />
          <StatPill value={SOURCE_SUMMARY.warnings}     label="Warnings"        color="text-amber-600" />
          <StatPill value={SOURCE_SUMMARY.critical}     label="Critical"        color="text-rose-600" />
          <StatPill value={SOURCE_SUMMARY.approvedForPenny} label={`${TERMS.aiAssistant} Ready`} color="text-primary" />
        </div>

        {/* ── Source health + Trust breakdown ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Source health */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Eyebrow>Source Health</Eyebrow>
            <div className="space-y-2">
              {[
                { label: 'Healthy',    count: SOURCE_SUMMARY.healthy,   icon: CheckCircle,     iconCls: 'text-emerald-500', barCls: 'bg-emerald-400' },
                { label: 'Warning',    count: SOURCE_SUMMARY.warnings,  icon: AlertTriangle,   iconCls: 'text-amber-500',   barCls: 'bg-amber-400'  },
                { label: 'Critical',   count: SOURCE_SUMMARY.critical,  icon: XCircle,         iconCls: 'text-rose-500',    barCls: 'bg-rose-400'   },
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
                        style={{ width: `${Math.round((row.count / SOURCE_SUMMARY.total) * 100)}%` }}
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
                    <span className="text-[11px] text-foreground font-medium">{t.level}</span>
                    <span className="text-[11px] font-semibold text-foreground">{stats.trustCounts[t.level]}</span>
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
                { label: 'Live',          count: stats.syncCounts.Live,         dot: 'bg-emerald-500', note: 'real-time connection' },
                { label: 'Manual',        count: stats.syncCounts.Manual,       dot: 'bg-amber-400',   note: 'periodic manual sync' },
                { label: 'Disconnected',  count: stats.syncCounts.Disconnected, dot: 'bg-rose-500',    note: 'no connection' },
                { label: 'Planned',       count: stats.syncCounts.Planned,      dot: 'bg-slate-300',   note: 'future integration' },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.dot}`} />
                  <span className="text-[11px] text-foreground font-medium w-24 shrink-0">{row.label}</span>
                  <span className="text-[11px] font-semibold text-foreground w-5">{row.count}</span>
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
            <div className="flex items-end gap-4">
              <div>
                <span className="text-xl font-semibold text-primary">{SOURCE_SUMMARY.approvedForPenny}</span>
                <p className="text-[10px] text-muted-foreground">approved for {TERMS.aiAssistant}</p>
              </div>
              <div>
                <span className="text-xl font-semibold text-muted-foreground">
                  {SOURCE_SUMMARY.total - SOURCE_SUMMARY.approvedForPenny}
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
            <Eyebrow>Needs Attention — {stats.needsAttention.length} source{stats.needsAttention.length > 1 ? 's' : ''} with open issues</Eyebrow>
            <div className="space-y-2">
              {stats.needsAttention.slice(0, 5).map(src => (
                <IssueRow
                  key={src.id}
                  name={src.name}
                  issues={src.healthIssues}
                  onNavigate={() => setLocation('/knowledge/sources')}
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
              badge={SOURCE_SUMMARY.warnings + SOURCE_SUMMARY.critical > 0
                ? `${SOURCE_SUMMARY.warnings + SOURCE_SUMMARY.critical} issues`
                : 'All clear'}
              badgeColor={SOURCE_SUMMARY.warnings + SOURCE_SUMMARY.critical > 0
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
            <Brain className="w-3.5 h-3.5 text-primary" />
            <Eyebrow>{TERMS.aiAssistant} — What Would Create the Most Impact</Eyebrow>
          </div>
          <div className="space-y-2">
            {[
              {
                priority: '1',
                action: 'Configure Google Drive folder indexing',
                why: `The Google Drive API is connected. The next step is configuring folder indexing for the Foundations and Guided Trail program folders so ${TERMS.aiAssistant} can retrieve curriculum content, coach guides, and assessment rubrics.`,
                tag: 'Action Now',
                tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
              },
              {
                priority: '2',
                action: 'Complete trust reviews for pending sources',
                why: `${SOURCE_SUMMARY.total - SOURCE_SUMMARY.approvedForPenny} source${SOURCE_SUMMARY.total - SOURCE_SUMMARY.approvedForPenny > 1 ? 's' : ''} cannot be used by ${TERMS.aiAssistant} until trust review is complete. Approving these expands ${TERMS.aiAssistant}'s knowledge retrieval surface and improves coaching quality.`,
                tag: 'Action Now',
                tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
              },
              {
                priority: '3',
                action: 'Establish Org Memory records',
                why: 'Trail OS currently has no institutional memory layer. Capturing key organizational decisions (e.g. why Salesforce is the system of record, why Penny supports rather than replaces coaches) would allow Penny to provide context-aware answers to strategic questions.',
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
              {TERMS.aiAssistant} insights reflect current source health — live impact scoring is a Phase 2 capability.
            </p>
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
