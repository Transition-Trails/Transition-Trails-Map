import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, Activity, FileText, ArrowRight, BarChart2 } from 'lucide-react';

const PREVIEW_CARDS = [
  {
    id: 'learner-trends',
    title: 'Learner Trend Analysis',
    description: 'Week-over-week learner progress across active trails — goal completion rates, momentum indicators, and early risk signals.',
    dataSource: 'Penny_Conversation__c · Salesforce Contacts',
    sprint: 'Sprint 3',
    icon: TrendingUp,
    sample: [
      'Goal completion rate by trail',
      'Week-over-week momentum index',
      'Learners at risk this week',
    ],
  },
  {
    id: 'cohort-health',
    title: 'Cohort Health Signals',
    description: 'Aggregated health indicators per cohort — engagement, pacing, Penny interaction frequency, and coach attention flags.',
    dataSource: 'Penny_Conversation__c · Penny_Trail_Quest_Activity__c',
    sprint: 'Sprint 3',
    icon: Activity,
    sample: [
      'Engagement score by cohort',
      'Quest completion velocity',
      'Attention flags from Penny interactions',
    ],
  },
  {
    id: 'weekly-reports',
    title: 'Weekly Report Archive',
    description: 'Generated and delivered Weekly Intelligence Reports — Gemini-synthesized cohort narratives with Slack delivery confirmation.',
    dataSource: 'Penny_Weekly_Report__c · Slack',
    sprint: 'Sprint 3',
    icon: FileText,
    sample: [
      'Report date + trail cohort',
      'Delivery status: Delivered / Pending',
      'Slack message permalink',
    ],
  },
];

export default function Intelligence() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-3xl space-y-5">

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]">
            Future State
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]">
            Phase 2 · Sprint 3
          </span>
        </div>

        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Penny Intelligence</h2>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
            Aggregated cohort intelligence, learner trend analysis, and Weekly Intelligence Reports — powered by live Salesforce data and Gemini synthesis. Delivered in Sprint 3.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            What will be here
          </p>

          {PREVIEW_CARDS.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.id} className="rounded-lg border border-border bg-white p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-[#EDF5F8] border border-[#EDF5F8] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#2F6F7E]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-[13px] font-semibold text-foreground">{card.title}</p>
                      <span className="text-[9px] font-bold uppercase bg-[#EDF5F8] border border-[#7FAFC6] text-[#2F6F7E] rounded px-1.5 py-0.5">
                        {card.sprint}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{card.description}</p>
                  </div>
                </div>

                <div className="pl-11 space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/50">
                    Sample structure
                  </p>
                  <div className="space-y-1">
                    {card.sample.map(item => (
                      <p key={item} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                        {item}
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 pt-2 border-t border-border/40">
                    <BarChart2 className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    <span className="text-[9px] font-bold uppercase text-muted-foreground/50">Data source:</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{card.dataSource}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-foreground">Phase 2 backlog — fully scoped</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Intelligence is defined in Phase 2 PRD (F-300). Penny Weekly Reports require{' '}
              <span className="font-medium">Penny_Weekly_Report__c</span> schema sign-off before Sprint 3 begins.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
        </div>

      </div>
    </ScrollArea>
  );
}
