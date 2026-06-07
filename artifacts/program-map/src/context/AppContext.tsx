import React, { createContext, useContext, useState } from 'react';
import { programs as staticPrograms, type Program } from '@/data/programs';
import { sourceDocuments as staticDocs, type SourceDocument } from '@/data/sourceDocuments';

type SelectedItemType = 'program' | 'penny' | 'trailOs' | 'resolve' | 'demand' | 'document';

interface AppState {
  activePage: string;
  activeLens: string;
  selectedItem: { type: SelectedItemType; id: string; data: any } | null;
  searchOpen: boolean;
  programs: Program[];
  sourceDocuments: SourceDocument[];
  setActivePage: (page: string) => void;
  setActiveLens: (lens: string) => void;
  setSelectedItem: (item: { type: SelectedItemType; id: string; data: any } | null) => void;
  setSearchOpen: (open: boolean) => void;
  updateProgram: (id: string, updates: Partial<Program>) => void;
  updateDocument: (id: string, updates: Partial<SourceDocument>) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage] = useState('program-map');
  const [activeLens, setActiveLens] = useState('executive');
  const [selectedItem, setSelectedItem] = useState<AppState['selectedItem']>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [programs, setPrograms] = useState<Program[]>(staticPrograms);
  const [sourceDocuments, setSourceDocuments] = useState<SourceDocument[]>(staticDocs);

  const updateProgram = (id: string, updates: Partial<Program>) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    setSelectedItem(prev => {
      if (prev?.type === 'program' && prev.id === id) {
        return { ...prev, data: { ...prev.data, ...updates } };
      }
      return prev;
    });
  };

  const updateDocument = (id: string, updates: Partial<SourceDocument>) => {
    setSourceDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    setSelectedItem(prev => {
      if (prev?.type === 'document' && prev.id === id) {
        return { ...prev, data: { ...prev.data, ...updates } };
      }
      return prev;
    });
  };

  return (
    <AppContext.Provider
      value={{
        activePage,
        activeLens,
        selectedItem,
        searchOpen,
        programs,
        sourceDocuments,
        setActivePage,
        setActiveLens,
        setSelectedItem,
        setSearchOpen,
        updateProgram,
        updateDocument,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
