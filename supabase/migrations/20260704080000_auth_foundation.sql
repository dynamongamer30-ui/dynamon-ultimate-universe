-- =====================================================================
-- Auth foundation for the Dynamon Universe owner console.
--
-- The DG backend migration (20260704090000) depends on:
--   * public.profiles(id uuid pk -> auth.users, ..., is_owner boolean)
--   * public.is_owner_user(uuid)  -- used by every owner-only RLS policy
--
-- The web app (OwnerGate / useProfile / auth.tsx) additionally depends on:
--   * public.get_my_profile()       -- security-definer read of own profile
--   * public.username_available()   -- signup username check
--   * a trigger that auto-creates a profile row on new auth.users signup
--
-- Owner identity is single-sourced here: the owner Gmail is stamped
-- is_owner = true automatically on signup/login. Change dg_owner_email()
-- in ONE place to move ownership.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Owner email (single source of truth)
-- ---------------------------------------------------------------------
create or replace function public.dg_owner_email()
returns text language sql immutable as $$ select 'yugvadecha30@gmail.com'::text $$;

-- ---------------------------------------------------------------------
-- 1. profiles table
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique,
  display_name text,
  gender       text check (gender in ('male','female','other')),
  avatar_url   text,
  is_owner     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------
-- 2. Owner check helper (SECURITY DEFINER so RLS policies can call it
--    without recursing into profiles' own RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_owner_user(_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_owner from public.profiles where id = _uid), false);
$$;

-- ---------------------------------------------------------------------
-- 3. RLS: users read all public profile data, but only edit their own.
--    (gender is only exposed to the owning user via get_my_profile.)
-- ---------------------------------------------------------------------
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------
-- 4. Auto-create a profile row when a new auth user signs up, and stamp
--    the owner flag if it's the owner Gmail. Runs as definer to bypass RLS.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner_row boolean;
begin
  is_owner_row := (lower(coalesce(new.email, '')) = public.dg_owner_email());
  insert into public.profiles (id, display_name, avatar_url, is_owner)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    is_owner_row
  )
  on conflict (id) do update set is_owner = public.profiles.is_owner or is_owner_row;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Also stamp owner on profile insert/update, so an owner who already exists
-- (e.g. created before this migration) is upgraded the moment they touch their row.
create or replace function public.dg_mark_owner_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from auth.users u
     where u.id = new.id
       and lower(u.email) = public.dg_owner_email()
  ) then
    new.is_owner := true;
  end if;
  return new;
end;
$$;

drop trigger if exists dg_mark_owner_on_profile on public.profiles;
create trigger dg_mark_owner_on_profile
  before insert or update on public.profiles
  for each row execute function public.dg_mark_owner_profile();

-- Upgrade any owner Gmail account that already exists.
update public.profiles p
   set is_owner = true
  from auth.users u
 where u.id = p.id
   and lower(u.email) = public.dg_owner_email();

-- ---------------------------------------------------------------------
-- 5. get_my_profile(): the exact shape useProfile() expects.
-- ---------------------------------------------------------------------
create or replace function public.get_my_profile()
returns table (
  id uuid,
  username text,
  display_name text,
  gender text,
  avatar_url text,
  is_owner boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select id, username, display_name, gender, avatar_url, is_owner
    from public.profiles
   where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- 6. username_available(): signup uniqueness check.
-- ---------------------------------------------------------------------
create or replace function public.username_available(_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
     where lower(username) = lower(_username)
  );
$$;

-- ---------------------------------------------------------------------
-- 7. Grants
-- ---------------------------------------------------------------------
grant execute on function public.is_owner_user(uuid) to anon, authenticated;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
