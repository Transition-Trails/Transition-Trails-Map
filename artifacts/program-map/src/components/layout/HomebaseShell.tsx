/**
 * HomebaseShell
 *
 * The outer layout for all Homebase pages (Learner, Coach, Volunteer).
 * Completely separate from the internal-staff AppShell — no Sidebar, no
 * Topbar, no ContextBar.
 *
 * Layout:
 *   ┌──────┬─────────────────────────────────┬────────────┐
 *   │  WS  │  [Penny bar ─────────────────]  │  Slack     │
 *   │drawer│                                 │  panel     │
 *   │      │  <children / page content>      │  (320px)   │
 *   │ 60px │                                 │            │
 *   │ or   │                                 │  40px when │
 *   │ 240px│                                 │  collapsed │
 *   └──────┴─────────────────────────────────┴────────────┘
 *
 * Rules:
 *  - Only one side panel (Workspace drawer OR Slack panel) can be open at once.
 *  - Collapsed Workspace drawer is 60px; expanded is 240px.
 *  - Collapsed Slack panel is 40px (icon strip); expanded is 320px.
 */

import React, { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Mail,
  Calendar,
  HardDrive,
  FileText,
  Sheet,
  Video,
  StickyNote,
  PenLine,
  Dices,
  BookOpen,
  Share2,
  Sparkles,
  ExternalLink,
  Users,
  GraduationCap,
  Heart,
  Send,
  Briefcase,
  LayoutDashboard,
} from "lucide-react";
import { useLocation } from "wouter";
import type { HomebaseAudience } from "@/hooks/useHomebaseAuth";
import { SlimSlackPanel } from "@/components/homebase/SlimSlackPanel";

// ── Google Workspace app links ─────────────────────────────────────────────────

const GOOGLE_APPS = [
  { label: "Gmail",     Icon: Mail,        href: "https://mail.google.com"              },
  { label: "Calendar",  Icon: Calendar,    href: "https://calendar.google.com"          },
  { label: "Drive",     Icon: HardDrive,   href: "https://drive.google.com"             },
  { label: "Docs",      Icon: FileText,    href: "https://docs.google.com"              },
  { label: "Sheets",    Icon: Sheet,       href: "https://sheets.google.com"            },
  { label: "Meet",      Icon: Video,       href: "https://meet.google.com"              },
  { label: "Keep",      Icon: StickyNote,  href: "https://keep.google.com"              },
];

const COLLAB_APPS = [
  { label: "Mural",           Icon: PenLine,   href: "https://app.mural.co/t/starthere9675/home" },
  { label: "Planning Poker",  Icon: Dices,     href: "https://planningpoker.live"                },
  { label: "Trailhead",       Icon: BookOpen,  href: "https://www.trailhead.com"                 },
  { label: "Draw.io",         Icon: Share2,    href: "https://app.diagrams.net"                  },
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
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute top-3 right-0 translate-x-1/2 z-20 w-5 h-5 rounded-full border border-border bg-white shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label={open ? "Collapse workspace drawer" : "Expand workspace drawer"}
      >
        {open ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

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

      {/* Collaboration tools */}
      <div className="flex flex-col gap-0.5 px-1.5 py-2 border-b border-border">
        {COLLAB_APPS.map(({ label, Icon, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
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

      {/* Build link (audience-specific) */}
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
  const [query, setQuery]     = useState("");
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

// ── HomebaseShell (exported) ───────────────────────────────────────────────────

interface HomebaseShellProps {
  audience:    HomebaseAudience;
  displayName: string;
  children:    React.ReactNode;
}

export function HomebaseShell({
  audience,
  displayName,
  children,
}: HomebaseShellProps) {
  const [location] = useLocation();
  // Mutual exclusion: only one of left/right panel can be open
  const [leftOpen,  setLeftOpen]  = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const toggleLeft = useCallback(() => {
    setLeftOpen(prev => {
      if (!prev) setRightOpen(false);
      return !prev;
    });
  }, []);

  const toggleRight = useCallback(() => {
    setRightOpen(prev => {
      if (!prev) setLeftOpen(false);
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

      {/* Right: Slack panel — all audiences including team */}
      <motion.div
        className="relative flex-shrink-0 flex flex-col border-l border-border bg-white overflow-hidden"
        animate={{ width: rightOpen ? 320 : 40 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        <SlimSlackPanel
          open={rightOpen}
          onToggle={toggleRight}
          returnPath={location ?? "/"}
        />
      </motion.div>
    </div>
  );
}
