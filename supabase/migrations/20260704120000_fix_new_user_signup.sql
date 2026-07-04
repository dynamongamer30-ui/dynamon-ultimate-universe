-- =====================================================================
-- Fix: OAuth/email signup failing with
--   "Database error saving new user"
--
-- Root cause: the legacy (Lovable) public.profiles table was created with
--   username text UNIQUE NOT NULL
-- but the new-user trigger (handle_new_user) intentionally does NOT set a
-- username -- the username is chosen by the user in step 2 of signup.
-- The NOT NULL constraint therefore aborted the auth.users insert.
--
-- Also hardens the trigger so a profile-row problem can never again block
-- authentication.
-- =====================================================================

-- 1. Username is optional until the user picks one in the profile step.
alter table public.profiles alter column username drop not null;

-- 2. Resilient, CHECK-safe new-user trigger.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner_row boolean;
  dn text;
begin
  is_owner_row := (lower(coalesce(new.email, '')) = public.dg_owner_email());

  -- Build a valid display_name (legacy CHECK requires length 1..40).
  dn := coalesce(
          nullif(new.raw_user_meta_data->>'full_name', ''),
          nullif(new.raw_user_meta_data->>'name', ''),
          nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
          'trainer'
        );
  dn := left(dn, 40);

  begin
    insert into public.profiles (id, display_name, avatar_url, is_owner)
    values (new.id, dn, new.raw_user_meta_data->>'avatar_url', is_owner_row)
    on conflict (id) do update
      set is_owner = public.profiles.is_owner or excluded.is_owner;
  exception when others then
    -- Never block auth signup because of a profile-row issue.
    raise warning 'handle_new_user: profile row skipped for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

-- Keep the trigger function off the public REST surface.
revoke all on function public.handle_new_user() from anon, authenticated, public;
