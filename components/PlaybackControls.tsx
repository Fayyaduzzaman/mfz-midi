'use client';

import { useEffect } from 'react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  tempo: number;
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
  onTempoChange: (nextTempo: number) => void;
}

export default function PlaybackControls({
  isPlaying,
  tempo,
  onPause,
  onPlay,
  onStop,
  onTempoChange
}: PlaybackControlsProps) {
  useEffect(() => {
    const handleShortcuts = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        if (isPlaying) {
          onPause();
        } else {
          onPlay();
        }
      }

      if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onStop();
      }
    };

    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [isPlaying, onPause, onPlay, onStop]);

  return (
    <div className="panel flex flex-wrap items-center gap-4 p-4">
      <button
        type="button"
        data-testid="play-button"
        onClick={isPlaying ? onPause : onPlay}
        className="rounded-lg bg-cyan px-4 py-2 font-medium text-ink transition hover:bg-cyan/80"
      >
        {isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      </button>
      <button
        type="button"
        onClick={onStop}
        className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-slate-100 transition hover:bg-white/20"
      >
        Stop (K)
      </button>

      <label className="flex items-center gap-2 text-sm text-slate-200">
        Tempo
        <input
          type="range"
          min={60}
          max={180}
          value={tempo}
          onChange={(event) => onTempoChange(Number(event.target.value))}
          className="accent-cyan"
        />
        <span className="w-12 text-right font-mono text-xs text-cyan">{tempo} BPM</span>
      </label>
    </div>
  );
}
