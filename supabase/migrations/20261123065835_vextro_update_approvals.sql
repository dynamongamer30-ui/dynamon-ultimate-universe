create table if not exists public.vextro_update_approvals (
  tag text primary key check (char_length(tag) between 1 and 100), release_url text not null,
  approved_by bigint not null, approved_at timestamptz not null default now(),
  status text not null default 'approved' check (status in ('approved','deploy_requested','rollback_requested')),
  updated_at timestamptz not null default now()
);
alter table public.vextro_update_approvals enable row level security;
grant all on public.vextro_update_approvals to service_role;