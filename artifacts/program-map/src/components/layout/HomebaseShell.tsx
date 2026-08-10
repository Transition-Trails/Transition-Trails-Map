/**
 * HomebaseShell
 *
 * The outer layout for all Homebase pages (Learner, Coach, Volunteer).
 * Completely separate from the internal-staff AppShell — no Sidebar, no
 * Topbar, no ContextBar.
 *
 * Layout:
 *   ┌──────┬─────────────────────────────────┬────────────┐
 *   │  WS  │  [Penny bar ─────────────────]  │  People    │
 *   │drawer│                                 │  panel     │
 *   │      │  <children / page content>      │  (288px)   │
 *   │ 60px │                                 │            │
 *   │ or   │                                 │            │
 *   │ 240px│                                 │            │
 *   └──────┴─────────────────────────────────┴────────────┘
 *
 * Rules:
 *  - Only one side panel (Workspace drawer OR People panel) can be open at once.
 *  - Collapsed Workspace drawer is 60px; expanded is 240px.
 *  - Collapsed People panel is 40px (icon strip); expanded is 288px.
 */

import React, { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Mail,
  Calendar,
  HardDrive,
  FileText,
  Sheet,
  Video,
  Sparkles,
  ExternalLink,
  Users,
  GraduationCap,
  Heart,
  Send,
  Briefcase,
  LayoutDashboard,
} from "lucide-react";
import type { HomebaseAudience } from "@/hooks/useHomebaseAuth";

// ── Google Workspace app links ─────────────────────────────────────────────────

const GOOGLE_APPS = [
  { label: "Gmail",     Icon: Mail,       href: "https://mail.google.com"              },
  { label: "Calendar",  Icon: Calendar,   href: "https://calendar.google.com"          },
  { label: "Drive",     Icon: HardDrive,  href: "https://drive.google.com"             },
  { label: "Docs",      Icon: FileText,   href: "https://docs.google.com"              },
  { label: "Sheets",    Icon: Sheet,      href: "https://sheets.google.com"            },
  { label: "Meet",      Icon: Video,      href: "https://meet.google.com"              },
];

const BUILD_LINKS: Record<HomebaseAudience, { label: string; href: string; external?: boolean }> = {
  learner:   { label: "Dev Org",         href: "https://trailhead.salesforce.com", external: true  },
  coach:     { label: "Salesforce",      href: "https://login.salesforce.com",     external: true  },
  volunteer: { label: "Salesforce",      href: "https://login.salesforce.com",     external: true  },
  // team: internal link — opens Mission Control (admin app) in the same tab
  team:      { label: "Mission Control", href: "/program",                         external: false },
};

const AUDIENCE_ICONS: Record<HomebaseAudience, React.FC<{ className?: string }>> = {
  learner:   GraduationCap,
  coach:     Users,
  volunteer: Heart,
  team:      Briefcase,
};

const AUDIENCE_LABELS: Record<HomebaseAudience, string> = {
  learner:   "Learner",
  coach:     "Coach",
  volunteer: "Volunteer",
  team:      "Team",
};

// ── WorkspaceDrawer ────────────────────────────────────────────────────────────

