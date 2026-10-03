-- Tesla Phoenix Pass campaign: open link, one claim per authenticated account, 100 total.

create table if not exists public.claim_campaigns (
  slug text primary key,
  title text not null,
  max_claims integer not null check (max_claims > 0),
  claimed_count integer not null default 0 check (claimed_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.claim_campaign_claims (
  id uuid primary key default gen_random_uuid(),
  campaign_slug text not null references public.claim_campaigns(slug) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pass_id uuid not null references public.phoenix_passes(id) on delete restrict,
  claimed_at timestamptz not null default now(),
  unique (campaign_slug, user_id)
);

create index if not exists claim_campaign_claims_campaign_idx
  on public.claim_campaign_claims (campaign_slug, claimed_at desc);

alter table public.claim_campaigns enable row level security;
alter table public.claim_campaign_claims enable row level security;

drop policy if exists claim_campaign_claims_select_self on public.claim_campaign_claims;
create policy claim_campaign_claims_select_self on public.claim_campaign_claims
  for select to authenticated using (user_id = auth.uid());

insert into public.claim_campaigns (slug, title, max_claims, active)
values ('tesla', 'Tesla Phoenix Pass', 100, true)
on conflict (slug) do update set
  title = excluded.title,
  max_claims = excluded.max_claims;

create or replace function public.claim_campaign_pass(p_campaign_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_campaign public.claim_campaigns%rowtype;
  v_existing public.claim_campaign_claims%rowtype;
  v_pass_id uuid;
  v_expires_at timestamptz;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_campaign
    from public.claim_campaigns
   where slug = lower(trim(p_campaign_slug))
   for update;

  if not found or not v_campaign.active then
    return jsonb_build_object('ok', false, 'error', 'campaign_inactive');
  end if;

  select * into v_existing
    from public.claim_campaign_claims
   where campaign_slug = v_campaign.slug
     and user_id = v_user_id;

  if found then
    select expires_at into v_expires_at
      from public.phoenix_passes
     where id = v_existing.pass_id;
    return jsonb_build_object(
      'ok', false,
      'error', 'already_claimed',
      'pass_id', v_existing.pass_id,
      'expires_at', v_expires_at,
      'claimed_at', v_existing.claimed_at
    );
  end if;

  if v_campaign.claimed_count >= v_campaign.max_claims then
    return jsonb_build_object(
      'ok', false,
      'error', 'sold_out',
      'claimed_count', v_campaign.claimed_count,
      'max_claims', v_campaign.max_claims
    );
  end if;

  insert into public.phoenix_passes (
    user_id, claimed, claimed_at, claim_deadline, expires_at, grant_kind
  ) values (
    v_user_id, true, now(), now(), now() + interval '30 days', 'campaign_tesla'
  ) returning id, expires_at into v_pass_id, v_expires_at;

  insert into public.claim_campaign_claims (campaign_slug, user_id, pass_id)
  values (v_campaign.slug, v_user_id, v_pass_id);

  update public.claim_campaigns
     set claimed_count = claimed_count + 1
   where slug = v_campaign.slug;

  insert into public.notifications (title, body, target_user_id, reward_kind, reward_ref)
  values (
    'Tesla Phoenix Pass claimed',
    'Your Tesla campaign Phoenix Pass is ready. Use it on any mod download within 30 days.',
    v_user_id,
    'phoenix_pass',
    v_pass_id::text
  );

  return jsonb_build_object(
    'ok', true,
    'pass_id', v_pass_id,
    'expires_at', v_expires_at,
    'claimed_count', v_campaign.claimed_count + 1,
    'max_claims', v_campaign.max_claims
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_claimed');
end;
$$;

grant execute on function public.claim_campaign_pass(text) to authenticated;
