-- Prevent authenticated users from probing whether arbitrary UUIDs belong
-- to the demo owner. The RPC remains usable for the caller's own account,
-- by the verified owner, and by trusted service-role backend callers.
CREATE OR REPLACE FUNCTION public.website_is_demo_owner(
  p_user uuid,
  p_telegram bigint DEFAULT NULL::bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE u.id = p_user
      AND lower(u.email) = 'yugvadecha30@gmail.com'
      AND p.is_owner IS TRUE
      AND (p_telegram IS NULL OR p_telegram = 1970192536)
      AND (
        auth.role() = 'service_role'
        OR p_user = auth.uid()
        OR public.dg_is_owner()
      )
  );
$function$;
