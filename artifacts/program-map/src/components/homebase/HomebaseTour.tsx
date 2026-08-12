/**
 * HomebaseTour
 *
 * An animated modal walkthrough that introduces new users to the Homebase.
 * Triggered automatically on first visit; can be replayed from Release Notes.
 *
 * Steps are audience-aware: staff/team get the full operational tour; coaches,
 * learners, and volunteers each see steps matched to their own layout and cards.
 * Shared steps (Penny bar, workspace drawer, Slack panel, release notes) are
 * reused across all variants to avoid duplication.
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
  Users,
  FolderOpen,
  Star,
  Map,
  BookOpen,
  UserCheck,
  Heart,
  Award,
  TrendingUp,
} from "lucide-react";
import type { HomebaseAudience } from "@/hooks/useHomebaseAuth";

// ── Step definitions ──────────────────────────────────────────────────────────

interface TourStep {
  icon:  React.FC<{ className?: string }>;
  color: string;        // Tailwind bg color class for the icon bubble
  title: string;
  body:  string;
}

const SHARED_PENNY: TourStep = {
  icon:  Sparkles,
  color: "bg-violet-100 text-violet-600",
  title: "Ask Penny anything",
  body:  "The bar at the top connects you to Penny, your Trail OS AI guide. Ask her about your progress, open cases, or anything else on your plate.",
};
interface HomebaseTourProps {
  open:       boolean;
  onComplete: () => void;
  audience:   HomebaseAudience;
}

export function HomebaseTour({ open, onComplete, audience }: HomebaseTourProps) {
  const [step, setStep] = useState(0);

  const steps = STEPS_BY_AUDIENCE[audience] ?? STEPS_BY_AUDIENCE.team;

  // Reset to step 0 every time the tour opens or the audience changes.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const isLast  = step === steps.length - 1;
  const current = steps[step];
  const Icon    = current.icon;

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
                  animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
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
                  Step {step + 1} of {steps.length}
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

const STEPS_BY_AUDIENCE: Record<HomebaseAudience, TourStep[]> = {

  // Staff / team — the full operational tour (original 7 steps, unchanged).
  team: [
    {
      icon:  Home,
      color: "bg-primary/10 text-primary",
      title: "Welcome to your Homebase",
      body:  "This is your daily workspace — everything you need, right where you need it. Let's take a quick look around.",
    },
    SHARED_PENNY,
    {
      icon:  Plus,
      color: "bg-emerald-100 text-emerald-600",
      title: "Submit a Case",
      body:  "The 'Submit a Case' button lets you log a new Salesforce case without leaving your homebase. Your case goes straight into the queue.",
    },
    SHARED_WORKSPACE,
    {
      icon:  CheckSquare,
      color: "bg-amber-100 text-amber-600",
      title: "Tasks & Cases",
      body:  "Your active tasks and open cases live in the cards below. Click any case to update its status or ask Penny for more context.",
    },
    SHARED_SLACK,
    SHARED_RELEASE_NOTES,
  ],

  // Coach — focuses on squad, artifacts, and the lead team card.
  coach: [
    {
      icon:  Home,
      color: "bg-primary/10 text-primary",
      title: "Welcome, Coach",
      body:  "This is your coaching homebase — your squad, their artifacts, and everything you need to support your learners are right here.",
    },
    SHARED_PENNY,
    {
      icon:  Plus,
      color: "bg-emerald-100 text-emerald-600",
      title: "Submit a Case",
      body:  "Need to flag an issue for a learner? The 'Submit a Case' button logs a Salesforce case from right here, without breaking your flow.",
    },
    {
      icon:  Users,
      color: "bg-sky-100 text-sky-600",
      title: "Your squad",
      body:  "The squad grid shows every learner you're coaching, their current Trail Quest stage, and any open flags that need your attention.",
    },
    {
      icon:  FolderOpen,
      color: "bg-amber-100 text-amber-600",
      title: "Artefacts",
      body:  "Learner artifacts — submitted work, documents, and evidence — are surfaced here so you can review and give feedback without leaving your homebase.",
    },
    {
      icon:  Star,
      color: "bg-rose-100 text-rose-600",
      title: "Lead team card",
      body:  "The lead team card shows your coaching lead's contact details and any program-wide messages from your leadership team.",
    },
    SHARED_WORKSPACE,
    SHARED_SLACK,
    SHARED_RELEASE_NOTES,
  ],

  // Learner — focuses on Trail Quest, decision log, cases, and coach contact.
  learner: [
    {
      icon:  Home,
      color: "bg-primary/10 text-primary",
      title: "Welcome to your Homebase",
      body:  "This is your personal workspace on Trail OS — your journey, your decisions, and your support network all in one place.",
    },
    {
      icon:  Map,
      color: "bg-emerald-100 text-emerald-600",
      title: "Trail Quest band",
      body:  "The Trail Quest band at the top shows where you are in the RESOLVE journey. Click any phase to explore what it involves and what comes next.",
    },
    {
      icon:  BookOpen,
      color: "bg-amber-100 text-amber-600",
      title: "Your decision log",
      body:  "Every key decision you make during your transition is captured here. It's your record — use it to reflect, share with your coach, or revisit later.",
    },
    {
      icon:  CheckSquare,
      color: "bg-sky-100 text-sky-600",
      title: "Open cases",
      body:  "If you've raised a support case, it appears here so you can track its status and see any updates from your coordinator.",
    },
    {
      icon:  UserCheck,
      color: "bg-violet-100 text-violet-600",
      title: "Your coach",
      body:  "The coach contact card shows who's supporting you and how to reach them. You can also ask Penny to help you prepare for your next coaching session.",
    },
    SHARED_PENNY,
    SHARED_WORKSPACE,
    SHARED_SLACK,
    SHARED_RELEASE_NOTES,
  ],

  // Volunteer — focuses on the Ways to Help queue, specialty, growth, and coordinator.
  volunteer: [
    {
      icon:  Home,
      color: "bg-primary/10 text-primary",
      title: "Welcome, Volunteer",
      body:  "This is your volunteer homebase — your opportunities, your impact, and your support team are all right here.",
    },
    {
      icon:  Heart,
      color: "bg-rose-100 text-rose-600",
      title: "Ways to Help queue",
      body:  "The Ways to Help queue shows learners who need support that matches your skills and availability. Click any card to see details and offer your help.",
    },
    {
      icon:  Award,
      color: "bg-amber-100 text-amber-600",
      title: "Your specialty",
      body:  "Your specialty card shows the areas Trail OS has matched you to based on your profile. Update your preferences at any time from your account settings.",
    },
    {
      icon:  TrendingUp,
      color: "bg-emerald-100 text-emerald-600",
      title: "Your growth",
      body:  "The growth card tracks the impact you've made — hours contributed, learners supported, and skills shared — building your volunteer record over time.",
    },
    {
      icon:  UserCheck,
      color: "bg-sky-100 text-sky-600",
      title: "Your coordinator",
      body:  "Your coordinator card shows who to contact for questions, scheduling, or anything you need to make the most of your volunteering.",
    },
    SHARED_PENNY,
    SHARED_WORKSPACE,
    SHARED_SLACK,
    SHARED_RELEASE_NOTES,
  ],
};

const SHARED_WORKSPACE: TourStep = {
  icon:  LayoutGrid,
  color: "bg-sky-100 text-sky-600",
  title: "Your workspace drawer",
  body:  "The left panel gives you quick access to Google Workspace apps, collaboration tools, and your program links — all in one click.",
};

const SHARED_SLACK: TourStep = {
  icon:  MessageSquare,
  color: "bg-rose-100 text-rose-600",
  title: "Team channels",
  body:  "The Slack panel on the right keeps you connected to your team channels. Click the arrow icon to expand it at any time.",
};

const SHARED_RELEASE_NOTES: TourStep = {
  icon:  Tag,
  color: "bg-indigo-100 text-indigo-600",
  title: "Stay up to date",
  body:  "Whenever Trail OS is updated, a pulsing dot appears next to the version number in the top bar. Click it to read the release notes — and replay this tour any time from that page.",
};
