import { noteNameToFrequency, type NoteEvent } from '@/lib/midiPlayer';

interface AudioExportOptions {
  gain?: number;
  sampleRate?: number;
  tempo?: number;
}

function interleaveChannels(buffer: AudioBuffer) {
  const channels = buffer.numberOfChannels;
  const channelLength = buffer.length;
  const interleaved = new Float32Array(channelLength * channels);

  for (let sampleIndex = 0; sampleIndex < channelLength; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
      interleaved[sampleIndex * channels + channelIndex] =
        buffer.getChannelData(channelIndex)[sampleIndex];
    }
  }

  return interleaved;
}

function encodeWavFromBuffer(buffer: AudioBuffer) {
  const channelCount = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = interleaveChannels(buffer);
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;

  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);

  let offset = 0;
  const writeString = (value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
    offset += value.length;
  };

  const writeUint32 = (value: number) => {
    view.setUint32(offset, value, true);
    offset += 4;
  };

  const writeUint16 = (value: number) => {
    view.setUint16(offset, value, true);
    offset += 2;
  };

  writeString('RIFF');
  writeUint32(36 + dataSize);
  writeString('WAVE');
  writeString('fmt ');
  writeUint32(16);
  writeUint16(1);
  writeUint16(channelCount);
  writeUint32(sampleRate);
  writeUint32(byteRate);
  writeUint16(blockAlign);
  writeUint16(16);
  writeString('data');
  writeUint32(dataSize);

  samples.forEach((sample) => {
    const normalized = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, normalized < 0 ? normalized * 0x8000 : normalized * 0x7fff, true);
    offset += 2;
  });

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

export async function exportNotesToWavBlob(notes: NoteEvent[], options?: AudioExportOptions) {
  if (typeof window === 'undefined') {
    throw new Error('WAV export is only available in browser contexts.');
  }

  const tempo = options?.tempo ?? 120;
  const gain = options?.gain ?? 0.12;
  const sampleRate = options?.sampleRate ?? 44100;
  const beatDurationSeconds = 60 / Math.max(40, tempo);

  const totalSeconds =
    notes.reduce(
      (maxDuration, note) => Math.max(maxDuration, (note.time + note.duration) * beatDurationSeconds),
      0
    ) + 1;

  const frameCount = Math.ceil(totalSeconds * sampleRate);
  const offlineContext = new OfflineAudioContext(2, frameCount, sampleRate);

  notes.forEach((note) => {
    const oscillator = offlineContext.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = noteNameToFrequency(note.pitch);

    const noteGain = offlineContext.createGain();
    const noteVelocity = Math.min(Math.max(note.velocity, 0), 1);
    noteGain.gain.setValueAtTime(gain * noteVelocity, 0);

    oscillator.connect(noteGain);
    noteGain.connect(offlineContext.destination);

    const startSeconds = Math.max(note.time * beatDurationSeconds, 0);
    const endSeconds = startSeconds + Math.max(note.duration * beatDurationSeconds, 0.03);

    oscillator.start(startSeconds);
    oscillator.stop(endSeconds);
  });

  const renderedBuffer = await offlineContext.startRendering();
  return encodeWavFromBuffer(renderedBuffer);
}
