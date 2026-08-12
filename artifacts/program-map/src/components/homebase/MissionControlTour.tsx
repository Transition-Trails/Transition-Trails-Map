/**
 * MissionControlTour
 *
 * An animated modal walkthrough that introduces staff to Mission Control.
 * Triggered automatically on first visit to `/`; can be replayed from
 * Release Notes or the "Take a tour" button in the page header.
 *
 * Steps are tier-aware:
 *   everyday   → 4-step overview  (dashboard, Penny, Trail Signals, Help)
 *   power      → +2 steps         (live SF strip, Domain Health)
 *   admin      → +1 step          (Admin Hub & Readiness)
 *   superadmin → +1 step          (Tier preview & audit)
 *
 * Shared steps (Penny, Trail Signals, Help) are eligible for auto-skip when
 * the user has already seen them in a prior session.  The step list is
 * snapshotted at tour-open and never shifts mid-session.
 *
 * Mirrors HomebaseTour exactly — same modal chrome, progress bar, dot nav,
 * Back/Next/Done, Show all steps link.
 */

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  LayoutGrid,
  BookOpen,
  TrendingUp,
  Activity,
  BarChart3,
  ShieldCheck,
  Users,
  ArrowRight,
  ArrowLeft,
  X,
  RefreshCw,
} from "lucide-react";
import type { AccessTier } from "@/config/accessTiers";

// ── Step definitions ──────────────────────────────────────────────────────────

interface TourStep {
  icon:      React.FC<{ className?: string }>;
  color:     string;
  title:     string;
  body:      string;
  isShared?: boolean;
}

// ── Shared steps — eligible for auto-skip on replay ───────────────────────────

const SHARED_PENNY: TourStep = {
  icon:     Sparkles,
  color:    "bg-violet-100 text-violet-600",
  title:    "Ask Penny anything",
  body:     "Penny is your AI guide for Trail OS. Ask about program health, open cases, or anything on your plate — she's one click away in the top bar.",
  isShared: true,
};

const SHARED_SIGNALS: TourStep = {
  icon:     TrendingUp,
  color:    "bg-emerald-100 text-emerald-600",
  title:    "Trail Signals",
  body:     "Trail Signals surface patterns across your programs — attendance drops, case spikes, and knowledge gaps — so you can act before they become problems. Look for the signals indicator in the top bar.",
  isShared: true,
};

const SHARED_HELP: TourStep = {
  icon:     BookOpen,
  color:    "bg-amber-100 text-amber-600",
  title:    "Help Guide",
  body:     "The Help button in the top bar opens a searchable SF Knowledge library with how-to articles for every part of Trail OS. Use it any time you need a quick reference.",
  isShared: true,
};

// ── Tier-specific steps ───────────────────────────────────────────────────────

const STEP_WELCOME_EVERYDAY: TourStep = {
  icon:  LayoutGrid,
  color: "bg-primary/10 text-primary",
  title: "Welcome to My Dashboard",
  body:  "This is your personalised view of Trail OS — your programs, upcoming work, and platform activity all in one place. Let's take a quick look around.",
};

const STEP_WELCOME_POWER: TourStep = {
  icon:  LayoutGrid,
  color: "bg-primary/10 text-primary",
  title: "Welcome to Mission Control",
  body:  "Mission Control is your operational command centre — live Salesforce data, platform health scores, and critical action items, all in one view. Let's take a look.",
};

const STEP_SF_STRIP: TourStep = {
  icon:  Activity,
  color: "bg-[#E6F0EA] text-[#245531]",
  title: "Live Salesforce data",
  body:  "The green strip at the top pulls real-time counts directly from Salesforce — programs, enrollments, service deliveries, and open cases — refreshed automatically and timestamped.",
};

const STEP_DOMAIN_HEALTH: TourStep = {
  icon:  BarChart3,
  color: "bg-sky-100 text-sky-600",
  title: "Domain Health",
  body:  "Domain Health cards show the operational score across every area of the platform. The overall score and critical/high-priority action items tell you at a glance where attention is needed. Click any card to drill in.",
};

const STEP_ADMIN_HUB: TourStep = {
  icon:  ShieldCheck,
  color: "bg-slate-100 text-slate-600",
  title: "Admin Hub & Readiness",
  body:  "The Administration section in the left nav gives you integrations, secrets, people & access, and the Phase 1 Readiness Dashboard — your checklist for a healthy, fully-configured system.",
};

