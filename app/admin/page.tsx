'use client';

import { useEffect, useState } from 'react';
import AdminUserList from '@/components/AdminUserList';
import { getSiteSetting, upsertSiteSetting } from '@/lib/supabaseClient';

export default function AdminPage() {
  const [quotaLimit, setQuotaLimit] = useState(120);
  const [status, setStatus] = useState('');

  useEffect(() => {
    getSiteSetting('storage_quota_mb').then((result) => {
      if (!result.data) {
        return;
      }

      const value = result.data.value;
      if (typeof value === 'number') {
        setQuotaLimit(value);
      }
    });
  }, []);

  const saveQuota = async () => {
    const { error } = await upsertSiteSetting('storage_quota_mb', quotaLimit);
    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus('Quota saved.');
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Access</p>
          <p className="mt-2 text-sm text-slate-200">Approve or block member emails from one admin panel.</p>
        </div>
        <div className="panel p-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Moderation</p>
          <p className="mt-2 text-sm text-slate-200">Review uploaded instruments before they appear in editor flows.</p>
        </div>
        <div className="panel p-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Quota</p>
          <p className="mt-2 text-sm text-slate-200">Apply a global per-user upload limit for storage usage.</p>
        </div>
      </div>

      <div className="panel space-y-3 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Site Settings</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-200">
            Storage quota (MB)
            <input
              type="number"
              min={10}
              max={1000}
              value={quotaLimit}
              onChange={(event) => setQuotaLimit(Number(event.target.value))}
              className="ml-2 w-24 rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-slate-100"
            />
          </label>
          <button
            type="button"
            onClick={saveQuota}
            className="rounded-lg bg-cyan px-3 py-2 text-sm font-semibold text-ink transition hover:bg-cyan/80"
          >
            Save
          </button>
        </div>
        {status ? <p className="text-sm text-cyan">{status}</p> : null}
      </div>

      <AdminUserList />
    </div>
  );
}
