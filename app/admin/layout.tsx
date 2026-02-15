import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAdmin>
      <section className="space-y-4">
        <div className="panel p-4">
          <h1 className="text-xl font-semibold text-sand">Admin Dashboard</h1>
          <p className="text-sm text-slate-300">
            Manage members, instrument uploads, and site-level quota settings.
          </p>
        </div>
        {children}
      </section>
    </ProtectedRoute>
  );
}
