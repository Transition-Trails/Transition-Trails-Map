import { PageShell } from '@/components/platform/PageShell';

const milestones = [
  { quarter: 'Q2 2025', label: 'Now',    items: ['Trail OS shell launch', 'Admin knowledge base', 'Penny v1 (prototype)', 'RESOLVE framework mapping'], done: true },
  { quarter: 'Q3 2025', label: 'Next',   items: ['Salesforce MCP connection', 'GA4 integration', 'Google Drive sync', 'Slack ops alerts', 'Live Demand Management'], done: false },
  { quarter: 'Q4 2025', label: 'Later',  items: ['Agentforce / Penny production', 'GitHub Projects sync', 'Response quality automation', 'Learner portal v1'], done: false },
  { quarter: 'Q1 2026', label: 'Future', items: ['Full automation health dashboard', 'External change request portal', 'Advanced analytics', 'Trail OS v2 planning'], done: false },
];

export default function Roadmap() {
  return (
    <PageShell
      section="Demand Management"
      title="Roadmap"
      badge="prototype"
      subtitle="High-level delivery timeline for Trail OS features and integrations. Subject to revision based on capacity and priority."
      integration="GitHub Projects (future)"
    >
      <div className="space-y-6 max-w-3xl">
        {milestones.map((m, i) => (
          <div key={m.quarter} className="flex gap-6">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
                m.done ? 'bg-primary text-primary-foreground' : 'bg-muted border-2 border-border text-muted-foreground'
              }`}>
                {m.done ? '✓' : i + 1}
              </div>
              {i < milestones.length - 1 && (
                <div className={`w-0.5 flex-1 mt-2 ${m.done ? 'bg-primary/30' : 'bg-border'}`} />
              )}
            </div>
            <div className="pb-8 flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <h3 className="text-sm font-bold text-foreground">{m.quarter}</h3>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${m.done ? 'text-primary' : 'text-muted-foreground'}`}>
                  {m.label}
                </span>
              </div>
              <ul className="space-y-1.5">
                {m.items.map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.done ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
