import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { OpsHeader, StatCard, StatusDot } from '@/components/platform/PageShell';
import { TERMS } from '@/config/terminology';

const cases = [
  { id: 'SF-1247', subject: 'Cannot access learning portal',       priority: 'Urgent', status: 'Open',        age: '4h' },
  { id: 'SF-1246', subject: "Invoice question — Explorer's Trail",  priority: 'Normal', status: 'In Progress', age: '1d' },
  { id: 'SF-1245', subject: 'Curriculum question — pacing',         priority: 'Low',    status: 'Open',        age: '2d' },
  { id: 'SF-1244', subject: 'Billing dispute — refund request',     priority: 'High',   status: 'Escalated',   age: '3d' },
  { id: 'SF-1243', subject: 'Program scheduling inquiry',           priority: 'Normal', status: 'Pending',     age: '4d' },
  { id: 'SF-1242', subject: `${TERMS.aiAssistant} not responding correctly`,       priority: 'High',   status: 'In Progress', age: '5d' },
  { id: 'SF-1241', subject: 'Certificate delivery delay',           priority: 'Normal', status: 'Open',        age: '7d' },
];

const priorityStyle: Record<string, string> = {
  Urgent:   'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]',
  High:     'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
  Normal:   'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  Low:      'bg-muted text-muted-foreground border-border',
};

const statusDot: Record<string, 'red' | 'amber' | 'green' | 'gray'> = {
  Open:        'amber',
  'In Progress': 'green',
  Escalated:   'red',
  Pending:     'gray',
};

export default function SalesforceHealth() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <OpsHeader
        title="Salesforce Health"
        subtitle="Case pipeline, lead status, and opportunity metrics from the Salesforce org."
        integration="Salesforce MCP (future direct API)"
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Open Cases"     value="7"      sub="3 urgent / 2 high" />
            <StatCard label="New This Week"  value="3"      sub="vs 4 last week" />
            <StatCard label="Qualified Leads" value="14"   sub="6 in active nurture" />
            <StatCard label="Opportunities"  value="4"      sub="Pipeline: $48,000" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Open Cases</h2>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Case ID</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Subject</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Age</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {cases.map(c => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.id}</td>
                      <td className="px-4 py-3 text-foreground">{c.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-[10px] font-semibold border px-2 py-0.5 rounded-full ${priorityStyle[c.priority]}`}>
                          {c.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusDot status={statusDot[c.status] ?? 'gray'} />
                          <span className="text-muted-foreground text-[13px]">{c.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-[13px]">{c.age}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pipeline Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Discovery</span><span className="font-medium">1 opp — $8,000</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Proposal</span><span className="font-medium">2 opps — $28,000</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Negotiation</span><span className="font-medium">1 opp — $12,000</span></div>
                <div className="flex justify-between border-t border-border pt-2"><span className="font-semibold">Total</span><span className="font-bold">4 opps — $48,000</span></div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Lead Sources</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Website Inquiry</span><span className="font-medium">8 leads</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Referral</span><span className="font-medium">4 leads</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">LinkedIn</span><span className="font-medium">2 leads</span></div>
                <div className="flex justify-between border-t border-border pt-2"><span className="font-semibold">Total</span><span className="font-bold">14 leads</span></div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
