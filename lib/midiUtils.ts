import MidiWriter from 'midi-writer-js';
import { parseMidi } from 'midi-file';
import { midiToNoteName, type NoteEvent } from '@/lib/midiPlayer';

const TICKS_PER_BEAT = 128;

function beatsToTicks(beats: number) {
  return Math.max(1, Math.round(beats * TICKS_PER_BEAT));
}

function ticksToBeats(ticks: number, ticksPerBeat: number) {
  return ticks / Math.max(1, ticksPerBeat);
}

export function exportNotesToMidiBlob(notes: NoteEvent[], tempo = 120) {
  const track = new MidiWriter.Track();
  track.setTempo(tempo);

  [...notes]
    .sort((left, right) => left.time - right.time || left.midi - right.midi)
    .forEach((note) => {
      track.addEvent(
        new MidiWriter.NoteEvent({
          duration: `T${beatsToTicks(note.duration)}`,
          pitch: [midiToNoteName(note.midi)],
          startTick: beatsToTicks(note.time),
          velocity: Math.round(Math.min(Math.max(note.velocity, 0), 1) * 100)
        })
      );
    });

  const writer = new MidiWriter.Writer([track]);
  const fileBuffer = writer.buildFile();
  const typedArray = fileBuffer instanceof Uint8Array ? fileBuffer : new Uint8Array(fileBuffer);
  const safeBytes = new Uint8Array(typedArray.byteLength);
  safeBytes.set(typedArray);

  return new Blob([safeBytes.buffer as ArrayBuffer], { type: 'audio/midi' });
}

export async function parseMidiFileToNotes(file: File) {
  const buffer = await file.arrayBuffer();
  const parsed = parseMidi(new Uint8Array(buffer));

  const ticksPerBeat = parsed.header.ticksPerBeat ?? 480;
  const notes: NoteEvent[] = [];

  parsed.tracks.forEach((track, trackIndex) => {
    let currentTicks = 0;
    const activeNotes = new Map<string, { startTicks: number; velocity: number }>();

    track.forEach((event, eventIndex) => {
      // TODO(strict): replace event any by adding complete midi-file event discriminated unions.
      const typedEvent = event as any;
      currentTicks += typedEvent.deltaTime ?? 0;

      if (typedEvent.type === 'noteOn' && typedEvent.velocity > 0) {
        const key = `${typedEvent.channel}-${typedEvent.noteNumber}`;
        activeNotes.set(key, {
          startTicks: currentTicks,
          velocity: Math.max(0.05, typedEvent.velocity / 127)
        });
      }

      if (
        typedEvent.type === 'noteOff' ||
        (typedEvent.type === 'noteOn' && typedEvent.velocity === 0)
      ) {
        const key = `${typedEvent.channel}-${typedEvent.noteNumber}`;
        const started = activeNotes.get(key);

        if (!started) {
          return;
        }

        const durationTicks = Math.max(1, currentTicks - started.startTicks);
        const startBeats = ticksToBeats(started.startTicks, ticksPerBeat);
        const durationBeats = ticksToBeats(durationTicks, ticksPerBeat);

        notes.push({
          channel: typedEvent.channel,
          duration: durationBeats,
          id: `trk-${trackIndex}-${eventIndex}-${typedEvent.noteNumber}`,
          midi: typedEvent.noteNumber,
          pitch: midiToNoteName(typedEvent.noteNumber),
          time: startBeats,
          velocity: started.velocity
        });

        activeNotes.delete(key);
      }
    });
  });

  return notes.sort((left, right) => left.time - right.time || left.midi - right.midi);
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function notesToProjectJson(notes: NoteEvent[], tempo: number) {
  return {
    notes,
    tempo
  };
}

export function projectJsonToNotes(payload: unknown): NoteEvent[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const notesValue = (payload as { notes?: unknown }).notes;
  if (!Array.isArray(notesValue)) {
    return [];
  }

  return notesValue
    .map((note, index) => {
      if (!note || typeof note !== 'object') {
        return null;
      }

      const raw = note as Record<string, unknown>;
      const midi = Number(raw.midi ?? 60);

      return {
        duration: Number(raw.duration ?? 0.25),
        id: String(raw.id ?? `project-note-${index}`),
        midi,
        pitch: typeof raw.pitch === 'string' ? raw.pitch : midiToNoteName(midi),
        time: Number(raw.time ?? 0),
        velocity: Number(raw.velocity ?? 0.8)
      } satisfies NoteEvent;
    })
    .filter((note): note is NoteEvent => Boolean(note));
}
