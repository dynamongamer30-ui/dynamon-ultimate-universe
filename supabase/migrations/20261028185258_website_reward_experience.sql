-- Additive website features. Reviewed installation required before production application.
create table if not exists public.website_reward_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  key_code text not null, source text not null, awarded_at timestamptz not null,
  primary key(user_id,key_code)
);
alter table public.website_reward_keys enable row level security;
revoke all on public.website_reward_keys from public,anon,authenticated;

create or replace function public.website_key_expiry(p_data jsonb) returns timestamptz
language plpgsql immutable set search_path=public as $$
begin
  if coalesce(p_data->>'expiry','') ~ '^[0-9]{1,12}$' then
    return to_timestamp((p_data->>'expiry')::double precision);
  end if;
  return null;
end $$;

alter table public.notifications add column if not exists source_kind text not null default 'manual';
update public.notifications set source_kind='automated' where reward_kind is not null or burn_after_read;

create or replace function public.website_capture_notification() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.reward_kind is not null or new.burn_after_read then new.source_kind='automated'; end if;
  if new.target_user_id is not null and new.reward_kind in ('trainer_dg_key','trainer_vip_key','vip_key')
    and exists(select 1 from public.valid_keys where id=new.reward_ref) then
    insert into public.website_reward_keys(user_id,key_code,source,awarded_at)
    values(new.target_user_id,new.reward_ref,new.reward_kind,new.created_at) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists website_capture_notification on public.notifications;
create trigger website_capture_notification before insert or update on public.notifications
for each row execute function public.website_capture_notification();
insert into public.website_reward_keys(user_id,key_code,source,awarded_at)
select n.target_user_id,n.reward_ref,n.reward_kind,n.created_at from public.notifications n
join public.valid_keys k on k.id=n.reward_ref
where n.target_user_id is not null and n.reward_kind in ('trainer_dg_key','trainer_vip_key','vip_key')
on conflict do nothing;

create or replace function public.website_reward_history(p_before timestamptz default null,p_limit integer default 20,p_before_id text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare rows jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by awarded_at desc,id desc),'[]') into rows from (
  select w.id::text id,'daily_key'::text kind,'Daily DG Key'::text label,w.awarded_at,
   least(w.awarded_at+interval '24 hours',public.website_key_expiry(k.data)) expires_at,
   w.claimed,case when w.claimed then w.key else null end key_code,
   w.id::text claim_ref,'daily_key'::text claim_kind
  from public.vip_giveaway_winners w join public.valid_keys k on k.id=w.key
  where w.user_id=auth.uid() and w.awarded_at+interval '24 hours'>now()
   and public.website_key_expiry(k.data)>now()
   and coalesce(k.data->>'status','active')='active' and coalesce(k.data->>'activated','false')<>'true'
   and coalesce(k.data->>'device','')='' and (p_before is null or (w.awarded_at,w.id::text)<(p_before,coalesce(p_before_id,chr(65535))))
  union all
  select 'key:'||r.key_code,'granted_key','Trainer DG Key',r.awarded_at,
   public.website_key_expiry(k.data),true,r.key_code,r.key_code,'granted_key'
  from public.website_reward_keys r join public.valid_keys k on k.id=r.key_code
  where r.user_id=auth.uid() and r.source in ('trainer_dg_key','trainer_vip_key')
   and public.website_key_expiry(k.data)>now() and coalesce(k.data->>'status','active')='active'
   and coalesce(k.data->>'activated','false')<>'true' and coalesce(k.data->>'device','')=''
   and (p_before is null or (r.awarded_at,'key:'||r.key_code)<(p_before,coalesce(p_before_id,chr(65535))))
  union all
  select p.id::text,'phoenix_pass',case when p.claimed then 'Phoenix Pass' else 'Daily Phoenix Pass' end,
   p.created_at,case when p.claimed then p.expires_at else p.claim_deadline end,p.claimed,
   null::text,p.id::text,'phoenix_pass'
  from public.phoenix_passes p where p.user_id=auth.uid() and not p.used
   and ((p.claimed and p.expires_at>now()) or (not p.claimed and p.claim_deadline>now()))
   and (p_before is null or (p.created_at,p.id::text)<(p_before,coalesce(p_before_id,chr(65535))))
  order by awarded_at desc,id desc limit greatest(1,least(coalesce(p_limit,20),50))
 )q;
 return jsonb_build_object('items',rows,'server_time',now());
end $$;

