-- RLS init-plan performance batch, part 2.
-- Generated from the live pg_policies definitions read on 2026-11-10.
-- Supabase advisor reported 75 findings. Thirteen policies named dg_owner_all
-- are intentionally excluded. Policies on app_config and profiles_select_all
-- are also intentionally excluded from this migration.
-- The 62 remaining distinct policy definitions are dropped and recreated with
-- auth.uid() evaluated through a scalar subquery. Policy command, roles,
-- permissive mode, USING and WITH CHECK expressions are otherwise preserved.
-- No data, grants, functions, app_config values, or Worker configuration change.

BEGIN;

-- access_keys.owner_all_access_keys
DROP POLICY IF EXISTS "owner_all_access_keys" ON public."access_keys";
CREATE POLICY "owner_all_access_keys" ON public."access_keys"
  AS PERMISSIVE
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.is_owner = true)))));

-- avatar_pool.avatar_pool_owner_read_all
DROP POLICY IF EXISTS "avatar_pool_owner_read_all" ON public."avatar_pool";
CREATE POLICY "avatar_pool_owner_read_all" ON public."avatar_pool"
  AS PERMISSIVE
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.is_owner = true)))));

-- avatar_pool.avatar_pool_owner_write
DROP POLICY IF EXISTS "avatar_pool_owner_write" ON public."avatar_pool";
CREATE POLICY "avatar_pool_owner_write" ON public."avatar_pool"
  AS PERMISSIVE
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.is_owner = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.is_owner = true)))));

-- broadcasts.broadcasts_owner_insert
DROP POLICY IF EXISTS "broadcasts_owner_insert" ON public."broadcasts";
CREATE POLICY "broadcasts_owner_insert" ON public."broadcasts"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((((select auth.uid()) = author_id) AND has_role((select auth.uid()), 'owner'::app_role)));

-- broadcasts.broadcasts_owner_read
DROP POLICY IF EXISTS "broadcasts_owner_read" ON public."broadcasts";
CREATE POLICY "broadcasts_owner_read" ON public."broadcasts"
  AS PERMISSIVE
  FOR SELECT
  TO "authenticated"
  USING (has_role((select auth.uid()), 'owner'::app_role));

-- broadcasts.broadcasts_owner_update
DROP POLICY IF EXISTS "broadcasts_owner_update" ON public."broadcasts";
CREATE POLICY "broadcasts_owner_update" ON public."broadcasts"
  AS PERMISSIVE
  FOR UPDATE
  TO "authenticated"
  USING (has_role((select auth.uid()), 'owner'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'owner'::app_role));

-- claim_campaign_claims.claim_campaign_claims_select_self
DROP POLICY IF EXISTS "claim_campaign_claims_select_self" ON public."claim_campaign_claims";
CREATE POLICY "claim_campaign_claims_select_self" ON public."claim_campaign_claims"
  AS PERMISSIVE
  FOR SELECT
  TO "authenticated"
  USING ((user_id = (select auth.uid())));

-- claim_campaigns.owner_write_claim_campaigns
DROP POLICY IF EXISTS "owner_write_claim_campaigns" ON public."claim_campaigns";
CREATE POLICY "owner_write_claim_campaigns" ON public."claim_campaigns"
  AS PERMISSIVE
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.is_owner = true)))));

-- comment_likes.comment_likes_delete_own
DROP POLICY IF EXISTS "comment_likes_delete_own" ON public."comment_likes";
CREATE POLICY "comment_likes_delete_own" ON public."comment_likes"
  AS PERMISSIVE
  FOR DELETE
  TO "authenticated"
  USING (((select auth.uid()) = user_id));

-- comment_likes.comment_likes_insert_own
DROP POLICY IF EXISTS "comment_likes_insert_own" ON public."comment_likes";
CREATE POLICY "comment_likes_insert_own" ON public."comment_likes"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = user_id));

-- comment_reactions.comment_reactions_delete_own
DROP POLICY IF EXISTS "comment_reactions_delete_own" ON public."comment_reactions";
CREATE POLICY "comment_reactions_delete_own" ON public."comment_reactions"
  AS PERMISSIVE
  FOR DELETE
  TO "authenticated"
  USING (((select auth.uid()) = user_id));

-- comment_reactions.comment_reactions_insert_own
DROP POLICY IF EXISTS "comment_reactions_insert_own" ON public."comment_reactions";
CREATE POLICY "comment_reactions_insert_own" ON public."comment_reactions"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = user_id));

-- comments.comments_delete_own
DROP POLICY IF EXISTS "comments_delete_own" ON public."comments";
CREATE POLICY "comments_delete_own" ON public."comments"
  AS PERMISSIVE
  FOR DELETE
  TO "authenticated"
  USING (((select auth.uid()) = user_id));

