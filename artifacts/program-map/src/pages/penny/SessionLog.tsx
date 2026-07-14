import { CalendarDays, Clock, Users, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const SESSION_TYPES = [
  { label: 'Log Office Hours',      icon: Clock        },
  { label: 'Log Campfire Session',  icon: Users        },
  { label: 'Log Private Session',   icon: CalendarDays },
];

export default function SessionLog() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl space-y-6">

        {/* Coming-soon banner */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-amber-50 border-amber-200 text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] font-semibold">
            Coming soon — Salesforce wiring in progress
          </span>
        </div>

        {/* Title + description */}
        <div>
          <h1 className="text-base font-semibold text-foreground">Session Log</h1>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
            Log and review coaching sessions — office hours, campfire, and private sessions.
            This page will connect to Salesforce once the Session Log object is built.
          </p>
        </div>

        {/* Log a session card */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Log a Session
          </p>
          <div className="flex flex-wrap gap-2">
            {SESSION_TYPES.map(({ label, icon: Icon }) => (
              <button
                key={label}
                disabled
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium border border-border/50 text-muted-foreground/40 bg-muted/20 cursor-not-allowed select-none"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            Session logging will be enabled once the Salesforce Session Log object is ready.
          </p>
        </div>

        {/* My Sessions empty state */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            My Sessions
          </p>
          <div className="py-10 flex flex-col items-center gap-2 text-center">
            <CalendarDays className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-[12px] text-muted-foreground/50 max-w-xs leading-relaxed">
              Your session history will appear here once the Session Log object is live in Salesforce.
            </p>
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