const STEP_SUPERADMIN: TourStep = {
  icon:  Users,
  color: "bg-indigo-100 text-indigo-600",
  title: "Tier preview & audit",
  body:  "Use the tier switcher in the top bar to preview Trail OS as any access level — Everyday, Power, or Admin — without affecting your own session. The Phase 1 Audit page tracks every configuration milestone.",
};

// ── Step arrays per tier ──────────────────────────────────────────────────────

const STEPS_BY_TIER: Record<AccessTier, TourStep[]> = {
  everyday: [
    STEP_WELCOME_EVERYDAY,
    SHARED_PENNY,
    SHARED_SIGNALS,
    SHARED_HELP,
  ],
  power: [
    STEP_WELCOME_POWER,
    SHARED_PENNY,
    STEP_SF_STRIP,
    STEP_DOMAIN_HEALTH,
    SHARED_SIGNALS,
    SHARED_HELP,
  ],
  admin: [
    STEP_WELCOME_POWER,
    SHARED_PENNY,
    STEP_SF_STRIP,
    STEP_DOMAIN_HEALTH,
    STEP_ADMIN_HUB,
    SHARED_SIGNALS,
    SHARED_HELP,
  ],
  superadmin: [
    STEP_WELCOME_POWER,
    SHARED_PENNY,
    STEP_SF_STRIP,
    STEP_DOMAIN_HEALTH,
    STEP_ADMIN_HUB,
    STEP_SUPERADMIN,
    SHARED_SIGNALS,
    SHARED_HELP,
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

interface MissionControlTourProps {
  open:               boolean;
  onComplete:         () => void;
  tier:               AccessTier;
  seenStepKeysAtOpen: Set<string>;
  onMarkStepSeen:     (title: string) => void;
  onShowAllSteps:     () => void;
}

export function MissionControlTour({
  open,
  onComplete,
  tier,
  seenStepKeysAtOpen,
  onMarkStepSeen,
  onShowAllSteps,
}: MissionControlTourProps) {
  const [step, setStep] = useState(0);

  const allSteps = STEPS_BY_TIER[tier] ?? STEPS_BY_TIER.everyday;

  const steps = useMemo<TourStep[]>(() => {
    return allSteps.filter(s => !(s.isShared && seenStepKeysAtOpen.has(s.title)));
  }, [allSteps, seenStepKeysAtOpen]);

  const hasSkippedSteps = allSteps.some(
    s => s.isShared && seenStepKeysAtOpen.has(s.title),
  );

  useEffect(() => {
    if (open) setStep(0);
  }, [open, tier]);

  useEffect(() => {
    if (!open || steps.length === 0) return;
    const current = steps[step];
    if (current) onMarkStepSeen(current.title);
  }, [open, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLast  = step === steps.length - 1;
  const current = steps[step];

  if (!current) return null;

  const Icon = current.icon;

  function next() {
    if (isLast) { onComplete(); } else { setStep(s => s + 1); }
  }

  function prev() {
    setStep(s => Math.max(0, s - 1));
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim */}
          <motion.div
            key="mc-tour-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            onClick={onComplete}
          />

          {/* Modal card */}
          <motion.div
            key="mc-tour-card"
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4"
          >
            <div className="pointer-events-auto w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">

              {/* Progress bar */}
              <div className="h-1 bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                  transition={{ type: "spring", damping: 30, stiffness: 260 }}
                />
              </div>

              {/* Content */}
              <div className="px-6 pt-6 pb-5">
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${current.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={onComplete}
                    className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Close tour"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  Step {step + 1} of {steps.length}
                  {hasSkippedSteps && (
                    <span className="ml-1 normal-case tracking-normal font-normal">
                      · some steps skipped
                    </span>
                  )}
                </p>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <h2 className="text-base font-semibold font-serif text-foreground leading-snug mb-2">
                      {current.title}
                    </h2>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {current.body}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {hasSkippedSteps && (
                  <button
                    type="button"
                    onClick={onShowAllSteps}
                    className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Show all steps
                  </button>
                )}
              </div>

              {/* Dot indicators */}
              <div className="flex items-center justify-center gap-1.5 pb-2">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStep(i)}
                    className={`rounded-full transition-all ${
                      i === step
                        ? "w-4 h-1.5 bg-primary"
                        : "w-1.5 h-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40"
                    }`}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-2 px-6 pb-5 pt-1">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={prev}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onComplete}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip
                  </button>
                )}

                <button
                  type="button"
                  onClick={next}
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {isLast ? "Done" : "Next"}
                  {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
