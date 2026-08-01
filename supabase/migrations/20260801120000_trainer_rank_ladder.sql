-- Trainer Rank ladder: 10 levels, gated by consecutive login-streak days
-- (reuses public.user_streaks.current_streak — no new day-tracking needed),
-- each level rewards either a DG key, a Phoenix Pass (already-claimed, 30
-- days), or — only at level 10 — a VIP key. VIP keys are otherwise
-- admin-panel-only, so finishing the ladder is the sole alternate path.

create table if not exists public.trainer_levels (
  level         int primary key,
  days_required int not null,
  reward_kind   text not null check (reward_kind in ('trainer_dg_key', 'phoenix_pass', 'trainer_vip_key', 'none')),
  reward_qty    int not null default 1
);

insert into public.trainer_levels (level, days_required, reward_kind, reward_qty) values
  (1, 1,  'trainer_dg_key', 1),
  (2, 2,  'trainer_dg_key', 1),
  (3, 3,  'trainer_dg_key', 1),
  (4, 4,  'trainer_dg_key', 1),
  (5, 5,  'phoenix_pass',1),
  (6, 6,  'trainer_dg_key', 1),
  (7, 7,  'trainer_dg_key', 1),
  (8, 8,  'trainer_dg_key', 1),
  (9, 9,  'phoenix_pass',1),
  (10,10, 'trainer_vip_key',1)
on conflict (level) do update set
  days_required = excluded.days_required,
  reward_kind   = excluded.reward_kind,
  reward_qty    = excluded.reward_qty;

grant select on public.trainer_levels to anon, authenticated;

create table if not exists public.user_trainer_progress (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  current_level   int not null default 0,   -- highest level CLAIMED so far
  level_started_at timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.user_trainer_progress enable row level security;
grant select on public.user_trainer_progress to authenticated;
grant all on public.user_trainer_progress to service_role;

create policy "trainer_progress_read_own" on public.user_trainer_progress
  for select to authenticated using (user_id = auth.uid());

-- Returns the caller's current level, the next level's config, days
-- elapsed toward it (from user_streaks.current_streak), and whether it's
-- claimable right now.
create or replace function public.my_trainer_progress()
returns table (
  current_level    int,
  next_level       int,
  days_required    int,
  days_elapsed     int,
  reward_kind      text,
  reward_qty       int,
  claimable        boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _cur int;
  _streak int;
begin
  if _uid is null then return; end if;

  insert into public.user_trainer_progress (user_id)
  values (_uid)
  on conflict (user_id) do nothing;

  select p.current_level into _cur from public.user_trainer_progress p where p.user_id = _uid;
  select coalesce(s.current_streak, 0) into _streak from public.user_streaks s where s.user_id = _uid;

  return query
    select
      _cur,
      tl.level,
      tl.days_required,
      _streak,
      tl.reward_kind,
      tl.reward_qty,
      (_streak >= tl.days_required)
    from public.trainer_levels tl
    where tl.level = _cur + 1;
end;
$$;

grant execute on function public.my_trainer_progress() to authenticated;

-- Claims the caller's next trainer level. Re-validates everything
-- server-side (never trust the client's idea of "claimable"). Mints real
-- DG/VIP keys the same way the Generator Worker does, or an already-
-- claimed 30-day Phoenix Pass, and fires a notification either way.
create or replace function public.claim_trainer_level()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

    _key := (case when _next.reward_kind = 'trainer_vip_key' then 'VIP-' else 'DG-' end)
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
      then 'Trainer Rank ' || _next.level || ': VIP Key unlocked!'
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
$$;

grant execute on function public.claim_trainer_level() to authenticated;
