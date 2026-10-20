-- Narrow, server-only API functions for the Neon migration test Worker.
-- Every function derives the legacy Supabase profile ID from a Neon Auth ID;
-- callers never supply a legacy user ID.

CREATE OR REPLACE FUNCTION migration.neon_api_profile_v1(p_neon_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  legacy_id uuid;
  result jsonb;
BEGIN
  legacy_id := migration.legacy_user_id_for_neon(p_neon_user_id);
  IF legacy_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No mapped Neon identity';
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'is_owner', p.is_owner,
    'custom_avatar_url', p.custom_avatar_url
  )
  INTO result
  FROM public.profiles AS p
  WHERE p.id = legacy_id;

  IF result IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Mapped profile not found';
  END IF;
  RETURN result;
END
$function$;

CREATE OR REPLACE FUNCTION migration.neon_api_favorites_v1(p_neon_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  legacy_id uuid;
  result jsonb;
BEGIN
  legacy_id := migration.legacy_user_id_for_neon(p_neon_user_id);
  IF legacy_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No mapped Neon identity';
  END IF;

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('mod_slug', f.mod_slug) ORDER BY f.created_at, f.mod_slug),
    '[]'::jsonb
  )
  INTO result
  FROM public.favorites AS f
  WHERE f.user_id = legacy_id;
  RETURN result;
END
$function$;

CREATE OR REPLACE FUNCTION migration.neon_api_set_favorite_v1(
  p_neon_user_id uuid,
  p_slug text,
  p_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  legacy_id uuid;
  inserted_slug text;
BEGIN
  legacy_id := migration.legacy_user_id_for_neon(p_neon_user_id);
  IF legacy_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No mapped Neon identity';
  END IF;
  IF p_enabled IS NULL OR p_slug IS NULL OR pg_catalog.length(p_slug) > 64
     OR p_slug !~ '^[a-z0-9][a-z0-9-]{0,63}$'
     OR NOT EXISTS (SELECT 1 FROM public.mod_overrides AS m WHERE m.slug = p_slug) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid mod target';
  END IF;

  IF p_enabled THEN
    INSERT INTO public.favorites(user_id, mod_slug)
    VALUES (legacy_id, p_slug)
    ON CONFLICT (user_id, mod_slug) DO NOTHING
    RETURNING mod_slug INTO inserted_slug;
    IF inserted_slug IS NOT NULL THEN
      PERFORM migration.record_engagement_v1(p_neon_user_id, 'favorite', p_slug);
    END IF;
  ELSE
    DELETE FROM public.favorites AS f
    WHERE f.user_id = legacy_id AND f.mod_slug = p_slug;
  END IF;

  RETURN jsonb_build_object('enabled', p_enabled);
END
$function$;

CREATE OR REPLACE FUNCTION migration.neon_api_likes_v1(p_neon_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  legacy_id uuid;
  result jsonb;
BEGIN
  legacy_id := migration.legacy_user_id_for_neon(p_neon_user_id);
  IF legacy_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No mapped Neon identity';
  END IF;

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('mod_slug', l.mod_slug) ORDER BY l.created_at, l.mod_slug),
    '[]'::jsonb
  )
  INTO result
  FROM public.mod_likes AS l
  WHERE l.user_id = legacy_id;
  RETURN result;
END
$function$;

CREATE OR REPLACE FUNCTION migration.neon_api_set_like_v1(
  p_neon_user_id uuid,
  p_slug text,
  p_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  legacy_id uuid;
  inserted_slug text;
BEGIN
  legacy_id := migration.legacy_user_id_for_neon(p_neon_user_id);
  IF legacy_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No mapped Neon identity';
  END IF;
  IF p_enabled IS NULL OR p_slug IS NULL OR pg_catalog.length(p_slug) > 64
     OR p_slug !~ '^[a-z0-9][a-z0-9-]{0,63}$'
     OR NOT EXISTS (SELECT 1 FROM public.mod_overrides AS m WHERE m.slug = p_slug) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid mod target';
  END IF;

  IF p_enabled THEN
    INSERT INTO public.mod_likes(user_id, mod_slug)
    VALUES (legacy_id, p_slug)
    ON CONFLICT (user_id, mod_slug) DO NOTHING
    RETURNING mod_slug INTO inserted_slug;
    IF inserted_slug IS NOT NULL THEN
      PERFORM migration.record_engagement_v1(p_neon_user_id, 'mod_like', p_slug);
    END IF;
  ELSE
    DELETE FROM public.mod_likes AS l
    WHERE l.user_id = legacy_id AND l.mod_slug = p_slug;
  END IF;

  RETURN jsonb_build_object('enabled', p_enabled);
END
$function$;

CREATE OR REPLACE FUNCTION migration.neon_api_progress_v1(p_neon_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  RETURN migration.progress_for_neon_v1(p_neon_user_id);
END
$function$;

CREATE OR REPLACE FUNCTION migration.neon_api_check_in_v1(p_neon_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT pg_catalog.to_jsonb(s) INTO result
  FROM migration.touch_streak_v1(p_neon_user_id) AS s;
  RETURN result;
END
$function$;

REVOKE ALL ON FUNCTION migration.neon_api_profile_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION migration.neon_api_favorites_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION migration.neon_api_set_favorite_v1(uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION migration.neon_api_likes_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION migration.neon_api_set_like_v1(uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION migration.neon_api_progress_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION migration.neon_api_check_in_v1(uuid) FROM PUBLIC;

GRANT USAGE ON SCHEMA migration TO dg_neon_api_limited;
GRANT EXECUTE ON FUNCTION migration.neon_api_profile_v1(uuid) TO dg_neon_api_limited;
GRANT EXECUTE ON FUNCTION migration.neon_api_favorites_v1(uuid) TO dg_neon_api_limited;
GRANT EXECUTE ON FUNCTION migration.neon_api_set_favorite_v1(uuid, text, boolean) TO dg_neon_api_limited;
GRANT EXECUTE ON FUNCTION migration.neon_api_likes_v1(uuid) TO dg_neon_api_limited;
GRANT EXECUTE ON FUNCTION migration.neon_api_set_like_v1(uuid, text, boolean) TO dg_neon_api_limited;
GRANT EXECUTE ON FUNCTION migration.neon_api_progress_v1(uuid) TO dg_neon_api_limited;
GRANT EXECUTE ON FUNCTION migration.neon_api_check_in_v1(uuid) TO dg_neon_api_limited;
