-- Server-only atomic owner actions. Existing public generator/claim functions are unchanged.
CREATE OR REPLACE FUNCTION public.rv2_admin_key_action(
  p_action text, p_key text, p_key_hmac text, p_hours integer,
  p_expected jsonb, p_actor uuid, p_request_id uuid
) RETURNS TABLE(key_id text, license_id uuid)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE
  v_data jsonb;
  v_license rv_v2.licenses%ROWTYPE;
  v_now bigint := floor(extract(epoch from now()))::bigint;
  v_expiry bigint;
  v_hours integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=p_actor AND p.is_owner) THEN
    RAISE EXCEPTION 'Owner access required' USING ERRCODE='42501';
  END IF;
  IF p_key IS NULL OR p_key !~ '^(DG|VIP|DGVIP)-[A-Z0-9]{6,16}$'
     OR p_key_hmac IS NULL OR p_key_hmac !~ '^[0-9a-f]{64}$'
     OR p_action NOT IN ('create','repair','revoke','unrevoke','extend','delete') THEN
    RAISE EXCEPTION 'Invalid key action' USING ERRCODE='22023';
  END IF;
  IF p_action IN ('create','extend') AND
    (p_hours IS NULL OR p_hours<0 OR p_hours>87600 OR (p_action='extend' AND p_hours=0)) THEN
    RAISE EXCEPTION 'Invalid key duration' USING ERRCODE='22023';
  END IF;
  IF p_action='create' THEN
    IF p_key !~ '^(DG|VIP)-[A-Z0-9]{6}$' OR p_request_id IS NULL THEN
      RAISE EXCEPTION 'Invalid key creation' USING ERRCODE='22023';
    END IF;
    v_data := jsonb_build_object('status','active','expiry',0,'durationHours',p_hours,
      'activated',false,'device',NULL,'date',v_now,'fingerprint','','sourceIP','',
      'source','admin','requestId',p_request_id::text);
    INSERT INTO public.valid_keys(id,data) VALUES(p_key,v_data) ON CONFLICT(id) DO NOTHING;
    SELECT k.data INTO v_data FROM public.valid_keys k WHERE k.id=p_key FOR UPDATE;
    IF v_data->>'requestId' IS DISTINCT FROM p_request_id::text THEN
      RAISE EXCEPTION 'Key collision' USING ERRCODE='23505';
    END IF;
  ELSE
    SELECT k.data INTO v_data FROM public.valid_keys k WHERE k.id=p_key FOR UPDATE;
    IF NOT FOUND OR p_expected IS NULL OR v_data IS DISTINCT FROM p_expected THEN
      RAISE EXCEPTION 'Key changed. Refresh before trying again.' USING ERRCODE='40001';
    END IF;
  END IF;

  SELECT * INTO v_license FROM rv_v2.licenses l WHERE l.key_hmac=p_key_hmac FOR UPDATE;
  IF NOT FOUND THEN
    IF p_action='delete' THEN
      DELETE FROM public.valid_keys k WHERE k.id=p_key;
      RETURN QUERY SELECT p_key, NULL::uuid;
      RETURN;
    END IF;
    v_hours := COALESCE((v_data->>'durationHours')::integer,24);
    v_expiry := COALESCE((v_data->>'expiry')::bigint,0);
    IF v_hours<0 OR v_hours>87600 OR v_expiry<0 OR (v_expiry>0 AND v_expiry<=v_now AND p_action<>'extend') THEN
      RAISE EXCEPTION 'Expired or invalid key cannot be registered' USING ERRCODE='22023';
    END IF;
    INSERT INTO rv_v2.licenses(key_hmac,status,duration_seconds,expires_at,source)
    VALUES(p_key_hmac,CASE WHEN v_data->>'status'='revoked' THEN 'revoked' ELSE 'active' END,
      CASE WHEN v_hours=0 THEN NULL ELSE v_hours*3600 END,
      CASE WHEN v_expiry=0 THEN NULL ELSE to_timestamp(v_expiry) END,'legacy')
    RETURNING * INTO v_license;
  END IF;

  IF p_action IN ('revoke','unrevoke','delete') THEN
    UPDATE rv_v2.licenses l SET status=CASE WHEN p_action='unrevoke' THEN 'active' ELSE 'revoked' END,
      session_version=l.session_version+1, updated_at=now() WHERE l.id=v_license.id;
    IF p_action='delete' THEN
      -- Preserve cryptographic enrollment and audit history; invalidate its access.
      DELETE FROM public.valid_keys k WHERE k.id=p_key;
    ELSE
      UPDATE public.valid_keys k SET data=v_data||jsonb_build_object('status',CASE WHEN p_action='unrevoke' THEN 'active' ELSE 'revoked' END) WHERE k.id=p_key;
    END IF;
  ELSIF p_action='extend' THEN
    IF v_license.duration_seconds IS NULL AND v_license.expires_at IS NULL THEN
      RAISE EXCEPTION 'Lifetime keys do not need extending' USING ERRCODE='22023';
    END IF;
    v_hours := COALESCE((v_data->>'durationHours')::integer,24)+p_hours;
    IF v_hours>87600 THEN RAISE EXCEPTION 'Duration exceeds limit' USING ERRCODE='22023'; END IF;
    v_expiry := COALESCE((v_data->>'expiry')::bigint,0);
    IF v_license.expires_at IS NOT NULL THEN
      v_expiry := greatest(v_now,v_expiry,floor(extract(epoch from v_license.expires_at))::bigint)+p_hours*3600;
    ELSIF v_expiry>0 THEN
      v_expiry := greatest(v_now,v_expiry)+p_hours*3600;
    END IF;
    UPDATE rv_v2.licenses l SET duration_seconds=v_hours*3600,
      expires_at=CASE WHEN v_expiry=0 THEN NULL ELSE to_timestamp(v_expiry) END,
      session_version=l.session_version+1,updated_at=now() WHERE l.id=v_license.id;
    UPDATE public.valid_keys k SET data=v_data||jsonb_build_object('durationHours',v_hours,'expiry',v_expiry) WHERE k.id=p_key;
  END IF;
  INSERT INTO rv_v2.admin_audit(actor_id,action,license_id,detail)
    VALUES(p_actor::text,'owner_key_'||p_action,v_license.id,jsonb_build_object('request_id',p_request_id));
  RETURN QUERY SELECT p_key,v_license.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.rv2_admin_key_action(text,text,text,integer,jsonb,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rv2_admin_key_action(text,text,text,integer,jsonb,uuid,uuid) TO service_role;