-- comments.comments_delete_owner_any
DROP POLICY IF EXISTS "comments_delete_owner_any" ON public."comments";
CREATE POLICY "comments_delete_owner_any" ON public."comments"
  AS PERMISSIVE
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.is_owner = true)))));

-- comments.comments_insert_own
DROP POLICY IF EXISTS "comments_insert_own" ON public."comments";
CREATE POLICY "comments_insert_own" ON public."comments"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = user_id));

-- favorites.favorites_delete_own
DROP POLICY IF EXISTS "favorites_delete_own" ON public."favorites";
CREATE POLICY "favorites_delete_own" ON public."favorites"
  AS PERMISSIVE
  FOR DELETE
  TO "authenticated"
  USING (((select auth.uid()) = user_id));

-- favorites.favorites_insert_own
DROP POLICY IF EXISTS "favorites_insert_own" ON public."favorites";
CREATE POLICY "favorites_insert_own" ON public."favorites"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = user_id));

-- mod_likes.mod_likes_delete_own
DROP POLICY IF EXISTS "mod_likes_delete_own" ON public."mod_likes";
CREATE POLICY "mod_likes_delete_own" ON public."mod_likes"
  AS PERMISSIVE
  FOR DELETE
  TO "authenticated"
  USING (((select auth.uid()) = user_id));

-- mod_likes.mod_likes_insert_own
DROP POLICY IF EXISTS "mod_likes_insert_own" ON public."mod_likes";
CREATE POLICY "mod_likes_insert_own" ON public."mod_likes"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = user_id));

-- mod_overrides.mod_overrides owner write
DROP POLICY IF EXISTS "mod_overrides owner write" ON public."mod_overrides";
CREATE POLICY "mod_overrides owner write" ON public."mod_overrides"
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.is_owner = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.is_owner = true)))));

-- mod_overrides.owner_write_mod_overrides
DROP POLICY IF EXISTS "owner_write_mod_overrides" ON public."mod_overrides";
CREATE POLICY "owner_write_mod_overrides" ON public."mod_overrides"
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.is_owner = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.is_owner = true)))));

-- mod_ratings.mod_ratings_delete_own
DROP POLICY IF EXISTS "mod_ratings_delete_own" ON public."mod_ratings";
CREATE POLICY "mod_ratings_delete_own" ON public."mod_ratings"
  AS PERMISSIVE
  FOR DELETE
  TO "authenticated"
  USING (((select auth.uid()) = user_id));

-- mod_ratings.mod_ratings_insert_own
DROP POLICY IF EXISTS "mod_ratings_insert_own" ON public."mod_ratings";
CREATE POLICY "mod_ratings_insert_own" ON public."mod_ratings"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = user_id));

-- mod_ratings.mod_ratings_update_own
DROP POLICY IF EXISTS "mod_ratings_update_own" ON public."mod_ratings";
CREATE POLICY "mod_ratings_update_own" ON public."mod_ratings"
  AS PERMISSIVE
  FOR UPDATE
  TO "authenticated"
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

-- mod_subscribers.subs_insert_own
DROP POLICY IF EXISTS "subs_insert_own" ON public."mod_subscribers";
CREATE POLICY "subs_insert_own" ON public."mod_subscribers"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = user_id));

-- mod_subscribers.subs_select_self_or_owner
DROP POLICY IF EXISTS "subs_select_self_or_owner" ON public."mod_subscribers";
CREATE POLICY "subs_select_self_or_owner" ON public."mod_subscribers"
  AS PERMISSIVE
  FOR SELECT
  TO "authenticated"
  USING ((((select auth.uid()) = user_id) OR has_role((select auth.uid()), 'owner'::app_role)));

-- moderation_log.mod_log_owner_insert
DROP POLICY IF EXISTS "mod_log_owner_insert" ON public."moderation_log";
CREATE POLICY "mod_log_owner_insert" ON public."moderation_log"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((((select auth.uid()) = actor_id) AND has_role((select auth.uid()), 'owner'::app_role)));

-- moderation_log.mod_log_owner_read
DROP POLICY IF EXISTS "mod_log_owner_read" ON public."moderation_log";
CREATE POLICY "mod_log_owner_read" ON public."moderation_log"
  AS PERMISSIVE
  FOR SELECT
  TO "authenticated"
  USING (has_role((select auth.uid()), 'owner'::app_role));

-- notification_prefs.notif_prefs_delete_own
DROP POLICY IF EXISTS "notif_prefs_delete_own" ON public."notification_prefs";
CREATE POLICY "notif_prefs_delete_own" ON public."notification_prefs"
  AS PERMISSIVE
  FOR DELETE
  TO "authenticated"
  USING (((select auth.uid()) = user_id));

