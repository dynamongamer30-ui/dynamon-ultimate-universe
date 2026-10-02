-- Broadcast announcements burn per user after they are read. Personal
-- reward, claim, moderation, and security notifications remain persistent.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS burn_after_read boolean NOT NULL DEFAULT false;

UPDATE public.notifications
   SET burn_after_read = true
 WHERE target_user_id IS NULL
   AND (title ILIKE '%winners%' OR title ILIKE '%giveaway%');

CREATE OR REPLACE FUNCTION public.upsert_daily_giveaway_broadcast()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pass_names text;
  key_names text;
  message text;
  existing_id uuid;
BEGIN
  SELECT string_agg(coalesce(p.display_name, 'A trainer'), ', ' ORDER BY w.awarded_at)
    INTO pass_names
    FROM public.phoenix_pass_winners w
    JOIN public.profiles p ON p.id = w.user_id
   WHERE w.awarded_at > now() - interval '1 day';

  SELECT string_agg(coalesce(p.display_name, 'A trainer'), ', ' ORDER BY w.awarded_at)
    INTO key_names
    FROM public.vip_giveaway_winners w
    JOIN public.profiles p ON p.id = w.user_id
   WHERE w.awarded_at > now() - interval '1 day';

  IF pass_names IS NULL AND key_names IS NULL THEN
    RETURN;
  END IF;

  message := 'Phoenix Pass winners: ' || coalesce(pass_names, 'none')
    || '. Daily Key winners: ' || coalesce(key_names, 'none')
    || '. You are entered automatically again tomorrow.';

  SELECT id INTO existing_id
    FROM public.notifications
   WHERE target_user_id IS NULL
     AND title = 'Today''s giveaway winners'
     AND created_at > now() - interval '1 day'
   ORDER BY created_at DESC
   LIMIT 1;

  IF existing_id IS NULL THEN
    INSERT INTO public.notifications (title, body, target_user_id, burn_after_read)
    VALUES ('Today''s giveaway winners', message, NULL, true);
  ELSE
    UPDATE public.notifications
       SET body = message, burn_after_read = true
     WHERE id = existing_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_daily_giveaway_broadcast() FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.run_phoenix_pass_giveaway()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  new_pass_id uuid;
BEGIN
  DELETE FROM notifications WHERE reward_kind = 'phoenix_pass' OR title = 'Today''s Phoenix Pass winners';

  FOR r IN
    SELECT p.id
      FROM profiles p
     WHERE p.is_owner = false
       AND p.id NOT IN (SELECT user_id FROM vip_giveaway_winners WHERE awarded_at > now() - interval '1 day')
       AND p.id NOT IN (SELECT user_id FROM phoenix_pass_winners WHERE awarded_at > now() - interval '1 day')
     ORDER BY random()
     LIMIT 3
  LOOP
    INSERT INTO phoenix_passes (user_id, expires_at, claim_deadline)
    VALUES (r.id, now() + interval '24 hours', now() + interval '24 hours')
    RETURNING id INTO new_pass_id;

    INSERT INTO phoenix_pass_winners (user_id, pass_id) VALUES (r.id, new_pass_id);
    INSERT INTO notifications (title, body, target_user_id, reward_kind, reward_ref)
    VALUES ('You won a Phoenix Pass!', 'Nice one, you were picked today. You can skip the wait on any one mod download for the next 24 hours.', r.id, 'phoenix_pass', new_pass_id::text);
  END LOOP;

  PERFORM public.upsert_daily_giveaway_broadcast();
END;
$$;

CREATE OR REPLACE FUNCTION public.run_vip_daily_giveaway()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  new_key text;
  now_sec bigint := extract(epoch from now())::bigint;
BEGIN
  DELETE FROM notifications WHERE reward_kind = 'vip_key' OR title = 'Today''s VIP winners';

  FOR r IN
    SELECT p.id
      FROM profiles p
     WHERE p.is_owner = false
       AND p.id NOT IN (SELECT user_id FROM vip_giveaway_winners WHERE awarded_at > now() - interval '1 day')
       AND p.id NOT IN (SELECT user_id FROM phoenix_pass_winners WHERE awarded_at > now() - interval '1 day')
     ORDER BY random()
     LIMIT 3
  LOOP
    new_key := 'VIP-' || upper(substr(md5(random()::text || r.id::text), 1, 6));
    INSERT INTO valid_keys (id, data)
    VALUES (new_key, jsonb_build_object('status', 'active', 'expiry', now_sec + 86400, 'durationHours', 24, 'activated', false, 'device', null, 'date', now_sec, 'fingerprint', '', 'sourceIP', '', 'source', 'admin'));
    INSERT INTO vip_giveaway_winners (user_id, key) VALUES (r.id, new_key);
    INSERT INTO notifications (title, body, target_user_id, reward_kind, reward_ref)
    VALUES ('You won a VIP key!', 'Nice one, you were picked today. Your key: ' || new_key || '. It works for 24 hours, so use it soon.', r.id, 'vip_key', new_key);
  END LOOP;

  PERFORM public.upsert_daily_giveaway_broadcast();
END;
$$;
