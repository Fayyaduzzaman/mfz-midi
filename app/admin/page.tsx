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
