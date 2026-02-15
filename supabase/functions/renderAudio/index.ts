// deno-lint-ignore-file no-explicit-any
/**
 * Supabase Edge Function template for optional server-side audio rendering.
 * Free tier note:
 * - Use this only for short jobs. Heavy ffmpeg/FluidSynth rendering is better suited for paid compute.
 * - This template currently returns 501 and documents where to plug a renderer.
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface RenderRequestBody {
  notes: Array<{
    duration: number;
    midi: number;
    time: number;
    velocity: number;
  }>;
  tempo: number;
}

serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let payload: RenderRequestBody;

  try {
    payload = (await request.json()) as RenderRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      headers: { 'content-type': 'application/json' },
      status: 400
    });
  }

  const noteCount = Array.isArray(payload.notes) ? payload.notes.length : 0;

  // Placeholder for ffmpeg.wasm or FluidSynth invocation:
  // 1. Convert notes JSON to a temporary MIDI file.
  // 2. Run renderer (ffmpeg/fluidsynth) with approved soundfont.
  // 3. Upload generated WAV/MP3 to storage and return signed URL.
  return new Response(
    JSON.stringify({
      message: 'Server-side render template is ready. Implement renderer when upgrading beyond free-tier limits.',
      noteCount,
      tempo: payload.tempo,
      status: 'not_implemented'
    }),
    {
      headers: { 'content-type': 'application/json' },
      status: 501
    }
  );
});
