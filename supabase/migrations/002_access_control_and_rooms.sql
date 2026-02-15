create table if not exists public.access_registry (
  email text primary key,
  status text not null default 'approved' check (status in ('approved', 'blocked')),
  granted_by uuid references auth.users(id),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists access_registry_set_updated_at on public.access_registry;
create trigger access_registry_set_updated_at
before update on public.access_registry
for each row
execute function public.set_updated_at();

create or replace function public.is_email_allowed(input_email text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  has_rows boolean;
begin
  select exists(select 1 from public.access_registry) into has_rows;

  if not has_rows then
    return true;
  end if;

  return exists (
    select 1
    from public.access_registry ar
    where lower(ar.email) = lower(coalesce(input_email, ''))
      and ar.status = 'approved'
  );
end;
$$;

create or replace function public.is_email_blocked(input_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.access_registry ar
    where lower(ar.email) = lower(coalesce(input_email, ''))
      and ar.status = 'blocked'
  );
$$;

create or replace function public.has_platform_access(uid uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  account_email text;
  admin_user boolean;
begin
  if uid is null then
    return false;
  end if;

  select coalesce((select p.is_admin from public.profiles p where p.id = uid), false) into admin_user;
  if admin_user then
    return true;
  end if;

  select email into account_email from auth.users where id = uid;
  if account_email is null then
    return false;
  end if;

  if public.is_email_blocked(account_email) then
    return false;
  end if;

  return public.is_email_allowed(account_email);
end;
$$;

grant execute on function public.is_email_allowed(text) to anon, authenticated;
grant execute on function public.is_email_blocked(text) to anon, authenticated;

create table if not exists public.collaboration_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists collaboration_rooms_set_updated_at on public.collaboration_rooms;
create trigger collaboration_rooms_set_updated_at
before update on public.collaboration_rooms
for each row
execute function public.set_updated_at();

create table if not exists public.collaboration_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.collaboration_rooms(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.access_registry enable row level security;
alter table public.collaboration_rooms enable row level security;
alter table public.collaboration_messages enable row level security;

drop policy if exists "access_registry_select_self_or_admin" on public.access_registry;
create policy "access_registry_select_self_or_admin"
on public.access_registry
for select
using (
  public.is_admin(auth.uid())
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "access_registry_manage_admin" on public.access_registry;
create policy "access_registry_manage_admin"
on public.access_registry
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "collaboration_rooms_select" on public.collaboration_rooms;
create policy "collaboration_rooms_select"
on public.collaboration_rooms
for select
using (public.has_platform_access(auth.uid()));

drop policy if exists "collaboration_rooms_insert" on public.collaboration_rooms;
create policy "collaboration_rooms_insert"
on public.collaboration_rooms
for insert
with check (
  public.has_platform_access(auth.uid())
  and created_by = auth.uid()
);

drop policy if exists "collaboration_rooms_update" on public.collaboration_rooms;
create policy "collaboration_rooms_update"
on public.collaboration_rooms
for update
using (
  public.has_platform_access(auth.uid())
  and (created_by = auth.uid() or public.is_admin(auth.uid()))
)
with check (
  public.has_platform_access(auth.uid())
  and (created_by = auth.uid() or public.is_admin(auth.uid()))
);

drop policy if exists "collaboration_messages_select" on public.collaboration_messages;
create policy "collaboration_messages_select"
on public.collaboration_messages
for select
using (public.has_platform_access(auth.uid()));

drop policy if exists "collaboration_messages_insert" on public.collaboration_messages;
create policy "collaboration_messages_insert"
on public.collaboration_messages
for insert
with check (
  public.has_platform_access(auth.uid())
  and author_id = auth.uid()
);

drop policy if exists "projects_select_own_public_or_admin" on public.projects;
create policy "projects_select_own_public_or_admin"
on public.projects
for select
using (
  public.has_platform_access(auth.uid())
  and (owner_id = auth.uid() or is_public = true or public.is_admin(auth.uid()))
);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
on public.projects
for insert
with check (
  public.has_platform_access(auth.uid())
  and (owner_id = auth.uid() or public.is_admin(auth.uid()))
);

drop policy if exists "projects_update_own_or_admin" on public.projects;
create policy "projects_update_own_or_admin"
on public.projects
for update
using (
  public.has_platform_access(auth.uid())
  and (owner_id = auth.uid() or public.is_admin(auth.uid()))
)
with check (
  public.has_platform_access(auth.uid())
  and (owner_id = auth.uid() or public.is_admin(auth.uid()))
);

drop policy if exists "projects_delete_own_or_admin" on public.projects;
create policy "projects_delete_own_or_admin"
on public.projects
for delete
using (
  public.has_platform_access(auth.uid())
  and (owner_id = auth.uid() or public.is_admin(auth.uid()))
);

drop policy if exists "soundfonts_select_allowed" on public.soundfonts;
create policy "soundfonts_select_allowed"
on public.soundfonts
for select
using (
  public.has_platform_access(auth.uid())
  and (
    status = 'approved'
    or owner_id = auth.uid()
    or public.is_admin(auth.uid())
  )
);

drop policy if exists "soundfonts_insert_own" on public.soundfonts;
create policy "soundfonts_insert_own"
on public.soundfonts
for insert
with check (
  public.has_platform_access(auth.uid())
  and (owner_id = auth.uid() or public.is_admin(auth.uid()))
);

drop policy if exists "soundfonts_update_admin" on public.soundfonts;
create policy "soundfonts_update_admin"
on public.soundfonts
for update
using (
  public.has_platform_access(auth.uid())
  and public.is_admin(auth.uid())
)
with check (
  public.has_platform_access(auth.uid())
  and public.is_admin(auth.uid())
);

drop policy if exists "site_settings_read_authenticated" on public.site_settings;
create policy "site_settings_read_authenticated"
on public.site_settings
for select
using (
  auth.role() = 'authenticated'
  and public.has_platform_access(auth.uid())
);

drop policy if exists "site_settings_write_admin" on public.site_settings;
create policy "site_settings_write_admin"
on public.site_settings
for all
using (
  public.has_platform_access(auth.uid())
  and public.is_admin(auth.uid())
)
with check (
  public.has_platform_access(auth.uid())
  and public.is_admin(auth.uid())
);
