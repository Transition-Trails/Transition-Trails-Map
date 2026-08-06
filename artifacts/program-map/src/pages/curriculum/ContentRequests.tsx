import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation } from 'wouter';
import { Inbox, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

const FUTURE_CAPABILITIES = [
  { label: 'New Program Request',      desc: 'Submit a request for a new program — structured intake, feasibility review, and epic creation in Demand Management.' },
  { label: 'Module Change Request',    desc: 'Propose changes to an existing module — learning objective updates, lesson additions, or content replacements.' },
  { label: 'Assessment Revision',      desc: 'Request an assessment update — question changes, passing score adjustments, or format changes.' },
  { label: 'Knowledge Article Update', desc: 'Flag an article for content update, ownership reassignment, or Salesforce Knowledge remapping.' },
  { label: 'Penny Template Revision',  desc: 'Request a Penny template update — trigger context changes, tone adjustments, or sample output updates.' },
  { label: 'Sprint Resequencing',      desc: 'Request a sprint structure change — module reordering, theme updates, or RESOLVE phase remapping.' },
];

const CURRENT_PHASES = [
  { phase: 'Phase 1', label: 'Inventory capabilities',                active: true },
  { phase: 'Phase 2', label: 'Map to Trail OS objects',                active: false },
  { phase: 'Phase 3', label: 'Connect to Knowledge Graph',             active: false },
  { phase: 'Phase 4', label: 'Connect Communications & Calendar',      active: false },
  { phase: 'Phase 5', label: 'Connect Salesforce / Demand Management', active: false },
  { phase: 'Phase 6', label: 'Govern through Demand Management',       active: false },
];

export default function ContentRequests() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[14px] font-semibold text-foreground">Content Requests</h1>
          <span className="text-[12px] font-medium text-primary border border-primary/20 bg-primary/5 rounded-full px-2 py-0.5">
            Phase 1
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-4xl space-y-6">

          {/* Current phase notice */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Inbox className="w-4 h-4 text-primary" />
              <p className="text-[14px] font-bold text-foreground">We are currently in Phase 1</p>
            </div>
            <div className="space-y-2">
              {CURRENT_PHASES.map(p => (
                <div key={p.phase} className="flex items-center gap-3">
                  {p.active
                    ? <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    : <Clock className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
                  <div>
                    <span className={`text-[14px] font-semibold ${p.active ? 'text-primary' : 'text-muted-foreground'}`}>{p.phase}: </span>
                    <span className={`text-[14px] ${p.active ? 'text-foreground' : 'text-muted-foreground'}`}>{p.label}</span>
                    {p.active && <span className="ml-2 inline-flex text-[14px] font-semibold border border-primary/20 bg-primary/10 text-primary rounded-full px-2 py-0.5">Current</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interim action */}
          <div className="rounded-xl border border-[#FFD08A] bg-[#FFF3E0] px-5 py-4">
            <p className="text-[14px] font-semibold text-[#CC8400] mb-1">Interim: Use Submit Change Request</p>
            <p className="text-[14px] text-[#CC8400] leading-relaxed mb-3">
              Until Content Requests is connected to Demand Management, submit content change requests through the existing Change Request form. These will be tracked manually by the Operations Lead.
            </p>
            <button
              onClick={() => setLocation('/demand/change-request')}
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#CC8400] hover:underline"
            >
              Submit Change Request <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Future capabilities */}
          <section>
            <p className="text-[14px] font-bold text-muted-foreground/60 mb-3">Future Content Request Types</p>
            <div className="space-y-2">
              {FUTURE_CAPABILITIES.map(cap => (
                <div key={cap.label} className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
                  <Clock className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{cap.label}</p>
                    <p className="text-[14px] text-muted-foreground mt-0.5 leading-relaxed">{cap.desc}</p>
                  </div>
                  <span className="ml-auto inline-flex flex-shrink-0 text-[14px] font-medium text-muted-foreground border border-border bg-muted/40 rounded-full px-2 py-0.5">Future</span>
                </div>
              ))}
            </div>
          </section>

          <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4">
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              <strong>Planned integration —</strong> Content Requests will connect to Demand Management in Phase 5. Each request will auto-create a Salesforce Case, generate a linked Epic in the Demand backlog, and route for Operations Lead triage.
            </p>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
