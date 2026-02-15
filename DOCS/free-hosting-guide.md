# Free Hosting Guide

## Recommended Free Stack

- Frontend: Vercel (or Netlify)
- Backend: Supabase free plan

## What Works Well on Free Tier

- Auth (magic link + password)
- CRUD project persistence with RLS
- Basic file uploads to storage
- Client-side MIDI and WAV export

## Caveats

- Supabase free projects can sleep and have cold starts.
- Storage quota is limited. Use moderation and file-size controls.
- Edge Function execution limits make heavy ffmpeg/FluidSynth jobs unreliable for long renders.

## Practical Deployment Steps

1. Create Supabase project and run SQL migration/seed scripts.
2. Set env vars in Vercel/Netlify:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional for server tools)
3. Deploy frontend.
4. Validate auth callback URLs in Supabase Auth settings.

## Scaling Path

- Keep free-tier for development and small user groups.
- Move render-heavy workloads to dedicated workers or paid plans.
- Add CDN + signed URL strategy for larger sample libraries.
