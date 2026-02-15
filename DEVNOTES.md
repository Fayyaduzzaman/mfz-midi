# DEVNOTES

## Tradeoffs

- Playback is fully client-side for free-tier compatibility and low latency.
- Tone.js engine is production-ready in this scaffold; soundfont mode is intentionally lightweight.
- Web MIDI output is optional and detection-first, so browsers without MIDI support degrade gracefully.

## Audio Rendering Strategy

- Client-side WAV export uses `OfflineAudioContext` and a simple synth graph.
- This avoids server render costs and works on Vercel/Netlify static frontends.
- For high-fidelity sample or FluidSynth rendering, use the provided Supabase edge template and move long jobs off free tier.

## Storage Limits and Moderation

- Free storage quotas are small. Uploads are staged in `instrument_uploads` and marked `pending`.
- Admin moderation (`approved`/`rejected`) helps keep storage costs controlled.
- Keep a hard size limit in UI and SQL policy if this app scales.

## Free-Tier Pitfalls

- Supabase free projects pause on inactivity; first request can be cold.
- Long edge jobs can time out on free tiers.
- Playwright in CI can be expensive; keep it as optional or run nightly.

## Future Hardening

- Tighten TypeScript from `strict: false` to `strict: true` incrementally.
- Replace permissive `any` casts in MIDI and soundfont adapters with concrete type guards.
- Add server-side validation for project JSON payloads before writing to DB.
