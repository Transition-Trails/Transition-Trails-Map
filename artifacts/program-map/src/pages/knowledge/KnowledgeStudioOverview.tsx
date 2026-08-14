import { AlertTriangle, CheckCircle2, BookOpen, BarChart2, Info } from 'lucide-react';
import type { ComponentType } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { STATUS_CLASSES } from '@/config/statusColors';
import type { StatusRole } from '@/config/statusColors';

// ── Types ────────────────────────────────────────────────────────────────────

interface StatCard {
  id: string;
  label: string;
  value: string | null;   // null renders as em-dash
  sub: string;
  role: StatusRole;
  icon: ComponentType<{ className?: string }>;
  criticalNote?: string;
  dashed?: boolean;
}

// ── Static spec data ─────────────────────────────────────────────────────────

const STAT_CARDS: StatCard[] = [
  {
    id: 'published',
    label: 'Published',
    value: '9',
    sub: 'articles live in Salesforce',
    role: 'success',
    icon: BookOpen,
  },
  {
    id: 'categorized',
    label: 'Categorized',
    value: '0',
    sub: 'of 9 have a category assigned',
    role: 'critical',
    icon: AlertTriangle,
    criticalNote: 'Critical',
  },
  {
    id: 'validated',
    label: 'Validated',
    value: '1',
    sub: 'article confirmed accurate since creation',
    role: 'attention',
    icon: CheckCircle2,
  },
  {
    id: 'used',
    label: 'Used',
    value: null,
    sub: 'No citation tracking yet',
    role: 'neutral',
    icon: BarChart2,
    dashed: true,
  },
];

const FINDINGS = [
  {
    id: 'f1',
    label: 'No category assignments',
    finding: 'Penny returns articles from all domains equally regardless of query type.',
    impact: 'A coach asking about compensation gets the same result pool as a quest guide asking about onboarding.',
  },
  {
    id: 'f2',
    label: 'One validation stamp exists',
    finding: 'Most articles have never been confirmed accurate since creation.',
    impact: 'Penny has no signal about whether the article is still true, so she cannot flag stale content to the reader.',
  },
  {
    id: 'f3',
    label: 'No procedure steps',
    finding: 'Articles describe processes as prose; Penny cannot verify or cite individual steps.',
    impact: 'When a staff member asks "what step do I do next?", Penny quotes a paragraph, not a step — and cannot confirm the action was completed.',
  },
  {
    id: 'f4',
    label: 'No audience segmentation',
    finding: 'The same article is served to coaches, quest guides, and client liaisons.',
    impact: 'Three audiences receive instructions written for one of them. Two get the wrong level of detail.',
  },
  {
    id: 'f5',
    label: 'No usage signal',
    finding: 'We do not know which articles Penny relies on most or which are never cited.',
    impact: 'Maintenance effort is distributed randomly. High-traffic SOPs with stale steps go undetected.',
  },
];

const THREE_MOVES = [
  {
    step: '1',
    action: 'Categorize all 9 articles',
    result: "Penny's retrieval improves immediately — she routes by domain before selecting a record.",
    effort: '~2 hrs',
  },
  {
    step: '2',
    action: 'Add structured steps to the 3 highest-traffic SOPs',
    result: 'Penny can cite a step, not just a summary. Readers get a verify line they can act on.',
    effort: '~1 day',
  },
  {
    step: '3',
    action: 'Set audience on each article',
    result: "Staff receive the version written for their role. Penny's confidence score rises because fewer irrelevant records enter retrieval.",
    effort: '~1 hr',
  },
];

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCardTile({ card }: { card: StatCard }) {
  const cls = STATUS_CLASSES[card.role];
  const Icon = card.icon;

  return (
    <div
      className={`rounded-lg border p-4 flex flex-col gap-2 bg-background ${
        card.dashed
          ? 'border-dashed border-border'
          : cls.border
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${cls.icon}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {card.label}
        </span>
        {card.criticalNote && (
          <span className={`ml-auto text-[10px] font-bold uppercase tracking-wide ${cls.text}`}>
            {card.criticalNote}
          </span>
        )}
      </div>
      {card.value !== null ? (
        <span className={`text-xl font-bold ${cls.text}`}>{card.value}</span>
      ) : (
        <span className="text-xl font-bold text-muted-foreground/40">—</span>
      )}
      <span className="text-[11px] text-muted-foreground">{card.sub}</span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function KnowledgeStudioOverview() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Main column ────────────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 min-w-0">
        <div className="p-5 space-y-6 max-w-3xl">

          {/* Advisory strip */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-[color:hsl(var(--brand-amber-medium))] bg-[color:hsl(var(--brand-amber-light))]">
            <AlertTriangle className="w-4 h-4 text-[color:hsl(var(--brand-amber-dark))] mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] font-bold text-[color:hsl(var(--brand-amber-dark))]">
                Knowledge is incomplete for structured retrieval
              </p>
              <p className="text-[11px] text-[color:hsl(var(--brand-amber-dark))]/80 mt-0.5 leading-relaxed">
                9 articles are published but none have categories, audience flags, or step records.
                Penny can find and quote these articles, but she cannot navigate within them, confirm steps,
                or route by role — three capabilities that require structured metadata.
              </p>
            </div>
          </div>

          {/* Stat cards */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
              Current State
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STAT_CARDS.map(card => (
                <StatCardTile key={card.id} card={card} />
              ))}
            </div>
          </section>

          {/* Findings */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
              Findings
            </p>
            <div className="space-y-2">
              {FINDINGS.map((f, idx) => (
                <div
                  key={f.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-foreground">{f.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{f.finding}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1 italic leading-relaxed">
                        Impact: {f.impact}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Three-move sequence */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
              Penny's Three-Move Recommendation
            </p>
            <div className="space-y-2">
              {THREE_MOVES.map(move => (
                <div
                  key={move.step}
                  className="rounded-lg border border-border bg-background p-4 flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0 mt-0.5">
                    {move.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-foreground">{move.action}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{move.result}</p>
                  </div>
                  <div className="shrink-0">
                    <span className="text-[10px] font-semibold text-muted-foreground/60 bg-muted/40 px-2 py-0.5 rounded-full">
                      {move.effort}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </ScrollArea>

      {/* ── Right rail ─────────────────────────────────────────────────────── */}
      <div className="w-[240px] shrink-0 border-l border-border bg-muted/10 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
            Schema Note
          </p>
          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-[color:hsl(var(--brand-teal))] mt-0.5 shrink-0" />
              <p className="text-[11px] font-semibold text-foreground">Fields exist. Usage doesn't.</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The SOP record type in Salesforce already carries fields for steps, audience, and
              verification lines. The gap is that articles are authored as prose and the fields
              are left blank — not that the schema needs to change.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The Article tab in this Studio is where staff fill those fields in a form that maps
              directly to the SF object, so nothing gets lost between authoring and publishing.
            </p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
            What Penny needs
          </p>
          <ul className="space-y-1.5">
            {[
              { field: 'Category__c',       purpose: 'Domain routing' },
              { field: 'Audience__c',       purpose: 'Role-appropriate version' },
              { field: 'Procedure_Step__c', purpose: 'Step-level citation' },
              { field: 'Verify_Line__c',    purpose: 'Completion confirmation' },
              { field: 'Validated_By__c',   purpose: 'Freshness signal' },
            ].map(item => (
              <li key={item.field} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground">{item.field}</span>
                  <span className="text-[10px] text-muted-foreground/60 block">{item.purpose}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
