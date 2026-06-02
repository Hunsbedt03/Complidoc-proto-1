'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { getBedriftId, loadProjects } from '@/lib/projects';
import type { ProsjektSummary, UserProfile } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  bedriftId: string | null;
  projects: ProsjektSummary[];
  loading: boolean;
  refreshProjects: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function initials(name: string | null | undefined, email: string) {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useUserInitials() {
  const { profile, user } = useAuth();
  if (!user) return '?';
  return initials(profile?.full_name, user.email || '');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bedriftId, setBedriftId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProsjektSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(
    async (currentUser: User | null) => {
      if (!currentUser) {
        setProfile(null);
        setBedriftId(null);
        setProjects([]);
        return;
      }

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      setProfile(
        profileData || {
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: null,
        }
      );

      const bId = await getBedriftId(supabase, currentUser.id);
      setBedriftId(bId);
      const list = await loadProjects(supabase, currentUser.id);
      setProjects(list);
    },
    [supabase]
  );

  const refreshProjects = useCallback(async () => {
    if (!user) return;
    const list = await loadProjects(supabase, user.id);
    setProjects(list);
  }, [supabase, user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      loadUserData(session?.user ?? null).finally(() => setLoading(false));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      loadUserData(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadUserData]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      return { needsConfirmation: !data.session };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      profile,
      bedriftId,
      projects,
      loading,
      refreshProjects,
      signIn,
      signUp,
      signOut,
    }),
    [user, profile, bedriftId, projects, loading, refreshProjects, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
