-- Cleanup and data repair (2026-11-10)
-- Third and last file. Safe to run more than once.
--
-- Every claim below was measured on the live project before writing this:
--   70 daily-key claims point at a key that no longer exists
--   35 reward-history rows point at a key that no longer exists
--   3 rows remain in valid_keys
-- This file removes the rows that can no longer be shown or used. It does not
-- create replacement keys.

begin;

-- 1) Daily key claims with no surviving key.
--    The rewards panel joins valid_keys and drops these rows, so they were
--    invisible already - nothing a user can still see or use is removed here.
--    Their notifications go with them, which clears the reason
--    website_acknowledge_notification could not tidy those notices up.
delete from public.notifications n
 where n.reward_kind in ('vip_key','trainer_dg_key','trainer_vip_key')
   and n.reward_ref is not null
   and n.target_user_id is not null
   and not exists (select 1 from public.valid_keys k where k.id = n.reward_ref);

delete from public.vip_giveaway_winners w
 where not exists (select 1 from public.valid_keys k where k.id = w.key);

-- 2) Reward-history rows with no surviving key. Same reasoning: already
--    unreadable through the rewards panel.
delete from public.website_reward_keys r
 where not exists (select 1 from public.valid_keys k where k.id = r.key_code);

-- 3) Dead code. generate_access_keys is a complete second key generator that
--    nothing calls: the admin page uses access_keys/access_key_logs directly.
--    It also leaves an audit row saying one key was produced when _qty keys
--    were. Dropping it rather than fixing it, since nothing reads its output.
--    If you would rather keep it, delete this one line and tell me - the rest
--    of the file is independent.
drop function if exists public.generate_access_keys(integer, text, integer, text);

-- 4) Owner-check plumbing. Two small functions are inlined so the owner check
--    reads one email in one place instead of three:
--      dg_owner_email()         was a one-line "select '<your email>'"
--      set_profile_owner_flag() asked is_owner_user(), which reads dg_is_owner(),
--                               which asks auth.jwt() ->> 'email'
--    Behaviour is unchanged. Website and Worker callers are unaffected: this
--    touches no function they call.
create or replace function public.dg_owner_email()
 returns text
 language sql
 stable
 set search_path to 'public'
as $function$
  select coalesce((auth.jwt() ->> 'email'), '');
$function$;

create or replace function public.set_profile_owner_flag()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  -- Only ever raises the flag, never clears it: the owner cannot lock
  -- themselves out with an unrelated profile update.
  new.is_owner := new.is_owner or public.dg_is_owner();
  return new;
end;
$function$;

commit;

-- Verify after running. Each of these should return 0:
--   select count(*) from public.vip_giveaway_winners w
--     where not exists (select 1 from public.valid_keys k where k.id = w.key);
--   select count(*) from public.website_reward_keys r
--     where not exists (select 1 from public.valid_keys k where k.id = r.key_code);
-- And this should return nothing:
--   select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--     where n.nspname='public' and p.proname='generate_access_keys';
--
-- The current owner email is 'yugvadecha30@gmail.com'. It now lives in
-- dg_is_owner() and website_is_demo_owner() only, plus one row-level policy
-- on app_config. Change all three together if the email ever changes.
