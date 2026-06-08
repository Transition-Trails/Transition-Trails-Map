import { Database, Sparkles, MessageSquare, ArrowRight, Bell, FileText, Radio, CalendarDays } from 'lucide-react';
import { useLocation } from 'wouter';

const WHAT_IT_DOES = [
  {
    icon: Radio,
    label: 'Penny Broadcasts',
    desc: 'Automated messages Penny sends to learners and coaches — reminders, nudges, celebrations, and prompts.',
    path: '/communications/penny-broadcasts',
  },
  {
    icon: CalendarDays,
    label: 'Weekly Briefs',
    desc: 'Auto-generated executive and coach digests covering program health, learner insights, and Penny recommendations.',
    path: '/communications/weekly-briefs',
  },
  {
    icon: Bell,
    label: 'Notifications',
    desc: 'Event-driven routing rules that send Trail OS and Penny signals to the right channel at the right time.',
    path: '/communications/notifications',
  },
  {
    icon: FileText,
    label: 'Message Templates',
    desc: 'Reusable, reviewable message templates for broadcasts, briefs, and notifications across all providers.',
    path: '/communications/message-templates',
  },
];

const PROVIDERS = [
  { label: 'Slack', note: 'Planned · Primary Prototype', color: 'border-primary/30 bg-primary/5 text-primary' },
  { label: 'Google Chat', note: 'Future', color: 'border-border bg-muted/40 text-muted-foreground' },
  { label: 'Microsoft Teams', note: 'Future', color: 'border-border bg-muted/40 text-muted-foreground' },
  { label: 'Email', note: 'Future', color: 'border-border bg-muted/40 text-muted-foreground' },
];

export default function CommOverview() {
  const [, setLocation] = useLocation();

  return (
    <div className="h-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Communications</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Communications Hub</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed max-w-2xl">
            The operational messaging layer for Trail OS and Penny — routing program signals, learner nudges, and weekly briefs to the right people through the right channels.
          </p>
        </div>

        {/* What it is */}
        <section className="rounded-xl border border-border bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="font-bold text-foreground text-lg">What is the Communications Hub?</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Communications is the layer that connects Trail OS and Penny to your team's existing messaging tools. It is not itself a chat product — it is an adapter system. Slack is the first planned adapter. Google Chat, Microsoft Teams, and Email can be plugged in later without redesigning how broadcasts, briefs, or notifications are configured.
              </p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Every message that Trail OS or Penny sends — a learner nudge, a coach alert, a weekly brief — is configured as a template routed through a provider to a destination channel. The provider can change; the template and routing logic stay the same.
              </p>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Architecture</h2>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-white px-4 py-2.5 shadow-sm">
              <Database className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">Trail OS</span>
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider ml-1">events</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-white px-4 py-2.5 shadow-sm">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span className="font-semibold text-foreground">Penny</span>
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider ml-1">composes</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-white px-4 py-2.5 shadow-sm">
              <FileText className="w-4 h-4 text-foreground/60" />
              <span className="font-semibold text-foreground">Templates</span>
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider ml-1">formatted by</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-white px-4 py-2.5 shadow-sm">
              <MessageSquare className="w-4 h-4 text-foreground/60" />
              <span className="font-semibold text-foreground">Provider</span>
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider ml-1">delivered via</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-white px-4 py-2.5 shadow-sm">
              <Bell className="w-4 h-4 text-foreground/60" />
              <span className="font-semibold text-foreground">Channel</span>
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider ml-1">to destination</span>
            </div>
          </div>
        </section>

        {/* Provider status */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Providers</h2>
            <button
              onClick={() => setLocation('/communications/providers')}
              className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
            >
              View all providers <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PROVIDERS.map(p => (
              <div key={p.label} className={`rounded-lg border px-4 py-3 ${p.color}`}>
                <p className="font-bold text-sm">{p.label}</p>
                <p className="text-[10px] mt-0.5 opacity-80">{p.note}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-2">
            Slack is the first planned adapter. The hub is designed provider-agnostic — Google Chat, Teams, and Email can be added without redesigning templates, routing, or broadcasts.
          </p>
        </section>

        {/* What it does */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">What Lives Here</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {WHAT_IT_DOES.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => setLocation(item.path)}
                  className="rounded-xl border border-border bg-white shadow-sm p-5 text-left hover:border-primary/30 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-foreground">{item.label}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground/40 ml-auto group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Setup status */}
        <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Prototype mode —</strong> No live API connections are active. All providers, channels, broadcasts, and templates shown are planned configuration. Slack adapter development planned Q3 2025. Additional providers follow.
          </p>
        </div>

      </div>
    </div>
  );
}
