import React from 'react';
import { PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

interface PennyPageShellProps {
  children: React.ReactNode;
}

export function PennyPageShell({ children }: PennyPageShellProps) {
  const { rightPanelOpen, setRightPanelOpen } = useAppContext();

  return (
    <div className="relative h-full w-full">
      {children}
      <button
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        className="absolute top-3 right-3 z-10 w-7 h-7 rounded-md flex items-center justify-center bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/[0.03] transition-colors shadow-sm"
        title={rightPanelOpen ? 'Collapse knowledge brief' : 'Open knowledge brief'}
        aria-label={rightPanelOpen ? 'Collapse knowledge brief' : 'Open knowledge brief'}
      >
        {rightPanelOpen
          ? <PanelRightClose className="w-3.5 h-3.5" />
          : <PanelRightOpen className="w-3.5 h-3.5" />
        }
      </button>
    </div>
  );
}