function WorkspaceDrawer({
  open,
  onToggle,
  audience,
}: {
  open:     boolean;
  onToggle: () => void;
  audience: HomebaseAudience;
}) {
  const buildLink = BUILD_LINKS[audience];
  const AudienceIcon = AUDIENCE_ICONS[audience];

  return (
    <motion.div
      className="relative flex-shrink-0 flex flex-col border-r border-border bg-white"
      animate={{ width: open ? 240 : 60 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
    >
      {/* Toggle button — sits at the drawer edge, half-overlapping the centre column.
          overflow-hidden has been moved to the inner content div so this button
          is never clipped and remains fully clickable. */}
      <button
        onClick={onToggle}
        className="absolute top-3 right-0 translate-x-1/2 z-20 w-5 h-5 rounded-full border border-border bg-white shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label={open ? "Collapse workspace drawer" : "Expand workspace drawer"}
      >
        {open ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Inner content wrapper — overflow-hidden here clips text labels when
          the drawer is collapsed without affecting the toggle button above. */}
      <div className="flex flex-col flex-1 overflow-hidden">

      {/* Header — audience identity */}
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-border min-h-[56px]">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <AudienceIcon className="w-4 h-4 text-primary" />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Workspace
              </p>
              <p className="text-sm font-semibold text-foreground leading-tight">
                {AUDIENCE_LABELS[audience]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Google apps */}
      <div className="flex flex-col gap-0.5 px-1.5 py-2 border-b border-border">
        {GOOGLE_APPS.map(({ label, Icon, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors group"
            title={label}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <AnimatePresence>
              {open && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="text-sm whitespace-nowrap overflow-hidden"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </a>
        ))}
      </div>

      {/* Gemini Notebook */}
      <div className="px-1.5 py-2 border-b border-border">
        <a
          href="https://notebooklm.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          title="Gemini Notebook"
        >
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {open && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="text-sm whitespace-nowrap overflow-hidden"
              >
                Gemini Notebook
              </motion.span>
            )}
          </AnimatePresence>
        </a>
      </div>

      {/* Build link (audience-specific) — always opens in a new tab so the
          homebase stays open in the current tab regardless of destination. */}
      <div className="px-1.5 py-2 mt-auto">
        <a
          href={buildLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          title={buildLink.label}
        >
          {buildLink.external !== false
            ? <ExternalLink    className="w-4 h-4 flex-shrink-0" />
            : <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          }
          <AnimatePresence>
            {open && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="text-sm whitespace-nowrap overflow-hidden"
              >
                {buildLink.label}
              </motion.span>
            )}
          </AnimatePresence>
        </a>
      </div>

      </div>{/* end inner overflow-hidden content wrapper */}
    </motion.div>
  );
}

// ── PennyBar ───────────────────────────────────────────────────────────────────

function PennyBar({ displayName }: { displayName: string }) {
  const [query, setQuery]   = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!query.trim() || sending) return;
    setSending(true);
    // TODO: wire to actual Penny API — for now just clear
    await new Promise(r => setTimeout(r, 600));
    setQuery("");
    setSending(false);
  }, [query, sending]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void handleSend();
  };

  const greeting = displayName ? displayName.split(" ")[0] : "there";

  return (
    <div className="flex-shrink-0 border-b border-border bg-white px-4 py-2.5 flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      </div>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKey}
        placeholder={`Ask Penny anything, ${greeting}…`}
        className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
      />
      <button
        onClick={() => void handleSend()}
        disabled={!query.trim() || sending}
        className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        aria-label="Send"
      >
        <Send className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── PeoplePanel ────────────────────────────────────────────────────────────────

function PeoplePanel({
  open,
  onToggle,
}: {
  open:     boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      className="relative flex-shrink-0 flex flex-col border-l border-border bg-white overflow-hidden"
      animate={{ width: open ? 288 : 40 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
    >
      {/* Toggle strip */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center w-full py-3 border-b border-border text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
        aria-label={open ? "Collapse people panel" : "Expand people panel"}
      >
        {open ? <ChevronUp className="w-4 h-4 rotate-90" /> : <ChevronDown className="w-4 h-4 rotate-90" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-4 px-4 py-4 overflow-y-auto flex-1"
          >
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Your Team
            </p>
            {/* Populated by audience-specific homebase pages */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Team contacts will appear here once your homebase is fully set up.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── HomebaseShell (exported) ───────────────────────────────────────────────────

interface HomebaseShellProps {
  audience:    HomebaseAudience;
  displayName: string;
  children:    React.ReactNode;
  /** Override the right People panel content (for audience-specific data). */
  peoplePanel?: React.ReactNode;
}

export function HomebaseShell({
  audience,
  displayName,
  children,
  peoplePanel,
}: HomebaseShellProps) {
  // Mutual exclusion: only one of left/right panel can be open
  const [leftOpen,  setLeftOpen]  = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const toggleLeft = useCallback(() => {
    setLeftOpen(prev => {
      if (!prev) setRightOpen(false); // opening left → close right
      return !prev;
    });
  }, []);

  const toggleRight = useCallback(() => {
    setRightOpen(prev => {
      if (!prev) setLeftOpen(false); // opening right → close left
      return !prev;
    });
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[hsl(40_30%_97%)] text-foreground">
      {/* Left: Workspace drawer */}
      <WorkspaceDrawer
        open={leftOpen}
        onToggle={toggleLeft}
        audience={audience}
      />

      {/* Centre: Penny bar + scrollable content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <PennyBar displayName={displayName} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Right: People panel */}
      {peoplePanel ? (
        <motion.div
          className="relative flex-shrink-0 flex flex-col border-l border-border bg-white overflow-hidden"
          animate={{ width: rightOpen ? 288 : 40 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
        >
          <button
            onClick={toggleRight}
            className="flex items-center justify-center w-full py-3 border-b border-border text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
            aria-label={rightOpen ? "Collapse people panel" : "Expand people panel"}
          >
            {rightOpen
              ? <ChevronDown className="w-4 h-4 rotate-90" />
              : <ChevronDown className="w-4 h-4 -rotate-90" />
            }
          </button>
          <AnimatePresence>
            {rightOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col overflow-y-auto flex-1"
              >
                {peoplePanel}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : (
        <PeoplePanel open={rightOpen} onToggle={toggleRight} />
      )}
    </div>
  );
}
