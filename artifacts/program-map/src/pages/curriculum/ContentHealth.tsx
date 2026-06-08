import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { contentHealthIssues, SEVERITY_CONFIG } from '@/data/curriculumData';
import { AlertTriangle, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

type SeverityFilter = 'all' | 'high' | 'medium' | 'low';

export default function ContentHealth() {
  const { setSelectedItem }         = useAppContext();
  const [severity, setSeverity]     = useState<SeverityFilter>('all');

  const filtered = severity === 'all'
    ? contentHealthIssues
    : contentHealthIssues.filter(i => i.severity === severity);

  const countBySeverity = (s: string) => contentHealthIssues.filter(i => i.severity === s).length;

  return (
    <div className="h-full w-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Content Health</h1>
          <p className="text-muted-foreground mt-2">Automated content quality checks for Foundations Trail — surfacing missing assessments, unowned articles, stale content, and missing Penny prompts. Click any issue to open its Knowledge Brief.</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-white p-4 text-center shadow-sm">
            <p className="text-3xl font-bold font-serif text-foreground">{contentHealthIssues.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Total Issues</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-3xl font-bold font-serif text-red-700">{countBySeverity('high')}</p>
            <p className="text-[11px] text-red-700 mt-1">High Severity</p>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
            <p className="text-3xl font-bold font-serif text-orange-700">{countBySeverity('medium')}</p>
            <p className="text-[11px] text-orange-700 mt-1">Medium Severity</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-3xl font-bold font-serif text-amber-700">{countBySeverity('low')}</p>
            <p className="text-[11px] text-amber-700 mt-1">Low Severity</p>
          </div>
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-2">
          {(['all', 'high', 'medium', 'low'] as SeverityFilter[]).map(s => {
            const label = s === 'all' ? 'All Issues' : `${s.charAt(0).toUpperCase() + s.slice(1)} (${countBySeverity(s)})`;
            const activeCls = s === 'high' ? 'bg-red-600 text-white border-red-600' : s === 'medium' ? 'bg-orange-500 text-white border-orange-500' : s === 'low' ? 'bg-amber-500 text-white border-amber-500' : 'bg-primary text-primary-foreground border-primary';
            return (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  severity === s ? activeCls : 'bg-white border-border text-muted-foreground hover:border-foreground/30'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Issues */}
        <div className="space-y-3">
          {filtered.map(issue => {
            const sevCfg    = SEVERITY_CONFIG[issue.severity as 'high' | 'medium' | 'low'];
            const affected  = issue.affectedItems as string[];
            const actions   = issue.pennyActions as string[];
            return (
              <button
                key={issue.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: issue.id, data: issue })}
                className="w-full text-left rounded-xl border border-border bg-white hover:border-foreground/20 transition-all p-4 group shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    issue.severity === 'high' ? 'text-red-600' : issue.severity === 'medium' ? 'text-orange-500' : 'text-amber-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-[13px] font-bold text-foreground">{issue.name as string}</p>
                      <span className={`inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5 ${sevCfg.cls}`}>{sevCfg.label} Severity</span>
                      <span className="inline-flex text-[10px] font-medium border border-border bg-muted/30 text-muted-foreground rounded-full px-2 py-0.5">{issue.issueType as string}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{issue.purpose as string}</p>
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Affected</p>
                      <div className="flex flex-wrap gap-1">
                        {affected.map(a => (
                          <span key={a} className="inline-flex text-[10px] border border-border/60 bg-muted/30 rounded px-2 py-0.5 text-muted-foreground">{a}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground font-semibold">Penny actions:</span>
                        {actions.map(a => (
                          <span key={a} className="inline-flex items-center gap-1 text-[10px] text-secondary border border-secondary/20 bg-secondary/5 rounded-full px-2 py-0.5">
                            <Sparkles className="w-2.5 h-2.5" />{a}
                          </span>
                        ))}
                      </div>
                      <span className="text-[11px] text-primary font-medium group-hover:underline flex items-center gap-1 flex-shrink-0">
                        Brief <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
                {(issue.actionRequired as string | undefined) && (
                  <div className="mt-2 ml-7 flex items-start gap-1.5 text-[10px] text-green-800 bg-green-50 border border-green-100 rounded px-3 py-2">
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5 text-green-600" />
                    <span>{issue.actionRequired as string}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Future state —</strong> Content Health checks will run automatically on a weekly schedule and post alerts to <span className="font-mono text-[10px]">#trailos-ops</span>.
            High-severity issues will auto-create a Demand Management case for triage. Currently: prototype audit only.
          </p>
        </div>

      </div>
    </div>
  );
}
