-- Additive upgrade: no existing campaigns, receipts, passes or content are removed.
alter table public.claim_campaigns add column if not exists url_prefix text not null default 'diwali-pass';
alter table public.claim_campaigns add column if not exists deleted_at timestamptz;
alter table public.claim_campaigns add column if not exists telegram_required boolean not null default true;
create table if not exists public.website_claim_bot_config (
 id boolean primary key default true check(id), secret_hash text not null, username text,
 ready_at timestamptz
);
create table if not exists public.website_telegram_handoffs (
 token_hash text primary key check(token_hash ~ '^[0-9a-f]{64}$'),
 campaign_slug text not null references public.claim_campaigns(slug),
 user_id uuid not null references auth.users(id), telegram_id bigint,
 expires_at timestamptz not null default now()+interval '30 minutes',
 created_at timestamptz not null default now(), pass_id uuid references public.phoenix_passes(id)
);
create index if not exists website_handoffs_user on public.website_telegram_handoffs(user_id,created_at);
create table if not exists public.website_telegram_awards (
 campaign_slug text not null references public.claim_campaigns(slug),
 telegram_id bigint not null, user_id uuid not null references auth.users(id),
 pass_id uuid not null references public.phoenix_passes(id), created_at timestamptz not null default now(),
 primary key(campaign_slug,telegram_id), unique(campaign_slug,user_id)
);
alter table public.website_claim_bot_config enable row level security;
alter table public.website_telegram_handoffs enable row level security;
alter table public.website_telegram_awards enable row level security;
revoke all on public.website_claim_bot_config,public.website_telegram_handoffs,public.website_telegram_awards from public,anon,authenticated;
grant all on public.website_claim_bot_config,public.website_telegram_handoffs,public.website_telegram_awards to service_role;

create or replace function public.website_campaign_status(p_slug text) returns jsonb
language sql security definer set search_path=public as $$
 select jsonb_build_object('slug',slug,'title',title,'url_prefix',url_prefix,'active',active,
 'max_claims',max_claims,'claimed_count',claimed_count,'remaining',greatest(0,max_claims-claimed_count),
 'starts_at',starts_at,'ends_at',ends_at)
 from public.claim_campaigns where slug=p_slug and deleted_at is null;
$$;

