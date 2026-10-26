-- Device information only. Existing key cleanup, key bindings and bans are untouched.
CREATE OR REPLACE FUNCTION public.cleanup_stale_device_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE removed integer;
BEGIN
  DELETE FROM public.activated_users AS device
  WHERE NOT EXISTS (
    SELECT 1 FROM public.valid_keys AS license
    WHERE license.data->>'device' = device.id
      AND COALESCE(license.data->>'status', 'active') = 'active'
      AND CASE
        WHEN COALESCE(license.data->>'expiry', '0') ~ '^[0-9]{1,20}$'
        THEN (COALESCE(license.data->>'expiry', '0'))::numeric = 0
          OR (license.data->>'expiry')::numeric > EXTRACT(EPOCH FROM now())
        -- Preserve uncertain expiry values for inspection rather than erasing information.
        ELSE true
      END
  );
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cleanup_stale_device_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_device_records() TO service_role;

SELECT cron.schedule(
  'cleanup_stale_device_records',
  '* * * * *',
  'SELECT public.cleanup_stale_device_records();'
);
