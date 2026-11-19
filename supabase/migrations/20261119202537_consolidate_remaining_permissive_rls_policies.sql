-- avatar_pool: merge public-active and owner-all visibility into one SELECT
-- policy, then keep owner writes separate.
DROP POLICY IF EXISTS avatar_pool_owner_write ON public.avatar_pool;
DROP POLICY IF EXISTS avatar_pool_public_read ON public.avatar_pool;
CREATE POLICY avatar_pool_read_public_or_owner ON public.avatar_pool
  FOR SELECT TO PUBLIC
  USING (active = true OR (SELECT public.dg_is_owner()));
CREATE POLICY avatar_pool_owner_insert ON public.avatar_pool
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY avatar_pool_owner_update ON public.avatar_pool
  FOR UPDATE TO authenticated USING ((SELECT public.dg_is_owner()))
  WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY avatar_pool_owner_delete ON public.avatar_pool
  FOR DELETE TO authenticated USING ((SELECT public.dg_is_owner()));

-- Campaign rows are readable to authenticated users already; owner writes
-- do not need an overlapping ALL/SELECT policy.
DROP POLICY IF EXISTS owner_write_claim_campaigns ON public.claim_campaigns;
CREATE POLICY owner_insert_claim_campaigns ON public.claim_campaigns
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY owner_update_claim_campaigns ON public.claim_campaigns
  FOR UPDATE TO authenticated USING ((SELECT public.dg_is_owner()))
  WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY owner_delete_claim_campaigns ON public.claim_campaigns
  FOR DELETE TO authenticated USING ((SELECT public.dg_is_owner()));

-- Combine self-delete and owner moderation into one policy.
DROP POLICY IF EXISTS comments_delete_own ON public.comments;
DROP POLICY IF EXISTS comments_delete_owner_any ON public.comments;
CREATE POLICY comments_delete_self_or_owner ON public.comments
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.dg_is_owner()));

-- Public read remains; owner write is separated from SELECT.
DROP POLICY IF EXISTS owner_write_mod_overrides ON public.mod_overrides;
CREATE POLICY mod_overrides_owner_insert ON public.mod_overrides
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY mod_overrides_owner_update ON public.mod_overrides
  FOR UPDATE TO authenticated USING ((SELECT public.dg_is_owner()))
  WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY mod_overrides_owner_delete ON public.mod_overrides
  FOR DELETE TO authenticated USING ((SELECT public.dg_is_owner()));

-- Preserve owner visibility of all notifications without overlapping SELECT
-- policies; ordinary users retain global and their own notifications.
DROP POLICY IF EXISTS "notifications owner write" ON public.notifications;
DROP POLICY IF EXISTS "notifications read (auth)" ON public.notifications;
CREATE POLICY notifications_read_self_or_owner ON public.notifications
  FOR SELECT TO PUBLIC
  USING (target_user_id IS NULL OR target_user_id = (SELECT auth.uid())
         OR (SELECT public.dg_is_owner()));
CREATE POLICY notifications_owner_insert ON public.notifications
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY notifications_owner_update ON public.notifications
  FOR UPDATE TO authenticated USING ((SELECT public.dg_is_owner()))
  WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY notifications_owner_delete ON public.notifications
  FOR DELETE TO authenticated USING ((SELECT public.dg_is_owner()));

-- Reward records: combine self and owner SELECT, keep owner writes authenticated.
DROP POLICY IF EXISTS phoenix_pass_winners_owner_all ON public.phoenix_pass_winners;
DROP POLICY IF EXISTS phoenix_pass_winners_self_read ON public.phoenix_pass_winners;
CREATE POLICY phoenix_pass_winners_read_self_or_owner ON public.phoenix_pass_winners
  FOR SELECT TO PUBLIC
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.dg_is_owner()));
CREATE POLICY phoenix_pass_winners_owner_insert ON public.phoenix_pass_winners
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY phoenix_pass_winners_owner_update ON public.phoenix_pass_winners
  FOR UPDATE TO authenticated USING ((SELECT public.dg_is_owner()))
  WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY phoenix_pass_winners_owner_delete ON public.phoenix_pass_winners
  FOR DELETE TO authenticated USING ((SELECT public.dg_is_owner()));

DROP POLICY IF EXISTS phoenix_passes_owner_all ON public.phoenix_passes;
DROP POLICY IF EXISTS phoenix_passes_self_read ON public.phoenix_passes;
CREATE POLICY phoenix_passes_read_self_or_owner ON public.phoenix_passes
  FOR SELECT TO PUBLIC
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.dg_is_owner()));
CREATE POLICY phoenix_passes_owner_insert ON public.phoenix_passes
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY phoenix_passes_owner_update ON public.phoenix_passes
  FOR UPDATE TO authenticated USING ((SELECT public.dg_is_owner()))
  WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY phoenix_passes_owner_delete ON public.phoenix_passes
  FOR DELETE TO authenticated USING ((SELECT public.dg_is_owner()));

DROP POLICY IF EXISTS vip_winners_owner_all ON public.vip_giveaway_winners;
DROP POLICY IF EXISTS vip_winners_self_read ON public.vip_giveaway_winners;
CREATE POLICY vip_winners_read_self_or_owner ON public.vip_giveaway_winners
  FOR SELECT TO PUBLIC
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.dg_is_owner()));
CREATE POLICY vip_winners_owner_insert ON public.vip_giveaway_winners
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY vip_winners_owner_update ON public.vip_giveaway_winners
  FOR UPDATE TO authenticated USING ((SELECT public.dg_is_owner()))
  WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY vip_winners_owner_delete ON public.vip_giveaway_winners
  FOR DELETE TO authenticated USING ((SELECT public.dg_is_owner()));

-- profiles_public_safe_read already permits the same safe-column public reads;
-- this narrower permissive SELECT policy added no additional protection.
DROP POLICY IF EXISTS profiles_self_read ON public.profiles;

-- Public settings are already readable to everyone; owner write access is
-- split so it does not duplicate the SELECT policy.
DROP POLICY IF EXISTS "site_settings owner write" ON public.site_settings;
CREATE POLICY site_settings_owner_insert ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY site_settings_owner_update ON public.site_settings
  FOR UPDATE TO authenticated USING ((SELECT public.dg_is_owner()))
  WITH CHECK ((SELECT public.dg_is_owner()));
CREATE POLICY site_settings_owner_delete ON public.site_settings
  FOR DELETE TO authenticated USING ((SELECT public.dg_is_owner()));
