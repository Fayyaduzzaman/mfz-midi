'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { signOutUser } from '@/lib/supabaseClient';

const guestNavItems = [
  { href: '/', label: 'Home' },
  { href: '/auth/login', label: 'Login' }
];

const memberNavItems = [
  { href: '/', label: 'Home' },
  { href: '/editor/piano-roll', label: 'Studio' },
  { href: '/editor/user', label: 'User Panel' }
];

export default function SiteHeader() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { loading, profile, session } = useAuth();

  const navItems = session?.user ? memberNavItems : guestNavItems;
  const showAdmin = Boolean(session?.user && profile?.is_admin);

  const handleLogout = async () => {
    await signOutUser();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">MFZ MIDI</p>
          <p className="text-sm text-slate-300">Studio-grade web MIDI editor and collaboration workspace</p>
        </div>

        <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  isActive ? 'bg-cyan/20 text-cyan' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {showAdmin ? (
            <Link
              href="/admin"
              className={`rounded-full px-3 py-1 text-sm transition ${
                pathname === '/admin' || pathname.startsWith('/admin/')
                  ? 'bg-ember/25 text-amber-100'
                  : 'text-amber-100 hover:bg-ember/20'
              }`}
            >
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-3 text-sm text-slate-200">
          {!loading && session?.user ? (
            <>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {profile?.is_admin ? 'Admin' : 'Member'}
              </span>
              <span className="max-w-[220px] truncate">{session.user.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-ember px-3 py-1 text-ink transition hover:bg-amber-400"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-lg border border-cyan/40 bg-cyan/10 px-3 py-1 text-cyan transition hover:bg-cyan/20"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
