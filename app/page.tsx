import Link from 'next/link';

const featureGroups = [
  {
    title: 'Core MIDI',
    items: [
      'Interactive piano roll with MIDI import/export',
      'Built-in soundfont instrument selection',
      'WAV export and visual keyboard playback sync'
    ]
  },
  {
    title: 'Admin Control',
    items: [
      'Admin-only email access registry (signup disabled)',
      'Block/unblock users by email',
      'Upload moderation and storage quota controls'
    ]
  },
  {
    title: 'Studio Pro',
    items: [
      'DJ deck and Groovepad performance surfaces',
      '16-step drum machine',
      'Realtime collaboration rooms with messaging'
    ]
  }
];

export default function HomePage() {
  return (
    <section className="space-y-10">
      <div className="panel p-8 md:p-12">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">MFZ MIDI v0.3.0</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold text-sand md:text-5xl">
          Browser-based music production with controlled user access and live collaboration.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-200 md:text-lg">
          Build, play, export, moderate, and collaborate from one Next.js + Supabase stack.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/editor/piano-roll"
            className="rounded-xl bg-cyan px-4 py-2 font-medium text-ink transition hover:bg-cyan/80"
          >
            Open Studio
          </Link>
          <Link
            href="/auth/login"
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 font-medium text-slate-100 transition hover:bg-white/20"
          >
            User Login
          </Link>
          <Link
            href="/admin"
            className="rounded-xl border border-ember/40 bg-ember/15 px-4 py-2 font-medium text-amber-100 transition hover:bg-ember/25"
          >
            Admin Panel
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {featureGroups.map((group) => (
          <section key={group.title} className="panel p-5">
            <h2 className="text-lg font-semibold text-slate-100">{group.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
