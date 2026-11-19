-- Narrowly harden user-scoped progression reads and the one-time download flow.
-- Public profile discovery remains available through profiles_public_safe_read.
BEGIN;

-- API roles do not need to create objects in a schema used by definer routines.
-- Preserve the trusted migration/runtime role's existing capability.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT CREATE ON SCHEMA public TO service_role;

-- Progression records are private user state. The browser only reads them after
-- authentication and filters every query to the active user's id.
REVOKE SELECT ON TABLE public.user_xp, public.user_streaks, public.user_achievements
  FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.user_xp, public.user_streaks, public.user_achievements
  TO authenticated;

DROP POLICY IF EXISTS "xp_public_read" ON public.user_xp;
DROP POLICY IF EXISTS "streaks_public_read" ON public.user_streaks;
DROP POLICY IF EXISTS "user_achievements_public_read" ON public.user_achievements;

DROP POLICY IF EXISTS "xp_select_own" ON public.user_xp;
CREATE POLICY "xp_select_own" ON public.user_xp
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "streaks_select_own" ON public.user_streaks;
CREATE POLICY "streaks_select_own" ON public.user_streaks
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_achievements_select_own" ON public.user_achievements;
CREATE POLICY "user_achievements_select_own" ON public.user_achievements
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- The broad policy is redundant: the explicitly named safe-read policy and the
-- public_profiles security-invoker view preserve intended public profile data.
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

-- Require a signed-in caller before reading configured download metadata or
-- inserting a server-side session. Bind new sessions to the authenticated user
-- and rate-limit by trusted user identity (with fingerprint fallback for legacy
-- sessions created before this migration).
CREATE OR REPLACE FUNCTION public.create_secure_session(p_slug text, p_fingerprint text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_link text;
  v_version text;
  v_token text;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_recent integer;
  v_user_id uuid := auth.uid();
  v_data jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'authentication_required');
  END IF;
  IF p_fingerprint IS NULL OR length(p_fingerprint) = 0 OR length(p_fingerprint) > 200 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_fingerprint');
  END IF;
  IF p_slug IS NULL OR length(p_slug) = 0 OR length(p_slug) > 100 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_slug');
  END IF;

  SELECT count(*) INTO v_recent
    FROM public.secure_sessions
   WHERE (
     data->>'userId' = v_user_id::text
     OR (data->>'userId' IS NULL AND data->>'fingerprint' = p_fingerprint)
   )
     AND (data->>'timestamp')::bigint > (v_now - 3600000);
  IF v_recent >= 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  SELECT mega_enc, version INTO v_link, v_version
    FROM public.mod_overrides
   WHERE slug = p_slug;
  IF v_link IS NULL OR v_link = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_link');
  END IF;

  v_token := gen_random_uuid()::text;
  v_data := jsonb_build_object(
    'megaLink', v_link,
    'timestamp', v_now,
    'fingerprint', p_fingerprint,
    'modVersion', p_slug,
    'userId', v_user_id::text,
    'used', false
  );
  IF v_version IS NOT NULL AND v_version <> '' THEN
    v_data := v_data || jsonb_build_object('version', v_version);
  END IF;

  INSERT INTO public.secure_sessions (id, data) VALUES (v_token, v_data);
  RETURN jsonb_build_object('ok', true, 'token', v_token);
END;
$function$;

-- A new session can only be redeemed by the same signed-in account/device.
-- If a session had a version recorded, an omitted or changed version now fails.
CREATE OR REPLACE FUNCTION public.redeem_secure_session(
  p_token text,
  p_fingerprint text,
  p_version text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_row public.secure_sessions%ROWTYPE;
  v_data jsonb;
  v_ts bigint;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_timer integer;
  v_min_timer integer;
  v_elapsed numeric;
  v_link text;
  v_burned integer;
  v_slug text;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'authentication_required');
  END IF;
  IF p_token IS NULL OR length(p_token) = 0 OR length(p_token) > 128 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;
  IF p_fingerprint IS NULL OR length(p_fingerprint) = 0 OR length(p_fingerprint) > 200 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_fingerprint');
  END IF;

  SELECT * INTO v_row FROM public.secure_sessions WHERE id = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  v_data := v_row.data;

  IF COALESCE((v_data->>'used')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;
  IF COALESCE(v_data->>'fingerprint', '') <> p_fingerprint THEN
    RETURN jsonb_build_object('ok', false, 'error', 'fingerprint_mismatch');
  END IF;
  IF v_data ? 'userId' AND COALESCE(v_data->>'userId', '') <> v_user_id::text THEN
    RETURN jsonb_build_object('ok', false, 'error', 'account_mismatch');
  END IF;
  IF v_data ? 'version'
     AND (p_version IS NULL OR COALESCE(v_data->>'version', '') <> p_version) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'version_mismatch');
  END IF;

  SELECT COALESCE((data->'timer')::text::integer, 900),
         COALESCE((data->'minTimer')::text::integer, 45)
    INTO v_timer, v_min_timer
    FROM public.app_config WHERE id = 'Security';
  IF v_timer IS NULL THEN v_timer := 900; END IF;
  IF v_min_timer IS NULL THEN v_min_timer := 45; END IF;

  v_ts := COALESCE((v_data->>'timestamp')::bigint, 0);
  v_elapsed := (v_now - v_ts) / 1000.0;
  IF v_elapsed > v_timer THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF v_elapsed < v_min_timer THEN
    RETURN jsonb_build_object('ok', false, 'error', 'too_fast');
  END IF;

  UPDATE public.secure_sessions
     SET data = jsonb_set(data, '{used}', 'true'::jsonb)
   WHERE id = p_token
     AND COALESCE((data->>'used')::boolean, false) = false;
  GET DIAGNOSTICS v_burned = ROW_COUNT;
  IF v_burned = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;

  v_link := COALESCE(NULLIF(v_data->>'link', ''), NULLIF(v_data->>'megaLink', ''));
  IF v_link IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_link');
  END IF;

  v_slug := v_data->>'modVersion';
  IF v_slug IS NOT NULL THEN
    UPDATE public.mod_overrides
       SET real_downloads = real_downloads + 1
     WHERE slug = v_slug;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'link', v_link,
    'encrypted', (v_data ? 'megaLink') AND NOT (v_data ? 'link')
  );
END;
$function$;

-- These RPCs are website-user actions. Keep service_role access only for the
-- established key-redeem backend, and remove anonymous/public execution.
REVOKE ALL ON FUNCTION public.create_secure_session(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_secure_session(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.redeem_secure_session(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_secure_session(text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.redeem_access_key(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_access_key(text, text) TO authenticated, service_role;

COMMIT;
