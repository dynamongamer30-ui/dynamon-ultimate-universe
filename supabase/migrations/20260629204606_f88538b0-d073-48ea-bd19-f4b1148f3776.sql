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