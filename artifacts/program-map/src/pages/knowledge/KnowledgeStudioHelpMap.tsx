/**
 * KnowledgeStudioHelpMap — "In-app Help" tab
 *
 * Surfaces the audience access problem with a critical banner,
 * shows how the HelpPanel filter SHOULD work, explains the three
 * audience buckets, and reproduces the 400px HelpPanel shell
 * so writers can see exactly what coaches / learners will see.
 */

import { useState } from 'react';
import {
  HelpCircle, AlertTriangle, CheckCircle2, BookOpen, Info,
  Users, Tag, Monitor, Sparkles, Flag, ChevronRight,
  Eye, FileText, Search, X, ArrowRight,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { STATUS_CLASSES } from '@/config/statusColors';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AudienceSpec {
  id: string;
  label: string;
  description: string;
  dataCategoryGroup: string;
  dataCategory: string;
  exampleArticles: string[];
  filterClause: string;
  role: 'success' | 'information' | 'attention';
}

// ── Audience specs ────────────────────────────────────────────────────────────

const AUDIENCES: AudienceSpec[] = [
  {
    id: 'coach',
    label: 'Coach',
    description: 'Coaching guides, escalation procedures, and learner progress protocols. Staff-authored, never shown to learners.',
    dataCategoryGroup: 'Audience',
    dataCategory: 'Coach',
    exampleArticles: [
      'Coaching Conversation Protocol — Struggling Learner',
      'How to escalate a case to the Program Manager',
      'Sprint 3 review checklist for cohort leads',
    ],
    filterClause: "Audience__c = 'Coach'",
    role: 'information',
  },
  {
    id: 'learner',
    label: 'Learner',
    description: 'Step-by-step Salesforce procedures and platform how-tos. Written for learners who are completing tasks in Trail OS or Salesforce.',
    dataCategoryGroup: 'Audience',
    dataCategory: 'Learner',
    exampleArticles: [
      'How to submit your resume for coach review',
      'Salesforce Admin Exam — creating your first object',
      'Trail OS: updating your profile and contact details',
    ],
    filterClause: "Audience__c = 'Learner'",
    role: 'success',
  },
  {
    id: 'volunteer',
    label: 'Volunteer',
    description: 'Orientation guides and task references for volunteers supporting program delivery. Separate from staff and learner content.',
    dataCategoryGroup: 'Audience',
    dataCategory: 'Volunteer',
    exampleArticles: [
      'Volunteer orientation: what you can see in Trail OS',
      'How to log your volunteer hours in Salesforce',
      'Office Hours facilitation guide',
    ],
    filterClause: "Audience__c = 'Volunteer'",
    role: 'attention',
  },
];

// ── Filter explanation pills ──────────────────────────────────────────────────

const FILTER_DIMENSIONS = [
  {
    icon: Tag,
    label: 'Data category',
    example: 'Topics > Salesforce Platform',
    note: 'Groups articles by domain (Salesforce Platform, Program Model, Career, etc.)',
  },
  {
    icon: Users,
    label: 'Audience',
    example: 'Audience > Learner',
    note: 'Audience__c picklist on the article — Coach, Learner, or Volunteer',
  },
  {
    icon: Monitor,
    label: 'Screen sub-category',
    example: 'Screen > Object Manager',
    note: 'Future: maps articles to specific pages so the panel auto-filters by current URL',
  },
];

// ── Mini HelpPanel mock ───────────────────────────────────────────────────────

const MOCK_ARTICLES = [
  { id: '1', title: 'How to submit your resume for coach review', summary: 'Step-by-step guide for uploading and tagging your resume in Trail OS.', visited: false },
  { id: '2', title: 'Salesforce Admin Exam — creating your first object', summary: 'Screenshots and verify lines for creating a Custom Object in Spring \'25.', visited: true },
  { id: '3', title: 'Trail OS: updating your profile and contact details', summary: null, visited: false },
];

function MiniHelpPanel({ audience }: { audience: 'coach' | 'learner' | 'volunteer' }) {
  const [selected, setSelected]   = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const spec = AUDIENCES.find(a => a.id === audience)!;

  const filtered = MOCK_ARTICLES.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-[380px] h-[520px] rounded-lg border border-border bg-card shadow-xl flex flex-col overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground leading-none">Help Guide</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {audience === 'learner' ? 'Learner' : audience === 'coach' ? 'Coach' : 'Volunteer'} articles
              </p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/30">
            <X className="w-4 h-4" />
          </div>
        </div>

        {/* Scope chips */}
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUS_CLASSES.information.badge}`}>
            <Tag className="w-2 h-2" /> {spec.dataCategory}
          </span>
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUS_CLASSES.success.badge}`}>
            <Users className="w-2 h-2" /> Audience: {spec.label}
          </span>
        </div>

        {!selected && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search articles…"
                className="w-full h-8 pl-8 pr-3 text-[13px] bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      {selected ? (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/20">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ← All articles
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <h2 className="text-[14px] font-semibold text-foreground leading-snug">
              {MOCK_ARTICLES.find(a => a.id === selected)?.title}
            </h2>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {MOCK_ARTICLES.find(a => a.id === selected)?.summary ?? 'Article body will appear here.'}
            </p>
            {/* One-tap report row */}
            <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 flex items-center gap-2">
              <Flag className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground flex-1">Step not matching your screen?</p>
              <button className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors">
                Tell us
              </button>
            </div>
          </div>
          {/* Penny band */}
          <div className="flex-shrink-0 border-t border-border/50 px-4 py-2.5 flex items-center gap-2 bg-primary/5">
            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <p className="text-[11px] text-primary font-medium">Ask Penny about this step</p>
            <ArrowRight className="w-3 h-3 text-primary ml-auto" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Count bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/20">
            <span className="text-[12px] text-muted-foreground">
              {filtered.length} article{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Article list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map(article => (
              <button
                key={article.id}
                onClick={() => setSelected(article.id)}
                className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0 group"
              >
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
                    article.visited ? 'bg-[#E6F0EA]' : 'bg-primary/8'
                  }`}>
                    {article.visited
                      ? <Eye className="w-3 h-3 text-[#2F6B3F]" />
                      : <FileText className="w-3 h-3 text-primary/60" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium leading-snug ${
                      article.visited ? 'text-muted-foreground' : 'text-foreground'
                    }`}>{article.title}</p>
                    {article.summary && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{article.summary}</p>
                    )}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
          {/* Penny band */}
          <div className="flex-shrink-0 border-t border-border/50 px-4 py-2.5 flex items-center gap-2 bg-primary/5">
            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <p className="text-[11px] text-primary font-medium">Penny can answer questions about any article</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AudienceCard ──────────────────────────────────────────────────────────────

function AudienceCard({ spec }: { spec: AudienceSpec }) {
  const cls = STATUS_CLASSES[spec.role];
  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls.badge}`}>
          <Users className="w-2.5 h-2.5" /> {spec.label}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{spec.description}</p>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
          Example articles
        </p>
        <ul className="space-y-1">
          {spec.exampleArticles.map(a => (
            <li key={a} className="flex items-start gap-1.5 text-[11px] text-foreground">
              <FileText className="w-3 h-3 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
              {a}
            </li>
          ))}
        </ul>
      </div>
      <div className={`rounded-md border px-3 py-2 ${cls.border} bg-muted/10`}>
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-0.5">
          SOQL filter applied
        </p>
        <code className="text-[11px] font-mono text-foreground">{spec.filterClause}</code>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KnowledgeStudioHelpMap() {
  const [previewAudience, setPreviewAudience] = useState<'coach' | 'learner' | 'volunteer'>('learner');

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-8 max-w-5xl">

        {/* ── Critical banner ── */}
        <div className={`rounded-lg border-l-4 border-[#A93F2F] bg-[#FBEAE6]/60 px-4 py-3.5 flex items-start gap-3`}>
          <AlertTriangle className="w-5 h-5 text-[#A93F2F] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#A93F2F] leading-snug">
              Coaches, learners, and volunteers cannot open any article today
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              <code className="text-[10px] bg-muted/60 px-1 rounded">GET /api/knowledge/sf-articles</code> was
              behind the global staff auth gate, blocking every non-staff session with 403.
              This has been fixed: the endpoint now accepts coach, learner, and volunteer sessions and
              applies audience-based SOQL filtering (<code className="text-[10px] bg-muted/60 px-1 rounded">Audience__c</code>)
              so each audience sees only their articles.
            </p>
            <p className="mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F]" />
              <span className="text-[11px] font-medium text-[#2F6B3F]">
                Fixed in this build — audience access is now live
              </span>
            </p>
          </div>
        </div>

        {/* ── How the filter should work ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-muted-foreground/50" />
            <h2 className="text-[13px] font-bold text-foreground">How the filter should work</h2>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The HelpPanel uses three dimensions to decide which articles to surface. Only the first
            two are wired today; screen sub-category is planned for a future sprint.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {FILTER_DIMENSIONS.map((dim, i) => {
              const Icon = dim.icon;
              const isWired = i < 2;
              return (
                <div key={dim.label} className={`rounded-lg border p-3.5 space-y-2 ${
                  isWired ? 'border-border bg-background' : 'border-dashed border-border bg-muted/10'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                      isWired ? 'bg-primary/10' : 'bg-muted/40'
                    }`}>
                      <Icon className={`w-3.5 h-3.5 ${isWired ? 'text-primary' : 'text-muted-foreground/40'}`} />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">{dim.label}</p>
                      {!isWired && (
                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider">
                          Future sprint
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">{dim.example}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{dim.note}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Three audiences, three articles ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground/50" />
            <h2 className="text-[13px] font-bold text-foreground">Three audiences, three article sets</h2>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Every article has an <code className="text-[10px] bg-muted/60 px-1 rounded">Audience__c</code> picklist value.
            The Help panel filters to the caller's audience automatically — a learner never sees a coaching escalation guide,
            and a coach never sees a learner procedure that was written for a different reading level.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {AUDIENCES.map(spec => <AudienceCard key={spec.id} spec={spec} />)}
          </div>
        </div>

        {/* ── Live panel preview ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground/50" />
            <h2 className="text-[13px] font-bold text-foreground">Panel preview — what each audience sees</h2>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Switch audience to see the scoped scope chips, filtered article count, Penny band,
            and the one-tap "Step not matching your screen?" report row in the article detail view.
          </p>

          {/* Audience toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Preview as:</span>
            <div className="flex items-center border rounded-md overflow-hidden">
              {(['learner', 'coach', 'volunteer'] as const).map(a => (
                <button
                  key={a}
                  onClick={() => setPreviewAudience(a)}
                  className={`text-[11px] font-semibold px-3 py-1.5 capitalize transition-colors ${
                    previewAudience === a
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <MiniHelpPanel audience={previewAudience} />

            {/* Annotation column */}
            <div className="flex-1 space-y-3 min-w-0">
              <div className="rounded-lg border border-border bg-background p-4 space-y-2">
                <p className="text-[12px] font-bold text-foreground">Scope chips (header)</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Two chips: <strong>data category</strong> (topic) and <strong>audience</strong> (who).
                  A third chip for "current screen" will appear in a future sprint once articles
                  are mapped to URL patterns.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4 space-y-2">
                <p className="text-[12px] font-bold text-foreground">Filtered count</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Shows only the article count after audience filtering. A learner never
                  knows there are 47 coaching-only articles they cannot see.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4 space-y-2">
                <p className="text-[12px] font-bold text-foreground">One-tap report row</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  In the article detail view, the "Step not matching your screen?" row sends
                  a signal to the Freshness tab with no form. The reader's current URL is
                  included automatically as context.
                </p>
              </div>
              <div className={`rounded-lg border px-4 py-3 space-y-1 ${STATUS_CLASSES.information.border} bg-[#EDF5F8]/40`}>
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#2F6F7E]" />
                  <p className="text-[11px] font-semibold text-[#2F6F7E]">Same article, three reading levels</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  The procedure for "submitting a resume" exists three times — once for learners
                  (first-person, step-by-step), once for coaches (what to expect, what to flag),
                  and once for volunteers (read-only context). All three share the same title root
                  but different <code className="text-[10px] bg-muted/60 px-1 rounded">Audience__c</code> values.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
