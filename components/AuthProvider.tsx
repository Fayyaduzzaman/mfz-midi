'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  getCurrentSession,
  getProfileByUserId,
  getSupabaseClient,
  type ProfileRow
} from '@/lib/supabaseClient';

interface AuthContextValue {
  loading: boolean;
  profile: ProfileRow | null;
  session: Session | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) {
      setProfile(null);
      return;
    }

    const { data, error } = await getProfileByUserId(session.user.id);
    if (!error) {
      setProfile(data);
    }
  }, [session?.user.id]);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    getCurrentSession()
      .then((result) => {
        if (!mounted) {
          return;
        }

        setSession(result.data.session ?? null);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    const authSubscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      if (!nextSession) {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const value = useMemo(
    () => ({
      loading,
      profile,
      session,
      refreshProfile
    }),
    [loading, profile, session, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
