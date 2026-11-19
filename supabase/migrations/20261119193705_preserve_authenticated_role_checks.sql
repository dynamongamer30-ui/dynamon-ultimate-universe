-- Authenticated RLS policies still need role checks after removing PUBLIC execution.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_owner_user(uuid) TO authenticated, service_role;
