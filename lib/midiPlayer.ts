import { loadSoundfontInstrument, type LoadedSoundfontInstrument } from '@/lib/soundfontLoader';

export type EngineKind = 'soundfont' | 'tone';
export type WebMidiState = 'no-output' | 'permission-denied' | 'supported' | 'unsupported';

export interface NoteEvent {
  channel?: number;
  duration: number;
  id: string;
  midi: number;
  pitch: string;
  time: number;
  velocity: number;
}

export interface PlaybackOptions {
  engine?: EngineKind;
  loop?: boolean;
  soundfontName?: string;
  tempo?: number;
}

export interface ScheduledEvent {
  durationSeconds: number;
  id: string;
  midi: number;
  pitch: string;
  timeSeconds: number;
  velocity: number;
}

const pitchClasses = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number) {
  const clamped = Math.max(0, Math.min(127, Math.round(midi)));
  const pitchClass = pitchClasses[clamped % 12];
  const octave = Math.floor(clamped / 12) - 1;
  return `${pitchClass}${octave}`;
}

export function noteNameToFrequency(noteName: string) {
  const match = noteName.match(/^([A-G])(#?)(-?\d)$/);
  if (!match) {
    return 440;
  }

  const [, pitch, sharp, octaveRaw] = match;
  const noteIndex = pitchClasses.findIndex((name) => name === `${pitch}${sharp}`);
  const midi = (Number(octaveRaw) + 1) * 12 + Math.max(noteIndex, 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

export function buildScheduledEvents(notes: NoteEvent[], tempo = 120): ScheduledEvent[] {
  const safeTempo = Math.max(40, tempo);
  const beatDurationSeconds = 60 / safeTempo;

  return [...notes]
    .sort((left, right) => left.time - right.time || left.midi - right.midi)
    .map((note) => ({
      durationSeconds: Math.max(note.duration * beatDurationSeconds, 0.02),
      id: note.id,
      midi: note.midi,
      pitch: note.pitch || midiToNoteName(note.midi),
      timeSeconds: Math.max(note.time * beatDurationSeconds, 0),
      velocity: Math.min(Math.max(note.velocity, 0), 1)
    }));
}

type ToneModule = typeof import('tone');

interface AudioEngine {
  dispose: () => void;
  getScheduledCount: () => number;
  init: (options?: PlaybackOptions) => Promise<void>;
  pause: () => void;
  play: (events: ScheduledEvent[], options?: PlaybackOptions) => Promise<void>;
  stop: () => void;
}

class ToneEngine implements AudioEngine {
  private scheduledCount = 0;

  private scheduledIds: number[] = [];

  private synth: any = null;
  // TODO(strict): replace synth any with Tone.PolySynth generic when strict mode is enabled.

  private tone: ToneModule | null = null;

  async init() {
    if (typeof window === 'undefined') {
      return;
    }

    if (!this.tone) {
      this.tone = await import('tone');
      this.synth = new this.tone.PolySynth(this.tone.Synth).toDestination();
    }

    if (this.tone.context.state !== 'running') {
      await this.tone.start();
    }
  }

  async play(events: ScheduledEvent[], options?: PlaybackOptions) {
    await this.init();
    if (!this.tone || !this.synth) {
      return;
    }

    this.stop();

    const transport = this.tone.Transport;
    transport.cancel();
    transport.bpm.value = options?.tempo ?? 120;

    this.scheduledIds = events.map((event) =>
      transport.scheduleOnce((time) => {
        this.synth.triggerAttackRelease(event.pitch, event.durationSeconds, time, event.velocity);
      }, event.timeSeconds)
    );

    const maxEnd = events.reduce(
      (maxValue, event) => Math.max(maxValue, event.timeSeconds + event.durationSeconds),
      0
    );

    transport.loop = Boolean(options?.loop);
    transport.loopEnd = maxEnd > 0 ? maxEnd : 1;
    transport.start('+0.04');
    this.scheduledCount = this.scheduledIds.length;
  }

  pause() {
    this.tone?.Transport.pause();
  }

  stop() {
    if (!this.tone) {
      this.scheduledCount = 0;
      this.scheduledIds = [];
      return;
    }

    this.tone.Transport.stop();
    this.tone.Transport.cancel();
    this.scheduledCount = 0;
    this.scheduledIds = [];
  }

  getScheduledCount() {
    return this.scheduledCount;
  }

  dispose() {
    this.stop();
    this.synth?.dispose?.();
    this.synth = null;
  }
}

class SoundfontEngine implements AudioEngine {
  private audioContext: AudioContext | null = null;

  private instrument: LoadedSoundfontInstrument | null = null;

  private instrumentName = 'acoustic_grand_piano';

  private scheduledCount = 0;

  async init(options?: PlaybackOptions) {
    if (typeof window === 'undefined') {
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new window.AudioContext();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const nextInstrumentName = options?.soundfontName ?? this.instrumentName;
    if (!this.instrument || nextInstrumentName !== this.instrumentName) {
      this.instrumentName = nextInstrumentName;
      this.instrument = await loadSoundfontInstrument(this.audioContext, this.instrumentName);
    }
  }

  async play(events: ScheduledEvent[], options?: PlaybackOptions) {
    await this.init(options);

    if (!this.audioContext || !this.instrument) {
      return;
    }

    const startAt = this.audioContext.currentTime + 0.04;
    events.forEach((event) => {
      this.instrument?.play(event.pitch, startAt + event.timeSeconds, {
        duration: event.durationSeconds,
        gain: event.velocity
      });
    });

    this.scheduledCount = events.length;
  }

  pause() {
    this.stop();
  }

  stop() {
    this.instrument?.stop?.();
    this.scheduledCount = 0;
  }

  getScheduledCount() {
    return this.scheduledCount;
  }

  dispose() {
    this.stop();
    this.audioContext?.close();
    this.audioContext = null;
  }
}

export async function detectWebMidiSupport(): Promise<WebMidiState> {
  if (typeof navigator === 'undefined' || typeof navigator.requestMIDIAccess !== 'function') {
    return 'unsupported';
  }

  try {
    const midiAccess = await navigator.requestMIDIAccess();
    return midiAccess.outputs.size > 0 ? 'supported' : 'no-output';
  } catch {
    return 'permission-denied';
  }
}

export class MidiPlayer {
  private engine: AudioEngine;

  private engineKind: EngineKind = 'tone';

  private lastScheduledEvents: ScheduledEvent[] = [];

  private soundfontEngine = new SoundfontEngine();

  private toneEngine = new ToneEngine();

  private webMidiOutput: MIDIOutput | null = null;

  private webMidiState: WebMidiState = 'unsupported';

  private webMidiTimeouts: number[] = [];

  constructor() {
    this.engine = this.toneEngine;
  }

  async setEngine(engine: EngineKind, options?: PlaybackOptions) {
    this.engineKind = engine;
    this.engine = engine === 'soundfont' ? this.soundfontEngine : this.toneEngine;
    await this.engine.init(options);
  }

  async useWebMidiOutput(outputId?: string) {
    if (typeof navigator === 'undefined' || typeof navigator.requestMIDIAccess !== 'function') {
      this.webMidiState = 'unsupported';
      this.webMidiOutput = null;
      return;
    }

    try {
      const midiAccess = await navigator.requestMIDIAccess();
      const outputs = Array.from(midiAccess.outputs.values());

      if (outputs.length === 0) {
        this.webMidiOutput = null;
        this.webMidiState = 'no-output';
        return;
      }

      if (outputId) {
        this.webMidiOutput = outputs.find((output) => output.id === outputId) ?? outputs[0];
      } else {
        this.webMidiOutput = outputs[0];
      }

      this.webMidiState = 'supported';
    } catch {
      this.webMidiState = 'permission-denied';
      this.webMidiOutput = null;
    }
  }

  getWebMidiState() {
    return this.webMidiState;
  }

  estimateScheduledCount(notes: NoteEvent[], tempo = 120) {
    return buildScheduledEvents(notes, tempo).length;
  }

  async play(notes: NoteEvent[], options?: PlaybackOptions) {
    const safeOptions: PlaybackOptions = {
      engine: options?.engine ?? this.engineKind,
      loop: options?.loop ?? false,
      soundfontName: options?.soundfontName,
      tempo: options?.tempo ?? 120
    };

    this.lastScheduledEvents = buildScheduledEvents(notes, safeOptions.tempo);

    await this.setEngine(safeOptions.engine ?? 'tone', safeOptions);
    await this.engine.play(this.lastScheduledEvents, safeOptions);
    this.scheduleWebMidi(this.lastScheduledEvents);
  }

  pause() {
    this.engine.pause();
    this.clearWebMidiSchedule();
  }

  stop() {
    this.engine.stop();
    this.clearWebMidiSchedule();
  }

  getScheduledCount() {
    return this.engine.getScheduledCount();
  }

  getScheduledEvents() {
    return [...this.lastScheduledEvents];
  }

  dispose() {
    this.clearWebMidiSchedule();
    this.toneEngine.dispose();
    this.soundfontEngine.dispose();
    this.webMidiOutput = null;
  }

  private clearWebMidiSchedule() {
    this.webMidiTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    this.webMidiTimeouts = [];
  }

  private scheduleWebMidi(events: ScheduledEvent[]) {
    if (!this.webMidiOutput || typeof window === 'undefined') {
      return;
    }

    this.clearWebMidiSchedule();

    events.forEach((event) => {
      const velocityByte = Math.min(127, Math.max(0, Math.round(event.velocity * 127)));
      const noteOnDelay = event.timeSeconds * 1000;
      const noteOffDelay = (event.timeSeconds + event.durationSeconds) * 1000;

      const noteOnTimeout = window.setTimeout(() => {
        this.webMidiOutput?.send([0x90, event.midi, velocityByte]);
      }, noteOnDelay);

      const noteOffTimeout = window.setTimeout(() => {
        this.webMidiOutput?.send([0x80, event.midi, 0]);
      }, noteOffDelay);

      this.webMidiTimeouts.push(noteOnTimeout, noteOffTimeout);
    });
  }
}
