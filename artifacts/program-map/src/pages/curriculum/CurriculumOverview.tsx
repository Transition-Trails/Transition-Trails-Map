import { useLocation } from 'wouter';
import { GraduationCap, Layers, Sparkles, CheckCircle2, ArrowRight, AlertTriangle, BookOpen } from 'lucide-react';
import { curriculumPrograms } from '@/data/curriculumData';

const HIERARCHY = [
  { label: 'Program',          color: 'bg-primary/10 text-primary border-primary/20' },
  { label: 'Sprint',           color: 'bg-violet-50 text-violet-800 border-violet-200' },
  { label: 'Module',           color: 'bg-sky-50 text-sky-800 border-sky-200' },
  { label: 'Lesson',           color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { label: 'Assignment',       color: 'bg-orange-50 text-orange-800 border-orange-200' },
  { label: 'Assessment',       color: 'bg-rose-50 text-rose-800 border-rose-200' },
  { label: 'Knowledge Article',color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { label: 'Penny Template',   color: 'bg-secondary/10 text-secondary border-secondary/20' },
  { label: 'Outcome',          color: 'bg-green-50 text-green-800 border-green-200' },
];

const PILLARS = [
  {
    icon: Layers,
    iconCls: 'text-primary',
    bg: 'bg-primary/5 border-primary/20',
    title: 'Program Architecture',
    desc: 'Model the complete content object hierarchy — from Program to Outcome — in a structured, reviewable format. Plan Salesforce and LMS object mappings before build.',
  },
  {
    icon: Sparkles,
    iconCls: 'text-secondary',
    bg: 'bg-secondary/5 border-secondary/20',
    title: 'Penny Content Assistant',
    desc: 'Use Penny to generate modules, lessons, assessments, coach notes, reflection prompts, Slack messages, and knowledge articles — ensuring uniform quality across all programs.',
  },
  {
    icon: CheckCircle2,
    iconCls: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
    title: 'Content Standards',
    desc: 'Enforce standards across all programs: every lesson has an objective, every module has an assessment, every article has an owner. Content Health surfaces gaps automatically.',
  },
];

const ft = curriculumPrograms.find(p => p.id === 'prog-foundations')!;

export default function CurriculumOverview() {
  const [, setLocation] = useLocation();

  return (
    <div className="h-full w-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Curriculum Studio</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed max-w-2xl">
            The curriculum factory for Trail OS — where programs are designed, content is standardized, and Penny responses are generated. Build before governance, create before change management.
          </p>
        </div>

        {/* Prototype notice */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] font-semibold text-amber-900 mb-1">Prototype — Content Architecture Layer</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Curriculum Studio is the pre-governance workspace for designing, building, and standardizing program content.
              Demand Management will later govern new program and change requests — but this prototype focuses on <strong>structure, creation, and content standards first</strong>.
              All data shown is prototype mapping based on Foundations Trail as the primary example.
            </p>
          </div>
        </div>

        {/* Three pillars */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Three Pillars</h2>
          <div className="grid grid-cols-3 gap-4">
            {PILLARS.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.title} className={`rounded-xl border p-5 ${p.bg}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-4 h-4 ${p.iconCls}`} />
                    <p className="text-[13px] font-bold text-foreground">{p.title}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Object hierarchy */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Object Hierarchy</h2>
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <p className="text-[11px] text-muted-foreground mb-4">Every content object in Curriculum Studio maps to a future Salesforce and LMS object — establishing the data architecture before integration.</p>
            <div className="flex items-center gap-1 flex-wrap">
              {HIERARCHY.map((h, i) => (
                <div key={h.label} className="flex items-center gap-1">
                  <span className={`inline-flex items-center text-[11px] font-semibold border rounded-full px-2.5 py-1 ${h.color}`}>{h.label}</span>
                  {i < HIERARCHY.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Foundations Trail stats — prototype example */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Foundations Trail — Prototype Example</h2>
            <button
              onClick={() => setLocation('/curriculum/programs')}
              className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1"
            >
              View all programs <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-4 h-4 text-primary" />
              <p className="text-[13px] font-bold text-foreground">Foundations Trail</p>
              <span className="inline-flex text-[10px] font-semibold border border-green-200 bg-green-50 text-green-700 rounded-full px-2 py-0.5">Published</span>
              <span className="inline-flex text-[10px] font-semibold border border-primary/20 bg-primary/10 text-primary rounded-full px-2 py-0.5">Primary Prototype</span>
            </div>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {[
                { label: 'Sprints',   value: ft.sprintCount },
                { label: 'Modules',   value: ft.moduleCount },
                { label: 'Lessons',   value: ft.lessonCount },
                { label: 'Assignments', value: ft.assignmentCount },
                { label: 'Assessments', value: ft.assessmentCount },
                { label: 'Articles',  value: ft.knowledgeArticleCount },
                { label: 'Templates', value: ft.pennyTemplateCount },
                { label: 'Cohorts',   value: ft.cohortCount },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-bold font-serif text-primary">{s.value as number}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick links */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Studio Areas</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { path: '/curriculum/programs',          label: 'Programs',           desc: '5 programs, Foundations Trail primary example' },
              { path: '/curriculum/sprints',           label: 'Sprints',            desc: '4 sprints mapped to RESOLVE phases' },
              { path: '/curriculum/modules',           label: 'Modules',            desc: '12 modules with learning objectives' },
              { path: '/curriculum/lessons',           label: 'Lessons',            desc: '36 lessons with types and durations' },
              { path: '/curriculum/knowledge-articles', label: 'Knowledge Articles', desc: '10 articles mapped to Salesforce Knowledge' },
              { path: '/curriculum/penny-templates',   label: 'Penny Templates',    desc: '8 templates + Penny Content Assistant' },
              { path: '/curriculum/assessments',       label: 'Assessments',        desc: '11 assessments with passing scores' },
              { path: '/curriculum/content-health',    label: 'Content Health',     desc: '7 issues found — 1 high severity' },
              { path: '/curriculum/content-requests',  label: 'Content Requests',   desc: 'Future: governed by Demand Management' },
            ].map(link => (
              <button
                key={link.path}
                onClick={() => setLocation(link.path)}
                className="text-left rounded-xl border border-border bg-white hover:border-primary/30 hover:bg-primary/5 transition-all p-4 group"
              >
                <p className="text-[13px] font-semibold text-foreground group-hover:text-primary">{link.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{link.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Future state — Demand Management */}
        <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4 flex items-start gap-3">
          <BookOpen className="w-4 h-4 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Future state —</strong> New program requests and program change requests will be governed through Demand Management (Intake → Case → Epic → Feature → Story) once governance workflows are in place. Curriculum Studio is the pre-governance content workspace. Content Requests will connect to the Demand Management pipeline in a future release.
          </p>
        </div>

      </div>
    </div>
  );
}
