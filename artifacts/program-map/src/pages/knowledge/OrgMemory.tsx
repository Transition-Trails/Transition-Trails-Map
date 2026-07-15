import { ScrollArea } from '@/components/ui/scroll-area';
import { TERMS } from '@/config/terminology';

const sections = [
  { title: 'Decisions',               desc: 'Key organizational decisions with rationale, owner, impact, and review dates.' },
  { title: 'Program History',         desc: 'Major program evolution — launches, retirements, redesigns, and cohort milestones.' },
  { title: 'Standards History',       desc: `Changes to Program, Module, Lesson, Assessment, Knowledge, ${TERMS.aiAssistant}, and Communication Blueprints.` },
  { title: 'Architecture History',    desc: 'Trail OS architecture decisions — platform choices, naming conventions, structural design.' },
  { title: `${TERMS.aiAssistant} History`,           desc: `Capability, prompt, and governance evolution — what ${TERMS.aiAssistant} could do and when.` },
  { title: 'Lessons Learned',         desc: 'Retrospective insights from programs, curriculum, operations, and integrations.' },
  { title: 'Institutional Knowledge', desc: 'Curated repository of important organizational context and rationale for future staff.' },
  { title: 'Governance Records',      desc: 'Policy, standards, ownership, and review history across all domains.' },
  { title: 'Memory Health',           desc: 'Missing ownership, undocumented decisions, stale records, and knowledge gaps.' },
];

export default function OrgMemory() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4 max-w-2xl">
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
          <p className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">Organizational Memory Studio</p>
          <p className="text-[12px] text-violet-700 mt-1 leading-relaxed">
            The institutional memory layer of Trail OS — preserving not only what exists and how it is connected, but <em>why</em> decisions were made. Deep integration with the Digital Twin, Operational Intelligence, and the Knowledge Brief rail.
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Org Memory is scheduled for Phase 2 implementation. The following sections will be available:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {sections.map(s => (
            <div key={s.title} className="rounded-lg border border-border bg-white p-3">
              <p className="text-[12px] font-semibold text-foreground mb-0.5">{s.title}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Example Decision Records (planned)</p>
          {[
            'Program Canvas replacing Foundations Blueprint — design language alignment',
            'Slack as primary learner communication platform — async community rationale',
            'Salesforce as system of record — single source of truth decision',
            'Google Drive as program content repository — linked to Salesforce, accessible to curriculum team',
            `${TERMS.aiAssistant} as learning intelligence layer (not automation) — ${TERMS.aiAssistant} supports, not replaces coaches`,
          ].map(ex => (
            <p key={ex} className="text-[11px] text-muted-foreground py-0.5 border-b border-border/40 last:border-0">· {ex}</p>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
