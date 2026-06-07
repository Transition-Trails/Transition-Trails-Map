import { PageShell } from '@/components/platform/PageShell';
import { Badge } from '@/components/ui/badge';

type Priority = 'Urgent' | 'High' | 'Normal' | 'Low';

interface Case {
  id: string;
  subject: string;
  priority: Priority;
  program?: string;
  age: string;
}

const columns: { key: string; label: string; cases: Case[] }[] = [
  {
    key: 'new', label: 'New',
    cases: [
      { id: 'SF-1247', subject: 'Cannot access learning portal',    priority: 'Urgent', age: '4h' },
      { id: 'SF-1245', subject: 'Curriculum pacing question',       priority: 'Low',    age: '2d' },
      { id: 'SF-1241', subject: 'Certificate delivery delay',       priority: 'Normal', age: '7d' },
    ],
  },
  {
    key: 'review', label: 'In Review',
    cases: [
      { id: 'SF-1244', subject: 'Billing dispute — refund request', priority: 'High',   age: '3d' },
      { id: 'SF-1243', subject: 'Program scheduling inquiry',       priority: 'Normal', age: '4d' },
    ],
  },
  {
    key: 'progress', label: 'In Progress',
    cases: [
      { id: 'SF-1246', subject: "Invoice question — Explorer's Trail", priority: 'Normal', age: '1d' },
      { id: 'SF-1242', subject: 'Penny not responding correctly',       priority: 'High',   age: '5d' },
      { id: 'SF-1239', subject: 'Session reschedule needed',            priority: 'Normal', age: '8d' },
    ],
  },
  {
    key: 'resolved', label: 'Resolved',
    cases: [
      { id: 'SF-1240', subject: 'Welcome email not received',    priority: 'Normal', age: '8d' },
      { id: 'SF-1238', subject: 'Zoom link broken for cohort',   priority: 'High',   age: '10d' },
      { id: 'SF-1237', subject: 'Program overview questions',    priority: 'Low',    age: '12d' },
    ],
  },
];

const prStyle: Record<Priority, string> = {
  Urgent: 'bg-red-100 text-red-700',
  High:   'bg-amber-100 text-amber-700',
  Normal: 'bg-sky-100 text-sky-700',
  Low:    'bg-muted text-muted-foreground',
};

const colHeader: Record<string, string> = {
  new:      'border-l-sky-400',
  review:   'border-l-amber-400',
  progress: 'border-l-primary',
  resolved: 'border-l-emerald-400',
};

export default function DemandCases() {
  return (
    <PageShell
      section="Demand Management"
      title="Salesforce Cases"
      badge="prototype"
      subtitle="Support and work request pipeline. Future live view from Salesforce Case object via MCP."
      integration="Salesforce MCP — Cases object"
    >
      <div className="grid grid-cols-4 gap-4">
        {columns.map(col => (
          <div key={col.key}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{col.label}</h3>
              <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {col.cases.length}
              </span>
            </div>
            <div className="space-y-2">
              {col.cases.map(c => (
                <div
                  key={c.id}
                  className={`rounded-lg bg-card border border-border border-l-[3px] ${colHeader[col.key]} p-3 cursor-pointer hover:shadow-sm transition-shadow`}
                >
                  <p className="font-mono text-[10px] text-muted-foreground mb-1">{c.id}</p>
                  <p className="text-[13px] font-medium text-foreground leading-snug mb-2">{c.subject}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${prStyle[c.priority]}`}>
                      {c.priority}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{c.age}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
