'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getCurrentSession,
  listAccessRegistry,
  listAllProfiles,
  listPendingSoundfontUploads,
  normalizeEmail,
  updateSoundfontStatus,
  upsertAccessRegistryEntry,
  type AccessRegistryRow,
  type ProfileRow,
  type SoundfontRow
} from '@/lib/supabaseClient';

export default function AdminUserList() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [uploads, setUploads] = useState<SoundfontRow[]>([]);
  const [registry, setRegistry] = useState<AccessRegistryRow[]>([]);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantNote, setGrantNote] = useState('');
  const [statusText, setStatusText] = useState<string>('');

  const accessLookup = useMemo(() => {
    return new Map(registry.map((entry) => [entry.email, entry]));
  }, [registry]);

  const loadAdminData = async () => {
    setLoading(true);
    const [profilesResult, uploadsResult, registryResult] = await Promise.all([
      listAllProfiles(),
      listPendingSoundfontUploads(),
      listAccessRegistry()
    ]);

    if (profilesResult.data) {
      setProfiles(profilesResult.data);
    }

    if (uploadsResult.data) {
      setUploads(uploadsResult.data);
    }

    if (registryResult.data) {
      setRegistry(registryResult.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const getAdminId = async () => {
    const sessionResult = await getCurrentSession();
    return sessionResult.data.session?.user.id ?? null;
  };

  const setAccessStatus = async (
    email: string,
    status: AccessRegistryRow['status'],
    note?: string
  ) => {
    const adminId = await getAdminId();
    const normalized = normalizeEmail(email);

    const { error } = await upsertAccessRegistryEntry({
      email: normalized,
      granted_by: adminId,
      note: note?.trim() || null,
      status
    });

    if (error) {
      setStatusText(error.message);
      return false;
    }

    setStatusText(`${normalized} set to ${status}.`);
    await loadAdminData();
    return true;
  };

  const handleModeration = async (upload: SoundfontRow, action: 'approved' | 'rejected') => {
    const adminId = await getAdminId();
    const { error } = await updateSoundfontStatus(upload.id, action, adminId);
    if (error) {
      setStatusText(error.message);
      return;
    }

    setStatusText(`Upload ${upload.label} marked as ${action}.`);
    await loadAdminData();
  };

  const handleGrantSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!grantEmail.trim()) {
      setStatusText('Email is required.');
      return;
    }

    const updated = await setAccessStatus(grantEmail, 'approved', grantNote);
    if (updated) {
      setGrantEmail('');
      setGrantNote('');
    }
  };

  if (loading) {
    return <div className="panel p-4 text-sm text-slate-200">Loading admin data...</div>;
  }

  return (
    <div className="space-y-5">
      <section className="panel space-y-3 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Access Control</h2>
        <p className="text-sm text-slate-300">
          Signup is disabled. Grant or block access by email before users can enter editor routes.
        </p>
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleGrantSubmit}>
          <input
            type="email"
            required
            value={grantEmail}
            onChange={(event) => setGrantEmail(event.target.value)}
            placeholder="user@example.com"
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100"
          />
          <input
            type="text"
            value={grantNote}
            onChange={(event) => setGrantNote(event.target.value)}
            placeholder="Optional note"
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-cyan px-3 py-2 text-sm font-semibold text-ink transition hover:bg-cyan/80"
          >
            Grant Access
          </button>
        </form>
      </section>

      <section className="panel overflow-x-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Users</h2>
          <span className="text-xs text-slate-300">{profiles.length} accounts</span>
        </div>
        <table className="w-full min-w-[860px] text-left text-sm text-slate-100">
          <thead>
            <tr className="border-b border-white/15 text-xs uppercase tracking-wider text-slate-300">
              <th className="py-2">Display Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Access</th>
              <th className="py-2">Actions</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              const normalized = profile.email ? normalizeEmail(profile.email) : null;
              const entry = normalized ? accessLookup.get(normalized) : null;
              const accessLabel = entry?.status ?? (profile.is_admin ? 'admin' : 'not-granted');
              const canManage = Boolean(normalized) && !profile.is_admin;

              return (
                <tr key={profile.id} className="border-b border-white/5">
                  <td className="py-2">{profile.display_name ?? 'Unassigned'}</td>
                  <td className="py-2">{profile.email ?? 'Hidden'}</td>
                  <td className="py-2">{profile.is_admin ? 'Admin' : 'Member'}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        accessLabel === 'approved' || accessLabel === 'admin'
                          ? 'bg-cyan/20 text-cyan'
                          : accessLabel === 'blocked'
                            ? 'bg-ember/20 text-amber-100'
                            : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {accessLabel}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void setAccessStatus(normalized!, 'approved')}
                            className="rounded-md border border-cyan/40 bg-cyan/10 px-2 py-1 text-xs text-cyan transition hover:bg-cyan/20"
                          >
                            Grant
                          </button>
                          <button
                            type="button"
                            onClick={() => void setAccessStatus(normalized!, 'blocked')}
                            className="rounded-md border border-ember/60 bg-ember/20 px-2 py-1 text-xs text-amber-100 transition hover:bg-ember/30"
                          >
                            Block
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">Admin account</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2">{new Date(profile.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel overflow-x-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Access Registry</h2>
          <span className="text-xs text-slate-300">{registry.length} emails</span>
        </div>
        <table className="w-full min-w-[640px] text-left text-sm text-slate-100">
          <thead>
            <tr className="border-b border-white/15 text-xs uppercase tracking-wider text-slate-300">
              <th className="py-2">Email</th>
              <th className="py-2">Status</th>
              <th className="py-2">Note</th>
              <th className="py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {registry.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-slate-300">
                  No entries yet.
                </td>
              </tr>
            ) : (
              registry.map((entry) => (
                <tr key={entry.email} className="border-b border-white/5">
                  <td className="py-2 font-mono text-xs text-cyan">{entry.email}</td>
                  <td className="py-2">{entry.status}</td>
                  <td className="py-2">{entry.note ?? 'None'}</td>
                  <td className="py-2">{new Date(entry.updated_at).toLocaleString()}</td>
                </tr>
              ))
            )}
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
                        onClick={() => void handleModeration(upload, 'approved')}
                        className="rounded-md bg-cyan px-2 py-1 text-xs font-semibold text-ink"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleModeration(upload, 'rejected')}
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
