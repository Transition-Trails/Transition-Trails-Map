import { Brain, CheckCircle2, GitBranch, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { STATUS_CLASSES } from '@/config/statusColors';

// ── Static spec data ─────────────────────────────────────────────────────────

const IDENTITY_CARDS = [
  {
    id: 'coach',
    role: 'Coach',
    description: "Asks Penny about a learner's progress and next steps in their trail.",
    dependsOn: 'Procedure_Step__c',
    dependsPurpose: 'Knows which step to cite, not just which article',
    example: '"Penny, what step is Marcus on in the Launch phase?"',
  },
  {
    id: 'coordinator',
    role: 'Coordinator',
    description: 'Routes incoming requests to the right article domain before the query hits retrieval.',
    dependsOn: 'Category__c',
    dependsPurpose: 'Routes to the right domain article rather than the full article pool',
    example: '"Penny, is this a Career case or an HR case?"',
  },
  {
    id: 'quest-guide',
    role: 'Quest Guide',
    description: "Serves the learner-appropriate version of a procedure, not the staff-facing one.",
    dependsOn: 'Audience__c',
    dependsPurpose: 'Serves the learner-appropriate version instead of a staff-facing one',
    example: '"Penny, what should I tell my learner about submitting their resume?"',
  },
  {
    id: 'client-liaison',
    role: 'Client Liaison',
    description: 'Confirms that a step in a client-facing procedure was completed correctly.',
    dependsOn: 'Verify_Line__c',
    dependsPurpose: 'Confirms step completion; Penny can read back the exact verification line',
    example: '"Penny, did we complete the consent step for this client?"',
  },
] as const;

const TRAVERSAL_BY_IDENTITY = [
  { identity: 'Coach',          path: 'Case → Learner → Program → Article → Step' },
  { identity: 'Coordinator',    path: 'Case → Category → Article → Summary' },
  { identity: 'Quest Guide',    path: 'Quest → Stage → Article[audience=learner] → Step' },
  { identity: 'Client Liaison', path: 'Case → Article → Verify_Line__c' },
] as const;

const WONT_DO = [
  'Guess what step a learner is on without a Procedure_Step__c record',
  'Serve a learner-facing version of an article that has no Audience__c field set',
  'Confirm a step was completed when no Verify_Line__c is present',
  'Route by domain when Category__c is blank — she falls back to full-pool retrieval instead',
] as const;

// ── Sub-components ───────────────────────────────────────────────────────────

function IdentityCard({ card }: { card: typeof IDENTITY_CARDS[number] }) {
  const cls = STATUS_CLASSES.information;
  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Identity
        </p>
        <p className="text-[13px] font-bold text-foreground mt-0.5">{card.role}</p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{card.description}</p>
      </div>

      <div className={`rounded-md border px-3 py-2 space-y-0.5 ${cls.border} bg-[color:hsl(var(--brand-sky-tint))]`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Depends on
        </p>
        <p className="text-[11px] font-mono font-semibold text-[color:hsl(var(--brand-teal))]">
          {card.dependsOn}
        </p>
        <p className="text-[11px] text-muted-foreground">{card.dependsPurpose}</p>
      </div>

      <p className="text-[11px] text-muted-foreground/70 italic leading-relaxed">
        e.g. {card.example}
      </p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function KnowledgeStudioPennyRead() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Main column ────────────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 min-w-0">
        <div className="p-5 space-y-6 max-w-3xl">

          {/* Intro */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-background">
            <Brain className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] font-bold text-foreground">
                How Penny reads knowledge articles
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Penny can find and quote any published article by text similarity. What she
                cannot do without structured metadata is navigate <em>within</em> an article,
                route by domain, confirm a step, or serve the right version to the right role.
                Each of the four identities below needs exactly one field to unlock its capability.
              </p>
            </div>
          </div>

          {/* Identity cards */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
              Four Identities
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {IDENTITY_CARDS.map(card => (
                <IdentityCard key={card.id} card={card} />
              ))}
            </div>
          </section>

          {/* Worked citation example */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
              Worked Citation — Slack Answer
            </p>
            <div className="rounded-lg border border-border bg-background p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-muted-foreground">TC</span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-foreground">Trail Coordinator</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    @Penny what's step 3 of the Launch phase SOP for new coaches?
                  </p>
                </div>
              </div>

              <div className="border-l-2 border-primary/30 pl-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Brain className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">Penny</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Step 3 of the Coach Launch SOP: <strong>Schedule the 30-day check-in call</strong>.
                      Confirm availability with the coach, add the calendar invite to both parties,
                      and log the meeting ID in the Case notes.
                    </p>
                  </div>
                </div>

                {/* Citation chip */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[color:hsl(var(--brand-sky))] bg-[color:hsl(var(--brand-sky-tint))] text-[10px] font-semibold text-[color:hsl(var(--brand-teal))]">
                  <BookIcon />
                  Coach Launch SOP · Step 3 of 7
                </div>

                {/* Validation stamp */}
                <div className="flex items-center gap-1.5 text-[10px] text-[color:hsl(var(--brand-green-dark))]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Validated by J. Reyes · 14 days ago</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground/70 italic leading-relaxed">
                Without <span className="font-mono">Procedure_Step__c</span> records, Penny would quote
                a prose paragraph from the article body and would have no step number or verify line to
                include. The citation chip and validation stamp both disappear.
              </p>
            </div>
          </section>

          {/* One-hop traversal */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
              One-Hop Traversal Example
            </p>
            <div className="rounded-lg border border-border bg-background p-4 space-y-3">
              <div className="flex items-start gap-3">
                <GitBranch className="w-4 h-4 text-[color:hsl(var(--brand-teal))] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-bold text-foreground">
                    Case → Article → Step → Verify_Line__c
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    When a coordinator opens a GSC case, Penny walks one hop from the Case record to the
                    related Knowledge Article via <span className="font-mono text-[10px]">Category__c</span>,
                    then one more hop to the matching <span className="font-mono text-[10px]">Procedure_Step__c</span> child
                    record for the current stage.
                    She reads the <span className="font-mono text-[10px]">Verify_Line__c</span> field
                    and returns it as the actionable confirmation the coordinator needs — not a
                    paraphrase of the article body.
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-2 italic">
                    Each hop is a Salesforce relationship, not a text similarity search.
                    That is what makes the citation precise and the validation stamp trustworthy.
                  </p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </ScrollArea>

      {/* ── Right rail ─────────────────────────────────────────────────────── */}
      <div className="w-[240px] shrink-0 border-l border-border bg-muted/10 overflow-y-auto p-4 space-y-5">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
            Traversal by Identity
          </p>
          <div className="space-y-2">
            {TRAVERSAL_BY_IDENTITY.map(item => (
              <div key={item.identity} className="space-y-0.5">
                <p className="text-[11px] font-semibold text-foreground">{item.identity}</p>
                <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">{item.path}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
            Four things Penny will not do
          </p>
          <ul className="space-y-2">
            {WONT_DO.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <X className="w-3 h-3 text-[color:hsl(var(--brand-critical))] mt-0.5 shrink-0" />
                <span className="text-[11px] text-muted-foreground leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
            Degradation rule
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Penny degrades rather than guesses. When a required field is blank, she cites
            the <em>article</em> that is relevant, not the step she cannot confirm — and
            she tells the reader which field would unlock the precise answer.
          </p>
        </div>

      </div>
    </div>
  );
}

function BookIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
