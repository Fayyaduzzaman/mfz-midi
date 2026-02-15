'use client';

import { useRef } from 'react';

interface EditorToolbarProps {
  engine: 'soundfont' | 'tone';
  onClear: () => void;
  onExportMidi: () => Promise<void>;
  onExportWav: () => Promise<void>;
  onImportMidi: (file: File) => Promise<void>;
  onInstrumentUpload: (file: File) => Promise<void>;
  onLoadProjects: () => Promise<void>;
  onSaveProject: () => Promise<void>;
  onSetEngine: (engine: 'soundfont' | 'tone') => void;
  onSetSoundfontName: (name: string) => void;
  soundfontName: string;
  soundfontOptions: Array<{ label: string; value: string }>;
}

export default function EditorToolbar({
  engine,
  onClear,
  onExportMidi,
  onExportWav,
  onImportMidi,
  onInstrumentUpload,
  onLoadProjects,
  onSaveProject,
  onSetEngine,
  onSetSoundfontName,
  soundfontName,
  soundfontOptions
}: EditorToolbarProps) {
  const midiInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="panel flex flex-wrap items-center gap-3 p-4">
      <button
        type="button"
        onClick={() => midiInputRef.current?.click()}
        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/20"
      >
        Import MIDI
      </button>
      <button
        type="button"
        onClick={onExportMidi}
        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/20"
      >
        Export MIDI
      </button>
      <button
        type="button"
        onClick={onExportWav}
        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/20"
      >
        Export WAV
      </button>
      <button
        type="button"
        onClick={onSaveProject}
        className="rounded-lg bg-cyan px-3 py-2 text-sm font-semibold text-ink transition hover:bg-cyan/80"
      >
        Save Project
      </button>
      <button
        type="button"
        onClick={onLoadProjects}
        className="rounded-lg border border-cyan/40 bg-cyan/10 px-3 py-2 text-sm text-cyan transition hover:bg-cyan/20"
      >
        Refresh Projects
      </button>

      <label className="flex items-center gap-2 text-sm text-slate-200">
        Engine
        <select
          value={engine}
          onChange={(event) => onSetEngine(event.target.value as 'soundfont' | 'tone')}
          className="rounded-lg border border-white/20 bg-black/30 px-2 py-1 text-slate-100"
        >
          <option value="tone">Tone Synth</option>
          <option value="soundfont">Soundfont Piano</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-200">
        Instrument
        <select
          value={soundfontName}
          onChange={(event) => onSetSoundfontName(event.target.value)}
          className="rounded-lg border border-white/20 bg-black/30 px-2 py-1 text-slate-100"
        >
          {soundfontOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => uploadInputRef.current?.click()}
        className="rounded-lg border border-ember/40 bg-ember/15 px-3 py-2 text-sm text-amber-100 transition hover:bg-ember/25"
      >
        Upload Instrument
      </button>
      <button
        type="button"
        onClick={onClear}
        className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-slate-100 transition hover:bg-black/30"
      >
        Clear Grid
      </button>

      <input
        ref={midiInputRef}
        type="file"
        accept=".mid,.midi"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImportMidi(file);
          }
          event.currentTarget.value = '';
        }}
      />

      <input
        ref={uploadInputRef}
        type="file"
        accept=".sf2,.sf3,.wav,.aiff,.mp3"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onInstrumentUpload(file);
          }
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}
