# MFZ MIDI

MFZ MIDI is a full-stack starter for a web-based MIDI editor and player.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Tone.js playback with `AudioEngine` abstraction
- Optional soundfont loading (`soundfont-player`) and Web MIDI detection
- Supabase Auth, Postgres, Storage, Realtime-ready helpers, and Edge Function template
- Jest unit tests + Playwright E2E scaffold
- GitHub Actions CI + optional Vercel deploy workflow

## Implemented Features

- Supabase auth UI for magic-link and email/password (`/auth/login`)
- Editor modes:
  - Piano Roll (interactive add/remove note grid)
  - DJ Deck (two-deck crossfader UI)
  - Groovepad (pad triggering)
  - Visual Keyboard (highlight/trigger)
  - Sheet mode placeholder (lazy-load hook for OSMD/VexFlow)
- Tone.js playback with transport controls and keyboard shortcuts
- MIDI import/export (`.mid`) and client-side WAV export
- Supabase project save/load (`projects` table)
- Storage upload + pending moderation flow (`soundfonts` table)
- Protected admin area for user list, upload moderation, site settings

## Project Setup

### Install dependencies

```bash
npm install
```

### Setup env

Copy `.env.local.example` to `.env.local` and fill these values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional)
- `VERCEL_TOKEN` (if auto-deploy)

### Run dev

```bash
npm run dev
# open http://localhost:3000
```

## Supabase Setup

1. Create a free Supabase project.
2. Open SQL Editor and run:
   - `supabase/migrations/001_init.sql`
   - `supabase/seed/seed.sql`
3. Use magic-link login for first account creation, then run seed to mark the first user as admin.

## Deploy

1. Push repo to GitHub.
2. Connect to Vercel (or Netlify for frontend hosting).
3. Set environment variables in hosting project settings.
4. Enable auto-deploy on push.

## Commands

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
npm run format:check
```

## Branch / Phase Commands

```bash
git checkout -b phase/01-mvp
git checkout -b phase/02-instruments
git checkout -b phase/03-export
git checkout -b phase/04-admin
git checkout -b phase/05-pro
```

Example commit messages per phase:

```bash
git commit -m "feat(midi): add MidiPlayer (Tone.js) and basic play controls"
git commit -m "feat(editor): add PianoRollGrid with click-to-add notes"
git commit -m "chore(ci): add GitHub Actions CI"
```

## Admin Features

- `/admin` requires `profiles.is_admin = true`
- View user list
- Approve/reject pending uploads
- Manage `site_settings` quota entries

## Docs

- `DOCS/architecture.md`
- `DOCS/free-hosting-guide.md`
- `DEVNOTES.md`

