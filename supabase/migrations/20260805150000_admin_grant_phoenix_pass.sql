-- Owner-only: grant a Phoenix Pass directly to any signed-up user by
-- email, already claimed (skips the 24h claim step), valid 30 days —
-- same shape as a normal claim_phoenix_pass() result. Mirrors the manual
-- SQL used earlier for test-account seeding, now as a safe, reusable,
-- owner-gated RPC instead of raw inserts.
create or replace function public.admin_grant_phoenix_pass(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _target uuid;
  _pass_id uuid;
begin
  if not dg_is_owner() then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  select id into _target from auth.users where email = lower(trim(p_email)) limit 1;
  if _target is null then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  insert into public.phoenix_passes (user_id, claimed, expires_at, claim_deadline)
  values (_target, true, now() + interval '30 days', now())
  returning id into _pass_id;

  insert into public.notifications (title, body, target_user_id, reward_kind, reward_ref)
  values (
    'You received a Phoenix Pass!',
    'The team sent you a Phoenix Pass, good for 30 days — use it on any mod''s download page.',
    _target, 'phoenix_pass', null
  );

  return jsonb_build_object('ok', true, 'pass_id', _pass_id, 'user_id', _target, 'expires_in_days', 30);
end;
$$;

grant execute on function public.admin_grant_phoenix_pass(text) to authenticated;
