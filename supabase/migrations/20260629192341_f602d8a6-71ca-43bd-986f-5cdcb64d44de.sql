
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
