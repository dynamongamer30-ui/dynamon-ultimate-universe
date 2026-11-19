-- Prevent authenticated clients from self-assigning owner privileges.
-- Owner status changes are reserved for trusted service-role/database operations.
DROP TRIGGER IF EXISTS dg_mark_owner_on_profile ON public.profiles;
DROP TRIGGER IF EXISTS trg_profiles_owner_flag ON public.profiles;
DROP TRIGGER IF EXISTS trg_guard_owner_flag ON public.profiles;

CREATE OR REPLACE FUNCTION public.dg_guard_owner_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
BEGIN
  IF session_user IN ('postgres', 'supabase_admin')
     OR coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.is_owner, false) THEN
      RAISE EXCEPTION 'Owner status can only be assigned by a trusted administrator.'
        USING ERRCODE = '42501';
    END IF;
    NEW.is_owner := false;
    RETURN NEW;
  END IF;

  IF coalesce(NEW.is_owner, false) IS DISTINCT FROM coalesce(OLD.is_owner, false) THEN
    RAISE EXCEPTION 'Owner status can only be changed by a trusted administrator.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_guard_owner_flag
BEFORE INSERT OR UPDATE OF is_owner ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.dg_guard_owner_flag();

REVOKE EXECUTE ON FUNCTION public.dg_guard_owner_flag() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dg_mark_owner_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_profile_owner_flag() FROM PUBLIC, anon, authenticated;
