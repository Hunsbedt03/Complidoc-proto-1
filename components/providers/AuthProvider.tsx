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
import { listLocalProjects } from '@/lib/localProjects';
import { formatSupabaseError } from '@/lib/supabaseError';
import { debugClientLog } from '@/lib/debugClientLog';
import { getBedriftId, loadProjects } from '@/lib/projects';
import type { ProsjektSummary, UserProfile } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  bedriftId: string | null;
  projects: ProsjektSummary[];
  projectsError: string | null;
  loading: boolean;
  refreshProjects: () => Promise<void>;
  hydrateCloudProjects: (cloud: ProsjektSummary[]) => void;
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
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCloudProjects = useCallback(
    async (currentUser: User): Promise<ProsjektSummary[]> => {
      try {
        const cloud = await loadProjects(supabase, currentUser.id);
        debugClientLog(
          'AuthProvider.tsx:fetchCloudProjects',
          'client loadProjects ok',
          {
            count: cloud.length,
            userId: currentUser.id,
            email: currentUser.email ?? null,
          },
          'H-client'
        );
        return cloud;
      } catch (clientErr) {
        const clientMsg = formatSupabaseError(clientErr);
        debugClientLog(
          'AuthProvider.tsx:fetchCloudProjects',
          'client loadProjects failed, trying API',
          { error: clientMsg },
          'H-client'
        );
      }

      const res = await fetch('/api/projects', { credentials: 'include', cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        const projects = Array.isArray(json.projects) ? json.projects : [];
        debugClientLog(
          'AuthProvider.tsx:fetchCloudProjects',
          'API projects ok',
          { count: projects.length, status: res.status },
          'H-API'
        );
        return projects;
      }

      const msg =
        typeof json.error === 'string'
          ? json.error
          : 'Kunne ikke hente prosjekter fra databasen';
      debugClientLog(
        'AuthProvider.tsx:fetchCloudProjects',
        'API projects failed',
        { status: res.status, error: msg },
        'H-API'
      );
      throw new Error(msg);
    },
    [supabase]
  );

  const mergeWithLocal = useCallback((cloud: ProsjektSummary[]) => {
    const local = listLocalProjects();
    const merged = [...cloud];
    for (const lp of local) {
      if (!merged.some((p) => p.id === lp.id)) merged.push(lp);
    }
    return merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, []);

  const loadUserData = useCallback(
    async (currentUser: User | null) => {
      try {
        if (!currentUser) {
          setProfile(null);
          setBedriftId(null);
          setProjectsError(null);
          setProjects(listLocalProjects());
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

        fetch('/api/bootstrap-profile', { method: 'POST' }).catch(() => {});

        const bId = await getBedriftId(supabase, currentUser.id);
        setBedriftId(bId);
        try {
          const cloud = await fetchCloudProjects(currentUser);
          setProjectsError(null);
          setProjects(mergeWithLocal(cloud));
        } catch (projectErr) {
          const msg = formatSupabaseError(projectErr);
          console.warn('[samsiq] Sky-prosjekter feilet:', msg);
          setProjectsError(msg);
          setProjects((prev) => (prev.length ? prev : mergeWithLocal([])));
        }
      } catch (err) {
        console.warn('[samsiq] loadUserData feilet, viser lokale prosjekter:', err);
        setProjectsError(formatSupabaseError(err));
        setProjects(listLocalProjects());
      }
    },
    [supabase, mergeWithLocal, fetchCloudProjects]
  );

  const hydrateCloudProjects = useCallback(
    (cloud: ProsjektSummary[]) => {
      setProjectsError(null);
      setProjects(mergeWithLocal(cloud));
    },
    [mergeWithLocal]
  );

  const refreshProjects = useCallback(async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) {
      return;
    }
    try {
      const cloud = await fetchCloudProjects(currentUser);
      setProjectsError(null);
      setProjects(mergeWithLocal(cloud));
      debugClientLog(
        'AuthProvider.tsx:refreshProjects',
        'refresh merged',
        { count: cloud.length },
        'H-race'
      );
    } catch (projectErr) {
      const msg = formatSupabaseError(projectErr);
      console.warn('[samsiq] refreshProjects feilet:', msg);
      setProjectsError(msg);
      setProjects((prev) => (prev.length ? prev : mergeWithLocal([])));
    }
  }, [supabase, mergeWithLocal, fetchCloudProjects]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      loadUserData(currentUser).finally(() => setLoading(false));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void loadUserData(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadUserData]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(formatSupabaseError(error));
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
      if (error) throw new Error(formatSupabaseError(error));
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
      projectsError,
      loading,
      refreshProjects,
      hydrateCloudProjects,
      signIn,
      signUp,
      signOut,
    }),
    [
      user,
      profile,
      bedriftId,
      projects,
      projectsError,
      loading,
      refreshProjects,
      hydrateCloudProjects,
      signIn,
      signUp,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
