/**
 * HomebaseTour
 *
 * An animated modal walkthrough that introduces new users to the Homebase.
 * Triggered automatically on first visit; can be replayed from Release Notes.
 *
 * Steps cover the Penny bar, Submit a Case, workspace drawer, daily cards,
 * Slack panel, and the release-notes link.
 */

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  Plus,
  LayoutGrid,
  CheckSquare,
  MessageSquare,
  Tag,
  Home,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react";

// ── Step definitions ──────────────────────────────────────────────────────────

interface TourStep {
  icon:  React.FC<{ className?: string }>;
  color: string;        // Tailwind bg color class for the icon bubble
  title: string;
  body:  string;
}

const STEPS: TourStep[] = [
  {
    icon:  Home,
    color: "bg-primary/10 text-primary",
    title: "Welcome to your Homebase",
    body:  "This is your daily workspace — everything you need, right where you need it. Let's take a quick look around.",
  },
  {
    icon:  Sparkles,
    color: "bg-violet-100 text-violet-600",
    title: "Ask Penny anything",
    body:  "The bar at the top connects you to Penny, your Trail OS AI guide. Ask her about cases, learner progress, or anything else on your plate.",
  },
  {
    icon:  Plus,
    color: "bg-emerald-100 text-emerald-600",
    title: "Submit a Case",
    body:  "The 'Submit a Case' button lets you log a new Salesforce case without leaving your homebase. Your case goes straight into the queue.",
  },
  {
    icon:  LayoutGrid,
    color: "bg-sky-100 text-sky-600",
    title: "Your workspace drawer",
    body:  "The left panel gives you quick access to Google Workspace apps, collaboration tools, and your program links — all in one click.",
  },
  {
    icon:  CheckSquare,
    color: "bg-amber-100 text-amber-600",
    title: "Tasks & Cases",
    body:  "Your active tasks and open cases live in the cards below. Click any case to update its status or ask Penny for more context.",
  },
  {
    icon:  MessageSquare,
    color: "bg-rose-100 text-rose-600",
    title: "Team channels",
    body:  "The Slack panel on the right keeps you connected to your team channels. Click the arrow icon to expand it at any time.",
  },
  {
    icon:  Tag,
    color: "bg-indigo-100 text-indigo-600",
    title: "Stay up to date",
    body:  "Whenever Trail OS is updated, a pulsing dot appears next to the version number in the top bar. Click it to read the release notes — and replay this tour any time from that page.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface HomebaseTourProps {
  open:       boolean;
  onComplete: () => void;
}

export function HomebaseTour({ open, onComplete }: HomebaseTourProps) {
  const [step, setStep] = useState(0);

  // Reset to step 0 every time the tour opens.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
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
            key="tour-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            onClick={onComplete}
          />

          {/* Modal card */}
          <motion.div
            key="tour-card"
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4"
          >
            <div className="pointer-events-auto w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">

              {/* Step progress bar */}
              <div className="h-1 bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  transition={{ type: "spring", damping: 30, stiffness: 260 }}
                />
              </div>

              {/* Content */}
              <div className="px-6 pt-6 pb-5">
                {/* Close button */}
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

                {/* Step counter */}
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  Step {step + 1} of {STEPS.length}
                </p>

                {/* Title + body */}
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
              </div>

              {/* Dot indicators */}
              <div className="flex items-center justify-center gap-1.5 pb-2">
                {STEPS.map((_, i) => (
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
