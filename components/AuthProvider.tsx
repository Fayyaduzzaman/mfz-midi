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
  checkEmailAccess,
  getCurrentSession,
  getProfileByUserId,
  getSupabaseClient,
  type ProfileRow
} from '@/lib/supabaseClient';

interface AccessState {
  allowed: boolean;
  blocked: boolean;
}

interface AuthContextValue {
  access: AccessState | null;
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
  const [access, setAccess] = useState<AccessState | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id || !session.user.email) {
      setProfile(null);
      setAccess(null);
      return;
    }

    const [profileResult, accessResult] = await Promise.all([
      getProfileByUserId(session.user.id),
      checkEmailAccess(session.user.email)
    ]);

    if (!profileResult.error) {
      setProfile(profileResult.data);
    } else {
      setProfile(null);
    }

    if (!accessResult.error) {
      setAccess(accessResult.data);
    } else {
      setAccess({
        allowed: false,
        blocked: false
      });
    }
  }, [session?.user.email, session?.user.id]);

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
        setAccess(null);
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
      access,
      loading,
      profile,
      session,
      refreshProfile
    }),
    [access, loading, profile, session, refreshProfile]
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
