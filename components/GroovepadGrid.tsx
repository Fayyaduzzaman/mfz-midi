'use client';

import { useRef, useState } from 'react';

const pads = Array.from({ length: 16 }, (_, index) => `Pad ${index + 1}`);

function triggerPadSound(audioContext: AudioContext, index: number) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'square';
  oscillator.frequency.value = 180 + index * 18;
  gain.gain.value = 0.16;

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.12);
}

export default function GroovepadGrid() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [activePad, setActivePad] = useState<string | null>(null);

  const onPadTrigger = async (pad: string, index: number) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    triggerPadSound(audioContextRef.current, index);
    setActivePad(pad);
    window.setTimeout(() => setActivePad((current) => (current === pad ? null : current)), 160);
  };

  return (
    <div className="panel space-y-4 p-5">
      <p className="text-sm text-slate-200">Groovepad mode (sample trigger scaffold)</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {pads.map((pad, index) => (
          <button
            key={pad}
            type="button"
            onClick={() => onPadTrigger(pad, index)}
            className={`rounded-xl border px-4 py-5 text-left text-sm transition ${
              activePad === pad
                ? 'border-ember bg-ember/80 text-slate-900'
                : 'border-white/15 bg-black/25 text-slate-100 hover:bg-cyan/20'
            }`}
          >
            <span className="font-mono text-xs uppercase text-cyan">Trigger</span>
            <p className="mt-2 text-base">{pad}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
