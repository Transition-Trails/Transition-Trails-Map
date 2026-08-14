// ─────────────────────────────────────────────────────────────────────────────
// ContentItemTab — Content Studio
// Full three-column detail view for a single content item record.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  ExternalLink,
  Lock,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { STATUS_CLASSES } from '@/config/statusColors';
import type { StatusRole } from '@/config/statusColors';
import { InsightCard } from '../components/InsightCard';
import { ContentStudioPennyCard } from '../components/PennyCard';
import { MOCK_FEATURED_ITEM, MOCK_PRODUCT_TREE } from '../mockData';
import type { ContentItemStatus, ContentItemPublication, ProductNode } from '../types';

// ── Status → role mapping ─────────────────────────────────────────────────────

import type { ContentItem } from '../types';

function statusToRole(status: ContentItemStatus): StatusRole {
  switch (status) {
    case 'In Progress':       return 'information';
    case 'Ready for Review':  return 'attention';
    case 'Ready to Publish':  return 'success';
    case 'Published':         return 'success';
    case 'Idea':              return 'neutral';
    case 'Draft':             return 'neutral';
    case 'Scheduled':         return 'information';
    case 'Validated':         return 'success';
    default:                  return 'neutral';
  }
}

// ── Mock publications ─────────────────────────────────────────────────────────

const MOCK_PUBLICATIONS: ContentItemPublication[] = [
  {
    platform: 'YouTube',
    planned:  '2026-08-18T00:00:00Z',
    actual:   undefined,
    status:   'planned',
    url:      undefined,
  },
  {
    platform: 'LinkedIn',
    planned:  '2026-08-19T00:00:00Z',
    actual:   undefined,
    status:   'planned',
    url:      undefined,
  },
  {
    platform: 'Substack',
    planned:  '2026-08-22T00:00:00Z',
    actual:   undefined,
    status:   'planned',
    url:      undefined,
  },
];

// ── Mock tasks for this record ────────────────────────────────────────────────

const MOCK_RECORD_TASKS = [
  {
    id: 't-r-001',
    title: 'Review "Who Can See What" draft',
    due: '2026-08-16T00:00:00Z',
    assigneeInitials: 'SR',
    done: false,
  },
  {
    id: 't-r-002',
    title: 'Add screenshots for sharing-rule section',
    due: '2026-08-18T00:00:00Z',
    assigneeInitials: 'JT',
    done: false,
  },
  {
    id: 't-r-003',
    title: 'Final SEO keyword pass',
    due: '2026-08-20T00:00:00Z',
    assigneeInitials: 'AL',
    done: true,
  },
];

// ── Production stations mock ──────────────────────────────────────────────────

type DotColor = 'green' | 'amber' | 'gray';
interface Station {
  name: string;
  dot?: DotColor;
  desc: string;
  statusLine?: string;
  isNA?: boolean;
  isLocked?: boolean;
  lockedLabel?: string;
}

const STATIONS: Station[] = [
  {
    name: 'Gemini Notebook',
    dot: 'green',
    desc: 'Research brief',
    statusLine: 'Complete',
  },
  {
    name: 'Canva',
    dot: 'amber',
    desc: 'Cover image',
    statusLine: 'In progress',
  },
  {
    name: 'Gemini Image',
    dot: 'green',
    desc: 'Inline graphic',
    statusLine: 'Complete',
  },
  {
    name: 'ElevenLabs',
    dot: 'gray',
    desc: 'Audio version',
    statusLine: 'Not started',
  },
  {
    name: 'Descript',
    desc: 'Video edit',
    isNA: true,
  },
  {
    name: 'Affinity',
    desc: 'Design file',
    isLocked: true,
    lockedLabel: 'Angela only',
  },
];

// ── Helper: flatten product tree to find products by id ──────────────────────

function flattenProducts(node: ProductNode): ProductNode[] {
  return [node, ...(node.children ?? []).flatMap(flattenProducts)];
}

const ALL_PRODUCTS = flattenProducts(MOCK_PRODUCT_TREE);

function findProduct(id: string): ProductNode | undefined {
  return ALL_PRODUCTS.find(p => p.id === id);
}

