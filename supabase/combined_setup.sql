-- ===== 20260629172154_23da8e83-173c-4d0e-8b8e-4dbf3d213437.sql =====

CREATE TYPE public.gender AS ENUM ('male','female','other');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 3 AND 24 AND username ~ '^[a-zA-Z0-9_]+$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  gender public.gender,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles ((lower(username)));
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mod_slug text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  rating int CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_mod_idx ON public.comments (mod_slug, created_at DESC);
GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_public_read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.comment_likes (
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT ON public.comment_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comment_likes_public_read" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "comment_likes_insert_own" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comment_likes_delete_own" ON public.comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.mod_likes (
  mod_slug text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mod_slug, user_id)
);
GRANT SELECT ON public.mod_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.mod_likes TO authenticated;
GRANT ALL ON public.mod_likes TO service_role;
ALTER TABLE public.mod_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mod_likes_public_read" ON public.mod_likes FOR SELECT USING (true);
CREATE POLICY "mod_likes_insert_own" ON public.mod_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mod_likes_delete_own" ON public.mod_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.username_available(_username text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(_username));
$$;
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ===== 20260629172423_cf3c7439-2682-41e0-ab7a-6259b5e06b1a.sql =====
DROP FUNCTION IF EXISTS public.username_available(text);
CREATE OR REPLACE FUNCTION public.username_available(_username text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(_username));
$$;
REVOKE ALL ON FUNCTION public.username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;

-- ===== 20260629192341_f602d8a6-71ca-43bd-986f-5cdcb64d44de.sql =====

-- Add owner flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;

-- Function: check if a user id is the owner (by auth.users email)
CREATE OR REPLACE FUNCTION public.is_owner_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id AND lower(email) = 'yugvadecha30@gmail.com'
  );
$$;

-- Trigger: auto-set is_owner on insert/update of profiles based on auth email
CREATE OR REPLACE FUNCTION public.set_profile_owner_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_owner := public.is_owner_user(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_owner_flag ON public.profiles;
CREATE TRIGGER trg_profiles_owner_flag
BEFORE INSERT OR UPDATE OF id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_owner_flag();

-- Backfill any existing owner row
UPDATE public.profiles SET is_owner = public.is_owner_user(id) WHERE is_owner = false;

-- Replace username_available to enforce reserved usernames (owner bypasses)
CREATE OR REPLACE FUNCTION public.username_available(_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm TEXT := lower(trim(_username));
  _is_owner BOOLEAN := false;
  _reserved TEXT[] := ARRAY[
    'dynamon','dynamons','dynamonuniverse','dynamon_universe',
    'owner','admin','administrator','root','support','staff','moderator','mod','official',
    'yugvadecha','yugvadecha30'
  ];
BEGIN
  -- Caller owner check
  IF auth.uid() IS NOT NULL THEN
    _is_owner := public.is_owner_user(auth.uid());
  END IF;

  -- Already taken
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = _norm) THEN
    RETURN false;
  END IF;

  -- Owner can claim anything that isn't already taken
  IF _is_owner THEN
    RETURN true;
  END IF;

  -- Block reserved exact matches
  IF _norm = ANY(_reserved) THEN
    RETURN false;
  END IF;

  -- Block any dynamongamer* variation (e.g. dynamongamer, dynamongamer01, dynamongamer_07)
  IF _norm ~ '^dynamon[_-]?gamer[0-9_]*$' THEN
    RETURN false;
  END IF;

  -- Block any dynamon* variation reserved for the brand
  IF _norm ~ '^dynamon[s]?[_-]?(world|universe|official|hq)[0-9_]*$' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Notification + email preferences
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_opt_in BOOLEAN NOT NULL DEFAULT false,
  push_opt_in BOOLEAN NOT NULL DEFAULT false,
  asked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_prefs_select_own" ON public.notification_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_prefs_insert_own" ON public.notification_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_prefs_update_own" ON public.notification_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_prefs_delete_own" ON public.notification_prefs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_notif_prefs_updated_at
BEFORE UPDATE ON public.notification_prefs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ===== 20260629193148_3dc48fdd-e6dd-45b6-98c0-2be453c770a8.sql =====

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


-- ===== 20260629200611_6c356a4a-3667-47e2-937c-f744b511ac32.sql =====

CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings owner write" ON public.site_settings FOR ALL TO authenticated
  USING (public.is_owner_user(auth.uid())) WITH CHECK (public.is_owner_user(auth.uid()));

CREATE TABLE public.mod_overrides (
  slug TEXT PRIMARY KEY,
  hidden BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  name TEXT,
  tagline TEXT,
  description TEXT,
  version TEXT,
  size TEXT,
  updated_date TEXT,
  youtube_id TEXT,
  features JSONB,
  changelog JSONB,
  downloads_boost INTEGER NOT NULL DEFAULT 0,
  likes_boost INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC,
  download_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mod_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mod_overrides TO authenticated;
GRANT ALL ON public.mod_overrides TO service_role;
ALTER TABLE public.mod_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mod_overrides public read" ON public.mod_overrides FOR SELECT USING (true);
CREATE POLICY "mod_overrides owner write" ON public.mod_overrides FOR ALL TO authenticated
  USING (public.is_owner_user(auth.uid())) WITH CHECK (public.is_owner_user(auth.uid()));

CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mod_overrides_updated BEFORE UPDATE ON public.mod_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ===== 20260629204358_39ebcf95-2e23-455d-aa40-64c83cef2745.sql =====
-- =========================================================================
-- 1. Roles system
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_self_read" ON public.user_roles;
CREATE POLICY "user_roles_self_read" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon, authenticated;

-- Seed owner from existing email (one-time bootstrap)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'owner'::public.app_role FROM auth.users
WHERE lower(email) = 'yugvadecha30@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Redirect is_owner_user to the roles table (with email fallback for bootstrap)
CREATE OR REPLACE FUNCTION public.is_owner_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner')
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = _user_id AND lower(email) = 'yugvadecha30@gmail.com'
    );
$$;

-- =========================================================================
-- 2. Profiles: lock down public surface
-- =========================================================================
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;

-- Self can read full row; owner can read all
CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'owner'));

