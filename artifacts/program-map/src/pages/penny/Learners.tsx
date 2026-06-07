import { PageShell, StatusDot } from '@/components/platform/PageShell';

const learners = [
  { name: 'Jordan M.',    program: "Explorer's Trail",   status: 'Active',    progress: 68, lastActive: 'Today',      quest: 'Explore Phase' },
  { name: 'Taylor R.',    program: 'Foundations Trail',  status: 'Active',    progress: 42, lastActive: 'Yesterday',  quest: 'Recognize Phase' },
  { name: 'Avery K.',     program: 'Guided Trail',       status: 'Active',    progress: 85, lastActive: '2h ago',     quest: 'Outline Phase' },
  { name: 'Casey L.',     program: "Explorer's Trail",   status: 'Paused',    progress: 23, lastActive: '2 wks ago',  quest: 'Recognize Phase' },
  { name: 'Morgan S.',    program: 'Digital Compass',    status: 'Enrolled',  progress: 5,  lastActive: '3d ago',     quest: 'Not started' },
  { name: 'Riley P.',     program: 'Foundations Trail',  status: 'Active',    progress: 91, lastActive: 'Today',      quest: 'Verify Phase' },
  { name: 'Alex F.',      program: 'Guided Trail',       status: 'Complete',  progress: 100,lastActive: '1 wk ago',   quest: 'Complete' },
  { name: 'Drew H.',      program: "Explorer's Trail",   status: 'Active',    progress: 57, lastActive: 'Today',      quest: 'Select Phase' },
];

const statusDot: Record<string, 'green' | 'amber' | 'gray' | 'red'> = {
  Active: 'green', Enrolled: 'amber', Paused: 'gray', Complete: 'green',
};

export default function Learners() {
  return (
    <PageShell
      section="Penny Command Center"
      title="Learners"
      badge="prototype"
      subtitle="All enrolled and active learners across Transition Trails programs. Future sync with Salesforce contacts."
      integration="Salesforce Contacts + Agentforce learner data"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Learners', value: String(learners.length) },
            { label: 'Active',         value: String(learners.filter(l => l.status === 'Active').length) },
            { label: 'Avg Progress',   value: `${Math.round(learners.reduce((s, l) => s + l.progress, 0) / learners.length)}%` },
            { label: 'Completed',      value: String(learners.filter(l => l.status === 'Complete').length) },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{s.label}</p>
              <p className="text-2xl font-bold font-serif text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {['Learner', 'Program', 'Status', 'Progress', 'Current Quest', 'Last Active'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {learners.map(l => (
                <tr key={l.name} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{l.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-[13px]">{l.program}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusDot status={statusDot[l.status] ?? 'gray'} />
                      <span className="text-[13px] text-muted-foreground">{l.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${l.progress}%` }} />
                      </div>
                      <span className="text-[12px] text-muted-foreground">{l.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-[13px]">{l.quest}</td>
                  <td className="px-4 py-3 text-muted-foreground text-[13px]">{l.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
