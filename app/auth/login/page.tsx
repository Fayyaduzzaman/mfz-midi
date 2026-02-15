'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  checkEmailAccess,
  signInWithMagicLink,
  signInWithPassword,
  upsertUserProfile
} from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [redirectTarget, setRedirectTarget] = useState('/editor/piano-roll');
  const [reason, setReason] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectTarget(params.get('redirect') ?? '/editor/piano-roll');
    setReason(params.get('reason') ?? '');
  }, []);

  const reasonText = useMemo(() => {
    if (reason === 'blocked') {
      return 'Your account is blocked. Contact an admin to restore access.';
    }
    if (reason === 'not-approved') {
      return 'Access is not enabled for this email yet. Ask an admin to grant access first.';
    }
    return '';
  }, [reason]);

  const verifyAccess = async () => {
    const accessResult = await checkEmailAccess(email);
    if (accessResult.error || !accessResult.data) {
      setMessage(accessResult.error?.message ?? 'Failed to verify account access.');
      return false;
    }

    if (accessResult.data.blocked) {
      setMessage('This email is blocked by admin policy.');
      return false;
    }

    if (!accessResult.data.allowed) {
      setMessage('This email is not approved yet. Ask an admin to grant access.');
      return false;
    }

    return true;
  };

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const canContinue = await verifyAccess();
    if (!canContinue) {
      setLoading(false);
      return;
    }

    const { error } = await signInWithMagicLink(email, `${window.location.origin}${redirectTarget}`);
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Magic link sent. Open the link from the same browser to finish login.');
  };

  const handlePasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const canContinue = await verifyAccess();
    if (!canContinue) {
      setLoading(false);
      return;
    }

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

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="panel p-6 md:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">Member Access</p>
        <h1 className="mt-3 text-3xl font-semibold text-sand">Login to MFZ MIDI</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-200">
          Signup is disabled. Only admin-approved email addresses can access the editor and user panel.
        </p>
        <div className="mt-4 rounded-xl border border-cyan/25 bg-cyan/10 px-4 py-3 text-sm text-cyan">
          1. Ask admin to approve your email address. 2. Use magic link or your existing password.
        </div>
        {reasonText ? (
          <div className="mt-3 rounded-xl border border-ember/30 bg-ember/15 px-4 py-3 text-sm text-amber-100">
            {reasonText}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <form className="panel space-y-4 p-6" onSubmit={handleMagicLink}>
          <h2 className="text-lg font-semibold text-slate-100">Magic Link Login</h2>
          <label className="block text-sm text-slate-200">
            Approved Email
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
            Approved Email
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
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-slate-100 transition hover:bg-white/20 disabled:opacity-60"
          >
            Login
          </button>
        </form>
      </div>

      {message ? <p className="text-sm text-cyan">{message}</p> : null}
    </section>
  );
}
