import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { curriculumPennyTemplates, pennyAssistantActions, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Sparkles, ArrowRight, Zap, AlertTriangle } from 'lucide-react';

export default function PennyTemplates() {
  const { setSelectedItem } = useAppContext();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  return (
    <div className="h-full w-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-8">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Penny Templates</h1>
          <p className="text-muted-foreground mt-2">Structured output templates Penny uses to generate learner messages, coach notes, reflection prompts, and Slack messages. Use the Penny Content Assistant below to generate new content.</p>
        </div>

        {/* Penny Content Assistant */}
        <section className="rounded-xl border border-secondary/30 bg-secondary/5 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-secondary" />
            <h2 className="text-[13px] font-bold text-foreground">Penny Content Assistant</h2>
            <span className="inline-flex text-[10px] font-semibold border border-amber-200 bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">Future State</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
            Request Penny to generate curriculum content — modules, lessons, assessments, articles, prompts, and messages — with Foundations Trail uniformity standards applied automatically.
            All generated content is marked as draft and requires Curriculum Lead review before publishing.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {pennyAssistantActions.map(action => (
              <button
                key={action.id}
                onClick={() => setActiveAction(activeAction === action.id ? null : action.id)}
                className={`text-left rounded-lg border p-3 transition-all ${
                  activeAction === action.id
                    ? 'border-secondary bg-secondary/10'
                    : 'border-secondary/20 bg-white hover:border-secondary/50 hover:bg-secondary/5'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                  <p className="text-[12px] font-semibold text-foreground">{action.label}</p>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{action.description}</p>
                {activeAction === action.id && (
                  <div className="mt-2 pt-2 border-t border-secondary/20">
                    <div className="rounded-md bg-white border border-secondary/20 px-3 py-2">
                      <p className="text-[10px] font-semibold text-secondary mb-1">Future State — Penny Integration Required</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{action.notes}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span>Audience: <strong>{action.targetAudience}</strong></span>
                        <span>·</span>
                        <span>Est. time: <strong>{action.estimatedTime}</strong></span>
                      </div>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Template library */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Template Library</h2>
          <div className="space-y-3">
            {curriculumPennyTemplates.map(tmpl => {
              const statusCfg = CONTENT_STATUS_CONFIG[tmpl.status];
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedItem({ type: 'curriculumItem', id: tmpl.id, data: tmpl })}
                  className="w-full text-left rounded-xl border border-border bg-white hover:border-secondary/40 hover:bg-secondary/5 transition-all p-4 group shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-[13px] font-bold text-foreground">{tmpl.name as string}</p>
                        <span className={`inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                        <span className="inline-flex text-[10px] font-medium text-secondary border border-secondary/20 bg-secondary/10 rounded-full px-2 py-0.5">{tmpl.templateType as string}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2 line-clamp-2">{tmpl.purpose as string}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>Trigger: <span className="text-foreground">{tmpl.triggerContext as string}</span></span>
                        <span>·</span>
                        <span>Audience: <span className="text-foreground">{tmpl.targetAudience as string}</span></span>
                        <span>·</span>
                        <span>Tone: <span className="italic">{tmpl.tone as string}</span></span>
                      </div>
                      <div className="mt-2 bg-muted/40 border border-border/60 rounded-md px-3 py-2">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1">Sample Output</p>
                        <p className="text-[11px] text-foreground leading-relaxed line-clamp-2 italic">{tmpl.sampleOutput as string}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-secondary flex-shrink-0 mt-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Future state —</strong> Penny Content Assistant actions will connect to Agentforce or the Penny POC API to generate content in real time. Generated drafts will be stored in the Penny Template library pending Curriculum Lead review. Slack and Google Chat outputs will route through the Communications layer.
          </p>
        </div>

      </div>
    </div>
  );
}
