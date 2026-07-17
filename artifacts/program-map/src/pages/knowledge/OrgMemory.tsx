import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TERMS } from '@/config/terminology';
import { Users, BookOpen, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SfProgram {
  Id: string;
  Name: string;
  pmdm__Status__c: string | null;
  pmdm__ShortSummary__c: string | null;
}

interface WeeklyReport {
  id?: string;
  week?: string;
  title?: string;
  summary?: string;
  highlights?: string[];
  createdAt?: string;
}

interface SfCase {
  Id: string;
  CaseNumber?: string;
  Subject?: string;
  Status?: string;
  Priority?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
      {children}
    </p>
  );
}

function PanelCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-background p-4 space-y-3 ${className}`}>
      {children}
    </div>
  );
}

// ── Panel 1: Active Programs ──────────────────────────────────────────────────

function ProgramsPanel() {
  const { data, isLoading, isError } = useQuery<{ programs: SfProgram[]; total: number }>({
    queryKey: ['sf-programs-memory'],
    queryFn: () => fetch('/api/programs').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <PanelCard>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-violet-50 flex items-center justify-center">
          <BookOpen className="w-3.5 h-3.5 text-violet-500" />
        </div>
        <Eyebrow>Active Programs</Eyebrow>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Loading from Salesforce…</span>
        </div>
      )}
      {isError && (
        <p className="text-[11px] text-muted-foreground/60 italic">Could not load programs — SF connection unavailable.</p>
      )}
      {data && (
        <>
          <p className="text-[11px] text-muted-foreground">
            <span className="text-xl font-bold text-foreground">{data.total}</span>
            {' '}program{data.total !== 1 ? 's' : ''} in Salesforce
          </p>
          <div className="space-y-1.5">
            {data.programs.slice(0, 6).map(p => (
              <div key={p.Id} className="flex items-center gap-2.5 py-1.5 border-b border-border/40 last:border-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  p.pmdm__Status__c === 'Active' ? 'bg-emerald-400' : 'bg-muted-foreground/30'
                }`} />
                <span className="text-[11px] text-foreground flex-1 truncate">{p.Name}</span>
                {p.pmdm__Status__c && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{p.pmdm__Status__c}</span>
                )}
              </div>
            ))}
            {data.programs.length > 6 && (
              <p className="text-[10px] text-muted-foreground/60 pt-0.5">
                +{data.programs.length - 6} more in Salesforce
              </p>
            )}
          </div>
        </>
      )}
    </PanelCard>
  );
}

// ── Panel 2: Recent Intelligence ─────────────────────────────────────────────

function IntelligencePanel() {
  const { data, isLoading, isError } = useQuery<{ reports?: WeeklyReport[] } | WeeklyReport[]>({
    queryKey: ['penny-weekly-reports-memory'],
    queryFn: () => fetch('/api/penny/data/weekly-reports').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const reports: WeeklyReport[] = Array.isArray(data) ? data : (data as { reports?: WeeklyReport[] })?.reports ?? [];
  const recent = reports.slice(0, 3);

  return (
    <PanelCard>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-sky-50 flex items-center justify-center">
          <Users className="w-3.5 h-3.5 text-sky-500" />
        </div>
        <Eyebrow>Recent {TERMS.aiAssistant} Intelligence</Eyebrow>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Loading weekly reports…</span>
        </div>
      )}
      {isError && (
        <p className="text-[11px] text-muted-foreground/60 italic">Could not load weekly reports.</p>
      )}
      {!isLoading && !isError && recent.length === 0 && (
        <p className="text-[11px] text-muted-foreground/60 italic">No weekly reports yet.</p>
      )}
      {recent.length > 0 && (
        <div className="space-y-2">
          {recent.map((r, i) => (
            <div key={r.id ?? i} className="rounded-md border border-border/60 bg-muted/10 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold text-foreground truncate">
                  {r.title ?? r.week ?? `Report ${i + 1}`}
                </span>
                {r.week && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{r.week}</span>
                )}
              </div>
              {r.summary && (
                <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{r.summary}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

// ── Panel 3: Open Cases ───────────────────────────────────────────────────────

function CasesPanel() {
  const [, setLocation] = useLocation();
  const { data, isLoading, isError } = useQuery<{ cases?: SfCase[]; total?: number } | SfCase[]>({
    queryKey: ['sf-cases-memory'],
    queryFn: () => fetch('/api/salesforce/operations/cases').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const cases: SfCase[] = Array.isArray(data) ? data : (data as { cases?: SfCase[] })?.cases ?? [];
  const total: number = Array.isArray(data) ? data.length : (data as { total?: number })?.total ?? cases.length;
  const openCases = cases.filter(c => c.Status !== 'Closed').slice(0, 4);

  return (
    <PanelCard>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <Eyebrow>Open Support Cases</Eyebrow>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Loading from Salesforce…</span>
        </div>
      )}
      {isError && (
        <p className="text-[11px] text-muted-foreground/60 italic">Could not load cases — SF connection unavailable.</p>
      )}
      {!isLoading && !isError && (
        <>
          <p className="text-[11px] text-muted-foreground">
            <span className="text-xl font-bold text-foreground">{total}</span> open case{total !== 1 ? 's' : ''} in Salesforce
          </p>
          {openCases.length > 0 && (
            <div className="space-y-1.5">
              {openCases.map(c => (
                <div key={c.Id} className="flex items-center gap-2.5 py-1.5 border-b border-border/40 last:border-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    c.Priority === 'High' ? 'bg-rose-400' :
                    c.Priority === 'Medium' ? 'bg-amber-400' : 'bg-sky-400'
                  }`} />
                  <span className="text-[11px] text-foreground flex-1 truncate">{c.Subject ?? `Case ${c.CaseNumber}`}</span>
                  {c.Status && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{c.Status}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setLocation('/operations/demand')}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline mt-1"
          >
            View all in Operations <ChevronRight className="w-3 h-3" />
          </button>
        </>
      )}
    </PanelCard>
  );
}

// ── Phase 2 Feature Cards ─────────────────────────────────────────────────────

const FUTURE_SECTIONS = [
  { title: 'Decisions',            desc: 'Key organizational decisions with rationale, owner, impact, and review dates.' },
  { title: 'Program History',      desc: 'Major program evolution — launches, retirements, redesigns, and cohort milestones.' },
  { title: 'Standards History',    desc: `Changes to Program, Module, Assessment, Knowledge, ${TERMS.aiAssistant}, and Communication Blueprints.` },
  { title: 'Architecture History', desc: 'Trail OS architecture decisions — platform choices, naming conventions, structural design.' },
  { title: `${TERMS.aiAssistant} History`, desc: `Capability, prompt, and governance evolution — what ${TERMS.aiAssistant} could do and when.` },
  { title: 'Lessons Learned',      desc: 'Retrospective insights from programs, curriculum, operations, and integrations.' },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function OrgMemory() {
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5 max-w-3xl">

        {/* ── Header ── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
            Knowledge Library
          </p>
          <h1 className="text-base font-semibold text-foreground">Org Memory</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Live program data, recent {TERMS.aiAssistant} intelligence, and operational signals — the institutional pulse of {TERMS.platform}.
          </p>
        </div>

        {/* ── Live panels ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProgramsPanel />
          <CasesPanel />
        </div>
        <IntelligencePanel />

        {/* ── Phase 2 feature cards ── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2 mt-4">
            Phase 2 — Full Memory Studio
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {FUTURE_SECTIONS.map(s => (
              <div key={s.title} className="rounded-lg border border-border bg-background p-3">
                <p className="text-[12px] font-semibold text-foreground mb-0.5">{s.title}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
