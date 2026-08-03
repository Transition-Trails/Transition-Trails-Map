import { Database, Sparkles, Layers, ArrowRight, Plus, Hash } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';

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
    label: `${TERMS.aiAssistant} AI`,
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
      `Explorer's Trail, Foundations Trail, Guided Trail, Trail of Mastery, and Digital Compass — the learner-facing program experiences powered by Trail OS and guided by ${TERMS.aiAssistant}.`,
  },
];

const RELATIONSHIP_ROWS = [
  { from: 'Trail OS',  rel: 'powers',    to: `${TERMS.aiAssistant} AI`,  note: `Trail OS provides the data infrastructure, session records, and intake context that ${TERMS.aiAssistant} uses to generate relevant coaching.` },
  { from: `${TERMS.aiAssistant} AI`,  rel: 'guides',    to: 'Programs',  note: `${TERMS.aiAssistant} delivers personalised coaching, skill translation, and progress intelligence directly within each program experience.` },
  { from: 'Trail OS',  rel: 'tracks',    to: 'Programs',  note: 'Trail OS records cohort health, capacity, completion, and outcomes data for all active programs.' },
  { from: 'Programs',  rel: 'generates', to: 'Trail OS',  note: 'Program activity (intake submissions, cohort updates, alumni data) feeds back into Trail OS, closing the delivery loop.' },
  { from: 'Programs',  rel: 'trains',    to: `${TERMS.aiAssistant} AI`,  note: `Learner interactions and outcome data across programs inform ${TERMS.aiAssistant} confidence scores and coaching quality over time.` },
];

export default function KnowledgeRelationships() {
  const { openActionPanel, openSlackPanel } = useAppContext();

  function handleAddRelationship() {
    openActionPanel({
      title: 'Add Knowledge Relationship', objectType: 'Knowledge Relationship',
      subtitle: `Document a new connection between two Trail OS objects. Powers the Digital Twin and ${TERMS.aiAssistant}'s contextual awareness.`,
      ownerHint: 'Who is responsible for maintaining this relationship definition?',
      fields: [
        { id: 'fromObject',   label: 'From Object',          type: 'text',     required: true, placeholder: 'e.g. Program, Penny Capability, Role' },
        { id: 'relationship', label: 'Relationship',          type: 'select',   options: ['powers', 'guides', 'uses', 'maps to', 'validates', 'references', 'owned by', 'part of', 'triggers', 'generates'], required: true },
        { id: 'toObject',     label: 'To Object',             type: 'text',     required: true, placeholder: 'e.g. Knowledge Source, Penny Capability, Standard' },
        { id: 'how',          label: 'How It Works',          type: 'textarea', placeholder: 'Describe the mechanism: how does this relationship operate?', rows: 3 },
        { id: 'dataFlow',     label: 'Data / Signal Flow',    type: 'textarea', placeholder: 'What data or signals flow between these objects?', rows: 2 },
      ],
    });
  }

  return (
    <div className="h-full w-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold  text-muted-foreground/60 mb-1">Navigator</p>
            <h1 className="text-3xl font-bold text-foreground">Knowledge Relationships</h1>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              How Trail OS, {TERMS.aiAssistant} AI, and Programs connect — the foundational architecture of the Transition Trails technology ecosystem.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <button
              onClick={() => openSlackPanel({ context: 'digital-twin', title: 'Knowledge Relationships', subtitle: 'Digital Twin and Knowledge Relationships context in Slack.' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] font-bold border border-[#4A154B]/20 bg-[#4A154B]/5 text-[#4A154B] hover:bg-[#4A154B]/10 transition-colors"
              title="Open Slack context"
            >
              <Hash className="w-3.5 h-3.5" />
              Slack
            </button>
            <button
              onClick={handleAddRelationship}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[14px] font-bold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Relationship
            </button>
          </div>
        </div>

        {/* Architecture strip */}
        <section>
          <h2 className="text-sm font-bold  text-muted-foreground/60 mb-4">Ecosystem Architecture</h2>
          <div className="flex items-stretch gap-0 rounded-xl overflow-hidden border border-border shadow-sm">
            {ARCH_LAYERS.map((layer, i) => {
              const Icon = layer.icon;
              return (
                <div key={layer.label} className={`flex-1 flex flex-col items-center text-center p-6 border-r last:border-r-0 border-border bg-white ${i === 0 ? 'rounded-l-xl' : ''} ${i === ARCH_LAYERS.length - 1 ? 'rounded-r-xl' : ''}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 border ${layer.bg}`}>
                    <Icon className={`w-6 h-6 ${layer.iconCls}`} />
                  </div>
                  <p className="font-bold text-foreground">{layer.label}</p>
                  <p className="text-[14px] font-semibold  text-muted-foreground/60 mb-3">{layer.sublabel}</p>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">{layer.description}</p>
                </div>
              );
            })}
          </div>

          {/* Flow indicators */}
          <div className="flex items-center justify-center gap-6 mt-4 text-[14px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Database className="w-3 h-3 text-primary" />Trail OS
              <ArrowRight className="w-3 h-3 mx-0.5 text-muted-foreground/40" />
              <span className="italic text-muted-foreground/60">powers</span>
              <ArrowRight className="w-3 h-3 mx-0.5 text-muted-foreground/40" />
              <Sparkles className="w-3 h-3 text-secondary" />{TERMS.aiAssistant} AI
              <ArrowRight className="w-3 h-3 mx-0.5 text-muted-foreground/40" />
              <span className="italic text-muted-foreground/60">guides</span>
              <ArrowRight className="w-3 h-3 mx-0.5 text-muted-foreground/40" />
              <Layers className="w-3 h-3 text-foreground/60" />Programs
            </span>
          </div>
        </section>

        {/* Relationship table */}
        <section>
          <h2 className="text-sm font-bold  text-muted-foreground/60 mb-4">Relationship Map</h2>
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-[120px_90px_120px_1fr] gap-x-4 px-5 py-2.5 border-b border-border/60 bg-muted/30">
              {['From', 'Relationship', 'To', 'How'].map(h => (
                <p key={h} className="text-[14px] font-bold  text-muted-foreground/60">{h}</p>
              ))}
            </div>
            {RELATIONSHIP_ROWS.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-[120px_90px_120px_1fr] gap-x-4 items-start px-5 py-3 ${i < RELATIONSHIP_ROWS.length - 1 ? 'border-b border-border/30' : ''}`}
              >
                <p className="text-[14px] font-semibold text-foreground">{row.from}</p>
                <p className="text-[14px] italic text-muted-foreground/70">{row.rel}</p>
                <p className="text-[14px] font-semibold text-foreground">{row.to}</p>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{row.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Future state note */}
        <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4">
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            <strong>Future state —</strong> This page will be auto-generated from admin data as a live knowledge graph showing programs, RESOLVE phases, Penny capabilities, Trail OS functions, and source documents with navigable relationship edges. Planned Q3–Q4 2025.
          </p>
        </div>

      </div>
    </div>
  );
}
