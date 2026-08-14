// ─────────────────────────────────────────────────────────────────────────────
// PipelineTab — Content Studio
// Production manager's view: advisory strip, stat cards, kanban board,
// publication-gaps matrix, and a board-level InsightCard.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  TriangleAlert,
  FileText,
  Video,
  Mic,
  Mail,
  Share2,
  BookOpen,
  CheckSquare,
  Layout,
} from 'lucide-react';
import { InsightCard } from '../components/InsightCard';
import { MOCK_CONTENT_ITEMS, MOCK_GAP_MATRIX } from '../mockData';
import type { ContentItem, ContentFormat, PublicationPlatform } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatIcon(format: ContentFormat) {
  const cls = 'w-3 h-3 flex-shrink-0 text-muted-foreground';
  switch (format) {
    case 'Article':   return <FileText   className={cls} />;
    case 'Video':     return <Video      className={cls} />;
    case 'Podcast':   return <Mic        className={cls} />;
    case 'Email':     return <Mail       className={cls} />;
    case 'Social':    return <Share2     className={cls} />;
    case 'Guide':     return <BookOpen   className={cls} />;
    case 'Checklist': return <CheckSquare className={cls} />;
    case 'Template':  return <Layout     className={cls} />;
    default:          return <FileText   className={cls} />;
  }
}

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function fmtDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Items that came from a Penny suggestion (mock)
const PENNY_IDS = new Set(['ci-001', 'ci-003', 'ci-005']);
// Published items marked as recycle candidates (mock)
const RECYCLE_IDS = new Set(['ci-pub-001', 'ci-pub-003', 'ci-pub-005']);

// ── KanbanCard ───────────────────────────────────────────────────────────────

