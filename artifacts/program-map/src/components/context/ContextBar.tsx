// Workspace Context Engine — persistent context bar
// Always visible. Shows active context or a "set context" invitation.
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Target, ChevronDown, X, ExternalLink, Clock, Plus } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import type { ActiveContext } from '@/context/AppContext';
import { EXAMPLE_CONTEXTS } from '@/data/contextEngineData';

// ── Health dot ─────────────────────────────────────────────────────────────
function HealthDot({ health, large }: { health?: string; large?: boolean }) {
  const cls =
    health === 'healthy'         ? 'bg-emerald-400' :
    health === 'needs-attention' ? 'bg-amber-400'   :
    health === 'incomplete'      ? 'bg-rose-400'    : 'bg-gray-300';
  const sz = large ? 'w-2 h-2' : 'w-1.5 h-1.5';
  return <span className={`inline-block rounded-full shrink-0 ${cls} ${sz}`} />;
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status, variant }: { status?: string; variant?: string }) {
  if (!status) return null;
  const color =
    variant === 'active'   ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    variant === 'draft'    ? 'bg-amber-50 text-amber-700 border-amber-200'       :
    variant === 'planning' ? 'bg-sky-50 text-sky-700 border-sky-200'             :
    variant === 'inactive' ? 'bg-gray-100 text-gray-500 border-gray-200'         :
                             'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0 ${color}`}>
      {status}
    </span>
  );
}

// ── No-context bar ─────────────────────────────────────────────────────────
function NoContextBar({ onSet }: { onSet: () => void }) {
  return (
    <div className="h-[32px] flex items-center gap-2 px-4 bg-muted/20 border-b border-border/40 text-[11px]">
      <Target className="w-3 h-3 text-muted-foreground/40 shrink-0" />
      <span className="text-muted-foreground/50">No workspace context</span>
      <div className="flex-1" />
      <button
        onClick={onSet}
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
      >
        <Plus className="w-3 h-3" />
        Set Context
      </button>
    </div>
  );
}

// ── Main bar ───────────────────────────────────────────────────────────────
export function ContextBar() {
  const { activeContext, setActiveContext, recentContexts } = useAppContext();
  const [, setLocation] = useLocation();
  const [showSwitcher, setShowSwitcher] = useState(false);

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

  if (!activeContext) {
    return (
      <NoContextBar onSet={() => setLocation('/context')} />
    );
  }

  return (
    <div className="relative shrink-0">
      {/* Active context bar */}
      <div className="h-[40px] flex items-center gap-2 px-4 bg-primary/8 border-b border-primary/15 text-[11px]">

        {/* Type badge */}
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border shrink-0 ${activeContext.categoryBg} ${activeContext.categoryColor}`}>
          {activeContext.objectTypeName}
        </span>

        {/* Name */}
        <span className="font-semibold text-foreground truncate max-w-[160px]">{activeContext.name}</span>

        {/* Health */}
        <HealthDot health={activeContext.health} />
        {activeContext.health && (
          <span className="text-muted-foreground shrink-0 hidden md:inline capitalize">
            {activeContext.health.replace('-', ' ')}
          </span>
        )}

        {/* Status badge */}
        {activeContext.status && (
          <>
            <span className="text-muted-foreground/30 hidden sm:inline">·</span>
            <StatusBadge status={activeContext.status} variant={activeContext.statusVariant} />
          </>
        )}

        {/* Owner */}
        {activeContext.owner && (
          <>
            <span className="text-muted-foreground/30 hidden lg:inline">·</span>
            <span className="text-muted-foreground hidden lg:inline shrink-0 truncate max-w-[120px]">
              {activeContext.owner}
            </span>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Switch */}
        <button
          onClick={() => setShowSwitcher(s => !s)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
        >
          <Clock className="w-3 h-3" />
          <span className="hidden sm:inline text-[10px]">Switch</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
        </button>

        {/* View in workspace */}
        <button
          onClick={handleView}
          className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded hover:bg-primary/10"
        >
          <ExternalLink className="w-3 h-3" />
          <span className="hidden sm:inline text-[10px] font-semibold">Open</span>
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
              {recentContexts.length > 0 ? 'Recent Contexts' : 'Available Contexts'}
            </p>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {/* Recent first */}
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
                {ctx.status && <StatusBadge status={ctx.status} variant={ctx.statusVariant} />}
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
                  {ctx.status && <StatusBadge status={ctx.status} variant={ctx.statusVariant} />}
                </button>
              ))}
          </div>
          <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Set context from Global Search or any Object Profile.</p>
            <button
              onClick={() => { setShowSwitcher(false); setLocation('/context'); }}
              className="text-[10px] font-semibold text-primary hover:underline"
            >
              Context Engine →
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {showSwitcher && (
        <div className="fixed inset-0 z-40" onClick={() => setShowSwitcher(false)} />
      )}
    </div>
  );
}
