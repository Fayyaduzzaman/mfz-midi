-- Run this after at least one user account exists in auth.users.
-- Recommended flow: create first account via magic-link login, then execute this seed.

insert into public.site_settings (key, value)
values ('storage_quota_mb', '120'::jsonb)
on conflict (key) do update
set value = excluded.value;

with first_user as (
  select id, email
  from auth.users
  order by created_at
  limit 1
), upsert_admin as (
  insert into public.profiles (id, email, display_name, is_admin)
  select id, email, 'MFZ Admin', true from first_user
  on conflict (id) do update
  set is_admin = true,
      display_name = excluded.display_name,
      email = excluded.email
  returning id
)
insert into public.projects (owner_id, name, description, midi_json, storage_refs, is_public)
select
  id,
  'Demo Piano Roll',
  'Seeded demo project for onboarding.',
  '{"tempo":120,"notes":[{"id":"seed-1","midi":60,"pitch":"C4","time":0,"duration":0.5,"velocity":0.85},{"id":"seed-2","midi":64,"pitch":"E4","time":0.5,"duration":0.5,"velocity":0.85},{"id":"seed-3","midi":67,"pitch":"G4","time":1,"duration":0.75,"velocity":0.9}]}'::jsonb,
  ARRAY[]::text[],
  false
from upsert_admin
where not exists (
  select 1
  from public.projects
  where name = 'Demo Piano Roll'
    and owner_id = upsert_admin.id
);

with first_user as (
  select id from auth.users order by created_at limit 1
)
insert into public.soundfonts (owner_id, label, bucket, storage_path, mime_type, size_bytes, status)
select
  id,
  'demo-piano.sf2',
  'instrument_uploads',
  id::text || '/demo-piano.sf2',
  'audio/sf2',
  1048576,
  'pending'
from first_user
where not exists (
  select 1 from public.soundfonts where label = 'demo-piano.sf2'
);
