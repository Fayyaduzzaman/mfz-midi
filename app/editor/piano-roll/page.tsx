'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EditorToolbar from '@/components/EditorToolbar';
import MidiKeyboard from '@/components/MidiKeyboard';
import PianoRollGrid, { type PianoRollGridHandle } from '@/components/PianoRollGrid';
import PlaybackControls from '@/components/PlaybackControls';
import { useAuth } from '@/components/AuthProvider';
import { exportNotesToWavBlob } from '@/lib/audioExport';
import {
  detectWebMidiSupport,
  MidiPlayer,
  type EngineKind,
  type NoteEvent,
  type ScheduledEvent,
  type WebMidiState
} from '@/lib/midiPlayer';
import {
  downloadBlob,
  exportNotesToMidiBlob,
  notesToProjectJson,
  parseMidiFileToNotes,
  projectJsonToNotes
} from '@/lib/midiUtils';
import {
  createProjectRecord,
  createSoundfontUpload,
  getSiteSetting,
  getUserSoundfontUsageBytes,
  listProjectsForUser,
  uploadInstrumentAsset,
  type ProjectRow
} from '@/lib/supabaseClient';

const defaultNotes: NoteEvent[] = [
  { id: 'boot-1', midi: 60, pitch: 'C4', time: 0, duration: 0.5, velocity: 0.85 },
  { id: 'boot-2', midi: 64, pitch: 'E4', time: 0.5, duration: 0.5, velocity: 0.85 },
  { id: 'boot-3', midi: 67, pitch: 'G4', time: 1, duration: 0.5, velocity: 0.85 }
];

const soundfontOptions = [
  { label: 'Acoustic Grand Piano', value: 'acoustic_grand_piano' },
  { label: 'Electric Piano 1', value: 'electric_piano_1' },
  { label: 'Electric Piano 2', value: 'electric_piano_2' },
  { label: 'Church Organ', value: 'church_organ' },
  { label: 'Acoustic Guitar', value: 'acoustic_guitar_nylon' },
  { label: 'Synth Brass', value: 'synth_brass_1' },
  { label: 'Violin', value: 'violin' }
];

function clampQuotaMb(value: unknown, fallback = 120) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(10, Math.min(5000, value));
  }
  return fallback;
}

