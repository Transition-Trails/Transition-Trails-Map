import { PageShell } from '@/components/platform/PageShell';
import { Badge } from '@/components/ui/badge';

const recent = [
  { id: 'REQ-031', type: 'New Feature',    subject: 'Add quiz checkpoints to Explorer\'s Trail', submitter: 'L. Torres',  date: '2d ago', status: 'Triaged' },
  { id: 'REQ-030', type: 'Bug / Issue',    subject: 'Penny not responding to RESOLVE questions',  submitter: 'M. Reyes',   date: '4d ago', status: 'In Review' },
  { id: 'REQ-029', type: 'Content Update', subject: 'Update Guided Trail module 4 pacing guide',  submitter: 'K. Brooks',  date: '5d ago', status: 'Approved' },
  { id: 'REQ-028', type: 'New Feature',    subject: 'Automated reminder emails for Trail Quests', submitter: 'T. Nguyen',  date: '7d ago', status: 'Backlog' },
  { id: 'REQ-027', type: 'Admin',          subject: 'Add new program cohort dates for Q4',        submitter: 'A. Johnson', date: '9d ago', status: 'Completed' },
];

const statusStyle: Record<string, string> = {
  Triaged:   'bg-sky-50 text-sky-700 border-sky-200',
  'In Review': 'bg-amber-50 text-amber-700 border-amber-200',
  Approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Backlog:   'bg-muted text-muted-foreground border-border',
  Completed: 'bg-primary/10 text-primary border-primary/20',
};

export default function Intake() {
  return (
    <PageShell
      section="Demand Management"
      title="Intake"
      badge="prototype"
      subtitle="Work requests, change proposals, and feature submissions from the team. Future connection to Salesforce Cases for unified tracking."
      integration="Salesforce Cases, Typeform / intake form"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">New This Week</p>
            <p className="text-3xl font-bold font-serif text-foreground">4</p>
            <p className="text-xs text-muted-foreground mt-1">requests submitted</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Awaiting Review</p>
            <p className="text-3xl font-bold font-serif text-foreground">7</p>
            <p className="text-xs text-muted-foreground mt-1">in backlog or in review</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Completed (30d)</p>
            <p className="text-3xl font-bold font-serif text-foreground">11</p>
            <p className="text-xs text-muted-foreground mt-1">requests resolved</p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent Requests</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Subject</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Submitter</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {recent.map(r => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.id}</td>
                    <td className="px-4 py-3 text-muted-foreground text-[13px]">{r.type}</td>
                    <td className="px-4 py-3 text-foreground">{r.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground text-[13px]">{r.submitter}</td>
                    <td className="px-4 py-3 text-muted-foreground text-[13px]">{r.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-[10px] font-semibold border px-2 py-0.5 rounded-full ${statusStyle[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
