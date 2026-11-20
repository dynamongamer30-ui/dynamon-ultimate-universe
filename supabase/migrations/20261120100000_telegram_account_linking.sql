-- Dedicated Google-authenticated website <-> Telegram bot account linking.
-- Additive only. This migration is intentionally not auto-applied to production.
create table if not exists public.bot_account_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  telegram_id bigint not null check (telegram_id > 0),
  linked_at timestamptz not null default now(),
  unlink_eligible_at timestamptz not null default now() + interval '15 days',
  unlinked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint bot_account_links_eligibility check (unlink_eligible_at >= linked_at + interval '15 days')
);
create unique index if not exists bot_account_links_active_user_uidx
  on public.bot_account_links(user_id) where unlinked_at is null;
create unique index if not exists bot_account_links_active_telegram_uidx
  on public.bot_account_links(telegram_id) where unlinked_at is null;
create index if not exists bot_account_links_history_user_idx
  on public.bot_account_links(user_id, linked_at desc);
create index if not exists bot_account_links_history_telegram_idx
  on public.bot_account_links(telegram_id, linked_at desc);

create table if not exists public.bot_account_link_handoffs (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  consumed_at timestamptz
);
create index if not exists bot_account_link_handoffs_user_created_idx
  on public.bot_account_link_handoffs(user_id, created_at desc);

create table if not exists public.bot_account_link_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  telegram_id bigint not null,
  event_type text not null check (event_type in ('linked','unlinked','link_conflict')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bot_account_link_events_user_created_idx
  on public.bot_account_link_events(user_id, created_at desc);
create index if not exists bot_account_link_events_telegram_created_idx
  on public.bot_account_link_events(telegram_id, created_at desc);

alter table public.bot_account_links enable row level security;
alter table public.bot_account_link_handoffs enable row level security;
alter table public.bot_account_link_events enable row level security;
revoke all on public.bot_account_links, public.bot_account_link_handoffs, public.bot_account_link_events from public, anon, authenticated;
grant all on public.bot_account_links, public.bot_account_link_handoffs, public.bot_account_link_events to service_role;
revoke all on sequence public.bot_account_link_events_id_seq from public, anon, authenticated;
grant usage, select on sequence public.bot_account_link_events_id_seq to service_role;

-- Website users can create short-lived handoffs only for their own authenticated identity.
create or replace function public.create_bot_link_handoff(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid handoff token' using errcode='22023';
  end if;
  if (select count(*) from public.bot_account_link_handoffs
      where user_id=uid and created_at > now()-interval '1 hour') >= 5 then
    raise exception 'Too many link attempts. Try again later.' using errcode='P0001';
  end if;
  insert into public.bot_account_link_handoffs(token_hash,user_id)
  values (p_token_hash,uid);
  return jsonb_build_object('ok',true,'expires_at',now()+interval '10 minutes');
end;
$$;
revoke all on function public.create_bot_link_handoff(text) from public, anon;
grant execute on function public.create_bot_link_handoff(text) to authenticated;

-- Bot-only atomic consume. Unique partial indexes enforce both directions under concurrency.
create or replace function public.consume_bot_link_handoff(p_token_hash text,p_telegram_id bigint)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare h public.bot_account_link_handoffs%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if p_telegram_id is null or p_telegram_id <= 0 or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok',false,'error','invalid_request');
  end if;
  select * into h from public.bot_account_link_handoffs
    where token_hash=p_token_hash for update;
  if not found or h.expires_at <= now() or h.consumed_at is not null then
    return jsonb_build_object('ok',false,'error','handoff_expired');
  end if;
  if exists(select 1 from public.bot_account_links where user_id=h.user_id and unlinked_at is null) then
    insert into public.bot_account_link_events(user_id,telegram_id,event_type,details)
      values(h.user_id,p_telegram_id,'link_conflict',jsonb_build_object('reason','website_account_already_linked'));
    return jsonb_build_object('ok',false,'error','website_account_already_linked');
  end if;
  if exists(select 1 from public.bot_account_links where telegram_id=p_telegram_id and unlinked_at is null) then
    insert into public.bot_account_link_events(user_id,telegram_id,event_type,details)
      values(h.user_id,p_telegram_id,'link_conflict',jsonb_build_object('reason','telegram_account_already_linked'));
    return jsonb_build_object('ok',false,'error','telegram_account_already_linked');
  end if;
  insert into public.bot_account_links(user_id,telegram_id)
    values(h.user_id,p_telegram_id);
  update public.bot_account_link_handoffs set consumed_at=now() where token_hash=p_token_hash;
  insert into public.bot_account_link_events(user_id,telegram_id,event_type)
    values(h.user_id,p_telegram_id,'linked');
  return jsonb_build_object('ok',true,'linked_at',now(),'unlink_eligible_at',now()+interval '15 days');
end;
$$;
revoke all on function public.consume_bot_link_handoff(text,bigint) from public, anon, authenticated;
grant execute on function public.consume_bot_link_handoff(text,bigint) to service_role;

create or replace function public.get_bot_account_link()
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); l public.bot_account_links%rowtype;
begin
  if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  select * into l from public.bot_account_links where user_id=uid and unlinked_at is null limit 1;
  if not found then return jsonb_build_object('linked',false); end if;
  return jsonb_build_object(
    'linked',true,'telegram_id',l.telegram_id,'linked_at',l.linked_at,
    'unlink_eligible_at',l.unlink_eligible_at,'can_unlink',now() >= l.unlink_eligible_at
  );
end;
$$;
revoke all on function public.get_bot_account_link() from public, anon;
grant execute on function public.get_bot_account_link() to authenticated;

create or replace function public.unlink_bot_account()
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); l public.bot_account_links%rowtype;
begin
  if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  select * into l from public.bot_account_links
    where user_id=uid and unlinked_at is null for update;
  if not found then return jsonb_build_object('ok',false,'error','not_linked'); end if;
  if now() < l.unlink_eligible_at then
    return jsonb_build_object('ok',false,'error','unlink_restricted','eligible_at',l.unlink_eligible_at);
  end if;
  update public.bot_account_links set unlinked_at=now() where id=l.id;
  insert into public.bot_account_link_events(user_id,telegram_id,event_type)
    values(uid,l.telegram_id,'unlinked');
  return jsonb_build_object('ok',true,'unlinked_at',now());
end;
$$;
revoke all on function public.unlink_bot_account() from public, anon;
grant execute on function public.unlink_bot_account() to authenticated;
