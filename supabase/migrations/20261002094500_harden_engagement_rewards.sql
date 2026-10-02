-- Harden engagement rewards.
-- Clients may record only whitelisted, unique engagement events. They cannot
-- choose an XP amount or repeatedly farm a reward by toggling an action.
CREATE TABLE IF NOT EXISTS public.user_engagement_events (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_key text NOT NULL CHECK (event_key IN ('rating', 'mod_like', 'favorite')),
  target_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_key, target_key)
);

ALTER TABLE public.user_engagement_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_engagement_events TO authenticated;
DROP POLICY IF EXISTS "engagement_events_select_own" ON public.user_engagement_events;
CREATE POLICY "engagement_events_select_own" ON public.user_engagement_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.award_xp_internal(_uid uuid, _amount integer)
RETURNS TABLE (xp integer, level integer, leveled_up boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _old_level integer;
  _new_xp integer;
  _new_level integer;
BEGIN
  INSERT INTO public.user_xp (user_id, xp, level)
  VALUES (_uid, 0, 1) ON CONFLICT (user_id) DO NOTHING;
  SELECT ux.level INTO _old_level FROM public.user_xp ux WHERE ux.user_id = _uid;
  UPDATE public.user_xp
     SET xp = user_xp.xp + GREATEST(_amount, 0), updated_at = now()
   WHERE user_id = _uid
   RETURNING user_xp.xp INTO _new_xp;
  _new_level := GREATEST(1, FLOOR(SQRT(_new_xp::numeric / 50.0))::integer + 1);
  UPDATE public.user_xp SET level = _new_level WHERE user_id = _uid;
  RETURN QUERY SELECT _new_xp, _new_level, (_new_level > COALESCE(_old_level, 1));
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_achievement_internal(_uid uuid, _key text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _reward integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = _uid AND achievement_key = _key) THEN
    RETURN false;
  END IF;
  SELECT xp_reward INTO _reward FROM public.achievements WHERE key = _key;
  IF _reward IS NULL THEN RETURN false; END IF;
  INSERT INTO public.user_achievements (user_id, achievement_key) VALUES (_uid, _key);
  PERFORM public.award_xp_internal(_uid, _reward);
  RETURN true;
END;
$$;

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
  IF _event_key NOT IN ('rating', 'mod_like', 'favorite') THEN
    RAISE EXCEPTION 'Unsupported engagement event';
  END IF;
  IF _target_key IS NULL OR btrim(_target_key) = '' THEN
    RAISE EXCEPTION 'Engagement target is required';
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
  IF _event_key = 'favorite' AND (SELECT count(*) FROM public.favorites WHERE user_id = _uid) >= 5 THEN
    PERFORM public.grant_achievement_internal(_uid, 'collector');
  END IF;
  IF _row.level = 5 THEN PERFORM public.grant_achievement_internal(_uid, 'level_5'); END IF;
  IF _row.level = 10 THEN PERFORM public.grant_achievement_internal(_uid, 'level_10'); END IF;
  RETURN QUERY SELECT _row.xp, _row.level, _row.leveled_up, true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_engagement(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.award_xp(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_achievement(text) FROM PUBLIC;