-- Public-safe view for username/display/avatar lookups
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, username, display_name, avatar_url, is_owner, created_at
  FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Revoke broad anon SELECT on the base table
REVOKE SELECT ON public.profiles FROM anon;

-- =========================================================================
-- 3. mod_subscribers: ensure no anon and add explicit owner read
-- =========================================================================
REVOKE SELECT ON public.mod_subscribers FROM anon;

DROP POLICY IF EXISTS "subs_select_self_or_owner" ON public.mod_subscribers;
CREATE POLICY "subs_select_self_or_owner" ON public.mod_subscribers
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));

-- =========================================================================
-- 4. Length / shape CHECK constraints
-- =========================================================================
DO $$ BEGIN
  ALTER TABLE public.comments
    ADD CONSTRAINT comments_body_length CHECK (char_length(body) BETWEEN 1 AND 2000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_username_shape
    CHECK (username IS NULL OR (char_length(username) BETWEEN 3 AND 24 AND username ~ '^[a-zA-Z0-9_]+$'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_display_name_length
    CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 40);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.mod_overrides
    ADD CONSTRAINT mod_overrides_slug_shape
    CHECK (char_length(slug) BETWEEN 1 AND 80 AND slug ~ '^[a-z0-9-]+$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- 5. moderation_log
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (char_length(action) BETWEEN 1 AND 60),
  target_type TEXT NOT NULL CHECK (char_length(target_type) BETWEEN 1 AND 40),
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.moderation_log TO authenticated;
GRANT ALL ON public.moderation_log TO service_role;

ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mod_log_owner_read" ON public.moderation_log;
CREATE POLICY "mod_log_owner_read" ON public.moderation_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "mod_log_owner_insert" ON public.moderation_log;
CREATE POLICY "mod_log_owner_insert" ON public.moderation_log
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = actor_id AND public.has_role(auth.uid(), 'owner')
  );

-- =========================================================================
-- 6. broadcasts table (replaces the reports.broadcast_intent hack)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mod_slug TEXT NOT NULL CHECK (char_length(mod_slug) BETWEEN 1 AND 80),
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 120),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "broadcasts_owner_read" ON public.broadcasts;
CREATE POLICY "broadcasts_owner_read" ON public.broadcasts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "broadcasts_owner_insert" ON public.broadcasts;
CREATE POLICY "broadcasts_owner_insert" ON public.broadcasts
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = author_id AND public.has_role(auth.uid(), 'owner')
  );

