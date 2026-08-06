/**
 * ThisMonthBand
 *
 * Collapsible "This month" band for the Volunteer Homebase.
 *
 * Expanded: headline ("N hours in, M to go"), body paragraph, bar chart of
 * hour blocks (filled = logged, dashed = remaining), commitment note,
 * and Toward Trail Merch progress section.
 *
 * Collapsed: compact row "This month · N of M hours logged · P points toward merch · Expand ▼"
 *
 * Special states:
 *   loading           — spinner
 *   commitment unset  — honest "Your monthly commitment hasn't been set yet" message
 *   all done          — "N hours — commitment met!" variant
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Calendar, Loader2, Gift } from "lucide-react";
import type { VolunteerMonthState } from "@/hooks/useHomebaseVolunteer";

// ── Merch tier config ──────────────────────────────────────────────────────────

const MERCH_TIERS = [
  { points: 100,  name: "Trail Sticker",  desc: "A handcrafted Trail OS sticker pack" },
  { points: 250,  name: "Trail Tee",      desc: "Transition Trails branded tee" },
  { points: 500,  name: "Trail Hoodie",   desc: "Premium Trail OS hoodie" },
  { points: 1000, name: "Trail Jacket",   desc: "Transition Trails ambassador jacket" },
];

function getMerchTier(points: number) {
  const next = MERCH_TIERS.find(t => t.points > points);
  const prev = [...MERCH_TIERS].reverse().find(t => t.points <= points);
  return { next, prev };
}

// ── Hour blocks bar chart ──────────────────────────────────────────────────────

function HourBar({
  hoursLogged,
  hoursCommitment,
}: {
  hoursLogged:     number;
  hoursCommitment: number | null;
}) {
  // Display cap when no commitment set
  const total  = hoursCommitment ?? 20;
  const filled = Math.min(Math.floor(hoursLogged), total);
  const blocks = Array.from({ length: total }, (_, i) => i < filled);

  return (
    <div className="flex flex-wrap gap-1.5" aria-label={`${filled} of ${total} hour blocks filled`}>
      {blocks.map((isFilled, i) => (
        <div
          key={i}
          className={[
            "w-5 h-5 rounded-sm transition-colors",
            isFilled
              ? "bg-primary"
              : "border-2 border-dashed border-border",
          ].join(" ")}
          title={isFilled ? `Hour ${i + 1} logged` : `Hour ${i + 1} remaining`}
        />
      ))}
    </div>
  );
}

// ── Merch progress ─────────────────────────────────────────────────────────────

function MerchProgress({ points }: { points: number }) {
  const { next, prev } = getMerchTier(points);
  const prevPoints = prev?.points ?? 0;
  const nextPoints = next?.points ?? MERCH_TIERS[MERCH_TIERS.length - 1]!.points;
  const pct = next
    ? Math.round(((points - prevPoints) / (nextPoints - prevPoints)) * 100)
    : 100;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Toward Trail Merch</p>
        <span className="text-[11px] text-muted-foreground font-medium ml-auto">
          {points} pts
        </span>
      </div>

      {next ? (
        <>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-foreground">{next.name}</p>
              <p className="text-[11px] text-muted-foreground">{next.desc}</p>
            </div>
            <span className="flex-shrink-0 text-[11px] text-muted-foreground">
              {next.points - points} pts to go
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-emerald-700 font-medium">
          🎉 All merch tiers unlocked — thank you for your dedication!
        </p>
      )}
    </div>
  );
}

// ── ThisMonthBand (exported) ───────────────────────────────────────────────────

interface ThisMonthBandProps {
  isLoading:  boolean;
  monthState: VolunteerMonthState | undefined;
  error:      Error | null;
}

export function ThisMonthBand({ isLoading, monthState, error }: ThisMonthBandProps) {
  const [expanded, setExpanded] = useState(true);

  const hoursLogged     = monthState?.hoursLogged     ?? 0;
  const hoursCommitment = monthState?.hoursCommitment  ?? null;
  const commitmentSet   = monthState?.commitmentSet    ?? false;
  const points          = monthState?.points           ?? 0;
  const nextMerchTier   = monthState?.nextMerchTier    ?? null;
  const pointsToNext    = monthState?.pointsToNext     ?? 0;

  const remaining  = commitmentSet && hoursCommitment !== null
    ? Math.max(0, hoursCommitment - hoursLogged)
    : null;
  const allDone    = commitmentSet && remaining === 0 && hoursLogged > 0;
  const behind     = commitmentSet && hoursCommitment !== null && hoursLogged < hoursCommitment * 0.4;

  // ── Collapsed row ──────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted/20 transition-colors"
        >
          <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="font-semibold">This month</span>
          <span className="text-muted-foreground">
            {" · "}
            {commitmentSet && hoursCommitment !== null
              ? `${hoursLogged} of ${hoursCommitment} hours logged`
              : `${hoursLogged} hours logged`}
            {" · "}
            {points} pts toward merch
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
        </button>
      </div>
    );
  }

  // ── Expanded ───────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(false)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        aria-expanded={true}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">This month</span>
        </div>
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Body */}
      <div className="px-4 pb-5 pt-0 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground py-2 leading-relaxed">
            Couldn't load your monthly progress right now. Try refreshing.
          </p>
        ) : (
          <>
            {/* Headline */}
            <div>
              {allDone ? (
                <p className="text-base font-semibold font-serif text-foreground">
                  {hoursLogged} hours — commitment met! 🎉
                </p>
              ) : commitmentSet && hoursCommitment !== null ? (
                <>
                  <p className={[
                    "text-base font-semibold font-serif",
                    behind ? "text-amber-700" : "text-foreground",
                  ].join(" ")}>
                    {hoursLogged} {hoursLogged === 1 ? "hour" : "hours"} in,{" "}
                    {remaining} to go
                    {behind && " — a little behind"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    You're working toward your {hoursCommitment}-hour commitment this month.
                    {behind
                      ? " Logging a couple of hours now will get you back on track."
                      : " Keep it up — you're making great progress."}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold font-serif text-foreground">
                    {hoursLogged} {hoursLogged === 1 ? "hour" : "hours"} logged so far
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Your monthly commitment hasn't been set yet — your coordinator will confirm it with you.
                  </p>
                </>
              )}
            </div>

            {/* Hour bar */}
            <HourBar hoursLogged={hoursLogged} hoursCommitment={hoursCommitment} />

            {/* Commitment note */}
            <p className="text-[11px] text-muted-foreground">
              Each block is an hour
              {commitmentSet && hoursCommitment !== null
                ? ` · ${hoursCommitment} is what you agreed to`
                : " · commitment not yet set"}
            </p>

            {/* Merch progress */}
            <MerchProgress points={points} />

            {nextMerchTier && pointsToNext > 0 && (
              <p className="text-[11px] text-muted-foreground text-center">
                {pointsToNext} more points to unlock {nextMerchTier}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
