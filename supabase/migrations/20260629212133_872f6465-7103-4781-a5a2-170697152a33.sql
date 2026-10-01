
-- Access keys system
CREATE TABLE public.access_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  prefix text NOT NULL DEFAULT 'VIP',
  duration_seconds integer NOT NULL DEFAULT 604800,
  activated_at timestamptz,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  notes text,
  device_id text,
  uses integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_keys TO authenticated;
GRANT ALL ON public.access_keys TO service_role;
ALTER TABLE public.access_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages access_keys"
ON public.access_keys FOR ALL TO authenticated
USING (public.is_owner_user(auth.uid()))
WITH CHECK (public.is_owner_user(auth.uid()));

CREATE TABLE public.access_key_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  key_code text,
  actor uuid,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.access_key_logs TO authenticated;
GRANT ALL ON public.access_key_logs TO service_role;
ALTER TABLE public.access_key_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads logs" ON public.access_key_logs
FOR SELECT TO authenticated USING (public.is_owner_user(auth.uid()));
CREATE POLICY "Anyone authenticated can append logs" ON public.access_key_logs
FOR INSERT TO authenticated WITH CHECK (true);

-- User-side: track active unlocks per user
CREATE TABLE public.user_unlocks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  key_id uuid REFERENCES public.access_keys(id) ON DELETE SET NULL,
  unlocked_until timestamptz NOT NULL,
  device_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_unlocks TO authenticated;
GRANT ALL ON public.user_unlocks TO service_role;
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own unlock" ON public.user_unlocks
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_owner_user(auth.uid()));
CREATE POLICY "Users upsert own unlock" ON public.user_unlocks
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own unlock" ON public.user_unlocks
FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_access_keys_updated BEFORE UPDATE ON public.access_keys
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Redeem function: validate key, bind to device on first use, return expiry
CREATE OR REPLACE FUNCTION public.redeem_access_key(_code text, _device_id text)
RETURNS TABLE(status text, expires_at timestamptz, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _k public.access_keys%ROWTYPE;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN QUERY SELECT 'error'::text, NULL::timestamptz, 'Sign in required'::text; RETURN;
  END IF;

  SELECT * INTO _k FROM public.access_keys WHERE upper(code) = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.access_key_logs(action, key_code, actor, meta)
      VALUES ('redeem_fail', _code, _uid, jsonb_build_object('reason','not_found','device',_device_id));
    RETURN QUERY SELECT 'invalid'::text, NULL::timestamptz, 'Invalid key'::text; RETURN;
  END IF;

  IF _k.revoked THEN
    RETURN QUERY SELECT 'revoked'::text, NULL::timestamptz, 'Key revoked'::text; RETURN;
  END IF;

  -- First activation
  IF _k.activated_at IS NULL THEN
    UPDATE public.access_keys
       SET activated_at = now(),
           expires_at = now() + make_interval(secs => _k.duration_seconds),
           device_id = _device_id,
           uses = uses + 1
     WHERE id = _k.id
     RETURNING * INTO _k;
  ELSE
    -- Device lock
    IF _k.device_id IS NOT NULL AND _k.device_id <> _device_id THEN
      INSERT INTO public.access_key_logs(action, key_code, actor, meta)
        VALUES ('redeem_fail', _k.code, _uid, jsonb_build_object('reason','device_mismatch','device',_device_id));
      RETURN QUERY SELECT 'device'::text, NULL::timestamptz, 'Key bound to another device'::text; RETURN;
    END IF;
    IF _k.expires_at IS NOT NULL AND _k.expires_at < now() THEN
      RETURN QUERY SELECT 'expired'::text, _k.expires_at, 'Key expired'::text; RETURN;
    END IF;
    UPDATE public.access_keys SET uses = uses + 1 WHERE id = _k.id;
  END IF;

  INSERT INTO public.user_unlocks(user_id, key_id, unlocked_until, device_id)
    VALUES (_uid, _k.id, _k.expires_at, _device_id)
    ON CONFLICT (user_id) DO UPDATE
      SET key_id = EXCLUDED.key_id,
          unlocked_until = EXCLUDED.unlocked_until,
          device_id = EXCLUDED.device_id,
          updated_at = now();

  INSERT INTO public.access_key_logs(action, key_code, actor, meta)
    VALUES ('redeem_ok', _k.code, _uid, jsonb_build_object('device',_device_id,'expires',_k.expires_at));

  RETURN QUERY SELECT 'ok'::text, _k.expires_at, 'Unlocked'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_access_key(text, text) TO authenticated;

-- Owner-only: generate batch of keys
CREATE OR REPLACE FUNCTION public.generate_access_keys(_qty integer, _prefix text, _duration_seconds integer, _notes text)
RETURNS SETOF public.access_keys
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _i integer;
  _code text;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.is_owner_user(_uid) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _qty < 1 OR _qty > 100 THEN RAISE EXCEPTION 'qty out of range'; END IF;
  IF _duration_seconds < 60 THEN RAISE EXCEPTION 'duration too short'; END IF;

  FOR _i IN 1.._qty LOOP
    LOOP
      _code := upper(coalesce(nullif(_prefix,''),'VIP')) || '-' ||
               upper(substr(encode(gen_random_bytes(6),'hex'),1,4)) || '-' ||
               upper(substr(encode(gen_random_bytes(6),'hex'),1,4));
      EXIT WHEN NOT EXISTS(SELECT 1 FROM public.access_keys WHERE code = _code);
    END LOOP;
    RETURN QUERY
      INSERT INTO public.access_keys(code, prefix, duration_seconds, notes, created_by)
      VALUES (_code, coalesce(nullif(_prefix,''),'VIP'), _duration_seconds, _notes, _uid)
      RETURNING *;
  END LOOP;
  INSERT INTO public.access_key_logs(action, key_code, actor, meta)
    VALUES ('generate', NULL, _uid, jsonb_build_object('qty',_qty,'prefix',_prefix,'duration',_duration_seconds));
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_access_keys(integer,text,integer,text) TO authenticated;
