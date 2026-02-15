Task: Create lib/midiPlayer.ts (TypeScript) for MFZ MIDI.

Requirements:
- Export default class MidiPlayer with methods:
  - init(): Promise<void>
  - playNotes(notes: NoteEvent[]): Promise<void>
  - stop(): void
- Export type NoteEvent = { midi: number; time: number; duration: number; velocity?: number }.
- Use Tone.js as primary playback engine. Use Tone.PolySynth with a simple envelope.
- init() must call wait Tone.start() and create the synth and start Transport if needed.
- playNotes() should schedule notes via Tone.Transport.schedule() or scheduleOnce(); times in seconds relative to Tone.now().
- Provide a small optional switch (commented) showing how to plug in soundfont-player later (do not import soundfont-player here).
- Keep code strictly typed (TypeScript), include JSDoc comments, and include a short usage example in a comment at the bottom of the file.
- Do not change other files. Provide only the file content.
