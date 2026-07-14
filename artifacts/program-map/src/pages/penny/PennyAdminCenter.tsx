import { useState } from 'react';
import { Settings, Map, Zap, BarChart2, Brain, FlaskConical } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import TrailConfigs from './TrailConfigs';
import TrailQuests from './TrailQuests';
import Intelligence from './Intelligence';
import PennyLogs from './PennyLogs';
import TestPenny from './TestPenny';

// ── Tab definition ─────────────────────────────────────────────────────────────

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  Component: React.ComponentType;
}

const TABS: Tab[] = [
  { id: 'trail-config',  label: 'Trail Config',  icon: Map,          Component: TrailConfigs },
  { id: 'quest-library', label: 'Quest Library', icon: Zap,          Component: TrailQuests  },
  { id: 'intelligence',  label: 'Intelligence',  icon: BarChart2,    Component: Intelligence },
  { id: 'penny-logs',    label: 'Penny Logs',    icon: Brain,        Component: PennyLogs    },
  { id: 'penny-sandbox', label: 'Penny Sandbox', icon: FlaskConical, Component: TestPenny    },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function PennyAdminCenter() {
  // Support ?tab= query param so inbound redirects can deep-link
  const initialTab = (() => {
    const param = new URLSearchParams(window.location.search).get('tab');
    return TABS.find(t => t.id === param)?.id ?? 'trail-config';
  })();

  const [activeTabId, setActiveTabId] = useState<string>(initialTab);
  const active = TABS.find(t => t.id === activeTabId) ?? TABS[0];
  const ActiveComponent = active.Component;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-0 border-b border-border shrink-0 bg-background">
        <div className="flex items-center gap-1.5 mb-3">
          <Settings className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Config Zone
          </span>
        </div>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">
              Penny Command Center
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Trail configuration, quest library, intelligence reports, logs, and Penny sandbox.
            </p>
          </div>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div className="flex gap-0 -mb-px overflow-x-auto scrollbar-none">
          {TABS.map(tab => {
            const Icon  = tab.icon;
            const isAct = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  isAct
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <ActiveComponent key={activeTabId} />
      </div>

    </div>
  );
}
