'use client';

import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { midiToNoteName, type NoteEvent } from '@/lib/midiPlayer';

const defaultPitchRange = Array.from({ length: 12 }, (_, index) => 72 - index);
const defaultStepDuration = 0.25;

interface PianoRollGridProps {
  notes: NoteEvent[];
  onNotesChange: (nextNotes: NoteEvent[]) => void;
  pitchRange?: number[];
  stepDuration?: number;
  steps?: number;
}

export interface PianoRollGridHandle {
  clear: () => void;
  exportNotes: () => NoteEvent[];
}

function cellKey(midi: number, time: number) {
  return `${midi}-${time.toFixed(3)}`;
}

const PianoRollGrid = forwardRef<PianoRollGridHandle, PianoRollGridProps>(function PianoRollGrid(
  {
    notes,
    onNotesChange,
    pitchRange = defaultPitchRange,
    stepDuration = defaultStepDuration,
    steps = 32
  },
  ref
) {
  const noteLookup = useMemo(() => {
    return new Map(notes.map((note) => [cellKey(note.midi, note.time), note]));
  }, [notes]);

  useImperativeHandle(
    ref,
    () => ({
      clear: () => onNotesChange([]),
      exportNotes: () => [...notes]
    }),
    [notes, onNotesChange]
  );

  const toggleCell = (midi: number, stepIndex: number) => {
    const time = stepIndex * stepDuration;
    const key = cellKey(midi, time);

    if (noteLookup.has(key)) {
      onNotesChange(notes.filter((note) => cellKey(note.midi, note.time) !== key));
      return;
    }

    const nextNote: NoteEvent = {
      duration: stepDuration,
      id: `${Date.now()}-${midi}-${stepIndex}`,
      midi,
      pitch: midiToNoteName(midi),
      time,
      velocity: 0.85
    };

    onNotesChange([...notes, nextNote].sort((left, right) => left.time - right.time || right.midi - left.midi));
  };

  return (
    <div className="panel overflow-x-auto p-3">
      <div className="grid min-w-[900px] gap-1">
        {pitchRange.map((midi, rowIndex) => (
          <div key={midi} className="grid grid-cols-[72px_repeat(32,_minmax(20px,_1fr))] gap-1">
            <div className="flex items-center justify-start rounded-md bg-black/20 px-2 text-xs text-slate-300">
              {midiToNoteName(midi)}
            </div>
            {Array.from({ length: steps }).map((_, stepIndex) => {
              const time = stepIndex * stepDuration;
              const isActive = noteLookup.has(cellKey(midi, time));
              const barStart = stepIndex % 4 === 0;
              return (
                <button
                  key={`${midi}-${stepIndex}`}
                  type="button"
                  data-testid={`cell-${rowIndex}-${stepIndex}`}
                  onClick={() => toggleCell(midi, stepIndex)}
                  className={`h-7 rounded-sm border transition ${
                    barStart ? 'border-white/20' : 'border-white/10'
                  } ${
                    isActive
                      ? 'bg-ember text-slate-900 hover:bg-amber-300'
                      : 'bg-slate-900/45 hover:bg-cyan/30'
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

export default PianoRollGrid;