const PRODUCT_ROLES: Record<string, string> = {
  'prod-001': 'Core content',
  'prod-002': 'Supplementary reference',
  'prod-003': 'Required reading',
  'prod-004': 'Optional resource',
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(iso: string | undefined): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

// ── Dot component ─────────────────────────────────────────────────────────────

function StatusDot({ color }: { color: DotColor }) {
  const bg = color === 'green' ? 'bg-[#2F6B3F]' : color === 'amber' ? 'bg-[#CC8400]' : 'bg-[#C8CBC6]';
  return <span className={`inline-block w-[7px] h-[7px] rounded-full ${bg} flex-shrink-0`} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function ContentItemTab({ selectedItem }: { selectedItem?: ContentItem | null }) {
  // Fall back to the featured mock item when no item is passed (e.g. direct URL visit)
  const item = selectedItem ?? MOCK_FEATURED_ITEM;

  // Initialize from the actual item status so the badge and CTA match the kanban column.
  // The `key` prop on this component (set in ContentStudio) ensures a remount when a
  // different item is selected, so this initializer always runs fresh.
  const [localStatus, setLocalStatus] = useState<ContentItemStatus>(item.status);

  const role      = statusToRole(localStatus);
  const badgeCls  = STATUS_CLASSES[role].badge;
  const isInProgress      = localStatus === 'In Progress';
  const isReadyForReview  = localStatus === 'Ready for Review';

  function handleSubmit() {
    setLocalStatus('Ready for Review');
  }

  return (
    <div className="flex flex-col gap-4 min-h-0 pb-6">

      {/* ── Record header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 px-0">
        {/* Left: eyebrow + title + status + ID */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[11px] text-muted-foreground/70 font-medium uppercase tracking-wide">
            Content Topic · {item.topic}
          </span>
          <h1 className="font-serif text-[20px] font-semibold text-foreground leading-snug">
            {item.title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeCls}`}
              style={{ transition: 'all 150ms ease' }}
            >
              {localStatus}
            </span>
            <span className="text-[11px] text-muted-foreground/50 font-mono">
              ContentItem__c · a-04K2f00000LmQ
            </span>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          {item.driveUrl && (
            <a
              href={item.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#2F6F7E] text-[#2F6F7E] text-[13px] font-medium hover:bg-[#EDF5F8] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Drive
            </a>
          )}
          {isInProgress && (
            <button
              onClick={handleSubmit}
              className="px-4 py-1.5 text-[13px] font-semibold text-[#2A2E2C] rounded-[14px] transition-all"
              style={{
                backgroundColor: '#F5A623',
                boxShadow: '0 2px 8px rgba(245,166,35,.35)',
                transition: 'opacity 150ms ease',
              }}
            >
              Submit for review
            </button>
          )}
        </div>
      </div>

      {/* ── Three-column grid ──────────────────────────────────────────────── */}
      <div className="grid items-start gap-[14px]" style={{ gridTemplateColumns: '232px 1fr 300px' }}>

        {/* ════════════════════════════════════════════════════════════════════
            LEFT COLUMN — 232px
        ════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-3">

          {/* ── "The record" card ────────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">
              The record
            </p>

            <RecordRow label="Format" value={item.format} />
            <RecordRow
              label="Pillars"
              value={item.pillars?.join(', ') ?? '—'}
            />
            <RecordRow label="Objective" value={item.objective ?? '—'} />

            {/* Due date — overdue in amber */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wide">
                Due date
              </span>
              <span
                className={`text-[13px] font-medium ${
                  isOverdue(item.dueDate) ? 'text-[#CC8400]' : 'text-foreground'
                }`}
              >
                {fmtDate(item.dueDate)}
              </span>
            </div>

            {item.length && <RecordRow label="Length" value={item.length} />}

            {/* Drive content location */}
            {item.driveUrl && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wide">
                  Drive Content Location
                </span>
                <a
                  href={item.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[13px] text-[#2F6F7E] font-medium hover:underline truncate"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">View in Drive</span>
                </a>
              </div>
            )}
          </div>

          {/* ── SEO & discoverability card ────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">
              SEO and discoverability
            </p>

            {item.seoMeta ? (
              <>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wide">
                    Meta description
                  </span>
                  <p className="text-[12px] text-muted-foreground leading-snug">
                    {item.seoMeta.description}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wide">
                    Keywords
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.seoMeta.keywords.map(kw => (
                      <span
                        key={kw}
                        className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#EDF5F8] text-[#2F6F7E] border border-[#7FAFC6]"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-[12px] text-muted-foreground/60 italic">No SEO data yet.</p>
            )}

            {/* Attribution pill */}
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDF5F8] border border-[#7FAFC6] text-[11px] text-[#2F6F7E] font-medium">
                Drafted by Penny, edited by Angela
              </span>
            </div>
          </div>

          {/* ── Appears in card ──────────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">
              Appears in
            </p>
            {(item.productIds ?? []).length === 0 ? (
              <p className="text-[12px] text-muted-foreground/60 italic">No products linked.</p>
            ) : (
              <div className="space-y-2">
                {(item.productIds ?? []).map(pid => {
                  const prod = findProduct(pid);
                  return (
                    <div key={pid} className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-foreground leading-snug">
                        {prod?.name ?? pid}
                      </span>
                      <span className="text-[11px] text-muted-foreground/70">
                        {PRODUCT_ROLES[pid] ?? 'Content resource'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CENTER COLUMN — 1fr
        ════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4 min-w-0">

          {/* ── Draft card ───────────────────────────────────────────────── */}
          <div className="rounded-[14px] border border-border bg-card overflow-hidden">
            <div className="px-3 pt-3 pb-0">
              <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-2">
                Draft
              </p>
              {/* Google Docs placeholder */}
              <div className="relative max-h-[230px] overflow-hidden rounded-[8px]">
                <div className="bg-[#F8F9FA] p-4 space-y-2.5 rounded-[8px]" style={{ minHeight: 220 }}>
                  {/* Doc lines */}
                  <div className="h-3 bg-[#E2E4E1] rounded-full w-3/4" />
                  <div className="h-2.5 bg-[#E2E4E1] rounded-full w-full" />
                  <div className="h-2.5 bg-[#E2E4E1] rounded-full w-5/6" />
                  <div className="h-2.5 bg-[#E2E4E1] rounded-full w-full" />
                  <div className="h-2.5 bg-[#E2E4E1] rounded-full w-4/5" />
                  <div className="h-2 bg-transparent" />
                  <div className="h-2.5 bg-[#E2E4E1] rounded-full w-full" />
                  <div className="h-2.5 bg-[#E2E4E1] rounded-full w-11/12" />
                  <div className="h-2.5 bg-[#E2E4E1] rounded-full w-5/6" />
                  <div className="h-2 bg-transparent" />
                  <div className="h-2.5 bg-[#E2E4E1] rounded-full w-full" />
                  <div className="h-2.5 bg-[#E2E4E1] rounded-full w-3/4" />
                  <div className="h-2.5 bg-[#E2E4E1] rounded-full w-full" />
                  <div className="h-2.5 bg-[#E2E4E1] rounded-full w-5/6" />
                </div>
                {/* Fade overlay */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, #ffffff, transparent)' }}
                />
              </div>
            </div>

            {/* Penny suggestion band */}
            <div className="mt-3 bg-[#EDF5F8] border-t border-[#7FAFC6] px-4 py-2.5 flex items-center gap-3">
              <span className="text-[11px] font-semibold text-[#2F6F7E] uppercase tracking-wide flex-shrink-0">
                Penny
              </span>
              <span className="text-[12px] text-[#2F6F7E]/80 flex-1">
                Draft a paragraph for the "Object-level permissions" section?
              </span>
              <button className="text-[12px] font-semibold text-[#2F6B3F] hover:underline flex-shrink-0">
                Draft a paragraph
              </button>
              <button className="text-[12px] text-muted-foreground hover:underline flex-shrink-0">
                Not now
              </button>
            </div>
          </div>

          {/* ── Production stations ──────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide mb-2">
              Production stations
            </p>
            <div className="grid grid-cols-3 gap-2">
              {STATIONS.map(station => (
                <StationTile key={station.name} station={station} />
              ))}
            </div>
          </div>

          {/* ── Content Item Publication table ────────────────────────────── */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide mb-2">
              Content Item Publication
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              {/* Header */}
              <div
                className="grid text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide px-3 py-2"
                style={{ gridTemplateColumns: '1fr 90px 90px 80px 90px', background: '#F2F3F1' }}
              >
                <span>Platform</span>
                <span>Planned</span>
                <span>Actual</span>
                <span>Status</span>
                <span>URL</span>
              </div>
              {/* Rows */}
              {MOCK_PUBLICATIONS.map((pub, i) => (
                <div
                  key={i}
                  className="grid text-[12px] px-3 py-2 border-t border-border items-center"
                  style={{ gridTemplateColumns: '1fr 90px 90px 80px 90px' }}
                >
                  <span className="text-foreground font-medium truncate">{pub.platform}</span>
                  <span className="text-muted-foreground">{fmtDate(pub.planned)}</span>
                  <span className="text-muted-foreground">{pub.actual ? fmtDate(pub.actual) : '—'}</span>
                  <span>
                    <PublicationStatusPill status={pub.status} />
                  </span>
                  <span>
                    {pub.url ? (
                      <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-[#2F6F7E] hover:underline truncate block max-w-[80px]">
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </span>
                </div>
              ))}
              {/* Footer note */}
              <div className="px-3 py-2 border-t border-border border-l-2 border-l-[#E2E4E1]">
                <p className="text-[11px] text-muted-foreground/60 leading-snug">
                  Buffer handles scheduling for social channels. Planned dates are targets; actual dates are set on publish.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            RIGHT COLUMN — 300px
        ════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-3">

          {/* ── InsightCard ──────────────────────────────────────────────── */}
          <InsightCard
            kind="informational"
            scope="This record"
            observation="This article is linked to 2 products. Changes to Salesforce sharing rules may affect 14 learners currently enrolled in those products — a high blast radius for a single content update."
            readFrom={['Salesforce', 'Product catalog', 'Enrollment data']}
            primaryAction={{ label: 'View linked products', onClick: () => {} }}
            secondaryAction={{ label: 'See enrollment data', onClick: () => {} }}
            pennyNote="Scope confirmed from Salesforce org structure as of Aug 13."
            onDismiss={() => {}}
          />

          {/* ── Approval card — visible when Ready for Review ────────────── */}
          {isReadyForReview && (
            <div
              className="rounded-lg border border-border bg-card overflow-hidden"
              style={{ borderTop: '3px solid #CC8400' }}
            >
              <div className="p-4 space-y-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold text-[#CC8400] uppercase tracking-wide">
                    Awaiting approval
                  </span>
                  <span className="text-[13px] font-semibold text-foreground">
                    Angela Landrith
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground/70">
                  Submitted for review · Aug 14, 2026 at 10:32 AM
                </p>
                <div className="flex gap-2">
                  <button className="flex-1 py-1.5 rounded-md text-[13px] font-semibold bg-[#E6F0EA] text-[#245531] border border-[#9FC3AE] hover:bg-[#D0E6D8] transition-colors">
                    Approve
                  </button>
                  <button className="flex-1 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground border border-border hover:bg-muted/40 transition-colors">
                    Request changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── ContentStudioPennyCard — Coordinator ─────────────────────── */}
          <div>
            <ContentStudioPennyCard
              mode="Coordinator"
              message="This item is in its final review stage. Three production stations are complete; Canva is still in progress. The ElevenLabs audio version can begin once the draft is approved."
              actions={[
                'Check Canva status',
                'Queue ElevenLabs job',
                'Preview publication schedule',
              ]}
            />
            {/* Footer note */}
            <p className="text-[11px] text-muted-foreground/60 leading-snug mt-2 px-1">
              Content Item has no owner field — the Task is the assignment.
            </p>
          </div>

          {/* ── Tasks card ───────────────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">
              Tasks
            </p>
            <div className="space-y-2.5">
              {MOCK_RECORD_TASKS.map(task => (
                <div key={task.id} className="flex items-start gap-2.5">
                  {/* Hollow circle checkbox */}
                  {task.done ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2F6B3F] flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[13px] leading-snug ${
                        task.done
                          ? 'text-muted-foreground/50 line-through'
                          : 'text-foreground'
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60">
                      Due {fmtDate(task.due)}
                    </p>
                  </div>
                  {/* Assignee initials avatar */}
                  <div className="w-5 h-5 rounded-full bg-[#EDF5F8] border border-[#7FAFC6] flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-semibold text-[#2F6F7E]">
                      {task.assigneeInitials}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-[13px] text-foreground">{value}</span>
    </div>
  );
}

function StationTile({ station }: { station: Station }) {
  const bg = station.isLocked ? '#F2F3F1' : 'white';

  return (
    <div
      className="rounded-[8px] border border-border p-2 flex flex-col gap-1"
      style={{ backgroundColor: bg }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] font-semibold text-foreground leading-snug">
          {station.name}
        </span>
        {station.isLocked && (
          <Lock className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
        )}
      </div>
      <span className="text-[11px] text-muted-foreground/70">{station.desc}</span>
      {station.isNA ? (
        <span className="text-[11px] text-muted-foreground/40 italic">Not applicable</span>
      ) : station.isLocked ? (
        <span className="text-[11px] text-muted-foreground/60">{station.lockedLabel}</span>
      ) : station.dot ? (
        <div className="flex items-center gap-1.5">
          <StatusDot color={station.dot} />
          <span className="text-[11px] text-muted-foreground/70">{station.statusLine}</span>
        </div>
      ) : null}
    </div>
  );
}

function PublicationStatusPill({ status }: { status: ContentItemPublication['status'] }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    planned:   { cls: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',   label: 'Planned' },
    published: { cls: 'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]',   label: 'Published' },
    skipped:   { cls: 'bg-[#E2E4E1] text-[#4A4F4D] border-[#C8CBC6]',   label: 'Skipped' },
    overdue:   { cls: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',   label: 'Overdue' },
  };
  const { cls, label } = cfg[status] ?? cfg.planned;
  return (
    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}
