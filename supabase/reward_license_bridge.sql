-- Server-only fallback after successful APK signature verification.
-- Existing V2 licenses are never recreated, extended, rebound or unrevoked.
CREATE OR REPLACE FUNCTION public.rv2_claim_existing_key(
  p_key text, p_key_hmac text, p_thumbprint text, p_public_key_spki text
) RETURNS TABLE(license_id uuid, lease_version integer, license_expiry timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE
  v_data jsonb;
  v_hours integer;
  v_expiry bigint;
BEGIN
  IF p_key IS NULL OR p_key !~ '^(DG|VIP|DGVIP)-[A-Z0-9]{6,16}$'
    OR p_key_hmac IS NULL OR p_key_hmac !~ '^[0-9a-f]{64}$'
    OR p_thumbprint IS NULL OR p_thumbprint !~ '^[0-9a-f]{64}$'
    OR p_public_key_spki IS NULL OR length(p_public_key_spki) NOT BETWEEN 80 AND 4096 THEN
    RETURN;
  END IF;
  SELECT k.data INTO v_data FROM public.valid_keys k WHERE k.id=p_key FOR UPDATE;
  IF NOT FOUND OR v_data->>'status' IS DISTINCT FROM 'active' THEN RETURN; END IF;
  -- Do not transfer a device already enrolled through the older protocol.
  IF EXISTS(SELECT 1 FROM rv_v2.licenses l WHERE l.key_hmac=p_key_hmac) THEN RETURN; END IF;
  IF coalesce(v_data->>'device','') NOT IN ('','null') THEN RETURN; END IF;
  IF coalesce(v_data->>'durationHours','') !~ '^[0-9]{1,5}$'
     OR coalesce(v_data->>'expiry','') !~ '^[0-9]{1,12}$' THEN RETURN; END IF;
  v_hours := (v_data->>'durationHours')::integer;
  v_expiry := (v_data->>'expiry')::bigint;
  IF v_hours>87600 OR (v_expiry>0 AND v_expiry<=extract(epoch FROM now()))
    OR (v_hours=0 AND v_expiry<>0) THEN RETURN; END IF;
  IF EXISTS(SELECT 1 FROM rv_v2.device_bans b WHERE b.device_thumbprint=p_thumbprint AND b.unbanned_at IS NULL) THEN RETURN; END IF;
  INSERT INTO rv_v2.licenses(key_hmac,status,duration_seconds,expires_at,source)
  VALUES(p_key_hmac,'active',CASE WHEN v_hours=0 THEN NULL ELSE v_hours*3600 END,
    CASE WHEN v_expiry=0 THEN NULL ELSE to_timestamp(v_expiry) END,'legacy')
  ON CONFLICT(key_hmac) DO NOTHING;
  RETURN QUERY SELECT * FROM public.rv2_claim_device(p_key_hmac,p_thumbprint,p_public_key_spki);
END;
$function$;
REVOKE ALL ON FUNCTION public.rv2_claim_existing_key(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rv2_claim_existing_key(text,text,text,text) TO service_role;
