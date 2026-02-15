'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { isSupabaseConfigured, signOutUser } from '@/lib/supabaseClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAdmin?: boolean;
  requireApproved?: boolean;
}

export default function ProtectedRoute({
  children,
  fallback,
  requireAdmin = false,
  requireApproved = true
}: ProtectedRouteProps) {
  const { access, loading, profile, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const supabaseConfigured = isSupabaseConfigured();
  const bypassAuthGuard = process.env.NEXT_PUBLIC_E2E_BYPASS_AUTH === '1';

  const isAdmin = Boolean(profile?.is_admin);
  const waitingForAccess = Boolean(session?.user && !isAdmin && access === null);
  const blocked = Boolean(access?.blocked);
  const approved = Boolean(access?.allowed);
  const lacksAccess = requireApproved && !isAdmin && (!approved || blocked);
  const redirectPath = pathname ?? '/';

  useEffect(() => {
    if (!supabaseConfigured || bypassAuthGuard) {
      return;
    }

    if (loading || waitingForAccess) {
      return;
    }

    if (!session?.user) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    if (requireAdmin && !isAdmin) {
      router.replace('/editor/piano-roll');
      return;
    }

    if (lacksAccess) {
      const reason = blocked ? 'blocked' : 'not-approved';
      void signOutUser().finally(() => {
        router.replace(`/auth/login?reason=${reason}`);
      });
    }
  }, [
    blocked,
    isAdmin,
    lacksAccess,
    loading,
    redirectPath,
    requireAdmin,
    router,
    session?.user,
    supabaseConfigured,
    bypassAuthGuard,
    waitingForAccess
  ]);

  if (!supabaseConfigured || bypassAuthGuard) {
    return <>{children}</>;
  }

  if (loading || waitingForAccess || !session?.user || (requireAdmin && !isAdmin) || lacksAccess) {
    return (
      fallback ?? (
        <div className="panel p-6 text-sm text-slate-200">Checking account permissions...</div>
      )
    );
  }

  return <>{children}</>;
}
