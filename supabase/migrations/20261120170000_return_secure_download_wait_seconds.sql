CREATE OR REPLACE FUNCTION public.create_secure_session(p_slug text, p_fingerprint text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
DECLARE
  v_link text;
  v_version text;
  v_token text;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_recent integer;
  v_min_timer integer := 45;
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

  SELECT COALESCE((data->'minTimer')::text::integer, 45)
    INTO v_min_timer
    FROM public.app_config
   WHERE id = 'Security';
  v_min_timer := GREATEST(0, LEAST(COALESCE(v_min_timer, 45), 1800));

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
  RETURN jsonb_build_object('ok', true, 'token', v_token, 'waitSeconds', v_min_timer);
END;
$function$;