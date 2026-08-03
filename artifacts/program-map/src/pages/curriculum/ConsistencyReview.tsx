import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumModules, curriculumHealthIssues, HEALTH_CHECK_CONFIG, SEVERITY_CONFIG, type HealthCheckType, type HealthSeverity } from '@/data/curriculumData';
import { pennyContentActions } from '@/data/pennyContentActions';
import { Shield, CheckCircle2, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

type CheckResult = {
  moduleId: string;
  moduleName: string;
  sprint: string;
  moduleNumber: string;
  checks: { type: HealthCheckType; pass: boolean; label: string }[];
  issues: typeof curriculumHealthIssues;
  score: number;
};

function computeChecks(m: typeof curriculumModules[0]): CheckResult {
  const lessonIds       = (m.lessonIds as string[]) || [];
  const assessmentIds   = (m.assessmentIds as string[]) || [];
  const articleIds      = (m.knowledgeArticleIds as string[]) || [];
  const coachingIds     = (m.coachingPromptIds as string[]) || [];
  const reflectionIds   = (m.reflectionPromptIds as string[]) || [];
  const objectives      = (m.learningObjectives as string[]) || [];
  const deliveryCount   = ((m.slackActivityIds as string[]) || []).length + ((m.calendarEventIds as string[]) || []).length;

  const checks: CheckResult['checks'] = [
    { type: 'missing-objectives',    pass: objectives.length > 0,    label: 'Learning Objectives' },
    { type: 'missing-assessment',    pass: assessmentIds.length > 0, label: 'Assessment Linked' },
    { type: 'missing-knowledge-link',pass: articleIds.length > 0,    label: 'Knowledge Articles' },
    { type: 'missing-penny-prompts', pass: coachingIds.length > 0 && reflectionIds.length > 0, label: 'Penny Prompts' },
    { type: 'missing-delivery',      pass: deliveryCount > 0,        label: 'Delivery Activities' },
  ];

  const passed = checks.filter(c => c.pass).length;
  const score = Math.round((passed / checks.length) * 100);
  const issues = curriculumHealthIssues.filter(h => h.affectedObjectId === m.id);

  return {
    moduleId: m.id,
    moduleName: m.name,
    sprint: m.sprint as string || '',
    moduleNumber: m.moduleNumber as string || '',
    checks,
    issues,
    score,
  };
}

const SCORE_COLOR = (s: number) =>
  s === 100 ? 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]'
  : s >= 60  ? 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]'
  : 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]';

