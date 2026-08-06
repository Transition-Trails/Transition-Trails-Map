/**
 * CairnBand
 *
 * Today's Trail Quest — collapsible band at the top of the Learner Homebase.
 *
 * States:
 *   loading   — spinner
 *   empty     — "Your first quest will appear here when your program starts."
 *   active    — expanded: quest prompt, cairn SVG, "Set today's stone →" amber CTA
 *   stone-set — compact: "Today's stone is set · N more completes this cairn" + Expand
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Mountain, Sparkles } from "lucide-react";
import type { QuestState, LearnerQuest } from "@/hooks/useHomebaseLearner";
import { useSetStone } from "@/hooks/useHomebaseLearner";
import { useToast } from "@/hooks/use-toast";

// ── Cairn SVG ──────────────────────────────────────────────────────────────────
//
// 7 stacked ellipses, bottom = widest.  Filled amber for set stones, gray
// outline for remaining.  The whole stack is 142px tall × 92px wide.

const STONE_COUNT = 7;
const STONE_WIDTHS  = [88, 80, 72, 64, 56, 48, 40];
const STONE_HEIGHT  = 16;
const STONE_GAP     = 4;
const SVG_WIDTH     = 96;
const SVG_HEIGHT    = STONE_COUNT * (STONE_HEIGHT + STONE_GAP);

function CairnSvg({ filled }: { filled: number }) {
  return (
    <svg
      width={SVG_WIDTH}
      height={SVG_HEIGHT}
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      aria-label={`Cairn: ${filled} of ${STONE_COUNT} stones set`}
    >
      {STONE_WIDTHS.map((w, i) => {
        // Render top-to-bottom; stone 0 is the TOP (narrowest)
        const x   = (SVG_WIDTH - w) / 2;
        const y   = i * (STONE_HEIGHT + STONE_GAP);
        const rx  = w / 2;
        const ry  = STONE_HEIGHT / 2;
        // Cairn fills from the bottom, so stone index from bottom = (STONE_COUNT - 1 - i)
        const stoneIndexFromBottom = STONE_COUNT - 1 - i;
        const isSet = stoneIndexFromBottom < filled;

        return (
          <ellipse
            key={i}
            cx={SVG_WIDTH / 2}
            cy={y + ry}
            rx={rx}
            ry={ry}
            fill={isSet ? "#F59E0B" : "#F3F4F6"}
            stroke={isSet ? "#D97706" : "#D1D5DB"}
            strokeWidth={1.5}
          />
        );
      })}
    </svg>
  );
}

// ── Difficulty badge ───────────────────────────────────────────────────────────

const DIFF_STYLES: Record<string, string> = {
  Beginner:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  Intermediate: "bg-amber-50   text-amber-700   border-amber-200",
  Expert:       "bg-rose-50    text-rose-700    border-rose-200",
};

function DiffBadge({ difficulty }: { difficulty: string }) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${DIFF_STYLES[difficulty] ?? "bg-muted text-muted-foreground border-border"}`}>
      {difficulty}
    </span>
  );
}

// ── Collapsed (stone-set) banner ───────────────────────────────────────────────

function StoneSetBanner({
  stonesThisCairn,
  cairnTarget,
  onExpand,
}: {
  stonesThisCairn: number;
  cairnTarget:     number;
  onExpand:        () => void;
}) {
  const remaining = Math.max(0, cairnTarget - stonesThisCairn);
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div className="flex items-center gap-2.5">
        <Mountain className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-sm font-medium text-foreground">
          Today's stone is set
          {remaining > 0 && (
            <span className="text-muted-foreground font-normal">
              {" "}· {remaining} more {remaining === 1 ? "completes" : "to complete"} this cairn
            </span>
          )}
          {remaining === 0 && (
            <span className="text-amber-600 font-semibold"> · Cairn complete! 🏔️</span>
          )}
        </span>
      </div>
      <button
        onClick={onExpand}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Expand <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Expanded quest card ────────────────────────────────────────────────────────

function QuestCard({
  quest,
  stonesThisCairn,
  cairnTarget,
  trailBehind,
  isSetting,
  onSetStone,
  onCollapse,
  stoneSet,
}: {
  quest:           LearnerQuest;
  stonesThisCairn: number;
  cairnTarget:     number;
  trailBehind:     Array<{ label: string; earnedAt: string }>;
  isSetting:       boolean;
  onSetStone:      () => void;
  onCollapse:      () => void;
  stoneSet:        boolean;
}) {
  return (
    <div className="p-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Today's Trail Quest
            </p>
            <DiffBadge difficulty={quest.difficulty} />
            <span className="text-[11px] text-muted-foreground">+{quest.pointValue}pts</span>
          </div>
          <h3 className="text-base font-semibold text-foreground leading-snug">
            {quest.title}
          </h3>
        </div>
        <button
          onClick={onCollapse}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
          aria-label="Collapse quest"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      {/* Two-column layout: text + cairn */}
      <div className="flex items-start gap-6">
        {/* Left: quest content */}
        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            {quest.description}
          </p>

          {quest.acceptanceCriteria && (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Done when…
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {quest.acceptanceCriteria}
              </p>
            </div>
          )}

          {/* Set stone CTA — amber, always at most one per screen */}
          {!stoneSet && (
            <button
              onClick={onSetStone}
              disabled={isSetting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSetting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mountain className="w-3.5 h-3.5" />
              )}
              {isSetting ? "Setting stone…" : "Set today's stone →"}
            </button>
          )}
        </div>

        {/* Right: Cairn visualisation */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <CairnSvg filled={stonesThisCairn} />
          <p className="text-[11px] text-muted-foreground text-center">
            {stonesThisCairn}/{cairnTarget} stones
          </p>
        </div>
      </div>

      {/* Trail-behind row — past cairn badges */}
      {trailBehind.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Trail behind
          </p>
          <div className="flex gap-2 flex-wrap">
            {trailBehind.map((b, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700"
              >
                🏔️ {b.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CairnBand (exported) ───────────────────────────────────────────────────────

interface CairnBandProps {
  isLoading:  boolean;
  questState: QuestState | undefined;
  error:      Error | null;
}

export function CairnBand({ isLoading, questState, error }: CairnBandProps) {
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  const { mutate: setStone, isPending: isSetting } = useSetStone();
  const { toast } = useToast();

  const stoneSet  = questState?.stoneSet ?? false;
  const collapsed = stoneSet && !manuallyExpanded;

  function handleSetStone() {
    setStone(undefined, {
      onSuccess: () => {
        setManuallyExpanded(false);
        toast({ title: "Stone set!", description: "Today's quest is complete. Well done." });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Couldn't set stone", description: "Please try again." });
      },
    });
  }

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      {/* Amber top accent */}
      <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-300" />

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : error || !questState?.quest ? (
        // Empty state
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              Today's Trail Quest
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your first quest will appear here when your program starts.
            </p>
          </div>
        </div>
      ) : collapsed ? (
        <StoneSetBanner
          stonesThisCairn={questState.stonesThisCairn}
          cairnTarget={questState.cairnTarget}
          onExpand={() => setManuallyExpanded(true)}
        />
      ) : (
        <QuestCard
          quest={questState.quest}
          stonesThisCairn={questState.stonesThisCairn}
          cairnTarget={questState.cairnTarget}
          trailBehind={questState.trailBehind}
          isSetting={isSetting}
          onSetStone={handleSetStone}
          onCollapse={() => {
            if (stoneSet) setManuallyExpanded(false);
          }}
          stoneSet={stoneSet}
        />
      )}
    </div>
  );
}