DROP POLICY IF EXISTS "broadcasts_owner_update" ON public.broadcasts;
CREATE POLICY "broadcasts_owner_update" ON public.broadcasts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));


-- ===== 20260629204429_9032c502-6b10-45ab-b025-adc8f9b0d020.sql =====
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Allow anon/authenticated to read the underlying columns the view exposes.
-- (RLS on profiles still applies — but we add a permissive public-read policy
-- scoped to the safe columns the view actually projects.)
DROP POLICY IF EXISTS "profiles_public_safe_read" ON public.profiles;
CREATE POLICY "profiles_public_safe_read" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

-- The view will be the only safe public surface; direct table SELECT for anon
-- is still revoked at the GRANT level, so anon can only reach safe columns
-- via the view.
GRANT SELECT (id, username, display_name, avatar_url, is_owner, created_at)
  ON public.profiles TO anon;

-- ===== 20260629204606_f88538b0-d073-48ea-bd19-f4b1148f3776.sql =====
REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (id, username, display_name, avatar_url, is_owner, created_at)
  ON public.profiles TO authenticated;

GRANT INSERT, UPDATE ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  gender TEXT,
  avatar_url TEXT,
  is_owner BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, username, display_name, gender, avatar_url, is_owner, created_at
  FROM public.profiles
  WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- ===== 20260629212133_872f6465-7103-4781-a5a2-170697152a33.sql =====

-- Access keys system
CREATE TABLE public.access_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  prefix text NOT NULL DEFAULT 'VIP',
  duration_seconds integer NOT NULL DEFAULT 604800,
  activated_at timestamptz,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  notes text,
  device_id text,
  uses integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_keys TO authenticated;
GRANT ALL ON public.access_keys TO service_role;
ALTER TABLE public.access_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages access_keys"
ON public.access_keys FOR ALL TO authenticated
USING (public.is_owner_user(auth.uid()))
WITH CHECK (public.is_owner_user(auth.uid()));

CREATE TABLE public.access_key_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  key_code text,
  actor uuid,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.access_key_logs TO authenticated;
GRANT ALL ON public.access_key_logs TO service_role;
ALTER TABLE public.access_key_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads logs" ON public.access_key_logs
FOR SELECT TO authenticated USING (public.is_owner_user(auth.uid()));
CREATE POLICY "Anyone authenticated can append logs" ON public.access_key_logs
FOR INSERT TO authenticated WITH CHECK (true);

-- User-side: track active unlocks per user
CREATE TABLE public.user_unlocks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  key_id uuid REFERENCES public.access_keys(id) ON DELETE SET NULL,
  unlocked_until timestamptz NOT NULL,
  device_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_unlocks TO authenticated;
