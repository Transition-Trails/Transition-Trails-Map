import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { ContextPanel } from './ContextPanel';
import { ContextBar } from '@/components/context/ContextBar';
import { CommandPalette } from '../CommandPalette';
import { AskPennyPanel } from './AskPennyPanel';
import React from 'react';

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
    </div>
  );
}
