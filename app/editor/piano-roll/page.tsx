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
  listProjectsForUser,
  uploadInstrumentAsset,
  type ProjectRow
} from '@/lib/supabaseClient';

const defaultNotes: NoteEvent[] = [
  { id: 'boot-1', midi: 60, pitch: 'C4', time: 0, duration: 0.5, velocity: 0.85 },
  { id: 'boot-2', midi: 64, pitch: 'E4', time: 0.5, duration: 0.5, velocity: 0.85 },
  { id: 'boot-3', midi: 67, pitch: 'G4', time: 1, duration: 0.5, velocity: 0.85 }
];

export default function PianoRollPage() {
  const gridRef = useRef<PianoRollGridHandle | null>(null);
  const playerRef = useRef<MidiPlayer | null>(null);
  const { profile, session } = useAuth();

  const [notes, setNotes] = useState<NoteEvent[]>(defaultNotes);
  const [tempo, setTempo] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [engine, setEngine] = useState<EngineKind>('tone');
  const [webMidiState, setWebMidiState] = useState<WebMidiState>('unsupported');
  const [status, setStatus] = useState('Ready');
  const [projectName, setProjectName] = useState('Untitled Session');
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    playerRef.current = new MidiPlayer();
    void detectWebMidiSupport().then((state) => setWebMidiState(state));

    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, []);

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

  useEffect(() => {
    if (session?.user.id) {
      void loadProjects();
    }
  }, [loadProjects, session?.user.id]);

  const handlePlay = async () => {
    if (!playerRef.current) {
      return;
    }

    const scheduledPreview = playerRef.current.estimateScheduledCount(notes, tempo);
    const globalWindow = window as Window & { __MFZ_LAST_SCHEDULE_COUNT?: number };
    globalWindow.__MFZ_LAST_SCHEDULE_COUNT = scheduledPreview;

    try {
      await playerRef.current.play(notes, { engine, tempo });
      setIsPlaying(true);
      globalWindow.__MFZ_LAST_SCHEDULE_COUNT = Math.max(
        scheduledPreview,
        playerRef.current.getScheduledCount()
      );
      setStatus(`Playing ${notes.length} note(s) with ${engine} engine.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown playback failure.';
      setStatus(`Playback failed: ${message}`);
    }
  };

  const handlePause = () => {
    playerRef.current?.pause();
    setIsPlaying(false);
  };

  const handleStop = () => {
    playerRef.current?.stop();
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

    setStatus('Instrument uploaded and queued for admin approval.');
  };

  const activeMidiNotes = useMemo(() => {
    return Array.from(new Set(notes.map((note) => note.midi))).slice(0, 25);
  }, [notes]);

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
      </div>

      <EditorToolbar
        engine={engine}
        onSetEngine={setEngine}
        onImportMidi={handleImportMidi}
        onExportMidi={handleExportMidi}
        onExportWav={handleExportWav}
        onSaveProject={handleSaveProject}
        onLoadProjects={loadProjects}
        onInstrumentUpload={handleUploadInstrument}
        onClear={() => {
          gridRef.current?.clear();
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
