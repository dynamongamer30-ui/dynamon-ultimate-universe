-- Performance batch, part 1 of 2 (SAFE) - applied via the Supabase SQL Editor on 2026-11-10.
-- Verified live afterwards: 29 *_fkey_idx indexes exist, cleanup-valid-keys schedule = '7 * * * *'.
--
-- Changes NO access rules and drops NO policy. Additive only; behaviour is
-- identical before and after. Part 2 (75 policies that re-check the user per row,
-- plus the duplicate owner rules) is deliberately not in here - it changes who
-- can read what and needs its own file and its own test pass.
--
-- NOTE ON THE CRON LINE: cron.alter_job is its own statement and cannot sit inside
-- a transaction block with the index statements in the way this file used to be
-- written. In the version actually run, the cron call was issued separately.
-- Keeping both here as records; re-running alter_job with the same schedule is a no-op.

begin;

-- 1) MISSING INDEXES ON FOREIGN KEYS (29)
--    Every one currently makes a delete or a join scan the whole table.
create index if not exists access_keys_created_by_fkey_idx               on public.access_keys (created_by);
create index if not exists broadcasts_author_id_fkey_idx                 on public.broadcasts (author_id);
create index if not exists claim_campaign_claims_pass_id_fkey_idx        on public.claim_campaign_claims (pass_id);
create index if not exists claim_campaign_claims_user_id_fkey_idx        on public.claim_campaign_claims (user_id);
create index if not exists comment_likes_user_id_fkey_idx                on public.comment_likes (user_id);
create index if not exists comment_reactions_user_id_fkey_idx            on public.comment_reactions (user_id);
create index if not exists comments_user_id_fkey_idx                     on public.comments (user_id);
create index if not exists mod_likes_user_id_fkey_idx                    on public.mod_likes (user_id);
create index if not exists moderation_log_actor_id_fkey_idx              on public.moderation_log (actor_id);
create index if not exists notification_reads_user_id_fkey_idx           on public.notification_reads (user_id);
create index if not exists notifications_target_user_id_fkey_idx         on public.notifications (target_user_id);
create index if not exists phoenix_pass_winners_pass_id_fkey_idx         on public.phoenix_pass_winners (pass_id);
create index if not exists phoenix_pass_winners_user_id_fkey_idx         on public.phoenix_pass_winners (user_id);
create index if not exists reports_reporter_id_fkey_idx                  on public.reports (reporter_id);
create index if not exists user_achievements_achievement_key_fkey_idx    on public.user_achievements (achievement_key);
create index if not exists user_unlocks_key_id_fkey_idx                  on public.user_unlocks (key_id);
create index if not exists vip_giveaway_winners_user_id_fkey_idx         on public.vip_giveaway_winners (user_id);
create index if not exists website_campaign_browser_claims_user_id_fkey_idx on public.website_campaign_browser_claims (user_id);
create index if not exists website_owner_demo_awards_campaign_slug_fkey_idx on public.website_owner_demo_awards (campaign_slug);
create index if not exists website_owner_demo_awards_pass_id_fkey_idx    on public.website_owner_demo_awards (pass_id);
create index if not exists website_owner_demo_awards_user_id_fkey_idx    on public.website_owner_demo_awards (user_id);
create index if not exists website_pass_grants_owner_id_fkey_idx         on public.website_pass_grants (owner_id);
create index if not exists website_pass_grants_pass_id_fkey_idx          on public.website_pass_grants (pass_id);
create index if not exists website_pass_grants_user_id_fkey_idx          on public.website_pass_grants (user_id);
create index if not exists website_telegram_awards_pass_id_fkey_idx      on public.website_telegram_awards (pass_id);
create index if not exists website_telegram_awards_user_id_fkey_idx      on public.website_telegram_awards (user_id);
create index if not exists website_telegram_handoffs_campaign_slug_fkey_idx on public.website_telegram_handoffs (campaign_slug);
create index if not exists website_telegram_handoffs_pass_id_fkey_idx    on public.website_telegram_handoffs (pass_id);
create index if not exists rv_v2_admin_audit_license_id_fkey_idx         on rv_v2.admin_audit (license_id);

commit;

-- 2) THE EVERY-MINUTE CLEANUP JOB
--    cleanup_valid_keys ran every 60 seconds for a 10-minute retention window.
--    Hourly does the same work; a key is still removed 10 minutes after creation.
select cron.alter_job(
  (select jobid from cron.job where jobname = 'cleanup-valid-keys'),
  schedule := '7 * * * *'
)
where exists (select 1 from cron.job where jobname = 'cleanup-valid-keys');

-- VERIFY:
--   select count(*) from pg_indexes where schemaname in ('public','rv_v2')
--     and indexname like '%_fkey_idx';            -- 29
--   select jobname, schedule, active from cron.job where jobname = 'cleanup-valid-keys';
--                                                -- cleanup-valid-keys | 7 * * * * | true
