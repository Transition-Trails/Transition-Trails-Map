import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumHealthIssues, SEVERITY_CONFIG, HEALTH_CHECK_CONFIG, type HealthSeverity, type HealthCheckType } from '@/data/curriculumData';
import { AlertTriangle, CheckCircle2, ArrowRight, Shield } from 'lucide-react';

export default function ContentHealth() {
  const { setSelectedItem } = useAppContext();
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filtered = severityFilter === 'all'
    ? curriculumHealthIssues
    : curriculumHealthIssues.filter(h => h.severity === severityFilter);

  const counts = {
    high:   curriculumHealthIssues.filter(h => h.severity === 'high').length,
    medium: curriculumHealthIssues.filter(h => h.severity === 'medium').length,
    low:    curriculumHealthIssues.filter(h => h.severity === 'low').length,
  };

  const healthScore = Math.round(
    ((12 - curriculumHealthIssues.filter(h => h.severity === 'high').length * 2 - curriculumHealthIssues.filter(h => h.severity === 'medium').length) / 12) * 100
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-0">
        {/* Row 1: title + inline stats */}
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <h1 className="text-[14px] font-semibold text-foreground">Content Health</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-muted-foreground">
              <span className="font-bold text-foreground">{healthScore}%</span> Health Score
            </span>
            <span className="text-muted-foreground/30 text-[12px]">·</span>
            <span className="text-[12px] text-[#A93F2F]">
              <span className="font-bold">{counts.high}</span> High
            </span>
            <span className="text-muted-foreground/30 text-[12px]">·</span>
            <span className="text-[12px] text-[#CC8400]">
              <span className="font-bold">{counts.medium}</span> Medium
            </span>
            <span className="text-muted-foreground/30 text-[12px]">·</span>
            <span className="text-[12px] text-muted-foreground">
              <span className="font-bold text-foreground">{counts.low}</span> Low
            </span>
          </div>
        </div>
        {/* Row 2: severity filter as underline tabs */}
        <div className="flex items-center gap-0.5">
          {(['all', 'high', 'medium', 'low'] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`text-[12px] font-semibold px-3 py-2.5 border-b-2 transition-colors capitalize whitespace-nowrap ${
                severityFilter === sev
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {sev === 'all' ? `All Issues (${curriculumHealthIssues.length})` : `${sev.charAt(0).toUpperCase() + sev.slice(1)} (${counts[sev]})`}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-5xl space-y-4">

          {/* Penny CTA */}
          <div className="rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-3 flex items-center gap-3">
            <Shield className="w-4 h-4 text-secondary shrink-0" />
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-foreground">Run a full Consistency Review in Penny Content Assistant</p>
              <p className="text-[14px] text-muted-foreground">Penny can analyze any program, sprint, or module and generate a prioritized gap report.</p>
            </div>
            <a href="#" onClick={e => { e.preventDefault(); }} className="text-[14px] font-semibold text-secondary border border-secondary/30 rounded-full px-3 py-1.5 whitespace-nowrap hover:bg-secondary/10 transition-colors">
              Consistency Review →
            </a>
          </div>

          {/* Issues list */}
          <div className="grid gap-3">
            {filtered.map(issue => {
              const sevCfg = SEVERITY_CONFIG[issue.severity as HealthSeverity];
              const checkCfg = HEALTH_CHECK_CONFIG[issue.checkType as HealthCheckType];
              return (
                <button
                  key={issue.id}
                  onClick={() => setSelectedItem({ type: 'curriculumItem', id: issue.id, data: issue })}
                  className="rounded-xl border border-border bg-white p-4 text-left hover:border-[#E8B9B4] hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 shrink-0 ${issue.severity === 'high' ? 'text-[#A93F2F]' : 'text-[#CC8400]'}`} />
                      <div>
                        <p className="text-[14px] font-bold text-foreground">{issue.name as string}</p>
                        <p className="text-[14px] text-muted-foreground">Affects: <strong>{issue.affectedObjectName as string}</strong></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${sevCfg.cls}`}>{sevCfg.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  {checkCfg && (
                    <p className="text-[14px] text-muted-foreground mb-1">
                      <span className="font-medium">Check Type:</span> {checkCfg.label} — {checkCfg.description}
                    </p>
                  )}
                  {((issue.affectedItems as string[]) || []).length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {(issue.affectedItems as string[]).map((item, i) => (
                        <p key={i} className="text-[14px] text-[#A93F2F]">• {item}</p>
                      ))}
                    </div>
                  )}
                  <p className="text-[14px] font-medium text-primary mt-2">Action: {issue.actionRequired as string}</p>
                  {((issue.pennyActions as string[]) || []).length > 0 && (
                    <p className="text-[14px] text-secondary mt-1">
                      Penny can help: {(issue.pennyActions as string[]).join(' · ')}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#2F6B3F] mb-3" />
              <p className="text-[14px] font-semibold text-foreground">No issues at this severity level</p>
              <p className="text-[14px] text-muted-foreground">Select a different filter to see other health issues.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
