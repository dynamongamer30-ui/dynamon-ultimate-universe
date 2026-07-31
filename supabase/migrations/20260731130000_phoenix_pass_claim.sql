-- ── Phoenix Pass: add claim step (claim within 24h of win; 30-day spend window from claim) ──

alter table public.phoenix_passes
  add column if not exists claimed boolean not null default false,
  add column if not exists claimed_at timestamptz,
  add column if not exists claim_deadline timestamptz;

-- Existing unclaimed passes: give them a 24h claim window from when they were created.
update public.phoenix_passes
   set claim_deadline = created_at + interval '24 hours'
 where claim_deadline is null;

-- Winner-only read of the caller's still-claimable pass (won, unclaimed, deadline not passed).
create or replace function public.my_unclaimed_phoenix_pass()
returns table(id uuid, claim_deadline timestamptz)
language sql security definer set search_path to 'public'
as $$
  select id, claim_deadline from phoenix_passes
  where user_id = auth.uid()
    and claimed = false
    and used = false
    and claim_deadline > now()
  order by created_at desc
  limit 1;
$$;

-- Claim: within the 24h deadline, activate the pass and start the 30-day spend window now.
create or replace function public.claim_phoenix_pass(p_id uuid)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_rows int;
  v_expires timestamptz;
begin
  update phoenix_passes
     set claimed = true,
         claimed_at = now(),
         expires_at = now() + interval '30 days'
   where id = p_id
     and user_id = auth.uid()
     and claimed = false
     and used = false
     and claim_deadline > now()
  returning expires_at into v_expires;
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  end if;

  return jsonb_build_object('ok', true, 'expires_at', v_expires);
end;
$$;

-- Only CLAIMED passes are spendable now.
create or replace function public.my_active_phoenix_pass()
returns table(id uuid, expires_at timestamptz)
language sql security definer set search_path to 'public'
as $$
  select id, expires_at from phoenix_passes
  where user_id = auth.uid()
    and claimed = true
    and used = false
    and expires_at > now()
  order by created_at desc
  limit 1;
$$;

-- Redemption also requires a claimed pass.
create or replace function public.redeem_phoenix_pass(p_pass_id uuid, p_slug text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_link text;
  v_burned int;
begin
  if p_slug is null or length(p_slug) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_slug');
  end if;

  select mega_enc into v_link from mod_overrides where slug = p_slug;
  if v_link is null or v_link = '' then
    return jsonb_build_object('ok', false, 'error', 'no_link');
  end if;

  update phoenix_passes
     set used = true, used_at = now(), used_slug = p_slug
   where id = p_pass_id
     and user_id = auth.uid()
     and claimed = true
     and used = false
     and expires_at > now();
  get diagnostics v_burned = row_count;
  if v_burned = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_used_pass');
  end if;

  update mod_overrides set real_downloads = real_downloads + 1 where slug = p_slug;

  return jsonb_build_object('ok', true, 'link', v_link, 'encrypted', true);
end;
$$;

-- Draw: passes are now won-but-unclaimed, with a 24h claim deadline.
create or replace function public.run_phoenix_pass_giveaway()
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare
  r record;
  new_pass_id uuid;
  winner_names text[] := '{}';
  winner_name text;
begin
  for r in
    select p.id, coalesce(p.display_name, 'A trainer') as name
    from profiles p
    where p.is_owner = false
      and p.id not in (select user_id from vip_giveaway_winners where awarded_at > now() - interval '1 day')
      and p.id not in (select user_id from phoenix_pass_winners where awarded_at > now() - interval '1 day')
    order by random()
    limit 3
  loop
    insert into phoenix_passes (user_id, expires_at, claim_deadline, claimed)
    values (r.id, now() + interval '24 hours', now() + interval '24 hours', false)
    returning id into new_pass_id;

    insert into phoenix_pass_winners (user_id, pass_id) values (r.id, new_pass_id);

    insert into notifications (title, body, target_user_id) values (
      'You won a Phoenix Pass!',
      'Nice one, you were picked today. Claim your pass within 24 hours on the Rewards page. Once claimed, it is yours to spend on any one mod download for the next 30 days.',
      r.id
    );

    winner_names := array_append(winner_names, r.name);
  end loop;

  if array_length(winner_names, 1) > 0 then
    winner_name := array_to_string(winner_names, ', ');
    insert into notifications (title, body, target_user_id) values (
      'Today''s Phoenix Pass winners',
      'Today''s Phoenix Pass winners: ' || winner_name || '. Did not win this time? You are entered again automatically tomorrow.',
      null
    );
  end if;
end;
$$;

grant execute on function public.my_unclaimed_phoenix_pass() to authenticated;
grant execute on function public.claim_phoenix_pass(uuid) to authenticated;
