import { useAppContext } from '@/context/AppContext';
import { curriculumModules, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

// Derive assignments from modules (2 per module, prototype)
const ASSIGNMENT_TYPES = ['Hands-On Lab', 'Practice Exercise', 'Case Study', 'Portfolio Component', 'Reflection'];
const TIMES            = ['30 min', '45 min', '60 min', '90 min'];

const assignments = curriculumModules
  .filter(m => (m.assignmentCount as number) > 0)
  .flatMap((mod, mIdx) =>
    Array.from({ length: mod.assignmentCount as number }, (_, i) => ({
      id: `asgn-${mod.id}-${i + 1}`,
      objectType: 'assignment' as const,
      name: i === 0
        ? `${mod.name as string} — Practice Lab`
        : `${mod.name as string} — ${i === 1 ? 'Skills Exercise' : 'Portfolio Component'}`,
      status: mod.status,
      confidence: mod.confidence,
      owner: mod.owner as string,
      program: mod.program as string,
      purpose: `Practical assignment for ${mod.name as string} — reinforces the lesson content through applied Salesforce work in a sandbox environment.`,
      relatedSalesforceObject: 'Assignment__c (Custom Object)',
      relatedLmsObject: 'Assignment (Salesforce LMS)',
      pennyActions: ['Create Reflection Prompt', 'Create Coach Notes'],
      futureDemandLink: 'Submit Change Request → /demand/change-request',
      module: mod.name as string,
      moduleId: mod.id,
      moduleNumber: mod.moduleNumber as string,
      assignmentNumber: `${mod.moduleNumber as string}.A${i + 1}`,
      assignmentType: ASSIGNMENT_TYPES[(mIdx * 2 + i) % ASSIGNMENT_TYPES.length],
      estimatedTime: TIMES[(mIdx + i) % TIMES.length],
      hasScoringRubric: (mIdx + i) % 3 !== 0,
    }))
  );

export default function CurriculumAssignments() {
  const { setSelectedItem } = useAppContext();

  return (
    <div className="h-full w-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio</p>
          <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
          <p className="text-muted-foreground mt-2">2 assignments per module — practical exercises reinforcing lesson content in a Salesforce sandbox. Click any assignment to open its Knowledge Brief.</p>
        </div>

        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[90px_1fr_140px_60px_70px_70px] gap-x-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
            {['#', 'Assignment', 'Type', 'Time', 'Status', 'Rubric'].map(h => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{h}</p>
            ))}
          </div>
          {assignments.map((asgn, i) => {
            const statusCfg = CONTENT_STATUS_CONFIG[asgn.status];
            return (
              <button
                key={asgn.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: asgn.id, data: asgn })}
                className={`w-full text-left grid grid-cols-[90px_1fr_140px_60px_70px_70px] gap-x-3 items-center px-4 py-3 group hover:bg-orange-50/50 transition-colors ${i < assignments.length - 1 ? 'border-b border-border/30' : ''}`}
              >
                <p className="text-[11px] font-mono text-muted-foreground">{asgn.assignmentNumber}</p>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground group-hover:text-primary truncate">{asgn.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{asgn.module}</p>
                </div>
                <span className="text-[11px] text-muted-foreground">{asgn.assignmentType}</span>
                <p className="text-[11px] text-muted-foreground">{asgn.estimatedTime}</p>
                <span className={`inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5 w-fit ${statusCfg.cls}`}>{statusCfg.label}</span>
                <div className="flex items-center">
                  {asgn.hasScoringRubric
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          {assignments.length} assignments shown · 24 total for Foundations Trail (prototype)
        </p>

      </div>
    </div>
  );
}