-- notification_prefs.notif_prefs_insert_own
DROP POLICY IF EXISTS "notif_prefs_insert_own" ON public."notification_prefs";
CREATE POLICY "notif_prefs_insert_own" ON public."notification_prefs"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = user_id));

-- notification_prefs.notif_prefs_select_own
DROP POLICY IF EXISTS "notif_prefs_select_own" ON public."notification_prefs";
CREATE POLICY "notif_prefs_select_own" ON public."notification_prefs"
  AS PERMISSIVE
  FOR SELECT
  TO "authenticated"
  USING (((select auth.uid()) = user_id));

-- notification_prefs.notif_prefs_update_own
DROP POLICY IF EXISTS "notif_prefs_update_own" ON public."notification_prefs";
CREATE POLICY "notif_prefs_update_own" ON public."notification_prefs"
  AS PERMISSIVE
  FOR UPDATE
  TO "authenticated"
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

-- notification_reads.reads own insert
DROP POLICY IF EXISTS "reads own insert" ON public."notification_reads";
CREATE POLICY "reads own insert" ON public."notification_reads"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((user_id = (select auth.uid())));

-- notification_reads.reads own select
DROP POLICY IF EXISTS "reads own select" ON public."notification_reads";
CREATE POLICY "reads own select" ON public."notification_reads"
  AS PERMISSIVE
  FOR SELECT
  TO "authenticated"
  USING ((user_id = (select auth.uid())));

-- notification_reads.reads own update
DROP POLICY IF EXISTS "reads own update" ON public."notification_reads";
CREATE POLICY "reads own update" ON public."notification_reads"
  AS PERMISSIVE
  FOR UPDATE
  TO "authenticated"
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- notifications.notifications owner write
DROP POLICY IF EXISTS "notifications owner write" ON public."notifications";
CREATE POLICY "notifications owner write" ON public."notifications"
  AS PERMISSIVE
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.is_owner = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.is_owner = true)))));

-- notifications.notifications read (auth)
DROP POLICY IF EXISTS "notifications read (auth)" ON public."notifications";
CREATE POLICY "notifications read (auth)" ON public."notifications"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((target_user_id IS NULL) OR (target_user_id = (select auth.uid()))));

-- phoenix_pass_winners.phoenix_pass_winners_self_read
DROP POLICY IF EXISTS "phoenix_pass_winners_self_read" ON public."phoenix_pass_winners";
CREATE POLICY "phoenix_pass_winners_self_read" ON public."phoenix_pass_winners"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (select auth.uid())));

-- phoenix_passes.phoenix_passes_self_read
DROP POLICY IF EXISTS "phoenix_passes_self_read" ON public."phoenix_passes";
CREATE POLICY "phoenix_passes_self_read" ON public."phoenix_passes"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (select auth.uid())));

-- profiles.profiles_insert_own
DROP POLICY IF EXISTS "profiles_insert_own" ON public."profiles";
CREATE POLICY "profiles_insert_own" ON public."profiles"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = id));

-- profiles.profiles_insert_self
DROP POLICY IF EXISTS "profiles_insert_self" ON public."profiles";
CREATE POLICY "profiles_insert_self" ON public."profiles"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((select auth.uid()) = id));

-- profiles.profiles_self_read
DROP POLICY IF EXISTS "profiles_self_read" ON public."profiles";
CREATE POLICY "profiles_self_read" ON public."profiles"
  AS PERMISSIVE
  FOR SELECT
  TO "authenticated"
  USING ((((select auth.uid()) = id) OR has_role((select auth.uid()), 'owner'::app_role)));

-- profiles.profiles_update_own
DROP POLICY IF EXISTS "profiles_update_own" ON public."profiles";
CREATE POLICY "profiles_update_own" ON public."profiles"
  AS PERMISSIVE
  FOR UPDATE
  TO "authenticated"
  USING (((select auth.uid()) = id))
  WITH CHECK (((select auth.uid()) = id));

-- profiles.profiles_update_self
DROP POLICY IF EXISTS "profiles_update_self" ON public."profiles";
CREATE POLICY "profiles_update_self" ON public."profiles"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((select auth.uid()) = id))
  WITH CHECK (((select auth.uid()) = id));

-- reports.reports_insert_own
DROP POLICY IF EXISTS "reports_insert_own" ON public."reports";
CREATE POLICY "reports_insert_own" ON public."reports"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = reporter_id));

-- reports.reports_select_own_or_owner
DROP POLICY IF EXISTS "reports_select_own_or_owner" ON public."reports";
CREATE POLICY "reports_select_own_or_owner" ON public."reports"
  AS PERMISSIVE
  FOR SELECT
  TO "authenticated"
  USING ((((select auth.uid()) = reporter_id) OR is_owner_user((select auth.uid()))));

