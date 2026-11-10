-- Owner-only hardening (2026-11-10)
-- Second of two security migrations. Read every revoke below before applying:
-- a function that a Cloudflare Worker or the site calls with the public key will
-- start returning "permission denied" and must be called with the service key instead.
--
-- Result after this file: 44 of the 50 SECURITY DEFINER functions in public are
-- owner-only, session-only, or trigger-only. Six deliberately keep logged-out
-- access: redeem_access_key, create_secure_session, redeem_secure_session,
-- username_available, website_campaign_status, and dg_is_owner.

begin;

-- 1) CRITICAL: the account purge was callable by anyone and deletes auth.users.
--    It had no caller check at all. postgres (a cron run) and service_role keep
--    access, so whatever schedules it today must be checked to use one of those.
revoke execute on function public.delete_inactive_accounts() from public, anon, authenticated;

-- 2) Owner-only functions. Each already checks the owner inside (dg_is_owner, or
--    the owner email), so revoking is defence in depth - a stolen token reaches
--    them and still gets refused.
revoke execute on function public.website_owner_automation() from public, anon, authenticated;
revoke execute on function public.website_reward_history(timestamp with time zone, integer, text) from public, anon, authenticated;
revoke execute on function public.website_save_campaign(text, text, integer, boolean, timestamp with time zone, timestamp with time zone, text) from public, anon, authenticated;

-- 3) Signed-in-only functions. These key off auth.uid() and refuse a null one,
--    so logged-out callers can only make noise with them. Signed-in users keep
--    access, because these are personal reward/notification panels.
revoke execute on function public.website_acknowledge_notification(uuid[]) from public, anon;
revoke execute on function public.website_saved_searches(text, uuid, text, jsonb) from public, anon;

grant execute on function
  public.website_owner_automation(),
  public.website_reward_history(timestamp with time zone, integer, text),
  public.website_save_campaign(text, text, integer, boolean, timestamp with time zone, timestamp with time zone, text),
  public.website_acknowledge_notification(uuid[]),
  public.website_saved_searches(text, uuid, text, jsonb)
to authenticated, service_role;

-- 4) website_is_demo_owner takes an arbitrary user id, so any signed-in visitor
--    could use it to test whether a given account is the owner's. It is only
--    called from owner paths, so restrict it to signed-in callers and the API.
revoke execute on function public.website_is_demo_owner(uuid, bigint) from public, anon;
grant  execute on function public.website_is_demo_owner(uuid, bigint) to authenticated, service_role;

-- 5) username_available is intentionally left public. The mandatory profile step
--    checks availability before a username exists, so a logged-out visitor can
--    still probe which usernames are taken. That exposure is accepted here; if
--    you want it closed, the profile step has to move behind sign-in first.

commit;
