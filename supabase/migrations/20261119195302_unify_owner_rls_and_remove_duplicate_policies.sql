-- Use the database-controlled owner flag consistently instead of JWT email
-- comparisons in owner RLS policies.
DO $owner_policies$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'access_tokens','activated_users','admin_logs','app_config','banned_devices',
    'gate_tokens','generation_logs','honeypot_log','worker_init_rate'
  ] LOOP
    EXECUTE format(
      'ALTER POLICY dg_owner_all ON public.%I USING ((select public.dg_is_owner())) WITH CHECK ((select public.dg_is_owner()))',
      t
    );
  END LOOP;
END
$owner_policies$;

-- Remove four legacy duplicates where a profile-backed owner policy already exists.
DROP POLICY IF EXISTS dg_owner_all ON public.valid_keys;
DROP POLICY IF EXISTS dg_owner_all ON public.rate_limits;
DROP POLICY IF EXISTS dg_owner_all ON public.secure_sessions;
DROP POLICY IF EXISTS dg_owner_all ON public.suspicious_activity;

-- Remove exact duplicate policies; retained policies have the same role coverage
-- and predicates.
DROP POLICY IF EXISTS "mod_overrides owner write" ON public.mod_overrides;
DROP POLICY IF EXISTS "mod_overrides public read" ON public.mod_overrides;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
