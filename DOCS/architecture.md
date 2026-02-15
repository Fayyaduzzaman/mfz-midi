# Architecture

## System Diagram

```text
+----------------------+             +-------------------------+
| Next.js Frontend     |             | Supabase               |
| (App Router, TS, TW) |<----------->| Auth + Postgres + RLS  |
|                      |             | Storage + Realtime     |
| - Piano Roll UI      |             | Edge Functions         |
| - Playback Controls  |             +-------------------------+
| - Admin Dashboard    |
+----------+-----------+
           |
           v
+-------------------------+
| Audio Engine Layer       |
| lib/midiPlayer.ts        |
| - Tone engine (active)   |
| - Soundfont engine       |
| - Web MIDI output        |
+-------------------------+
```

## Core Modules

- `lib/midiPlayer.ts`: scheduling abstraction (`AudioEngine`) + Tone working implementation.
- `lib/midiUtils.ts`: `.mid` import/export helpers and project JSON conversion.
- `lib/audioExport.ts`: client-side WAV rendering.
- `lib/supabaseClient.ts`: single source for Supabase network calls.

## Data Model

- `profiles`: user metadata + admin flag.
- `projects`: saved MIDI JSON and metadata.
- `soundfonts`: upload records with moderation status.
- `site_settings`: admin-controlled configuration (quotas).

## Security Model

- RLS enabled for all public tables.
- `public.is_admin()` function centralizes role checks.
- Storage bucket writes/reads constrained to owner folder or admin.

## Performance Notes

- Heavy packages load lazily (`soundfont-player`, notation mode hook).
- Editor remains client-rendered for responsive audio interaction.
- Realtime subscriptions are scaffolded for future collaboration mode.
