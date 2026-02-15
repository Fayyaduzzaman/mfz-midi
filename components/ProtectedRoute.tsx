'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({
  children,
  fallback,
  requireAdmin = false
}: ProtectedRouteProps) {
  const { loading, profile, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!session?.user) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requireAdmin && !profile?.is_admin) {
      router.replace('/editor/piano-roll');
    }
  }, [loading, pathname, profile?.is_admin, requireAdmin, router, session?.user]);

  if (loading || !session?.user || (requireAdmin && !profile?.is_admin)) {
    return (
      fallback ?? (
        <div className="panel p-6 text-sm text-slate-200">Checking account permissions...</div>
      )
    );
  }

  return <>{children}</>;
}
