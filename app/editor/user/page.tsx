'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  getSiteSetting,
  listProjectsForUser,
  listUserSoundfontUploads,
  type ProjectRow,
  type SoundfontRow
} from '@/lib/supabaseClient';

function quotaMbValue(value: unknown, fallback = 120) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(10, Math.min(5000, value));
  }
  return fallback;
}

export default function UserPanelPage() {
  const { access, profile, session } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [uploads, setUploads] = useState<SoundfontRow[]>([]);
  const [quotaMb, setQuotaMb] = useState(120);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      listProjectsForUser(session.user.id),
      listUserSoundfontUploads(session.user.id),
      getSiteSetting('storage_quota_mb')
    ])
      .then(([projectsResult, uploadsResult, quotaResult]) => {
        if (projectsResult.data) {
          setProjects(projectsResult.data);
        }
        if (uploadsResult.data) {
          setUploads(uploadsResult.data);
        }
        if (quotaResult.data) {
          setQuotaMb(quotaMbValue(quotaResult.data.value));
        }
      })
      .finally(() => setLoading(false));
  }, [session?.user.id]);

  const uploadUsageMb = useMemo(() => {
    const totalBytes = uploads
      .filter((upload) => upload.status !== 'rejected')
      .reduce((sum, upload) => sum + upload.size_bytes, 0);
    return totalBytes / (1024 * 1024);
  }, [uploads]);

  const accessLabel = profile?.is_admin
    ? 'Admin access'
    : access?.blocked
      ? 'Blocked'
      : access?.allowed
        ? 'Approved'
        : 'Pending approval';

  return (
    <section className="space-y-5">
      <div className="panel p-5">
        <h1 className="text-xl font-semibold text-sand">User Panel</h1>
        <p className="mt-2 text-sm text-slate-300">Account status, usage summary, and your recent assets.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Email</p>
          <p className="mt-2 text-sm text-slate-100">{session?.user.email ?? 'Unavailable'}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Role</p>
          <p className="mt-2 text-sm text-slate-100">{profile?.is_admin ? 'Admin' : 'Member'}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Access</p>
          <p className="mt-2 text-sm text-slate-100">{accessLabel}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Storage</p>
          <p className="mt-2 text-sm text-slate-100">
            {uploadUsageMb.toFixed(1)}MB / {quotaMb}MB
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel overflow-x-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Projects</h2>
            <span className="text-xs text-slate-300">{projects.length}</span>
          </div>
          {loading ? (
            <p className="text-sm text-slate-300">Loading projects...</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-slate-300">No saved projects yet.</p>
          ) : (
            <table className="w-full min-w-[420px] text-left text-sm text-slate-100">
              <thead>
                <tr className="border-b border-white/15 text-xs uppercase tracking-wider text-slate-300">
                  <th className="py-2">Name</th>
                  <th className="py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 8).map((project) => (
                  <tr key={project.id} className="border-b border-white/5">
                    <td className="py-2">{project.name}</td>
                    <td className="py-2">{new Date(project.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel overflow-x-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Instrument Uploads</h2>
            <span className="text-xs text-slate-300">{uploads.length}</span>
          </div>
          {loading ? (
            <p className="text-sm text-slate-300">Loading uploads...</p>
          ) : uploads.length === 0 ? (
            <p className="text-sm text-slate-300">No uploads yet.</p>
          ) : (
            <table className="w-full min-w-[520px] text-left text-sm text-slate-100">
              <thead>
                <tr className="border-b border-white/15 text-xs uppercase tracking-wider text-slate-300">
                  <th className="py-2">Label</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Size</th>
                </tr>
              </thead>
              <tbody>
                {uploads.slice(0, 8).map((upload) => (
                  <tr key={upload.id} className="border-b border-white/5">
                    <td className="py-2">{upload.label}</td>
                    <td className="py-2">{upload.status}</td>
                    <td className="py-2">{(upload.size_bytes / (1024 * 1024)).toFixed(2)}MB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </section>
  );
}
