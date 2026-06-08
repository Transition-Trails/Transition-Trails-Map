import { Database, Sparkles, Layers, ArrowRight } from 'lucide-react';

// ── Architecture moved from Trail OS Capability Map > Overview (removed) ──────
// Trail OS → Penny AI → Programs is the foundational relationship that no longer
// has a dedicated Overview tab; it lives here as the canonical reference.

const ARCH_LAYERS = [
  {
    icon: Database,
    iconCls: 'text-primary',
    bg: 'bg-primary/5 border-primary/20',
    label: 'Trail OS',
    sublabel: 'Infrastructure Layer',
    description:
      'The operational technology foundation coordinating intake, project delivery, documentation, learner-client matching, org readiness, coach visibility, and outcomes measurement across all programs.',
  },
  {
    icon: Sparkles,
    iconCls: 'text-secondary',
    bg: 'bg-secondary/5 border-secondary/20',
    label: 'Penny AI',
    sublabel: 'Intelligence Layer',
    description:
      'The AI learning and guidance layer embedded across all programs, providing personalized coaching, skill translation, and learning intelligence at every stage of the learner journey.',
  },
  {
    icon: Layers,
    iconCls: 'text-foreground/60',
    bg: 'bg-muted/40 border-border',
    label: 'Programs',
    sublabel: 'Experience Layer',
    description:
      "Explorer's Trail, Foundations Trail, Guided Trail, Trail of Mastery, and Digital Compass — the learner-facing program experiences powered by Trail OS and guided by Penny.",
  },
];

const RELATIONSHIP_ROWS = [
  { from: 'Trail OS',  rel: 'powers',    to: 'Penny AI',  note: 'Trail OS provides the data infrastructure, session records, and intake context that Penny uses to generate relevant coaching.' },
  { from: 'Penny AI',  rel: 'guides',    to: 'Programs',  note: 'Penny delivers personalised coaching, skill translation, and progress intelligence directly within each program experience.' },
  { from: 'Trail OS',  rel: 'tracks',    to: 'Programs',  note: 'Trail OS records cohort health, capacity, completion, and outcomes data for all active programs.' },
  { from: 'Programs',  rel: 'generates', to: 'Trail OS',  note: 'Program activity (intake submissions, cohort updates, alumni data) feeds back into Trail OS, closing the delivery loop.' },
  { from: 'Programs',  rel: 'trains',    to: 'Penny AI',  note: 'Learner interactions and outcome data across programs inform Penny confidence scores and coaching quality over time.' },
];

export default function KnowledgeRelationships() {
  return (
    <div className="h-full w-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Navigator</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Knowledge Relationships</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            How Trail OS, Penny AI, and Programs connect — the foundational architecture of the Transition Trails technology ecosystem.
          </p>
        </div>

        {/* Architecture strip */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Ecosystem Architecture</h2>
          <div className="flex items-stretch gap-0 rounded-xl overflow-hidden border border-border shadow-sm">
            {ARCH_LAYERS.map((layer, i) => {
              const Icon = layer.icon;
              return (
                <div key={layer.label} className={`flex-1 flex flex-col items-center text-center p-6 border-r last:border-r-0 border-border bg-white ${i === 0 ? 'rounded-l-xl' : ''} ${i === ARCH_LAYERS.length - 1 ? 'rounded-r-xl' : ''}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 border ${layer.bg}`}>
                    <Icon className={`w-6 h-6 ${layer.iconCls}`} />
                  </div>
                  <p className="font-bold text-foreground">{layer.label}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">{layer.sublabel}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{layer.description}</p>
                </div>
              );
            })}
          </div>

          {/* Flow indicators */}
          <div className="flex items-center justify-center gap-6 mt-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Database className="w-3 h-3 text-primary" />Trail OS
              <ArrowRight className="w-3 h-3 mx-0.5 text-muted-foreground/40" />
              <span className="italic text-muted-foreground/60">powers</span>
              <ArrowRight className="w-3 h-3 mx-0.5 text-muted-foreground/40" />
              <Sparkles className="w-3 h-3 text-secondary" />Penny AI
              <ArrowRight className="w-3 h-3 mx-0.5 text-muted-foreground/40" />
              <span className="italic text-muted-foreground/60">guides</span>
              <ArrowRight className="w-3 h-3 mx-0.5 text-muted-foreground/40" />
              <Layers className="w-3 h-3 text-foreground/60" />Programs
            </span>
          </div>
        </section>

        {/* Relationship table */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Relationship Map</h2>
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-[120px_90px_120px_1fr] gap-x-4 px-5 py-2.5 border-b border-border/60 bg-muted/30">
              {['From', 'Relationship', 'To', 'How'].map(h => (
                <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{h}</p>
              ))}
            </div>
            {RELATIONSHIP_ROWS.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-[120px_90px_120px_1fr] gap-x-4 items-start px-5 py-3 ${i < RELATIONSHIP_ROWS.length - 1 ? 'border-b border-border/30' : ''}`}
              >
                <p className="text-[12px] font-semibold text-foreground">{row.from}</p>
                <p className="text-[11px] italic text-muted-foreground/70">{row.rel}</p>
                <p className="text-[12px] font-semibold text-foreground">{row.to}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{row.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Future state note */}
        <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Future state —</strong> This page will be auto-generated from admin data as a live knowledge graph showing programs, RESOLVE phases, Penny capabilities, Trail OS functions, and source documents with navigable relationship edges. Planned Q3–Q4 2025.
          </p>
        </div>

      </div>
    </div>
  );
}
