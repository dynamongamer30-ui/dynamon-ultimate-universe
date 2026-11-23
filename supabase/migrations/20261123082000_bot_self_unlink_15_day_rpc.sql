-- Bot self-service unlink. The same 15-day eligibility rule is enforced atomically in the database.
-- Only the trusted bot server (service_role) may invoke this RPC.
create or replace function public.unlink_bot_account_from_telegram(p_telegram_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.bot_account_links%rowtype;
  v_unlinked_at timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  if p_telegram_id is null or p_telegram_id <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  select * into v_link
  from public.bot_account_links
  where telegram_id = p_telegram_id and unlinked_at is null
  order by linked_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_linked');
  end if;

  if now() < v_link.unlink_eligible_at then
    return jsonb_build_object(
      'ok', false,
      'error', 'unlink_restricted',
      'eligible_at', v_link.unlink_eligible_at
    );
  end if;

  update public.bot_account_links
  set unlinked_at = now()
  where id = v_link.id
  returning unlinked_at into v_unlinked_at;

  insert into public.dgbot_audit_log(action, actor_id, target_id, reason)
  values (
    'account.unlink',
    p_telegram_id,
    p_telegram_id,
    'Telegram self-service unlink after 15-day eligibility'
  );

  return jsonb_build_object('ok', true, 'unlinked_at', v_unlinked_at);
end;
$$;

revoke all on function public.unlink_bot_account_from_telegram(bigint) from public, anon, authenticated;
grant execute on function public.unlink_bot_account_from_telegram(bigint) to service_role;
