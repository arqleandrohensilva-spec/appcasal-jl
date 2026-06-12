import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type UserProfile = 'leandro' | 'jonathan' | 'casal';

interface AppContextType {
  activeProfile: UserProfile;
  setActiveProfile: (profile: UserProfile) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Sempre começa com 'leandro' para casar SSR ↔ client; lê do LS depois de hidratar.
  const [activeProfile, setActiveProfileState] = useState<UserProfile>('leandro');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('activeProfile') as UserProfile | null;
      if (saved && saved !== activeProfile) setActiveProfileState(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveProfile = (p: UserProfile) => {
    setActiveProfileState(p);
    try { localStorage.setItem('activeProfile', p); } catch {}
  };

  return (
    <AppContext.Provider value={{ activeProfile, setActiveProfile }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
