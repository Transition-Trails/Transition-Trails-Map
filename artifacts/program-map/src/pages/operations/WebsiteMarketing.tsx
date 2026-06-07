import { ScrollArea } from '@/components/ui/scroll-area';
import { OpsHeader, StatCard } from '@/components/platform/PageShell';

const topPages = [
  { page: '/programs',      label: 'Programs',          sessions: 342,  avgTime: '2m 14s', bounce: '38%' },
  { page: '/',              label: 'Homepage',           sessions: 298,  avgTime: '1m 45s', bounce: '44%' },
  { page: '/trail-guide',   label: 'Trail Guide',        sessions: 187,  avgTime: '3m 02s', bounce: '29%' },
  { page: '/about',         label: 'About',              sessions: 156,  avgTime: '1m 22s', bounce: '51%' },
  { page: '/contact',       label: 'Contact',            sessions: 89,   avgTime: '0m 45s', bounce: '62%' },
  { page: '/explorer-trail', label: "Explorer's Trail",  sessions: 76,   avgTime: '2m 33s', bounce: '35%' },
  { page: '/penny',         label: 'Meet Penny',         sessions: 52,   avgTime: '1m 58s', bounce: '41%' },
];

const sources = [
  { name: 'Organic Search', pct: '52%', sessions: 648 },
  { name: 'Direct',         pct: '28%', sessions: 349 },
  { name: 'Social Media',   pct: '12%', sessions: 150 },
  { name: 'Referral',       pct: '8%',  sessions: 100 },
];

export default function WebsiteMarketing() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <OpsHeader
        title="Website & Marketing"
        subtitle="Website traffic, goal completions, and marketing performance — last 30 days."
        integration="GA4 via Zapier + Google Ads (future)"
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Sessions (30d)"       value="1,247"  sub="↑ 12% vs prior period" trend="Trending up" />
            <StatCard label="Page Views"            value="4,891"  sub="↑ 8% vs prior period" />
            <StatCard label="Goal Completions"      value="23"     sub="Inquiry forms submitted" />
            <StatCard label="Bounce Rate"           value="42%"    sub="↓ 3pts vs prior period" trend="Improving" />
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3">
              <h2 className="text-sm font-semibold text-foreground mb-3">Top Pages</h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Page</th>
                      <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sessions</th>
                      <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Time</th>
                      <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Bounce</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {topPages.map(p => (
                      <tr key={p.page} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-foreground">{p.label}</span>
                          <span className="block text-[11px] text-muted-foreground font-mono">{p.page}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{p.sessions.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{p.avgTime}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{p.bounce}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-span-2">
              <h2 className="text-sm font-semibold text-foreground mb-3">Traffic Sources</h2>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                {sources.map(s => (
                  <div key={s.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="font-medium text-foreground">{s.pct}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: s.pct }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.sessions.toLocaleString()} sessions</p>
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
