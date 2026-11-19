-- Do not expose owner/role membership probes to unauthenticated callers.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_owner_user(uuid) FROM PUBLIC, anon;
