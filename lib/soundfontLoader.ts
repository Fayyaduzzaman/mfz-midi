export interface LoadedSoundfontInstrument {
  play: (
    note: string,
    when?: number,
    options?: {
      duration?: number;
      gain?: number;
    }
  ) => void;
  stop?: () => void;
}

interface SoundfontModule {
  instrument: (
    audioContext: AudioContext,
    instrumentName: string,
    options?: { format?: 'mp3' | 'ogg'; soundfont?: 'FluidR3_GM' | 'MusyngKite' }
  ) => Promise<LoadedSoundfontInstrument>;
}

let cachedModule: SoundfontModule | null = null;

async function getSoundfontModule() {
  if (!cachedModule) {
    const importedModule = (await import('soundfont-player')) as unknown;

    // TODO(strict): replace this cast with package-level type declarations.
    cachedModule = importedModule as SoundfontModule;
  }

  return cachedModule;
}

export async function loadSoundfontInstrument(
  audioContext: AudioContext,
  instrumentName = 'acoustic_grand_piano'
) {
  const soundfont = await getSoundfontModule();
  return soundfont.instrument(audioContext, instrumentName, {
    format: 'mp3',
    soundfont: 'MusyngKite'
  });
}
