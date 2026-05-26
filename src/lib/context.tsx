import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type UserProfile = 'leandro' | 'jonathan' | 'casal';

interface AppContextType {
  activeProfile: UserProfile;
  setActiveProfile: (profile: UserProfile) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activeProfile');
      return (saved as UserProfile) || 'leandro';
    }
    return 'leandro';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeProfile', activeProfile);
    }
  }, [activeProfile]);

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
