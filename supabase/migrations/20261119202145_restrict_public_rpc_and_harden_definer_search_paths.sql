-- Restrict public RPC access to the minimum required by the application.
-- Username availability is used after Google authentication in profile setup.
REVOKE ALL ON FUNCTION public.username_available(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.username_available(text) TO authenticated, service_role;

-- Campaign status is fetched by the website-campaign Edge Function with its
-- service-role credential, not through a browser-facing PostgREST RPC.
REVOKE ALL ON FUNCTION public.website_campaign_status(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.website_campaign_status(text) TO service_role;

-- Put pg_catalog first in all public SECURITY DEFINER functions' fixed paths.
-- No CREATE privilege is granted on public to anon/authenticated/PUBLIC.
DO $harden_search_path$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = pg_catalog, public, auth',
      f.signature
    );
  END LOOP;
END
$harden_search_path$;
