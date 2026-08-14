// ─────────────────────────────────────────────────────────────────────────────
// TopicTab — Content Studio · Topic view
// Shows a topic header, family card, 12-week coverage grid, items table,
// and a right-rail with Penny card, insight card, balance card, and recycle
// candidates.
// ─────────────────────────────────────────────────────────────────────────────

import { CornerDownRight, Lightbulb, Plus } from 'lucide-react';
import type { ContentItem } from '../types';
import { ContentStudioPennyCard } from '../components/PennyCard';
import { InsightCard } from '../components/InsightCard';
import {
  MOCK_TOPIC_FAMILY,
  MOCK_TOPIC_WEEK_COVERAGE,
  MOCK_TOPIC_ITEMS,
  MOCK_RECYCLE_CANDIDATES,
} from '../mockData';

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ label }: { label: string }) {
  const styles: Record<string, string> = {
    'Active':            'bg-[#D6F0E2] text-[#2F6B3F] border-[#9FC3AE]',
    'Draft':             'bg-[#FFF8E6] text-[#CC8400] border-[#FFD08A]',
    'Planned':           'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
    'In Progress':       'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
    'Ready for Review':  'bg-[#EEF3FF] text-[#3B5BDB] border-[#BAC8FF]',
    'Published':         'bg-[#D6F0E2] text-[#2F6B3F] border-[#9FC3AE]',
    'Idea':              'bg-[#F4F4F4] text-[#6B7280] border-[#D1D5DB]',
  };
  const cls = styles[label] ?? 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

// ── Week coverage block ───────────────────────────────────────────────────────

function WeekBlock({ count }: { count: number }) {
  let bg: string;
  let text: string;
  let border = '';

  if (count === 0) {
    bg = 'bg-[#FBEAE6]';
    border = 'border border-[#E8B9B4]';
    text = 'text-[#A93F2F]';
  } else if (count <= 2) {
    bg = 'bg-[#F2F3F1]';
    border = 'border border-[#C8CBC6]';
    text = 'text-[#6B7280]';
  } else if (count <= 4) {
    bg = 'bg-[#9FC3AE]';
    text = 'text-white';
  } else {
    bg = 'bg-[#2F6B3F]';
    text = 'text-white';
  }

  return (
    <div className={`h-[44px] rounded ${bg} ${border} flex items-end justify-center pb-1.5`}>
      <span className={`text-[11px] font-semibold ${text}`}>{count}</span>
    </div>
  );
}

// ── Metric column ─────────────────────────────────────────────────────────────

function MetricCol({
  value,
  label,
  valueClass = 'text-foreground',
}: {
  value: string | number;
  label: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className={`font-serif text-[16px] font-semibold leading-none ${valueClass}`}>
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground leading-none">{label}</span>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TopicTabProps {
  onSelectItem: (item: ContentItem) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TopicTab({ onSelectItem }: TopicTabProps) {
  return (
    <div className="flex flex-col gap-5 pb-10">

      {/* ── Topic header ──────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start pb-4 border-b border-[#E2E4E1]">
        <div className="flex flex-col gap-1.5">
          {/* Eyebrow */}
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            ContentTopics__c
          </span>
          {/* Title + pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-[20px] font-semibold text-foreground leading-none">
              Nonprofit tech stack
            </h1>
            <StatusPill label="Active" />
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-[#FFF8E6] text-[#CC8400] border-[#FFD08A] whitespace-nowrap">
              Next step · Draft
            </span>
          </div>
          {/* Owner */}
          <span className="text-[13px] text-muted-foreground">Angela Landrith</span>
        </div>

        {/* Metrics cluster */}
        <div className="flex items-start gap-5 pt-0.5 shrink-0">
          <MetricCol value={11} label="items" />
          <MetricCol value={6}  label="articles live" />
          <MetricCol value={3}  label="videos live" />
          <MetricCol value={24} label="publications" valueClass="text-[#2F6B3F]" />
        </div>
      </div>

      {/* ── Two-column body ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_320px] gap-[14px] items-start">

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Family card */}
          <div className="rounded-lg border border-border bg-card overflow-hidden text-[14px]">
            <div className="px-4 pt-3 pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                One piece of work, and its family
              </span>
            </div>

            {/* Source article strip */}
            <div className="mx-4 mb-3 rounded-md bg-[#F2F3F1] px-3 py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <button
                  className="text-[14px] font-semibold text-foreground text-left hover:underline truncate"
                  onClick={() => {
                    const item: ContentItem = {
                      id: 'ci-011',
                      title: 'Who Can See What: Data Access in Salesforce',
                      format: 'Article',
                      topic: 'Nonprofit Tech Stack',
                      status: 'Ready for Review',
                      objective: 'Explain Salesforce sharing rules to non-technical staff',
                      createdAt: '2026-07-20T09:00:00Z',
                      updatedAt: '2026-08-13T14:00:00Z',
                    };
                    onSelectItem(item);
                  }}
                >
                  {MOCK_TOPIC_FAMILY.sourceTitle}
                </button>
                <span className="text-[12px] text-muted-foreground">
                  {MOCK_TOPIC_FAMILY.sourceWordCount.toLocaleString()} words · in {MOCK_TOPIC_FAMILY.sourceProductCount} products
                </span>
              </div>
              <StatusPill label={MOCK_TOPIC_FAMILY.sourceStatus} />
            </div>

            {/* Derivative rows */}
            <div className="pb-3 flex flex-col">
              {MOCK_TOPIC_FAMILY.derivatives.map((d) => (
                <div
                  key={d.id}
                  className="pl-[34px] pr-4 py-2 flex items-center gap-2 border-t border-[#F2F3F1]"
                >
                  <CornerDownRight className="w-3.5 h-3.5 text-[#C8CBC6] flex-shrink-0" />
                  <span className="flex-1 text-[13px] text-muted-foreground leading-snug">
                    {d.description}
                  </span>
                  {d.noDate ? (
                    <button className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground border border-border rounded-md px-2 py-1 hover:bg-muted/40 transition-colors">
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[12px] text-muted-foreground">{d.date}</span>
                      {d.status && <StatusPill label={d.status} />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 12-week coverage grid */}
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
              12-week coverage
            </span>
            <div className="grid grid-cols-12 gap-[5px]">
              {MOCK_TOPIC_WEEK_COVERAGE.map((count, i) => (
                <WeekBlock key={i} count={count} />
              ))}
            </div>
            {/* Lightbulb note strip */}
            <div className="flex items-start gap-2 mt-1 bg-[#FFF8E6] border border-[#FFD08A] rounded-md px-3 py-2">
              <Lightbulb className="w-3.5 h-3.5 text-[#CC8400] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#7A5000] leading-snug">
                Neither gap needs a new subject — both sit beside the quarter's best-performing article.
              </p>
            </div>
          </div>

          {/* Items table */}
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
              Every item on this topic
            </span>
            <div className="rounded-lg border border-border overflow-hidden text-[13px]">
              {/* Header */}
              <div className="grid grid-cols-[1.7fr_.7fr_.8fr_.9fr_.7fr] bg-[#F2F3F1] px-3 py-2 border-b border-border">
                <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-wide">Content Item</span>
                <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-wide">Format</span>
                <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-wide">Objective</span>
                <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-wide">Status</span>
                <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-wide text-right">Pubs</span>
              </div>
              {/* Rows */}
              {MOCK_TOPIC_ITEMS.map((item, i) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-[1.7fr_.7fr_.8fr_.9fr_.7fr] px-3 py-2.5 cursor-pointer hover:bg-[#F2F3F1] transition-colors items-start ${i < MOCK_TOPIC_ITEMS.length - 1 ? 'border-b border-[#F2F3F1]' : ''}`}
                  onClick={() => {
                    const ci: ContentItem = {
                      id: item.id,
                      title: item.title,
                      format: item.format as ContentItem['format'],
                      topic: 'Nonprofit Tech Stack',
                      status: item.status as ContentItem['status'],
                      objective: item.objective,
                      createdAt: '',
                      updatedAt: '',
                    };
                    onSelectItem(ci);
                  }}
                >
                  <span className="text-foreground font-medium leading-snug pr-2">{item.title}</span>
                  <span className="text-muted-foreground">{item.format}</span>
                  <span className="text-muted-foreground leading-snug pr-2 line-clamp-2">{item.objective}</span>
                  <div><StatusPill label={item.status} /></div>
                  <span className="text-right text-muted-foreground">{item.pubs}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right rail ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Penny card */}
          <ContentStudioPennyCard
            mode="Coordinator"
            message="This topic has strong article coverage but no narrative stories — learners can find the facts but can't see themselves in the content yet. I'd prioritize a short personal story next before adding another guide."
            actions={[
              'Draft a story brief',
              'Find a learner voice',
              'View similar topics',
            ]}
          />

          {/* Insight card */}
          <InsightCard
            kind="informational"
            scope="This topic"
            observation="11 items and none of them tell a story. Guides, checklists, and explainers dominate this topic. That's useful for lookup but won't move someone who's still deciding whether the tech feels accessible to them."
            readFrom={[
              'ContentTopics__c · Nonprofit tech stack',
              'Item format distribution · 11 items',
            ]}
            primaryAction={{ label: 'Add a story', onClick: () => {} }}
            secondaryAction={{ label: 'See format breakdown', onClick: () => {} }}
            pennyNote="A personal story here would be the first in this topic — it would stand out."
            onDismiss={() => {}}
          />

          {/* Balance card */}
          <div className="rounded-lg border border-border bg-card overflow-hidden text-[14px]">
            <div className="px-4 pt-3 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                70 / 20 / 10
              </span>
            </div>
            <div className="px-4 pb-4 space-y-3">
              {/* Nurturing bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[13px] font-medium text-foreground">Nurturing</span>
                  <span className="text-[12px] text-muted-foreground">7 / 11</span>
                </div>
                <div className="h-2 rounded-full bg-[#F2F3F1] overflow-hidden">
                  <div className="h-full rounded-full bg-[#2F6B3F]" style={{ width: '64%' }} />
                </div>
              </div>
              {/* Marketing bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[13px] font-medium text-foreground">Marketing</span>
                  <span className="text-[12px] text-muted-foreground">4 / 11</span>
                </div>
                <div className="h-2 rounded-full bg-[#F2F3F1] overflow-hidden">
                  <div className="h-full rounded-full bg-[#9FC3AE]" style={{ width: '36%' }} />
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground leading-snug">
                The gap is stories, not guides.
              </p>
            </div>
          </div>

          {/* Recycle candidates */}
          <div className="rounded-lg border border-border bg-card overflow-hidden text-[14px]">
            <div className="px-4 pt-3 pb-2 border-b border-[#F2F3F1]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recycle candidates
              </span>
            </div>
            <div className="divide-y divide-[#F2F3F1]">
              {MOCK_RECYCLE_CANDIDATES.map((c) => (
                <div key={c.id} className="px-4 py-2.5 flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[13px] text-foreground leading-snug font-medium truncate">
                      {c.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {c.ageDays} days old · still being read
                    </span>
                  </div>
                  <button
                    className="text-[12px] font-medium text-[#2F6F7E] hover:underline shrink-0 mt-0.5"
                    onClick={() => {
                      const ci: ContentItem = {
                        id: c.id,
                        title: c.title,
                        format: 'Article',
                        topic: 'Nonprofit Tech Stack',
                        status: 'Published',
                        createdAt: '',
                        updatedAt: '',
                      };
                      onSelectItem(ci);
                    }}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
