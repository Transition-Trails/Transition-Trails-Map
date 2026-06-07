import { PageShell, StatusDot } from '@/components/platform/PageShell';

const logs = [
  { time: '10:42 AM', learner: 'Avery K.',  type: 'Query',     quality: 'green' as const, msg: 'What are the steps in the RESOLVE Outline phase?' },
  { time: '10:38 AM', learner: 'Riley P.',  type: 'Query',     quality: 'green' as const, msg: 'How do I access my Trail Quest for this week?' },
  { time: '10:31 AM', learner: 'Jordan M.', type: 'Escalation',quality: 'amber' as const, msg: 'Learner requested human follow-up on billing question' },
  { time: '10:22 AM', learner: 'Drew H.',   type: 'Query',     quality: 'green' as const, msg: 'Can you summarize what Penny can help me with?' },
  { time: '10:14 AM', learner: 'Taylor R.', type: 'Flagged',   quality: 'amber' as const, msg: 'Response on refund policy was below quality threshold' },
  { time: '10:08 AM', learner: 'Casey L.',  type: 'Query',     quality: 'green' as const, msg: 'I\'m stuck on the Explore phase — can you guide me?' },
  { time: '09:55 AM', learner: 'Morgan S.', type: 'Query',     quality: 'green' as const, msg: 'Where do I find my program materials?' },
  { time: '09:47 AM', learner: 'System',    type: 'Blocked',   quality: 'red'   as const, msg: 'Phrase "guarantee results" triggered blocked phrase rule' },
  { time: '09:32 AM', learner: 'Alex F.',   type: 'Query',     quality: 'green' as const, msg: 'What\'s the difference between Evolve and Verify phases?' },
];

const typeStyle: Record<string, string> = {
  Query:      'bg-sky-50 text-sky-700 border-sky-200',
  Escalation: 'bg-amber-50 text-amber-700 border-amber-200',
  Flagged:    'bg-amber-50 text-amber-700 border-amber-200',
  Blocked:    'bg-red-50 text-red-700 border-red-200',
};

export default function PennyLogs() {
  return (
    <PageShell
      section="Penny Command Center"
      title="Logs"
      badge="prototype"
      subtitle="Real-time Penny interaction log showing queries, escalations, flags, and blocked phrase triggers."
      integration="Agentforce + Penny log export via Zapier → Google Sheets"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground">Showing today's logs — 9 interactions</p>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted border border-border rounded-md px-2 py-1">
            <StatusDot status="green" /> Live logging: Prototype
          </span>
        </div>
        {logs.map((log, i) => (
          <div key={i} className="flex gap-4 p-3 rounded-lg bg-card border border-border hover:bg-muted/20 transition-colors">
            <div className="flex-shrink-0 text-right w-16">
              <p className="text-[11px] font-mono text-muted-foreground">{log.time}</p>
            </div>
            <StatusDot status={log.quality} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[12px] font-semibold text-foreground">{log.learner}</span>
                <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded-full ${typeStyle[log.type]}`}>
                  {log.type}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground leading-snug">{log.msg}</p>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
