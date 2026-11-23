create table if not exists public.vextro_broadcast_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by bigint not null,
  body text not null check (char_length(body) between 1 and 4000),
  audience text not null default 'all' check (audience in ('all')),
  status text not null default 'draft' check (status in ('draft','queued','running','paused','completed','cancelled','failed')),
  scheduled_at timestamptz,
  confirmed_at timestamptz,
  total_count integer not null default 0 check (total_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists vextro_broadcast_jobs_due_idx on public.vextro_broadcast_jobs(status, scheduled_at) where status in ('queued','running');
create table if not exists public.vextro_broadcast_recipients (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.vextro_broadcast_jobs(id) on delete cascade,
  telegram_id bigint not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(job_id, telegram_id)
);
create index if not exists vextro_broadcast_recipients_due_idx on public.vextro_broadcast_recipients(job_id,status,next_attempt_at);
create table if not exists public.vextro_scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.dgbot_posts(id),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','publishing','published','failed','cancelled')),
  attempts integer not null default 0,
  last_error text,
  created_by bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists vextro_scheduled_posts_due_idx on public.vextro_scheduled_posts(status,scheduled_at);
create table if not exists public.vextro_backup_artifacts (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  format_version integer not null default 1,
  encryption text not null default 'aes-256-gcm',
  bytes bigint not null default 0,
  sha256 text not null,
  created_by bigint not null,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  expires_at timestamptz
);
alter table public.vextro_broadcast_jobs enable row level security;
alter table public.vextro_broadcast_recipients enable row level security;
alter table public.vextro_scheduled_posts enable row level security;
alter table public.vextro_backup_artifacts enable row level security;
grant all on public.vextro_broadcast_jobs, public.vextro_broadcast_recipients, public.vextro_scheduled_posts, public.vextro_backup_artifacts to service_role;
grant usage, select on all sequences in schema public to service_role;
create or replace function public.vextro_claim_broadcast_recipients(p_limit integer default 20)
returns setof public.vextro_broadcast_recipients
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select r.id
    from public.vextro_broadcast_recipients r
    join public.vextro_broadcast_jobs j on j.id = r.job_id
    where j.status = 'running'
      and r.status in ('pending','failed')
      and r.next_attempt_at <= now()
      and r.attempts < 5
    order by r.next_attempt_at, r.id
    for update of r skip locked
    limit greatest(1, least(p_limit, 100))
  )
  update public.vextro_broadcast_recipients r
  set status='sending', attempts=r.attempts+1, updated_at=now()
  from picked
  where r.id=picked.id
  returning r.*;
end;
$$;
revoke all on function public.vextro_claim_broadcast_recipients(integer) from public, anon, authenticated;
grant execute on function public.vextro_claim_broadcast_recipients(integer) to service_role;
