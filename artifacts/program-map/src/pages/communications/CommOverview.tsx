import { Database, Sparkles, MessageSquare, ArrowRight, Bell, FileText, Radio, CalendarDays, Hash, Users } from 'lucide-react';
import { TERMS } from '@/config/terminology';
import { useLocation } from 'wouter';

const WHAT_IT_DOES = [
  {
    icon: Users,
    label: 'Providers',
    desc: 'Slack (community), Google Chat (client), Google Calendar (timing) — three focused tools, not a general-purpose adapter.',
    path: '/communications/providers',
  },
  {
    icon: Hash,
    label: 'Channels & Spaces',
    desc: 'Slack channels for learners, coaches, and ops. Google Chat Spaces for clients, Digital Compass, and executive sponsors.',
    path: '/communications/channels',
  },
  {
    icon: CalendarDays,
    label: 'Calendar',
    desc: 'Google Calendar as the operational timing layer — cohort starts, UAT sessions, sprint reviews, and brief schedules.',
    path: '/communications/calendar',
  },
  {
    icon: Radio,
    label: `${TERMS.aiAssistant} Broadcasts`,
    desc: 'Calendar-aware learner nudges, Trail Quest prompts, Trail Wins, reminders, and celebrations via Slack.',
    path: '/communications/penny-broadcasts',
  },
  {
    icon: CalendarDays,
    label: 'Weekly Briefs',
    desc: 'Auto-generated executive and coach digests delivered to Slack and Google Chat, triggered by the Operations Calendar.',
    path: '/communications/weekly-briefs',
  },
  {
    icon: Bell,
    label: 'Notifications',
    desc: 'Routing rules combining audience, timing, and provider — Slack for community, Google Chat for clients, Calendar for timing.',
    path: '/communications/notifications',
  },
  {
    icon: FileText,
    label: 'Message Templates',
    desc: 'Reusable templates for Slack, Google Chat, and Calendar-triggered reminders.',
    path: '/communications/message-templates',
  },
];

const PROVIDERS = [
  {
    label: 'Slack',
    role: 'Community & Program',
    note: 'Planned · Primary Prototype',
    desc: `Learners, coaches, cohorts, ops alerts, Trail Wins, Trail Quests, ${TERMS.aiAssistant} nudges`,
    color: 'border-primary/30 bg-primary/5 text-primary',
    noteCls: 'text-primary/70',
  },
  {
    label: 'Google Chat',
    role: 'Client & Project',
    note: 'Future Supported',
    desc: 'Nonprofit clients, Digital Compass, executive sponsors, steering committees',
    color: 'border-border bg-white text-foreground',
    noteCls: 'text-muted-foreground',
  },
  {
    label: 'Google Calendar',
    role: 'Operational Timing',
    note: 'Future · Collaboration Source',
    desc: 'Cohort starts, sprint reviews, UAT sessions, brief schedules, office hours',
    color: 'border-[#9FC3AE] bg-[#E6F0EA] text-[#245531]',
    noteCls: 'text-[#2F6B3F]/70',
  },
];

const MENTAL_MODEL = [
  { label: 'Knowledge Library', role: 'what', note: `The content — docs, templates, ${TERMS.aiAssistant} context`, color: 'border-secondary/30 bg-secondary/5 text-secondary' },
  { label: 'Salesforce / Demand', role: 'work', note: 'The cases — intake, epics, features, changes', color: 'border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400]' },
  { label: 'Communications', role: 'who', note: 'The message — who gets what, through which channel', color: 'border-primary/30 bg-primary/5 text-primary' },
  { label: 'Calendar', role: 'when', note: 'The timing — when communications fire based on events', color: 'border-[#9FC3AE] bg-[#E6F0EA] text-[#245531]' },
];

export default function CommOverview() {
  const [, setLocation] = useLocation();

  return (
    <div className="h-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-1">Communications & Collaboration</p>
          <h1 className="text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed max-w-2xl">
            The messaging and timing layer for Trail OS and {TERMS.aiAssistant} — routing program signals, learner nudges, and weekly briefs to the right people, through the right channel, at the right moment.
          </p>
        </div>

        {/* Operating model */}
        <section className="rounded-xl border border-border bg-white shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-foreground">The Operating Model</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MENTAL_MODEL.map(m => (
              <div key={m.role} className={`rounded-lg border px-3 py-3 ${m.color}`}>
                <p className="text-[14px] font-bold  opacity-70">{m.role}</p>
                <p className="text-[14px] font-bold mt-0.5">{m.label}</p>
                <p className="text-[14px] mt-1 opacity-70 leading-relaxed">{m.note}</p>
              </div>
            ))}
          </div>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Communications is the <strong>who</strong> layer. It is not a chat product — it is an adapter and routing system that connects Trail OS events to the right people through Slack, Google Chat, and Google Calendar. The provider can change; the routing logic stays the same.
          </p>
        </section>

        {/* Architecture */}
        <section>
          <h2 className="text-sm font-bold  text-muted-foreground/60 mb-4">Message Flow</h2>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            {[
              { icon: Database, label: 'Trail OS', sub: 'events', color: 'text-primary' },
              { icon: Sparkles, label: TERMS.aiAssistant, sub: 'composes', color: 'text-secondary' },
              { icon: FileText, label: 'Templates', sub: 'formats', color: 'text-foreground/60' },
              { icon: MessageSquare, label: 'Provider', sub: 'delivers', color: 'text-foreground/60' },
              { icon: Bell, label: 'Channel', sub: 'receives', color: 'text-foreground/60' },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center gap-2">
                  {i > 0 && <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />}
                  <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-white px-3 py-2 shadow-sm">
                    <Icon className={`w-3.5 h-3.5 ${step.color}`} />
                    <span className="text-[14px] font-semibold text-foreground">{step.label}</span>
                    <span className="text-[14px] text-muted-foreground/60 ">{step.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Provider summary */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold  text-muted-foreground/60">Providers</h2>
            <button
              onClick={() => setLocation('/communications/providers')}
              className="text-[14px] font-medium text-primary hover:underline flex items-center gap-1"
            >
              View all providers <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {PROVIDERS.map(p => (
              <div key={p.label} className={`rounded-lg border px-4 py-3 ${p.color}`}>
                <div className="flex items-baseline justify-between gap-1 mb-1">
                  <p className="font-bold text-sm">{p.label}</p>
                  <span className={`text-[14px] font-semibold  shrink-0 ${p.noteCls}`}>{p.role}</span>
                </div>
                <p className={`text-[14px] font-medium  mb-1.5 ${p.noteCls}`}>{p.note}</p>
                <p className="text-[14px] opacity-80 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What lives here */}
        <section>
          <h2 className="text-sm font-bold  text-muted-foreground/60 mb-4">What Lives Here</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {WHAT_IT_DOES.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => setLocation(item.path)}
                  className="rounded-xl border border-border bg-white shadow-sm p-4 text-left hover:border-primary/30 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                    <span className="font-bold text-[14px] text-foreground">{item.label}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground/30 ml-auto group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4">
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            <strong>Slack live</strong> (@penny). Google Calendar connected. Google Chat: Phase 2. Configuration managed in Administration → Integrations.
          </p>
        </div>

      </div>
    </div>
  );
}
