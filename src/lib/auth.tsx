import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { UserProfile } from './context';

export interface WorkspaceProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  active_workspace_id: string | null;
  pessoa: UserProfile | null;
}

export interface Workspace {
  id: string;
  name: string;
  invite_code: string;
}

interface AuthCtx {
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: WorkspaceProfile | null;
  workspace: Workspace | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  joinByCode: (code: string) => Promise<{ ok: boolean; error?: string }>;
  setProfilePessoa: (p: UserProfile) => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) { setProfile(null); setWorkspace(null); return; }
    const { data: prof } = await supabase
      .from('profiles')
      .select('id,email,display_name,active_workspace_id,pessoa')
      .eq('id', u.id)
      .maybeSingle();
    if (prof) {
      setProfile(prof as WorkspaceProfile);
      if (prof.active_workspace_id) {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id,name,invite_code')
          .eq('id', prof.active_workspace_id)
          .maybeSingle();
        setWorkspace(ws as Workspace | null);
      }
    } else {
      // Trigger may still be processing; retry once
      await new Promise(r => setTimeout(r, 600));
      const { data: prof2 } = await supabase
        .from('profiles')
        .select('id,email,display_name,active_workspace_id,pessoa')
        .eq('id', u.id)
        .maybeSingle();
      setProfile((prof2 as WorkspaceProfile) ?? null);
      if (prof2?.active_workspace_id) {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id,name,invite_code')
          .eq('id', prof2.active_workspace_id)
          .maybeSingle();
        setWorkspace(ws as Workspace | null);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await loadProfile(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // Defer to avoid deadlock
      setTimeout(() => { loadProfile(s?.user ?? null); }, 0);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setWorkspace(null);
  };

  const refresh = async () => { await loadProfile(user); };

  const joinByCode = async (code: string) => {
    const { error } = await supabase.rpc('join_workspace_by_code', { _code: code.trim() });
    if (error) return { ok: false, error: error.message };
    await refresh();
    return { ok: true };
  };

  const setProfilePessoa = async (p: UserProfile) => {
    if (!user) return;
    await supabase.from('profiles').update({ pessoa: p }).eq('id', user.id);
    setProfile(prev => prev ? { ...prev, pessoa: p } : prev);
  };

  return (
    <Ctx.Provider value={{ loading, user, session, profile, workspace, signOut, refresh, joinByCode, setProfilePessoa }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be inside AuthProvider');
  return c;
}
