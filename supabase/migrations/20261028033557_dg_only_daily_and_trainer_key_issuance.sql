-- DG-only issuance. Historical reward_kind values remain for compatibility.
CREATE OR REPLACE FUNCTION public.claim_trainer_level()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _uid uuid := auth.uid();
  _cur int;
  _streak int;
  _next record;
  _key text;
  _duration_hours int;
  _now_sec bigint := extract(epoch from now())::bigint;
  _title text;
  _body text;
begin
  if _uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  insert into public.user_trainer_progress (user_id)
  values (_uid)
  on conflict (user_id) do nothing;

  select p.current_level into _cur from public.user_trainer_progress p where p.user_id = _uid for update;
  select coalesce(s.current_streak, 0) into _streak from public.user_streaks s where s.user_id = _uid;

  select tl.* into _next from public.trainer_levels tl where tl.level = _cur + 1;
  if _next is null then
    return jsonb_build_object('ok', false, 'error', 'no_next_level');
  end if;
  if _streak < _next.days_required then
    return jsonb_build_object('ok', false, 'error', 'not_enough_days', 'days_required', _next.days_required, 'days_elapsed', _streak);
  end if;

  if _next.reward_kind = 'trainer_dg_key' or _next.reward_kind = 'trainer_vip_key' then
    select case when (v.data #>> '{}') ~ '^\d+$' and (v.data #>> '{}')::int > 0
                then (v.data #>> '{}')::int else 24 end
      into _duration_hours
      from app_config v where v.id = 'KeyDurationHours'
      limit 1;
    _duration_hours := coalesce(_duration_hours, 24);

    _key := 'DG-'
      || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

    insert into public.valid_keys (id, data, updated_at) values (
      _key,
      jsonb_build_object(
        'status', 'active', 'device', null, 'fingerprint', '', 'sourceIP', '',
        'activated', false, 'date', _now_sec, 'expiry', _now_sec + _duration_hours * 3600,
        'durationHours', _duration_hours, 'source', 'trainer_reward'
      ),
      now()
    );

    _title := case when _next.reward_kind = 'trainer_vip_key'
      then 'Trainer Rank ' || _next.level || ': DG Key unlocked!'
      else 'Trainer Rank ' || _next.level || ': DG Key unlocked!' end;
    _body := 'You reached Trainer Level ' || _next.level || '. Your key: ' || _key;

    insert into public.notifications (title, body, target_user_id, reward_kind, reward_ref)
    values (_title, _body, _uid, _next.reward_kind, _key);

  elsif _next.reward_kind = 'phoenix_pass' then
    insert into public.phoenix_passes (user_id, claimed, expires_at, claim_deadline)
    values (_uid, true, now() + interval '30 days', now());

    _title := 'Trainer Rank ' || _next.level || ': Phoenix Pass unlocked!';
    _body := 'You reached Trainer Level ' || _next.level || '. Your Phoenix Pass is ready to use on any mod.';

    insert into public.notifications (title, body, target_user_id, reward_kind, reward_ref)
    values (_title, _body, _uid, 'phoenix_pass', null);
  end if;

  update public.user_trainer_progress
     set current_level = _next.level,
         level_started_at = now(),
         updated_at = now()
   where user_id = _uid;

  return jsonb_build_object('ok', true, 'level', _next.level, 'reward_kind', _next.reward_kind, 'key', _key);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.run_vip_daily_giveaway()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE r record; new_key text; now_sec bigint := extract(epoch from now())::bigint; BEGIN DELETE FROM notifications WHERE reward_kind = 'vip_key' OR title = 'Today''s VIP winners'; FOR r IN SELECT p.id FROM profiles p WHERE p.is_owner = false AND p.id NOT IN (SELECT user_id FROM vip_giveaway_winners WHERE awarded_at > now() - interval '1 day') AND p.id NOT IN (SELECT user_id FROM phoenix_pass_winners WHERE awarded_at > now() - interval '1 day') ORDER BY random() LIMIT 3 LOOP new_key := 'DG-' || upper(substr(md5(random()::text || r.id::text), 1, 6)); INSERT INTO valid_keys (id, data) VALUES (new_key, jsonb_build_object('status', 'active', 'expiry', now_sec + 86400, 'durationHours', 24, 'activated', false, 'device', null, 'date', now_sec, 'fingerprint', '', 'sourceIP', '', 'source', 'admin')); INSERT INTO vip_giveaway_winners (user_id, key) VALUES (r.id, new_key); INSERT INTO notifications (title, body, target_user_id, reward_kind, reward_ref) VALUES ('You won a DG key!', 'Nice one, you were picked today. Your key: ' || new_key || '. It works for 24 hours, so use it soon.', r.id, 'vip_key', new_key); END LOOP; PERFORM public.upsert_daily_giveaway_broadcast(); END; $function$
;

