import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { PageShell } from '@/components/platform/PageShell';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

interface LearnerRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  pennyTrail: string | null;
  currentPhase: string | null;
  currentGoal: string | null;
  confidenceScore: number | null;
  skillScore: number | null;
  sprintWeek: number | null;
  onboardingComplete: boolean;
  coachingTone: string | null;
  lastInteraction: string | null;
}

type SortKey = keyof LearnerRow;

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function isWithin7Days(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 7 * 86_400_000;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-muted rounded w-full max-w-[90px]" />
        </td>
      ))}
    </tr>
  );
}

const COLS: { key: SortKey; label: string }[] = [
  { key: 'lastName',        label: 'Name' },
  { key: 'pennyTrail',      label: 'Trail' },
  { key: 'currentPhase',    label: 'Phase' },
  { key: 'confidenceScore', label: 'Confidence' },
  { key: 'skillScore',      label: 'Skill Score' },
  { key: 'sprintWeek',      label: 'Sprint Week' },
  { key: 'lastInteraction', label: 'Last Active' },
];

export default function Learners() {
  const [, navigate]      = useLocation();
  const [learners, setLearners] = useState<LearnerRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [sortKey, setSortKey]   = useState<SortKey>('lastName');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setLoading(true);
    fetch('/api/penny/data/learners/directory')
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json() as Promise<LearnerRow[]>;
      })
      .then(data => { setLearners(data); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load learners');
        setLoading(false);
      });
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key; }
      setSortDir('asc');
      return key;
    });
  }, []);

  const filtered = learners.filter(l => {
    const q = search.toLowerCase();
    return (
      `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const total      = learners.length;
  const active     = learners.filter(l => isWithin7Days(l.lastInteraction)).length;
  const onboarded  = learners.filter(l => l.onboardingComplete).length;
  const confScores = learners.map(l => l.confidenceScore).filter((s): s is number => s !== null);
  const avgConf    = confScores.length > 0
    ? `${Math.round(confScores.reduce((a, b) => a + b, 0) / confScores.length)}/10`
    : '--';

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 opacity-20 inline ml-0.5" />;
    return sortDir === 'asc'
      ? <ChevronUp   className="w-3 h-3 text-primary inline ml-0.5" />
      : <ChevronDown className="w-3 h-3 text-primary inline ml-0.5" />;
  }

  return (
    <PageShell
      section="Penny Command Center"
      title="Learners"
      subtitle="Live from Salesforce Contacts — all learners assigned to a Penny trail"
      integration="Contact · Penny_Interaction_Log__c"
    >
      <div className="space-y-4">

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Learners', value: loading ? '—' : String(total) },
            { label: 'Active (7d)',    value: loading ? '—' : String(active) },
            { label: 'Avg Confidence', value: loading ? '—' : avgConf },
            { label: 'Onboarded',      value: loading ? '—' : String(onboarded) },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-[14px] font-semibold text-muted-foreground  mb-2">{s.label}</p>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Search ────────────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-8 pr-3 py-2 text-[14px] rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {COLS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-left px-4 py-2.5 text-[14px] font-semibold text-muted-foreground  cursor-pointer hover:text-foreground select-none"
                  >
                    {col.label}
                    <SortIcon col={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">

              {loading && (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center">
                    <p className="text-[14px] text-[#A93F2F] font-medium">{error}</p>
                    <p className="text-[14px] text-muted-foreground mt-1">
                      Check Salesforce authentication in Admin → Integrations.
                    </p>
                  </td>
                </tr>
              )}

              {!loading && !error && sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <p className="text-[14px] text-muted-foreground">
                      {search ? 'No learners match your search.' : 'No learners assigned to a Penny trail yet.'}
                    </p>
                  </td>
                </tr>
              )}

              {!loading && !error && sorted.map(l => (
                <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/penny/learner/${l.id}`)}
                      className="text-[14px] font-medium text-primary hover:underline text-left"
                    >
                      {l.firstName} {l.lastName}
                    </button>
                    <p className="text-[14px] text-muted-foreground/70">{l.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[14px] text-muted-foreground">
                    {l.pennyTrail ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-muted-foreground">
                    {l.currentPhase ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-muted-foreground">
                    {l.confidenceScore !== null ? `${l.confidenceScore}/10` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-muted-foreground">
                    {l.skillScore !== null ? `${l.skillScore}/10` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-muted-foreground">
                    {l.sprintWeek !== null ? `Week ${l.sprintWeek}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-muted-foreground">
                    {relativeTime(l.lastInteraction)}
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>

      </div>
    </PageShell>
  );
}