create or replace function public.website_acknowledge_notification(p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path=public as $$
declare n record; done integer:=0;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if cardinality(p_ids)>100 then raise exception 'Too many messages'; end if;
 for n in select * from public.notifications where id=any(p_ids)
   and (target_user_id is null or target_user_id=auth.uid()) loop
  insert into public.notification_reads(notification_id,user_id) values(n.id,auth.uid()) on conflict do nothing;
  -- Delete only personal automated notices with recoverable reward source records.
  if n.source_kind='automated' and n.target_user_id=auth.uid() and (
   (n.reward_kind in ('vip_key','trainer_dg_key','trainer_vip_key') and exists(select 1 from public.website_reward_keys r where r.user_id=auth.uid() and r.key_code=n.reward_ref))
   or (n.reward_kind='phoenix_pass' and exists(select 1 from public.phoenix_passes p where p.user_id=auth.uid() and (p.id::text=n.reward_ref or (n.reward_ref is null and abs(extract(epoch from p.created_at-n.created_at))<10))))
  ) then delete from public.notifications where id=n.id; end if;
  done:=done+1;
 end loop;
 return jsonb_build_object('ok',true,'acknowledged',done);
end $$;

create table if not exists public.website_saved_searches (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 60),preset jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.website_saved_searches enable row level security;
revoke all on public.website_saved_searches from public,anon,authenticated;
create index if not exists website_saved_searches_user_idx on public.website_saved_searches(user_id);
create or replace function public.website_saved_searches(p_action text default 'list',p_id uuid default null,p_name text default '',p_preset jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,2026));
 if p_action in ('save','rename') and length(trim(p_name)) not between 1 and 60 then raise exception 'Enter a name (1–60 characters)'; end if;
 if p_action='save' then
  if (select count(*) from public.website_saved_searches where user_id=auth.uid())>=10 then raise exception 'Remove one of your ten saved searches first'; end if;
  if jsonb_typeof(p_preset)<>'object' or octet_length(p_preset::text)>2048 or exists(select 1 from jsonb_object_keys(p_preset) k where k not in ('q','sort','elements','rating','version','compare')) then raise exception 'Invalid search preset'; end if;
  insert into public.website_saved_searches(user_id,name,preset) values(auth.uid(),trim(p_name),p_preset);
 elsif p_action='rename' then update public.website_saved_searches set name=trim(p_name),updated_at=now() where id=p_id and user_id=auth.uid();
 elsif p_action='remove' then delete from public.website_saved_searches where id=p_id and user_id=auth.uid();
 elsif p_action<>'list' then raise exception 'Unknown action'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'preset',preset) order by updated_at desc),'[]') into result from public.website_saved_searches where user_id=auth.uid();
 return result;
end $$;

alter table public.claim_campaigns add column if not exists starts_at timestamptz;
alter table public.claim_campaigns add column if not exists ends_at timestamptz;
create table if not exists public.website_campaign_browser_claims (
 campaign_slug text not null references public.claim_campaigns(slug),browser_hash text not null,
 user_id uuid references auth.users(id) on delete set null,primary key(campaign_slug,browser_hash)
);
alter table public.website_campaign_browser_claims enable row level security;
revoke all on public.website_campaign_browser_claims from public,anon,authenticated;
create table if not exists public.website_campaign_attempts (
 id bigint generated always as identity primary key,user_id uuid not null,browser_hash text not null,ip_hash text not null,created_at timestamptz not null default now()
);
alter table public.website_campaign_attempts enable row level security;
revoke all on public.website_campaign_attempts from public,anon,authenticated;
create index if not exists website_campaign_attempts_time on public.website_campaign_attempts(created_at);
create index if not exists website_campaign_attempts_account on public.website_campaign_attempts(user_id,created_at);
create index if not exists website_campaign_attempts_browser on public.website_campaign_attempts(browser_hash,created_at);
create index if not exists website_campaign_attempts_ip on public.website_campaign_attempts(ip_hash,created_at);

create or replace function public.website_campaign_status(p_slug text) returns jsonb
language sql security definer set search_path=public as $$
 select jsonb_build_object('slug',slug,'title',case when slug='tesla' then 'Phoenix Pass' else title end,'active',active,'max_claims',max_claims,'claimed_count',claimed_count,'remaining',greatest(0,max_claims-claimed_count),'starts_at',starts_at,'ends_at',ends_at)
 from public.claim_campaigns where slug=p_slug;
$$;

