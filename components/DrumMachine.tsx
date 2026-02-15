'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type DrumLane = 'hat' | 'kick' | 'snare';

const steps = Array.from({ length: 16 }, (_, index) => index);
const defaultPattern: Record<DrumLane, boolean[]> = {
  hat: Array.from({ length: 16 }, (_, index) => index % 2 === 0),
  kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  snare: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false]
};

function triggerKick(context: AudioContext, when: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(140, when);
  oscillator.frequency.exponentialRampToValueAtTime(45, when + 0.09);
  gain.gain.setValueAtTime(0.8, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.09);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(when);
  oscillator.stop(when + 0.1);
}

function triggerSnare(context: AudioContext, when: number) {
  const noise = context.createBufferSource();
  const buffer = context.createBuffer(1, context.sampleRate * 0.12, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;

  const filter = context.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1400;

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.45, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.08);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  noise.start(when);
  noise.stop(when + 0.09);
}

function triggerHat(context: AudioContext, when: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(8000, when);
  gain.gain.setValueAtTime(0.14, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.035);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(when);
  oscillator.stop(when + 0.04);
}

export default function DrumMachine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [tempo, setTempo] = useState(120);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pattern, setPattern] = useState(defaultPattern);

  const getContext = useCallback(async () => {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const playStep = useCallback(
    async (stepIndex: number) => {
      const context = await getContext();
      if (!context) {
        return;
      }

      const when = context.currentTime + 0.005;
      if (pattern.kick[stepIndex]) {
        triggerKick(context, when);
      }
      if (pattern.snare[stepIndex]) {
        triggerSnare(context, when);
      }
      if (pattern.hat[stepIndex]) {
        triggerHat(context, when);
      }
    },
    [getContext, pattern]
  );

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const msPerStep = (60_000 / tempo) / 4;
    intervalRef.current = window.setInterval(() => {
      setCurrentStep((prev) => {
        const stepIndex = (prev + 1) % 16;
        void playStep(stepIndex);
        return stepIndex;
      });
    }, msPerStep);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playStep, tempo]);

  const toggleStep = (lane: DrumLane, stepIndex: number) => {
    setPattern((current) => {
      const nextLane = [...current[lane]];
      nextLane[stepIndex] = !nextLane[stepIndex];
      return {
        ...current,
        [lane]: nextLane
      };
    });
  };

  const laneRows: Array<{ key: DrumLane; label: string; accentClass: string }> = [
    { key: 'kick', label: 'Kick', accentClass: 'bg-cyan/75' },
    { key: 'snare', label: 'Snare', accentClass: 'bg-ember/75' },
    { key: 'hat', label: 'Hat', accentClass: 'bg-slate-200/80' }
  ];

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (!isPlaying) {
              void playStep(currentStep);
            }
            setIsPlaying((current) => !current);
          }}
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-ink transition hover:bg-cyan/80"
        >
          {isPlaying ? 'Stop' : 'Start'}
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          Tempo
          <input
            type="range"
            min={70}
            max={170}
            value={tempo}
            onChange={(event) => setTempo(Number(event.target.value))}
            className="accent-cyan"
          />
          <span className="w-14 text-right font-mono text-xs text-cyan">{tempo} BPM</span>
        </label>
      </div>

      <div className="space-y-3">
        {laneRows.map((lane) => (
          <div key={lane.key} className="grid grid-cols-[70px_repeat(16,_minmax(24px,_1fr))] gap-1">
            <p className="flex items-center text-sm text-slate-200">{lane.label}</p>
            {steps.map((stepIndex) => {
              const isActive = pattern[lane.key][stepIndex];
              const isCurrent = stepIndex === currentStep && isPlaying;

              return (
                <button
                  key={`${lane.key}-${stepIndex}`}
                  type="button"
                  onClick={() => toggleStep(lane.key, stepIndex)}
                  className={`h-8 rounded border transition ${
                    isActive ? `${lane.accentClass} border-white/60` : 'border-white/15 bg-black/30'
                  } ${isCurrent ? 'ring-2 ring-cyan' : 'hover:border-cyan/50'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
