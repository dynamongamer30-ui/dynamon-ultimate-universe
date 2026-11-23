create or replace function public.vextro_restore_table_rows(p_table text,p_conflict text,p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_updates text;
  v_sql text;
  v_count integer;
begin
  if p_table not in (
    'bot_users','bot_link_requests','bot_account_links','bot_guides','bot_support_tickets','bot_support_messages',
    'dgbot_guides','dgbot_guide_keywords','dgbot_allowlist','dgbot_moderation_rules','dgbot_audit_log','dgbot_bans',
    'dgbot_posts','dgbot_group_help_handoffs','dgbot_review_queue','dgbot_alerts','dgbot_pending_claims','dgbot_user_state',
    'vextro_broadcast_jobs','vextro_broadcast_recipients','vextro_scheduled_posts',
    'vextro_runtime_settings','vextro_moderation_events','vextro_update_approvals'
  ) then
    raise exception 'Table is not in the VEXTRO backup allowlist';
  end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then
    raise exception 'Rows must be a JSON array containing at most 500 records';
  end if;
  if p_conflict not in ('id','telegram_id','token_hash','nonce','alert_key','key','tag') then
    raise exception 'Conflict key is not allowed';
  end if;
  if not exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_name=tc.constraint_name and kcu.table_schema=tc.table_schema and kcu.table_name=tc.table_name
    where tc.table_schema='public' and tc.table_name=p_table and tc.constraint_type='PRIMARY KEY'
      and kcu.column_name=p_conflict
  ) and not exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_name=tc.constraint_name and kcu.table_schema=tc.table_schema and kcu.table_name=tc.table_name
    where tc.table_schema='public' and tc.table_name=p_table and tc.constraint_type='UNIQUE'
      and kcu.column_name=p_conflict
  ) then
    raise exception 'Conflict key is not a unique key for the requested table';
  end if;
  select string_agg(format('%I=EXCLUDED.%I',column_name,column_name),',')
    into v_updates
  from information_schema.columns
  where table_schema='public' and table_name=p_table and column_name<>p_conflict;
  if v_updates is null then raise exception 'Table schema not found'; end if;
  v_sql:=format(
    'insert into public.%I overriding system value select * from jsonb_populate_recordset(null::public.%I,$1) on conflict (%I) do update set %s',
    p_table,p_table,p_conflict,v_updates
  );
  execute v_sql using p_rows;
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;
revoke all on function public.vextro_restore_table_rows(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.vextro_restore_table_rows(text,text,jsonb) to service_role;