function KanbanCard({
  item,
  onClick,
}: {
  item: ContentItem;
  onClick: () => void;
}) {
  const isReview   = item.status === 'Ready for Review';
  const isPenny    = PENNY_IDS.has(item.id);
  const isRecycle  = RECYCLE_IDS.has(item.id);
  const due        = fmtDate(item.dueDate);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[14px] p-2.5 cursor-pointer transition-all duration-150"
      style={{
        border: isReview ? '1px solid #FFD08A' : '1px solid #E2E4E1',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#9FC3AE';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          isReview ? '#FFD08A' : '#E2E4E1';
      }}
    >
      {/* Title */}
      <p className="font-serif text-[13px] font-semibold text-foreground leading-snug mb-1.5 line-clamp-2">
        {item.title}
      </p>

      {/* Format line */}
      <div className="flex items-center gap-1 mb-2">
        {formatIcon(item.format)}
        <span className="text-[11px] text-muted-foreground">{item.format}</span>
      </div>

      {/* Pills */}
      {(isReview || isPenny || isRecycle) && (
        <div className="flex flex-wrap gap-1 mb-2">
          {isReview && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: '#FFF3E0', color: '#CC8400', border: '1px solid #FFD08A' }}
            >
              Approval with Angela
            </span>
          )}
          {isPenny && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: '#EDF5F8', color: '#2F6F7E', border: '1px solid #7FAFC6' }}
            >
              From Penny
            </span>
          )}
          {isRecycle && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: '#E6F0EA', color: '#2F6B3F', border: '1px solid #9FC3AE' }}
            >
              Recycle candidate
            </span>
          )}
        </div>
      )}

      {/* Footer: due date + avatar */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        {due ? (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: '#F2F3F1', color: '#4A4F4D' }}
          >
            {due}
          </span>
        ) : (
          <span />
        )}
        {item.assignee && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
            style={{ background: '#9FC3AE' }}
            title={item.assignee}
          >
            {initials(item.assignee)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────

const COLUMNS: { status: ContentItem['status']; label: string }[] = [
  { status: 'Idea',             label: 'Idea' },
  { status: 'In Progress',      label: 'In Progress' },
  { status: 'Ready for Review', label: 'Ready for Review' },
  { status: 'Ready to Publish', label: 'Ready to Publish' },
  { status: 'Published',        label: 'Published' },
];

// ── Gaps matrix helpers ───────────────────────────────────────────────────────

const PLATFORMS: PublicationPlatform[] = [
  'YouTube',
  'LinkedIn',
  'Substack',
  'Website',
  'Instagram',
];

// All current platform names are short enough to display as-is
function shortPlatform(p: PublicationPlatform): string {
  return p;
}

// ── PipelineTab ───────────────────────────────────────────────────────────────

export function PipelineTab({
  onSelectItem,
}: {
  onSelectItem?: (item: ContentItem) => void;
}) {
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [, setLocation] = useLocation();

  // ── Group items by status ──────────────────────────────────────────────────
  const grouped = new Map<string, ContentItem[]>();
  for (const col of COLUMNS) grouped.set(col.status, []);
  for (const item of MOCK_CONTENT_ITEMS) {
    const key = item.status;
    if (grouped.has(key)) grouped.get(key)!.push(item);
  }

  // ── Build week × platform lookup ───────────────────────────────────────────
  const WEEK_LABELS = [
    'Jul 7',  'Jul 14', 'Jul 21', 'Jul 28',
    'Aug 4',  'Aug 11', 'Aug 18', 'Aug 25',
    'Sep 1',  'Sep 8',  'Sep 15', 'Sep 22',
  ];

  // cell key: `${weekIndex}:${platform}`
  const cellMap = new Map<string, { status: string; count: number }>();
  for (const cell of MOCK_GAP_MATRIX) {
    const key = `${cell.week - 1}:${cell.platform}`;
    const existing = cellMap.get(key);
    if (!existing) {
      cellMap.set(key, { status: cell.status, count: cell.status !== 'gap' ? 1 : 0 });
    } else {
      cellMap.set(key, { status: cell.status, count: existing.count + (cell.status !== 'gap' ? 1 : 0) });
    }
  }

  // Determine if a whole week row is empty (all platforms are 'gap')
  function isWeekEmpty(wi: number): boolean {
    return PLATFORMS.every(p => {
      const cell = cellMap.get(`${wi}:${p}`);
      return !cell || cell.status === 'gap';
    });
  }

  return (
    <div className="h-full overflow-y-auto">

      {/* ── Advisory strip ──────────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-3 px-4 py-3"
        style={{
          background: '#FFF3E0',
          borderLeft: '4px solid #FFD08A',
          color: '#CC8400',
        }}
      >
        <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#CC8400' }} />
        <p className="text-[13px] font-medium leading-snug" style={{ color: '#CC8400' }}>
          Twelve weeks of manual use before the joins and the agents. A model nobody has lived in gets automated in the wrong direction.
        </p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 p-4">
        {/* Card 1: Content items */}
        <div
          className="bg-white p-3 rounded-[14px]"
          style={{ border: '1px solid #E2E4E1' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/50 mb-0.5">
            Content Items
          </p>
          <p className="font-serif text-[22px] font-semibold text-foreground leading-none mb-0.5">
            34
          </p>
          <p className="text-[11px] text-muted-foreground">across all statuses</p>
        </div>

        {/* Card 2: Publications planned */}
        <div
          className="bg-white p-3 rounded-[14px]"
          style={{ border: '1px solid #E2E4E1' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/50 mb-0.5">
            Publications Planned
          </p>
          <p className="font-serif text-[22px] font-semibold text-foreground leading-none mb-0.5">
            41
          </p>
          <p className="text-[11px] text-muted-foreground">next 12 weeks</p>
        </div>

        {/* Card 3: Kept the date */}
        <div
          className="bg-white p-3 rounded-[14px]"
          style={{ border: '1px solid #E2E4E1' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/50 mb-0.5">
            On-Time Rate
          </p>
          <p className="font-serif text-[22px] font-semibold text-foreground leading-none mb-0.5">
            8 of 11
          </p>
          <p className="text-[11px] font-semibold" style={{ color: '#CC8400' }}>
            kept the date
          </p>
        </div>

        {/* Card 4: Awaiting approval */}
        <div
          className="bg-white p-3 rounded-[14px]"
          style={{ border: '1px solid #E2E4E1' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/50 mb-0.5">
            Awaiting Approval
          </p>
          <p
            className="font-serif text-[22px] font-semibold leading-none mb-0.5"
            style={{ color: '#2F6B3F' }}
          >
            3
          </p>
          <p className="text-[11px] text-muted-foreground">pending review</p>
        </div>
      </div>

      {/* ── Kanban board ────────────────────────────────────────────────────── */}
      <div
        className="px-4 pb-4"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(190px, 1fr))',
          gap: '10px',
          alignItems: 'start',
        }}
      >
        {COLUMNS.map(col => {
          const items = grouped.get(col.status) ?? [];
          return (
            <div key={col.status}>
              {/* Column header */}
              <div className="flex items-center gap-1.5 mb-2 px-0.5">
                <span className="font-serif text-[11px] font-bold text-foreground tracking-wide uppercase">
                  {col.label}
                </span>
                <span className="text-[11px] font-semibold text-foreground/50">
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {items.map(item => (
                  <KanbanCard
                    key={item.id}
                    item={item}
                    onClick={() => onSelectItem?.(item)}
                  />
                ))}
                {items.length === 0 && (
                  <div
                    className="rounded-[14px] p-3 text-center text-[11px] text-muted-foreground/50"
                    style={{ border: '1px dashed #E2E4E1' }}
                  >
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Publication gaps matrix ──────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <div
          className="overflow-hidden rounded-lg"
          style={{ border: '1px solid #E2E4E1' }}
        >
          {/* Matrix grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '88px repeat(5, 1fr)',
              gap: '1px',
              background: '#E2E4E1',
            }}
          >
            {/* Header row */}
            <div
              className="px-2 py-1.5 text-[11px] font-bold text-foreground/60"
              style={{ background: '#F2F3F1' }}
            >
              Week
            </div>
            {PLATFORMS.map(p => (
              <div
                key={p}
                className="px-2 py-1.5 text-[11px] font-bold text-foreground/70 text-center"
                style={{ background: '#F2F3F1' }}
              >
                {shortPlatform(p)}
              </div>
            ))}

            {/* Data rows */}
            {WEEK_LABELS.map((wLabel, wi) => {
              const emptyRow = isWeekEmpty(wi);
              return (
                <>
                  {/* Week label cell */}
                  <div
                    key={`week-${wi}`}
                    className="px-2 py-1.5 text-[11px] font-semibold flex items-center"
                    style={{
                      background: emptyRow ? '#FBEAE6' : '#F2F3F1',
                      color:      emptyRow ? '#A93F2F' : '#4A4F4D',
                    }}
                  >
                    {wLabel}
                  </div>

                  {/* Platform cells */}
                  {PLATFORMS.map(p => {
                    const cell = cellMap.get(`${wi}:${p}`);
                    const status = cell?.status ?? 'gap';
                    const hasContent = status === 'published' || status === 'planned';

                    let bg    = '#FFFFFF';
                    let color = '#C8CBC6';
                    let text  = '—';

                    if (emptyRow) {
                      bg    = '#FBEAE6';
                      color = '#A93F2F';
                      text  = '—';
                    } else if (hasContent) {
                      bg    = '#E6F0EA';
                      color = '#2F6B3F';
                      text  = status === 'published' ? '1' : '·';
                    }

                    return (
                      <div
                        key={`${wi}:${p}`}
                        className="px-2 py-1.5 text-[11px] text-center font-bold"
                        style={{ background: bg, color }}
                      >
                        {text}
                      </div>
                    );
                  })}
                </>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Board InsightCard ────────────────────────────────────────────────── */}
      {!insightDismissed && (
        <div className="px-4 pb-4">
          <InsightCard
            kind="advisory"
            scope="This board"
            observation="Week of Aug 25 has no publications scheduled across any platform. This is your only fully dark week in the 12-week window — if intentional, mark it so future planning skips it. If not, even a single Slack share or newsletter mention closes the gap."
            readFrom={['Publication matrix', 'Content pipeline']}
            primaryAction={{
              label: 'Add a publication',
              onClick: () => setLocation('/penny/content-studio/topic'),
            }}
            secondaryAction={{
              label: 'Leave it empty on purpose',
              onClick: () => setInsightDismissed(true),
            }}
            pennyNote="I flagged this because a consistent cadence builds audience trust. One dark week can reduce open rates the following week."
            onDismiss={() => setInsightDismissed(true)}
          />
        </div>
      )}

    </div>
  );
}
