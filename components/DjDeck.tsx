'use client';

import { useMemo, useState } from 'react';

const deckDefaults = [
  { bpm: 122, cue: 'Intro Chop', name: 'Deck A' },
  { bpm: 128, cue: 'Drop Sweep', name: 'Deck B' }
];

export default function DjDeck() {
  const [crossfader, setCrossfader] = useState(50);
  const blendLabel = useMemo(() => {
    if (crossfader < 35) {
      return 'Leaning Deck A';
    }
    if (crossfader > 65) {
      return 'Leaning Deck B';
    }
    return 'Center Blend';
  }, [crossfader]);

  return (
    <div className="panel space-y-5 p-5">
      <div className="grid gap-4 md:grid-cols-2">
        {deckDefaults.map((deck) => (
          <div key={deck.name} className="rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">{deck.name}</p>
            <p className="mt-2 text-xl font-semibold text-slate-100">{deck.cue}</p>
            <p className="text-sm text-slate-300">{deck.bpm} BPM</p>
            <div className="mt-4 flex gap-2">
              <button className="rounded-lg bg-cyan px-3 py-1 text-sm font-medium text-ink">Play</button>
              <button className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-100">
                Cue
              </button>
              <button className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-100">
                Loop
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-200">
          <span>Crossfader</span>
          <span className="font-mono text-xs text-cyan">{blendLabel}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={crossfader}
          onChange={(event) => setCrossfader(Number(event.target.value))}
          className="w-full accent-ember"
        />
      </div>
    </div>
  );
}
