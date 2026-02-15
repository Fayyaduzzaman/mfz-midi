import Link from 'next/link';

const features = [
  'Interactive piano roll with transport + MIDI import/export',
  'Tone.js playback engine with soundfont and WebMIDI-ready abstractions',
  'Supabase auth, project persistence, storage uploads, and admin moderation',
  'Client-side WAV render + edge function template for server rendering'
];

export default function HomePage() {
  return (
    <section className="space-y-10">
      <div className="panel p-8 md:p-12">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Production Starter</p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold text-sand md:text-5xl">
          MFZ MIDI makes browser-based sequencing and export deployable on free tiers.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-200 md:text-lg">
          Build editor workflows quickly with a modular Next.js app router stack and Supabase backend.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/editor/piano-roll"
            className="rounded-xl bg-cyan px-4 py-2 font-medium text-ink transition hover:bg-cyan/80"
          >
            Open Editor
          </Link>
          <Link
            href="/auth/login"
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 font-medium text-slate-100 transition hover:bg-white/20"
          >
            Auth Setup
          </Link>
          <Link
            href="/admin"
            className="rounded-xl border border-ember/40 bg-ember/15 px-4 py-2 font-medium text-amber-100 transition hover:bg-ember/25"
          >
            Admin Area
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((item) => (
          <div key={item} className="panel p-5">
            <p className="animate-floatIn text-slate-100">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
