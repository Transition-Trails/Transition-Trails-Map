import React, { createContext, useContext, useState } from 'react';
import { programs as staticPrograms, type Program } from '@/data/programs';
import { sourceDocuments as staticDocs, type SourceDocument } from '@/data/sourceDocuments';
import { resolvePhases as staticResolvePhases, type ResolvePhase } from '@/data/resolvePhases';
import { pennyCapabilities as staticPenny, type PennyCapability } from '@/data/pennyCapabilities';
import { trailOsCapabilities as staticTrailOs, type TrailOsCapability } from '@/data/trailOsCapabilities';
import { commProviders as staticCommProviders, type CommProvider } from '@/data/commProviders';
import { commRoutes as staticCommRoutes, type CommRoute } from '@/data/commRouting';
import { messageTemplates as staticTemplates, type MessageTemplate } from '@/data/messageTemplates';

export type SelectedItemType =
  | 'program' | 'penny' | 'trailOs' | 'resolve' | 'demand' | 'document'
  | 'commProvider' | 'commRoute' | 'commTemplate'
  | 'commChannel' | 'commBroadcast' | 'commWeeklyBrief' | 'commNotification' | 'commCalendar';

interface AppState {
  activePage: string;
  activeLens: string;
  selectedItem: { type: SelectedItemType; id: string; data: any } | null;
  searchOpen: boolean;
  programs: Program[];
  sourceDocuments: SourceDocument[];
  resolvePhases: ResolvePhase[];
  pennyCapabilities: PennyCapability[];
  trailOsCapabilities: TrailOsCapability[];
  commProviders: CommProvider[];
  commRoutes: CommRoute[];
  messageTemplates: MessageTemplate[];
  setActivePage: (page: string) => void;
  setActiveLens: (lens: string) => void;
  setSelectedItem: (item: { type: SelectedItemType; id: string; data: any } | null) => void;
  setSearchOpen: (open: boolean) => void;
  updateProgram: (id: string, updates: Partial<Program>) => void;
  updateDocument: (id: string, updates: Partial<SourceDocument>) => void;
  updateResolvePhase: (id: string, updates: Partial<ResolvePhase>) => void;
  updatePennyCapability: (id: string, updates: Partial<PennyCapability>) => void;
  updateTrailOsCapability: (id: string, updates: Partial<TrailOsCapability>) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage]     = useState('program-map');
  const [activeLens, setActiveLens]     = useState('executive');
  const [selectedItem, setSelectedItem] = useState<AppState['selectedItem']>(null);
  const [searchOpen, setSearchOpen]     = useState(false);

  const [programs, setPrograms]                       = useState<Program[]>(staticPrograms);
  const [sourceDocuments, setSourceDocuments]         = useState<SourceDocument[]>(staticDocs);
  const [resolvePhases, setResolvePhases]             = useState<ResolvePhase[]>(staticResolvePhases);
  const [pennyCapabilities, setPennyCapabilities]     = useState<PennyCapability[]>(staticPenny);
  const [trailOsCapabilities, setTrailOsCapabilities] = useState<TrailOsCapability[]>(staticTrailOs);
  const [commProviders]     = useState<CommProvider[]>(staticCommProviders);
  const [commRoutes]        = useState<CommRoute[]>(staticCommRoutes);
  const [messageTemplates]  = useState<MessageTemplate[]>(staticTemplates);

  function syncSelected(type: SelectedItemType, id: string, updates: Record<string, any>) {
    setSelectedItem(prev => {
      if (prev?.type === type && prev.id === id) {
        return { ...prev, data: { ...prev.data, ...updates } };
      }
      return prev;
    });
  }

  const updateProgram = (id: string, updates: Partial<Program>) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    syncSelected('program', id, updates);
  };

  const updateDocument = (id: string, updates: Partial<SourceDocument>) => {
    setSourceDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    syncSelected('document', id, updates);
  };

  const updateResolvePhase = (id: string, updates: Partial<ResolvePhase>) => {
    setResolvePhases(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    syncSelected('resolve', id, updates);
  };

  const updatePennyCapability = (id: string, updates: Partial<PennyCapability>) => {
    setPennyCapabilities(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    syncSelected('penny', id, updates);
  };

  const updateTrailOsCapability = (id: string, updates: Partial<TrailOsCapability>) => {
    setTrailOsCapabilities(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    syncSelected('trailOs', id, updates);
  };

  return (
    <AppContext.Provider value={{
      activePage, activeLens, selectedItem, searchOpen,
      programs, sourceDocuments, resolvePhases, pennyCapabilities, trailOsCapabilities,
      commProviders, commRoutes, messageTemplates,
      setActivePage, setActiveLens, setSelectedItem, setSearchOpen,
      updateProgram, updateDocument, updateResolvePhase,
      updatePennyCapability, updateTrailOsCapability,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
