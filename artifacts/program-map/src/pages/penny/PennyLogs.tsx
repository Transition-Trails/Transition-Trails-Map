import { useState, useEffect } from 'react';
import { PageShell, StatusDot } from '@/components/platform/PageShell';

interface LogEntry {
  id: string;
  learnerName: string;
  userMessage: string;
  pennyResponse: string;
  promptMode: string;
  source: string;
  createdDate: string;
}

const PROMPT_MODE_LABEL: Record<string, string> = {
  ask:           'Query',
  quest_request: 'Quest',
  career_review: 'Career',
  escalation:    'Escalation',
};

const TYPE_STYLE: Record<string, string> = {
  Query:     'bg-sky-50 text-sky-700 border-sky-200',
  Quest:     'bg-violet-50 text-violet-700 border-violet-200',
  Career:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  Escalation:'bg-amber-50 text-amber-700 border-amber-200',
};

function typeLabel(promptMode: string): string {
  return PROMPT_MODE_LABEL[promptMode] ?? promptMode;
}

function qualityDot(source: string): 'green' | 'amber' | 'gray' {
  if (source === 'escalation') return 'amber';
  return 'green';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function SkeletonRow() {
  return (
    <div className="flex gap-4 p-3 rounded-lg bg-card border border-border animate-pulse">
      <div className="w-16 h-3 bg-muted rounded mt-0.5 shrink-0" />
      <div className="w-2 h-2 bg-muted rounded-full mt-0.5 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="flex gap-2">
          <div className="w-20 h-3 bg-muted rounded" />
          <div className="w-14 h-3 bg-muted rounded" />
        </div>
        <div className="w-3/4 h-3 bg-muted rounded" />
      </div>
    </div>
  );
}

export default function PennyLogs() {
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/penny/data/logs/today')
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json() as Promise<LogEntry[]>;
      })
      .then(data => { setLogs(data); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load logs');
        setLoading(false);
      });
  }, []);

  return (
    <PageShell
      section="Penny Command Center"
      title="Logs"
      subtitle="Today's Penny coaching and query log — live from Salesforce"
      integration="Penny_Interaction_Log__c"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground">
            {loading
              ? 'Loading today\'s interactions…'
              : error
                ? 'Could not load logs'
                : `Showing today's logs — ${logs.length} interaction${logs.length !== 1 ? 's' : ''}`
            }
          </p>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted border border-border rounded-md px-2 py-1">
            <StatusDot status="green" /> Live · Salesforce
          </span>
        </div>

        {loading && (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-[12px] text-red-700 font-medium">{error}</p>
            <p className="text-[11px] text-red-600/70 mt-1">
              Check Salesforce authentication in Admin → Integrations.
            </p>
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-[12px] text-muted-foreground">No interactions logged today yet.</p>
          </div>
        )}

        {!loading && !error && logs.map(log => {
          const type    = typeLabel(log.promptMode);
          const typeCls = TYPE_STYLE[type] ?? 'bg-muted text-muted-foreground border-border';
          return (
            <div key={log.id} className="flex gap-4 p-3 rounded-lg bg-card border border-border hover:bg-muted/20 transition-colors">
              <div className="flex-shrink-0 text-right w-16">
                <p className="text-[11px] font-mono text-muted-foreground">{formatTime(log.createdDate)}</p>
              </div>
              <StatusDot status={qualityDot(log.source)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[12px] font-semibold text-foreground">{log.learnerName}</span>
                  <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded-full ${typeCls}`}>
                    {type}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground leading-snug line-clamp-2">{log.userMessage}</p>
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
