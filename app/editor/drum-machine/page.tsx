import DrumMachine from '@/components/DrumMachine';

export default function DrumMachinePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-sand">Drum Machine</h1>
      <p className="text-sm text-slate-300">
        16-step kick/snare/hat sequencer for quick rhythm sketching inside the studio.
      </p>
      <DrumMachine />
    </section>
  );
}
