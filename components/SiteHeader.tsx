'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOutUser } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider';

const baseNavItems = [
  { href: '/', label: 'Home' },
  { href: '/editor/piano-roll', label: 'Editor' },
  { href: '/admin', label: 'Admin' }
];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, session, profile } = useAuth();

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
          <p className="text-sm text-slate-300">Web MIDI editor, player, and export toolkit</p>
        </div>

        <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
          {baseNavItems.map((item) => {
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
