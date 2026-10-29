-- Owner demonstrations are scoped to the verified owner email, owner role and numeric Telegram ID.
-- No passes or histories are deleted; existing owner balances are revoked by expiry.
alter table public.claim_campaign_claims add column if not exists is_demo boolean not null default false;
alter table public.website_telegram_handoffs add column if not exists owner_demo boolean not null default false;
alter table public.phoenix_passes add column if not exists revoked_at timestamptz;

create or replace function public.website_is_demo_owner(p_user uuid,p_telegram bigint default null)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from auth.users u join public.profiles p on p.id=u.id
 where u.id=p_user and lower(u.email)='yugvadecha30@gmail.com' and p.is_owner=true
 and (p_telegram is null or p_telegram=1970192536));
$$;
revoke all on function public.website_is_demo_owner(uuid,bigint) from public,anon,authenticated;
grant execute on function public.website_is_demo_owner(uuid,bigint) to service_role;

create table if not exists public.website_owner_demo_awards (
 token_hash text primary key references public.website_telegram_handoffs(token_hash),
 campaign_slug text not null references public.claim_campaigns(slug),
 user_id uuid not null references auth.users(id),telegram_id bigint not null,
 pass_id uuid not null references public.phoenix_passes(id),created_at timestamptz not null default now()
);
alter table public.website_owner_demo_awards enable row level security;
revoke all on public.website_owner_demo_awards from public,anon,authenticated;
grant all on public.website_owner_demo_awards to service_role;

-- Convert only this owner's recorded campaign tests, refunding their original public allocations once.
with converted as (
 update public.claim_campaign_claims set is_demo=true
 where not is_demo and public.website_is_demo_owner(user_id) returning campaign_slug
), refunds as (select campaign_slug,count(*)::integer n from converted group by campaign_slug)
update public.claim_campaigns c set claimed_count=greatest(0,c.claimed_count-r.n)
from refunds r where c.slug=r.campaign_slug;

update public.website_telegram_handoffs set owner_demo=true where public.website_is_demo_owner(user_id);
update public.phoenix_passes set expires_at=least(expires_at,now()),
 claim_deadline=least(claim_deadline,now()),revoked_at=now()
where revoked_at is null and public.website_is_demo_owner(user_id);

create or replace function public.website_telegram_claim(p_action text,p_hash text default null,p_user uuid default null,p_slug text default null,p_telegram bigint default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare c public.claim_campaigns%rowtype; h public.website_telegram_handoffs%rowtype;
 reward uuid; expiry timestamptz; label text; cfg public.website_claim_bot_config%rowtype; is_demo boolean;
begin
 if p_action='config' then
  select * into cfg from public.website_claim_bot_config where id=true;
  return jsonb_build_object('secret_hash',cfg.secret_hash,'username',cfg.username,'ready',cfg.ready_at>now()-interval '2 minutes');
 elsif p_action='heartbeat' then
  if p_slug !~ '^[A-Za-z0-9_]{5,32}$' then raise exception 'Invalid bot username'; end if;
  update public.website_claim_bot_config set username=p_slug,ready_at=now() where id=true;
  return jsonb_build_object('ok',true);
 elsif p_action='status' then
  return jsonb_build_object('demo',public.website_is_demo_owner(p_user),'claimed',not public.website_is_demo_owner(p_user) and exists(select 1 from public.claim_campaign_claims where campaign_slug=p_slug and user_id=p_user));
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
 is_demo := case when p_action='create' then public.website_is_demo_owner(p_user) else h.owner_demo end;
 if p_action<>'create' and is_demo and not public.website_is_demo_owner(h.user_id,p_telegram) then return jsonb_build_object('error','account_mismatch'); end if;
 if p_action='create' then
  if not c.active or c.starts_at>now() or c.ends_at<=now() then return jsonb_build_object('error','campaign_inactive'); end if;
  if not is_demo and c.claimed_count>=c.max_claims then return jsonb_build_object('error','sold_out'); end if;
  if not is_demo and exists(select 1 from public.claim_campaign_claims where campaign_slug=c.slug and user_id=p_user) then return jsonb_build_object('error','already_claimed'); end if;
  insert into public.website_telegram_handoffs(token_hash,campaign_slug,user_id,owner_demo) values(p_hash,c.slug,p_user,is_demo);
  return jsonb_build_object('ok',true);
 end if;
 select * into h from public.website_telegram_handoffs where token_hash=p_hash for update;
 if h.campaign_slug is distinct from c.slug then return jsonb_build_object('error','not_found'); end if;
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
 if is_demo then
  insert into public.phoenix_passes(user_id,claimed,claimed_at,claim_deadline,expires_at,grant_kind)
   values(h.user_id,true,now(),now(),now()+interval '30 days','owner_demo:'||c.slug) returning id into reward;
  insert into public.website_owner_demo_awards(token_hash,campaign_slug,user_id,telegram_id,pass_id)
   values(p_hash,c.slug,h.user_id,p_telegram,reward);
  update public.website_telegram_handoffs set pass_id=reward where token_hash=p_hash;
  insert into public.notifications(title,body,target_user_id,reward_kind,reward_ref)
   values(c.title||' claimed','Your demonstration pass is available in My Rewards.',h.user_id,'phoenix_pass',reward::text);
  return jsonb_build_object('ok',true,'awarded',true,'demo',true,'title',c.title,'account',label);
 end if;
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
-- Preserve demonstration history alongside other campaign-generation receipts.
do $migration$
declare definition text;
 needle text := '   update public.website_telegram_awards set campaign_slug=archive_slug where campaign_slug=p_slug;';
begin
 definition := pg_get_functiondef('public.website_manage_campaign(text,text,text,integer,boolean,timestamptz,timestamptz)'::regprocedure);
 if strpos(definition,'update public.website_owner_demo_awards')=0 then
  if strpos(definition,needle)=0 then raise exception 'Unexpected campaign function; no changes applied'; end if;
  execute replace(definition,needle,needle||E'\n   update public.website_owner_demo_awards set campaign_slug=archive_slug where campaign_slug=p_slug;');
 end if;
end $migration$;
