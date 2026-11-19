-- Prevent authenticated users from probing role/owner status for arbitrary user IDs.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
  SELECT
    (_user_id = auth.uid() OR public.dg_is_owner())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_owner_user(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
  SELECT
    (_uid = auth.uid() OR public.dg_is_owner())
    AND coalesce((SELECT p.is_owner FROM public.profiles p WHERE p.id = _uid), false);
$function$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_owner_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_owner_user(uuid) TO authenticated, service_role;
