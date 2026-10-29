-- Close the old direct campaign endpoint only after the guarded website route is verified.
revoke execute on function public.claim_campaign_pass(text) from public,anon,authenticated;
-- Apply only after the reward-history backfill and guarded claim rollout have passed verification.
-- Deletes expired automated notifications and one-day-old rate-limit attempts; never rewards.
select cron.schedule(
  'website-notification-cleanup',
  '*/15 * * * *',
  'select public.website_cleanup_notifications();'
);

create or replace function public.website_owner_automation() returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb; job_enabled boolean; last_status text; last_run timestamptz;
begin
 if not public.dg_is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 select active into job_enabled from cron.job where jobname='website-notification-cleanup';
 select r.status,r.start_time into last_status,last_run from cron.job_run_details r
 join cron.job j on j.jobid=r.jobid where j.jobname='website-notification-cleanup'
 order by r.start_time desc limit 1;
 select jsonb_build_object(
 'unclaimed_passes',(select count(*) from public.phoenix_passes where not claimed and not used and claim_deadline>now()),
 'available_passes',(select count(*) from public.phoenix_passes where claimed and not used and expires_at>now()),
 'daily_keys_24h',(select count(*) from public.vip_giveaway_winners where awarded_at>now()-interval '24 hours'),
 'last_key_award',(select max(awarded_at) from public.vip_giveaway_winners),
 'automated_notices',(select count(*) from public.notifications where source_kind='automated'),
 'manual_notices',(select count(*) from public.notifications where source_kind='manual'),
 'cleanup_enabled',coalesce(job_enabled,false),'cleanup_last_status',coalesce(last_status,'No run recorded'),
 'cleanup_last_run',last_run) into result;
 return result;
end $$;
revoke all on function public.website_owner_automation() from public,anon;
grant execute on function public.website_owner_automation() to authenticated;
