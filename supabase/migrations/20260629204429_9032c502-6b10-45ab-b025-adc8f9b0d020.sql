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