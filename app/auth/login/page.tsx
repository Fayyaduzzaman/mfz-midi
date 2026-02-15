'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
  upsertUserProfile
} from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [redirectTarget, setRedirectTarget] = useState('/editor/piano-roll');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectTarget(params.get('redirect') ?? '/editor/piano-roll');
  }, []);

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const { error } = await signInWithMagicLink(email, `${window.location.origin}${redirectTarget}`);
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Magic link sent. Check your inbox and use the same browser tab to finish sign-in.');
  };

  const handlePasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const { data, error } = await signInWithPassword(email, password);
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const user = data.user;
    if (user) {
      await upsertUserProfile({
        display_name: user.email?.split('@')[0] ?? 'member',
        email: user.email ?? null,
        id: user.id
      });
    }

    router.push(redirectTarget);
    router.refresh();
  };

  const handleSignupClick = async () => {
    setLoading(true);

    const { data, error } = await signUpWithPassword(email, password, `${window.location.origin}${redirectTarget}`);
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.user?.id) {
      await upsertUserProfile({
        display_name: data.user.email?.split('@')[0] ?? 'member',
        email: data.user.email ?? null,
        id: data.user.id
      });
    }

    setMessage('Signup successful. If email confirmation is enabled, follow the verification link first.');
  };

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">Auth</p>
        <h1 className="mt-2 text-2xl font-semibold text-sand">Login with magic link or password</h1>
        <p className="mt-2 text-sm text-slate-300">
          This page uses Supabase Auth with password and OTP flows. Redirect target: {redirectTarget}
        </p>
      </div>

      <form className="panel space-y-4 p-6" onSubmit={handleMagicLink}>
        <h2 className="text-lg font-semibold text-slate-100">Magic Link</h2>
        <label className="block text-sm text-slate-200">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-slate-100"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-cyan px-4 py-2 font-semibold text-ink transition hover:bg-cyan/80 disabled:opacity-60"
        >
          Send Magic Link
        </button>
      </form>

      <form className="panel space-y-4 p-6" onSubmit={handlePasswordLogin}>
        <h2 className="text-lg font-semibold text-slate-100">Password Login</h2>
        <label className="block text-sm text-slate-200">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-slate-100"
          />
        </label>
        <label className="block text-sm text-slate-200">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-slate-100"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-slate-100 transition hover:bg-white/20 disabled:opacity-60"
          >
            Login
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleSignupClick()}
            className="rounded-lg border border-cyan/40 bg-cyan/10 px-4 py-2 text-cyan transition hover:bg-cyan/20 disabled:opacity-60"
          >
            Signup
          </button>
        </div>
      </form>

      {message ? <p className="text-sm text-cyan">{message}</p> : null}
    </section>
  );
}
