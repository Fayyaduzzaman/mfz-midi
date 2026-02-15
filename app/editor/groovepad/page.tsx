import GroovepadGrid from '@/components/GroovepadGrid';

export default function GroovepadPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-sand">Groovepad</h1>
      <p className="text-sm text-slate-300">Trigger pads for sketching loops and samples.</p>
      <GroovepadGrid />
    </section>
  );
}
