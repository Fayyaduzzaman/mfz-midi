-- MFZ MIDI initial schema
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  midi_json jsonb not null default '{}'::jsonb,
  storage_refs text[] not null default '{}',
  is_public boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.soundfonts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  approved_by uuid references auth.users(id),
  label text not null,
  bucket text not null default 'instrument_uploads',
  storage_path text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create trigger soundfonts_set_updated_at
before update on public.soundfonts
for each row
execute function public.set_updated_at();

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row
execute function public.set_updated_at();

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = uid), false);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, is_admin)
  values (new.id, new.email, split_part(coalesce(new.email, ''), '@', 1), false)
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.soundfonts enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin"
on public.profiles
for select
using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_insert_self_or_admin" on public.profiles;
create policy "profiles_insert_self_or_admin"
on public.profiles
for insert
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "projects_select_own_public_or_admin" on public.projects;
create policy "projects_select_own_public_or_admin"
on public.projects
for select
using (owner_id = auth.uid() or is_public = true or public.is_admin(auth.uid()));

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
on public.projects
for insert
with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "projects_update_own_or_admin" on public.projects;
create policy "projects_update_own_or_admin"
on public.projects
for update
using (owner_id = auth.uid() or public.is_admin(auth.uid()))
with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "projects_delete_own_or_admin" on public.projects;
create policy "projects_delete_own_or_admin"
on public.projects
for delete
using (owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "soundfonts_select_allowed" on public.soundfonts;
create policy "soundfonts_select_allowed"
on public.soundfonts
for select
using (
  status = 'approved'
  or owner_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "soundfonts_insert_own" on public.soundfonts;
create policy "soundfonts_insert_own"
on public.soundfonts
for insert
with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "soundfonts_update_admin" on public.soundfonts;
create policy "soundfonts_update_admin"
on public.soundfonts
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "site_settings_read_authenticated" on public.site_settings;
create policy "site_settings_read_authenticated"
on public.site_settings
for select
using (auth.role() = 'authenticated');

drop policy if exists "site_settings_write_admin" on public.site_settings;
create policy "site_settings_write_admin"
on public.site_settings
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public)
values ('instrument_uploads', 'instrument_uploads', false)
on conflict (id) do nothing;

drop policy if exists "storage_upload_owner_or_admin" on storage.objects;
create policy "storage_upload_owner_or_admin"
on storage.objects
for insert
with check (
  bucket_id = 'instrument_uploads'
  and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin(auth.uid()))
);

drop policy if exists "storage_read_owner_or_admin" on storage.objects;
create policy "storage_read_owner_or_admin"
on storage.objects
for select
using (
  bucket_id = 'instrument_uploads'
  and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin(auth.uid()))
);

drop policy if exists "storage_update_admin" on storage.objects;
create policy "storage_update_admin"
on storage.objects
for update
using (bucket_id = 'instrument_uploads' and public.is_admin(auth.uid()));