export default function PianoRollPage() {
  const gridRef = useRef<PianoRollGridHandle | null>(null);
  const playerRef = useRef<MidiPlayer | null>(null);
  const syncTimeoutsRef = useRef<number[]>([]);
  const { profile, session } = useAuth();

  const [notes, setNotes] = useState<NoteEvent[]>(defaultNotes);
  const [tempo, setTempo] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [engine, setEngine] = useState<EngineKind>('tone');
  const [soundfontName, setSoundfontName] = useState('acoustic_grand_piano');
  const [webMidiState, setWebMidiState] = useState<WebMidiState>('unsupported');
  const [status, setStatus] = useState('Ready');
  const [projectName, setProjectName] = useState('Untitled Session');
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activePlaybackNotes, setActivePlaybackNotes] = useState<number[]>([]);
  const [quotaLimitMb, setQuotaLimitMb] = useState(120);
  const [quotaUsedMb, setQuotaUsedMb] = useState(0);

  const clearPlaybackSync = useCallback(() => {
    syncTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    syncTimeoutsRef.current = [];
    setActivePlaybackNotes([]);
  }, []);

  const schedulePlaybackSync = useCallback(
    (events: ScheduledEvent[]) => {
      clearPlaybackSync();

      const activeMidi = new Set<number>();
      const setActive = () => {
        setActivePlaybackNotes(Array.from(activeMidi).sort((left, right) => left - right));
      };

      events.forEach((event) => {
        const noteOnTimeout = window.setTimeout(() => {
          activeMidi.add(event.midi);
          setActive();
        }, event.timeSeconds * 1000);

        const noteOffTimeout = window.setTimeout(() => {
          activeMidi.delete(event.midi);
          setActive();
        }, (event.timeSeconds + event.durationSeconds) * 1000);

        syncTimeoutsRef.current.push(noteOnTimeout, noteOffTimeout);
      });

      const maxEndMs =
        events.reduce((maxTime, event) => Math.max(maxTime, event.timeSeconds + event.durationSeconds), 0) * 1000;
      const doneTimeout = window.setTimeout(() => {
        setActivePlaybackNotes([]);
        setIsPlaying(false);
      }, maxEndMs + 120);
      syncTimeoutsRef.current.push(doneTimeout);
    },
    [clearPlaybackSync]
  );

  useEffect(() => {
    playerRef.current = new MidiPlayer();
    void detectWebMidiSupport().then((state) => setWebMidiState(state));

    return () => {
      clearPlaybackSync();
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, [clearPlaybackSync]);

  const loadProjects = useCallback(async () => {
    if (!session?.user.id) {
      setStatus('Login required to load projects.');
      return;
    }

    const { data, error } = await listProjectsForUser(session.user.id);
    if (error) {
      setStatus(`Failed to load projects: ${error.message}`);
      return;
    }

    const nextProjects = data ?? [];
    setProjects(nextProjects);
    if (nextProjects[0]) {
      setSelectedProjectId(nextProjects[0].id);
    }
    setStatus(`Loaded ${nextProjects.length} project(s).`);
  }, [session?.user.id]);

  const loadQuotaUsage = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }

    const [quotaResult, usageResult] = await Promise.all([
      getSiteSetting('storage_quota_mb'),
      getUserSoundfontUsageBytes(session.user.id)
    ]);

    if (quotaResult.data) {
      setQuotaLimitMb(clampQuotaMb(quotaResult.data.value));
    }

    if (usageResult.data !== null && usageResult.data !== undefined) {
      setQuotaUsedMb(usageResult.data / (1024 * 1024));
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (session?.user.id) {
      void loadProjects();
      void loadQuotaUsage();
    }
  }, [loadProjects, loadQuotaUsage, session?.user.id]);

  const handlePlay = async () => {
    if (!playerRef.current) {
      return;
    }

    const scheduledPreview = playerRef.current.estimateScheduledCount(notes, tempo);
    const globalWindow = window as Window & { __MFZ_LAST_SCHEDULE_COUNT?: number };
    globalWindow.__MFZ_LAST_SCHEDULE_COUNT = scheduledPreview;

    try {
      await playerRef.current.play(notes, { engine, soundfontName, tempo });
      const scheduled = playerRef.current.getScheduledEvents();
      schedulePlaybackSync(scheduled);

      setIsPlaying(true);
      globalWindow.__MFZ_LAST_SCHEDULE_COUNT = Math.max(
        scheduledPreview,
        playerRef.current.getScheduledCount()
      );
      setStatus(
        `Playing ${notes.length} note(s) with ${engine}${engine === 'soundfont' ? ` (${soundfontName})` : ''}.`
      );
    } catch (error) {
      if (engine === 'soundfont') {
        try {
          await playerRef.current.play(notes, { engine: 'tone', tempo });
          const scheduled = playerRef.current.getScheduledEvents();
          schedulePlaybackSync(scheduled);
          setEngine('tone');
          setIsPlaying(true);
          setStatus('Soundfont engine failed. Playback switched to Tone Synth automatically.');
          return;
        } catch {
          // Fallback failed too; keep original error handling below.
        }
      }

      const message = error instanceof Error ? error.message : 'Unknown playback failure.';
      setStatus(`Playback failed: ${message}`);
    }
  };

  const handlePause = () => {
    playerRef.current?.pause();
    clearPlaybackSync();
    setIsPlaying(false);
  };

  const handleStop = () => {
    playerRef.current?.stop();
    clearPlaybackSync();
    setIsPlaying(false);
    setStatus('Playback stopped.');
  };

  const handleImportMidi = async (file: File) => {
    try {
      const importedNotes = await parseMidiFileToNotes(file);
      if (importedNotes.length === 0) {
        setStatus('No note events found in the MIDI file.');
        return;
      }

      setNotes(importedNotes);
      setStatus(`Imported ${importedNotes.length} note(s) from ${file.name}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import MIDI.';
      setStatus(message);
    }
  };

  const handleExportMidi = async () => {
    const midiBlob = exportNotesToMidiBlob(notes, tempo);
    downloadBlob(midiBlob, `${projectName.replace(/\s+/g, '-').toLowerCase() || 'mfz-session'}.mid`);
    setStatus('MIDI file exported.');
  };

  const handleExportWav = async () => {
    const wavBlob = await exportNotesToWavBlob(notes, { tempo });
    downloadBlob(wavBlob, `${projectName.replace(/\s+/g, '-').toLowerCase() || 'mfz-session'}.wav`);
    setStatus('WAV file exported.');
  };

  const handleSaveProject = async () => {
    if (!session?.user.id) {
      setStatus('Login required to save projects to Supabase.');
      return;
    }

    const payload = notesToProjectJson(notes, tempo);
    const { data, error } = await createProjectRecord({
      description: `Saved from piano roll by ${profile?.display_name ?? session.user.email ?? 'member'}`,
      midi_json: payload,
      name: projectName,
      owner_id: session.user.id,
      storage_refs: []
    });

    if (error) {
      setStatus(`Project save failed: ${error.message}`);
      return;
    }

    setStatus(`Project saved (${data?.id ?? 'new row'}).`);
    await loadProjects();
  };

  const handleLoadSelectedProject = () => {
    const selected = projects.find((project) => project.id === selectedProjectId);
    if (!selected) {
      setStatus('Choose a saved project first.');
      return;
    }

    const restoredNotes = projectJsonToNotes(selected.midi_json);
    setNotes(restoredNotes);
    setProjectName(selected.name);
    setTempo(selected.midi_json.tempo ?? 120);
    setStatus(`Loaded project: ${selected.name}`);
  };

  const handleUploadInstrument = async (file: File) => {
    if (!session?.user.id) {
      setStatus('Login required for storage uploads.');
      return;
    }

    const [quotaResult, usageResult] = await Promise.all([
      getSiteSetting('storage_quota_mb'),
      getUserSoundfontUsageBytes(session.user.id)
    ]);

    if (usageResult.error) {
      setStatus(`Usage check failed: ${usageResult.error.message}`);
      return;
    }

    const quotaMb = clampQuotaMb(quotaResult.data?.value, quotaLimitMb);
    const usedBytes = usageResult.data ?? 0;
    const quotaBytes = quotaMb * 1024 * 1024;
    const nextTotal = usedBytes + file.size;

    if (nextTotal > quotaBytes) {
      setStatus(
        `Upload blocked by quota. Current usage ${(usedBytes / (1024 * 1024)).toFixed(1)}MB / ${quotaMb}MB.`
      );
      return;
    }

    const storageResult = await uploadInstrumentAsset(file, session.user.id);
    if (storageResult.error || !storageResult.data) {
      setStatus(`Upload failed: ${storageResult.error?.message ?? 'Unknown error'}`);
      return;
    }

    const recordResult = await createSoundfontUpload({
      bucket: storageResult.data.bucket,
      label: file.name,
      mime_type: file.type || 'application/octet-stream',
      owner_id: session.user.id,
      size_bytes: file.size,
      storage_path: storageResult.data.path
    });

    if (recordResult.error) {
      setStatus(`Upload record failed: ${recordResult.error.message}`);
      return;
    }

    await loadQuotaUsage();
    setStatus('Instrument uploaded and queued for admin approval.');
  };

  const activeMidiNotes = useMemo(() => {
    if (activePlaybackNotes.length > 0) {
      return activePlaybackNotes;
    }
    return Array.from(new Set(notes.map((note) => note.midi))).slice(0, 25);
  }, [activePlaybackNotes, notes]);

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <label className="flex items-center gap-2 text-sm text-slate-200">
          Project Name
          <input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            className="rounded-lg border border-white/15 bg-black/35 px-3 py-1 text-slate-100"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-200">
          Saved Project
          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="rounded-lg border border-white/15 bg-black/35 px-2 py-1 text-slate-100"
          >
            <option value="">Select...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleLoadSelectedProject}
          className="rounded-lg border border-cyan/40 bg-cyan/10 px-3 py-2 text-sm text-cyan transition hover:bg-cyan/20"
        >
          Load Selected
        </button>

        <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs text-slate-300">
          WebMIDI: {webMidiState}
        </span>
        <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs text-slate-300">
          Quota: {quotaUsedMb.toFixed(1)}MB / {quotaLimitMb}MB
        </span>
      </div>

      <EditorToolbar
        engine={engine}
        onSetEngine={setEngine}
        onSetSoundfontName={setSoundfontName}
        soundfontName={soundfontName}
        soundfontOptions={soundfontOptions}
        onImportMidi={handleImportMidi}
        onExportMidi={handleExportMidi}
        onExportWav={handleExportWav}
        onSaveProject={handleSaveProject}
        onLoadProjects={loadProjects}
        onInstrumentUpload={handleUploadInstrument}
        onClear={() => {
          gridRef.current?.clear();
          clearPlaybackSync();
          setStatus('Grid cleared.');
        }}
      />

      <PlaybackControls
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        tempo={tempo}
        onTempoChange={setTempo}
      />

      <PianoRollGrid ref={gridRef} notes={notes} onNotesChange={setNotes} />

      <MidiKeyboard activeMidiNotes={activeMidiNotes} />

      <div className="panel p-3 text-sm text-slate-200">
        <p>{status}</p>
      </div>
    </div>
  );
}
