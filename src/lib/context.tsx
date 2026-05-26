import { createContext, useContext, useState, ReactNode } from 'react';

export type UserProfile = 'leandro' | 'jonathan' | 'casal';

interface AppContextType {
  activeProfile: UserProfile;
  setActiveProfile: (profile: UserProfile) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<UserProfile>('leandro');

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
