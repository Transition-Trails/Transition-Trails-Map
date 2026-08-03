import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GraduationCap, BookOpen, Sparkles, Radio, AlertTriangle, ArrowRight, CheckCircle2, Zap, Layers } from 'lucide-react';
import { curriculumModules, curriculumPrograms, curriculumHealthIssues } from '@/data/curriculumData';
import { SampleDataBadge } from '@/components/ui/SampleDataBadge';

const ARCHITECTURE_LAYERS = [
  { id: 'structure', label: 'Program Structure', color: 'border-primary/30 bg-primary/5 text-primary', chipColor: 'bg-primary/10 text-primary border-primary/20', icon: GraduationCap, items: ['Programs', 'Cohorts', 'Sprints', 'Modules'], path: '/curriculum/modules' },
  { id: 'learning', label: 'Learning Assets', color: 'border-[#FFD08A] bg-[#FFF3E0]/50 text-[#CC8400]', chipColor: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]', icon: BookOpen, items: ['Lessons', 'Assessments', 'Knowledge Articles', 'Resources'], path: '/curriculum/lessons' },
  { id: 'penny', label: 'Penny Assets', color: 'border-secondary/30 bg-secondary/5 text-secondary', chipColor: 'bg-secondary/10 text-secondary border-secondary/20', icon: Sparkles, items: ['Coaching Prompts', 'Reflection Prompts', 'Trail Quests', 'Weekly Reviews'], path: '/curriculum/coaching-prompts' },
  { id: 'delivery', label: 'Delivery Assets', color: 'border-green-300 bg-[#E6F0EA]/50 text-[#245531]', chipColor: 'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]', icon: Radio, items: ['Slack Activities', 'Google Chat', 'Calendar Events', 'Office Hours'], path: '/curriculum/slack-activities' },
];

