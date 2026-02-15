'use client';

import { useEffect, useState } from 'react';
import {
  getCurrentSession,
  listAllProfiles,
  listPendingSoundfontUploads,
  updateSoundfontStatus,
  type ProfileRow,
  type SoundfontRow
} from '@/lib/supabaseClient';

export default function AdminUserList() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [uploads, setUploads] = useState<SoundfontRow[]>([]);
  const [statusText, setStatusText] = useState<string>('');

  const loadAdminData = async () => {
    setLoading(true);
    const [profilesResult, uploadsResult] = await Promise.all([
      listAllProfiles(),
      listPendingSoundfontUploads()
    ]);

    if (profilesResult.data) {
      setProfiles(profilesResult.data);
    }

    if (uploadsResult.data) {
      setUploads(uploadsResult.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleModeration = async (upload: SoundfontRow, action: 'approved' | 'rejected') => {
    const sessionResult = await getCurrentSession();
    const adminId = sessionResult.data.session?.user.id ?? null;

    const { error } = await updateSoundfontStatus(upload.id, action, adminId);
    if (error) {
      setStatusText(error.message);
      return;
    }

    setStatusText(`Upload ${upload.label} marked as ${action}.`);
    await loadAdminData();
  };

  if (loading) {
    return <div className="panel p-4 text-sm text-slate-200">Loading admin data...</div>;
  }

  return (
    <div className="space-y-5">
      <section className="panel overflow-x-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Users</h2>
          <span className="text-xs text-slate-300">{profiles.length} accounts</span>
        </div>
        <table className="w-full min-w-[560px] text-left text-sm text-slate-100">
          <thead>
            <tr className="border-b border-white/15 text-xs uppercase tracking-wider text-slate-300">
              <th className="py-2">Display Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="border-b border-white/5">
                <td className="py-2">{profile.display_name ?? 'Unassigned'}</td>
                <td className="py-2">{profile.email ?? 'Hidden'}</td>
                <td className="py-2">{profile.is_admin ? 'Admin' : 'Member'}</td>
                <td className="py-2">{new Date(profile.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel overflow-x-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Pending Uploads</h2>
          <span className="text-xs text-slate-300">{uploads.length} pending</span>
        </div>
        <table className="w-full min-w-[640px] text-left text-sm text-slate-100">
          <thead>
            <tr className="border-b border-white/15 text-xs uppercase tracking-wider text-slate-300">
              <th className="py-2">Label</th>
              <th className="py-2">Owner</th>
              <th className="py-2">Path</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {uploads.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-slate-300">
                  No pending uploads.
                </td>
              </tr>
            ) : (
              uploads.map((upload) => (
                <tr key={upload.id} className="border-b border-white/5">
                  <td className="py-2">{upload.label}</td>
                  <td className="py-2 font-mono text-xs text-cyan">{upload.owner_id.slice(0, 8)}...</td>
                  <td className="py-2 font-mono text-xs text-slate-300">{upload.storage_path}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleModeration(upload, 'approved')}
                        className="rounded-md bg-cyan px-2 py-1 text-xs font-semibold text-ink"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModeration(upload, 'rejected')}
                        className="rounded-md border border-ember/60 bg-ember/20 px-2 py-1 text-xs text-amber-100"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {statusText ? <p className="text-sm text-cyan">{statusText}</p> : null}
    </div>
  );
}
