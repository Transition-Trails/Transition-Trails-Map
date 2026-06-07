import { ScrollArea } from '@/components/ui/scroll-area';
import { OpsHeader, StatCard, StatusDot } from '@/components/platform/PageShell';

const zaps = [
  {
    name:     'Intake Form → Salesforce Case',
    trigger:  'Typeform / Website Form',
    action:   'Salesforce Case Created',
    status:   'Active'  as const,
    dot:      'green'   as const,
    lastRun:  '2h ago',
    runs:     '18 / week',
    note:     '',
  },
  {
    name:     'Program Completion → Certificate Email',
    trigger:  'Salesforce Stage = Complete',
    action:   'Send Certificate via Email',
    status:   'Active'  as const,
    dot:      'green'   as const,
    lastRun:  '1d ago',
    runs:     '3 / week',
    note:     '',
  },
  {
    name:     'GA4 Weekly Report → Slack',
    trigger:  'Schedule: Daily 9am',
    action:   'Post to #marketing Slack',
    status:   'Warning' as const,
    dot:      'amber'   as const,
    lastRun:  '3d ago',
    runs:     '1 / week',
    note:     'Expected daily. Last run was 3 days ago.',
  },
  {
    name:     'Penny Log Export → Google Sheets',
    trigger:  'Penny: New interaction',
    action:   'Append row to Sheets',
    status:   'Active'  as const,
    dot:      'green'   as const,
    lastRun:  '4h ago',
    runs:     '168 / week',
    note:     '',
  },
  {
    name:     'SF Case Created → Notify Slack',
    trigger:  'Salesforce: New Case',
    action:   'Post to #support Slack',
    status:   'Active'  as const,
    dot:      'green'   as const,
    lastRun:  '30m ago',
    runs:     '7 / week',
    note:     '',
  },
];

export default function AutomationHealth() {
  const active   = zaps.filter(z => z.status === 'Active').length;
  const warnings = zaps.filter(z => z.status === 'Warning').length;
  const totalRuns = 127;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <OpsHeader
        title="Automation Health"
        subtitle="Zapier workflow status, run history, and health alerts."
        integration="Zapier API + Slack + Google Sheets"
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Active Zaps"       value={`${active}/${zaps.length}`} sub="running normally" />
            <StatCard label="Total Runs (7d)"   value={String(totalRuns)}          sub="across all zaps" />
            <StatCard label="Warnings"          value={String(warnings)}           sub="zaps need attention" />
            <StatCard label="Errors (7d)"       value="0"                          sub="no failures" trend="All clear" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Zap Status</h2>
            <div className="space-y-3">
              {zaps.map(z => (
                <div
                  key={z.name}
                  className={`rounded-xl border p-4 ${z.status === 'Warning' ? 'border-amber-200 bg-amber-50' : 'border-border bg-card'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusDot status={z.dot} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{z.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {z.trigger} <span className="text-muted-foreground/50 mx-1">→</span> {z.action}
                        </p>
                        {z.note && (
                          <p className="text-xs text-amber-700 font-medium mt-1">{z.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-medium text-foreground">{z.runs}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Last: {z.lastRun}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
