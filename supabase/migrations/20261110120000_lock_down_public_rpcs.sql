-- Security hardening (2026-11-10)
-- Goal: close public RPC holes WITHOUT breaking Cloudflare Workers or the site.
-- Kept callable by anon on purpose (used by workers / logged-out pages):
--   redeem_access_key, create_secure_session, redeem_secure_session,
--   website_campaign_status, username_available, has_role, is_owner_user (used inside RLS).
-- service_role (worker secrets) and postgres (pg_cron) keep full access.

begin;

-- 1) CRITICAL: daily Phoenix Pass giveaway was runnable by anyone.
--    pg_cron job 'phoenix_pass_daily_giveaway' runs as postgres, so it is unaffected.
create or replace function public.run_phoenix_pass_giveaway()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare r record; new_pass_id uuid;
begin
  -- allow only cron/postgres, service_role (Cloudflare worker secret) or the site owner
  if not (
       session_user in ('postgres', 'supabase_admin')
    or coalesce(auth.role(), '') = 'service_role'
    or public.dg_is_owner()
  ) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;

  delete from notifications where reward_kind = 'phoenix_pass' or title = 'Today''s Phoenix Pass winners';
  for r in
    select p.id from profiles p
    where p.is_owner = false
      and p.id not in (select user_id from vip_giveaway_winners where awarded_at > now() - interval '1 day')
      and p.id not in (select user_id from phoenix_pass_winners where awarded_at > now() - interval '1 day')
    order by random() limit 3
  loop
    insert into phoenix_passes (user_id, expires_at, claim_deadline)
    values (r.id, now() + interval '24 hours', now() + interval '24 hours')
    returning id into new_pass_id;
    insert into phoenix_pass_winners (user_id, pass_id) values (r.id, new_pass_id);
    insert into notifications (title, body, target_user_id, reward_kind, reward_ref)
    values ('You won a Phoenix Pass!', 'Nice one, you were picked today. You can skip the wait on any one mod download for the next 24 hours.', r.id, 'phoenix_pass', new_pass_id::text);
  end loop;
  perform public.upsert_daily_giveaway_broadcast();
end;
$function$;

revoke execute on function public.run_phoenix_pass_giveaway() from public, anon, authenticated;
grant  execute on function public.run_phoenix_pass_giveaway() to service_role;

-- 2) Trigger functions: nobody should call these over /rpc.
--    Triggers keep firing (EXECUTE is only checked when the trigger is created).
revoke execute on function public.disable_dark_eclipse_passless_policy() from public, anon, authenticated;
revoke execute on function public.notify_owner_of_report()               from public, anon, authenticated;
revoke execute on function public.set_profile_owner_flag()               from public, anon, authenticated;

-- 3) Admin RPCs: already owner-checked inside; remove logged-out access as defence in depth.
revoke execute on function public.admin_grant_phoenix_pass(text)                   from public, anon;
revoke execute on function public.generate_access_keys(integer, text, integer, text) from public, anon;

-- 4) Per-user RPCs that depend on auth.uid(): useless for logged-out visitors.
--    Signed-in users and service_role keep access.
revoke execute on function public.claim_daily_key(uuid)            from public, anon;
revoke execute on function public.claim_phoenix_pass(uuid)         from public, anon;
revoke execute on function public.claim_trainer_level()            from public, anon;
revoke execute on function public.get_my_profile()                 from public, anon;
revoke execute on function public.my_active_phoenix_pass()         from public, anon;
revoke execute on function public.my_daily_key()                   from public, anon;
revoke execute on function public.my_trainer_progress()            from public, anon;
revoke execute on function public.my_unclaimed_phoenix_pass()      from public, anon;
revoke execute on function public.redeem_phoenix_pass(uuid, text)  from public, anon;
revoke execute on function public.touch_last_active()              from public, anon;
revoke execute on function public.touch_streak()                   from public, anon;

grant execute on function
  public.admin_grant_phoenix_pass(text),
  public.generate_access_keys(integer, text, integer, text),
  public.claim_daily_key(uuid),
  public.claim_phoenix_pass(uuid),
  public.claim_trainer_level(),
  public.get_my_profile(),
  public.my_active_phoenix_pass(),
  public.my_daily_key(),
  public.my_trainer_progress(),
  public.my_unclaimed_phoenix_pass(),
  public.redeem_phoenix_pass(uuid, text),
  public.touch_last_active(),
  public.touch_streak()
to authenticated, service_role;

commit;
