import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './auth';

export type UserProfile = 'leandro' | 'jonathan' | 'casal';

interface AppContextType {
  activeProfile: UserProfile;
  setActiveProfile: (profile: UserProfile) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [activeProfile, setActiveProfileState] = useState<UserProfile>('leandro');

  // Sync active profile with logged-in user's pessoa
  useEffect(() => {
    if (profile?.pessoa) setActiveProfileState(profile.pessoa);
  }, [profile?.pessoa]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('activeProfile') as UserProfile | null;
      if (saved) setActiveProfileState(saved);
    } catch {}
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
