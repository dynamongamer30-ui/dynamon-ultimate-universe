create table if not exists public.vextro_runtime_settings (
  key text primary key check (char_length(key) between 1 and 80), value jsonb not null default '{}'::jsonb,
  updated_by bigint not null, updated_at timestamptz not null default now()
);
create table if not exists public.vextro_moderation_events (
  id bigint generated always as identity primary key, telegram_id bigint not null, chat_id bigint not null,
  event_type text not null check (event_type in ('warning','deleted','restricted','released')),
  reason text not null default '', created_at timestamptz not null default now()
);
create index if not exists vextro_moderation_events_user_idx on public.vextro_moderation_events(telegram_id,created_at desc);
alter table public.vextro_runtime_settings enable row level security;
alter table public.vextro_moderation_events enable row level security;
grant all on public.vextro_runtime_settings,public.vextro_moderation_events to service_role;
grant usage,select on all sequences in schema public to service_role;