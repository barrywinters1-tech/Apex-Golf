-- Apex Golf — Supabase schema. Paste into the SQL editor of a new project and run once.
-- Then set the coach: update public.profiles set role = 'coach' where email = 'jack@example.com';

create extension if not exists pgcrypto;

-- One row per signed-in user. Created automatically on sign-up.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  role text not null default 'player' check (role in ('player', 'coach')),
  created_at timestamptz not null default now()
);

-- A player record. user_id links once that person signs in with the matching email.
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text,
  created_at timestamptz not null default now()
);
create index if not exists players_coach on public.players(coach_id);
create index if not exists players_user on public.players(user_id);
create unique index if not exists players_email_coach on public.players(lower(email), coach_id);

-- All per-player app data, one row per local record. tbl ∈ player, blueprint, goals, sessions, rounds, lessons, ratings, watched.
create table if not exists public.rows (
  player_id uuid not null references public.players(id) on delete cascade,
  tbl text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (player_id, tbl, id)
);

-- Academy lessons: owned by a coach, visible to everyone they coach.
create table if not exists public.library (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (coach_id, id)
);

-- Profile on sign-up, and link any player rows that were created for this email.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name) values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  update public.players set user_id = new.id where user_id is null and lower(email) = lower(new.email);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Coach adds a player by email. If that person already has a self-coached record, adopt it.
create or replace function public.add_player(p_name text, p_email text) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_user uuid;
begin
  if (select role from public.profiles where id = auth.uid()) <> 'coach' then raise exception 'Only a coach can add players'; end if;
  select id into v_user from public.profiles where email = lower(p_email);
  if v_user is not null then
    select id into v_id from public.players where user_id = v_user and coach_id is null limit 1;
    if v_id is not null then update public.players set coach_id = auth.uid(), name = coalesce(nullif(p_name, ''), name) where id = v_id; return v_id; end if;
  end if;
  insert into public.players (coach_id, user_id, name, email) values (auth.uid(), v_user, p_name, lower(p_email)) returning id into v_id;
  return v_id;
end $$;

-- A signed-in person with no player record gets their own (self-coached) one.
create or replace function public.ensure_self_player() returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_email text; v_name text;
begin
  select id into v_id from public.players where user_id = auth.uid() limit 1;
  if v_id is not null then return v_id; end if;
  select email, name into v_email, v_name from public.profiles where id = auth.uid();
  insert into public.players (user_id, name, email) values (auth.uid(), coalesce(v_name, 'Player'), v_email) returning id into v_id;
  return v_id;
end $$;

-- Row-level security -------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.rows enable row level security;
alter table public.library enable row level security;

create or replace function public.can_access_player(p uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.players where id = p and (user_id = auth.uid() or coach_id = auth.uid()));
$$;
create or replace function public.can_read_library(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select c = auth.uid() or exists (select 1 from public.players where user_id = auth.uid() and coach_id = c);
$$;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select using (id = auth.uid());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists players_read on public.players;
create policy players_read on public.players for select using (user_id = auth.uid() or coach_id = auth.uid());
drop policy if exists players_coach_update on public.players;
create policy players_coach_update on public.players for update using (coach_id = auth.uid()) with check (coach_id = auth.uid());
drop policy if exists players_coach_delete on public.players;
create policy players_coach_delete on public.players for delete using (coach_id = auth.uid() and user_id is null);

drop policy if exists rows_all on public.rows;
create policy rows_all on public.rows for all using (public.can_access_player(player_id)) with check (public.can_access_player(player_id));

drop policy if exists library_read on public.library;
create policy library_read on public.library for select using (public.can_read_library(coach_id));
drop policy if exists library_write on public.library;
create policy library_write on public.library for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- Storage: lesson videos. Public read (unguessable paths), coach-only write to their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm'];
drop policy if exists videos_read on storage.objects;
create policy videos_read on storage.objects for select using (bucket_id = 'videos');
drop policy if exists videos_write on storage.objects;
create policy videos_write on storage.objects for insert with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists videos_delete on storage.objects;
create policy videos_delete on storage.objects for delete using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
