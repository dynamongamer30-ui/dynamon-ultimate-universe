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
