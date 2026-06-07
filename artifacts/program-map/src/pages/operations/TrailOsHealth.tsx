import { ScrollArea } from '@/components/ui/scroll-area';
import { OpsHeader, StatCard, StatusDot } from '@/components/platform/PageShell';
import { Badge } from '@/components/ui/badge';

const integrations = [
  { name: 'Salesforce MCP',   status: 'Not Connected', eta: 'Q3 2025', dot: 'gray' as const, note: 'Cases, leads, opportunities, contacts' },
  { name: 'GA4 via Zapier',   status: 'Not Connected', eta: 'Q3 2025', dot: 'gray' as const, note: 'Web analytics, goal tracking' },
  { name: 'Google Drive',     status: 'Not Connected', eta: 'Q3 2025', dot: 'gray' as const, note: 'Document sync, template library' },
  { name: 'Slack',            status: 'Not Connected', eta: 'Q3 2025', dot: 'gray' as const, note: 'Ops alerts, support notifications' },
  { name: 'Agentforce AI',    status: 'Not Connected', eta: 'Q4 2025', dot: 'gray' as const, note: 'Penny AI capability layer' },
  { name: 'GitHub Projects',  status: 'Not Connected', eta: 'Q4 2025', dot: 'gray' as const, note: 'Epics, features, stories backlog' },
];

const kbStats = [
  { label: 'Source Documents',      value: '14' },
  { label: 'RESOLVE Phases',        value: '7' },
  { label: 'Active Programs',       value: '5' },
  { label: 'Penny Capabilities',    value: '7' },
  { label: 'Trail OS Capabilities', value: '7' },
];

export default function TrailOsHealth() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <OpsHeader
        title="Trail OS Health"
        subtitle="Overall system status, integration readiness, and knowledge base metrics."
        integration="All integrations — future connections listed below"
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="System Status"    value="Operational" sub="Running in prototype mode" />
            <StatCard label="Live Integrations" value="0"           sub="All connections future state" />
            <StatCard label="KB Items"         value="40"           sub="Across all entity types" />
            <StatCard label="Last Updated"     value="Today"        sub="Admin knowledge base" />
          </div>

          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-1">
              <StatusDot status="green" />
              <span className="text-sm font-semibold text-foreground">Trail OS is operational in prototype mode</span>
            </div>
            <p className="text-xs text-muted-foreground">
              All navigation, knowledge brief, admin management, and RESOLVE framework features are active.
              Live data integrations are planned for Q3–Q4 2025. No production data flows yet.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Integration Readiness</h2>
              <div className="space-y-2">
                {integrations.map(int => (
                  <div key={int.name} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                    <StatusDot status={int.dot} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{int.name}</p>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground flex-shrink-0">{int.eta}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{int.note}</p>
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground flex-shrink-0">Not Connected</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Knowledge Base Stats</h2>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {kbStats.map((s, i) => (
                  <div key={s.label} className={`flex justify-between items-center px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                    <span className="text-sm font-bold font-serif text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 rounded-xl border border-border bg-card">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Build Governance</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Trail OS uses a source-of-truth confidence model. All knowledge items carry a confidence status
                  (Confirmed / Needs Review / Draft / Deprecated). Admin edits update in-session state.
                  Persistent storage will be connected in a future sprint.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