export default function CurriculumOverview() {
  const [, setLocation] = useLocation();
  const mod21 = curriculumModules.find(m => m.id === 'mod-2-1')!;
  const highIssues = curriculumHealthIssues.filter(h => h.severity === 'high');
  const published = curriculumModules.filter(m => m.status === 'published').length;
  const fullyConnected = curriculumModules.filter(m =>
    (m.lessonIds as string[]).length > 0 && (m.assessmentIds as string[]).length > 0 &&
    (m.knowledgeArticleIds as string[]).length > 0 && (m.coachingPromptIds as string[]).length > 0
  ).length;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-7">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[14px] font-bold  text-muted-foreground/60">Curriculum Studio</p>
            <SampleDataBadge />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Learning Architecture Workspace</h1>
          <p className="text-[14px] text-muted-foreground mt-2 max-w-2xl">
            Model relationships between Program Structure, Learning Assets, Penny Assets, and Delivery Assets so staff can build
            consistent, standards-based curriculum. Consistency comes from <strong>relationships</strong>, not templates.
          </p>
        </div>

        <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-[#CC8400] mt-0.5 shrink-0" />
          <p className="text-[14px] text-[#CC8400]">
            <strong>Prototype — Content Architecture Layer.</strong> Foundations Trail is the primary fully-connected example.
            All 12 modules model the four-layer relationship architecture. Module 2.1 is the standards reference.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Programs', value: String(curriculumPrograms.length), sub: `${curriculumPrograms.filter(p => p.status === 'published').length} published` },
            { label: 'Modules', value: String(curriculumModules.length), sub: `${published} published` },
            { label: 'Fully Connected', value: String(fullyConnected), sub: 'of ' + curriculumModules.length + ' modules' },
            { label: 'Health Issues', value: String(curriculumHealthIssues.length), sub: `${highIssues.length} high priority` },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-white px-4 py-3">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[14px] font-semibold text-foreground/70">{s.label}</p>
              <p className="text-[14px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-[14px] font-bold  text-muted-foreground/60">Four-Layer Architecture</p>
          <p className="text-[14px] text-muted-foreground">Module is the central connective node — it links all four asset layers into a complete learning experience.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ARCHITECTURE_LAYERS.map(layer => {
              const Icon = layer.icon;
              return (
                <button key={layer.id} onClick={() => setLocation(layer.path)} className={`rounded-lg border-2 p-4 text-left transition-all hover:shadow-sm ${layer.color}`}>
                  <div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4" /><span className="text-[14px] font-bold">{layer.label}</span></div>
                  <div className="flex flex-wrap gap-1">
                    {layer.items.map(item => (
                      <span key={item} className={`text-[14px] font-medium border rounded-full px-2 py-0.5 ${layer.chipColor}`}>{item}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 px-5 py-4">
          <p className="text-[14px] font-bold  text-primary/60 mb-1">The Relationship Principle</p>
          <p className="text-[14px] font-semibold text-foreground mb-1">
            A fully-connected module has: lessons → assessment → knowledge articles → coaching prompts → reflection prompts → delivery activities → outcomes.
          </p>
          <p className="text-[14px] text-muted-foreground">
            When staff select any object, the Knowledge Brief rail shows all related objects across all four layers — not just the object's properties.
          </p>
        </div>

        {mod21 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-bold  text-muted-foreground/60">Fully-Connected Example</p>
              <span className="text-[14px] font-bold text-primary border border-primary/20 bg-primary/5 rounded-full px-2 py-0.5">★ Module 2.1 — Foundations Trail</span>
            </div>
            <div className="rounded-lg border-2 border-[#7FAFC6] bg-[#EDF5F8]/30 p-4">
              <p className="text-[14px] font-bold text-[#2F6F7E] mb-3">{mod21.name as string} · {mod21.sprint as string}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { label: 'Lessons', count: (mod21.lessonIds as string[]).length, path: '/curriculum/lessons' },
                  { label: 'Assessment', count: (mod21.assessmentIds as string[]).length, path: '/curriculum/assessments' },
                  { label: 'KB Articles', count: (mod21.knowledgeArticleIds as string[]).length, path: '/curriculum/knowledge-articles' },
                  { label: 'Coaching Prompts', count: (mod21.coachingPromptIds as string[]).length, path: '/curriculum/coaching-prompts' },
                  { label: 'Reflection Prompts', count: (mod21.reflectionPromptIds as string[]).length, path: '/curriculum/reflection-prompts' },
                  { label: 'Delivery Assets', count: (mod21.slackActivityIds as string[]).length + (mod21.calendarEventIds as string[]).length, path: '/curriculum/slack-activities' },
                ].map(rel => (
                  <button key={rel.label} onClick={() => setLocation(rel.path)} className="flex items-center gap-2 rounded-md border border-[#7FAFC6] bg-white px-3 py-2 text-left hover:border-[#7FAFC6] transition-colors">
                    <CheckCircle2 className="w-3 h-3 text-[#2F6B3F] shrink-0" />
                    <span className="text-[14px] font-medium text-[#2F6F7E]">{rel.count} {rel.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[14px] text-[#2F6F7E] mt-2 italic">Use Module 2.1 as the content architecture standard — all future modules should reach this level of completeness.</p>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-secondary/30 bg-secondary/5 px-5 py-4 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-[14px] font-bold text-foreground">Penny Content Assistant</p>
            <p className="text-[14px] text-muted-foreground mt-0.5">Select any learning object and use Penny to generate outlines, draft lessons, create assessments, write prompts, and more. Penny works as curriculum architect and content co-author.</p>
          </div>
          <button onClick={() => setLocation('/curriculum/penny-assistant')} className="flex items-center gap-1.5 text-[14px] font-semibold text-secondary border border-secondary/30 rounded-full px-3 py-1.5 hover:bg-secondary/10 transition-colors whitespace-nowrap">
            Open <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {highIssues.length > 0 && (
          <div className="space-y-2">
            <p className="text-[14px] font-bold  text-muted-foreground/60">High-Priority Health Issues</p>
            {highIssues.map(issue => (
              <div key={issue.id} className="flex items-start gap-3 rounded-lg border border-[#E8B9B4] bg-[#FBEAE6]/50 px-4 py-3">
                <AlertTriangle className="w-3.5 h-3.5 text-[#A93F2F] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-[#A93F2F]">{issue.name as string}</p>
                  <p className="text-[14px] text-[#A93F2F]">{issue.actionRequired as string}</p>
                </div>
              </div>
            ))}
            <button onClick={() => setLocation('/curriculum/content-health')} className="text-[14px] text-primary font-medium flex items-center gap-1 hover:underline">View all health issues <ArrowRight className="w-3 h-3" /></button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pb-4">
          {[
            { label: 'Modules', path: '/curriculum/modules', desc: 'Relationship health map' },
            { label: 'Penny Content Assistant', path: '/curriculum/penny-assistant', desc: 'Generate curriculum content' },
            { label: 'Consistency Review', path: '/curriculum/consistency-review', desc: 'Gap analysis by program' },
            { label: 'Content Health', path: '/curriculum/content-health', desc: 'All health issues' },
            { label: 'Generated Outputs', path: '/curriculum/generated-outputs', desc: 'Module 2.1 sample output' },
            { label: 'Action Library', path: '/curriculum/penny-actions', desc: '11 prototype actions' },
          ].map(link => (
            <button key={link.path} onClick={() => setLocation(link.path)} className="rounded-lg border border-border bg-white px-4 py-3 text-left hover:border-primary/30 hover:bg-primary/5 transition-colors">
              <div className="flex items-center gap-1.5 mb-0.5"><Zap className="w-3 h-3 text-primary" /><span className="text-[14px] font-semibold text-foreground">{link.label}</span></div>
              <p className="text-[14px] text-muted-foreground">{link.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
