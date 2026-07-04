
-- =========================
-- XP / LEVELS
-- =========================
CREATE TABLE public.user_xp (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_xp TO anon, authenticated;
GRANT INSERT, UPDATE ON public.user_xp TO authenticated;
GRANT ALL ON public.user_xp TO service_role;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_public_read" ON public.user_xp FOR SELECT USING (true);
CREATE POLICY "xp_insert_own" ON public.user_xp FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "xp_update_own" ON public.user_xp FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- STREAKS
-- =========================
CREATE TABLE public.user_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_streaks TO anon, authenticated;
GRANT INSERT, UPDATE ON public.user_streaks TO authenticated;
GRANT ALL ON public.user_streaks TO service_role;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaks_public_read" ON public.user_streaks FOR SELECT USING (true);
CREATE POLICY "streaks_insert_own" ON public.user_streaks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "streaks_update_own" ON public.user_streaks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- ACHIEVEMENTS
-- =========================
CREATE TABLE public.achievements (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Trophy',
  xp_reward INTEGER NOT NULL DEFAULT 50,
  tier TEXT NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_public_read" ON public.achievements FOR SELECT USING (true);

CREATE TABLE public.user_achievements (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL REFERENCES public.achievements(key) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_key)
);
GRANT SELECT ON public.user_achievements TO anon, authenticated;
GRANT INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_achievements_public_read" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "user_achievements_insert_own" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

INSERT INTO public.achievements (key, name, description, icon, xp_reward, tier) VALUES
  ('first_login', 'Trainer Awakened', 'Sign in for the first time.', 'Sparkles', 25, 'bronze'),
  ('first_download', 'First Capture', 'Download your first mod.', 'Download', 50, 'bronze'),
  ('first_like', 'Heart Spark', 'Like your first mod.', 'Heart', 25, 'bronze'),
  ('first_comment', 'Voice of the Vault', 'Post your first review.', 'MessageSquare', 50, 'bronze'),
  ('streak_3', 'Daily Pulse', 'Login 3 days in a row.', 'Flame', 75, 'silver'),
  ('streak_7', 'Weekly Aurora', 'Login 7 days in a row.', 'Flame', 150, 'gold'),
  ('streak_30', 'Eternal Flame', 'Login 30 days in a row.', 'Flame', 500, 'legendary'),
  ('element_master', 'Element Master', 'Favorite mods of 5 different elements.', 'Sparkles', 200, 'gold'),
  ('top_commenter', 'Top Commenter', 'Post 10 reviews.', 'MessageSquare', 250, 'gold'),
  ('collector', 'Collector', 'Bookmark 5 mods.', 'Bookmark', 100, 'silver'),
  ('level_5', 'Rising Trainer', 'Reach Level 5.', 'Award', 150, 'silver'),
  ('level_10', 'Elite Trainer', 'Reach Level 10.', 'Award', 300, 'gold')
ON CONFLICT (key) DO NOTHING;

-- =========================
-- FAVORITES
-- =========================
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mod_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mod_slug)
);
GRANT SELECT ON public.favorites TO anon, authenticated;
GRANT INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_public_read" ON public.favorites FOR SELECT USING (true);
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================
-- COMMENTS - add threading
-- =========================
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS comments_parent_idx ON public.comments(parent_id);