-- Server only. User, browser and IP hashes must come from the verified gateway.
create or replace function public.website_campaign_rate(p_user uuid,p_browser text,p_ip text) returns boolean
language plpgsql security invoker set search_path=public as $$
declare ok boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,901));
 perform pg_advisory_xact_lock(hashtextextended(p_browser,902));
 perform pg_advisory_xact_lock(hashtextextended(p_ip,903));
 select (count(*) filter(where user_id=p_user)<10 and count(*) filter(where browser_hash=p_browser)<30 and count(*) filter(where ip_hash=p_ip)<120) into ok
 from public.website_campaign_attempts where created_at>now()-interval '10 minutes' and (user_id=p_user or browser_hash=p_browser or ip_hash=p_ip);
 insert into public.website_campaign_attempts(user_id,browser_hash,ip_hash) values(p_user,p_browser,p_ip);
 return ok;
end $$;

create or replace function public.website_claim_campaign(p_user uuid,p_slug text,p_browser text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare c public.claim_campaigns%rowtype; existing public.claim_campaign_claims%rowtype; pass uuid; expiry timestamptz;
begin
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then return jsonb_build_object('ok',false,'error','verified_account_required'); end if;
 if p_browser is null or p_browser !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok',false,'error','invalid_browser'); end if;
 select * into c from public.claim_campaigns where slug=p_slug for update;
 if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
 select * into existing from public.claim_campaign_claims where campaign_slug=p_slug and user_id=p_user;
 if found then return jsonb_build_object('ok',true,'already_claimed',true,'pass_id',existing.pass_id); end if;
 if exists(select 1 from public.website_campaign_browser_claims where campaign_slug=p_slug and browser_hash=p_browser) then return jsonb_build_object('ok',false,'error','browser_already_claimed'); end if;
 if not c.active or c.starts_at>now() or c.ends_at<=now() then return jsonb_build_object('ok',false,'error','campaign_inactive'); end if;
 if c.claimed_count>=c.max_claims then return jsonb_build_object('ok',false,'error','sold_out'); end if;
 insert into public.phoenix_passes(user_id,claimed,claimed_at,claim_deadline,expires_at,grant_kind)
 values(p_user,true,now(),now(),now()+interval '30 days','campaign:'||p_slug) returning id,expires_at into pass,expiry;
 insert into public.claim_campaign_claims(campaign_slug,user_id,pass_id) values(p_slug,p_user,pass);
 insert into public.website_campaign_browser_claims values(p_slug,p_browser,p_user);
 update public.claim_campaigns set claimed_count=claimed_count+1 where slug=p_slug;
 insert into public.notifications(title,body,target_user_id,reward_kind,reward_ref) values('Phoenix Pass claimed','Your pass is available in My Rewards for 30 days.',p_user,'phoenix_pass',pass::text);
 return jsonb_build_object('ok',true,'pass_id',pass,'expires_at',expiry,'claimed_count',c.claimed_count+1,'max_claims',c.max_claims);
end $$;

create table if not exists public.website_pass_grants (
 request_id uuid primary key,owner_id uuid references auth.users(id) on delete set null,user_id uuid references auth.users(id) on delete set null,pass_id uuid references public.phoenix_passes(id) on delete set null,created_at timestamptz not null default now()
);
alter table public.website_pass_grants enable row level security;
revoke all on public.website_pass_grants from public,anon,authenticated;

create or replace function public.website_find_account(p_email text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if not public.dg_is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 select jsonb_build_object('id',id,'email',email) into result from auth.users where lower(email)=lower(trim(p_email));
 return result;
end $$;
create or replace function public.website_grant_pass(p_email text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare target uuid;pass uuid; prior public.website_pass_grants%rowtype;
begin
 if not public.dg_is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 if p_request_id is null then raise exception 'Request identifier required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,10));
 select id into target from auth.users where lower(email)=lower(trim(p_email));
 if target is null then return jsonb_build_object('ok',false,'error','user_not_found'); end if;
 select * into prior from public.website_pass_grants where request_id=p_request_id;
 if found then
  if prior.owner_id is distinct from auth.uid() or prior.user_id is distinct from target then raise exception 'Request does not match'; end if;
  return jsonb_build_object('ok',true,'pass_id',prior.pass_id,'replayed',true);
 end if;
 insert into public.phoenix_passes(user_id,claimed,claimed_at,claim_deadline,expires_at,grant_kind)
 values(target,true,now(),now(),now()+interval '30 days','owner_grant') returning id into pass;
 insert into public.website_pass_grants(request_id,owner_id,user_id,pass_id) values(p_request_id,auth.uid(),target,pass);
 insert into public.notifications(title,body,target_user_id,reward_kind,reward_ref)
 values('You received a Phoenix Pass!','Your pass is available in My Rewards for 30 days.',target,'phoenix_pass',pass::text);
 return jsonb_build_object('ok',true,'pass_id',pass);
end $$;

create or replace function public.website_manage_campaign(p_action text default 'list',p_slug text default null,p_title text default null,p_max integer default null,p_active boolean default null,p_starts timestamptz default null,p_ends timestamptz default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if not public.dg_is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 if p_action='save' then
  if p_slug is null or p_title is null or p_max is null or p_slug !~ '^[a-z0-9][a-z0-9-]{0,79}$' or length(trim(p_title)) not between 1 and 100 or p_max not between 1 and 100000 or p_active is null or (p_starts is not null and p_ends is not null and p_ends<=p_starts) then raise exception 'Check campaign name, dates and claim limit'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_slug,904));
  if exists(select 1 from public.claim_campaigns where slug=p_slug and claimed_count>p_max) then raise exception 'Limit cannot be below existing claims'; end if;
  insert into public.claim_campaigns(slug,title,max_claims,active,starts_at,ends_at) values(p_slug,trim(p_title),p_max,p_active,p_starts,p_ends)
  on conflict(slug) do update set title=excluded.title,max_claims=excluded.max_claims,active=excluded.active,starts_at=excluded.starts_at,ends_at=excluded.ends_at;
 elsif p_action<>'list' then raise exception 'Unknown action'; end if;
 select coalesce(jsonb_agg(to_jsonb(c) order by created_at desc),'[]') into result from public.claim_campaigns c;
 return result;
end $$;

create or replace function public.website_owner_automation() returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if not public.dg_is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 select jsonb_build_object('unclaimed_passes',(select count(*) from public.phoenix_passes where not claimed and not used and claim_deadline>now()),'available_passes',(select count(*) from public.phoenix_passes where claimed and not used and expires_at>now()),'daily_keys_24h',(select count(*) from public.vip_giveaway_winners where awarded_at>now()-interval '24 hours'),'last_key_award',(select max(awarded_at) from public.vip_giveaway_winners),'automated_notices',(select count(*) from public.notifications where source_kind='automated'),'manual_notices',(select count(*) from public.notifications where source_kind='manual'),'cleanup_status','Unknown until scheduler is checked') into result;
 return result;
end $$;

-- Clean expired automated notices only; never keys, bindings, passes or claim receipts.
create or replace function public.website_cleanup_notifications() returns integer
language plpgsql security invoker set search_path=public as $$
declare count_deleted integer;
begin
 delete from public.notifications where source_kind='automated' and created_at<now()-interval '24 hours';
 get diagnostics count_deleted=row_count;
 delete from public.website_campaign_attempts where created_at<now()-interval '1 day';
 return count_deleted;
end $$;

-- All new functions are private until explicitly allowed below.
do $$ declare p record;begin
 for p in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname=any(array['website_key_expiry','website_capture_notification','website_reward_history','website_acknowledge_notification','website_saved_searches','website_campaign_status','website_campaign_rate','website_claim_campaign','website_find_account','website_grant_pass','website_manage_campaign','website_owner_automation','website_cleanup_notifications']) loop
  execute format('revoke all on function %s from public,anon,authenticated',p.signature);
 end loop;
end $$;
grant execute on function public.website_reward_history(timestamptz,integer,text),public.website_acknowledge_notification(uuid[]),public.website_saved_searches(text,uuid,text,jsonb),public.website_find_account(text),public.website_grant_pass(text,uuid),public.website_manage_campaign(text,text,text,integer,boolean,timestamptz,timestamptz),public.website_owner_automation() to authenticated;
grant execute on function public.website_campaign_status(text) to anon,authenticated,service_role;
grant all on public.website_campaign_attempts,public.website_campaign_browser_claims to service_role;
grant usage,select on sequence public.website_campaign_attempts_id_seq to service_role;
grant execute on function public.website_claim_campaign(uuid,text,text),public.website_campaign_rate(uuid,text,text),public.website_cleanup_notifications() to service_role;
-- Close the old unguarded entrypoint only when the guarded web gateway is installed.
-- The legacy grant is revoked in the post-rollout schedule migration.
-- Preserve existing Tesla receipts and quota; rename presentation only.
update public.claim_campaigns set title='Phoenix Pass' where slug='tesla';
-- Scheduler installation is a separate reviewed step after deployment verification.
