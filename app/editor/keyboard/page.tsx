'use client';

import { useState } from 'react';
import MidiKeyboard from '@/components/MidiKeyboard';

export default function KeyboardPage() {
  const [activeNotes, setActiveNotes] = useState<number[]>([60]);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-sand">Visual Keyboard</h1>
      <p className="text-sm text-slate-300">Midiano-style keyboard with note highlight controls.</p>
      <MidiKeyboard
        activeMidiNotes={activeNotes}
        onTrigger={(midi) => {
          setActiveNotes((current) => {
            if (current.includes(midi)) {
              return current.filter((note) => note !== midi);
            }
            return [...current, midi];
          });
        }}
      />
    </section>
  );
}
