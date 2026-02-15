import Link from 'next/link';

const tabs = [
  { href: '/editor/piano-roll', label: 'Piano Roll' },
  { href: '/editor/dj-deck', label: 'DJ Deck' },
  { href: '/editor/groovepad', label: 'Groovepad' },
  { href: '/editor/keyboard', label: 'Keyboard' },
  { href: '/editor/sheet', label: 'Sheet Placeholder' }
];

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="panel p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100 transition hover:bg-cyan/20"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </section>
  );
}
