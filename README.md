# MFZ MIDI

MFZ MIDI is a full-stack web music workspace built with Next.js + Supabase.

## Version

Current app version: `0.3.0`

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Tone.js playback with optional soundfont playback
- Supabase Auth, Postgres, Storage, and Realtime
- Jest unit tests + Playwright E2E scaffold

## Features

### Core MIDI Features

- Interactive piano roll with note grid editing
- MIDI file import (`.mid`, `.midi`)
- Export to MIDI and WAV
- Soundfont instrument selection for playback
- Visual keyboard playback sync
- Project save/load with Supabase

### Admin Control System

- Admin-only dashboard (`/admin`)
- Approve/reject instrument uploads
- Block/unblock users by email
- Email access registry (grant access to specific emails)
- Signup disabled in login UI
- Storage quota setting with upload enforcement

### Pro Music Studio Features

- DJ deck mode
- Groovepad sampler
- Drum machine (16-step sequencer)
- Collaboration rooms with realtime message feed
- User panel with account, quota, projects, and upload summaries

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional)
- `VERCEL_TOKEN` (optional)

### 3. Apply Supabase SQL

Run these scripts in order:

- `supabase/migrations/001_init.sql`
- `supabase/migrations/002_access_control_and_rooms.sql`
- `supabase/seed/seed.sql`

### 4. Start dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Auth and Access Model

- Login supports magic-link and password.
- Signup button is removed.
- Non-admin users need admin-approved email access (`access_registry`) to use editor routes.
- Admin can grant/block access from `/admin`.

## Scripts

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
npm run format:check
```

## Docs

- `DOCS/architecture.md`
- `DOCS/free-hosting-guide.md`
- `DEVNOTES.md`
