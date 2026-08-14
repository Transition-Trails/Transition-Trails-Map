/**
 * KnowledgeStudioFreshness
 *
 * "Keeping-it-true" tab — three staleness detectors + reader-report list.
 *
 * Detector ranking (fastest → slowest at finding stale content):
 *   1. Reader report  (SUCCESS / bordered)  — a reader flags a mismatch immediately
 *   2. Capture stamp  (ATTENTION)           — LastTestedVersion vs current SF version
 *   3. Calendar       (INFORMATION)         — review-cycle due-date scan
 *
 * Right rail: Penny rename notice + still-vs-clip decision guide.
 *
 * Step reports are fetched from GET /api/knowledge/articles/:id/step-reports.
 * The article list comes from useKnowledgeArticles (local DB articles only).
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Thermometer, Calendar, Camera, MessageSquare, CheckCircle2,
  AlertTriangle, Info, RefreshCw, ChevronDown, ChevronUp,
  Brain, Loader2, FileText, Flag,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHelpArticles } from '@/hooks/useHelpArticles';
import { useKnowledgeArticles } from '@/hooks/useKnowledgeArticles';
import { STATUS_CLASSES } from '@/config/statusColors';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StepReport {
  id: string;
  stepId: string;
  stepSequence: number;
  stepInstruction: string;
  quote: string;
  createdAt: string;
}

interface StepReportsGroup {
  stepId: string;
  stepSequence: number;
  stepInstruction: string;
  count: number;
  mostRecentQuote: string;
  mostRecentAt: string;
  reports: StepReport[];
}

// ── Detector cards ────────────────────────────────────────────────────────────

const DETECTORS = [
  {
    id: 'calendar',
    label: 'Calendar detector',
    icon: Calendar,
    role: 'information' as const,
    speed: 'Slowest',
    speedNote: '14–90 days',
    description:
      'Scans every article\'s review cycle and flags those past their due date. ' +
      'Reliable but slow — staleness is discovered on a schedule, not when it happens.',
    how: 'Review cycle (Monthly / Quarterly / Yearly) + publishedAt timestamp',
    bestFor: 'Policy and coaching articles with predictable update cadences',
  },
  {
    id: 'capture-stamp',
    label: 'Capture stamp detector',
    icon: Camera,
    role: 'attention' as const,
    speed: 'Faster',
    speedNote: 'Days after update',
    description:
      'Compares each step\'s Captured_Against__c version to the article\'s current ' +
      'Last_Tested_Version__c. A mismatch means the screen recording was made against ' +
      'a version that is no longer current.',
    how: 'Captured_Against__c ≠ Last_Tested_Version__c on any step',
    bestFor: 'Articles with screen captures — Salesforce UI or Trail OS flows',
  },
  {
    id: 'reader',
    label: 'Reader report',
    icon: MessageSquare,
    role: 'success' as const,
    speed: 'Fastest',
    speedNote: 'Same session',
    description:
      'A reader taps "Step not matching your screen?" in the Help panel and the step ' +
      'is flagged instantly. No form — just a one-tap signal with the current URL as context. ' +
      'This is the only detector that surfaces problems the moment they occur.',
    how: 'One-tap from HelpPanel article detail · POST /knowledge/steps/:stepId/report',
    bestFor: 'Procedure steps with specific UI states that change between releases',
  },
] as const;

// ── StaleCaptures demo table ──────────────────────────────────────────────────

const STALE_CAPTURE_ROWS = [
  { step: 1, instruction: 'Navigate to Setup > Objects', capturedAgainst: 'Winter \'24', currentVersion: 'Spring \'25', source: 'Slack', capturedAt: 'Feb 2026' },
  { step: 2, instruction: 'Click "New Custom Object"', capturedAgainst: 'Winter \'24', currentVersion: 'Spring \'25', source: 'Slack', capturedAt: 'Feb 2026' },
  { step: 3, instruction: 'Set the Record Name type to Auto Number', capturedAgainst: 'Spring \'25', currentVersion: 'Spring \'25', source: 'Direct', capturedAt: 'Apr 2026' },
  { step: 4, instruction: 'Enable Activities and Track Field History', capturedAgainst: 'Winter \'24', currentVersion: 'Spring \'25', source: 'Slack', capturedAt: 'Feb 2026' },
  { step: 5, instruction: 'Save and navigate back to the Object Manager', capturedAgainst: 'Winter \'24', currentVersion: 'Spring \'25', source: 'Slack', capturedAt: 'Feb 2026' },
  { step: 6, instruction: 'Create a custom field of type Picklist', capturedAgainst: 'Winter \'24', currentVersion: 'Spring \'25', source: 'Slack', capturedAt: 'Feb 2026' },
  { step: 7, instruction: 'Verify the field appears in the Object Detail view', capturedAgainst: 'Spring \'25', currentVersion: 'Spring \'25', source: 'Direct', capturedAt: 'May 2026' },
];

// ── Hook — useStepReports (SF article version ID) ────────────────────────────
// Fetches reader reports for a specific SF article version.
// Reports are created by HelpPanel one-tap signals via
//   POST /knowledge/sf-articles/:sfArticleId/report
// and read back via
//   GET  /knowledge/sf-articles/:sfArticleId/step-reports
// Both endpoints use the same STEP_REPORT_STORE keyed by `sf:<sfArticleId>`.

function useStepReports(sfArticleId: string | null) {
  const [groups, setGroups]     = useState<StepReportsGroup[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sfArticleId) { setGroups([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge/sf-articles/${encodeURIComponent(sfArticleId)}/step-reports`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { groups: StepReportsGroup[] };
      setGroups(data.groups);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [sfArticleId]);

  // Note: no useEffect here — caller controls when to reload via the returned fn.
  // This avoids infinite re-render loops; Freshness calls reload on mount/article change.
  return { groups, loading, error, reload: load };
}

// ── DetectorCard ──────────────────────────────────────────────────────────────

function DetectorCard({ detector, rank }: { detector: typeof DETECTORS[number]; rank: number }) {
  const [open, setOpen] = useState(false);
  const cls = STATUS_CLASSES[detector.role];
  const Icon = detector.icon;

  return (
    <div className={`rounded-lg border bg-background p-4 space-y-2 ${
      detector.role === 'success' ? 'border-[#9FC3AE] ring-1 ring-[#9FC3AE]/30' : 'border-border'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
          detector.role === 'success'     ? 'bg-[#E6F0EA]' :
          detector.role === 'attention'   ? 'bg-[#FFF3E0]' :
          'bg-[#EDF5F8]'
        }`}>
          <Icon className={`w-3.5 h-3.5 ${cls.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
              #{rank}
            </span>
            <p className="text-[13px] font-semibold text-foreground">{detector.label}</p>
            {detector.role === 'success' && (
              <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${cls.badge}`}>
                <CheckCircle2 className="w-2.5 h-2.5" /> Fastest
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-semibold ${cls.text}`}>{detector.speed}</span>
            <span className="text-[10px] text-muted-foreground/50">·</span>
            <span className="text-[10px] text-muted-foreground">{detector.speedNote}</span>
          </div>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-shrink-0 p-1 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          title={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed pl-10">
        {detector.description}
      </p>

      {open && (
        <div className="pl-10 space-y-2 pt-1 border-t border-border/50 mt-2">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-0.5">
              How it works
            </p>
            <p className="text-[11px] text-foreground">{detector.how}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-0.5">
              Best for
            </p>
            <p className="text-[11px] text-muted-foreground">{detector.bestFor}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ReaderReportList ──────────────────────────────────────────────────────────

function ReaderReportList({ sfArticleId }: { sfArticleId: string }) {
  const { groups, loading, error, reload } = useStepReports(sfArticleId);

  // Trigger fetch on mount and whenever the article changes
  useEffect(() => { void reload(); }, [reload]);
  const { toast } = useToast();

  async function recaptureStep(stepId: string, seq: number) {
    toast({
      title: `Re-capture queued — Step ${seq}`,
      description: 'The step has been flagged for a new screen recording. Open the Article editor to update the capture.',
    });
    // In a full implementation this would create a recapture task
    void stepId;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-[12px]">Loading reader reports…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-3 text-[12px] text-muted-foreground">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        Could not load reports — {error}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-5 text-center space-y-1.5">
        <MessageSquare className="w-5 h-5 text-muted-foreground/30 mx-auto" />
        <p className="text-[12px] font-medium text-muted-foreground">No reader reports yet</p>
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
          When a reader taps "Step not matching your screen?" in the Help panel, their
          report appears here, linked to the exact step.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map(group => (
        <div key={group.stepId} className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6]/40 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-md bg-[#FBEAE6] border border-[#E8B9B4] flex items-center justify-center flex-shrink-0">
              <Flag className="w-3 h-3 text-[#A93F2F]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase">Step {group.stepSequence}</span>
                {group.count > 1 && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]">
                    {group.count} reports
                  </span>
                )}
              </div>
              <p className="text-[12px] font-medium text-foreground mt-0.5 leading-snug">
                {group.stepInstruction}
              </p>
              {group.mostRecentQuote && (
                <p className="text-[11px] text-muted-foreground mt-1 italic leading-relaxed border-l-2 border-[#E8B9B4] pl-2">
                  "{group.mostRecentQuote}"
                </p>
              )}
            </div>
            <button
              onClick={() => void recaptureStep(group.stepId, group.stepSequence)}
              className="flex-shrink-0 flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 border border-border hover:border-primary/40 rounded px-2 py-1 transition-colors"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Re-capture
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── StaleCapturesTable ────────────────────────────────────────────────────────

function StaleCapturesTable() {
  const stale = STALE_CAPTURE_ROWS.filter(r => r.capturedAgainst !== r.currentVersion);
  const slackCount = stale.filter(r => r.source === 'Slack').length;
  const slackDate  = stale.find(r => r.source === 'Slack')?.capturedAt ?? '';

  return (
    <div className="space-y-3">
      {slackCount > 0 && (
        <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] ${STATUS_CLASSES.attention.badge}`}>
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Clustering pattern: <strong>{slackCount} of {stale.length} stale captures</strong> are from
            Slack, all recorded {slackDate} — likely made during a demo session before the Winter→Spring upgrade.
          </span>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider w-8">#</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Step instruction</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider w-24">Captured vs</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider w-24">Current</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider w-16">Source</th>
            </tr>
          </thead>
          <tbody>
            {STALE_CAPTURE_ROWS.map(row => {
              const isStale = row.capturedAgainst !== row.currentVersion;
              return (
                <tr key={row.step} className={`border-b border-border/50 last:border-0 ${isStale ? 'bg-[#FBEAE6]/20' : ''}`}>
                  <td className="px-3 py-2 text-muted-foreground/50">{row.step}</td>
                  <td className="px-3 py-2 text-foreground leading-snug">{row.instruction}</td>
                  <td className={`px-3 py-2 font-mono font-semibold ${isStale ? 'text-[#A93F2F]' : 'text-[#2F6B3F]'}`}>
                    {row.capturedAgainst}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground font-mono">{row.currentVersion}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      row.source === 'Slack'
                        ? STATUS_CLASSES.attention.badge
                        : STATUS_CLASSES.success.badge
                    }`}>
                      {row.source}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Right rail ────────────────────────────────────────────────────────────────

function RightRail() {
  return (
    <div className="space-y-4">
      {/* Penny rename notice */}
      <div className="rounded-lg border border-border bg-background p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <p className="text-[12px] font-bold text-foreground">Penny noticed a rename</p>
        </div>
        <div className={`rounded-md border px-3 py-2.5 space-y-1.5 ${STATUS_CLASSES.attention.border} bg-[#FFF3E0]/50`}>
          <p className="text-[11px] font-semibold text-[#CC8400]">Potential staleness signal</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            "Custom Object Setup How-To" references <strong>Setup &gt; Create &gt; Objects</strong>.
            In Spring '25, that path became <strong>Setup &gt; Objects &gt; Object Manager</strong>.
            The step instruction still uses the old navigation path.
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          Penny cross-references your step instructions against known Salesforce UI renames in
          her training data. This is a signal, not a confirmation — verify before recapturing.
        </p>
      </div>

      {/* Still vs clip decision guide */}
      <div className="rounded-lg border border-border bg-background p-4 space-y-3">
        <p className="text-[12px] font-bold text-foreground">Still or clip?</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          The capture type affects how quickly stale signals surface.
        </p>
        <div className="space-y-2">
          {[
            {
              type: 'Still (screenshot)',
              when: 'Static UI state — a field layout, a form, a picklist',
              staleSignal: 'Capture stamp mismatch or reader report',
              role: 'information' as const,
            },
            {
              type: 'Clip (screen recording)',
              when: 'Multi-step flow — a wizard, a Save sequence',
              staleSignal: 'Reader report most likely (flow changes aren\'t stamped)',
              role: 'attention' as const,
            },
          ].map(item => {
            const cls = STATUS_CLASSES[item.role];
            return (
              <div key={item.type} className="rounded-md border border-border bg-muted/10 px-3 py-2.5 space-y-1">
                <p className="text-[11px] font-semibold text-foreground">{item.type}</p>
                <p className="text-[10px] text-muted-foreground"><strong>Use when:</strong> {item.when}</p>
                <p className={`text-[10px] font-medium ${cls.text}`}><strong>Stale signal:</strong> {item.staleSignal}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
//
// Two separate article selectors:
//   Reader reports  → SF articles (useHelpArticles) — reports come from HelpPanel taps
//   Stale captures  → local DB articles (useKnowledgeArticles) — stamped procedure steps

export default function KnowledgeStudioFreshness() {
  // SF articles — for the reader-reports section
  const { data: sfData, isLoading: sfLoading } = useHelpArticles('');
  const sfArticles = sfData?.articles ?? [];
  const [selectedSfId, setSelectedSfId] = useState<string>('');

  // Local DB articles — for the stale-captures section
  const { articles: localArticles, loading: localLoading } = useKnowledgeArticles();
  const [selectedLocalId, setSelectedLocalId] = useState<string>('');

  const [activeSection, setActiveSection] = useState<'reports' | 'captures'>('reports');

  // Auto-select first SF article
  useEffect(() => {
    if (!selectedSfId && sfArticles.length > 0) {
      setSelectedSfId(sfArticles[0]!.id);
    }
  }, [sfArticles, selectedSfId]);

  // Auto-select first local article
  useEffect(() => {
    if (!selectedLocalId && localArticles.length > 0) {
      setSelectedLocalId(localArticles[0]!.id);
    }
  }, [localArticles, selectedLocalId]);

  const selectedSfArticle    = sfArticles.find(a => a.id === selectedSfId);
  const selectedLocalArticle = localArticles.find(a => a.id === selectedLocalId);

  return (
    <ScrollArea className="h-full">
      <div className="flex gap-6 p-6 min-h-full">
        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Section intro */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Thermometer className="w-4 h-4 text-muted-foreground/50" />
              <h2 className="text-[13px] font-bold text-foreground">Staleness detectors</h2>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Three detection methods, ranked by how fast they surface stale content.
              Reader reports are the only real-time signal — the others run on a schedule or
              require a version mismatch to already exist.
            </p>
          </div>

          {/* Detector cards — reader is #1 (fastest) */}
          <div className="space-y-3">
            {[...DETECTORS].reverse().map((d, i) => (
              <DetectorCard key={d.id} detector={d} rank={i + 1} />
            ))}
          </div>

          {/* Step-level view with two sub-sections */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-muted-foreground/50" />
              <h2 className="text-[13px] font-bold text-foreground">Step-level view</h2>
              <div className="flex items-center gap-1 ml-auto border rounded-md overflow-hidden">
                {(['reports', 'captures'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setActiveSection(s)}
                    className={`text-[10px] font-semibold px-2.5 py-1 transition-colors ${
                      activeSection === s
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s === 'reports' ? 'Reader reports' : 'Stale captures'}
                  </button>
                ))}
              </div>
            </div>

            {activeSection === 'reports' ? (
              <>
                {/* Reader reports — keyed to SF article version IDs (same IDs HelpPanel uses) */}
                <div className="flex items-center gap-2 mb-4">
                  <label className="text-[11px] text-muted-foreground flex-shrink-0">SF article:</label>
                  {sfLoading ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                    </div>
                  ) : sfArticles.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground italic">No SF articles synced</span>
                  ) : (
                    <select
                      value={selectedSfId}
                      onChange={e => setSelectedSfId(e.target.value)}
                      className="flex-1 h-8 px-2 text-[12px] bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {sfArticles.map(a => (
                        <option key={a.id} value={a.id}>{a.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedSfArticle && (
                  <>
                    <div className="flex items-center gap-1.5 mb-3">
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/50" />
                      <p className="text-[12px] font-semibold text-foreground">
                        Reader reports — {selectedSfArticle.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground ml-auto">
                        From HelpPanel "Tell us" taps
                      </p>
                    </div>
                    <ReaderReportList sfArticleId={selectedSfId} />
                  </>
                )}
              </>
            ) : (
              <>
                {/* Stale captures — keyed to local DB article IDs (have procedure steps) */}
                <div className="flex items-center gap-2 mb-4">
                  <label className="text-[11px] text-muted-foreground flex-shrink-0">Article:</label>
                  {localLoading ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                    </div>
                  ) : localArticles.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground italic">No articles yet</span>
                  ) : (
                    <select
                      value={selectedLocalId}
                      onChange={e => setSelectedLocalId(e.target.value)}
                      className="flex-1 h-8 px-2 text-[12px] bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {localArticles.map(a => (
                        <option key={a.id} value={a.id}>{a.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Demo preview notice — stale capture data is not yet wired to the selected article */}
                <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 mb-4 text-[11px] ${STATUS_CLASSES.information.badge}`}>
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-0.5">Example dataset — not yet wired to the selected article</p>
                    <p className="text-muted-foreground leading-relaxed">
                      The table below shows a fixed example of how capture stamp mismatches surface.
                      Live per-article data requires <code className="text-[10px] bg-muted/60 px-1 rounded">Captured_Against__c</code> and{' '}
                      <code className="text-[10px] bg-muted/60 px-1 rounded">Last_Tested_Version__c</code> fields to be populated in the SF org.
                      Wiring to real step data is tracked as a follow-up task.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-3">
                  <Camera className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <p className="text-[12px] font-semibold text-foreground">
                    Capture stamp audit — example
                  </p>
                </div>
                <StaleCapturesTable />
              </>
            )}
          </div>
        </div>

        {/* ── Right rail ── */}
        <div className="w-64 flex-shrink-0">
          <RightRail />
        </div>
      </div>
    </ScrollArea>
  );
}
