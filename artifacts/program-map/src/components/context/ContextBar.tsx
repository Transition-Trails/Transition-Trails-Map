// Workspace Context Engine — persistent context bar
// Sits between Topbar and the main content area.
// Zero height when no context is active.
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Target, ChevronDown, X, ExternalLink, Clock } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import type { ActiveContext } from '@/context/AppContext';
import { EXAMPLE_CONTEXTS } from '@/data/contextEngineData';

function HealthDot({ health }: { health?: string }) {
  const cls =
    health === 'healthy'         ? 'bg-emerald-400' :
    health === 'needs-attention' ? 'bg-amber-400'   :
    health === 'incomplete'      ? 'bg-rose-400'    : 'bg-gray-300';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${cls}`} />;
}

export function ContextBar() {
  const { activeContext, setActiveContext, recentContexts } = useAppContext();
  const [, setLocation] = useLocation();
  const [showSwitcher, setShowSwitcher] = useState(false);

  if (!activeContext) return null;

  function handleSwitch(ctx: ActiveContext) {
    setActiveContext(ctx);
    setShowSwitcher(false);
  }

  function handleClear() {
    setActiveContext(null);
  }

  function handleView() {
    if (activeContext?.workspaceLink) {
      setLocation(activeContext.workspaceLink);
    }
  }

  return (
    <div className="relative shrink-0">
      {/* Bar */}
      <div className="h-[38px] flex items-center gap-2 px-4 bg-primary/8 border-b border-primary/15 text-[11px]">
        <Target className="w-3.5 h-3.5 text-primary shrink-0" />

        {/* Context badge */}
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border shrink-0 ${activeContext.categoryBg} ${activeContext.categoryColor}`}>
          {activeContext.objectTypeName}
        </span>

        {/* Name + health */}
        <span className="font-semibold text-foreground truncate">{activeContext.name}</span>
        <HealthDot health={activeContext.health} />
        {activeContext.health && (
          <span className="text-muted-foreground shrink-0 hidden sm:inline">{activeContext.health.replace('-', ' ')}</span>
        )}

        <span className="text-muted-foreground/40 hidden sm:inline">·</span>
        <span className="text-muted-foreground hidden sm:inline shrink-0">Active context</span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Switch */}
        <button
          onClick={() => setShowSwitcher(s => !s)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
        >
          <Clock className="w-3 h-3" />
          <span className="hidden sm:inline">Switch</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
        </button>

        {/* View in workspace */}
        <button
          onClick={handleView}
          className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded hover:bg-primary/10"
        >
          <ExternalLink className="w-3 h-3" />
          <span className="hidden sm:inline text-[10px] font-semibold">View</span>
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted/50"
          title="Clear context"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Switcher dropdown */}
      {showSwitcher && (
        <div className="absolute top-full left-0 right-0 z-50 bg-card border-b border-border shadow-md">
          <div className="px-4 py-2 border-b border-border/50">
            <p className="text-[9px] font-bold uppercase text-muted-foreground/60">
              {recentContexts.length > 0 ? 'Recent Contexts' : 'Example Contexts'}
            </p>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {/* Recent contexts first */}
            {recentContexts.filter(r => r.id !== activeContext.id).map(ctx => (
              <button
                key={ctx.id}
                onClick={() => handleSwitch(ctx)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 text-left border-b border-border/30 transition-colors"
              >
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border shrink-0 ${ctx.categoryBg} ${ctx.categoryColor}`}>
                  {ctx.objectTypeName}
                </span>
                <span className="text-[12px] font-semibold text-foreground truncate flex-1">{ctx.name}</span>
                <HealthDot health={ctx.health} />
              </button>
            ))}
            {/* Example contexts */}
            {EXAMPLE_CONTEXTS
              .filter(e => e.id !== activeContext.id && !recentContexts.find(r => r.id === e.id))
              .map(ctx => (
                <button
                  key={ctx.id}
                  onClick={() => handleSwitch({
                    id: ctx.id,
                    objectTypeId: ctx.objectTypeId,
                    objectTypeName: ctx.objectTypeName,
                    category: ctx.category,
                    categoryColor: ctx.categoryColor,
                    categoryBg: ctx.categoryBg,
                    name: ctx.name,
                    status: ctx.status,
                    statusVariant: ctx.statusVariant,
                    health: ctx.health,
                    owner: ctx.owner,
                    workspaceLink: ctx.workspaceLink,
                    profileId: ctx.profileId,
                    setAt: new Date().toISOString(),
                  })}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 text-left border-b border-border/30 transition-colors"
                >
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border shrink-0 ${ctx.categoryBg} ${ctx.categoryColor}`}>
                    {ctx.objectTypeName}
                  </span>
                  <span className="text-[12px] font-semibold text-foreground truncate flex-1">{ctx.name}</span>
                  <HealthDot health={ctx.health} />
                </button>
              ))}
          </div>
          <div className="px-4 py-2 text-[10px] text-muted-foreground border-t border-border/50">
            Set context from Global Search or any Universal Object Profile.
          </div>
        </div>
      )}

      {/* Backdrop to close switcher */}
      {showSwitcher && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSwitcher(false)}
        />
      )}
    </div>
  );
}
