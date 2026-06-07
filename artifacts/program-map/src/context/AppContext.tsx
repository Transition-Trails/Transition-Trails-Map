import React, { createContext, useContext, useState } from 'react';

type SelectedItemType = 'program' | 'penny' | 'trailOs' | 'resolve' | 'demand' | 'document';

interface AppState {
  activePage: string;
  activeLens: string;
  selectedItem: { type: SelectedItemType; id: string; data: any } | null;
  searchOpen: boolean;
  setActivePage: (page: string) => void;
  setActiveLens: (lens: string) => void;
  setSelectedItem: (item: { type: SelectedItemType; id: string; data: any } | null) => void;
  setSearchOpen: (open: boolean) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage] = useState('program-map');
  const [activeLens, setActiveLens] = useState('executive');
  const [selectedItem, setSelectedItem] = useState<AppState['selectedItem']>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <AppContext.Provider
      value={{
        activePage,
        activeLens,
        selectedItem,
        searchOpen,
        setActivePage,
        setActiveLens,
        setSelectedItem,
        setSearchOpen,
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