create or replace function public.website_telegram_claim(p_action text,p_hash text default null,p_user uuid default null,p_slug text default null,p_telegram bigint default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare c public.claim_campaigns%rowtype; h public.website_telegram_handoffs%rowtype;
 reward uuid; expiry timestamptz; label text; cfg public.website_claim_bot_config%rowtype;
begin
 if p_action='config' then
  select * into cfg from public.website_claim_bot_config where id=true;
  return jsonb_build_object('secret_hash',cfg.secret_hash,'username',cfg.username,'ready',cfg.ready_at>now()-interval '2 minutes');
 elsif p_action='heartbeat' then
  if p_slug !~ '^[A-Za-z0-9_]{5,32}$' then raise exception 'Invalid bot username'; end if;
  update public.website_claim_bot_config set username=p_slug,ready_at=now() where id=true;
  return jsonb_build_object('ok',true);
 elsif p_action='status' then
  return jsonb_build_object('claimed',exists(select 1 from public.claim_campaign_claims where campaign_slug=p_slug and user_id=p_user));
 end if;
 if p_action='create' then
  select * into c from public.claim_campaigns where slug=p_slug for update;
 else
  select * into h from public.website_telegram_handoffs where token_hash=p_hash;
  if not found then return jsonb_build_object('error','handoff_expired'); end if;
  select * into c from public.claim_campaigns where slug=h.campaign_slug for update;
 end if;
 if not found then return jsonb_build_object('error','not_found'); end if;
 if c.deleted_at is not null then return jsonb_build_object('error','not_found'); end if;
 if p_action='create' then
  if not c.active or c.starts_at>now() or c.ends_at<=now() then return jsonb_build_object('error','campaign_inactive'); end if;
  if c.claimed_count>=c.max_claims then return jsonb_build_object('error','sold_out'); end if;
  if exists(select 1 from public.claim_campaign_claims where campaign_slug=c.slug and user_id=p_user) then return jsonb_build_object('error','already_claimed'); end if;
  insert into public.website_telegram_handoffs(token_hash,campaign_slug,user_id) values(p_hash,c.slug,p_user);
  return jsonb_build_object('ok',true);
 end if;
 select * into h from public.website_telegram_handoffs where token_hash=p_hash for update;
 if h.telegram_id is not null and h.telegram_id is distinct from p_telegram then return jsonb_build_object('error','account_mismatch'); end if;
 if h.pass_id is not null then return jsonb_build_object('ok',true,'awarded',true,'title',c.title); end if;
 if h.expires_at<=now() then return jsonb_build_object('error','handoff_expired'); end if;
 if not c.active or c.starts_at>now() or c.ends_at<=now() then return jsonb_build_object('error','campaign_inactive'); end if;
 select coalesce(nullif(display_name,''),nullif(username,''),'Your website account') into label from public.profiles where id=h.user_id;
 if p_action='inspect' then return jsonb_build_object('ok',true,'title',c.title,'account',coalesce(label,'Your website account'),'expires_at',h.expires_at); end if;
 if p_telegram is null or p_telegram<=0 then return jsonb_build_object('error','invalid_account'); end if;
 if p_action not in ('confirm','redeem') then return jsonb_build_object('error','invalid_action'); end if;
 if p_action='confirm' then
  update public.website_telegram_handoffs set telegram_id=p_telegram where token_hash=p_hash;
  return jsonb_build_object('ok',true,'title',c.title,'account',label);
 end if;
 if h.telegram_id is distinct from p_telegram then return jsonb_build_object('error','confirmation_required'); end if;
 if exists(select 1 from public.website_telegram_awards where campaign_slug=c.slug and telegram_id=p_telegram and user_id<>h.user_id) then return jsonb_build_object('error','already_claimed'); end if;
 select pass_id into reward from public.claim_campaign_claims where campaign_slug=c.slug and user_id=h.user_id;
 if found then
  -- An award already exists: associate identity without granting another reward.
  insert into public.website_telegram_awards(campaign_slug,telegram_id,user_id,pass_id) values(c.slug,p_telegram,h.user_id,reward) on conflict do nothing;
  update public.website_telegram_handoffs set pass_id=reward where token_hash=p_hash;
  return jsonb_build_object('ok',true,'awarded',true,'title',c.title,'account',label);
 end if;
 if c.claimed_count>=c.max_claims then return jsonb_build_object('error','sold_out'); end if;
 insert into public.phoenix_passes(user_id,claimed,claimed_at,claim_deadline,expires_at,grant_kind)
 values(h.user_id,true,now(),now(),now()+interval '30 days','campaign:'||c.slug) returning id,expires_at into reward,expiry;
 insert into public.claim_campaign_claims(campaign_slug,user_id,pass_id) values(c.slug,h.user_id,reward);
 insert into public.website_telegram_awards(campaign_slug,telegram_id,user_id,pass_id) values(c.slug,p_telegram,h.user_id,reward);
 update public.website_telegram_handoffs set pass_id=reward where token_hash=p_hash;
 update public.claim_campaigns set claimed_count=claimed_count+1 where slug=c.slug;
 insert into public.notifications(title,body,target_user_id,reward_kind,reward_ref)
 values(c.title||' claimed','Your pass is available in My Rewards for 30 days.',h.user_id,'phoenix_pass',reward::text);
 return jsonb_build_object('ok',true,'awarded',true,'title',c.title,'account',label);
end $$;
revoke all on function public.website_telegram_claim(text,text,uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.website_telegram_claim(text,text,uuid,text,bigint) to service_role;
-- Close all legacy redemption entry points; historical receipts stay untouched.
revoke execute on function public.claim_campaign_pass(text) from public,anon,authenticated,service_role;
revoke execute on function public.website_claim_campaign(uuid,text,text) from public,anon,authenticated,service_role;

create or replace function public.website_manage_campaign(p_action text default 'list',p_slug text default null,p_title text default null,p_max integer default null,p_active boolean default null,p_starts timestamptz default null,p_ends timestamptz default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if not public.dg_is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 if p_action='save' then
  if p_slug is null or p_title is null or p_max is null or p_slug !~ '^[a-z0-9][a-z0-9-]{0,79}$' or length(trim(p_title)) not between 1 and 100 or p_max not between 1 and 100000 or p_active is null or (p_starts is not null and p_ends is not null and p_ends<=p_starts) then raise exception 'Check campaign name, dates and claim limit'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_slug,904));
  perform 1 from public.claim_campaigns where slug=p_slug for update;
  if exists(select 1 from public.claim_campaigns where slug=p_slug and (claimed_count>p_max or deleted_at is not null)) then raise exception 'Campaign deleted or limit below existing claims'; end if;
  insert into public.claim_campaigns(slug,title,max_claims,active,starts_at,ends_at) values(p_slug,trim(p_title),p_max,p_active,p_starts,p_ends)
  on conflict(slug) do update set title=excluded.title,max_claims=excluded.max_claims,active=excluded.active,starts_at=excluded.starts_at,ends_at=excluded.ends_at;
 elsif p_action in ('pause','resume','delete') then
  update public.claim_campaigns set active=(p_action='resume'),deleted_at=case when p_action='delete' then now() else deleted_at end where slug=p_slug and deleted_at is null;
  if not found then raise exception 'Campaign unavailable'; end if;
 elsif p_action<>'list' then raise exception 'Unknown action'; end if;
 select coalesce(jsonb_agg(to_jsonb(c) order by created_at desc),'[]') into result from public.claim_campaigns c where deleted_at is null;
 return result;
end $$;
update public.claim_campaigns set title='Diwali Pass' where slug='bonus' and title in ('Diwali-Pass','Diwali Pass');

-- Save route metadata in the same transaction as the campaign settings.
create or replace function public.website_save_campaign(p_slug text,p_title text,p_max integer,p_active boolean,p_starts timestamptz,p_ends timestamptz,p_prefix text)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not public.dg_is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 if p_prefix is null or p_prefix !~ '^[a-z][a-z0-9-]{2,59}$' or p_prefix=any(array['api','mods','admin','auth','profile','rewards','claim','phoenix-pass','links','help','notifications','favorites','generator','unlock','privacy','contact','about','disclaimer','achievements','assets']) then raise exception 'Choose a unique campaign URL prefix'; end if;
 perform public.website_manage_campaign('save',p_slug,p_title,p_max,p_active,p_starts,p_ends);
 update public.claim_campaigns set url_prefix=p_prefix where slug=p_slug;
 return public.website_manage_campaign('list');
end $$;
revoke all on function public.website_save_campaign(text,text,integer,boolean,timestamptz,timestamptz,text) from public,anon;
grant execute on function public.website_save_campaign(text,text,integer,boolean,timestamptz,timestamptz,text) to authenticated;