-- =========================
-- COMMENT REACTIONS (elemental)
-- =========================
CREATE TABLE public.comment_reactions (
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('fire','water','thunder','leaf','spirit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id, reaction)
);
GRANT SELECT ON public.comment_reactions TO anon, authenticated;
GRANT INSERT, DELETE ON public.comment_reactions TO authenticated;
GRANT ALL ON public.comment_reactions TO service_role;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comment_reactions_public_read" ON public.comment_reactions FOR SELECT USING (true);
CREATE POLICY "comment_reactions_insert_own" ON public.comment_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comment_reactions_delete_own" ON public.comment_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================
-- REPORTS (moderation queue)
-- =========================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('comment','mod','profile')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select_own_or_owner" ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.is_owner_user(auth.uid()));
CREATE POLICY "reports_update_owner" ON public.reports FOR UPDATE TO authenticated
  USING (public.is_owner_user(auth.uid())) WITH CHECK (public.is_owner_user(auth.uid()));

-- =========================
-- MOD SUBSCRIBERS (broadcast)
-- =========================
CREATE TABLE public.mod_subscribers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mod_subscribers TO authenticated;
GRANT INSERT, DELETE ON public.mod_subscribers TO authenticated;
GRANT ALL ON public.mod_subscribers TO service_role;
ALTER TABLE public.mod_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_select_self_or_owner" ON public.mod_subscribers FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_owner_user(auth.uid()));
CREATE POLICY "subs_insert_own" ON public.mod_subscribers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subs_delete_own_or_owner" ON public.mod_subscribers FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_owner_user(auth.uid()));

-- =========================
-- USER PREFERENCES (For You rail)
-- =========================
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  favorite_elements TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_preferences TO authenticated;
GRANT INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs_select_own" ON public.user_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "prefs_insert_own" ON public.user_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prefs_update_own" ON public.user_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- AWARD XP RPC
-- =========================
CREATE OR REPLACE FUNCTION public.award_xp(_amount INTEGER)
RETURNS TABLE (xp INTEGER, level INTEGER, leveled_up BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _old_level INTEGER;
  _new_xp INTEGER;
  _new_level INTEGER;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_xp (user_id, xp, level)
  VALUES (_uid, 0, 1)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT user_xp.level INTO _old_level FROM public.user_xp WHERE user_id = _uid;

  UPDATE public.user_xp
     SET xp = user_xp.xp + GREATEST(_amount, 0),
         updated_at = now()
   WHERE user_id = _uid
   RETURNING user_xp.xp INTO _new_xp;

  _new_level := GREATEST(1, FLOOR(SQRT(_new_xp::numeric / 50.0))::INTEGER + 1);

  UPDATE public.user_xp SET level = _new_level WHERE user_id = _uid;

  RETURN QUERY SELECT _new_xp, _new_level, (_new_level > COALESCE(_old_level,1));
END;
$$;
GRANT EXECUTE ON FUNCTION public.award_xp(INTEGER) TO authenticated;

-- =========================
-- DAILY STREAK CHECK-IN RPC
-- =========================
CREATE OR REPLACE FUNCTION public.touch_streak()
RETURNS TABLE (current_streak INTEGER, longest_streak INTEGER, incremented BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _last DATE;
  _cur INTEGER;
  _long INTEGER;
  _inc BOOLEAN := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_login_date)
  VALUES (_uid, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT us.last_login_date, us.current_streak, us.longest_streak
    INTO _last, _cur, _long
  FROM public.user_streaks us WHERE us.user_id = _uid;

  IF _last IS NULL OR _last < _today - INTERVAL '1 day' THEN
    _cur := 1;
    _inc := true;
  ELSIF _last = _today - INTERVAL '1 day' THEN
    _cur := _cur + 1;
    _inc := true;
  END IF;
  -- else same day: no change

  IF _cur > _long THEN _long := _cur; END IF;

  UPDATE public.user_streaks
     SET current_streak = _cur,
         longest_streak = _long,
         last_login_date = _today,
         updated_at = now()
   WHERE user_id = _uid;

  RETURN QUERY SELECT _cur, _long, _inc;
END;
$$;
GRANT EXECUTE ON FUNCTION public.touch_streak() TO authenticated;

-- =========================
-- GRANT ACHIEVEMENT RPC
-- =========================
CREATE OR REPLACE FUNCTION public.grant_achievement(_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _reward INTEGER;
  _exists BOOLEAN;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_achievements WHERE user_id = _uid AND achievement_key = _key) INTO _exists;
  IF _exists THEN RETURN false; END IF;

  SELECT xp_reward INTO _reward FROM public.achievements WHERE key = _key;
  IF _reward IS NULL THEN RETURN false; END IF;

  INSERT INTO public.user_achievements (user_id, achievement_key) VALUES (_uid, _key);
  PERFORM public.award_xp(_reward);
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.grant_achievement(TEXT) TO authenticated;
