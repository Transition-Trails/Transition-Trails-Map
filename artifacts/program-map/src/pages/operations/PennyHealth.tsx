import { ScrollArea } from '@/components/ui/scroll-area';
import { OpsHeader, StatCard, StatusDot } from '@/components/platform/PageShell';

const topQueries = [
  { query: "What's next in my trail?",             count: 23 },
  { query: 'How do I access my learning materials?', count: 18 },
  { query: 'When is my next session?',              count: 15 },
  { query: 'Can I get a refund?',                   count: 8 },
  { query: 'What does RESOLVE stand for?',          count: 7 },
  { query: 'How do I contact my facilitator?',      count: 6 },
];

const issues = [
  { type: 'Quality Flag', msg: 'Response on "refund policy" below threshold — needs review', severity: 'amber' as const },
  { type: 'Quality Flag', msg: 'Trail Quest guidance unclear for Explore phase — reprompt suggested', severity: 'amber' as const },
  { type: 'Escalation',   msg: 'Learner escalated to human support — portal access issue', severity: 'amber' as const },
  { type: 'Escalation',   msg: 'Billing dispute escalated — beyond Penny scope', severity: 'amber' as const },
  { type: 'Blocked',      msg: 'Phrase "guarantee" triggered blocked phrase rule', severity: 'red'   as const },
];

export default function PennyHealth() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <OpsHeader
        title="Penny Health"
        subtitle="Daily interaction volume, response quality, escalation rates, and blocked phrase alerts."
        integration="Agentforce AI + Penny log export via Zapier"
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Avg Daily Interactions" value="47"    sub="7-day average" />
            <StatCard label="Quality Score"          value="84/100" sub="target: 90/100" />
            <StatCard label="Escalation Rate"        value="12%"   sub="2 per day avg" />
            <StatCard label="Blocked Phrases (7d)"   value="3"     sub="triggered this week" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Top Learner Queries (7d)</h2>
              <div className="space-y-2">
                {topQueries.map((q, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                    <span className="text-[11px] font-bold text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                    <p className="flex-1 text-sm text-foreground">{q.query}</p>
                    <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">{q.count}×</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Issues Requiring Attention</h2>
              <div className="space-y-2">
                {issues.map((issue, i) => (
                  <div key={i} className={`flex gap-3 p-3 rounded-lg border ${issue.severity === 'red' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <StatusDot status={issue.severity} />
                    <div className="min-w-0">
                      <p className={`text-[11px] font-bold uppercase mb-0.5 ${issue.severity === 'red' ? 'text-red-700' : 'text-amber-700'}`}>
                        {issue.type}
                      </p>
                      <p className="text-sm text-foreground">{issue.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
