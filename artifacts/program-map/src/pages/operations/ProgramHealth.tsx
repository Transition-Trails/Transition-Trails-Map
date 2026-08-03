import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { OpsHeader, StatCard, StatusDot } from '@/components/platform/PageShell';

const programs = [
  { name: "Explorer's Trail",    status: 'Active',    dot: 'green' as const, enrolled: 12, capacity: 15, cohort: 'Cohort 3', weeks: '3 wks remaining',   next: 'Oct 2025' },
  { name: 'Foundations Trail',   status: 'Active',    dot: 'green' as const, enrolled: 8,  capacity: 12, cohort: 'Cohort 2', weeks: '5 wks remaining',   next: 'Oct 2025' },
  { name: 'Guided Trail',        status: 'Active',    dot: 'amber' as const, enrolled: 4,  capacity: 8,  cohort: 'Cohort 1', weeks: '9 wks remaining',   next: 'Nov 2025' },
  { name: 'Trail of Mastery',    status: 'Draft',     dot: 'gray'  as const, enrolled: 0,  capacity: 0,  cohort: '—',         weeks: 'No active cohort', next: 'Q3 2025' },
  { name: 'Digital Compass',     status: 'Upcoming',  dot: 'amber' as const, enrolled: 0,  capacity: 6,  cohort: 'Pre-enroll', weeks: '0/6 spots filled',next: 'Jul 2025' },
];

const alerts = [
  { prog: 'Trail of Mastery',  msg: 'No active cohort scheduled. Planning required for Q3 launch.' },
  { prog: 'Digital Compass',   msg: 'Enrollment open — 0 of 6 spots filled. Marketing push recommended.' },
  { prog: 'Guided Trail',      msg: 'Below target enrollment (4/8). Consider outreach to waitlist.' },
];

export default function ProgramHealth() {
  const active   = programs.filter(p => p.status === 'Active').length;
  const learners = programs.reduce((s, p) => s + p.enrolled, 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <OpsHeader
        title="Program Health"
        subtitle="Cohort status, enrollment, and completion across all Transition Trails programs."
        integration="Salesforce MCP + program knowledge docs"
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Active Programs"    value={String(active)}   sub="of 5 total" />
            <StatCard label="Active Learners"    value={String(learners)} sub="across cohorts" />
            <StatCard label="Completions (30d)"  value="3"                sub="certificates issued" />
            <StatCard label="Avg Completion Rate" value="71%"             sub="active cohorts" trend="On track" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Program Status</h2>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Program</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Enrollment</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cohort</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Notes</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Next Cohort</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {programs.map(p => (
                    <tr key={p.name} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusDot status={p.dot} />
                          <span className="text-muted-foreground text-[13px]">{p.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.capacity > 0 ? `${p.enrolled} / ${p.capacity}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.cohort}</td>
                      <td className="px-4 py-3 text-muted-foreground text-[13px]">{p.weeks}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.next}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {alerts.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Alerts</h2>
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.prog} className="flex gap-3 p-3 rounded-lg bg-[#FFF3E0] border border-[#FFD08A]">
                    <Badge variant="outline" className="bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A] flex-shrink-0 text-[10px] self-start mt-0.5">
                      {a.prog}
                    </Badge>
                    <p className="text-sm text-[#CC8400]">{a.msg}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
