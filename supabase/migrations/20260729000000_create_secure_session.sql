-- =====================================================================
-- create_secure_session — mints a one-time secure_sessions token for a
-- mod's download link. Counterpart to redeem_secure_session() defined in
-- 20260704090000_dg_unified_backend.sql. This function was previously
-- applied directly to the database via the Supabase MCP and was missing
-- from version control; this migration brings the repo back in sync
-- with production.
-- =====================================================================

create or replace function public.create_secure_session(p_slug text, p_fingerprint text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_link   text;
  v_token  text;
  v_now    bigint := (extract(epoch from now()) * 1000)::bigint;
  v_recent int;
begin
  if p_fingerprint is null or length(p_fingerprint) = 0 or length(p_fingerprint) > 200 then
    return jsonb_build_object('ok', false, 'error', 'invalid_fingerprint');
  end if;
  if p_slug is null or length(p_slug) = 0 or length(p_slug) > 100 then
    return jsonb_build_object('ok', false, 'error', 'invalid_slug');
  end if;

  select count(*) into v_recent
    from public.secure_sessions
   where data->>'fingerprint' = p_fingerprint
     and (data->>'timestamp')::bigint > (v_now - 3600000);
  if v_recent >= 8 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  select mega_enc into v_link
    from public.mod_overrides
   where slug = p_slug;

  if v_link is null or v_link = '' then
    return jsonb_build_object('ok', false, 'error', 'no_link');
  end if;

  v_token := gen_random_uuid()::text;

  insert into public.secure_sessions (id, data)
  values (
    v_token,
    jsonb_build_object(
      'megaLink',    v_link,
      'timestamp',   v_now,
      'fingerprint', p_fingerprint,
      'modVersion',  p_slug,
      'used',        false
    )
  );

  return jsonb_build_object('ok', true, 'token', v_token);
end;
$function$;

-- Let the public site (anon) and signed-in users call ONLY this function,
-- matching the grants already applied in production.
revoke all on function public.create_secure_session(text, text) from public;
grant execute on function public.create_secure_session(text, text) to anon, authenticated;