export default function ConsistencyReview() {
  const { setSelectedItem } = useAppContext();
  const [showPassing, setShowPassing] = useState(true);

  const results = curriculumModules.map(computeChecks);
  const failing = results.filter(r => r.score < 100);
  const passing = results.filter(r => r.score === 100);
  const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);

  const reviewAction = pennyContentActions.find(a => a.id === 'review-consistency')!;
  const issuesByCheck = Object.keys(HEALTH_CHECK_CONFIG).reduce((acc, type) => {
    acc[type] = curriculumHealthIssues.filter(h => h.checkType === type).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-6">
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/60 mb-1">Curriculum Studio — Penny Content Assistant</p>
          <h1 className="text-3xl font-bold text-foreground">Consistency Review</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Standards-based relationship audit for Foundations Trail. Each module is checked against the Learning Architecture Standard —
            objectives, assessment, knowledge articles, Penny prompts, and delivery activities. This is what Penny's
            "Review for Consistency" action generates.
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-3xl font-bold text-primary">{avgScore}%</p>
            <p className="text-[14px] font-semibold text-primary/70">Average Score</p>
            <p className="text-[14px] text-muted-foreground">Foundations Trail</p>
          </div>
          <div className="rounded-lg border border-[#9FC3AE] bg-[#E6F0EA] px-4 py-3">
            <p className="text-3xl font-bold text-[#2F6B3F]">{passing.length}</p>
            <p className="text-[14px] font-semibold text-[#2F6B3F]">Fully Compliant</p>
            <p className="text-[14px] text-[#2F6B3F]">All 5 checks pass</p>
          </div>
          <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] px-4 py-3">
            <p className="text-3xl font-bold text-[#A93F2F]">{failing.length}</p>
            <p className="text-[14px] font-semibold text-[#A93F2F]">Need Attention</p>
            <p className="text-[14px] text-[#A93F2F]">One or more gaps</p>
          </div>
          <div className="rounded-lg border border-border bg-white px-4 py-3">
            <p className="text-3xl font-bold text-foreground">{curriculumHealthIssues.length}</p>
            <p className="text-[14px] font-semibold text-foreground/70">Total Issues</p>
            <p className="text-[14px] text-muted-foreground">Across all checks</p>
          </div>
        </div>

        {/* Penny action info */}
        <button
          onClick={() => setSelectedItem({ type: 'pennyAction', id: reviewAction.id, data: reviewAction })}
          className="w-full rounded-xl border-2 border-secondary/30 bg-secondary/5 p-4 text-left hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[14px] font-bold text-foreground">{reviewAction.name}</p>
                  <span className="text-[14px] font-bold border border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400] rounded-full px-1.5 py-0.5">Prototype Action</span>
                </div>
                <p className="text-[14px] text-muted-foreground">{reviewAction.purpose}</p>
                <p className="text-[14px] text-secondary mt-1 font-medium">Select to see full action specification in the Knowledge Brief →</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
          </div>
        </button>

        {/* Issue type breakdown */}
        <div className="space-y-2">
          <p className="text-[14px] font-bold  text-muted-foreground/60">Issues by Check Type</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(HEALTH_CHECK_CONFIG).map(([type, cfg]) => {
              const count = issuesByCheck[type] || 0;
              return (
                <div key={type} className={`rounded-lg border px-3 py-2 ${count > 0 ? 'border-[#E8B9B4] bg-[#FBEAE6]/50' : 'border-[#9FC3AE] bg-[#E6F0EA]/50'}`}>
                  <div className="flex items-center gap-1.5">
                    {count > 0 ? <AlertTriangle className="w-3 h-3 text-[#A93F2F]" /> : <CheckCircle2 className="w-3 h-3 text-[#2F6B3F]" />}
                    <p className={`text-[14px] font-bold ${count > 0 ? 'text-[#A93F2F]' : 'text-[#245531]'}`}>{count > 0 ? count + ' issue' + (count !== 1 ? 's' : '') : 'Clean'}</p>
                  </div>
                  <p className="text-[14px] text-muted-foreground mt-0.5">{cfg.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Module-by-module results */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="text-[14px] font-bold  text-muted-foreground/60">Module Results — Foundations Trail</p>
            <button
              onClick={() => setShowPassing(!showPassing)}
              className="text-[14px] text-primary font-medium hover:underline"
            >
              {showPassing ? 'Hide' : 'Show'} passing modules
            </button>
          </div>

          <div className="space-y-2">
            {[...failing, ...(showPassing ? passing : [])].map(result => (
              <button
                key={result.moduleId}
                onClick={() => {
                  const mod = curriculumModules.find(m => m.id === result.moduleId);
                  if (mod) setSelectedItem({ type: 'curriculumItem', id: mod.id, data: mod });
                }}
                className={`w-full rounded-xl border p-4 text-left transition-all hover:shadow-sm ${result.score === 100 ? 'border-[#9FC3AE] bg-[#E6F0EA]/30 hover:border-green-400' : 'border-border bg-white hover:border-[#E8B9B4]'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-[14px] font-bold border rounded-lg px-2 py-1 ${SCORE_COLOR(result.score)}`}>
                      {result.score}%
                    </span>
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{result.moduleNumber} — {result.moduleName}</p>
                      <p className="text-[14px] text-muted-foreground">{result.sprint}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {result.checks.map(check => (
                      <span
                        key={check.type}
                        className={`text-[14px] font-medium border rounded-full px-1.5 py-0.5 ${check.pass ? 'border-[#9FC3AE] bg-[#E6F0EA] text-[#2F6B3F]' : 'border-[#E8B9B4] bg-[#FBEAE6] text-[#A93F2F]'}`}
                      >
                        {check.pass ? '✓' : '✗'} {check.label}
                      </span>
                    ))}
                  </div>
                </div>
                {result.issues.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {result.issues.map(issue => (
                      <div key={issue.id} className="flex items-center gap-1.5">
                        <AlertTriangle className={`w-3 h-3 shrink-0 ${issue.severity === 'high' ? 'text-[#A93F2F]' : 'text-[#CC8400]'}`} />
                        <p className="text-[14px] text-muted-foreground">{issue.name as string} — {issue.actionRequired as string}</p>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
