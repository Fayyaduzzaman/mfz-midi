import DjDeck from '@/components/DjDeck';

export default function DjDeckPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-sand">DJ Deck</h1>
      <p className="text-sm text-slate-300">Two-deck mixing scaffold with crossfader controls.</p>
      <DjDeck />
    </section>
  );
}
