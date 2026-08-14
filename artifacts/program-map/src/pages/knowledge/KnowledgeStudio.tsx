import { BookOpen, FileText, Brain, CheckCircle2, Thermometer, HelpCircle, Eye } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import { KnowledgeStudioOverview } from './KnowledgeStudioOverview';
import { KnowledgeStudioPennyRead } from './KnowledgeStudioPennyRead';
import KnowledgeStudioArticle from './KnowledgeStudioArticle';
import KnowledgeStudioReview from './KnowledgeStudioReview';
import KnowledgeStudioApproval from './KnowledgeStudioApproval';
import KnowledgeStudioFreshness from './KnowledgeStudioFreshness';
import KnowledgeStudioHelpMap from './KnowledgeStudioHelpMap';

// ── Knowledge Studio hub ─────────────────────────────────────────────────────

const TABS = [
  // ── Authoring group (tabs 1–4) ───────────────────────────────────────────
  {
    id: 'overview',
    label: 'Overview',
    path: '/knowledge/studio',
    icon: BookOpen,
    content: <KnowledgeStudioOverview />,
  },
  {
    id: 'article',
    label: 'Article',
    path: '/knowledge/studio/article',
    icon: FileText,
    content: <KnowledgeStudioArticle />,
  },
  {
    id: 'penny-review',
    label: "Penny's Review",
    path: '/knowledge/studio/penny-review',
    icon: Brain,
    content: <KnowledgeStudioReview />,
  },
  {
    id: 'approval',
    label: 'Approval',
    path: '/knowledge/studio/approval',
    icon: CheckCircle2,
    content: <KnowledgeStudioApproval />,
  },
  // ── Separator inserted after 'approval' ─────────────────────────────────
  // ── Keeping-it-true group (tabs 5–7) ────────────────────────────────────
  {
    id: 'freshness',
    label: 'Freshness',
    path: '/knowledge/studio/freshness',
    icon: Thermometer,
    content: <KnowledgeStudioFreshness />,
  },
  {
    id: 'in-app-help',
    label: 'In-app Help',
    path: '/knowledge/studio/in-app-help',
    icon: HelpCircle,
    content: <KnowledgeStudioHelpMap />,
  },
  {
    id: 'pennys-read',
    label: "Penny's Read",
    path: '/knowledge/studio/pennys-read',
    icon: Eye,
    content: <KnowledgeStudioPennyRead />,
  },
];

export default function KnowledgeStudio() {
  return (
    <HubShell
      title="Knowledge Studio"
      icon={BookOpen}
      badge="· Knowledge"
      description="Author, validate, and publish structured knowledge for Penny and staff"
      tabs={TABS}
      separatorAfter="approval"
    />
  );
}
