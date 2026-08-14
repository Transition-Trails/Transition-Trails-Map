import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { ContextPanel } from './ContextPanel';
import { ContextBar } from '@/components/context/ContextBar';
import { CommandPalette } from '../CommandPalette';
import { AskPennyPanel } from './AskPennyPanel';
import { CalendarActionPanel } from './CalendarActionPanel';
import { GmailActionPanel } from './GmailActionPanel';
import { HelpPanel } from './HelpPanel';
import { RailActionPanel } from '@/components/workspace/RailActionPanel';
import { SlimSlackPanel } from '@/components/homebase/SlimSlackPanel';
import { useAppContext } from '@/context/AppContext';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'wouter';
import React from 'react';

function StaffSlackDrawer() {
  const { slackDrawerOpen, setSlackDrawerOpen } = useAppContext();
  const [location] = useLocation();

  function close() { setSlackDrawerOpen(false); }

  // Escape key closes the drawer, matching AskPennyPanel / HelpPanel behaviour.
  React.useEffect(() => {
    if (!slackDrawerOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slackDrawerOpen]);

  return (
    <AnimatePresence>
      {slackDrawerOpen && (
        <>
          {/* Scrim — clicking outside closes the drawer */}
          <motion.div
            key="slack-scrim"
            className="fixed inset-0 z-40 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          {/* Right-side drawer — same sizing/animation as GlobalActionPanel */}
          <motion.div
            key="slack-panel"
            className="fixed inset-y-0 right-0 z-50 w-[400px] bg-white border-l border-border shadow-xl flex flex-col overflow-hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Always open=true inside the container — the topbar button handles toggle */}
            <SlimSlackPanel open={true} onToggle={close} returnPath={location} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function GlobalActionPanel() {
  const { actionPanel, closeActionPanel } = useAppContext();
  return (
    <AnimatePresence>
      {actionPanel && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-40 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeActionPanel}
          />
          <motion.div
            key="panel"
            className="fixed inset-y-0 right-0 z-50 w-[400px] bg-white border-l border-border shadow-xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <RailActionPanel config={actionPanel} onClose={closeActionPanel} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/20">
      <Topbar />
      <ContextBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative overflow-hidden bg-background">
          {children}
        </main>
        <ContextPanel />
      </div>
      <CommandPalette />
      <AskPennyPanel />
      <CalendarActionPanel />
      <GmailActionPanel />
      <HelpPanel />
      <GlobalActionPanel />
      <StaffSlackDrawer />
    </div>
  );
}