-- reports.reports_update_owner
DROP POLICY IF EXISTS "reports_update_owner" ON public."reports";
CREATE POLICY "reports_update_owner" ON public."reports"
  AS PERMISSIVE
  FOR UPDATE
  TO "authenticated"
  USING (is_owner_user((select auth.uid())))
  WITH CHECK (is_owner_user((select auth.uid())));

-- site_settings.site_settings owner write
DROP POLICY IF EXISTS "site_settings owner write" ON public."site_settings";
CREATE POLICY "site_settings owner write" ON public."site_settings"
  AS PERMISSIVE
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.is_owner = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.is_owner = true)))));

-- user_achievements.user_achievements_insert_own
DROP POLICY IF EXISTS "user_achievements_insert_own" ON public."user_achievements";
CREATE POLICY "user_achievements_insert_own" ON public."user_achievements"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = user_id));

-- user_engagement_events.engagement_events_select_own
DROP POLICY IF EXISTS "engagement_events_select_own" ON public."user_engagement_events";
CREATE POLICY "engagement_events_select_own" ON public."user_engagement_events"
  AS PERMISSIVE
  FOR SELECT
  TO "authenticated"
  USING (((select auth.uid()) = user_id));

-- user_preferences.prefs_insert_own
DROP POLICY IF EXISTS "prefs_insert_own" ON public."user_preferences";
CREATE POLICY "prefs_insert_own" ON public."user_preferences"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = user_id));

-- user_preferences.prefs_select_own
DROP POLICY IF EXISTS "prefs_select_own" ON public."user_preferences";
CREATE POLICY "prefs_select_own" ON public."user_preferences"
  AS PERMISSIVE
  FOR SELECT
  TO "authenticated"
  USING (((select auth.uid()) = user_id));

-- user_preferences.prefs_update_own
DROP POLICY IF EXISTS "prefs_update_own" ON public."user_preferences";
CREATE POLICY "prefs_update_own" ON public."user_preferences"
  AS PERMISSIVE
  FOR UPDATE
  TO "authenticated"
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

-- user_roles.user_roles_self_read
DROP POLICY IF EXISTS "user_roles_self_read" ON public."user_roles";
CREATE POLICY "user_roles_self_read" ON public."user_roles"
  AS PERMISSIVE
  FOR SELECT
  TO "authenticated"
  USING (((select auth.uid()) = user_id));

-- user_streaks.streaks_insert_own
DROP POLICY IF EXISTS "streaks_insert_own" ON public."user_streaks";
CREATE POLICY "streaks_insert_own" ON public."user_streaks"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = user_id));

-- user_streaks.streaks_update_own
DROP POLICY IF EXISTS "streaks_update_own" ON public."user_streaks";
CREATE POLICY "streaks_update_own" ON public."user_streaks"
  AS PERMISSIVE
  FOR UPDATE
  TO "authenticated"
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

-- user_trainer_progress.trainer_progress_read_own
DROP POLICY IF EXISTS "trainer_progress_read_own" ON public."user_trainer_progress";
CREATE POLICY "trainer_progress_read_own" ON public."user_trainer_progress"
  AS PERMISSIVE
  FOR SELECT
  TO "authenticated"
  USING ((user_id = (select auth.uid())));

-- user_unlocks.Users update own unlock
DROP POLICY IF EXISTS "Users update own unlock" ON public."user_unlocks";
CREATE POLICY "Users update own unlock" ON public."user_unlocks"
  AS PERMISSIVE
  FOR UPDATE
  TO "authenticated"
  USING ((user_id = (select auth.uid())));

-- user_unlocks.Users upsert own unlock
DROP POLICY IF EXISTS "Users upsert own unlock" ON public."user_unlocks";
CREATE POLICY "Users upsert own unlock" ON public."user_unlocks"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((user_id = (select auth.uid())));

-- user_xp.xp_insert_own
DROP POLICY IF EXISTS "xp_insert_own" ON public."user_xp";
CREATE POLICY "xp_insert_own" ON public."user_xp"
  AS PERMISSIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((select auth.uid()) = user_id));

-- user_xp.xp_update_own
DROP POLICY IF EXISTS "xp_update_own" ON public."user_xp";
CREATE POLICY "xp_update_own" ON public."user_xp"
  AS PERMISSIVE
  FOR UPDATE
  TO "authenticated"
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

-- vip_giveaway_winners.vip_winners_self_read
DROP POLICY IF EXISTS "vip_winners_self_read" ON public."vip_giveaway_winners";
CREATE POLICY "vip_winners_self_read" ON public."vip_giveaway_winners"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (select auth.uid())));

COMMIT;
