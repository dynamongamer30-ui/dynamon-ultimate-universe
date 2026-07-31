alter table public.vip_giveaway_winners
  add column if not exists claimed boolean not null default false,
  add column if not exists claimed_at timestamptz;

create or replace function public.my_daily_key()
returns table(id uuid, key text, claimed boolean, awarded_at timestamptz, expires_at timestamptz)
language sql security definer set search_path to 'public'
as $$
  select id, key, claimed, awarded_at, (awarded_at + interval '24 hours')
  from vip_giveaway_winners
  where user_id = auth.uid()
    and awarded_at > now() - interval '24 hours'
  order by awarded_at desc
  limit 1;
$$;

create or replace function public.claim_daily_key(p_id uuid)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_key text;
  v_claimed int;
begin
  select key into v_key
  from vip_giveaway_winners
  where id = p_id
    and user_id = auth.uid()
    and awarded_at > now() - interval '24 hours';

  if v_key is null then
    return jsonb_build_object('ok', false, 'error', 'not_a_winner');
  end if;

  update vip_giveaway_winners
     set claimed = true, claimed_at = coalesce(claimed_at, now())
   where id = p_id and user_id = auth.uid();
  get diagnostics v_claimed = row_count;

  return jsonb_build_object('ok', true, 'key', v_key);
end;
$$;

grant execute on function public.my_daily_key() to authenticated;
grant execute on function public.claim_daily_key(uuid) to authenticated;
