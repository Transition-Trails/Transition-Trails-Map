import { BookOpen, FileText, Brain, CheckCircle2, Thermometer, HelpCircle, Eye } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import { KnowledgeStudioOverview } from './KnowledgeStudioOverview';
import { KnowledgeStudioPennyRead } from './KnowledgeStudioPennyRead';

// ── Placeholder panel for tabs not yet built ─────────────────────────────────

function ComingSoonPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-8">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
        <BookOpen className="w-5 h-5 text-muted-foreground/50" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-[320px] leading-relaxed">{description}</p>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 border border-dashed border-border px-3 py-1 rounded-full">
        Coming in next sprint
      </span>
    </div>
  );
}

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
    content: (
      <ComingSoonPanel
        title="Article Editor"
        description="Author structured articles with step records, audience flags, and verify lines. Wires directly to Salesforce Knowledge on publish."
      />
    ),
  },
  {
    id: 'penny-review',
    label: "Penny's Review",
    path: '/knowledge/studio/penny-review',
    icon: Brain,
    content: (
      <ComingSoonPanel
        title="Penny's Review"
        description="Penny reads the draft and flags required findings — gaps in steps, missing audience fields, or verify lines that don't match the article body. Required findings block approval; suggestions never do."
      />
    ),
  },
  {
    id: 'approval',
    label: 'Approval',
    path: '/knowledge/studio/approval',
    icon: CheckCircle2,
    content: (
      <ComingSoonPanel
        title="Approval"
        description="Knowledge Managers review Penny's findings, clear required blocks, and publish the article. One person categorizes, links, and publishes in a single act."
      />
    ),
  },
  // ── Separator inserted after 'approval' ─────────────────────────────────
  // ── Keeping-it-true group (tabs 5–7) ────────────────────────────────────
  {
    id: 'freshness',
    label: 'Freshness',
    path: '/knowledge/studio/freshness',
    icon: Thermometer,
    content: (
      <ComingSoonPanel
        title="Freshness Tracker"
        description="Track validation stamps, overdue review cycles, and step-level stale signals. Penny degrades on stale steps — this tab shows exactly which articles and steps are at risk."
      />
    ),
  },
  {
    id: 'in-app-help',
    label: 'In-app Help',
    path: '/knowledge/studio/in-app-help',
    icon: HelpCircle,
    content: (
      <ComingSoonPanel
        title="In-app Help"
        description="Map knowledge articles to the pages and panels where they surface as contextual help. Controls which article HelpPanel shows when staff click the ? icon on any screen."
      />
    ),
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
