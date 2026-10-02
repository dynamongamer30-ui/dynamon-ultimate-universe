-- Rewards must correspond to a real action on a real catalog mod.
CREATE OR REPLACE FUNCTION public.record_engagement(_event_key text, _target_key text)
RETURNS TABLE (xp integer, level integer, leveled_up boolean, awarded boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _amount integer;
  _row record;
  _inserted integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _event_key NOT IN ('rating', 'mod_like', 'favorite') THEN RAISE EXCEPTION 'Unsupported engagement event'; END IF;
  IF _target_key IS NULL OR btrim(_target_key) = '' THEN RAISE EXCEPTION 'Engagement target is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.mod_overrides WHERE slug = _target_key) THEN
    RAISE EXCEPTION 'Unknown mod target';
  END IF;
  IF _event_key = 'rating' AND NOT EXISTS (SELECT 1 FROM public.mod_ratings WHERE user_id = _uid AND mod_slug = _target_key) THEN
    RAISE EXCEPTION 'Rating action not found';
  END IF;
  IF _event_key = 'mod_like' AND NOT EXISTS (SELECT 1 FROM public.mod_likes WHERE user_id = _uid AND mod_slug = _target_key) THEN
    RAISE EXCEPTION 'Like action not found';
  END IF;
  IF _event_key = 'favorite' AND NOT EXISTS (SELECT 1 FROM public.favorites WHERE user_id = _uid AND mod_slug = _target_key) THEN
    RAISE EXCEPTION 'Favorite action not found';
  END IF;

  _amount := CASE _event_key WHEN 'rating' THEN 15 WHEN 'mod_like' THEN 2 WHEN 'favorite' THEN 5 END;
  INSERT INTO public.user_engagement_events (user_id, event_key, target_key)
  VALUES (_uid, _event_key, _target_key)
  ON CONFLICT (user_id, event_key, target_key) DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;
  IF _inserted = 0 THEN
    SELECT ux.xp, ux.level INTO _row FROM public.user_xp ux WHERE ux.user_id = _uid;
    RETURN QUERY SELECT COALESCE(_row.xp, 0), COALESCE(_row.level, 1), false, false;
    RETURN;
  END IF;

  SELECT * INTO _row FROM public.award_xp_internal(_uid, _amount);
  IF _event_key = 'rating' THEN PERFORM public.grant_achievement_internal(_uid, 'first_review'); END IF;
  IF _event_key = 'mod_like' THEN PERFORM public.grant_achievement_internal(_uid, 'first_like'); END IF;
  IF _event_key = 'favorite' AND (SELECT count(*) FROM public.favorites WHERE user_id = _uid) >= 5 THEN PERFORM public.grant_achievement_internal(_uid, 'collector'); END IF;
  IF _row.level = 5 THEN PERFORM public.grant_achievement_internal(_uid, 'level_5'); END IF;
  IF _row.level = 10 THEN PERFORM public.grant_achievement_internal(_uid, 'level_10'); END IF;
  RETURN QUERY SELECT _row.xp, _row.level, _row.leveled_up, true;
END;
$$;

ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_body_length;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_body_length CHECK (char_length(body) BETWEEN 1 AND 1000);
