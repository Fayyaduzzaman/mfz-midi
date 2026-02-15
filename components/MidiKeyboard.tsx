'use client';

import { useMemo } from 'react';

const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToLabel(midi: number) {
  const name = pitchNames[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

interface MidiKeyboardProps {
  activeMidiNotes?: number[];
  endMidi?: number;
  onTrigger?: (midi: number) => void;
  startMidi?: number;
}

export default function MidiKeyboard({
  activeMidiNotes = [],
  endMidi = 72,
  onTrigger,
  startMidi = 48
}: MidiKeyboardProps) {
  const activeLookup = useMemo(() => new Set(activeMidiNotes), [activeMidiNotes]);
  const keys = useMemo(
    () =>
      Array.from({ length: endMidi - startMidi + 1 }, (_, index) => startMidi + index).map((midi) => {
        const noteName = pitchNames[midi % 12];
        const isSharp = noteName.includes('#');
        return {
          isSharp,
          label: midiToLabel(midi),
          midi
        };
      }),
    [endMidi, startMidi]
  );

  return (
    <div className="panel space-y-3 p-4">
      <p className="text-sm text-slate-200">Visual Keyboard</p>
      <div className="grid grid-cols-5 gap-2 md:grid-cols-10 xl:grid-cols-12">
        {keys.map((key) => {
          const isActive = activeLookup.has(key.midi);
          return (
            <button
              key={key.midi}
              type="button"
              data-testid={`keyboard-key-${key.midi}`}
              onClick={() => onTrigger?.(key.midi)}
              className={`rounded-lg border px-2 py-3 text-center text-xs transition ${
                key.isSharp
                  ? 'border-cyan/40 bg-cyan/15 text-cyan'
                  : 'border-white/15 bg-slate-100 text-slate-900'
              } ${isActive ? 'ring-2 ring-ember' : 'hover:ring-2 hover:ring-cyan/70'}`}
            >
              {key.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
