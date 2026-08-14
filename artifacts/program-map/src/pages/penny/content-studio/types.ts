// ─────────────────────────────────────────────────────────────────────────────
// Content Studio — Shared TypeScript types
// All types exported from here; import from this module, never redefine locally.
// ─────────────────────────────────────────────────────────────────────────────

export type ContentStudioTab =
  | 'pipeline'
  | 'topic'
  | 'content-item'
  | 'build-with-me'
  | 'penny-desk'
  | 'trail-crew'
  | 'catalog';

export type ContentItemStatus =
  | 'Idea'
  | 'In Progress'
  | 'Ready for Review'
  | 'Ready to Publish'
  | 'Published'
  | 'Scheduled'
  | 'Validated'
  | 'Draft';

export type ContentFormat =
  | 'Article'
  | 'Video'
  | 'Podcast'
  | 'Email'
  | 'Social'
  | 'Guide'
  | 'Checklist'
  | 'Template';

export type PublicationPlatform =
  | 'YouTube'
  | 'LinkedIn'
  | 'Substack'
  | 'Website'
  | 'Instagram';

export type ProductKind = 'collection' | 'bundle' | 'variation' | 'standalone';

export type CrewSubTab = 'mine' | 'team' | 'review-queue';

export interface InsightDismissState {
  dismissed: boolean;
  reason: string;
  dismissedAt?: string;
}

// ── Content Item ──────────────────────────────────────────────────────────────

export interface SeoMeta {
  title: string;
  description: string;
  keywords: string[];
}

export interface ContentItem {
  id: string;
  title: string;
  format: ContentFormat;
  topic: string;
  status: ContentItemStatus;
  dueDate?: string;
  objective?: string;
  pillars?: string[];
  driveUrl?: string;
  length?: string;
  seoMeta?: SeoMeta;
  productIds?: string[];
  assignee?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Content Topic ─────────────────────────────────────────────────────────────

export interface TopicChild {
  id: string;
  title: string;
  kind: 'subtopic' | 'content-item';
  children?: TopicChild[];
}

export interface ContentTopic {
  id: string;
  title: string;
  description: string;
  pillar: string;
  itemCount: number;
  children: TopicChild[];
  createdAt: string;
}

// ── Content Item Publication ──────────────────────────────────────────────────

export interface ContentItemPublication {
  platform: PublicationPlatform;
  planned?: string;   // ISO date
  actual?: string;    // ISO date
  status: 'planned' | 'published' | 'skipped' | 'overdue';
  url?: string;
}

// ── Product Node ──────────────────────────────────────────────────────────────

export interface ProductNode {
  id: string;
  name: string;
  kind: ProductKind;
  price?: number;
  sku?: string;
  children?: ProductNode[];
}

// ── Insight Card props ────────────────────────────────────────────────────────

export interface InsightCardAction {
  label: string;
  onClick: () => void;
}

export interface InsightCardProps {
  kind: 'advisory' | 'informational';
  scope: string;
  observation: string;
  readFrom: string[];
  primaryAction: InsightCardAction;
  secondaryAction: InsightCardAction;
  pennyNote: string;
  onDismiss: (reason: string) => void;
}

// ── Penny Card props ──────────────────────────────────────────────────────────

export type PennyCardMode = 'Coordinator' | 'Quest Guide' | 'Coach';

export interface AiRevision {
  kind: 'applied' | 'flagged';
  text: string;
}

export interface PennyCardProps {
  mode: PennyCardMode;
  message: string;
  actions: string[];
  aiReview?: {
    revisions: AiRevision[];
  };
}

// ── Publication gap matrix cell ───────────────────────────────────────────────

export interface GapCell {
  platform: PublicationPlatform;
  week: number;        // 1–12
  weekLabel: string;   // e.g. "Aug 4"
  status: 'planned' | 'published' | 'gap' | 'overdue';
  itemTitle?: string;
}

// ── Video / Build With Me ─────────────────────────────────────────────────────

export type VideoStageStatus = 'complete' | 'in-progress' | 'pending';

export interface VideoStage {
  id: string;
  label: string;
  status: VideoStageStatus;
  narration?: string;
}

export interface VideoItem extends ContentItem {
  stages: VideoStage[];
  scriptUrl?: string;
  thumbnailUrl?: string;
}

// ── Crew task ─────────────────────────────────────────────────────────────────

export type CrewTaskStatus = 'todo' | 'in-progress' | 'done' | 'blocked';

export interface CrewTask {
  id: string;
  title: string;
  contentItemId: string;
  contentItemTitle: string;
  assignee: string;
  dueDate?: string;
  status: CrewTaskStatus;
  tab: CrewSubTab;
}
