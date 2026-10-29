-- Reuse deleted public link names without erasing or mixing campaign generations.
-- No campaigns, passes, receipts, or user content are deleted.
create or replace function public.website_manage_campaign(p_action text default 'list',p_slug text default null,p_title text default null,p_max integer default null,p_active boolean default null,p_starts timestamptz default null,p_ends timestamptz default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb; previous public.claim_campaigns%rowtype; archive_slug text;
begin
 if not public.dg_is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 if p_action='save' then
  if p_slug is null or p_title is null or p_max is null or p_slug !~ '^[a-z0-9][a-z0-9-]{0,79}$' or length(trim(p_title)) not between 1 and 100 or p_max not between 1 and 100000 or p_active is null or (p_starts is not null and p_ends is not null and p_ends<=p_starts) then raise exception 'Check campaign name, dates and claim limit'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_slug,904));
  select * into previous from public.claim_campaigns where slug=p_slug for update;
  if found and previous.deleted_at is not null then
   archive_slug := 'archived-' || gen_random_uuid()::text;
   -- Copy the complete old campaign before moving its history to its private identity.
   insert into public.claim_campaigns
    select (jsonb_populate_record(null::public.claim_campaigns,to_jsonb(previous)||jsonb_build_object('slug',archive_slug))).*;
   update public.claim_campaign_claims set campaign_slug=archive_slug where campaign_slug=p_slug;
   update public.website_campaign_browser_claims set campaign_slug=archive_slug where campaign_slug=p_slug;
   update public.website_telegram_handoffs set campaign_slug=archive_slug where campaign_slug=p_slug;
   update public.website_telegram_awards set campaign_slug=archive_slug where campaign_slug=p_slug;
   update public.claim_campaigns set title=trim(p_title),max_claims=p_max,claimed_count=0,
    active=p_active,starts_at=p_starts,ends_at=p_ends,deleted_at=null,created_at=now(),
    url_prefix='diwali-pass',telegram_required=true where slug=p_slug;
  else
   if found and previous.claimed_count>p_max then raise exception 'Limit cannot be below existing claims'; end if;
   insert into public.claim_campaigns(slug,title,max_claims,active,starts_at,ends_at) values(p_slug,trim(p_title),p_max,p_active,p_starts,p_ends)
   on conflict(slug) do update set title=excluded.title,max_claims=excluded.max_claims,active=excluded.active,starts_at=excluded.starts_at,ends_at=excluded.ends_at;
  end if;
 elsif p_action in ('pause','resume','delete') then
  update public.claim_campaigns set active=(p_action='resume'),deleted_at=case when p_action='delete' then now() else deleted_at end where slug=p_slug and deleted_at is null;
  if not found then raise exception 'Campaign unavailable'; end if;
 elsif p_action<>'list' then raise exception 'Unknown action'; end if;
 select coalesce(jsonb_agg(to_jsonb(c) order by created_at desc),'[]') into result from public.claim_campaigns c where deleted_at is null;
 return result;
end $$;

-- Re-check identity after row locks: a concurrent recreation may have moved the
-- handoff into its archived generation while redemption waited on the campaign.
do $migration$
declare definition text; needle text := ' select * into h from public.website_telegram_handoffs where token_hash=p_hash for update;';
begin
 definition := pg_get_functiondef('public.website_telegram_claim(text,text,uuid,text,bigint)'::regprocedure);
 if strpos(definition,'h.campaign_slug is distinct from c.slug')=0 then
  if strpos(definition,needle)=0 then raise exception 'Unexpected claim function; no changes applied'; end if;
  execute replace(definition,needle,needle||E'\n if h.campaign_slug is distinct from c.slug then return jsonb_build_object(''error'',''not_found''); end if;');
 end if;
end $migration$;