GRANT ALL ON public.user_unlocks TO service_role;
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own unlock" ON public.user_unlocks
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_owner_user(auth.uid()));
CREATE POLICY "Users upsert own unlock" ON public.user_unlocks
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own unlock" ON public.user_unlocks
FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_access_keys_updated BEFORE UPDATE ON public.access_keys
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Redeem function: validate key, bind to device on first use, return expiry
CREATE OR REPLACE FUNCTION public.redeem_access_key(_code text, _device_id text)
RETURNS TABLE(status text, expires_at timestamptz, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _k public.access_keys%ROWTYPE;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN QUERY SELECT 'error'::text, NULL::timestamptz, 'Sign in required'::text; RETURN;
  END IF;

  SELECT * INTO _k FROM public.access_keys WHERE upper(code) = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.access_key_logs(action, key_code, actor, meta)
      VALUES ('redeem_fail', _code, _uid, jsonb_build_object('reason','not_found','device',_device_id));
    RETURN QUERY SELECT 'invalid'::text, NULL::timestamptz, 'Invalid key'::text; RETURN;
  END IF;

  IF _k.revoked THEN
    RETURN QUERY SELECT 'revoked'::text, NULL::timestamptz, 'Key revoked'::text; RETURN;
  END IF;

  -- First activation
  IF _k.activated_at IS NULL THEN
    UPDATE public.access_keys
       SET activated_at = now(),
           expires_at = now() + make_interval(secs => _k.duration_seconds),
           device_id = _device_id,
           uses = uses + 1
     WHERE id = _k.id
     RETURNING * INTO _k;
  ELSE
    -- Device lock
    IF _k.device_id IS NOT NULL AND _k.device_id <> _device_id THEN
      INSERT INTO public.access_key_logs(action, key_code, actor, meta)
        VALUES ('redeem_fail', _k.code, _uid, jsonb_build_object('reason','device_mismatch','device',_device_id));
      RETURN QUERY SELECT 'device'::text, NULL::timestamptz, 'Key bound to another device'::text; RETURN;
    END IF;
    IF _k.expires_at IS NOT NULL AND _k.expires_at < now() THEN
      RETURN QUERY SELECT 'expired'::text, _k.expires_at, 'Key expired'::text; RETURN;
    END IF;
    UPDATE public.access_keys SET uses = uses + 1 WHERE id = _k.id;
  END IF;

  INSERT INTO public.user_unlocks(user_id, key_id, unlocked_until, device_id)
    VALUES (_uid, _k.id, _k.expires_at, _device_id)
    ON CONFLICT (user_id) DO UPDATE
      SET key_id = EXCLUDED.key_id,
          unlocked_until = EXCLUDED.unlocked_until,
          device_id = EXCLUDED.device_id,
          updated_at = now();

  INSERT INTO public.access_key_logs(action, key_code, actor, meta)
    VALUES ('redeem_ok', _k.code, _uid, jsonb_build_object('device',_device_id,'expires',_k.expires_at));

  RETURN QUERY SELECT 'ok'::text, _k.expires_at, 'Unlocked'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_access_key(text, text) TO authenticated;

-- Owner-only: generate batch of keys
CREATE OR REPLACE FUNCTION public.generate_access_keys(_qty integer, _prefix text, _duration_seconds integer, _notes text)
RETURNS SETOF public.access_keys
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _i integer;
  _code text;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.is_owner_user(_uid) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _qty < 1 OR _qty > 100 THEN RAISE EXCEPTION 'qty out of range'; END IF;
  IF _duration_seconds < 60 THEN RAISE EXCEPTION 'duration too short'; END IF;

  FOR _i IN 1.._qty LOOP
    LOOP
      _code := upper(coalesce(nullif(_prefix,''),'VIP')) || '-' ||
               upper(substr(encode(gen_random_bytes(6),'hex'),1,4)) || '-' ||
               upper(substr(encode(gen_random_bytes(6),'hex'),1,4));
      EXIT WHEN NOT EXISTS(SELECT 1 FROM public.access_keys WHERE code = _code);
    END LOOP;
    RETURN QUERY
      INSERT INTO public.access_keys(code, prefix, duration_seconds, notes, created_by)
      VALUES (_code, coalesce(nullif(_prefix,''),'VIP'), _duration_seconds, _notes, _uid)
      RETURNING *;
  END LOOP;
  INSERT INTO public.access_key_logs(action, key_code, actor, meta)
    VALUES ('generate', NULL, _uid, jsonb_build_object('qty',_qty,'prefix',_prefix,'duration',_duration_seconds));
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_access_keys(integer,text,integer,text) TO authenticated;


-- ===== 20260630163535_de94c0ca-f85f-41e5-bfba-86ca0b56739f.sql =====
ALTER TABLE public.mod_overrides
  ADD COLUMN IF NOT EXISTS rating_count integer,
  ADD COLUMN IF NOT EXISTS downloads_absolute integer,
  ADD COLUMN IF NOT EXISTS likes_absolute integer;

